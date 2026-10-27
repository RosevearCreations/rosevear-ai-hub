import { describe, expect, it } from "vitest";
import type { TrialEnvironment, TrialObservation } from "./ownerFieldTrial";
import type { SourceIdentityCheck } from "./ownerFieldRouting";
import type { ReassignmentWatchNote } from "./ownerAuditReassignmentWatch";
import { compareOwnerReviewEvidence, recordOwnerReviewFollowup,
  validateOwnerReviewFollowups } from "./ownerReassignmentReviewFollowup";

const environment: TrialEnvironment = { installed_version: "0.0.7-build163", access: "local_console",
  installed_windows_witnessed: true };
const history: TrialObservation[] = [
  { case_id: "cameras", outcome: "issue", finding: "playback_missing", next_owner: "camera_operator",
    observed_at: "2026-10-10T08:00:00Z", witnessed_by_operator: true, acknowledged_at: null },
  { case_id: "cameras", outcome: "passed", finding: "none", next_owner: "household_owner",
    observed_at: "2026-10-14T08:00:00Z", witnessed_by_operator: true, acknowledged_at: null },
  { case_id: "cameras", outcome: "issue", finding: "stale_evidence", next_owner: "camera_operator",
    observed_at: "2026-10-22T08:00:00Z", witnessed_by_operator: true, acknowledged_at: null },
];
const checks: SourceIdentityCheck[] = [
  { case_id: "cameras", trial_index: 1, identity_state: "confirmed_alias", safe_alias: "asset_123abc",
    installed_version: "0.0.7-build163", access: "local_console", witnessed_on_windows: true,
    captured_at: "2026-10-14T08:01:00Z" },
  { case_id: "cameras", trial_index: 2, identity_state: "operator_mismatch", safe_alias: "asset_456def",
    installed_version: "0.0.7-build163", access: "local_console", witnessed_on_windows: true,
    captured_at: "2026-10-22T08:01:00Z" },
];
const watch: ReassignmentWatchNote = {
  baseline_audit_index: 0, latest_audit_index: 1, watch_index: 0, case_id: "cameras",
  baseline_observation_index: 0, latest_observation_index: 1,
  baseline_at: "2026-10-11T08:00:00Z", latest_at: "2026-10-15T08:00:00Z",
  original_watch_at: "2026-10-09T08:00:00Z", baseline_owner: "camera_operator",
  latest_owner: "household_owner", first_audit_age_days: 4, original_watch_age_days: 6,
  age_band: "THREE_TO_SEVEN_DAYS", signals: ["OWNER_REASSIGNMENT_PROPOSED",
    "ORIGINAL_EXCEPTION_STILL_HELD"], unresolved: true, recorded_at: "2026-10-15T09:00:00Z",
  category: "REQUEST_OWNER_REASSIGNMENT_WITNESS", personally_compared: true,
  hold_acknowledged: true, state: "PRIVATE_REASSIGNMENT_WATCH_NOT_SENT",
  field_acceptance: "FIELD_ACCEPTANCE_HOLD", independent_review: "INDEPENDENT_REVIEW_HOLD",
  closure: "NOT_AUTHORIZED",
};
const now = "2026-10-25T08:00:00Z";

describe("Build 163 independent reassignment watch owner review follow-up", () => {
  it("reconciles exact watch to later owner outcome, source discrepancy and overdue age without closure", () => {
    const result = compareOwnerReviewEvidence([watch], history, checks, 0, 2, 1, now);
    expect(result).toMatchObject({ case_id: "cameras", reassignment_watch_index: 0,
      observation_index: 2, audit_pair: [0, 1], prior_owner_claim: "household_owner",
      current_owner_claim: "camera_operator", watch_age_days: 9,
      age_band: "OVER_SEVEN_DAYS", unresolved: true });
    expect(result.signals).toEqual(["OWNER_REVIEW_STILL_UNRESOLVED",
      "OWNER_REVIEW_OUTCOME_CHANGED", "OWNER_NEXT_ACTION_CLAIM_CHANGED",
      "SOURCE_ALIAS_RECHECK_CHANGED", "SOURCE_REVIEW_IDENTITY_UNVERIFIED",
      "OWNER_REVIEW_AGED", "OWNER_REVIEW_OVERDUE", "ORIGINAL_REASSIGNMENT_WATCH_HELD"]);
  });

  it("refuses pre-watch, unwitnessed, mismatched case, backdated and cross-trial source claims", () => {
    expect(() => compareOwnerReviewEvidence([watch], history, checks, 0, 1, 0, now))
      .toThrow(/strictly later/);
    expect(() => compareOwnerReviewEvidence([watch], [{ ...history[0] }, { ...history[1] },
      { ...history[2], case_id: "home" }], checks, 0, 2, 1, now)).toThrow(/same-case/);
    expect(() => compareOwnerReviewEvidence([watch], [...history.slice(0, 2),
      { ...history[2], witnessed_by_operator: false as never }], checks, 0, 2, 1, now))
      .toThrow(/witnessed/);
    expect(() => compareOwnerReviewEvidence([watch], history, checks, 0, 2, 0, now))
      .toThrow(/exact later trial/);
    expect(() => compareOwnerReviewEvidence([watch], history, checks, 0, 2, 1,
      "2026-10-21T08:00:00Z")).toThrow(/strictly later/);
  });

  it("requires fresh locally witnessed review and separate immutable HOLD acknowledgment", () => {
    const input = { reassignment_watch_index: 0, observation_index: 2,
      source_check_index: 1, category: "REQUEST_OVERDUE_REVIEW_WITNESS" as const,
      personally_witnessed: true, hold_acknowledged: true };
    expect(() => recordOwnerReviewFollowup([watch], history, checks, [], environment,
      { trials: 3, followups: 0 }, input, now)).toThrow(/non-imported/);
    expect(() => recordOwnerReviewFollowup([watch], history, checks, [],
      { ...environment, installed_windows_witnessed: false },
      { trials: 0, followups: 0 }, input, now)).toThrow(/Windows witness/);
    expect(() => recordOwnerReviewFollowup([watch], history, checks, [], environment,
      { trials: 0, followups: 0 }, { ...input, hold_acknowledged: false }, now))
      .toThrow(/HOLD confirmations/);
    const notes = recordOwnerReviewFollowup([watch], history, checks, [], environment,
      { trials: 0, followups: 0 }, input, now);
    expect(notes[0]).toMatchObject({ state: "PRIVATE_OWNER_REVIEW_FOLLOWUP_NOT_SENT",
      closure: "NOT_AUTHORIZED", field_acceptance: "FIELD_ACCEPTANCE_HOLD" });
    validateOwnerReviewFollowups(notes, [watch], history, checks);
    expect(() => validateOwnerReviewFollowups([{ ...notes[0], watch_age_days: 0 }],
      [watch], history, checks)).toThrow(/immutable/);
    expect(() => validateOwnerReviewFollowups([{ ...notes[0], closure: "APPROVED" as never }],
      [watch], history, checks)).toThrow(/HOLD/);
    expect(() => validateOwnerReviewFollowups([notes[0], notes[0]], [watch], history, checks))
      .toThrow(/Duplicate/);
    expect(() => recordOwnerReviewFollowup([watch], history, checks, [], environment,
      { trials: 0, followups: 0 }, { ...input, category: "REQUEST_OVERDUE_REVIEW_WITNESS" },
      "2026-10-22T08:05:00Z")).toThrow(/corresponding/);
  });
});
