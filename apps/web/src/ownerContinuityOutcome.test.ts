import { afterAll, describe, expect, it, vi } from "vitest";
import type { TrialEnvironment, TrialObservation } from "./ownerFieldTrial";
import type { SourceIdentityCheck } from "./ownerFieldRouting";
import type { OwnerReviewFollowup } from "./ownerReassignmentReviewFollowup";
import { recordReviewRecurrence } from "./ownerReviewRecurrence";
import { recordDispositionFollowup } from "./ownerRecurrenceDisposition";
import { recordContinuityWatch } from "./ownerDispositionContinuity";
import { compareContinuityOutcomes, comparePrivateContinuityReceipts,
  parseOutcomeReceipt, recordOutcomeNote, validateOutcomeNotes } from "./ownerContinuityOutcome";

vi.useFakeTimers();
vi.setSystemTime(new Date("2026-11-11T12:00:00Z"));
afterAll(() => vi.useRealTimers());
const environment: TrialEnvironment = { installed_version: "0.0.7-build167",
  access: "local_console", installed_windows_witnessed: true };
const days = ["2026-10-10", "2026-10-12", "2026-10-16", "2026-10-22", "2026-10-28"];
const outcomes = ["passed", "issue", "passed", "issue", "passed"] as const;
const owners = ["household_owner", "camera_operator", "household_owner", "camera_operator",
  "household_owner"] as const;
const history: TrialObservation[] = days.map((day, index) => ({
  case_id: "cameras", observed_at: `${day}T08:00:00Z`, outcome: outcomes[index],
  finding: outcomes[index] === "issue" ? "stale_evidence" : "none",
  next_owner: owners[index], witnessed_by_operator: true, acknowledged_at: null }));
const checks: SourceIdentityCheck[] = days.map((day, index) => ({
  case_id: "cameras", trial_index: index,
  identity_state: index === 3 ? "operator_mismatch" : "confirmed_alias",
  safe_alias: `asset_${["111aaa", "222bbb", "333ccc", "333ccc", "444ddd"][index]}`,
  installed_version: environment.installed_version, access: "local_console",
  witnessed_on_windows: true, captured_at: `${day}T08:01:00Z` }));
const followupDates = ["2026-10-11", "2026-10-13", "2026-10-17", "2026-10-23", "2026-10-29"];
const followups: OwnerReviewFollowup[] = followupDates.map((day, index) => ({
  reassignment_watch_index: 0, observation_index: index, source_check_index: index,
  case_id: "cameras", watch_recorded_at: "2026-10-08T09:00:00Z", audit_pair: [0, 1],
  followup_observed_at: `${days[index]}T08:00:00Z`, prior_owner_claim: "camera_operator",
  current_owner_claim: owners[index], owner_outcome: outcomes[index],
  owner_finding: outcomes[index] === "issue" ? "stale_evidence" : "none",
  watch_age_days: [2, 4, 8, 14, 20][index],
  age_band: index === 0 ? "UNDER_THREE_DAYS" : index === 1 ?
    "THREE_TO_SEVEN_DAYS" : "OVER_SEVEN_DAYS", signals: ["ORIGINAL_REASSIGNMENT_WATCH_HELD"],
  unresolved: true, recorded_at: `${day}T08:00:00Z`,
  category: "CONTINUE_REASSIGNMENT_HOLD", personally_witnessed: true,
  hold_acknowledged: true, state: "PRIVATE_OWNER_REVIEW_FOLLOWUP_NOT_SENT",
  field_acceptance: "FIELD_ACCEPTANCE_HOLD", independent_review: "INDEPENDENT_REVIEW_HOLD",
  closure: "NOT_AUTHORIZED" }));
let recurrences = [] as ReturnType<typeof recordReviewRecurrence>;
for (let i = 0; i < 4; i++) {
  recurrences = recordReviewRecurrence(followups, history, checks, recurrences,
    environment, { followups: 0, recurrences: 0 }, {
      baseline_followup_index: i, latest_followup_index: i + 1,
      category: "CONTINUE_INDEPENDENT_HOLD", personally_compared: true, hold_acknowledged: true,
    }, `${["2026-10-14", "2026-10-18", "2026-10-24", "2026-10-30"][i]}T08:00:00Z`);
}
let dispositions = [] as ReturnType<typeof recordDispositionFollowup>;
for (let i = 0; i < 3; i++) {
  dispositions = recordDispositionFollowup(recurrences, followups, history, checks,
    dispositions, environment, { recurrences: 0, dispositions: 0 }, {
      baseline_recurrence_index: i, latest_recurrence_index: i + 1,
      category: i === 1 ? "REQUEST_SOURCE_EVIDENCE_RENEWAL" : "REQUEST_DISPOSITION_RECHECK",
      personally_compared: true, hold_acknowledged: true,
    }, `${["2026-10-19", "2026-10-25", "2026-10-31"][i]}T08:00:00Z`);
}
let watches = recordContinuityWatch(dispositions, recurrences, followups, history, checks,
  [], environment, { dispositions: 0, watches: 0 }, {
    baseline_disposition_index: 0, latest_disposition_index: 1,
    category: "REQUEST_SOURCE_RENEWAL_WITNESS", personally_compared: true,
    hold_acknowledged: true }, "2026-10-27T09:00:00Z");
watches = recordContinuityWatch(dispositions, recurrences, followups, history, checks,
  watches, environment, { dispositions: 0, watches: 0 }, {
    baseline_disposition_index: 1, latest_disposition_index: 2,
    category: "REQUEST_SOURCE_RENEWAL_WITNESS", personally_compared: true,
    hold_acknowledged: true }, "2026-11-02T09:00:00Z");
const at = "2026-11-10T09:00:00Z";

describe("Build 167 private continuity outcome and source freshness", () => {
  it("tracks a new owner observation, repeated exception and stale alias evidence, without approval", () => {
    const comparison = compareContinuityOutcomes(watches, dispositions, recurrences,
      followups, history, checks, 0, 1, at);
    expect(comparison).toMatchObject({ reassignment_watch_index: 0,
      owner_trial_renewed: true, source_evidence_renewed: true,
      source_identity_confirmed_claim: true, source_age_days: 13,
      continuity_age_days: 14, age_band: "OVER_SEVEN_DAYS", unresolved: true });
    expect(comparison.signals).toContain("REPEATED_DISPOSITION_EXCEPTION");
    expect(comparison.signals).toContain("SOURCE_IDENTITY_CONTRADICTED");
    expect(comparison.signals).toContain("SOURCE_EVIDENCE_OVERDUE");
    expect(comparison.signals).toContain("ORIGINAL_INDEPENDENT_HOLD_PERSISTS");
  });

  it("requires non-imported later watch, separately witnessed Windows and independent HOLD", () => {
    const input = { baseline_continuity_index: 0, latest_continuity_index: 1,
      category: "REQUEST_OVERDUE_INDEPENDENT_REVIEW" as const,
      personally_compared: true, hold_acknowledged: true };
    expect(() => recordOutcomeNote(watches, dispositions, recurrences, followups,
      history, checks, [], environment, { watches: 2, outcomes: 0 }, input, at))
      .toThrow(/non-imported/);
    expect(() => recordOutcomeNote(watches, dispositions, recurrences, followups,
      history, checks, [], { ...environment, installed_windows_witnessed: false },
      { watches: 0, outcomes: 0 }, input, at)).toThrow(/Windows/);
    expect(() => recordOutcomeNote(watches, dispositions, recurrences, followups,
      history, checks, [], environment, { watches: 0, outcomes: 0 },
      { ...input, hold_acknowledged: false }, at)).toThrow(/HOLD/);
    const notes = recordOutcomeNote(watches, dispositions, recurrences, followups,
      history, checks, [], environment, { watches: 0, outcomes: 0 }, input, at);
    expect(notes[0]).toMatchObject({ state: "PRIVATE_CONTINUITY_OUTCOME_NOT_SENT",
      independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED" });
    validateOutcomeNotes(notes, watches, dispositions, recurrences, followups, history, checks);
    expect(() => validateOutcomeNotes([{ ...notes[0], source_age_days: 0 }],
      watches, dispositions, recurrences, followups, history, checks)).toThrow(/immutable/);
    expect(() => validateOutcomeNotes([{ ...notes[0], closure: "APPROVED" as never }],
      watches, dispositions, recurrences, followups, history, checks)).toThrow(/HOLD/);
    expect(() => validateOutcomeNotes([notes[0], notes[0]], watches, dispositions,
      recurrences, followups, history, checks)).toThrow(/Duplicate/);
  });

  it("rejects reversed same-watch evidence and a non-newer owner observation", () => {
    expect(() => compareContinuityOutcomes(watches, dispositions, recurrences,
      followups, history, checks, 1, 0, at)).toThrow(/chronological/);
    expect(() => compareContinuityOutcomes([watches[0], { ...watches[1],
      reassignment_watch_index: 99 }], dispositions, recurrences, followups,
      history, checks, 0, 1, at)).toThrow(/exact same held/);
    expect(() => compareContinuityOutcomes([watches[0], { ...watches[1],
      latest_disposition_index: 1 }], dispositions, recurrences, followups,
      history, checks, 0, 1, at)).toThrow(/newer disposition/);
    expect(() => compareContinuityOutcomes(watches, dispositions, recurrences,
      followups, history, checks, 0, 1, "2026-11-01T00:00:00Z")).toThrow(/chronological/);
    const lateBaseline = recordContinuityWatch(dispositions, recurrences, followups,
      history, checks, [], environment, { dispositions: 0, watches: 0 }, {
        baseline_disposition_index: 0, latest_disposition_index: 1,
        category: "REQUEST_SOURCE_RENEWAL_WITNESS", personally_compared: true,
        hold_acknowledged: true }, "2026-10-29T09:00:00Z")[0];
    expect(() => recordOutcomeNote([lateBaseline, watches[1]], dispositions, recurrences,
      followups, history, checks, [], environment, { watches: 0, outcomes: 0 }, {
        baseline_continuity_index: 0, latest_continuity_index: 1,
        category: "CONTINUE_INDEPENDENT_HOLD", personally_compared: true,
        hold_acknowledged: true }, at)).toThrow(/genuinely newer owner trial/);
  });

  it("rejects malformed imported outcome envelopes and forged HOLD approval", () => {
    expect(() => parseOutcomeReceipt(JSON.stringify({
      kind: "rosevear_independent_continuity_outcome_reconciliation",
      schema_version: 1, exported_at: at, field_acceptance: "APPROVED",
      independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED",
      automatic_dispatch: "DISABLED", automatic_reassignment: "DISABLED",
      evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS",
      continuity_receipt: {}, outcome_notes: [],
    }))).toThrow(/Unsafe Build 167/);
    expect(() => comparePrivateContinuityReceipts("{}", "{}"))
      .toThrow(/Two chronological complete Build 166/);
  });
});
