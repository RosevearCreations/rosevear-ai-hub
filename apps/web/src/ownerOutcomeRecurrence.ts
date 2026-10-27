/** Build 159: same-follow-up outcome recurrence and manual exception recheck oversight. */
import type { TrialEnvironment, TrialObservation } from "./ownerFieldTrial";
import type { SourceIdentityCheck } from "./ownerFieldRouting";
import type { HandoffFollowupEvent } from "./ownerHandoffReconciliation";
import { parseFollowupOutcomeReceipt, type FollowupOutcomeEvent,
  type FollowupOutcomeReceipt } from "./ownerFollowupOutcome";

export type RecurrenceSignal = "OWNER_OUTCOME_CHANGED" | "ISSUE_RECURRED_AFTER_IMPROVEMENT" |
  "SOURCE_CHECK_COVERAGE_CHANGED" | "SOURCE_IDENTITY_UNVERIFIED_CHANGE" |
  "ORIGINAL_SOURCE_EXCEPTION_CONTINUES" | "HISTORICAL_EXCEPTIONS_CONTINUE" |
  "INDEPENDENT_RECHECK_AGED";
export type RecheckReason = "REQUEST_INDEPENDENT_OUTCOME_RECHECK" |
  "REQUEST_RECURRENCE_WITNESS" | "REQUEST_SOURCE_IDENTITY_RECHECK";
export interface OutcomeRecurrenceComparison {
  baseline_outcome_index: number;
  latest_outcome_index: number;
  review_index: number;
  case_id: HandoffFollowupEvent["case_id"];
  baseline_at: string;
  latest_at: string;
  age_days: number;
  signals: RecurrenceSignal[];
  outstanding: true;
}
export interface OutcomeRecheckNote extends OutcomeRecurrenceComparison {
  recorded_at: string;
  recheck_reason: RecheckReason;
  personally_compared: true;
  hold_acknowledged: true;
  state: "PRIVATE_RECHECK_NOT_SENT";
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
}
export interface OutcomeRecurrenceReceipt {
  kind: "rosevear_independent_outcome_recurrence";
  schema_version: 1;
  exported_at: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
  automatic_dispatch: "DISABLED";
  scheduled_recheck: "DISABLED";
  evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS";
  outcome_receipt: FollowupOutcomeReceipt;
  recurrence_rechecks: OutcomeRecheckNote[];
}
export const MAX_RECURRENCE_BYTES = 1_850_000;
export const RECHECK_REASONS: readonly RecheckReason[] = ["REQUEST_INDEPENDENT_OUTCOME_RECHECK",
  "REQUEST_RECURRENCE_WITNESS", "REQUEST_SOURCE_IDENTITY_RECHECK"];
const DAY = 86_400_000;
const comparisonKeys = ["baseline_outcome_index", "latest_outcome_index", "review_index", "case_id",
  "baseline_at", "latest_at", "age_days", "signals", "outstanding"] as const;
const noteKeys = [...comparisonKeys, "recorded_at", "recheck_reason", "personally_compared",
  "hold_acknowledged", "state", "field_acceptance", "independent_review", "closure"];
function validTime(value: unknown): value is string {
  return typeof value === "string" && /^20\d\d-\d\d-\d\dT/.test(value) &&
    Number.isFinite(Date.parse(value)) && Date.parse(value) >= Date.parse("2020-01-01T00:00:00Z") &&
    Date.parse(value) <= Date.now() + 300_000;
}

/** Derived signals are private, non-authoritative comparisons, never accepted clearance. */
export function compareOutcomeRounds(outcomes: readonly FollowupOutcomeEvent[],
  followups: readonly HandoffFollowupEvent[], checks: readonly SourceIdentityCheck[],
  baselineIndex: number, latestIndex: number, at = new Date().toISOString()): OutcomeRecurrenceComparison {
  const baseline = outcomes[baselineIndex];
  const latest = outcomes[latestIndex];
  const followup = latest && followups[latest.review_index];
  if (!baseline || !latest || !followup || !Number.isInteger(baselineIndex) ||
    !Number.isInteger(latestIndex) || baselineIndex < 0 || latestIndex <= baselineIndex ||
    baseline.review_index !== latest.review_index || !validTime(at) ||
    Date.parse(baseline.recorded_at) >= Date.parse(latest.recorded_at) ||
    Date.parse(baseline.observation_at) >= Date.parse(latest.observation_at) ||
    Date.parse(at) < Date.parse(latest.recorded_at)) {
    throw new Error("Two chronological outcomes of the exact same private follow-up are required.");
  }
  const signals: RecurrenceSignal[] = [];
  if (baseline.outcome !== latest.outcome) signals.push("OWNER_OUTCOME_CHANGED");
  if (baseline.outcome === "OWNER_IMPROVEMENT_UNVERIFIED" && latest.outcome === "ISSUE_RECURRED") {
    signals.push("ISSUE_RECURRED_AFTER_IMPROVEMENT");
  }
  if ((baseline.source_check_index === null) !== (latest.source_check_index === null)) {
    signals.push("SOURCE_CHECK_COVERAGE_CHANGED");
  } else if (baseline.source_check_index !== null && latest.source_check_index !== null) {
    const first = checks[baseline.source_check_index];
    const second = checks[latest.source_check_index];
    if (!first || !second) throw new Error("Missing source identity check evidence.");
    if (first.identity_state !== second.identity_state || first.safe_alias !== second.safe_alias ||
      first.installed_version !== second.installed_version) signals.push("SOURCE_IDENTITY_UNVERIFIED_CHANGE");
  }
  if (followup.discrepancies.includes("SOURCE_ALIAS_STATE_CHANGED")) {
    signals.push("ORIGINAL_SOURCE_EXCEPTION_CONTINUES");
  }
  signals.push("HISTORICAL_EXCEPTIONS_CONTINUE");
  const age = Date.parse(at) - Date.parse(baseline.recorded_at);
  if (age >= DAY * 3) signals.push("INDEPENDENT_RECHECK_AGED");
  return { baseline_outcome_index: baselineIndex, latest_outcome_index: latestIndex,
    review_index: latest.review_index, case_id: followup.case_id,
    baseline_at: baseline.recorded_at, latest_at: latest.recorded_at,
    age_days: Math.floor(age / DAY), signals, outstanding: true };
}

export function validateOutcomeRechecks(notes: readonly OutcomeRecheckNote[], outcomes: readonly FollowupOutcomeEvent[],
  followups: readonly HandoffFollowupEvent[], checks: readonly SourceIdentityCheck[], exportedAt?: string): void {
  if (notes.length > 100) throw new Error("Build 159 allows at most 100 private rechecks.");
  let previous = 0;
  const seen = new Set<string>();
  for (const note of notes) {
    if (!note || Object.keys(note).length !== noteKeys.length ||
      Object.keys(note).some(key => !noteKeys.includes(key)) || !validTime(note.recorded_at) ||
      !RECHECK_REASONS.includes(note.recheck_reason) || note.personally_compared !== true ||
      note.hold_acknowledged !== true || note.state !== "PRIVATE_RECHECK_NOT_SENT" ||
      note.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
      note.independent_review !== "INDEPENDENT_REVIEW_HOLD" || note.closure !== "NOT_AUTHORIZED") {
      throw new Error("Invalid Build 159 immutable HOLD recheck fields.");
    }
    const at = Date.parse(note.recorded_at);
    if (at < previous || exportedAt && at > Date.parse(exportedAt)) {
      throw new Error("Build 159 recheck chronology is invalid.");
    }
    const expected = compareOutcomeRounds(outcomes, followups, checks,
      note.baseline_outcome_index, note.latest_outcome_index, note.recorded_at);
    if (comparisonKeys.some(key => JSON.stringify(note[key]) !== JSON.stringify(expected[key]))) {
      throw new Error("Build 159 recheck changed the original outcome, signals or age.");
    }
    if (note.recheck_reason === "REQUEST_RECURRENCE_WITNESS" &&
      !expected.signals.includes("ISSUE_RECURRED_AFTER_IMPROVEMENT") ||
      note.recheck_reason === "REQUEST_SOURCE_IDENTITY_RECHECK" &&
      !expected.signals.some(signal => signal === "SOURCE_IDENTITY_UNVERIFIED_CHANGE" ||
        signal === "SOURCE_CHECK_COVERAGE_CHANGED" || signal === "ORIGINAL_SOURCE_EXCEPTION_CONTINUES")) {
      throw new Error("Private recheck reason must match the exact historical signal.");
    }
    const fingerprint = `${note.baseline_outcome_index}:${note.latest_outcome_index}:${note.recheck_reason}`;
    if (seen.has(fingerprint)) throw new Error("Duplicate Build 159 recheck for the same outcome pair and reason.");
    seen.add(fingerprint);
    previous = at;
  }
}

export function recordOutcomeRecheck(outcomes: readonly FollowupOutcomeEvent[],
  followups: readonly HandoffFollowupEvent[], checks: readonly SourceIdentityCheck[],
  previous: readonly OutcomeRecheckNote[], environment: TrialEnvironment,
  imported: { outcomes: number; rechecks: number },
  input: { baseline_outcome_index: number; latest_outcome_index: number; reason: RecheckReason;
    personally_compared: boolean; hold_acknowledged: boolean },
  now = new Date().toISOString()): OutcomeRecheckNote[] {
  if (!environment.installed_windows_witnessed || !environment.installed_version ||
    environment.access === "unknown" || !input.personally_compared || !input.hold_acknowledged ||
    input.latest_outcome_index < imported.outcomes || previous.length < imported.rechecks ||
    !RECHECK_REASONS.includes(input.reason)) {
    throw new Error("Fresh Windows witnessing and a non-imported latest outcome are required for recheck.");
  }
  const comparison = compareOutcomeRounds(outcomes, followups, checks,
    input.baseline_outcome_index, input.latest_outcome_index, now);
  const notes = [...previous, { ...comparison, recorded_at: now, recheck_reason: input.reason,
    personally_compared: true as const, hold_acknowledged: true as const,
    state: "PRIVATE_RECHECK_NOT_SENT" as const, field_acceptance: "FIELD_ACCEPTANCE_HOLD" as const,
    independent_review: "INDEPENDENT_REVIEW_HOLD" as const, closure: "NOT_AUTHORIZED" as const }];
  validateOutcomeRechecks(notes, outcomes, followups, checks);
  return notes;
}

export function createOutcomeRecurrenceReceipt(prior: FollowupOutcomeReceipt,
  rechecks: readonly OutcomeRecheckNote[], now = new Date().toISOString()): OutcomeRecurrenceReceipt {
  if (!validTime(now) || Date.parse(now) < Date.parse(prior.exported_at)) {
    throw new Error("Invalid Build 159 export time.");
  }
  const nested = parseFollowupOutcomeReceipt(JSON.stringify(prior));
  validateOutcomeRechecks(rechecks, nested.outcome_reviews, nested.followup_reviews, nested.checks, now);
  const receipt: OutcomeRecurrenceReceipt = { kind: "rosevear_independent_outcome_recurrence",
    schema_version: 1, exported_at: now, field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED",
    automatic_dispatch: "DISABLED", scheduled_recheck: "DISABLED",
    evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS", outcome_receipt: prior,
    recurrence_rechecks: rechecks.map(item => ({ ...item, signals: [...item.signals] })) };
  if (JSON.stringify(receipt).length > MAX_RECURRENCE_BYTES) throw new Error("Build 159 receipt exceeds 1.85 MB.");
  return receipt;
}

/** Older Build 148–158 receipts are accepted as historical-only, never fresh recheck authority. */
export function parseOutcomeRecurrenceReceipt(raw: string): ReturnType<typeof parseFollowupOutcomeReceipt> &
  { recurrence_rechecks: OutcomeRecheckNote[] } {
  if (raw.length > MAX_RECURRENCE_BYTES) throw new Error("Build 159 receipt exceeds 1.85 MB.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Invalid Build 159 private JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid private receipt envelope.");
  const receipt = value as Record<string, unknown>;
  if (receipt.kind !== "rosevear_independent_outcome_recurrence") {
    return { ...parseFollowupOutcomeReceipt(raw), recurrence_rechecks: [] };
  }
  const keys = ["kind", "schema_version", "exported_at", "field_acceptance", "independent_review",
    "closure", "automatic_dispatch", "scheduled_recheck", "evidence_authenticity", "outcome_receipt", "recurrence_rechecks"];
  if (Object.keys(receipt).length !== keys.length || Object.keys(receipt).some(key => !keys.includes(key)) ||
    receipt.schema_version !== 1 || !validTime(receipt.exported_at) ||
    receipt.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" || receipt.independent_review !== "INDEPENDENT_REVIEW_HOLD" ||
    receipt.closure !== "NOT_AUTHORIZED" || receipt.automatic_dispatch !== "DISABLED" ||
    receipt.scheduled_recheck !== "DISABLED" || receipt.evidence_authenticity !== "UNVERIFIED_PRIVATE_ATTESTATIONS" ||
    !receipt.outcome_receipt || !Array.isArray(receipt.recurrence_rechecks)) {
    throw new Error("Unsafe Build 159 HOLD receipt.");
  }
  const nested = receipt.outcome_receipt as FollowupOutcomeReceipt;
  if (Date.parse(nested.exported_at) > Date.parse(receipt.exported_at as string)) {
    throw new Error("Build 159 nested export is newer than its parent.");
  }
  const prior = parseFollowupOutcomeReceipt(JSON.stringify(nested));
  const rechecks = receipt.recurrence_rechecks as OutcomeRecheckNote[];
  validateOutcomeRechecks(rechecks, prior.outcome_reviews, prior.followup_reviews, prior.checks,
    receipt.exported_at as string);
  return { ...prior, recurrence_rechecks: rechecks.map(item => ({ ...item, signals: [...item.signals] })) };
}
