import { describe, expect, it } from "vitest";
import type { TrialEnvironment, TrialObservation } from "./ownerFieldTrial";
import type { SourceIdentityCheck } from "./ownerFieldRouting";
import type { OwnerReviewFollowup } from "./ownerReassignmentReviewFollowup";
import { recordReviewRecurrence } from "./ownerReviewRecurrence";
import { recordDispositionFollowup } from "./ownerRecurrenceDisposition";
import { compareDispositionContinuity, recordContinuityWatch,
  validateContinuityWatches } from "./ownerDispositionContinuity";

const environment: TrialEnvironment = { installed_version: "0.0.7-build166", access: "local_console",
  installed_windows_witnessed: true };
const dates = ["2026-10-10", "2026-10-12", "2026-10-16", "2026-10-22"];
const outcomes = ["passed", "issue", "passed", "issue"] as const;
const findings = ["none", "stale_evidence", "none", "stale_evidence"] as const;
const owners = ["household_owner", "camera_operator", "household_owner", "camera_operator"] as const;
const history: TrialObservation[] = dates.map((date, index) => ({
  case_id: "cameras", observed_at: `${date}T08:00:00Z`, outcome: outcomes[index],
  finding: findings[index], next_owner: owners[index], witnessed_by_operator: true,
  acknowledged_at: null }));
const checks: SourceIdentityCheck[] = dates.map((date, index) => ({
  case_id: "cameras", trial_index: index, identity_state: index % 2 === 0 ?
    "confirmed_alias" : "operator_mismatch", safe_alias: `asset_${["111aaa", "222bbb", "333ccc", "333ccc"][index]}`,
  installed_version: environment.installed_version, access: "local_console",
  witnessed_on_windows: true, captured_at: `${date}T08:01:00Z` }));
const followups: OwnerReviewFollowup[] = dates.map((date, index) => ({
  reassignment_watch_index: 0, observation_index: index, source_check_index: index,
  case_id: "cameras", watch_recorded_at: "2026-10-08T09:00:00Z", audit_pair: [0, 1],
  followup_observed_at: `${date}T08:00:00Z`, prior_owner_claim: "camera_operator",
  current_owner_claim: owners[index], owner_outcome: outcomes[index],
  owner_finding: findings[index], watch_age_days: [2, 4, 8, 14][index],
  age_band: index === 0 ? "UNDER_THREE_DAYS" : index === 1 ?
    "THREE_TO_SEVEN_DAYS" : "OVER_SEVEN_DAYS", signals: ["ORIGINAL_REASSIGNMENT_WATCH_HELD"],
  unresolved: true, recorded_at: `${["2026-10-11", "2026-10-13", "2026-10-17", "2026-10-23"][index]}T08:00:00Z`,
  category: "CONTINUE_REASSIGNMENT_HOLD", personally_witnessed: true,
  hold_acknowledged: true, state: "PRIVATE_OWNER_REVIEW_FOLLOWUP_NOT_SENT",
  field_acceptance: "FIELD_ACCEPTANCE_HOLD", independent_review: "INDEPENDENT_REVIEW_HOLD",
  closure: "NOT_AUTHORIZED" }));
const recurrenceInput = (earlier: number, later: number) => ({
  baseline_followup_index: earlier, latest_followup_index: later,
  category: "CONTINUE_INDEPENDENT_HOLD" as const, personally_compared: true,
  hold_acknowledged: true });
const recurrences1 = recordReviewRecurrence(followups, history, checks, [], environment,
  { followups: 0, recurrences: 0 }, recurrenceInput(0, 1), "2026-10-14T08:00:00Z");
const recurrences2 = recordReviewRecurrence(followups, history, checks, recurrences1, environment,
  { followups: 0, recurrences: 0 }, recurrenceInput(1, 2), "2026-10-18T08:00:00Z");
const recurrences = recordReviewRecurrence(followups, history, checks, recurrences2, environment,
  { followups: 0, recurrences: 0 }, recurrenceInput(2, 3), "2026-10-24T08:00:00Z");
const dispositionInput = (earlier: number, later: number, category:
  "REQUEST_DISPOSITION_RECHECK" | "REQUEST_SOURCE_EVIDENCE_RENEWAL") => ({
  baseline_recurrence_index: earlier, latest_recurrence_index: later,
  category, personally_compared: true, hold_acknowledged: true });
const dispositions1 = recordDispositionFollowup(recurrences, followups, history, checks,
  [], environment, { recurrences: 0, dispositions: 0 },
  dispositionInput(0, 1, "REQUEST_DISPOSITION_RECHECK"), "2026-10-19T08:00:00Z");
const dispositions = recordDispositionFollowup(recurrences, followups, history, checks,
  dispositions1, environment, { recurrences: 0, dispositions: 0 },
  dispositionInput(1, 2, "REQUEST_SOURCE_EVIDENCE_RENEWAL"), "2026-10-25T08:00:00Z");
const now = "2026-10-27T09:00:00Z";

describe("Build 166 disposition continuity and overdue source renewal", () => {
  it("flags recurring unverified source claim despite a later recorded source witness", () => {
    const result = compareDispositionContinuity(dispositions, recurrences, followups,
      history, checks, 0, 1, now);
    expect(result).toMatchObject({ reassignment_watch_index: 0,
      baseline_recurrence_index: 1, latest_recurrence_index: 2,
      source_renewal_since_prior_disposition: true,
      latest_source_verified_claim: false, earlier_disposition_age_days: 8,
      age_band: "OVER_SEVEN_DAYS", unresolved: true });
    expect(result.signals).toEqual(["DISPOSITION_RECHECK_CHANGED", "OWNER_OUTCOME_CHANGED",
      "OWNER_CLAIM_CHANGED", "SOURCE_RENEWAL_CHANGED", "SOURCE_RENEWAL_UNVERIFIED",
      "EARLIER_DISPOSITION_AGED", "EARLIER_DISPOSITION_OVERDUE",
      "OVERDUE_SOURCE_RECHECK_NEEDED", "ORIGINAL_INDEPENDENT_HOLD_PERSISTS"]);
  });

  it("rejects reversed, cross-watch, replayed recurrence and changed historical evidence", () => {
    expect(() => compareDispositionContinuity(dispositions, recurrences, followups,
      history, checks, 1, 0, now)).toThrow(/chronological/);
    expect(() => compareDispositionContinuity([dispositions[0], { ...dispositions[1],
      reassignment_watch_index: 1 }], recurrences, followups, history, checks, 0, 1,
    now)).toThrow(/exact held watch/);
    expect(() => compareDispositionContinuity([dispositions[0], { ...dispositions[1],
      latest_recurrence_index: 1 }], recurrences, followups, history, checks, 0, 1,
    now)).toThrow(/newer recurrence/);
    expect(() => compareDispositionContinuity(dispositions, recurrences, followups,
      history, [checks[0], { ...checks[1], identity_state: "confirmed_alias" },
        ...checks.slice(2)], 0, 1, now)).toThrow(/immutable/);
    expect(() => compareDispositionContinuity(dispositions, recurrences, followups,
      history, checks, 0, 1, "2026-10-24T08:00:00Z")).toThrow(/chronological/);
  });

  it("requires fresh non-imported disposition and separate Windows/HOLD witness", () => {
    const input = { baseline_disposition_index: 0, latest_disposition_index: 1,
      category: "REQUEST_OVERDUE_SOURCE_RENEWAL" as const,
      personally_compared: true, hold_acknowledged: true };
    expect(() => recordContinuityWatch(dispositions, recurrences, followups, history,
      checks, [], environment, { dispositions: 2, watches: 0 }, input, now))
      .toThrow(/non-imported/);
    expect(() => recordContinuityWatch(dispositions, recurrences, followups, history,
      checks, [], { ...environment, installed_windows_witnessed: false },
      { dispositions: 0, watches: 0 }, input, now)).toThrow(/Windows/);
    expect(() => recordContinuityWatch(dispositions, recurrences, followups, history,
      checks, [], environment, { dispositions: 0, watches: 0 },
      { ...input, hold_acknowledged: false }, now)).toThrow(/HOLD confirmations/);
    const notes = recordContinuityWatch(dispositions, recurrences, followups, history,
      checks, [], environment, { dispositions: 0, watches: 0 }, input, now);
    expect(notes[0]).toMatchObject({ state: "PRIVATE_DISPOSITION_CONTINUITY_NOT_SENT",
      field_acceptance: "FIELD_ACCEPTANCE_HOLD", independent_review: "INDEPENDENT_REVIEW_HOLD",
      closure: "NOT_AUTHORIZED" });
    validateContinuityWatches(notes, dispositions, recurrences, followups, history, checks);
    expect(() => validateContinuityWatches([{ ...notes[0],
      source_renewal_since_prior_disposition: false }], dispositions,
      recurrences, followups, history, checks)).toThrow(/immutable/);
    expect(() => validateContinuityWatches([{ ...notes[0], closure: "APPROVED" as never }],
      dispositions, recurrences, followups, history, checks)).toThrow(/HOLD/);
    expect(() => validateContinuityWatches([notes[0], notes[0]], dispositions,
      recurrences, followups, history, checks)).toThrow(/Duplicate/);
    expect(() => recordContinuityWatch(dispositions, recurrences, followups, history,
      checks, [], environment, { dispositions: 0, watches: 0 },
      { ...input, category: "REQUEST_OVERDUE_SOURCE_RENEWAL" },
      "2026-10-25T08:01:00Z")).toThrow(/matching unresolved signal/);
  });

  it("does not misrepresent a later source with the same unverified alias as proof", () => {
    const result = compareDispositionContinuity(dispositions, recurrences, followups,
      history, checks, 0, 1, now);
    expect(checks[2].safe_alias).toBe(checks[3].safe_alias);
    expect(result.source_renewal_since_prior_disposition).toBe(true);
    expect(result.latest_source_verified_claim).toBe(false);
    expect(result.signals).toContain("SOURCE_RENEWAL_UNVERIFIED");
  });
});
