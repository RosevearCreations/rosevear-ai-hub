import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { OwnerFieldAcceptance284 } from "./OwnerFieldAcceptance284";
import { fieldEvidencePreflight, fieldEvidenceReportPreview, fieldFreshness, loadOwnerFieldObservations, ownerFieldStorageKey, saveOwnerFieldObservation, type OwnerFieldObservation } from "./fieldAcceptance284";

const day = 24 * 60 * 60 * 1000;
const now = 1_800_000_000_000;
beforeEach(() => { localStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

describe("Build 284 scoped field-report evidence", () => {
  it("saves only allowlisted owner observations and isolates different owner accounts", () => {
    const saved = saveOwnerFieldObservation(localStorage, "ree", [], "devices", "owner_reported_working", now);
    expect(saved.saved).toBe(true);
    expect(loadOwnerFieldObservations(localStorage, "ree")).toEqual([{ moduleId: "devices", outcome: "owner_reported_working", observedAtMs: now }]);
    expect(loadOwnerFieldObservations(localStorage, "jack")).toEqual([]);
    expect(ownerFieldStorageKey("ree")).not.toBe(ownerFieldStorageKey("jack"));
    expect(ownerFieldStorageKey(" ")).toBeNull();
    expect(saveOwnerFieldObservation(localStorage, "ree", saved.observations, "financials", "owner_reported_working", now).saved).toBe(false);
  });

  it("drops malformed, duplicate, out-of-scope and extra stored fields", () => {
    const key = ownerFieldStorageKey("ree")!;
    localStorage.setItem(key, JSON.stringify({ version: 1, observations: [
      { moduleId: "devices", outcome: "owner_reported_problem", observedAtMs: now, secretToken: "DONT_STORE" },
      { moduleId: "devices", outcome: "owner_reported_working", observedAtMs: now },
      { moduleId: "financials", outcome: "owner_reported_working", observedAtMs: now },
      { moduleId: "x10", outcome: "independently_verified", observedAtMs: now },
      { moduleId: "cameras", outcome: "owner_reported_working", observedAtMs: "yesterday" },
    ] }));
    expect(loadOwnerFieldObservations(localStorage, "ree")).toEqual([{ moduleId: "devices", outcome: "owner_reported_problem", observedAtMs: now }]);
    const updated = saveOwnerFieldObservation(localStorage, "ree", loadOwnerFieldObservations(localStorage, "ree"), "devices", "owner_reported_problem", now + 1);
    expect(updated.saved).toBe(true);
    expect(localStorage.getItem(key)).not.toContain("DONT_STORE");
    localStorage.setItem(key, JSON.stringify({ version: 2, observations: [] }));
    expect(loadOwnerFieldObservations(localStorage, "ree")).toEqual([]);
  });

  it("classifies missing, 30-day-stale and future-clock observations without promoting them to verified", () => {
    const report: OwnerFieldObservation = { moduleId: "x10", outcome: "owner_reported_working", observedAtMs: now };
    expect(fieldFreshness(undefined, now)).toBe("NO_OBSERVATION");
    expect(fieldFreshness(report, now + 30 * day)).toBe("CURRENT_OWNER_REPORT");
    expect(fieldFreshness(report, now + 30 * day + 1)).toBe("STALE_OWNER_REPORT");
    expect(fieldFreshness(report, now - 6 * 60_000)).toBe("CLOCK_CHECK");
    const preflight = fieldEvidencePreflight([report], now);
    expect(preflight.currentOwnerReports).toBe(1);
    expect(preflight.independentlyVerifiedModules).toBe(0);
    expect(preflight.status).toMatch(/^BLOCKED_/);
    expect(preflight.transmission).toBe("NOT_CONFIGURED");
  });

  it("produces an aggregate proposed envelope without owner ID, URLs, tokens or acceptance claims", () => {
    const tampered = { moduleId: "cameras", outcome: "owner_reported_problem", observedAtMs: now, token: "SECRET" } as OwnerFieldObservation;
    const serialized = JSON.stringify(fieldEvidenceReportPreview([tampered], now));
    expect(serialized).toContain("LOCAL_PREVIEW_NOT_SENT");
    expect(serialized).toContain("NOT_INDEPENDENTLY_VERIFIED");
    expect(serialized).not.toContain("SECRET");
    expect(serialized).not.toContain("ownerId");
    expect(serialized).not.toContain("observedAtMs");
    expect(serialized).not.toContain("base_url");
    expect(serialized).not.toContain('"independentAcceptance":"VERIFIED"');
  });

  it("records a field issue and keeps it in the pending queue, never as independent acceptance", () => {
    render(<OwnerFieldAcceptance284 ownerId="ree" />);
    expect(screen.getByText(/Master Shell report preflight: BLOCKED/)).toBeInTheDocument();
    expect(screen.getByText(/Independently verified module acceptances:/).textContent).toContain("0");
    fireEvent.click(screen.getByRole("button", { name: "Record issue: Legacy X10 bridge" }));
    expect(screen.getByText(/Owner report saved only in this browser/)).toBeInTheDocument();
    expect(screen.getByText(/Owner reported: needs attention/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Preview owner field preflight report" }));
    expect(screen.getByText(/Review-only aggregate/)).toBeInTheDocument();
    expect(document.getElementById("hub-field-preflight-report")?.textContent).toContain("NOT_VERIFIED");
    expect(screen.queryByRole("button", { name: /send|publish|connect|approve/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Remove local observation: Legacy X10 bridge" }));
    expect(loadOwnerFieldObservations(localStorage, "ree")).toEqual([]);
  });
});
