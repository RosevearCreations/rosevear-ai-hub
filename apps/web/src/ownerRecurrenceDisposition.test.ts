import { describe, expect, it, vi } from "vitest";
import type { TrialEnvironment, TrialObservation } from "./ownerFieldTrial";
import type { SourceIdentityCheck } from "./ownerFieldRouting";
import type { OwnerReviewFollowup } from "./ownerReassignmentReviewFollowup";
import { recordReviewRecurrence } from "./ownerReviewRecurrence";
import { compareRecurrenceDispositions, recordDispositionFollowup,
  validateDispositionFollowups } from "./ownerRecurrenceDisposition";

const environment: TrialEnvironment = { installed_version: "0.0.7-build165", access: "local_console",
  installed_windows_witnessed: true };
const history: TrialObservation[] = [
  { case_id: "cameras", outcome: "passed", finding: "none", next_owner: "household_owner",
    observed_at: "2026-10-12T08:00:00Z", witnessed_by_operator: true, acknowledged_at: null },
  { case_id: "cameras", outcome: "issue", finding: "stale_evidence", next_owner: "camera_operator",
    observed_at: "2026-10-20T08:00:00Z", witnessed_by_operator: true, acknowledged_at: null },
  { case_id: "cameras", outcome: "passed", finding: "none", next_owner: "household_owner",
    observed_at: "2026-10-25T08:00:00Z", witnessed_by_operator: true, acknowledged_at: null },
];
const checks: SourceIdentityCheck[] = [
  { case_id: "cameras", trial_index: 0, identity_state: "confirmed_alias", safe_alias: "asset_123abc",
    installed_version: environment.installed_version, access: "local_console", witnessed_on_windows: true,
    captured_at: "2026-10-12T08:01:00Z" },
  { case_id: "cameras", trial_index: 1, identity_state: "operator_mismatch", safe_alias: "asset_456def",
    installed_version: environment.installed_version, access: "local_console", witnessed_on_windows: true,
    captured_at: "2026-10-20T08:01:00Z" },
  { case_id: "cameras", trial_index: 2, identity_state: "confirmed_alias", safe_alias: "asset_789abc",
    installed_version: environment.installed_version, access: "local_console", witnessed_on_windows: true,
    captured_at: "2026-10-25T08:01:00Z" },
];
const first: OwnerReviewFollowup = {
  reassignment_watch_index: 0, observation_index: 0, source_check_index: 0,
  case_id: "cameras", watch_recorded_at: "2026-10-10T09:00:00Z", audit_pair: [0, 1],
  followup_observed_at: "2026-10-12T08:00:00Z", prior_owner_claim: "camera_operator",
  current_owner_claim: "household_owner", owner_outcome: "passed", owner_finding: "none",
  watch_age_days: 2, age_band: "UNDER_THREE_DAYS", signals: ["OWNER_REVIEW_OUTCOME_CHANGED",
    "ORIGINAL_REASSIGNMENT_WATCH_HELD"], unresolved: true, recorded_at: "2026-10-13T08:00:00Z",
  category: "CONTINUE_REASSIGNMENT_HOLD", personally_witnessed: true, hold_acknowledged: true,
  state: "PRIVATE_OWNER_REVIEW_FOLLOWUP_NOT_SENT", field_acceptance: "FIELD_ACCEPTANCE_HOLD",
  independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED",
};
const second: OwnerReviewFollowup = { ...first, observation_index: 1, source_check_index: 1,
  followup_observed_at: "2026-10-20T08:00:00Z", current_owner_claim: "camera_operator",
  owner_outcome: "issue", owner_finding: "stale_evidence", watch_age_days: 10,
  age_band: "OVER_SEVEN_DAYS", signals: ["OWNER_REVIEW_STILL_UNRESOLVED",
    "OWNER_REVIEW_OUTCOME_CHANGED", "OWNER_NEXT_ACTION_CLAIM_CHANGED",
    "SOURCE_ALIAS_RECHECK_CHANGED", "SOURCE_REVIEW_IDENTITY_UNVERIFIED",
    "OWNER_REVIEW_AGED", "OWNER_REVIEW_OVERDUE", "ORIGINAL_REASSIGNMENT_WATCH_HELD"],
  recorded_at: "2026-10-21T08:00:00Z" };
const third: OwnerReviewFollowup = { ...first, observation_index: 2, source_check_index: 2,
  followup_observed_at: "2026-10-25T08:00:00Z", watch_age_days: 16,
  age_band: "OVER_SEVEN_DAYS", signals: ["OWNER_REVIEW_OUTCOME_CHANGED",
    "OWNER_REVIEW_AGED", "OWNER_REVIEW_OVERDUE", "ORIGINAL_REASSIGNMENT_WATCH_HELD"],
  recorded_at: "2026-10-26T08:00:00Z" };
const followups = [first, second, third];
const recurrences = recordReviewRecurrence(followups, history, checks, [], environment,
  { followups: 0, recurrences: 0 }, { baseline_followup_index: 0, latest_followup_index: 1,
    category: "REQUEST_SOURCE_WITNESS_RECHECK", personally_compared: true,
    hold_acknowledged: true }, "2026-10-22T08:00:00Z");
const allRecurrences = recordReviewRecurrence(followups, history, checks, recurrences, environment,
  { followups: 0, recurrences: 0 }, { baseline_followup_index: 1, latest_followup_index: 2,
    category: "CONTINUE_INDEPENDENT_HOLD", personally_compared: true,
    hold_acknowledged: true }, "2026-10-26T12:00:00Z");
const now = "2026-10-27T09:00:00Z";

describe("Build 165 recurrence disposition follow-up and source renewal", () => {
  it("compares distinct same-watch rounds, source renewal and preserved independent HOLD", () => {
    const result = compareRecurrenceDispositions(allRecurrences, followups, history, checks,
      0, 1, now);
    expect(result).toMatchObject({ reassignment_watch_index: 0, baseline_followup_index: 1,
      latest_followup_index: 2, age_since_first_disposition_days: 5,
      source_evidence_renewed: true, baseline_outcome: "issue", latest_outcome: "passed",
      age_band: "THREE_TO_SEVEN_DAYS", unresolved: true });
    expect(result.signals).toEqual(["DISPOSITION_CHANGED", "OWNER_OUTCOME_CHANGED",
      "OWNER_CLAIM_CHANGED", "SOURCE_EVIDENCE_CHANGED", "PRIOR_DISPOSITION_AGED",
      "ORIGINAL_WATCH_STILL_HELD"]);
    expect(compareRecurrenceDispositions(allRecurrences, followups, history, checks,
      0, 1, "2026-10-27T09:00:00Z").signals).not.toContain("SOURCE_EVIDENCE_UNVERIFIED");
  });

  it("rejects reversed, cross-watch, replayed review and tampered source history", () => {
    expect(() => compareRecurrenceDispositions(allRecurrences, followups, history, checks,
      1, 0, now)).toThrow(/chronological/);
    expect(() => compareRecurrenceDispositions([allRecurrences[0], {
      ...allRecurrences[1], reassignment_watch_index: 9 }], followups, history, checks, 0, 1,
    now)).toThrow(/exact held watch/);
    expect(() => compareRecurrenceDispositions([allRecurrences[0], {
      ...allRecurrences[1], latest_followup_index: 1 }], followups, history, checks,
    0, 1, now)).toThrow(/new owner review/);
    expect(() => compareRecurrenceDispositions(allRecurrences, followups,
      history, [checks[0], { ...checks[1], identity_state: "confirmed_alias" }, checks[2]], 0, 1,
      now)).toThrow(/immutable/);
    expect(() => compareRecurrenceDispositions(allRecurrences, followups, history, checks,
      0, 1, "2026-10-26T11:00:00Z")).toThrow(/chronological/);
  });

  it("requires fresh non-imported evidence, a physical witness and two separate HOLD claims", () => {
    const input = { baseline_recurrence_index: 0, latest_recurrence_index: 1,
      category: "REQUEST_DISPOSITION_RECHECK" as const, personally_compared: true,
      hold_acknowledged: true };
    expect(() => recordDispositionFollowup(allRecurrences, followups, history, checks,
      [], environment, { recurrences: 2, dispositions: 0 }, input, now)).toThrow(/non-imported/);
    expect(() => recordDispositionFollowup(allRecurrences, followups, history, checks,
      [], { ...environment, installed_windows_witnessed: false },
      { recurrences: 0, dispositions: 0 }, input, now)).toThrow(/Windows witness/);
    expect(() => recordDispositionFollowup(allRecurrences, followups, history, checks,
      [], environment, { recurrences: 0, dispositions: 0 },
      { ...input, hold_acknowledged: false }, now)).toThrow(/HOLD confirmations/);
    const notes = recordDispositionFollowup(allRecurrences, followups, history, checks,
      [], environment, { recurrences: 0, dispositions: 0 }, input, now);
    expect(notes[0]).toMatchObject({ state: "PRIVATE_RECURRENCE_DISPOSITION_NOT_SENT",
      field_acceptance: "FIELD_ACCEPTANCE_HOLD", independent_review: "INDEPENDENT_REVIEW_HOLD",
      closure: "NOT_AUTHORIZED" });
    validateDispositionFollowups(notes, allRecurrences, followups, history, checks);
    expect(() => validateDispositionFollowups([{ ...notes[0], source_evidence_renewed: false }],
      allRecurrences, followups, history, checks)).toThrow(/immutable/);
    expect(() => validateDispositionFollowups([{ ...notes[0], closure: "APPROVED" as never }],
      allRecurrences, followups, history, checks)).toThrow(/HOLD/);
    expect(() => validateDispositionFollowups([notes[0], notes[0]], allRecurrences,
      followups, history, checks)).toThrow(/Duplicate/);
    expect(() => recordDispositionFollowup(allRecurrences, followups, history, checks,
      [], environment, { recurrences: 0, dispositions: 0 },
      { ...input, category: "REQUEST_OVERDUE_INDEPENDENT_REVIEW" }, now))
      .toThrow(/matching held evidence signal/);
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-10-31T09:00:00Z"));
      const overdue = compareRecurrenceDispositions(allRecurrences, followups, history, checks,
        0, 1, "2026-10-31T09:00:00Z");
      // Age over seven days does not dispatch, approve or close anything.
      expect(overdue.signals).toContain("PRIOR_DISPOSITION_OVERDUE");
    } finally { vi.useRealTimers(); }
  });

  it("flags stale or unverified sources even where a later recurrence appears to improve", () => {
    const noNewSource = [checks[0], checks[1], { ...checks[2], captured_at: "2026-10-20T08:01:00Z",
      identity_state: "operator_mismatch" as const }];
    // Imported recurrence notes are immutable; source edits invalidate their provenance.
    expect(() => compareRecurrenceDispositions(allRecurrences, followups, history,
      noNewSource, 0, 1, now)).toThrow(/immutable/);
  });
});
