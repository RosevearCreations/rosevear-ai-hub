/** Build 168: manual aging audit of private continuity outcomes, no real-world acceptance. */
import { validateInstalledVersion, type TrialEnvironment, type TrialObservation } from "./ownerFieldTrial";
import type { SourceIdentityCheck } from "./ownerFieldRouting";
import type { OwnerReviewFollowup } from "./ownerReassignmentReviewFollowup";
import type { ReviewRecurrenceNote } from "./ownerReviewRecurrence";
import type { DispositionFollowup } from "./ownerRecurrenceDisposition";
import type { ContinuityWatchNote } from "./ownerDispositionContinuity";
import { parseOutcomeReceipt, validateOutcomeNotes,
  type OutcomeNote, type OutcomeReceipt } from "./ownerContinuityOutcome";

export type AgingSignal = "OWNER_OUTCOME_CHANGED_AGAIN" | "OWNER_CLAIM_CONFLICT_PERSISTS" |
  "REPEATED_OWNER_EXCEPTION" | "NEW_OWNER_TRIAL_NOT_WITNESSED" |
  "SOURCE_RECHECK_NOT_RENEWED" | "SOURCE_ALIAS_OR_IDENTITY_CHANGED" |
  "SOURCE_IDENTITY_UNVERIFIED" | "SOURCE_EVIDENCE_AGED" |
  "SOURCE_EVIDENCE_OVERDUE" | "EARLIER_OUTCOME_AGED" |
  "EARLIER_OUTCOME_OVERDUE" | "ORIGINAL_INDEPENDENT_HOLD_PERSISTS";
export type AgingCategory = "CONTINUE_INDEPENDENT_HOLD" |
  "REQUEST_OWNER_EXCEPTION_RECHECK" | "REQUEST_SOURCE_FRESHNESS_RECHECK" |
  "REQUEST_OVERDUE_REVIEW";
export interface AgingComparison {
  baseline_outcome_index: number;
  latest_outcome_index: number;
  reassignment_watch_index: number;
  case_id: OutcomeNote["case_id"];
  baseline_at: string;
  latest_at: string;
  baseline_continuity_index: number;
  latest_continuity_index: number;
  baseline_owner_outcome: TrialObservation["outcome"];
  latest_owner_outcome: TrialObservation["outcome"];
  baseline_owner_claim: TrialObservation["next_owner"];
  latest_owner_claim: TrialObservation["next_owner"];
  latest_observation_index: number;
  baseline_source_check_index: number | null;
  latest_source_check_index: number | null;
  new_owner_trial_since_outcome: boolean;
  source_renewed_since_outcome: boolean;
  latest_source_confirmed_alias_claim: boolean;
  source_age_days: number | null;
  outcome_age_days: number;
  age_band: "UNDER_THREE_DAYS" | "THREE_TO_SEVEN_DAYS" | "OVER_SEVEN_DAYS";
  signals: AgingSignal[];
  unresolved: true;
}
export interface AgingAuditNote extends AgingComparison {
  recorded_at: string;
  category: AgingCategory;
  personally_rechecked: true;
  hold_acknowledged: true;
  state: "PRIVATE_OUTCOME_AGING_AUDIT_NOT_SENT";
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
}
export interface AgingAuditReceipt {
  kind: "rosevear_independent_continuity_outcome_aging_audit";
  schema_version: 1;
  exported_at: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
  automatic_dispatch: "DISABLED";
  automatic_reassignment: "DISABLED";
  evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS";
  outcome_receipt: OutcomeReceipt;
  aging_audits: AgingAuditNote[];
}
export const MAX_AGING_AUDIT_BYTES = 5_050_000;
export const AGING_CATEGORIES: readonly AgingCategory[] = [
  "CONTINUE_INDEPENDENT_HOLD", "REQUEST_OWNER_EXCEPTION_RECHECK",
  "REQUEST_SOURCE_FRESHNESS_RECHECK", "REQUEST_OVERDUE_REVIEW",
];
const DAY = 86_400_000;
const comparisonKeys = ["baseline_outcome_index", "latest_outcome_index",
  "reassignment_watch_index", "case_id", "baseline_at", "latest_at",
  "baseline_continuity_index", "latest_continuity_index", "baseline_owner_outcome",
  "latest_owner_outcome", "baseline_owner_claim", "latest_owner_claim",
  "latest_observation_index", "baseline_source_check_index", "latest_source_check_index",
  "new_owner_trial_since_outcome", "source_renewed_since_outcome",
  "latest_source_confirmed_alias_claim", "source_age_days", "outcome_age_days",
  "age_band", "signals", "unresolved"] as const;
const noteKeys = [...comparisonKeys, "recorded_at", "category", "personally_rechecked",
  "hold_acknowledged", "state", "field_acceptance", "independent_review", "closure"];
function validTime(value: unknown): value is string {
  return typeof value === "string" && /^20\d\d-\d\d-\d\dT/.test(value) &&
    Number.isFinite(Date.parse(value)) && Date.parse(value) >= Date.parse("2020-01-01T00:00:00Z") &&
    Date.parse(value) <= Date.now() + 300_000;
}

/** Source evidence is linked only through the two complete Build 167 notes. */
export function compareOutcomeAging(outcomes: readonly OutcomeNote[],
  watches: readonly ContinuityWatchNote[], dispositions: readonly DispositionFollowup[],
  recurrences: readonly ReviewRecurrenceNote[], followups: readonly OwnerReviewFollowup[],
  history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[],
  baselineIndex: number, latestIndex: number, at = new Date().toISOString()): AgingComparison {
  const before = outcomes[baselineIndex];
  const after = outcomes[latestIndex];
  if (!Number.isInteger(baselineIndex) || !Number.isInteger(latestIndex) ||
    baselineIndex < 0 || latestIndex <= baselineIndex || !before || !after ||
    before.reassignment_watch_index !== after.reassignment_watch_index ||
    before.case_id !== after.case_id ||
    before.latest_continuity_index >= after.latest_continuity_index ||
    Date.parse(before.recorded_at) >= Date.parse(after.recorded_at) ||
    !validTime(at) || Date.parse(at) < Date.parse(after.recorded_at)) {
    throw new Error("Two chronological Build 167 outcomes of the exact same held case with newer continuity evidence are required.");
  }
  validateOutcomeNotes([before, after], watches, dispositions, recurrences, followups,
    history, checks);
  const oldSource = before.latest_source_check_index === null ? null :
    checks[before.latest_source_check_index];
  const source = after.latest_source_check_index === null ? null :
    checks[after.latest_source_check_index];
  const ownerObservation = history[after.latest_observation_index];
  const trialRenewed = !!ownerObservation && ownerObservation.case_id === after.case_id &&
    ownerObservation.witnessed_by_operator &&
    Date.parse(ownerObservation.observed_at) > Date.parse(before.recorded_at) &&
    before.latest_observation_index !== after.latest_observation_index;
  const sourceRenewed = !!source && Date.parse(source.captured_at) > Date.parse(before.recorded_at) &&
    before.latest_source_check_index !== after.latest_source_check_index &&
    (!oldSource || Date.parse(source.captured_at) > Date.parse(oldSource.captured_at));
  const sourceConfirmed = !!source && source.identity_state === "confirmed_alias";
  const sourceAge = source ? Math.floor((Date.parse(at) - Date.parse(source.captured_at)) / DAY) : null;
  const outcomeAge = Math.floor((Date.parse(at) - Date.parse(before.recorded_at)) / DAY);
  const signals: AgingSignal[] = [];
  if (before.latest_outcome !== after.latest_outcome) {
    signals.push("OWNER_OUTCOME_CHANGED_AGAIN");
  }
  if (before.latest_owner_claim !== after.latest_owner_claim) {
    signals.push("OWNER_CLAIM_CONFLICT_PERSISTS");
  }
  if (before.category !== "CONTINUE_INDEPENDENT_HOLD" &&
    after.category !== "CONTINUE_INDEPENDENT_HOLD") signals.push("REPEATED_OWNER_EXCEPTION");
  if (!trialRenewed) signals.push("NEW_OWNER_TRIAL_NOT_WITNESSED");
  if (!sourceRenewed) signals.push("SOURCE_RECHECK_NOT_RENEWED");
  if (oldSource && source && (oldSource.safe_alias !== source.safe_alias ||
    oldSource.identity_state !== source.identity_state ||
    oldSource.installed_version !== source.installed_version ||
    oldSource.access !== source.access)) signals.push("SOURCE_ALIAS_OR_IDENTITY_CHANGED");
  if (!sourceConfirmed) signals.push("SOURCE_IDENTITY_UNVERIFIED");
  if (sourceAge !== null && sourceAge >= 3) signals.push("SOURCE_EVIDENCE_AGED");
  if (sourceAge === null || sourceAge > 7) signals.push("SOURCE_EVIDENCE_OVERDUE");
  if (outcomeAge >= 3) signals.push("EARLIER_OUTCOME_AGED");
  if (outcomeAge > 7) signals.push("EARLIER_OUTCOME_OVERDUE");
  signals.push("ORIGINAL_INDEPENDENT_HOLD_PERSISTS");
  return { baseline_outcome_index: baselineIndex, latest_outcome_index: latestIndex,
    reassignment_watch_index: before.reassignment_watch_index, case_id: before.case_id,
    baseline_at: before.recorded_at, latest_at: after.recorded_at,
    baseline_continuity_index: before.latest_continuity_index,
    latest_continuity_index: after.latest_continuity_index,
    baseline_owner_outcome: before.latest_outcome, latest_owner_outcome: after.latest_outcome,
    baseline_owner_claim: before.latest_owner_claim, latest_owner_claim: after.latest_owner_claim,
    latest_observation_index: after.latest_observation_index,
    baseline_source_check_index: before.latest_source_check_index,
    latest_source_check_index: after.latest_source_check_index,
    new_owner_trial_since_outcome: trialRenewed, source_renewed_since_outcome: sourceRenewed,
    latest_source_confirmed_alias_claim: sourceConfirmed, source_age_days: sourceAge,
    outcome_age_days: outcomeAge, age_band: outcomeAge > 7 ? "OVER_SEVEN_DAYS" :
      outcomeAge >= 3 ? "THREE_TO_SEVEN_DAYS" : "UNDER_THREE_DAYS",
    signals, unresolved: true };
}

export function validateAgingAudits(notes: readonly AgingAuditNote[], outcomes: readonly OutcomeNote[],
  watches: readonly ContinuityWatchNote[], dispositions: readonly DispositionFollowup[],
  recurrences: readonly ReviewRecurrenceNote[], followups: readonly OwnerReviewFollowup[],
  history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[],
  exportedAt?: string): void {
  if (notes.length > 100) throw new Error("Build 168 supports at most 100 private aging audits.");
  let previous = 0;
  const seen = new Set<string>();
  for (const note of notes) {
    if (!note || Object.keys(note).length !== noteKeys.length ||
      Object.keys(note).some(key => !noteKeys.includes(key)) || !validTime(note.recorded_at) ||
      !AGING_CATEGORIES.includes(note.category) || note.personally_rechecked !== true ||
      note.hold_acknowledged !== true || note.state !== "PRIVATE_OUTCOME_AGING_AUDIT_NOT_SENT" ||
      note.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
      note.independent_review !== "INDEPENDENT_REVIEW_HOLD" || note.closure !== "NOT_AUTHORIZED") {
      throw new Error("Unsafe Build 168 immutable independent HOLD fields.");
    }
    const when = Date.parse(note.recorded_at);
    if (when < previous || exportedAt && when > Date.parse(exportedAt)) {
      throw new Error("Build 168 audit chronology is invalid.");
    }
    const expected = compareOutcomeAging(outcomes, watches, dispositions, recurrences,
      followups, history, checks, note.baseline_outcome_index,
      note.latest_outcome_index, note.recorded_at);
    if (comparisonKeys.some(key => JSON.stringify(note[key]) !== JSON.stringify(expected[key]))) {
      throw new Error("Build 168 altered immutable outcome, source or age evidence.");
    }
    if (note.category === "REQUEST_OWNER_EXCEPTION_RECHECK" &&
      !expected.signals.some(signal => ["OWNER_OUTCOME_CHANGED_AGAIN",
        "OWNER_CLAIM_CONFLICT_PERSISTS", "REPEATED_OWNER_EXCEPTION"].includes(signal)) ||
      note.category === "REQUEST_SOURCE_FRESHNESS_RECHECK" &&
      !expected.signals.some(signal => signal.startsWith("SOURCE_")) ||
      note.category === "REQUEST_OVERDUE_REVIEW" &&
      !expected.signals.includes("EARLIER_OUTCOME_OVERDUE")) {
      throw new Error("Build 168 category requires matching unresolved audit signals.");
    }
    const key = `${note.baseline_outcome_index}:${note.latest_outcome_index}:${note.category}`;
    if (seen.has(key)) throw new Error("Duplicate Build 168 private aging audit.");
    seen.add(key); previous = when;
  }
}

export function recordAgingAudit(outcomes: readonly OutcomeNote[],
  watches: readonly ContinuityWatchNote[], dispositions: readonly DispositionFollowup[],
  recurrences: readonly ReviewRecurrenceNote[], followups: readonly OwnerReviewFollowup[],
  history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[],
  existing: readonly AgingAuditNote[], environment: TrialEnvironment,
  imported: { outcomes: number; audits: number },
  input: { baseline_outcome_index: number; latest_outcome_index: number;
    category: AgingCategory; personally_rechecked: boolean; hold_acknowledged: boolean },
  at = new Date().toISOString()): AgingAuditNote[] {
  if (!environment.installed_windows_witnessed || !validateInstalledVersion(environment.installed_version) ||
    environment.access === "unknown" || input.latest_outcome_index < imported.outcomes ||
    existing.length < imported.audits || !input.personally_rechecked ||
    !input.hold_acknowledged || !AGING_CATEGORIES.includes(input.category)) {
    throw new Error("Fresh non-imported outcome, installed Windows witness and two HOLD confirmations required.");
  }
  const comparison = compareOutcomeAging(outcomes, watches, dispositions, recurrences,
    followups, history, checks, input.baseline_outcome_index, input.latest_outcome_index, at);
  if (!comparison.new_owner_trial_since_outcome) {
    throw new Error("A genuinely newer owner trial after the earlier outcome is required.");
  }
  const next: AgingAuditNote[] = [...existing, { ...comparison, recorded_at: at,
    category: input.category, personally_rechecked: true, hold_acknowledged: true,
    state: "PRIVATE_OUTCOME_AGING_AUDIT_NOT_SENT", field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED" }];
  validateAgingAudits(next, outcomes, watches, dispositions, recurrences, followups,
    history, checks);
  return next;
}

export function createAgingAuditReceipt(prior: OutcomeReceipt,
  notes: readonly AgingAuditNote[], at = new Date().toISOString()): AgingAuditReceipt {
  if (prior.kind !== "rosevear_independent_continuity_outcome_reconciliation" ||
    !validTime(at) || Date.parse(at) < Date.parse(prior.exported_at)) {
    throw new Error("Build 168 requires a chronological complete Build 167 outcome receipt.");
  }
  const nested = parseOutcomeReceipt(JSON.stringify(prior));
  validateAgingAudits(notes, nested.outcome_notes, nested.continuity_watches,
    nested.disposition_followups, nested.review_recurrences,
    nested.owner_review_followups, nested.trial.observations, nested.checks, at);
  const receipt: AgingAuditReceipt = {
    kind: "rosevear_independent_continuity_outcome_aging_audit", schema_version: 1,
    exported_at: at, field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED",
    automatic_dispatch: "DISABLED", automatic_reassignment: "DISABLED",
    evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS", outcome_receipt: prior,
    aging_audits: notes.map(note => ({ ...note, signals: [...note.signals] })),
  };
  if (JSON.stringify(receipt).length > MAX_AGING_AUDIT_BYTES) {
    throw new Error("Build 168 private receipt exceeds 5.05 MB.");
  }
  return receipt;
}

/** Imports are historical operator claims and never carry a fresh physical witness. */
export function parseAgingAuditReceipt(raw: string):
  ReturnType<typeof parseOutcomeReceipt> & { aging_audits: AgingAuditNote[] } {
  if (raw.length > MAX_AGING_AUDIT_BYTES) throw new Error("Build 168 receipt exceeds 5.05 MB.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Invalid private Build 168 JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid Build 168 envelope.");
  }
  const receipt = value as Record<string, unknown>;
  if (receipt.kind !== "rosevear_independent_continuity_outcome_aging_audit") {
    return { ...parseOutcomeReceipt(raw), aging_audits: [] };
  }
  const keys = ["kind", "schema_version", "exported_at", "field_acceptance",
    "independent_review", "closure", "automatic_dispatch", "automatic_reassignment",
    "evidence_authenticity", "outcome_receipt", "aging_audits"];
  if (Object.keys(receipt).length !== keys.length || Object.keys(receipt).some(key => !keys.includes(key)) ||
    receipt.schema_version !== 1 || !validTime(receipt.exported_at) ||
    receipt.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
    receipt.independent_review !== "INDEPENDENT_REVIEW_HOLD" ||
    receipt.closure !== "NOT_AUTHORIZED" || receipt.automatic_dispatch !== "DISABLED" ||
    receipt.automatic_reassignment !== "DISABLED" ||
    receipt.evidence_authenticity !== "UNVERIFIED_PRIVATE_ATTESTATIONS" ||
    !receipt.outcome_receipt || !Array.isArray(receipt.aging_audits)) {
    throw new Error("Unsafe Build 168 private independent HOLD receipt.");
  }
  const prior = receipt.outcome_receipt as OutcomeReceipt;
  if (prior.kind !== "rosevear_independent_continuity_outcome_reconciliation" ||
    Date.parse(prior.exported_at) > Date.parse(receipt.exported_at as string)) {
    throw new Error("Build 168 nested Build 167 chronology is invalid.");
  }
  const nested = parseOutcomeReceipt(JSON.stringify(prior));
  const notes = receipt.aging_audits as AgingAuditNote[];
  validateAgingAudits(notes, nested.outcome_notes, nested.continuity_watches,
    nested.disposition_followups, nested.review_recurrences,
    nested.owner_review_followups, nested.trial.observations, nested.checks,
    receipt.exported_at as string);
  return { ...nested, aging_audits: notes.map(note => ({ ...note, signals: [...note.signals] })) };
}

/** Two complete Build 167 receipts; exact prior stream prefixes only, never identity proof. */
export function comparePrivateOutcomeReceipts(previousRaw: string, currentRaw: string): {
  previous_outcomes: number; current_outcomes: number; new_outcomes: number;
  comparison: AgingComparison | null;
} {
  if (previousRaw.length > 4_650_000 || currentRaw.length > 4_650_000) {
    throw new Error("Build 167 comparison receipts exceed 4.65 MB.");
  }
  let previous: OutcomeReceipt;
  let current: OutcomeReceipt;
  try { previous = JSON.parse(previousRaw) as OutcomeReceipt;
    current = JSON.parse(currentRaw) as OutcomeReceipt;
  } catch { throw new Error("Invalid complete Build 167 comparison JSON."); }
  if (previous?.kind !== "rosevear_independent_continuity_outcome_reconciliation" ||
    current?.kind !== "rosevear_independent_continuity_outcome_reconciliation" ||
    Date.parse(previous.exported_at) >= Date.parse(current.exported_at)) {
    throw new Error("Two chronological complete Build 167 receipts are required.");
  }
  const before = parseOutcomeReceipt(previousRaw);
  const after = parseOutcomeReceipt(currentRaw);
  const prefix = (older: readonly unknown[], newer: readonly unknown[]) =>
    older.length <= newer.length && older.every((item, index) =>
      JSON.stringify(item) === JSON.stringify(newer[index]));
  const streams = ["handoffs", "events", "checks", "links", "reassessments", "followups",
    "decisions", "resolutions", "overdue_handoffs", "followup_reviews", "outcome_reviews",
    "recurrence_rechecks", "exception_watches", "watch_followup_audits", "reassignment_watches",
    "owner_review_followups", "review_recurrences", "disposition_followups",
    "continuity_watches", "outcome_notes"] as const;
  if (!prefix(before.trial.observations, after.trial.observations) ||
    !prefix(before.trial.source_readings, after.trial.source_readings) ||
    streams.some(stream => !prefix(before[stream], after[stream])) ||
    before.trial.environment.installed_version !== after.trial.environment.installed_version ||
    before.trial.environment.access !== after.trial.environment.access ||
    before.outcome_notes.length === 0 ||
    before.outcome_notes.length >= after.outcome_notes.length) {
    throw new Error("Build 167 evidence must be an exact nonempty append-only prefix with later outcomes.");
  }
  let comparison: AgingComparison | null = null;
  for (let later = before.outcome_notes.length;
    later < after.outcome_notes.length && !comparison; later++) {
    for (let earlier = before.outcome_notes.length - 1; earlier >= 0; earlier--) {
      if (after.outcome_notes[earlier].reassignment_watch_index !==
        after.outcome_notes[later].reassignment_watch_index ||
        after.outcome_notes[earlier].latest_continuity_index >=
        after.outcome_notes[later].latest_continuity_index) continue;
      comparison = compareOutcomeAging(after.outcome_notes, after.continuity_watches,
        after.disposition_followups, after.review_recurrences, after.owner_review_followups,
        after.trial.observations, after.checks, earlier, later, current.exported_at);
      break;
    }
  }
  return { previous_outcomes: before.outcome_notes.length,
    current_outcomes: after.outcome_notes.length,
    new_outcomes: after.outcome_notes.length - before.outcome_notes.length,
    comparison };
}
