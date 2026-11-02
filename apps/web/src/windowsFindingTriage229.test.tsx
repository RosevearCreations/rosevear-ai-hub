import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { WindowsFieldAcceptance228Panel } from "./WindowsFieldAcceptance228Panel";
import { formatWindowsFieldHandoff, type WindowsFieldDraft } from "./windowsFieldAcceptance228";
import {
  defaultTriageEntry, formatWindowsFindingPlan229, parseWindowsFieldHandoff228,
  summarizeWindowsTriage, windowsFindingSourceKey,
} from "./windowsFindingTriage229";

const scope = { installedVersion: "win-release-228", physicallyWitnessed: true };
const source: WindowsFieldDraft = {
  startup: { outcome: "finding", basis: "local_log", reference: "WIN-228-START", recordedAt: "2026-11-02T17:30:00Z" },
  ha: { outcome: "blocked", basis: "direct", reference: "WIN-228-HA", recordedAt: "2026-11-02T17:35:00Z" },
};

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Build 229 source-matched Windows repair planning", () => {
  it("starts with zero fabricated findings or independent repair approval and no network probe", () => {
    vi.stubGlobal("fetch", vi.fn());
    const result = summarizeWindowsTriage({}, { installedVersion: "", physicallyWitnessed: false }, {});
    expect(result).toMatchObject({ candidates: 0, sourceLinked: 0, ownerScoping: 0, independentlyVerified: false, repairsAuthorized: false });
    render(<WindowsFieldAcceptance228Panel onNavigate={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Finding triage & repair planning" })).toBeInTheDocument();
    expect(screen.getByLabelText("Build 229 source-matched triage totals")).toHaveTextContent("Reported findings / blockers0");
    expect(screen.getByText(/no synthetic repair backlog/)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("imports a complete Build 228 owner handoff but rejects incomplete, corrupted and fabricated pass claims", () => {
    const input = formatWindowsFieldHandoff(source, scope);
    const imported = parseWindowsFieldHandoff228(input);
    expect(imported.ok).toBe(true);
    if (imported.ok) {
      expect(imported.scope).toEqual(scope);
      expect(summarizeWindowsTriage(imported.draft, imported.scope, {}).candidates).toBe(2);
    }
    expect(parseWindowsFieldHandoff228(input.replace("Schema: rosevear-hub-windows-field-228/v1", "Schema: forged"))).toMatchObject({ ok: false });
    expect(parseWindowsFieldHandoff228(input.replace("WIN-228-START", "WIN-228-START | fake"))).toMatchObject({ ok: false });
    expect(parseWindowsFieldHandoff228(input.replace("FINDING | local_log", "PASS | local_log"))).toMatchObject({ ok: false });
    expect(parseWindowsFieldHandoff228(input.replace("WIN-228-START", "https://secret.local"))).toMatchObject({ ok: false });
    expect(parseWindowsFieldHandoff228(input.slice(0, 250))).toMatchObject({ ok: false });
  });

  it("requires source provenance, owner priority and separately referenced reproduction before proposing a repair", () => {
    const emptyScope = { installedVersion: "", physicallyWitnessed: false };
    expect(summarizeWindowsTriage(source, emptyScope, {}).rows[0].gate).toBe("source_gap");
    const summary = summarizeWindowsTriage(source, scope, {});
    expect(summary.rows.map(row => row.gate)).toEqual(["untriaged", "untriaged"]);
    const row = summary.rows[0];
    const base = { ...defaultTriageEntry, sourceKey: windowsFindingSourceKey(row, scope) };
    expect(summarizeWindowsTriage(source, scope, { startup: { ...base, decision: "repair_proposal" } }).rows[0].gate).toBe("priority_needed");
    expect(summarizeWindowsTriage(source, scope, { startup: { ...base, priority: "p1", decision: "repair_proposal" } }).rows[0].gate).toBe("reproduction_gap");
    const ready = { ...base, priority: "p1" as const, decision: "repair_proposal" as const, reproduction: "reproduced" as const, reproductionReference: "WIN-229-RETEST" };
    const result = summarizeWindowsTriage(source, scope, { startup: ready });
    expect(result.ownerScoping).toBe(1);
    expect(result.rows[0].gate).toBe("owner_scope_review");
    expect(result.repairsAuthorized).toBe(false);
    const handoff = formatWindowsFindingPlan229(source, scope, { startup: ready });
    expect(handoff).toContain("source WIN-228-START");
    expect(handoff).toContain("retest WIN-229-RETEST");
    expect(handoff).toContain("NO REPAIRS APPROVED");
    expect(handoff).toContain("DISCONNECTED / HOLD");
  });

  it("invalidates plans on source-reference, evidence-time or installed-version changes", () => {
    const first = summarizeWindowsTriage(source, scope, {}).rows[0];
    const entry = { ...defaultTriageEntry, priority: "p0" as const, decision: "investigate" as const, sourceKey: windowsFindingSourceKey(first, scope) };
    expect(summarizeWindowsTriage(source, scope, { startup: entry }).rows[0].gate).toBe("investigation_review");
    const changed = { ...source, startup: { ...source.startup!, reference: "WIN-228-NEW" } };
    expect(summarizeWindowsTriage(changed, scope, { startup: entry }).rows[0].gate).toBe("source_changed");
    expect(summarizeWindowsTriage(source, { ...scope, installedVersion: "new-version" }, { startup: entry }).rows[0].gate).toBe("source_changed");
    expect(summarizeWindowsTriage({ ...source, startup: { ...source.startup!, recordedAt: "2026-11-02T18:30:00Z" } }, scope, { startup: entry }).rows[0].gate).toBe("source_changed");
  });

  it("loads real-format owner handoff into the on-screen queue, then prevents automatic repair authorization", () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<WindowsFieldAcceptance228Panel onNavigate={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Load a previously copied Build 228 private handoff/), { target: { value: formatWindowsFieldHandoff(source, scope) } });
    fireEvent.click(screen.getByRole("button", { name: /Replace current session observations/ }));
    expect(screen.getByLabelText("Build 229 source-matched triage totals")).toHaveTextContent("Reported findings / blockers2");
    expect(screen.getByText(/prior triage reset/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Owner priority", { selector: "select#windows-229-priority-startup" }), { target: { value: "p1" } });
    fireEvent.change(screen.getByLabelText("Reproduction", { selector: "select#windows-229-reproduction-startup" }), { target: { value: "reproduced" } });
    fireEvent.change(screen.getByLabelText("Separate reproduction reference (safe code)", { selector: "input#windows-229-repro-ref-startup" }), { target: { value: "WIN-229-RETEST" } });
    fireEvent.change(screen.getByLabelText("Proposed disposition", { selector: "select#windows-229-decision-startup" }), { target: { value: "repair_proposal" } });
    expect(screen.getByLabelText("Build 229 source-matched triage totals")).toHaveTextContent("For owner scoping (not approved)1");
    expect(screen.getByText(/No repairs are authorized/)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
