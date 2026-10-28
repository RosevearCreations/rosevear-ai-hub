import { afterAll, describe, expect, it, vi } from "vitest";
import type { TrialEnvironment, TrialObservation } from "./ownerFieldTrial";
import type { SourceIdentityCheck } from "./ownerFieldRouting";
import type { OwnerReviewFollowup } from "./ownerReassignmentReviewFollowup";
import { recordReviewRecurrence } from "./ownerReviewRecurrence";
import { recordDispositionFollowup } from "./ownerRecurrenceDisposition";
import { recordContinuityWatch } from "./ownerDispositionContinuity";
import { recordOutcomeNote } from "./ownerContinuityOutcome";
import { compareOutcomeAging, comparePrivateOutcomeReceipts,
  parseAgingAuditReceipt, recordAgingAudit, validateAgingAudits } from "./ownerOutcomeAgingAudit";

vi.useFakeTimers();
vi.setSystemTime(new Date("2026-11-11T12:00:00Z"));
afterAll(() => vi.useRealTimers());
const environment: TrialEnvironment = { installed_version: "0.0.7-build168",
  access: "local_console", installed_windows_witnessed: true };
const days = ["2026-09-02", "2026-09-06", "2026-09-10", "2026-09-14",
  "2026-09-18", "2026-09-24", "2026-10-02"];
const followupDays = ["2026-09-03", "2026-09-07", "2026-09-11", "2026-09-15",
  "2026-09-19", "2026-09-25", "2026-10-03"];
const recurrenceDays = ["2026-09-08", "2026-09-12", "2026-09-16",
  "2026-09-20", "2026-09-26", "2026-10-04"];
const dispositionDays = ["2026-09-13", "2026-09-17", "2026-09-21",
  "2026-09-27", "2026-10-05"];
const watchDates = ["2026-09-17T09:00:00Z", "2026-09-22T09:00:00Z",
  "2026-09-28T09:00:00Z", "2026-10-06T09:00:00Z"];
const outcomeDates = ["2026-09-23T09:00:00Z", "2026-09-29T09:00:00Z",
  "2026-10-07T09:00:00Z"];
const outcomes = ["issue", "passed", "issue", "passed", "issue", "passed", "issue"] as const;
const owners = ["camera_operator", "household_owner", "camera_operator",
  "household_owner", "camera_operator", "household_owner", "camera_operator"] as const;
const history: TrialObservation[] = days.map((day, i) => ({
  case_id: "cameras", observed_at: `${day}T08:00:00Z`, outcome: outcomes[i],
  finding: outcomes[i] === "issue" ? "stale_evidence" : "none",
  next_owner: owners[i], witnessed_by_operator: true, acknowledged_at: null }));
const checks: SourceIdentityCheck[] = days.map((day, i) => ({
  case_id: "cameras", trial_index: i,
  identity_state: i % 2 === 0 ? "operator_mismatch" : "confirmed_alias",
  safe_alias: `asset_${["111aaa", "222bbb", "333ccc", "333ccc", "444ddd", "555eee", "666fff"][i]}`,
  installed_version: environment.installed_version, access: "local_console",
  witnessed_on_windows: true, captured_at: `${day}T08:01:00Z` }));
const followups: OwnerReviewFollowup[] = followupDays.map((day, i) => ({
  reassignment_watch_index: 0, observation_index: i, source_check_index: i,
  case_id: "cameras", watch_recorded_at: "2026-09-01T09:00:00Z", audit_pair: [0, 1],
  followup_observed_at: `${days[i]}T08:00:00Z`, prior_owner_claim: "camera_operator",
  current_owner_claim: owners[i], owner_outcome: outcomes[i],
  owner_finding: outcomes[i] === "issue" ? "stale_evidence" : "none",
  watch_age_days: [1, 5, 9, 13, 17, 23, 31][i],
  age_band: i === 0 ? "UNDER_THREE_DAYS" : i === 1 ?
    "THREE_TO_SEVEN_DAYS" : "OVER_SEVEN_DAYS",
  signals: ["ORIGINAL_REASSIGNMENT_WATCH_HELD"], unresolved: true,
  recorded_at: `${day}T08:00:00Z`, category: "CONTINUE_REASSIGNMENT_HOLD",
  personally_witnessed: true, hold_acknowledged: true,
  state: "PRIVATE_OWNER_REVIEW_FOLLOWUP_NOT_SENT",
  field_acceptance: "FIELD_ACCEPTANCE_HOLD", independent_review: "INDEPENDENT_REVIEW_HOLD",
  closure: "NOT_AUTHORIZED" }));

let recurrences = [] as ReturnType<typeof recordReviewRecurrence>;
for (let i = 0; i < recurrenceDays.length; i++) {
  recurrences = recordReviewRecurrence(followups, history, checks, recurrences,
    environment, { followups: 0, recurrences: 0 }, {
      baseline_followup_index: i, latest_followup_index: i + 1,
      category: "CONTINUE_INDEPENDENT_HOLD", personally_compared: true,
      hold_acknowledged: true }, `${recurrenceDays[i]}T08:00:00Z`);
}
let dispositions = [] as ReturnType<typeof recordDispositionFollowup>;
for (let i = 0; i < dispositionDays.length; i++) {
  dispositions = recordDispositionFollowup(recurrences, followups, history, checks,
    dispositions, environment, { recurrences: 0, dispositions: 0 }, {
      baseline_recurrence_index: i, latest_recurrence_index: i + 1,
      category: i % 2 === 0 ? "REQUEST_DISPOSITION_RECHECK" : "REQUEST_SOURCE_EVIDENCE_RENEWAL",
      personally_compared: true, hold_acknowledged: true },
    `${dispositionDays[i]}T08:00:00Z`);
}
let watches = [] as ReturnType<typeof recordContinuityWatch>;
for (let i = 0; i < watchDates.length; i++) {
  watches = recordContinuityWatch(dispositions, recurrences, followups, history,
    checks, watches, environment, { dispositions: 0, watches: 0 }, {
      baseline_disposition_index: i, latest_disposition_index: i + 1,
      category: "REQUEST_SOURCE_RENEWAL_WITNESS", personally_compared: true,
      hold_acknowledged: true }, watchDates[i]);
}
let notes = [] as ReturnType<typeof recordOutcomeNote>;
for (let i = 0; i < outcomeDates.length; i++) {
  notes = recordOutcomeNote(watches, dispositions, recurrences, followups, history,
    checks, notes, environment, { watches: 0, outcomes: 0 }, {
      baseline_continuity_index: i, latest_continuity_index: i + 1,
      category: "REQUEST_SOURCE_FRESHNESS_RECHECK", personally_compared: true,
      hold_acknowledged: true }, outcomeDates[i]);
}
const at = "2026-11-10T09:00:00Z";

describe("Build 168 continuity outcome aging and source freshness audit", () => {
  it("recomputes repeated owner exceptions, renewed but overdue unverified source, and aging", () => {
    const comparison = compareOutcomeAging(notes, watches, dispositions, recurrences,
      followups, history, checks, 0, 1, at);
    expect(comparison).toMatchObject({ reassignment_watch_index: 0,
      new_owner_trial_since_outcome: true, source_renewed_since_outcome: true,
      latest_source_confirmed_alias_claim: true, age_band: "OVER_SEVEN_DAYS",
      unresolved: true });
    expect(comparison.outcome_age_days).toBeGreaterThan(7);
    expect(comparison.source_age_days).toBeGreaterThan(7);
    expect(comparison.signals).toContain("REPEATED_OWNER_EXCEPTION");
    expect(comparison.signals).toContain("SOURCE_ALIAS_OR_IDENTITY_CHANGED");
    expect(comparison.signals).toContain("SOURCE_EVIDENCE_OVERDUE");
    expect(comparison.signals).toContain("EARLIER_OUTCOME_OVERDUE");
    expect(comparison.signals).toContain("ORIGINAL_INDEPENDENT_HOLD_PERSISTS");
  });

  it("requires a fresh later outcome, witnessed Windows and separate permanent HOLD", () => {
    const input = { baseline_outcome_index: 0, latest_outcome_index: 1,
      category: "REQUEST_OVERDUE_REVIEW" as const,
      personally_rechecked: true, hold_acknowledged: true };
    expect(() => recordAgingAudit(notes, watches, dispositions, recurrences,
      followups, history, checks, [], environment, { outcomes: 2, audits: 0 },
      input, at)).toThrow(/non-imported/);
    expect(() => recordAgingAudit(notes, watches, dispositions, recurrences,
      followups, history, checks, [], { ...environment, installed_windows_witnessed: false },
      { outcomes: 0, audits: 0 }, input, at)).toThrow(/Windows/);
    expect(() => recordAgingAudit(notes, watches, dispositions, recurrences,
      followups, history, checks, [], environment, { outcomes: 0, audits: 0 },
      { ...input, hold_acknowledged: false }, at)).toThrow(/HOLD/);
    const audits = recordAgingAudit(notes, watches, dispositions, recurrences,
      followups, history, checks, [], environment, { outcomes: 0, audits: 0 }, input, at);
    expect(audits[0]).toMatchObject({ state: "PRIVATE_OUTCOME_AGING_AUDIT_NOT_SENT",
      field_acceptance: "FIELD_ACCEPTANCE_HOLD", independent_review: "INDEPENDENT_REVIEW_HOLD",
      closure: "NOT_AUTHORIZED" });
    validateAgingAudits(audits, notes, watches, dispositions, recurrences,
      followups, history, checks);
    expect(() => validateAgingAudits([{ ...audits[0], source_age_days: 0 }], notes,
      watches, dispositions, recurrences, followups, history, checks)).toThrow(/immutable/);
    expect(() => validateAgingAudits([{ ...audits[0], closure: "APPROVED" as never }], notes,
      watches, dispositions, recurrences, followups, history, checks)).toThrow(/HOLD/);
    expect(() => validateAgingAudits([audits[0], audits[0]], notes, watches,
      dispositions, recurrences, followups, history, checks)).toThrow(/Duplicate/);
  });

  it("rejects reversed, wrong-case, replayed continuity and future chronology", () => {
    expect(() => compareOutcomeAging(notes, watches, dispositions, recurrences,
      followups, history, checks, 1, 0, at)).toThrow(/chronological/);
    expect(() => compareOutcomeAging([notes[0], { ...notes[1], case_id: "devices" }],
      watches, dispositions, recurrences, followups, history, checks,
      0, 1, at)).toThrow(/exact same held/);
    expect(() => compareOutcomeAging([notes[0], { ...notes[1],
      latest_continuity_index: notes[0].latest_continuity_index }], watches,
      dispositions, recurrences, followups, history, checks, 0, 1, at))
      .toThrow(/newer continuity/);
    expect(() => compareOutcomeAging(notes, watches, dispositions, recurrences,
      followups, history, checks, 0, 1, "2026-09-28T00:00:00Z"))
      .toThrow(/chronological/);
  });

  it("rejects forged approved import and malformed complete Build 167 comparison", () => {
    expect(() => parseAgingAuditReceipt(JSON.stringify({
      kind: "rosevear_independent_continuity_outcome_aging_audit",
      schema_version: 1, exported_at: at, field_acceptance: "APPROVED",
      independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED",
      automatic_dispatch: "DISABLED", automatic_reassignment: "DISABLED",
      evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS",
      outcome_receipt: {}, aging_audits: [],
    }))).toThrow(/Unsafe Build 168/);
    expect(() => comparePrivateOutcomeReceipts("{}", "{}"))
      .toThrow(/Two chronological complete Build 167/);
  });
});
