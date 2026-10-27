import { describe, expect, it } from "vitest";
import type { TrialEnvironment, TrialObservation } from "./ownerFieldTrial";
import type { SourceIdentityCheck } from "./ownerFieldRouting";
import type { OwnerReviewFollowup } from "./ownerReassignmentReviewFollowup";
import { compareOwnerReviewRounds, recordReviewRecurrence,
  validateReviewRecurrences } from "./ownerReviewRecurrence";

const environment: TrialEnvironment = { installed_version: "0.0.7-build164", access: "local_console",
  installed_windows_witnessed: true };
const history: TrialObservation[] = [
  { case_id: "cameras", outcome: "passed", finding: "none", next_owner: "household_owner",
    observed_at: "2026-10-12T08:00:00Z", witnessed_by_operator: true, acknowledged_at: null },
  { case_id: "cameras", outcome: "issue", finding: "stale_evidence", next_owner: "camera_operator",
    observed_at: "2026-10-23T08:00:00Z", witnessed_by_operator: true, acknowledged_at: null },
];
const checks: SourceIdentityCheck[] = [
  { case_id: "cameras", trial_index: 0, identity_state: "confirmed_alias", safe_alias: "asset_123abc",
    installed_version: "0.0.7-build164", access: "local_console", witnessed_on_windows: true,
    captured_at: "2026-10-12T08:01:00Z" },
  { case_id: "cameras", trial_index: 1, identity_state: "operator_mismatch", safe_alias: "asset_456def",
    installed_version: "0.0.7-build164", access: "local_console", witnessed_on_windows: true,
    captured_at: "2026-10-23T08:01:00Z" },
];
const first: OwnerReviewFollowup = {
  reassignment_watch_index: 0, observation_index: 0, source_check_index: 0,
  case_id: "cameras", watch_recorded_at: "2026-10-10T09:00:00Z",
  audit_pair: [0, 1], followup_observed_at: "2026-10-12T08:00:00Z",
  prior_owner_claim: "camera_operator", current_owner_claim: "household_owner",
  owner_outcome: "passed", owner_finding: "none", watch_age_days: 2,
  age_band: "UNDER_THREE_DAYS", signals: ["OWNER_REVIEW_OUTCOME_CHANGED",
    "ORIGINAL_REASSIGNMENT_WATCH_HELD"], unresolved: true,
  recorded_at: "2026-10-13T08:00:00Z", category: "CONTINUE_REASSIGNMENT_HOLD",
  personally_witnessed: true, hold_acknowledged: true,
  state: "PRIVATE_OWNER_REVIEW_FOLLOWUP_NOT_SENT", field_acceptance: "FIELD_ACCEPTANCE_HOLD",
  independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED",
};
const second: OwnerReviewFollowup = { ...first, observation_index: 1, source_check_index: 1,
  followup_observed_at: "2026-10-23T08:00:00Z", current_owner_claim: "camera_operator",
  owner_outcome: "issue", owner_finding: "stale_evidence", watch_age_days: 14,
  age_band: "OVER_SEVEN_DAYS", signals: ["OWNER_REVIEW_STILL_UNRESOLVED",
    "OWNER_REVIEW_OUTCOME_CHANGED", "OWNER_NEXT_ACTION_CLAIM_CHANGED",
    "SOURCE_ALIAS_RECHECK_CHANGED", "SOURCE_REVIEW_IDENTITY_UNVERIFIED",
    "OWNER_REVIEW_AGED", "OWNER_REVIEW_OVERDUE", "ORIGINAL_REASSIGNMENT_WATCH_HELD"],
  recorded_at: "2026-10-24T08:00:00Z" };
const now = "2026-10-27T08:00:00Z";

describe("Build 164 owner review recurrence and overdue independent evidence", () => {
  it("flags renewed regression, owner claim drift, source contradiction and overdue review without closure", () => {
    const result = compareOwnerReviewRounds([first, second], history, checks, 0, 1, now);
    expect(result).toMatchObject({ reassignment_watch_index: 0,
      baseline_outcome: "passed", latest_outcome: "issue", first_review_age_days: 14,
      age_band: "OVER_SEVEN_DAYS", unresolved: true });
    expect(result.signals).toEqual(["REVIEW_OUTCOME_REGRESSED", "REVIEW_OUTCOME_CHANGED",
      "FOLLOWUP_OWNER_CLAIM_CHANGED", "FOLLOWUP_SOURCE_IDENTITY_CHANGED",
      "FOLLOWUP_SOURCE_UNVERIFIED", "FIRST_REVIEW_RESPONSE_AGED",
      "FIRST_REVIEW_RESPONSE_OVERDUE", "PRIOR_WATCH_AND_REVIEW_STILL_HELD"]);
  });

  it("rejects reversed or cross-watch rounds, forged owner trial and backdated comparison", () => {
    expect(() => compareOwnerReviewRounds([first, second], history, checks, 1, 0, now))
      .toThrow(/chronological/);
    expect(() => compareOwnerReviewRounds([first, { ...second, reassignment_watch_index: 1 }],
      history, checks, 0, 1, now)).toThrow(/exact reassignment watch/);
    expect(() => compareOwnerReviewRounds([first, second], [history[0],
      { ...history[1], next_owner: "household_owner" }], checks, 0, 1, now))
      .toThrow(/identity/);
    expect(() => compareOwnerReviewRounds([first, second], history, checks, 0, 1,
      "2026-10-23T08:00:00Z")).toThrow(/chronological/);
  });

  it("requires a new non-imported follow-up, witnessed Windows and separate HOLD attestations", () => {
    const input = { baseline_followup_index: 0, latest_followup_index: 1,
      category: "REQUEST_OVERDUE_OWNER_REVIEW_RESPONSE" as const,
      personally_compared: true, hold_acknowledged: true };
    expect(() => recordReviewRecurrence([first, second], history, checks, [], environment,
      { followups: 2, recurrences: 0 }, input, now)).toThrow(/non-imported/);
    expect(() => recordReviewRecurrence([first, second], history, checks, [],
      { ...environment, installed_windows_witnessed: false },
      { followups: 0, recurrences: 0 }, input, now)).toThrow(/Windows witness/);
    expect(() => recordReviewRecurrence([first, second], history, checks, [], environment,
      { followups: 0, recurrences: 0 }, { ...input, hold_acknowledged: false }, now))
      .toThrow(/HOLD confirmations/);
    const notes = recordReviewRecurrence([first, second], history, checks, [], environment,
      { followups: 0, recurrences: 0 }, input, now);
    expect(notes[0]).toMatchObject({ state: "PRIVATE_REVIEW_RECURRENCE_NOT_SENT",
      closure: "NOT_AUTHORIZED", independent_review: "INDEPENDENT_REVIEW_HOLD" });
    validateReviewRecurrences(notes, [first, second], history, checks);
    expect(() => validateReviewRecurrences([{ ...notes[0], first_review_age_days: 0 }],
      [first, second], history, checks)).toThrow(/immutable/);
    expect(() => validateReviewRecurrences([{ ...notes[0], closure: "APPROVED" as never }],
      [first, second], history, checks)).toThrow(/HOLD/);
    expect(() => validateReviewRecurrences([notes[0], notes[0]],
      [first, second], history, checks)).toThrow(/Duplicate/);
    const unchangedHistory = [history[0], { ...history[1], outcome: "passed" as const,
      finding: "none" as const, next_owner: "household_owner" as const }];
    const unchangedReview = { ...second, owner_outcome: "passed" as const,
      owner_finding: "none" as const, current_owner_claim: "household_owner" as const };
    expect(() => recordReviewRecurrence([first, unchangedReview], unchangedHistory, checks, [],
      environment, { followups: 0, recurrences: 0 },
      { ...input, category: "REQUEST_RECURRENCE_EVIDENCE_RECHECK" }, now))
      .toThrow(/matching unresolved signal/);
  });
});
