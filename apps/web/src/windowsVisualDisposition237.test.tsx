import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WindowsAppearanceAcceptance236Panel } from "./WindowsAppearanceAcceptance236Panel";
import { WindowsVisualDisposition237Panel } from "./WindowsVisualDisposition237Panel";
import { appearance236ObservationKey, defaultAppearance236Entry,
  type Appearance236Entry } from "./windowsAppearanceAcceptance236";
import { defaultVisual237Entry, formatVisual237Packet, summarizeVisual237,
  visual237DecisionKey, visual237RetestKey, type Visual237Entry } from "./windowsVisualDisposition237";

const scope = { installedVersion: "hub-237-windows", ownerWitnessed: true };
const sourceAt = "2026-11-03T11:00:00.000Z";
const retestAt = "2026-11-03T11:30:00.000Z";
const decisionAt = "2026-11-03T12:00:00.000Z";

function sourceFinding(outcome: "finding" | "blocked" = "finding") {
  const entry: Appearance236Entry = { ...defaultAppearance236Entry, outcome,
    viewport: "windows_desktop", symptom: "contrast", reference: "WIN-236-CONTRAST",
    observedAt: sourceAt };
  return { contrast: { ...entry, observedKey: appearance236ObservationKey("contrast", "dark", scope, entry) } };
}

function retested(outcome: "pass" | "finding" | "blocked" = "finding") {
  const source = sourceFinding();
  const sourceRow = summarizeVisual237("dark", scope, source, {}).rows[0].sourceRow;
  const entry: Visual237Entry = { ...defaultVisual237Entry, retestOutcome: outcome,
    retestViewport: "windows_desktop", retestSymptom: outcome === "pass" ? "none" : "contrast",
    retestReference: "WIN-237-CONTRAST", retestWitnessed: true, retestAt };
  return { source, entry: { ...entry, retestKey: visual237RetestKey("dark", scope, sourceRow, entry) } };
}

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("Build 237 owner Windows visual finding retests and conditional UI repair readiness", () => {
  it("starts with zero observed findings, retests, outside acceptance and repairs", () => {
    const summary = summarizeVisual237("dark", { installedVersion: "", ownerWitnessed: false }, {}, {});
    expect(summary).toMatchObject({ sourceFindings: 0, ownerRetestPasses: 0, reviewReady: 0,
      authenticatedOutsideReviews: 0, independentWindowsAcceptance: 0,
      repairsAuthorized: 0, repairsExecuted: 0, privateRelay: "OFF" });
    expect(summary.rows).toHaveLength(0);
    expect(formatVisual237Packet("dark", scope, {}, {})).toContain("NO REPAIR AUTHORIZATION");
  });

  it("accepts only a fresh Build 236 observed finding as a valid retest source", () => {
    const source = sourceFinding();
    const original = summarizeVisual237("dark", scope, source, {});
    expect(original.rows[0].gate).toBe("retest_not_tested");
    expect(summarizeVisual237("dark", { ...scope, ownerWitnessed: false }, source, {}).rows[0].gate).toBe("source_stale");
    expect(summarizeVisual237("standard", scope, source, {}).rows[0].gate).toBe("source_stale");
    expect(summarizeVisual237("dark", { ...scope, installedVersion: "new-version" }, source, {}).rows[0].gate).toBe("source_stale");
    expect(summarizeVisual237("dark", scope, { contrast: { ...source.contrast, observedAt: "" } }, {}).rows[0].gate).toBe("source_stale");
    expect(summarizeVisual237("dark", scope, {}, {}).rows).toHaveLength(0);
  });

  it("keeps a successful owner retest and blocked retest open, rejecting duplicate and viewport evidence", () => {
    const { source, entry } = retested("pass");
    const successful = summarizeVisual237("dark", scope, source, { contrast: entry });
    expect(successful).toMatchObject({ ownerRetestPasses: 1, openFindings: 1, reviewReady: 0, repairsAuthorized: 0 });
    expect(successful.rows[0].gate).toBe("owner_retest_pass");
    expect(summarizeVisual237("dark", scope, source, { contrast: { ...entry, retestReference: source.contrast.reference } }).rows[0].gate).toBe("duplicate_reference");
    expect(summarizeVisual237("dark", scope, source, { contrast: { ...entry, retestViewport: "windows_tablet" } }).rows[0].gate).toBe("viewport_mismatch");
    const blocked = retested("blocked");
    expect(summarizeVisual237("dark", scope, blocked.source, { contrast: blocked.entry }).rows[0].gate).toBe("retest_blocked");
  });

  it("requires a same-symptom failing retest, matching UI-only scope, separate decision and fresh receipt", () => {
    const { source, entry } = retested();
    expect(summarizeVisual237("dark", scope, source, { contrast: entry }).rows[0].gate).toBe("open_finding");
    expect(summarizeVisual237("dark", scope, source, { contrast: { ...entry, retestSymptom: "glare" } }).rows[0].gate).toBe("retest_stale");
    const mismatched = { ...entry, disposition: "request_ui_review" as const,
      repairArea: "navigation_layout" as const };
    expect(summarizeVisual237("dark", scope, source, { contrast: mismatched }).rows[0].gate).toBe("repair_scope_gap");
    const decision = { ...mismatched, repairArea: "color_contrast" as const,
      decisionReference: "WIN-237-REVIEW-CONTRAST", decisionAttested: true, decisionAt };
    const ready = { ...decision, decisionKey: visual237DecisionKey(decision) };
    const result = summarizeVisual237("dark", scope, source, { contrast: ready });
    expect(result.rows[0].gate).toBe("review_ready");
    expect(result).toMatchObject({ reviewReady: 1, openFindings: 1,
      independentWindowsAcceptance: 0, authenticatedOutsideReviews: 0,
      repairsAuthorized: 0, repairsExecuted: 0 });
    expect(summarizeVisual237("dark", scope, source,
      { contrast: { ...ready, decisionReference: entry.retestReference } }).rows[0].gate).toBe("decision_evidence_gap");
    expect(summarizeVisual237("dark", scope, source,
      { contrast: { ...ready, decisionAt: retestAt } }).rows[0].gate).toBe("decision_stale");
    expect(formatVisual237Packet("dark", scope, source, { contrast: ready })).toContain("repairs authorized: 0");
  });

  it("invalidates a retest when original source changes and disallows non-matching symptoms", () => {
    const { source, entry } = retested();
    const changedSource = { contrast: { ...source.contrast, reference: "WIN-236-NEW" } };
    expect(summarizeVisual237("dark", scope, changedSource, { contrast: entry }).rows[0].gate).toBe("source_stale");
    const changedObservation = { contrast: { ...source.contrast, observedAt: "2026-11-03T11:10:00.000Z" } };
    expect(summarizeVisual237("dark", scope, changedObservation, { contrast: entry }).rows[0].gate).toBe("retest_stale");
    const alteredEntry = { ...entry, retestSymptom: "glare" as const,
      retestKey: visual237RetestKey("dark", scope, summarizeVisual237("dark", scope, source, {}).rows[0].sourceRow,
        { ...entry, retestSymptom: "glare" }) };
    expect(summarizeVisual237("dark", scope, source, { contrast: alteredEntry }).rows[0].gate).toBe("different_symptom");
  });

  it("starts owner review empty, supports real field entry, and does not use fetch or actuate devices", () => {
    vi.stubGlobal("fetch", vi.fn());
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-03T13:00:00.000Z"));
    render(<WindowsAppearanceAcceptance236Panel theme="dark" onNavigate={vi.fn()} />);
    expect(screen.getByLabelText("Build 237 Windows retest and disposition totals")).toHaveTextContent("Build 236 findings0");
    fireEvent.click(screen.getByRole("button", { name: "Open Build 236 Windows visual acceptance worksheet" }));
    fireEvent.change(screen.getByLabelText(/Exact owner-observed installed Windows Hub version/),
      { target: { value: "hub-237-windows" } });
    fireEvent.click(screen.getByLabelText(/We personally observed this installed Windows Hub/));
    const sourceCard = screen.getByLabelText("Build 236 installed Windows visual review cases")
      .querySelectorAll("article")[3];
    fireEvent.change(sourceCard.querySelector("select#windows-236-outcome-contrast")!, { target: { value: "finding" } });
    fireEvent.change(sourceCard.querySelector("select#windows-236-viewport-contrast")!, { target: { value: "windows_desktop" } });
    fireEvent.change(sourceCard.querySelector("input#windows-236-ref-contrast")!, { target: { value: "WIN-236-CONTRAST" } });
    fireEvent.change(sourceCard.querySelector("select#windows-236-symptom-contrast")!, { target: { value: "contrast" } });
    fireEvent.click(sourceCard.querySelectorAll("button")[1]);
    expect(screen.getByLabelText("Build 237 Windows retest and disposition totals")).toHaveTextContent("Build 236 findings1");
    fireEvent.click(screen.getByRole("button", { name: "Open Build 237 owner retest worksheet" }));
    fireEvent.change(screen.getByLabelText("Actual owner-observed retest outcome"), { target: { value: "finding" } });
    fireEvent.change(screen.getByLabelText("Actual Windows retest viewport"), { target: { value: "windows_desktop" } });
    fireEvent.change(screen.getByLabelText("Unique new retest evidence code"), { target: { value: "WIN-237-CONTRAST" } });
    fireEvent.change(screen.getByLabelText("Actual observed retest symptom"), { target: { value: "contrast" } });
    fireEvent.click(screen.getByLabelText(/We personally retested the installed Windows Hub/));
    vi.advanceTimersByTime(1000);
    fireEvent.click(screen.getByRole("button", { name: "Record fresh Windows owner retest" }));
    expect(screen.getAllByText(/Finding still open; choose an owner disposition/)).toHaveLength(2);
    fireEvent.change(screen.getByLabelText("Next owner request"), { target: { value: "request_ui_review" } });
    fireEvent.change(screen.getByLabelText(/Exact UI-only review area/), { target: { value: "color_contrast" } });
    fireEvent.change(screen.getByLabelText("New, distinct disposition evidence code"),
      { target: { value: "WIN-237-REVIEW-CONTRAST" } });
    fireEvent.click(screen.getByLabelText(/We authorize recording this disposition request only/));
    vi.advanceTimersByTime(1000);
    fireEvent.click(screen.getByRole("button", { name: "Record separate owner disposition" }));
    expect(screen.getByLabelText("Build 237 Windows retest and disposition totals")).toHaveTextContent("UI review requests ready1");
    expect(screen.getByLabelText("Build 237 Windows retest and disposition totals")).toHaveTextContent("Independent acceptance / repairs authorized0 / 0");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not expose a retest candidate from absent source evidence", () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<WindowsVisualDisposition237Panel theme="dark" scope={{ installedVersion: "", ownerWitnessed: false }} sourceDraft={{}} />);
    fireEvent.click(screen.getByRole("button", { name: "Open Build 237 owner retest worksheet" }));
    expect(screen.getByText(/First open Build 236 above/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Record fresh Windows owner retest" })).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
