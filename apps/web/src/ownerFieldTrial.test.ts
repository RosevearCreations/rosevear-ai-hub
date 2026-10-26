import { describe, expect, it } from "vitest";
import {
  TRIAL_CASES, acknowledgeTrialFollowup, createTrialReceipt, latestTrialObservations,
  parseTrialReceipt, recordTrialObservation, summarizeOwnerTrial, validateInstalledVersion,
  trialSourceIsFresh,
  type TrialEnvironment, type TrialObservation,
} from "./ownerFieldTrial";

const installed: TrialEnvironment = { installed_version: "0.0.4-build148", access: "private_lan", installed_windows_witnessed: true };
const unknown: TrialEnvironment = { installed_version: "", access: "unknown", installed_windows_witnessed: false };
const time1 = "2026-10-25T10:00:00.000Z";
const time2 = "2026-10-25T12:00:00.000Z";
const time3 = "2026-10-25T14:00:00.000Z";

function issue(): TrialObservation[] {
  return recordTrialObservation([], unknown, { case_id: "cameras", outcome: "issue", finding: "playback_missing", next_owner: "camera_operator", witnessed: true }, time1);
}

describe("Build 148 owner field trial boundaries", () => {
  it("keeps every untested module and independent field acceptance on HOLD", () => {
    expect(TRIAL_CASES).toHaveLength(9);
    expect(summarizeOwnerTrial([])).toEqual({ total: 9, not_tested: 9, pass_observed: 0,
      open_followups: 0, awaiting_independent_review: 0, unacknowledged_followups: 0,
      field_acceptance: "FIELD_ACCEPTANCE_HOLD" });
  });

  it("rejects unwitnessed passes and passes without an actually checked installed context", () => {
    const input = { case_id: "home" as const, outcome: "passed" as const, finding: "none" as const, next_owner: "unassigned" as const, witnessed: true };
    expect(() => recordTrialObservation([], unknown, input, time1)).toThrow(/installed Windows version/);
    expect(() => recordTrialObservation([], installed, { ...input, witnessed: false }, time1)).toThrow(/personally witness/);
    expect(() => recordTrialObservation([], installed, { ...input, finding: "offline" }, time1)).toThrow(/unresolved finding/);
    expect(() => recordTrialObservation([], installed, input, time1)).not.toThrow();
  });

  it("requires an owner and explicit category for issue/blocked follow-ups", () => {
    const input = { case_id: "mqtt" as const, outcome: "blocked" as const, finding: "offline" as const, next_owner: "unassigned" as const, witnessed: true };
    expect(() => recordTrialObservation([], unknown, input, time1)).toThrow(/named follow-up role/);
    expect(() => recordTrialObservation([], unknown, { ...input, finding: "none", next_owner: "household_owner" }, time1)).toThrow(/finding category/);
    const results = recordTrialObservation([], unknown, { ...input, next_owner: "household_owner" }, time1);
    expect(summarizeOwnerTrial(results).open_followups).toBe(1);
    expect(summarizeOwnerTrial(results).unacknowledged_followups).toBe(1);
  });

  it("acknowledges without closing, and preserves the earlier failure after a witnessed retest pass", () => {
    const first = issue();
    const acknowledged = acknowledgeTrialFollowup(first, "cameras", time2);
    expect(acknowledged[0].acknowledged_at).toBe(time2);
    expect(first[0].acknowledged_at).toBeNull();
    expect(summarizeOwnerTrial(acknowledged).open_followups).toBe(1);
    const retest = recordTrialObservation(acknowledged, installed,
      { case_id: "cameras", outcome: "passed", finding: "none", next_owner: "camera_operator", witnessed: true }, time3);
    expect(retest).toHaveLength(2);
    expect(latestTrialObservations(retest).get("cameras")?.outcome).toBe("passed");
    expect(summarizeOwnerTrial(retest).open_followups).toBe(0);
    expect(summarizeOwnerTrial(retest).awaiting_independent_review).toBe(1);
    expect(summarizeOwnerTrial(retest).field_acceptance).toBe("FIELD_ACCEPTANCE_HOLD");
    expect(() => acknowledgeTrialFollowup(retest, "cameras", time3)).toThrow(/Only an active finding/);
  });

  it("exports only bounded classified claims, never raw source identity, and recomputes its HOLD summary on import", () => {
    const history = recordTrialObservation([], installed,
      { case_id: "windows", outcome: "passed", finding: "none", next_owner: "household_owner", witnessed: true }, time1);
    const receipt = createTrialReceipt(installed, [{ source: "mqtt", state: "online_reported", read_at: time2 }], history, time3);
    expect(receipt.field_acceptance).toBe("FIELD_ACCEPTANCE_HOLD");
    const raw = JSON.stringify(receipt);
    expect(raw).not.toMatch(/mqtt\.password|base_url|host|token|credentials/);
    const restored = parseTrialReceipt(raw);
    expect(restored).toEqual(receipt);
    expect(trialSourceIsFresh(receipt.source_readings[0], Date.parse(time2) + 10_000)).toBe(true);
    expect(trialSourceIsFresh(receipt.source_readings[0], Date.parse(time2) + 600_000)).toBe(false);
    const forgedSummary = { ...receipt, summary: { ...receipt.summary, field_acceptance: "GREEN", not_tested: 0 } };
    expect(parseTrialReceipt(JSON.stringify(forgedSummary)).summary).toEqual(receipt.summary);
  });

  it("rejects false GREEN, privileged/unknown case IDs, unsafe version strings and duplicate source readings", () => {
    const receipt = createTrialReceipt(installed, [], issue(), time2);
    expect(() => parseTrialReceipt(JSON.stringify({ ...receipt, field_acceptance: "GREEN" }))).toThrow(/Unsupported|Unknown/);
    expect(() => parseTrialReceipt(JSON.stringify({ ...receipt, observations: [{ ...issue()[0], case_id: "Secrets" }] }))).toThrow(/Malformed/);
    expect(() => validateInstalledVersion("C:\\Users\\Ree\\secret.txt")).toThrow(/Version/);
    expect(() => parseTrialReceipt(JSON.stringify({ ...receipt, environment: { ...installed, installed_version: "https://secret.example" } }))).toThrow(/Version/);
    const duplicated = { source: "mqtt", state: "online_reported", read_at: time2 };
    expect(() => parseTrialReceipt(JSON.stringify({ ...receipt, source_readings: [duplicated, duplicated] }))).toThrow(/duplicate/);
  });

  it("preserves the session limit and refuses a forged future or unwitnessed event", () => {
    const receipt = createTrialReceipt(installed, [], issue(), time2);
    expect(() => parseTrialReceipt(JSON.stringify({ ...receipt, observations: [{ ...issue()[0], witnessed_by_operator: false }] }))).toThrow(/unwitnessed/);
    expect(() => parseTrialReceipt(JSON.stringify({ ...receipt, observations: [{ ...issue()[0], observed_at: "2099-01-01T00:00:00.000Z" }] }))).toThrow(/unwitnessed/);
    expect(() => parseTrialReceipt(" ".repeat(200_001))).toThrow(/200 KB/);
    expect(() => recordTrialObservation(Array(250).fill(issue()[0]), installed,
      { case_id: "home", outcome: "passed", finding: "none", next_owner: "household_owner", witnessed: true }, time3)).toThrow(/bounded limit/);
  });

  it("rejects chronological rewrites that could hide recurring findings", () => {
    const first = issue();
    const second = recordTrialObservation(first, unknown,
      { case_id: "cameras", outcome: "blocked", finding: "offline", next_owner: "camera_operator", witnessed: true }, time3);
    const receipt = createTrialReceipt(unknown, [], second, time3);
    expect(() => parseTrialReceipt(JSON.stringify({ ...receipt, observations: [...second].reverse() }))).toThrow(/Out-of-order/);
    expect(() => recordTrialObservation(second, unknown,
      { case_id: "cameras", outcome: "issue", finding: "playback_missing", next_owner: "camera_operator", witnessed: true }, time2)).toThrow(/predate/);
    expect(() => parseTrialReceipt(JSON.stringify({ ...receipt, exported_at: time2 }))).toThrow(/future-dated/);
  });
});
