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

const environment: TrialEnvironment = { installed_version: "0.0.7-build157", access: "local_console",
  installed_windows_witnessed: true };
const unknown: TrialEnvironment = { installed_version: "", access: "unknown", installed_windows_witnessed: false };
const time = (minute: number) => new Date(Date.parse("2026-10-12T08:00:00Z") + minute * 60_000).toISOString();
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
