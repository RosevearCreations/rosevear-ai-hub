import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { WindowsFieldAcceptance228Panel } from "./WindowsFieldAcceptance228Panel";
import { formatWindowsFieldHandoff, type WindowsFieldDraft } from "./windowsFieldAcceptance228";
import {
  defaultTriageEntry, formatWindowsFindingPlan229, summarizeWindowsTriage, windowsFindingSourceKey,
  type WindowsTriageDraft,
} from "./windowsFindingTriage229";
import {
  defaultWindowsRetest, formatWindowsRecoveryPacket230, parseWindowsTriageHandoff229,
  summarizeWindowsRecoveryRetests, windows230ChangeKey, windows230SourceKey,
} from "./windowsRecoveryRetest230";

const scope = { installedVersion: "win-228", physicallyWitnessed: true };
const draft: WindowsFieldDraft = {
  ha: { outcome: "finding", basis: "local_log", reference: "WIN-228-HA", recordedAt: "2020-11-02T17:30:00Z" },
  camera: { outcome: "blocked", basis: "direct", reference: "WIN-228-CAMERA", recordedAt: "2020-11-02T17:32:00Z" },
  theme: { outcome: "finding", basis: "direct", reference: "WIN-228-THEME", recordedAt: "2020-11-02T17:36:00Z" },
};
const triage = summarizeWindowsTriage(draft, scope, {});
const row = triage.rows.find(item => item.id === "ha")!;
const plan = { ...defaultTriageEntry, priority: "p1" as const, decision: "repair_proposal" as const,
  reproduction: "reproduced" as const, reproductionReference: "WIN-229-HA",
  sourceKey: windowsFindingSourceKey(row, scope) };
const plans: WindowsTriageDraft = { ha: plan };
const scoped = summarizeWindowsTriage(draft, scope, plans).rows.find(item => item.id === "ha")!;

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Build 230 installed recovery, device and camera retest closure guards", () => {
  it("starts empty without real Build 228/229 findings; no independent closure or actuation", () => {
    vi.stubGlobal("fetch", vi.fn());
    const result = summarizeWindowsRecoveryRetests({}, { installedVersion: "", physicallyWitnessed: false }, {}, {});
    expect(result).toMatchObject({ inScope: 0, ownerClosureCandidates: 0, issuesClosed: 0, independentlyVerified: false, repairsExecuted: false });
    render(<WindowsFieldAcceptance228Panel onNavigate={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Retest comparison & owner closure review" })).toBeInTheDocument();
    expect(screen.getByLabelText("Build 230 Windows retest totals")).toHaveTextContent("Reported recovery/device findings0");
    expect(screen.getByText(/No authentic Build 228\/229 Windows recovery or device\/camera repair scope/)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("routes theme/keyboard/roles forward, but keeps unsanctioned device findings unclosed", () => {
    const result = summarizeWindowsRecoveryRetests(draft, scope, plans, {});
    expect(result.inScope).toBe(2);
    expect(result.handedToBuild231).toBe(1);
    expect(result.rows.find(item => item.id === "ha")?.gate).toBe("not_started");
    expect(result.rows.find(item => item.id === "camera")?.gate).toBe("awaiting_229_scope");
    expect(result.ownerClosureCandidates).toBe(0);
    expect(result.issuesClosed).toBe(0);
  });

  it("requires owner-observed change, safe-stop boundary, new witnessed retest and distinct fresh evidence", () => {
    const base = { ...defaultWindowsRetest, sourceKey: windows230SourceKey(scoped, scope) };
    expect(summarizeWindowsRecoveryRetests(draft, scope, plans, { ha: base }).rows[0].gate).toBe("change_evidence_gap");
    const changed = { ...base, ownerChangeAttested: true, changeReference: "WIN-230-FIX",
      changeRecordedAt: "2020-11-03T18:00:00Z" };
    expect(summarizeWindowsRecoveryRetests(draft, scope, plans, { ha: changed }).rows[0].gate).toBe("safety_review_gap");
    const safe = { ...changed, safetyReviewed: true };
    expect(summarizeWindowsRecoveryRetests(draft, scope, plans, { ha: safe }).rows[0].gate).toBe("retest_not_run");
    const retested = { ...safe, outcome: "pass" as const, basis: "supervised_retest" as const,
      reference: "WIN-230-PASS", installedVersion: "win-retested", retestWitnessed: true,
      retestRecordedAt: "2020-11-03T18:30:00Z" };
    const verifiedChange = { ...retested, testedChangeKey: windows230ChangeKey(retested) };
    const result = summarizeWindowsRecoveryRetests(draft, scope, plans, { ha: verifiedChange });
    expect(result.ownerClosureCandidates).toBe(1);
    expect(result.rows.find(item => item.id === "ha")?.gate).toBe("owner_closure_candidate");
    expect(result.issuesClosed).toBe(0);
    expect(result.independentlyVerified).toBe(false);
    expect(result.repairsExecuted).toBe(false);
    expect(formatWindowsRecoveryPacket230(draft, scope, plans, { ha: verifiedChange })).toContain("independently closed: 0");
    expect(summarizeWindowsRecoveryRetests(draft, scope, plans, { ha: { ...verifiedChange, reference: "WIN-228-HA" } }).rows[0].gate).toBe("fresh_retest_gap");
    expect(summarizeWindowsRecoveryRetests(draft, scope, plans, { ha: { ...verifiedChange, reference: "WIN-229-HA" } }).rows[0].gate).toBe("fresh_retest_gap");
    expect(summarizeWindowsRecoveryRetests(draft, scope, plans, { ha: { ...verifiedChange, retestRecordedAt: "2020-11-02T17:00:00Z" } }).rows[0].gate).toBe("fresh_retest_gap");
    expect(summarizeWindowsRecoveryRetests(draft, scope, plans, { ha: { ...verifiedChange, retestWitnessed: false } }).rows[0].gate).toBe("fresh_retest_gap");
  });

  it("does not silently close failures, blocked retests or stale source/retest plans", () => {
    const initial = { ...defaultWindowsRetest, sourceKey: windows230SourceKey(scoped, scope), ownerChangeAttested: true,
      changeReference: "WIN-230-FIX", changeRecordedAt: "2020-11-03T18:00:00Z", safetyReviewed: true,
      installedVersion: "win-retested", basis: "direct" as const, reference: "WIN-230-RETEST",
      retestWitnessed: true, retestRecordedAt: "2020-11-03T18:30:00Z", outcome: "still_failing" as const };
    const failed = { ...initial, testedChangeKey: windows230ChangeKey(initial) };
    expect(summarizeWindowsRecoveryRetests(draft, scope, plans, { ha: failed }).rows[0].gate).toBe("still_failing");
    expect(summarizeWindowsRecoveryRetests(draft, scope, plans, { ha: { ...failed, outcome: "blocked" } }).rows[0].gate).toBe("retest_blocked");
    expect(summarizeWindowsRecoveryRetests(draft, scope, plans, { ha: { ...failed, changeReference: "WIN-230-NEW" } }).rows[0].gate).toBe("fresh_retest_gap");
    const revisedPlan = { ...plan, priority: "p0" as const };
    expect(summarizeWindowsRecoveryRetests(draft, scope, { ha: revisedPlan }, { ha: failed }).rows[0].gate).toBe("source_changed");
    const staleBaseline = { ...draft, ha: { ...draft.ha!, reference: "WIN-228-NEW" } };
    expect(summarizeWindowsRecoveryRetests(staleBaseline, scope, plans, { ha: failed }).rows[0].gate).toBe("awaiting_229_scope");
  });

  it("accepts a full source-matched Build 229 handoff only after the matching Build 228 owner evidence", () => {
    const input = formatWindowsFindingPlan229(draft, scope, plans);
    const parsed = parseWindowsTriageHandoff229(input, draft, scope);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(summarizeWindowsTriage(draft, scope, parsed.plans).ownerScoping).toBe(1);
    expect(parseWindowsTriageHandoff229(input, {}, scope)).toMatchObject({ ok: false });
    expect(parseWindowsTriageHandoff229(input.replace("source WIN-228-HA", "source WRONG"), draft, scope)).toMatchObject({ ok: false });
    expect(parseWindowsTriageHandoff229(input.replace("decision repair_proposal", "decision authorized"), draft, scope)).toMatchObject({ ok: false });
    expect(parseWindowsTriageHandoff229(input.replace("priority p1", "priority p4"), draft, scope)).toMatchObject({ ok: false });
  });

  it("imports matching private handoffs and creates an owner-only closure candidate without any network call", () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<WindowsFieldAcceptance228Panel onNavigate={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Load a previously copied Build 228 private handoff/), { target: { value: formatWindowsFieldHandoff(draft, scope) } });
    fireEvent.click(screen.getByRole("button", { name: /Replace current session observations/ }));
    fireEvent.change(screen.getByLabelText(/Load a previously copied Build 229 private repair plan/), { target: { value: formatWindowsFindingPlan229(draft, scope, plans) } });
    fireEvent.click(screen.getByRole("button", { name: "Import matching Build 229 plan and reset retests" }));
    expect(screen.getByLabelText("Build 230 Windows retest totals")).toHaveTextContent("Reported recovery/device findings2");
    expect(screen.getByLabelText("Build 230 Windows retest totals")).toHaveTextContent("Ready for owner retest planning1");
    const ha = screen.getByLabelText("Build 230 Windows owner retest cases").querySelector("article")!;
    expect(ha).toHaveTextContent("Home Assistant inventory reconciliation");
    fireEvent.change(ha.querySelector("input#windows-230-change-ha")!, { target: { value: "WIN-230-FIX" } });
    fireEvent.change(ha.querySelector("input#windows-230-version-ha")!, { target: { value: "win-230" } });
    fireEvent.change(ha.querySelector("select#windows-230-outcome-ha")!, { target: { value: "pass" } });
    fireEvent.change(ha.querySelector("select#windows-230-basis-ha")!, { target: { value: "direct" } });
    fireEvent.change(ha.querySelector("input#windows-230-reference-ha")!, { target: { value: "WIN-230-RETEST" } });
    const labels = ha.querySelectorAll(".windows-retest-230-confirmations input[type=checkbox]");
    labels.forEach(control => fireEvent.click(control));
    fireEvent.click(ha.querySelector("button")!);
    expect(screen.getByLabelText("Build 230 Windows retest totals")).toHaveTextContent("Owner closure candidates (unverified)1");
    expect(screen.getByLabelText("Build 230 Windows retest totals")).toHaveTextContent("Independently closed0");
    expect(fetch).not.toHaveBeenCalled();
  });
});
