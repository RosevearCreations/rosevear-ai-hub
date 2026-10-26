import { describe, expect, it } from "vitest";
import { createTrialReceipt, recordTrialObservation, type TrialEnvironment } from "./ownerFieldTrial";
import {
  advanceRepairHandoff, compareRepairHandoff, createReconciliationReceipt, createRepairHandoff,
  findingSeverity, parseReconciliationReceipt, reconcileTrialFindings,
} from "./ownerTrialReconciliation";

const environment: TrialEnvironment = { installed_version: "0.0.4-build149", access: "local_console", installed_windows_witnessed: true };
const at1 = "2026-10-25T08:00:00.000Z";
const at2 = "2026-10-25T09:00:00.000Z";
const at3 = "2026-10-25T10:00:00.000Z";
const at4 = "2026-10-25T11:00:00.000Z";
const at5 = "2026-10-25T12:00:00.000Z";

function cameraIssue() {
  return recordTrialObservation([], environment, { case_id: "cameras", outcome: "issue", finding: "playback_missing",
    next_owner: "camera_operator", witnessed: true }, at1);
}

describe("Build 149 owner trial reconciliation and manual handoffs", () => {
  it("groups actual historical findings and severity by module, owner and repeat counts without treating a pass as certified", () => {
    expect(reconcileTrialFindings([])).toEqual([]);
    expect(findingSeverity("startup")).toBe("high");
    expect(findingSeverity("accessibility")).toBe("moderate");
    expect(findingSeverity("other")).toBe("low");
    let history = cameraIssue();
    history = recordTrialObservation(history, environment, { case_id: "cameras", outcome: "blocked",
      finding: "playback_missing", next_owner: "camera_operator", witnessed: true }, at2);
    history = recordTrialObservation(history, environment, { case_id: "cameras", outcome: "passed",
      finding: "none", next_owner: "camera_operator", witnessed: true }, at3);
    const [finding] = reconcileTrialFindings(history);
    expect(finding).toMatchObject({ case_id: "cameras", section: "Cameras", severity: "high",
      next_owner: "camera_operator", first_observed_at: at1, baseline_observed_at: at2,
      baseline_index: 1, occurrence_count: 2, comparison: "owner_improvement_review_hold", retest_observed_at: at3 });
    expect(createReconciliationReceipt(environment, [], history, [], at4)).toMatchObject({
      field_acceptance: "FIELD_ACCEPTANCE_HOLD", independent_review: "INDEPENDENT_REVIEW_HOLD" });
  });

  it("requires an actual issue, owner review then explicit private handoff preparation without sending or closing", () => {
    expect(() => createRepairHandoff([], [], "home", at2)).toThrow(/witnessed issue/);
    const history = cameraIssue();
    const draft = createRepairHandoff(history, [], "cameras", at2);
    expect(draft[0]).toMatchObject({ baseline_index: 0, stage: "draft", severity: "high", next_owner: "camera_operator" });
    expect(() => createRepairHandoff(history, draft, "cameras", at2)).toThrow(/Duplicate handoff/);
    expect(() => advanceRepairHandoff(history, draft, "cameras", 0, false, at3)).toThrow(/Explicit owner review/);
    const reviewed = advanceRepairHandoff(history, draft, "cameras", 0, true, at3);
    expect(reviewed[0]).toMatchObject({ stage: "owner_reviewed", reviewed_at: at3, prepared_at: null });
    const prepared = advanceRepairHandoff(history, reviewed, "cameras", 0, true, at4);
    expect(prepared[0]).toMatchObject({ stage: "prepared_for_private_handoff", reviewed_at: at3, prepared_at: at4 });
    expect(() => advanceRepairHandoff(history, prepared, "cameras", 0, true, at5)).toThrow(/no pending handoff/);
    expect(createReconciliationReceipt(environment, [], history, prepared, at5).independent_review).toBe("INDEPENDENT_REVIEW_HOLD");
  });

  it("compares retests against the exact original handoff, including same finding, changed finding and observed improvement", () => {
    let history = cameraIssue();
    const [handoff] = createRepairHandoff(history, [], "cameras", at2);
    expect(compareRepairHandoff(history, handoff).state).toBe("awaiting_retest");
    history = recordTrialObservation(history, environment, { case_id: "cameras", outcome: "blocked",
      finding: "playback_missing", next_owner: "camera_operator", witnessed: true }, at3);
    expect(compareRepairHandoff(history, handoff).state).toBe("still_open");
    history = recordTrialObservation(history, environment, { case_id: "cameras", outcome: "issue",
      finding: "offline", next_owner: "camera_operator", witnessed: true }, at4);
    expect(compareRepairHandoff(history, handoff)).toMatchObject({ state: "changed_finding", latest_finding: "offline", latest_observed_at: at4 });
    history = recordTrialObservation(history, environment, { case_id: "cameras", outcome: "passed",
      finding: "none", next_owner: "camera_operator", witnessed: true }, at5);
    expect(compareRepairHandoff(history, handoff).state).toBe("owner_improvement_review_hold");
  });

  it("accepts both private receipt versions and preserves timestamps and stages as historical evidence", () => {
    const history = cameraIssue();
    const legacy = createTrialReceipt(environment, [], history, at3);
    expect(parseReconciliationReceipt(JSON.stringify(legacy))).toMatchObject({ trial: legacy, handoffs: [] });
    const handoffs = advanceRepairHandoff(history, createRepairHandoff(history, [], "cameras", at2), "cameras", 0, true, at3);
    const wrapper = createReconciliationReceipt(environment, [], history, handoffs, at4);
    expect(parseReconciliationReceipt(JSON.stringify(wrapper))).toEqual({ trial: wrapper.trial, handoffs });
    expect(wrapper.trial.observations[0].observed_at).toBe(at1);
  });

  it("rejects forged acceptance, unknown secret-bearing handoff fields, fake baselines and out-of-order transitions", () => {
    const history = cameraIssue();
    const draft = createRepairHandoff(history, [], "cameras", at2);
    const receipt = createReconciliationReceipt(environment, [], history, draft, at4);
    expect(() => parseReconciliationReceipt(JSON.stringify({ ...receipt, independent_review: "GREEN" }))).toThrow(/acceptance/);
    expect(() => parseReconciliationReceipt(JSON.stringify({ ...receipt, handoffs: [{ ...draft[0], endpoint: "private://camera" }] }))).toThrow(/unsafe repair handoff/);
    expect(() => parseReconciliationReceipt(JSON.stringify({ ...receipt, handoffs: [{ ...draft[0], baseline_index: 999 }] }))).toThrow(/unsubstantiated/);
    expect(() => parseReconciliationReceipt(JSON.stringify({ ...receipt, handoffs: [{ ...draft[0], stage: "prepared_for_private_handoff" }] }))).toThrow(/unsubstantiated/);
    expect(() => parseReconciliationReceipt(JSON.stringify({ ...receipt, handoffs: [{ ...draft[0], created_at: at5 }] }))).toThrow(/unsubstantiated/);
    expect(() => parseReconciliationReceipt(JSON.stringify({ ...receipt, handoffs: [null] }))).toThrow(/unsafe repair handoff/);
  });
});
