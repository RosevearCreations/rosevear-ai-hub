/** Build 160: private recheck receipt comparison and non-authoritative exception decision watch. */
import type { TrialEnvironment } from "./ownerFieldTrial";
import { parseOutcomeRecurrenceReceipt, type OutcomeRecheckNote,
  type OutcomeRecurrenceReceipt } from "./ownerOutcomeRecurrence";

export type ExceptionWatchSignal = "RECHECK_REASON_CHANGED" | "RECURRENCE_EVIDENCE_CHANGED" |
  "SOURCE_EXCEPTION_PERSISTS" | "OUTCOME_ROUND_ADVANCED" | "RECHECK_WATCH_AGED" |
  "HISTORICAL_EXCEPTIONS_UNRESOLVED";
export type ExceptionWatchCategory = "CONTINUE_INDEPENDENT_REVIEW_HOLD" |
  "REQUEST_NEW_OWNER_WITNESS" | "REQUEST_SOURCE_IDENTITY_WITNESS";
export interface RecheckRoundComparison {
  baseline_recheck_index: number;
  latest_recheck_index: number;
  review_index: number;
  case_id: OutcomeRecheckNote["case_id"];
  baseline_at: string;
  latest_at: string;
  first_recheck_age_days: number;
  signals: ExceptionWatchSignal[];
  unresolved: true;
}
export interface ExceptionWatchNote extends RecheckRoundComparison {
  recorded_at: string;
  category: ExceptionWatchCategory;
  personally_compared: true;
  hold_acknowledged: true;
  state: "PRIVATE_EXCEPTION_WATCH_NOT_SENT";
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
}
export interface RecheckDecisionWatchReceipt {
  kind: "rosevear_independent_recheck_decision_watch";
  schema_version: 1;
  exported_at: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
  automatic_dispatch: "DISABLED";
  scheduled_watch: "DISABLED";
  evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS";
  recurrence_receipt: OutcomeRecurrenceReceipt;
  exception_watches: ExceptionWatchNote[];
}

export const MAX_WATCH_BYTES = 2_100_000;
export const WATCH_CATEGORIES: readonly ExceptionWatchCategory[] = ["CONTINUE_INDEPENDENT_REVIEW_HOLD",
  "REQUEST_NEW_OWNER_WITNESS", "REQUEST_SOURCE_IDENTITY_WITNESS"];
const DAY = 86_400_000;
const comparisonKeys = ["baseline_recheck_index", "latest_recheck_index", "review_index", "case_id",
  "baseline_at", "latest_at", "first_recheck_age_days", "signals", "unresolved"] as const;
const noteKeys = [...comparisonKeys, "recorded_at", "category", "personally_compared",
  "hold_acknowledged", "state", "field_acceptance", "independent_review", "closure"];
function validTime(value: unknown): value is string {
  return typeof value === "string" && /^20\d\d-\d\d-\d\dT/.test(value) &&
    Number.isFinite(Date.parse(value)) && Date.parse(value) >= Date.parse("2020-01-01T00:00:00Z") &&
    Date.parse(value) <= Date.now() + 300_000;
}

/** Comparison is recalculated for display; no newer evidence grants reviewer authority. */
export function compareRecheckRounds(rechecks: readonly OutcomeRecheckNote[], baselineIndex: number,
  latestIndex: number, at = new Date().toISOString()): RecheckRoundComparison {
  const baseline = rechecks[baselineIndex];
  const latest = rechecks[latestIndex];
  if (!baseline || !latest || !Number.isInteger(baselineIndex) || !Number.isInteger(latestIndex) ||
    baselineIndex < 0 || latestIndex <= baselineIndex ||
    baseline.review_index !== latest.review_index || baseline.case_id !== latest.case_id ||
    Date.parse(baseline.recorded_at) >= Date.parse(latest.recorded_at) ||
    baseline.latest_outcome_index >= latest.latest_outcome_index || !validTime(at) ||
    Date.parse(at) < Date.parse(latest.recorded_at)) {
    throw new Error("Two chronological private rechecks of the same follow-up with a newer outcome round are required.");
  }
  const signals: ExceptionWatchSignal[] = [];
  if (baseline.recheck_reason !== latest.recheck_reason) signals.push("RECHECK_REASON_CHANGED");
  if (JSON.stringify(baseline.signals) !== JSON.stringify(latest.signals)) signals.push("RECURRENCE_EVIDENCE_CHANGED");
  if ([...baseline.signals, ...latest.signals].some(signal => signal.includes("SOURCE"))) {
    signals.push("SOURCE_EXCEPTION_PERSISTS");
  }
  signals.push("OUTCOME_ROUND_ADVANCED");
  if (Date.parse(at) - Date.parse(baseline.recorded_at) >= DAY * 3) signals.push("RECHECK_WATCH_AGED");
  signals.push("HISTORICAL_EXCEPTIONS_UNRESOLVED");
  return { baseline_recheck_index: baselineIndex, latest_recheck_index: latestIndex,
    review_index: baseline.review_index, case_id: baseline.case_id,
    baseline_at: baseline.recorded_at, latest_at: latest.recorded_at,
    first_recheck_age_days: Math.floor((Date.parse(at) - Date.parse(baseline.recorded_at)) / DAY),
    signals, unresolved: true };
}

/** Compare complete private Build 159 exports without importing either file or trusting identity claims. */
export function comparePrivateRecheckReceipts(previousRaw: string, currentRaw: string): {
  previous_rechecks: number; current_rechecks: number; new_rechecks: number;
  comparison: RecheckRoundComparison | null;
} {
  const older = parseOutcomeRecurrenceReceipt(previousRaw);
  const newer = parseOutcomeRecurrenceReceipt(currentRaw);
  const previousEnvelope = JSON.parse(previousRaw) as OutcomeRecurrenceReceipt;
  const currentEnvelope = JSON.parse(currentRaw) as OutcomeRecurrenceReceipt;
  if (previousEnvelope.kind !== "rosevear_independent_outcome_recurrence" ||
    currentEnvelope.kind !== "rosevear_independent_outcome_recurrence" ||
    Date.parse(previousEnvelope.exported_at) >= Date.parse(currentEnvelope.exported_at)) {
    throw new Error("Two chronological private Build 159 receipts are required, not older import formats.");
  }
  const prefix = (previous: readonly unknown[], current: readonly unknown[]) =>
    previous.length <= current.length && previous.every((item, index) =>
      JSON.stringify(item) === JSON.stringify(current[index]));
  const streams = ["handoffs", "events", "checks", "links", "reassessments", "followups",
    "decisions", "resolutions", "overdue_handoffs", "followup_reviews", "outcome_reviews",
    "recurrence_rechecks"] as const;
  if (!prefix(older.trial.observations, newer.trial.observations) ||
    !prefix(older.trial.source_readings, newer.trial.source_readings) ||
    streams.some(key => !prefix(older[key], newer[key])) ||
    older.trial.environment.installed_version !== newer.trial.environment.installed_version ||
    older.trial.environment.access !== newer.trial.environment.access ||
    older.recurrence_rechecks.length === 0 ||
    older.recurrence_rechecks.length >= newer.recurrence_rechecks.length) {
    throw new Error("Older Build 159 evidence must be an exact nonempty prefix with newer rechecks; neither private file is authenticated.");
  }
  let comparison: RecheckRoundComparison | null = null;
  for (let index = older.recurrence_rechecks.length; index < newer.recurrence_rechecks.length; index++) {
    for (let previous = older.recurrence_rechecks.length - 1; previous >= 0; previous--) {
      if (newer.recurrence_rechecks[index].review_index === newer.recurrence_rechecks[previous].review_index &&
        newer.recurrence_rechecks[index].latest_outcome_index >
          newer.recurrence_rechecks[previous].latest_outcome_index) {
        comparison = compareRecheckRounds(newer.recurrence_rechecks, previous, index,
          newer.recurrence_rechecks[index].recorded_at);
        break;
      }
    }
    if (comparison) break;
  }
  return { previous_rechecks: older.recurrence_rechecks.length,
    current_rechecks: newer.recurrence_rechecks.length,
    new_rechecks: newer.recurrence_rechecks.length - older.recurrence_rechecks.length, comparison };
}

export function validateExceptionWatches(notes: readonly ExceptionWatchNote[], rechecks: readonly OutcomeRecheckNote[],
  exportedAt?: string): void {
  if (notes.length > 100) throw new Error("Build 160 permits at most 100 private watch decisions.");
  const seen = new Set<string>();
  let previous = 0;
  for (const note of notes) {
    if (!note || Object.keys(note).length !== noteKeys.length ||
      Object.keys(note).some(key => !noteKeys.includes(key)) || !validTime(note.recorded_at) ||
      !WATCH_CATEGORIES.includes(note.category) || note.personally_compared !== true ||
      note.hold_acknowledged !== true || note.state !== "PRIVATE_EXCEPTION_WATCH_NOT_SENT" ||
      note.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
      note.independent_review !== "INDEPENDENT_REVIEW_HOLD" || note.closure !== "NOT_AUTHORIZED") {
      throw new Error("Unsafe Build 160 immutable private HOLD decision fields.");
    }
    const at = Date.parse(note.recorded_at);
    if (at < previous || exportedAt && at > Date.parse(exportedAt)) {
      throw new Error("Build 160 watch note chronology is invalid.");
    }
    const expected = compareRecheckRounds(rechecks, note.baseline_recheck_index,
      note.latest_recheck_index, note.recorded_at);
    if (comparisonKeys.some(key => JSON.stringify(note[key]) !== JSON.stringify(expected[key]))) {
      throw new Error("Build 160 note changed immutable recheck indices, exception signals or age.");
    }
    if (note.category === "REQUEST_NEW_OWNER_WITNESS" &&
      !expected.signals.includes("RECURRENCE_EVIDENCE_CHANGED") ||
      note.category === "REQUEST_SOURCE_IDENTITY_WITNESS" &&
      !expected.signals.includes("SOURCE_EXCEPTION_PERSISTS")) {
      throw new Error("Build 160 watch category must match an exact outstanding exception.");
    }
    const key = `${note.baseline_recheck_index}:${note.latest_recheck_index}:${note.category}`;
    if (seen.has(key)) throw new Error("Duplicate Build 160 private watch note.");
    seen.add(key);
    previous = at;
  }
}

export function recordExceptionWatch(rechecks: readonly OutcomeRecheckNote[],
  previous: readonly ExceptionWatchNote[], environment: TrialEnvironment,
  imported: { rechecks: number; watches: number },
  input: { baseline_recheck_index: number; latest_recheck_index: number;
    category: ExceptionWatchCategory; personally_compared: boolean; hold_acknowledged: boolean },
  now = new Date().toISOString()): ExceptionWatchNote[] {
  if (!environment.installed_windows_witnessed || !environment.installed_version ||
    environment.access === "unknown" || !input.personally_compared || !input.hold_acknowledged ||
    input.latest_recheck_index < imported.rechecks || previous.length < imported.watches ||
    !WATCH_CATEGORIES.includes(input.category)) {
    throw new Error("Fresh Windows witnessing, a non-imported latest recheck and two HOLD confirmations are required.");
  }
  const comparison = compareRecheckRounds(rechecks, input.baseline_recheck_index,
    input.latest_recheck_index, now);
  const notes = [...previous, { ...comparison, recorded_at: now, category: input.category,
    personally_compared: true as const, hold_acknowledged: true as const,
    state: "PRIVATE_EXCEPTION_WATCH_NOT_SENT" as const, field_acceptance: "FIELD_ACCEPTANCE_HOLD" as const,
    independent_review: "INDEPENDENT_REVIEW_HOLD" as const, closure: "NOT_AUTHORIZED" as const }];
  validateExceptionWatches(notes, rechecks);
  return notes;
}

export function createRecheckDecisionWatchReceipt(prior: OutcomeRecurrenceReceipt,
  watches: readonly ExceptionWatchNote[], now = new Date().toISOString()): RecheckDecisionWatchReceipt {
  if (!validTime(now) || Date.parse(now) < Date.parse(prior.exported_at)) {
    throw new Error("Invalid Build 160 export time.");
  }
  const nested = parseOutcomeRecurrenceReceipt(JSON.stringify(prior));
  validateExceptionWatches(watches, nested.recurrence_rechecks, now);
  const receipt: RecheckDecisionWatchReceipt = { kind: "rosevear_independent_recheck_decision_watch",
    schema_version: 1, exported_at: now, field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED",
    automatic_dispatch: "DISABLED", scheduled_watch: "DISABLED",
    evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS", recurrence_receipt: prior,
    exception_watches: watches.map(item => ({ ...item, signals: [...item.signals] })) };
  if (JSON.stringify(receipt).length > MAX_WATCH_BYTES) throw new Error("Build 160 receipt exceeds 2.1 MB.");
  return receipt;
}

/** Earlier Build 148–159 imports remain historical-only and never authorize an independent decision. */
export function parseRecheckDecisionWatchReceipt(raw: string): ReturnType<typeof parseOutcomeRecurrenceReceipt> &
  { exception_watches: ExceptionWatchNote[] } {
  if (raw.length > MAX_WATCH_BYTES) throw new Error("Build 160 receipt exceeds 2.1 MB.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Invalid private Build 160 JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid private receipt envelope.");
  const receipt = value as Record<string, unknown>;
  if (receipt.kind !== "rosevear_independent_recheck_decision_watch") {
    return { ...parseOutcomeRecurrenceReceipt(raw), exception_watches: [] };
  }
  const keys = ["kind", "schema_version", "exported_at", "field_acceptance", "independent_review",
    "closure", "automatic_dispatch", "scheduled_watch", "evidence_authenticity", "recurrence_receipt", "exception_watches"];
  if (Object.keys(receipt).length !== keys.length || Object.keys(receipt).some(key => !keys.includes(key)) ||
    receipt.schema_version !== 1 || !validTime(receipt.exported_at) ||
    receipt.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" || receipt.independent_review !== "INDEPENDENT_REVIEW_HOLD" ||
    receipt.closure !== "NOT_AUTHORIZED" || receipt.automatic_dispatch !== "DISABLED" ||
    receipt.scheduled_watch !== "DISABLED" || receipt.evidence_authenticity !== "UNVERIFIED_PRIVATE_ATTESTATIONS" ||
    !receipt.recurrence_receipt || !Array.isArray(receipt.exception_watches)) {
    throw new Error("Unsafe Build 160 private HOLD receipt.");
  }
  const nested = receipt.recurrence_receipt as OutcomeRecurrenceReceipt;
  if (Date.parse(nested.exported_at) > Date.parse(receipt.exported_at as string)) {
    throw new Error("Build 160 nested export chronology is invalid.");
  }
  const prior = parseOutcomeRecurrenceReceipt(JSON.stringify(nested));
  const watches = receipt.exception_watches as ExceptionWatchNote[];
  validateExceptionWatches(watches, prior.recurrence_rechecks, receipt.exported_at as string);
  return { ...prior, exception_watches: watches.map(item => ({ ...item, signals: [...item.signals] })) };
}
