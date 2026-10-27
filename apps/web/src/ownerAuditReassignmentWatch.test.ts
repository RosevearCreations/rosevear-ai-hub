import { describe, expect, it } from "vitest";
import type { TrialEnvironment, TrialObservation } from "./ownerFieldTrial";
import type { SourceIdentityCheck } from "./ownerFieldRouting";
import type { ExceptionWatchNote } from "./ownerRecheckDecisionWatch";
import { recordHistoricalWatchAudit } from "./ownerHistoricalWatchAudit";
import { compareAuditRounds, recordReassignmentWatch,
  validateReassignmentWatches } from "./ownerAuditReassignmentWatch";

const environment: TrialEnvironment = { installed_version: "0.0.7-build162", access: "local_console",
  installed_windows_witnessed: true };
const watch: ExceptionWatchNote = { baseline_recheck_index: 0, latest_recheck_index: 1,
  review_index: 0, case_id: "cameras", baseline_at: "2026-10-08T10:00:00Z",
  latest_at: "2026-10-09T10:00:00Z", first_recheck_age_days: 1,
  signals: ["OUTCOME_ROUND_ADVANCED", "HISTORICAL_EXCEPTIONS_UNRESOLVED"], unresolved: true,
  recorded_at: "2026-10-10T10:00:00Z", category: "CONTINUE_INDEPENDENT_REVIEW_HOLD",
  personally_compared: true, hold_acknowledged: true, state: "PRIVATE_EXCEPTION_WATCH_NOT_SENT",
  field_acceptance: "FIELD_ACCEPTANCE_HOLD", independent_review: "INDEPENDENT_REVIEW_HOLD",
  closure: "NOT_AUTHORIZED" };
const history: TrialObservation[] = [
  { case_id: "cameras", outcome: "issue", finding: "playback_missing", next_owner: "camera_operator",
    observed_at: "2026-10-12T08:00:00Z", witnessed_by_operator: true, acknowledged_at: null },
  { case_id: "cameras", outcome: "passed", finding: "none", next_owner: "household_owner",
    observed_at: "2026-10-15T08:00:00Z", witnessed_by_operator: true, acknowledged_at: null },
];
const checks: SourceIdentityCheck[] = [
  { case_id: "cameras", trial_index: 0, identity_state: "operator_mismatch", safe_alias: "asset_123abc",
    installed_version: "0.0.7-build162", access: "local_console", witnessed_on_windows: true,
    captured_at: "2026-10-12T08:01:00Z" },
  { case_id: "cameras", trial_index: 1, identity_state: "confirmed_alias", safe_alias: "asset_456def",
    installed_version: "0.0.7-build162", access: "local_console", witnessed_on_windows: true,
    captured_at: "2026-10-15T08:01:00Z" },
];
const audits = recordHistoricalWatchAudit([watch], history, checks, [], environment,
  { trials: 0, checks: 0, audits: 0 }, { watch_index: 0, observation_index: 0,
    source_check_index: 0, category: "CONTINUE_HISTORICAL_REVIEW_HOLD",
    personally_witnessed: true, hold_acknowledged: true }, "2026-10-13T08:00:00Z");
const rounds = recordHistoricalWatchAudit([watch], history, checks, audits, environment,
  { trials: 0, checks: 0, audits: 0 }, { watch_index: 0, observation_index: 1,
    source_check_index: 1, category: "CONTINUE_HISTORICAL_REVIEW_HOLD",
    personally_witnessed: true, hold_acknowledged: true }, "2026-10-16T08:00:00Z");
const now = "2026-10-25T08:00:00Z";

describe("Build 162 private independent audit reassignment watch", () => {
  it("flags new owner/source claims and overdue independent responses without changing assignments", () => {
    const result = compareAuditRounds(rounds, history, checks, 0, 1, now);
    expect(result).toMatchObject({ watch_index: 0, baseline_owner: "camera_operator",
      latest_owner: "household_owner", first_audit_age_days: 12,
      age_band: "OVER_SEVEN_DAYS", unresolved: true });
    expect(result.signals).toEqual(["OWNER_REASSIGNMENT_PROPOSED", "OWNER_OUTCOME_CONTRADICTION",
      "SOURCE_ALIAS_OR_STATE_CHANGED", "INDEPENDENT_RESPONSE_AGED",
      "INDEPENDENT_RESPONSE_OVERDUE", "ORIGINAL_EXCEPTION_STILL_HELD"]);
  });

  it("rejects mismatched audit indices, cross-watch claims and forged later evidence", () => {
    expect(() => compareAuditRounds(rounds, history, checks, 1, 0, now)).toThrow(/chronological/);
    expect(() => compareAuditRounds([{ ...rounds[0], watch_index: 7 }, rounds[1]],
      history, checks, 0, 1, now)).toThrow(/exact historical watch/);
    expect(() => compareAuditRounds(rounds, history, checks, 0, 1,
      "2026-10-14T08:00:00Z")).toThrow(/chronological/);
    expect(() => compareAuditRounds(rounds,
      [history[0], { ...history[1], next_owner: "camera_operator", outcome: "issue" }],
      checks, 0, 1, now)).toThrow(/observation identity/);
  });

  it("requires fresh independent audits and separate installed Windows HOLD witnesses", () => {
    const input = { baseline_audit_index: 0, latest_audit_index: 1,
      category: "REQUEST_OWNER_REASSIGNMENT_WITNESS" as const,
      personally_compared: true, hold_acknowledged: true };
    expect(() => recordReassignmentWatch(rounds, history, checks, [], environment,
      { audits: 2, watches: 0 }, input, now)).toThrow(/non-imported/);
    expect(() => recordReassignmentWatch(rounds, history, checks, [],
      { ...environment, installed_windows_witnessed: false },
      { audits: 0, watches: 0 }, input, now)).toThrow(/Windows witnessing/);
    expect(() => recordReassignmentWatch(rounds, history, checks, [], environment,
      { audits: 0, watches: 0 }, { ...input, hold_acknowledged: false }, now)).toThrow(/HOLD/);
  });

  it("rejects immutable tampering, unsupported categories, duplicate pair and fake closure", () => {
    const input = { baseline_audit_index: 0, latest_audit_index: 1,
      category: "REQUEST_OWNER_REASSIGNMENT_WITNESS" as const,
      personally_compared: true, hold_acknowledged: true };
    const notes = recordReassignmentWatch(rounds, history, checks, [], environment,
      { audits: 0, watches: 0 }, input, now);
    validateReassignmentWatches(notes, rounds, history, checks);
    expect(() => validateReassignmentWatches([{ ...notes[0], first_audit_age_days: 0 }],
      rounds, history, checks)).toThrow(/immutable/);
    expect(() => validateReassignmentWatches([{ ...notes[0], closure: "APPROVED" as never }],
      rounds, history, checks)).toThrow(/HOLD/);
    expect(() => validateReassignmentWatches([notes[0], notes[0]], rounds, history, checks))
      .toThrow(/Duplicate/);
    expect(() => recordReassignmentWatch(rounds, history, checks, [], environment,
      { audits: 0, watches: 0 }, { ...input, category: "REQUEST_OVERDUE_INDEPENDENT_RESPONSE" },
      "2026-10-16T08:01:00Z")).toThrow(/matching unresolved signal/);
  });
});
