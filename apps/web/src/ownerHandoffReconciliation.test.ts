import { describe, expect, it } from "vitest";
import { createTrialReceipt, recordTrialObservation, type TrialEnvironment } from "./ownerFieldTrial";
import { advanceRepairHandoff, createRepairHandoff } from "./ownerTrialReconciliation";
import { recordSourceIdentityCheck } from "./ownerFieldRouting";
import { recordRepeatTrialLink } from "./ownerRepeatTrialReassessment";
import { recordOwnerEvidenceFollowup } from "./ownerReassessmentFollowup";
import { recordFollowupDecision } from "./ownerFollowupDecisionReplay";
import { createOverdueHandoffReceipt, recordOverdueHandoff } from "./ownerOverdueHandoff";
import { compareIndependentHandoffs, comparePrivateHandoffReceipts,
  createHandoffReconciliationReceipt, parseHandoffReconciliationReceipt, recordHandoffFollowup,
  type HandoffFollowupCategory, type HandoffReconciliationReceipt } from "./ownerHandoffReconciliation";
import { createFollowupOutcomeReceipt, parseFollowupOutcomeReceipt,
  recordFollowupOutcome } from "./ownerFollowupOutcome";
import { compareOutcomeRounds, createOutcomeRecurrenceReceipt,
  parseOutcomeRecurrenceReceipt, recordOutcomeRecheck } from "./ownerOutcomeRecurrence";
import { comparePrivateRecheckReceipts, compareRecheckRounds,
  createRecheckDecisionWatchReceipt, parseRecheckDecisionWatchReceipt,
  recordExceptionWatch } from "./ownerRecheckDecisionWatch";
import { compareHistoricalWatchFollowup, comparePrivateWatchReceipts,
  createHistoricalWatchAuditReceipt, parseHistoricalWatchAuditReceipt,
  recordHistoricalWatchAudit } from "./ownerHistoricalWatchAudit";
import { compareAuditRounds, comparePrivateAgingAuditReceipts,
  createAuditReassignmentWatchReceipt, parseAuditReassignmentWatchReceipt,
  recordReassignmentWatch } from "./ownerAuditReassignmentWatch";
import { compareOwnerReviewEvidence, comparePrivateReassignmentReceipts,
  createOwnerReviewFollowupReceipt, parseOwnerReviewFollowupReceipt,
  recordOwnerReviewFollowup } from "./ownerReassignmentReviewFollowup";

const environment: TrialEnvironment = { installed_version: "0.0.7-build157", access: "local_console",
  installed_windows_witnessed: true };
const unknown: TrialEnvironment = { installed_version: "", access: "unknown", installed_windows_witnessed: false };
const time = (minute: number) => new Date(Date.parse("2026-10-08T08:00:00Z") + minute * 60_000).toISOString();
const DAY = 1440;
const priorCounts = { trials: 0, checks: 0, links: 0, followups: 0, decisions: 0, resolutions: 0, handoffs: 0 };
const upstream = { trials: 0, checks: 0, reviews: 0, links: 0, reassessments: 0, followups: 0, decisions: 0 };

function fixture() {
  let history = recordTrialObservation([], unknown, { case_id: "cameras", outcome: "issue",
    finding: "playback_missing", next_owner: "camera_operator", witnessed: true }, time(0));
  let repairs = createRepairHandoff(history, [], "cameras", time(1));
  repairs = advanceRepairHandoff(history, repairs, "cameras", 0, true, time(2));
  repairs = advanceRepairHandoff(history, repairs, "cameras", 0, true, time(3));
  let checks = recordSourceIdentityCheck(history, [], environment, { case_id: "cameras",
    identity_state: "confirmed_alias", safe_alias: "asset_123abc", personally_witnessed: true }, time(4));
  history = recordTrialObservation(history, environment, { case_id: "cameras", outcome: "passed",
    finding: "none", next_owner: "household_owner", witnessed: true }, time(5));
  checks = recordSourceIdentityCheck(history, checks, environment, { case_id: "cameras",
    identity_state: "confirmed_alias", safe_alias: "asset_123abc", personally_witnessed: true }, time(6));
  const links = recordRepeatTrialLink(history, checks, [], environment, repairs, [], upstream,
    { case_id: "cameras", route_reason: "ACTIVE_FINDING", personally_witnessed: true }, time(7));
  const followups = recordOwnerEvidenceFollowup(history, checks, links, [], environment, repairs,
    [], [], upstream, { link_index: 0, criterion: "field_hold", personally_reviewed: true }, time(19));
  const decisions = recordFollowupDecision(history, checks, links, followups, [], environment, repairs,
    [], [], upstream, { source_followup_index: 0, decision: "REPEAT_TRIAL_REQUESTED",
      personally_reviewed: true, separate_reviewer: true }, time(22));
  const handoffs = recordOverdueHandoff(history, checks, links, decisions, [], [],
    environment, priorCounts, { decision_index: 0, category: "OVERDUE_INDEPENDENT_REVIEW_REQUEST",
      personally_reviewed: true, hold_acknowledged: true }, time(DAY * 4 + 22));
  return { history, repairs, checks, links, followups, decisions, handoffs };
}

type TrialData = ReturnType<typeof fixture>;
function private156(f: TrialData, at: number) {
  return createOverdueHandoffReceipt(environment, [], f.history, f.repairs, [], f.checks,
    f.links, [], f.followups, f.decisions, [], f.handoffs, time(at));
}
function private157(f: TrialData, reviews: ReturnType<typeof recordHandoffFollowup>, at: number) {
  return createHandoffReconciliationReceipt(environment, [], f.history, f.repairs, [], f.checks,
    f.links, [], f.followups, f.decisions, [], f.handoffs, reviews, time(at));
}
function nextHandoff(f: TrialData, at = DAY * 8 + 22) {
  f.handoffs = recordOverdueHandoff(f.history, f.checks, f.links, f.decisions, [], f.handoffs,
    environment, priorCounts, { decision_index: 0, category: "OVERDUE_INDEPENDENT_REVIEW_REQUEST",
      personally_reviewed: true, hold_acknowledged: true }, time(at));
  return f;
}
function followup(f: TrialData, at = DAY * 9 + 22) {
  return recordHandoffFollowup(f.handoffs, f.links, [], environment, { handoffs: 0, reviews: 0 },
    { baseline_handoff_index: 0, latest_handoff_index: 1,
      category: "REQUEST_INDEPENDENT_RECHECK", personally_compared: true, hold_acknowledged: true }, time(at));
}

describe("Build 157 independent handoff receipt reconciliation", () => {
  it("compares exact historical snapshot pairs and manually ages an outstanding HOLD", () => {
    const f = nextHandoff(fixture());
    const early = compareIndependentHandoffs(f.handoffs, 0, 1, time(DAY * 8 + 22));
    expect(early).toMatchObject({ baseline_handoff_index: 0, latest_handoff_index: 1,
      decision_index: 0, original_decision_at: time(22),
      original_followup_age_days: 4, followup_age_band: "THREE_TO_SEVEN_DAYS",
      latest_handoff_age_days: 0, followup_outstanding: true,
      discrepancies: ["INDEPENDENT_FOLLOWUP_AGED"] });
    const later = compareIndependentHandoffs(f.handoffs, 0, 1, time(DAY * 12 + 22));
    expect(later).toMatchObject({ followup_age_band: "OVER_SEVEN_DAYS",
      original_followup_age_days: 8, latest_handoff_age_days: 4 });
    expect(() => compareIndependentHandoffs(f.handoffs, 1, 0)).toThrow(/Two chronological/);
    expect(() => compareIndependentHandoffs(f.handoffs, 0, 1, time(DAY * 5))).toThrow(/Two chronological/);
  });

  it("flags reopened owner issues and changed pseudonymous identity checks without overwriting prior pass", () => {
    const f = fixture();
    f.history = recordTrialObservation(f.history, environment, { case_id: "cameras", outcome: "issue",
      finding: "playback_missing", next_owner: "camera_operator", witnessed: true }, time(DAY * 4 + 32));
    f.checks = recordSourceIdentityCheck(f.history, f.checks, environment, { case_id: "cameras",
      identity_state: "confirmed_alias", safe_alias: "asset_456def", personally_witnessed: true }, time(DAY * 4 + 33));
    nextHandoff(f, DAY * 8 + 22);
    const comparison = compareIndependentHandoffs(f.handoffs, 0, 1, time(DAY * 9 + 22));
    expect(comparison.discrepancies).toEqual(["REOPENED_TRIAL_CHANGED", "SOURCE_ALIAS_STATE_CHANGED",
      "OWNER_TRIAL_CHANGED", "INDEPENDENT_FOLLOWUP_AGED"]);
    expect(f.handoffs[0].newest_trial_index).toBeNull();
    expect(f.handoffs[1].newest_trial_index).toBe(2);
    const saved = recordHandoffFollowup(f.handoffs, f.links, [], environment,
      { handoffs: 0, reviews: 0 }, { baseline_handoff_index: 0, latest_handoff_index: 1,
        category: "REQUEST_SOURCE_ALIAS_WITNESS", personally_compared: true,
        hold_acknowledged: true }, time(DAY * 9 + 22));
    expect(saved[0]).toMatchObject({ followup_category: "REQUEST_SOURCE_ALIAS_WITNESS",
      state: "PRIVATE_RECHECK_NOTE_NOT_SENT", field_acceptance: "FIELD_ACCEPTANCE_HOLD",
      independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED" });
  });

  it("accepts only an exact append-only earlier private Build 156 receipt as historical comparison", () => {
    const f = fixture();
    const oldReceipt = JSON.stringify(private156(f, DAY * 5));
    nextHandoff(f);
    const newer = JSON.stringify(private156(f, DAY * 9));
    expect(comparePrivateHandoffReceipts(oldReceipt, newer)).toMatchObject({
      previous_handoffs: 1, current_handoffs: 2, new_handoffs: 1,
      comparison: { baseline_handoff_index: 0, latest_handoff_index: 1, decision_index: 0 } });
    expect(() => comparePrivateHandoffReceipts(newer, oldReceipt)).toThrow(/exact, nonempty evidence prefix/);
    expect(() => comparePrivateHandoffReceipts(oldReceipt, oldReceipt)).toThrow(/exact, nonempty evidence prefix/);
    expect(() => comparePrivateHandoffReceipts(JSON.stringify({ ...private156(f, DAY * 9),
      overdue_handoffs: [f.handoffs[1]] }), newer)).toThrow();
    expect(() => comparePrivateHandoffReceipts(JSON.stringify(createTrialReceipt(environment, [], f.history)), newer))
      .toThrow(/exact, nonempty evidence prefix/);
  });

  it("requires two manual witnesses, matching installed version and a non-imported latest handoff", () => {
    const f = nextHandoff(fixture());
    const input: {baseline_handoff_index:number; latest_handoff_index:number; category:HandoffFollowupCategory;
      personally_compared:boolean; hold_acknowledged:boolean } = {
      baseline_handoff_index: 0, latest_handoff_index: 1,
      category: "REQUEST_INDEPENDENT_RECHECK", personally_compared: true,
      hold_acknowledged: true };
    const record = (changes: Partial<typeof input> = {}, imported = { handoffs: 0, reviews: 0 },
      env = environment) => recordHandoffFollowup(f.handoffs, f.links, [], env, imported,
      { ...input, ...changes }, time(DAY * 9 + 22));
    expect(() => record({ personally_compared: false })).toThrow(/Personally compare/);
    expect(() => record({ hold_acknowledged: false })).toThrow(/Personally compare/);
    expect(() => record({}, { handoffs: 2, reviews: 0 })).toThrow(/imported handoff/);
    expect(() => record({}, { handoffs: 0, reviews: 0 }, unknown)).toThrow(/unwitnessed/);
    expect(() => record({}, { handoffs: 0, reviews: 0 },
      { ...environment, installed_version: "unmatched" })).toThrow(/unwitnessed/);
    expect(() => record({ category: "REQUEST_SOURCE_ALIAS_WITNESS" })).toThrow(/must match/);
    expect(() => record({ category: "SEND_MESSAGE" as never })).toThrow(/Personally compare/);
    expect(record()).toHaveLength(1);
    const previous = record();
    expect(() => recordHandoffFollowup(f.handoffs, f.links, previous, environment,
      { handoffs: 0, reviews: 0 }, input, time(DAY * 9 + 23))).toThrow(/Duplicate/);
  });

  it("round-trips bounded nested Build 157 source chain and treats older receipts as history", () => {
    const f = nextHandoff(fixture());
    const reviews = followup(f);
    const envelope = private157(f, reviews, DAY * 10);
    expect(parseHandoffReconciliationReceipt(JSON.stringify(envelope))).toMatchObject({
      overdue_handoffs: f.handoffs, followup_reviews: reviews,
      trial: { observations: f.history }, decisions: f.decisions });
    expect(parseHandoffReconciliationReceipt(JSON.stringify(private156(f, DAY * 10)))
      .followup_reviews).toEqual([]);
    expect(parseHandoffReconciliationReceipt(JSON.stringify(createTrialReceipt(environment, [], f.history)))
      .followup_reviews).toEqual([]);
  });

  it("rejects forged closure, secret fields, changed age and forged nested owner source events", () => {
    const f = nextHandoff(fixture());
    const reviews = followup(f);
    const original = private157(f, reviews, DAY * 10);
    const parse = (change: Partial<HandoffReconciliationReceipt>) =>
      parseHandoffReconciliationReceipt(JSON.stringify({ ...original, ...change }));
    expect(() => parse({ closure: "GREEN" as never })).toThrow(/Unsafe/);
    expect(() => parse({ scheduled_followup: "ENABLED" as never })).toThrow(/Unsafe/);
    expect(() => parse({ operator_ip: "192.168.68.100" } as never)).toThrow(/Unsafe/);
    expect(() => parse({ followup_reviews: [{ ...reviews[0], original_followup_age_days: 0 }] }))
      .toThrow(/contradicts/);
    expect(() => parse({ followup_reviews: [{ ...reviews[0], discrepancies: [] }] }))
      .toThrow(/contradicts/);
    expect(() => parse({ followup_reviews: [{ ...reviews[0], state: "SENT" }] as never }))
      .toThrow(/Unsafe/);
    expect(() => parse({ followup_reviews: [{ ...reviews[0], host: "private" }] } as never))
      .toThrow(/Unsafe/);
    expect(() => parse({ followup_reviews: [reviews[0], reviews[0]] })).toThrow(/Duplicate/);
    expect(() => parse({ handoff_receipt: { ...original.handoff_receipt, closure: "GREEN" as never } }))
      .toThrow(/Unsafe/);
    expect(() => parse({ handoff_receipt: { ...original.handoff_receipt,
      overdue_handoffs: [{ ...f.handoffs[0], age_days: 0 }, f.handoffs[1]] } }))
      .toThrow(/contradicts/);
    expect(() => parseHandoffReconciliationReceipt("x".repeat(1_450_001)))
      .toThrow(/exceeds 1.45 MB/);
  });
});

describe("Build 158 private outcome and historical exception continuity", () => {
  it("records a fresh same-case observation without clearing an aged independent HOLD", () => {
    const f = nextHandoff(fixture());
    const reviews = followup(f);
    f.history = recordTrialObservation(f.history, environment, { case_id: "cameras", outcome: "passed",
      finding: "none", next_owner: "household_owner", witnessed: true }, time(DAY * 10 + 22));
    const outcomes = recordFollowupOutcome(reviews, f.history, f.checks, [], environment,
      { reviews: 0, observations: 2, outcomes: 0 },
      { review_index: 0, observation_index: 2, source_check_index: null,
        personally_witnessed: true, hold_acknowledged: true }, time(DAY * 11 + 22));
    expect(outcomes[0]).toMatchObject({ outcome: "OWNER_IMPROVEMENT_UNVERIFIED",
      historical_exception_continues: true, closure: "NOT_AUTHORIZED" });
    const prior = private157(f, reviews, DAY * 12 + 22);
    const receipt = createFollowupOutcomeReceipt(prior, outcomes, time(DAY * 13 + 22));
    expect(parseFollowupOutcomeReceipt(JSON.stringify(receipt)).outcome_reviews).toEqual(outcomes);
    const forged = { ...receipt, outcome_reviews: [{ ...outcomes[0], historical_exception_continues: false }] };
    expect(() => parseFollowupOutcomeReceipt(JSON.stringify(forged))).toThrow(/HOLD-only/);
    expect(() => recordFollowupOutcome(reviews, f.history, f.checks, outcomes, environment,
      { reviews: 0, observations: 2, outcomes: 0 },
      { review_index: 0, observation_index: 2, source_check_index: null,
        personally_witnessed: true, hold_acknowledged: true }, time(DAY * 12 + 22))).toThrow(/Duplicate/);
    expect(() => recordFollowupOutcome(reviews, f.history, f.checks, [], environment,
      { reviews: 1, observations: 2, outcomes: 0 },
      { review_index: 0, observation_index: 2, source_check_index: null,
        personally_witnessed: true, hold_acknowledged: true }, time(DAY * 11 + 22))).toThrow(/non-imported/);
  });
});

describe("Build 159 same-follow-up recurrence and exception recheck continuity", () => {
  it("detects a renewed issue after reported owner improvement and retains independent HOLDs", () => {
    const f = nextHandoff(fixture());
    const reviews = followup(f);
    f.history = recordTrialObservation(f.history, environment, { case_id: "cameras", outcome: "passed",
      finding: "none", next_owner: "household_owner", witnessed: true }, time(DAY * 10 + 22));
    let outcomes = recordFollowupOutcome(reviews, f.history, f.checks, [], environment,
      { reviews: 0, observations: 0, outcomes: 0 },
      { review_index: 0, observation_index: 2, source_check_index: null,
      personally_witnessed: true, hold_acknowledged: true }, time(DAY * 10 + 32));
    f.history = recordTrialObservation(f.history, environment, { case_id: "cameras", outcome: "issue",
      finding: "playback_missing", next_owner: "camera_operator", witnessed: true }, time(DAY * 11 + 22));
    outcomes = recordFollowupOutcome(reviews, f.history, f.checks, outcomes, environment,
      { reviews: 0, observations: 0, outcomes: 0 },
      { review_index: 0, observation_index: 3, source_check_index: 1,
        personally_witnessed: true, hold_acknowledged: true }, time(DAY * 12 + 22));
    const comparison = compareOutcomeRounds(outcomes, reviews, f.checks, 0, 1, time(DAY * 13 + 32));
    expect(comparison).toMatchObject({ review_index: 0, age_days: 3, outstanding: true,
      signals: ["OWNER_OUTCOME_CHANGED", "ISSUE_RECURRED_AFTER_IMPROVEMENT",
        "SOURCE_CHECK_COVERAGE_CHANGED", "HISTORICAL_EXCEPTIONS_CONTINUE", "INDEPENDENT_RECHECK_AGED"] });
    const notes = recordOutcomeRecheck(outcomes, reviews, f.checks, [], environment,
      { outcomes: 0, rechecks: 0 }, { baseline_outcome_index: 0, latest_outcome_index: 1,
        reason: "REQUEST_RECURRENCE_WITNESS", personally_compared: true, hold_acknowledged: true }, time(DAY * 13 + 32));
    expect(notes[0]).toMatchObject({ state: "PRIVATE_RECHECK_NOT_SENT",
      independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED" });
    const prior = createFollowupOutcomeReceipt(private157(f, reviews, DAY * 14 + 22), outcomes,
      time(DAY * 14 + 23));
    const receipt = createOutcomeRecurrenceReceipt(prior, notes, time(DAY * 14 + 32));
    expect(parseOutcomeRecurrenceReceipt(JSON.stringify(receipt)).recurrence_rechecks).toEqual(notes);
    expect(parseOutcomeRecurrenceReceipt(JSON.stringify(prior)).recurrence_rechecks).toEqual([]);
    expect(() => parseOutcomeRecurrenceReceipt(JSON.stringify({ ...receipt,
      recurrence_rechecks: [{ ...notes[0], closure: "APPROVED" }] }))).toThrow(/HOLD/);
    expect(() => parseOutcomeRecurrenceReceipt(JSON.stringify({ ...receipt,
      recurrence_rechecks: [{ ...notes[0], signals: ["HISTORICAL_EXCEPTIONS_CONTINUE"] }] }))).toThrow(/changed/);
    expect(() => recordOutcomeRecheck(outcomes, reviews, f.checks, notes, environment,
      { outcomes: 0, rechecks: 0 }, { baseline_outcome_index: 0, latest_outcome_index: 1,
        reason: "REQUEST_RECURRENCE_WITNESS", personally_compared: true, hold_acknowledged: true },
      time(DAY * 14 + 40))).toThrow(/Duplicate/);
    expect(() => recordOutcomeRecheck(outcomes, reviews, f.checks, [], environment,
      { outcomes: 2, rechecks: 0 }, { baseline_outcome_index: 0, latest_outcome_index: 1,
        reason: "REQUEST_RECURRENCE_WITNESS", personally_compared: true, hold_acknowledged: true },
      time(DAY * 13 + 32))).toThrow(/non-imported/);
    expect(recordOutcomeRecheck(outcomes, reviews, f.checks, [], environment,
      { outcomes: 0, rechecks: 0 }, { baseline_outcome_index: 0, latest_outcome_index: 1,
        reason: "REQUEST_SOURCE_IDENTITY_RECHECK", personally_compared: true, hold_acknowledged: true },
      time(DAY * 13 + 32))).toHaveLength(1);
    expect(() => compareOutcomeRounds(outcomes, reviews, f.checks, 1, 0)).toThrow(/chronological/);
  });
});

describe("Build 160 chronological recheck receipts and private exception decision watch", () => {
  it("compares exact private Build 159 prefixes and preserves contradictory decisions", () => {
    const f = nextHandoff(fixture());
    const reviews = followup(f);
    f.history = recordTrialObservation(f.history, environment, { case_id: "cameras", outcome: "passed",
      finding: "none", next_owner: "household_owner", witnessed: true }, time(DAY * 10 + 22));
    let outcomes = recordFollowupOutcome(reviews, f.history, f.checks, [], environment,
      { reviews: 0, observations: 0, outcomes: 0 }, { review_index: 0, observation_index: 2,
        source_check_index: null, personally_witnessed: true, hold_acknowledged: true }, time(DAY * 10 + 30));
    f.history = recordTrialObservation(f.history, environment, { case_id: "cameras", outcome: "issue",
      finding: "playback_missing", next_owner: "camera_operator", witnessed: true }, time(DAY * 11 + 22));
    outcomes = recordFollowupOutcome(reviews, f.history, f.checks, outcomes, environment,
      { reviews: 0, observations: 0, outcomes: 0 }, { review_index: 0, observation_index: 3,
        source_check_index: 1, personally_witnessed: true, hold_acknowledged: true }, time(DAY * 11 + 30));
    let rechecks = recordOutcomeRecheck(outcomes, reviews, f.checks, [], environment,
      { outcomes: 0, rechecks: 0 }, { baseline_outcome_index: 0, latest_outcome_index: 1,
        reason: "REQUEST_RECURRENCE_WITNESS", personally_compared: true, hold_acknowledged: true },
      time(DAY * 11 + 40));
    const earlier = createOutcomeRecurrenceReceipt(createFollowupOutcomeReceipt(
      private157(f, reviews, DAY * 12 + 29), outcomes, time(DAY * 12 + 30)), rechecks,
      time(DAY * 12 + 31));
    f.history = recordTrialObservation(f.history, environment, { case_id: "cameras", outcome: "passed",
      finding: "none", next_owner: "household_owner", witnessed: true }, time(DAY * 12 + 40));
    outcomes = recordFollowupOutcome(reviews, f.history, f.checks, outcomes, environment,
      { reviews: 0, observations: 0, outcomes: 0 }, { review_index: 0, observation_index: 4,
        source_check_index: 0, personally_witnessed: true, hold_acknowledged: true }, time(DAY * 13 + 22));
    rechecks = recordOutcomeRecheck(outcomes, reviews, f.checks, rechecks, environment,
      { outcomes: 0, rechecks: 0 }, { baseline_outcome_index: 1, latest_outcome_index: 2,
        reason: "REQUEST_INDEPENDENT_OUTCOME_RECHECK", personally_compared: true, hold_acknowledged: true },
      time(DAY * 14 + 50));
    const later = createOutcomeRecurrenceReceipt(createFollowupOutcomeReceipt(
      private157(f, reviews, DAY * 14 + 55), outcomes, time(DAY * 14 + 56)), rechecks,
      time(DAY * 14 + 57));
    expect(comparePrivateRecheckReceipts(JSON.stringify(earlier), JSON.stringify(later))).toMatchObject({
      previous_rechecks: 1, current_rechecks: 2, new_rechecks: 1,
      comparison: { review_index: 0, first_recheck_age_days: 3, unresolved: true } });
    const comparison = compareRecheckRounds(rechecks, 0, 1, time(DAY * 14 + 50));
    expect(comparison.signals).toEqual(["RECHECK_REASON_CHANGED", "RECURRENCE_EVIDENCE_CHANGED",
      "SOURCE_EXCEPTION_PERSISTS", "OUTCOME_ROUND_ADVANCED", "RECHECK_WATCH_AGED",
      "HISTORICAL_EXCEPTIONS_UNRESOLVED"]);
    const watches = recordExceptionWatch(rechecks, [], environment, { rechecks: 0, watches: 0 },
      { baseline_recheck_index: 0, latest_recheck_index: 1, category: "REQUEST_SOURCE_IDENTITY_WITNESS",
        personally_compared: true, hold_acknowledged: true }, time(DAY * 14 + 58));
    const receipt = createRecheckDecisionWatchReceipt(later, watches, time(DAY * 14 + 59));
    expect(parseRecheckDecisionWatchReceipt(JSON.stringify(receipt)).exception_watches).toEqual(watches);
    expect(parseRecheckDecisionWatchReceipt(JSON.stringify(later)).exception_watches).toEqual([]);
    expect(watches[0]).toMatchObject({ state: "PRIVATE_EXCEPTION_WATCH_NOT_SENT",
      closure: "NOT_AUTHORIZED", independent_review: "INDEPENDENT_REVIEW_HOLD" });
    expect(() => parseRecheckDecisionWatchReceipt(JSON.stringify({ ...receipt,
      exception_watches: [{ ...watches[0], closure: "APPROVED" }] }))).toThrow(/HOLD/);
    expect(() => parseRecheckDecisionWatchReceipt(JSON.stringify({ ...receipt,
      exception_watches: [{ ...watches[0], first_recheck_age_days: 0 }] }))).toThrow(/immutable/);
    expect(() => comparePrivateRecheckReceipts(JSON.stringify(later), JSON.stringify(earlier))).toThrow(/chronological/);
    expect(() => recordExceptionWatch(rechecks, watches, environment, { rechecks: 0, watches: 0 },
      { baseline_recheck_index: 0, latest_recheck_index: 1, category: "REQUEST_SOURCE_IDENTITY_WITNESS",
        personally_compared: true, hold_acknowledged: true }, time(DAY * 14 + 60))).toThrow(/Duplicate/);
    expect(() => recordExceptionWatch(rechecks, [], environment, { rechecks: 2, watches: 0 },
      { baseline_recheck_index: 0, latest_recheck_index: 1, category: "CONTINUE_INDEPENDENT_REVIEW_HOLD",
        personally_compared: true, hold_acknowledged: true }, time(DAY * 14 + 58))).toThrow(/non-imported/);

    // Build 161: a fresh owner trial follows an older private watch, but never supersedes that watch.
    f.history = recordTrialObservation(f.history, environment, { case_id: "cameras", outcome: "issue",
      finding: "playback_missing", next_owner: "camera_operator", witnessed: true }, time(DAY * 16 + 20));
    f.checks = recordSourceIdentityCheck(f.history, f.checks, environment, { case_id: "cameras",
      identity_state: "operator_mismatch", safe_alias: "asset_456def", personally_witnessed: true },
      time(DAY * 16 + 21));
    const comparison161 = compareHistoricalWatchFollowup(watches, f.history, f.checks,
      0, 5, 2, time(DAY * 17 + 60));
    expect(comparison161).toMatchObject({ watch_index: 0, observation_index: 5,
      source_check_index: 2, baseline_source_check_index: 1,
      case_id: "cameras", watch_age_band: "THREE_TO_SEVEN_DAYS", outstanding: true,
      owner_outcome: "issue", owner_finding: "playback_missing" });
    expect(comparison161.signals).toContain("SOURCE_IDENTITY_CONTRADICTION");
    expect(comparison161.signals).toContain("HISTORICAL_EXCEPTION_UNRESOLVED");
    const audits = recordHistoricalWatchAudit(watches, f.history, f.checks, [], environment,
      { trials: 5, checks: 2, audits: 0 }, { watch_index: 0, observation_index: 5,
        source_check_index: 2, category: "REQUEST_SOURCE_IDENTITY_RECHECK",
        personally_witnessed: true, hold_acknowledged: true }, time(DAY * 17 + 60));
    const private157now = private157(f, reviews, DAY * 17 + 61);
    const private158now = createFollowupOutcomeReceipt(private157now, outcomes, time(DAY * 17 + 62));
    const private159now = createOutcomeRecurrenceReceipt(private158now, rechecks, time(DAY * 17 + 63));
    const private160now = createRecheckDecisionWatchReceipt(private159now, watches, time(DAY * 17 + 64));
    const auditReceipt = createHistoricalWatchAuditReceipt(private160now, audits, time(DAY * 17 + 65));
    expect(parseHistoricalWatchAuditReceipt(JSON.stringify(auditReceipt)).watch_followup_audits).toEqual(audits);
    expect(parseHistoricalWatchAuditReceipt(JSON.stringify(private160now)).watch_followup_audits).toEqual([]);
    expect(comparePrivateWatchReceipts(JSON.stringify(receipt), JSON.stringify(private160now))).toMatchObject({
      previous_watches: 1, new_observations: 1, comparison: { case_id: "cameras",
        observation_index: 5, outstanding: true } });
    expect(() => comparePrivateWatchReceipts(JSON.stringify(private160now), JSON.stringify(receipt)))
      .toThrow(/chronological/);
    expect(() => parseHistoricalWatchAuditReceipt(JSON.stringify({ ...auditReceipt,
      watch_followup_audits: [{ ...audits[0], watch_age_days: 0 }] }))).toThrow(/changed/);
    expect(() => parseHistoricalWatchAuditReceipt(JSON.stringify({ ...auditReceipt,
      closure: "APPROVED" }))).toThrow(/HOLD/);
    expect(() => recordHistoricalWatchAudit(watches, f.history, f.checks, audits, environment,
      { trials: 5, checks: 2, audits: 0 }, { watch_index: 0, observation_index: 5,
        source_check_index: 2, category: "REQUEST_SOURCE_IDENTITY_RECHECK",
        personally_witnessed: true, hold_acknowledged: true }, time(DAY * 17 + 61)))
      .toThrow(/Duplicate/);
    expect(() => recordHistoricalWatchAudit(watches, f.history, f.checks, [], environment,
      { trials: 6, checks: 3, audits: 0 }, { watch_index: 0, observation_index: 5,
        source_check_index: 2, category: "CONTINUE_HISTORICAL_REVIEW_HOLD",
        personally_witnessed: true, hold_acknowledged: true }, time(DAY * 17 + 60)))
      .toThrow(/non-imported/);

    // Build 162: later private aging audit changes both owner role and pseudonymous source claims.
    f.history = recordTrialObservation(f.history, environment, { case_id: "cameras", outcome: "passed",
      finding: "none", next_owner: "household_owner", witnessed: true }, time(DAY * 18 + 20));
    f.checks = recordSourceIdentityCheck(f.history, f.checks, environment, { case_id: "cameras",
      identity_state: "confirmed_alias", safe_alias: "asset_789abc", personally_witnessed: true },
      time(DAY * 18 + 21));
    const laterAudits = recordHistoricalWatchAudit(watches, f.history, f.checks, audits, environment,
      { trials: 6, checks: 3, audits: 1 }, { watch_index: 0, observation_index: 6,
        source_check_index: 3, category: "CONTINUE_HISTORICAL_REVIEW_HOLD",
        personally_witnessed: true, hold_acknowledged: true }, time(DAY * 18 + 50));
    const round = compareAuditRounds(laterAudits, f.history, f.checks, 0, 1, time(DAY * 18 + 51));
    expect(round).toMatchObject({ case_id: "cameras", watch_index: 0,
      baseline_owner: "camera_operator", latest_owner: "household_owner", unresolved: true });
    expect(round.signals).toContain("OWNER_REASSIGNMENT_PROPOSED");
    expect(round.signals).toContain("SOURCE_ALIAS_OR_STATE_CHANGED");
    expect(round.signals).toContain("ORIGINAL_EXCEPTION_STILL_HELD");
    const reassignment = recordReassignmentWatch(laterAudits, f.history, f.checks, [], environment,
      { audits: 1, watches: 0 }, { baseline_audit_index: 0, latest_audit_index: 1,
        category: "REQUEST_OWNER_REASSIGNMENT_WITNESS", personally_compared: true,
        hold_acknowledged: true }, time(DAY * 18 + 52));
    const private157later = private157(f, reviews, DAY * 18 + 60);
    const private158later = createFollowupOutcomeReceipt(private157later, outcomes, time(DAY * 18 + 61));
    const private159later = createOutcomeRecurrenceReceipt(private158later, rechecks, time(DAY * 18 + 62));
    const private160later = createRecheckDecisionWatchReceipt(private159later, watches, time(DAY * 18 + 63));
    const private161later = createHistoricalWatchAuditReceipt(private160later, laterAudits,
      time(DAY * 18 + 64));
    expect(comparePrivateAgingAuditReceipts(JSON.stringify(auditReceipt),
      JSON.stringify(private161later))).toMatchObject({ previous_audits: 1,
      current_audits: 2, new_audits: 1, comparison: { watch_index: 0, unresolved: true } });
    const private162 = createAuditReassignmentWatchReceipt(private161later, reassignment,
      time(DAY * 18 + 65));
    expect(parseAuditReassignmentWatchReceipt(JSON.stringify(private162)).reassignment_watches)
      .toEqual(reassignment);
    expect(parseAuditReassignmentWatchReceipt(JSON.stringify(private161later)).reassignment_watches)
      .toEqual([]);
    expect(() => parseAuditReassignmentWatchReceipt(JSON.stringify({ ...private162,
      reassignment_watches: [{ ...reassignment[0], latest_owner: "camera_operator" }] })))
      .toThrow(/immutable/);
    expect(() => parseAuditReassignmentWatchReceipt(JSON.stringify({ ...private162,
      closure: "APPROVED" }))).toThrow(/HOLD/);
    expect(() => comparePrivateAgingAuditReceipts(JSON.stringify(private161later),
      JSON.stringify(auditReceipt))).toThrow(/chronological/);
    expect(() => recordReassignmentWatch(laterAudits, f.history, f.checks, reassignment, environment,
      { audits: 1, watches: 0 }, { baseline_audit_index: 0, latest_audit_index: 1,
        category: "REQUEST_OWNER_REASSIGNMENT_WITNESS", personally_compared: true,
        hold_acknowledged: true }, time(DAY * 18 + 53))).toThrow(/Duplicate/);
    expect(() => recordReassignmentWatch(laterAudits, f.history, f.checks, [], environment,
      { audits: 2, watches: 0 }, { baseline_audit_index: 0, latest_audit_index: 1,
        category: "CONTINUE_INDEPENDENT_HOLD", personally_compared: true,
        hold_acknowledged: true }, time(DAY * 18 + 52))).toThrow(/non-imported/);

    // Build 163: append a later same-case owner trial and a second private watch, without erasing either.
    f.history = recordTrialObservation(f.history, environment, { case_id: "cameras", outcome: "issue",
      finding: "stale_evidence", next_owner: "camera_operator", witnessed: true }, time(DAY * 18 + 70));
    f.checks = recordSourceIdentityCheck(f.history, f.checks, environment, { case_id: "cameras",
      identity_state: "operator_mismatch", safe_alias: "asset_abc234", personally_witnessed: true },
    time(DAY * 18 + 71));
    const moreWatches = recordReassignmentWatch(laterAudits, f.history, f.checks,
      reassignment, environment, { audits: 1, watches: 1 },
      { baseline_audit_index: 0, latest_audit_index: 1,
        category: "CONTINUE_INDEPENDENT_HOLD", personally_compared: true,
        hold_acknowledged: true }, time(DAY * 18 + 72));
    const private157new = private157(f, reviews, DAY * 18 + 74);
    const private158new = createFollowupOutcomeReceipt(private157new, outcomes, time(DAY * 18 + 75));
    const private159new = createOutcomeRecurrenceReceipt(private158new, rechecks, time(DAY * 18 + 76));
    const private160new = createRecheckDecisionWatchReceipt(private159new, watches, time(DAY * 18 + 77));
    const private161new = createHistoricalWatchAuditReceipt(private160new, laterAudits, time(DAY * 18 + 78));
    const private162new = createAuditReassignmentWatchReceipt(private161new, moreWatches, time(DAY * 18 + 79));
    expect(comparePrivateReassignmentReceipts(JSON.stringify(private162),
      JSON.stringify(private162new))).toMatchObject({ previous_watches: 1,
      current_watches: 2, new_watches: 1, latest_unverified_case: "cameras" });
    expect(() => comparePrivateReassignmentReceipts(JSON.stringify(private162new),
      JSON.stringify(private162))).toThrow(/chronological/);
    expect(() => comparePrivateReassignmentReceipts(JSON.stringify(private162),
      JSON.stringify({ ...private162new, reassignment_watches: [
        { ...moreWatches[0], category: "CONTINUE_INDEPENDENT_HOLD" }, moreWatches[1] ] })))
      .toThrow(/Duplicate|matching|immutable|prefix/);
    const review = compareOwnerReviewEvidence(moreWatches, f.history, f.checks, 0, 7, 4,
      time(DAY * 18 + 80));
    expect(review).toMatchObject({ reassignment_watch_index: 0, observation_index: 7,
      owner_outcome: "issue", prior_owner_claim: "household_owner", unresolved: true });
    expect(review.signals).toContain("OWNER_NEXT_ACTION_CLAIM_CHANGED");
    const followups163 = recordOwnerReviewFollowup(moreWatches, f.history, f.checks,
      [], environment, { trials: 7, followups: 0 }, { reassignment_watch_index: 0,
        observation_index: 7, source_check_index: 4,
        category: "REQUEST_OWNER_REVIEW_REEVIDENCE", personally_witnessed: true,
        hold_acknowledged: true }, time(DAY * 18 + 80));
    const private163 = createOwnerReviewFollowupReceipt(private162new, followups163, time(DAY * 18 + 81));
    expect(parseOwnerReviewFollowupReceipt(JSON.stringify(private163)).owner_review_followups)
      .toEqual(followups163);
    expect(parseOwnerReviewFollowupReceipt(JSON.stringify(private162new)).owner_review_followups)
      .toEqual([]);
    expect(() => parseOwnerReviewFollowupReceipt(JSON.stringify({ ...private163,
      owner_review_followups: [{ ...followups163[0], watch_age_days: 99 }] })))
      .toThrow(/immutable/);
    expect(() => parseOwnerReviewFollowupReceipt(JSON.stringify({ ...private163,
      closure: "APPROVED" }))).toThrow(/HOLD/);
    expect(() => recordOwnerReviewFollowup(moreWatches, f.history, f.checks, [], environment,
      { trials: 8, followups: 0 }, { reassignment_watch_index: 0,
        observation_index: 7, source_check_index: 4,
        category: "CONTINUE_REASSIGNMENT_HOLD", personally_witnessed: true,
        hold_acknowledged: true }, time(DAY * 18 + 80))).toThrow(/non-imported/);
  });
});
