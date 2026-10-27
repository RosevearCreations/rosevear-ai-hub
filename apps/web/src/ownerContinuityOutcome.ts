/** Build 167: private continuity outcome reconciliation, never physical or reviewer approval. */
import { validateInstalledVersion, type TrialEnvironment, type TrialObservation } from "./ownerFieldTrial";
import type { SourceIdentityCheck } from "./ownerFieldRouting";
import type { OwnerReviewFollowup } from "./ownerReassignmentReviewFollowup";
import type { ReviewRecurrenceNote } from "./ownerReviewRecurrence";
import type { DispositionFollowup } from "./ownerRecurrenceDisposition";
import { parseContinuityReceipt, validateContinuityWatches,
  type ContinuityWatchNote, type ContinuityWatchReceipt } from "./ownerDispositionContinuity";

export type OutcomeSignal = "OWNER_OUTCOME_CHANGED" | "OWNER_CLAIM_CONTRADICTED" |
  "REPEATED_DISPOSITION_EXCEPTION" | "OWNER_TRIAL_NOT_RENEWED" |
  "SOURCE_EVIDENCE_NOT_RENEWED" | "SOURCE_IDENTITY_CONTRADICTED" |
  "SOURCE_IDENTITY_UNVERIFIED" | "SOURCE_EVIDENCE_AGED" |
  "SOURCE_EVIDENCE_OVERDUE" | "ORIGINAL_INDEPENDENT_HOLD_PERSISTS";
export type OutcomeCategory = "CONTINUE_INDEPENDENT_HOLD" |
  "REQUEST_OWNER_OUTCOME_RECHECK" | "REQUEST_SOURCE_FRESHNESS_RECHECK" |
  "REQUEST_OVERDUE_INDEPENDENT_REVIEW";
export interface OutcomeComparison {
  baseline_continuity_index: number;
  latest_continuity_index: number;
  reassignment_watch_index: number;
  case_id: ContinuityWatchNote["case_id"];
  baseline_at: string;
  latest_at: string;
  baseline_disposition_index: number;
  latest_disposition_index: number;
  baseline_outcome: TrialObservation["outcome"];
  latest_outcome: TrialObservation["outcome"];
  baseline_owner_claim: TrialObservation["next_owner"];
  latest_owner_claim: TrialObservation["next_owner"];
  latest_observation_index: number;
  latest_source_check_index: number | null;
  owner_trial_renewed: boolean;
  source_evidence_renewed: boolean;
  source_identity_confirmed_claim: boolean;
  source_age_days: number | null;
  continuity_age_days: number;
  age_band: "UNDER_THREE_DAYS" | "THREE_TO_SEVEN_DAYS" | "OVER_SEVEN_DAYS";
  signals: OutcomeSignal[];
  unresolved: true;
}
export interface OutcomeNote extends OutcomeComparison {
  recorded_at: string;
  category: OutcomeCategory;
  personally_compared: true;
  hold_acknowledged: true;
  state: "PRIVATE_CONTINUITY_OUTCOME_NOT_SENT";
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
}
export interface OutcomeReceipt {
  kind: "rosevear_independent_continuity_outcome_reconciliation";
  schema_version: 1;
  exported_at: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
  automatic_dispatch: "DISABLED";
  automatic_reassignment: "DISABLED";
  evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS";
  continuity_receipt: ContinuityWatchReceipt;
  outcome_notes: OutcomeNote[];
}
export const MAX_OUTCOME_BYTES = 4_650_000;
export const OUTCOME_CATEGORIES: readonly OutcomeCategory[] = [
  "CONTINUE_INDEPENDENT_HOLD", "REQUEST_OWNER_OUTCOME_RECHECK",
  "REQUEST_SOURCE_FRESHNESS_RECHECK", "REQUEST_OVERDUE_INDEPENDENT_REVIEW",
];
const DAY = 86_400_000;
const comparisonKeys = ["baseline_continuity_index", "latest_continuity_index",
  "reassignment_watch_index", "case_id", "baseline_at", "latest_at",
  "baseline_disposition_index", "latest_disposition_index", "baseline_outcome",
  "latest_outcome", "baseline_owner_claim", "latest_owner_claim", "latest_observation_index",
  "latest_source_check_index", "owner_trial_renewed", "source_evidence_renewed",
  "source_identity_confirmed_claim", "source_age_days", "continuity_age_days", "age_band",
  "signals", "unresolved"] as const;
const noteKeys = [...comparisonKeys, "recorded_at", "category", "personally_compared",
  "hold_acknowledged", "state", "field_acceptance", "independent_review", "closure"];
function validTime(value: unknown): value is string {
  return typeof value === "string" && /^20\d\d-\d\d-\d\dT/.test(value) &&
    Number.isFinite(Date.parse(value)) && Date.parse(value) >= Date.parse("2020-01-01T00:00:00Z") &&
    Date.parse(value) <= Date.now() + 300_000;
}

/** Reconcile two exact same-watch historical notes using their underlying owner/source evidence. */
export function compareContinuityOutcomes(watches: readonly ContinuityWatchNote[],
  dispositions: readonly DispositionFollowup[], recurrences: readonly ReviewRecurrenceNote[],
  followups: readonly OwnerReviewFollowup[], history: readonly TrialObservation[],
  checks: readonly SourceIdentityCheck[], baselineIndex: number, latestIndex: number,
  at = new Date().toISOString()): OutcomeComparison {
  const before = watches[baselineIndex];
  const after = watches[latestIndex];
  if (!Number.isInteger(baselineIndex) || !Number.isInteger(latestIndex) ||
    baselineIndex < 0 || latestIndex <= baselineIndex || !before || !after ||
    before.reassignment_watch_index !== after.reassignment_watch_index ||
    before.case_id !== after.case_id || before.first_watch_at !== after.first_watch_at ||
    before.latest_disposition_index >= after.latest_disposition_index ||
    Date.parse(before.recorded_at) >= Date.parse(after.recorded_at) ||
    !validTime(at) || Date.parse(at) < Date.parse(after.recorded_at)) {
    throw new Error("Two chronological Build 166 watches of the exact same held case with a newer disposition are required.");
  }
  validateContinuityWatches([before, after], dispositions, recurrences, followups, history, checks);
  const newDisposition = dispositions[after.latest_disposition_index];
  const recurrence = recurrences[newDisposition.latest_recurrence_index];
  const ownerReview = followups[recurrence.latest_followup_index];
  const observed = history[ownerReview.observation_index];
  const source = after.latest_source_check_index === null ? null : checks[after.latest_source_check_index];
  const oldSource = before.latest_source_check_index === null ? null : checks[before.latest_source_check_index];
  const ownerRenewed = Date.parse(observed.observed_at) > Date.parse(before.recorded_at) &&
    observed.case_id === after.case_id && observed.witnessed_by_operator;
  const sourceRenewed = !!source && Date.parse(source.captured_at) > Date.parse(before.recorded_at) &&
    (!oldSource || Date.parse(source.captured_at) > Date.parse(oldSource.captured_at)) &&
    before.latest_source_check_index !== after.latest_source_check_index;
  const sourceConfirmed = !!source && source.identity_state === "confirmed_alias";
  const sourceAge = source ? Math.floor((Date.parse(at) - Date.parse(source.captured_at)) / DAY) : null;
  const continuityAge = Math.floor((Date.parse(at) - Date.parse(before.recorded_at)) / DAY);
  const signals: OutcomeSignal[] = [];
  if (before.latest_outcome !== after.latest_outcome) signals.push("OWNER_OUTCOME_CHANGED");
  if (before.latest_owner_claim !== after.latest_owner_claim) signals.push("OWNER_CLAIM_CONTRADICTED");
  if (before.category !== "CONTINUE_INDEPENDENT_HOLD" &&
    after.category !== "CONTINUE_INDEPENDENT_HOLD") signals.push("REPEATED_DISPOSITION_EXCEPTION");
  if (!ownerRenewed) signals.push("OWNER_TRIAL_NOT_RENEWED");
  if (!sourceRenewed) signals.push("SOURCE_EVIDENCE_NOT_RENEWED");
  if (oldSource && source && (oldSource.safe_alias !== source.safe_alias ||
    oldSource.identity_state !== source.identity_state ||
    oldSource.installed_version !== source.installed_version ||
    oldSource.access !== source.access)) signals.push("SOURCE_IDENTITY_CONTRADICTED");
  if (!sourceConfirmed) signals.push("SOURCE_IDENTITY_UNVERIFIED");
  if (sourceAge !== null && sourceAge >= 3) signals.push("SOURCE_EVIDENCE_AGED");
  if (sourceAge === null || sourceAge > 7) signals.push("SOURCE_EVIDENCE_OVERDUE");
  signals.push("ORIGINAL_INDEPENDENT_HOLD_PERSISTS");
  return { baseline_continuity_index: baselineIndex, latest_continuity_index: latestIndex,
    reassignment_watch_index: before.reassignment_watch_index, case_id: before.case_id,
    baseline_at: before.recorded_at, latest_at: after.recorded_at,
    baseline_disposition_index: before.latest_disposition_index,
    latest_disposition_index: after.latest_disposition_index,
    baseline_outcome: before.latest_outcome, latest_outcome: after.latest_outcome,
    baseline_owner_claim: before.latest_owner_claim, latest_owner_claim: after.latest_owner_claim,
    latest_observation_index: ownerReview.observation_index,
    latest_source_check_index: after.latest_source_check_index,
    owner_trial_renewed: ownerRenewed, source_evidence_renewed: sourceRenewed,
    source_identity_confirmed_claim: sourceConfirmed, source_age_days: sourceAge,
    continuity_age_days: continuityAge,
    age_band: continuityAge > 7 ? "OVER_SEVEN_DAYS" : continuityAge >= 3 ?
      "THREE_TO_SEVEN_DAYS" : "UNDER_THREE_DAYS", signals, unresolved: true };
}

export function validateOutcomeNotes(notes: readonly OutcomeNote[], watches: readonly ContinuityWatchNote[],
  dispositions: readonly DispositionFollowup[], recurrences: readonly ReviewRecurrenceNote[],
  followups: readonly OwnerReviewFollowup[], history: readonly TrialObservation[],
  checks: readonly SourceIdentityCheck[], exportedAt?: string): void {
  if (notes.length > 100) throw new Error("Build 167 supports at most 100 private outcome notes.");
  let previous = 0;
  const seen = new Set<string>();
  for (const note of notes) {
    if (!note || Object.keys(note).length !== noteKeys.length ||
      Object.keys(note).some(key => !noteKeys.includes(key)) || !validTime(note.recorded_at) ||
      !OUTCOME_CATEGORIES.includes(note.category) || note.personally_compared !== true ||
      note.hold_acknowledged !== true || note.state !== "PRIVATE_CONTINUITY_OUTCOME_NOT_SENT" ||
      note.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
      note.independent_review !== "INDEPENDENT_REVIEW_HOLD" || note.closure !== "NOT_AUTHORIZED") {
      throw new Error("Unsafe Build 167 immutable independent HOLD fields.");
    }
    const when = Date.parse(note.recorded_at);
    if (when < previous || exportedAt && when > Date.parse(exportedAt)) {
      throw new Error("Build 167 outcome chronology is invalid.");
    }
    const expected = compareContinuityOutcomes(watches, dispositions, recurrences,
      followups, history, checks, note.baseline_continuity_index,
      note.latest_continuity_index, note.recorded_at);
    if (comparisonKeys.some(key => JSON.stringify(note[key]) !== JSON.stringify(expected[key]))) {
      throw new Error("Build 167 changed immutable owner, source or freshness evidence.");
    }
    if (note.category === "REQUEST_OWNER_OUTCOME_RECHECK" &&
      !expected.signals.some(signal => ["OWNER_OUTCOME_CHANGED", "OWNER_CLAIM_CONTRADICTED",
        "REPEATED_DISPOSITION_EXCEPTION"].includes(signal)) ||
      note.category === "REQUEST_SOURCE_FRESHNESS_RECHECK" &&
      !expected.signals.some(signal => signal.startsWith("SOURCE_")) ||
      note.category === "REQUEST_OVERDUE_INDEPENDENT_REVIEW" &&
      expected.age_band !== "OVER_SEVEN_DAYS") {
      throw new Error("Build 167 category requires matching unresolved evidence.");
    }
    const key = `${note.baseline_continuity_index}:${note.latest_continuity_index}:${note.category}`;
    if (seen.has(key)) throw new Error("Duplicate Build 167 private outcome note.");
    seen.add(key); previous = when;
  }
}

export function recordOutcomeNote(watches: readonly ContinuityWatchNote[],
  dispositions: readonly DispositionFollowup[], recurrences: readonly ReviewRecurrenceNote[],
  followups: readonly OwnerReviewFollowup[], history: readonly TrialObservation[],
  checks: readonly SourceIdentityCheck[], existing: readonly OutcomeNote[],
  environment: TrialEnvironment, imported: { watches: number; outcomes: number },
  input: { baseline_continuity_index: number; latest_continuity_index: number;
    category: OutcomeCategory; personally_compared: boolean; hold_acknowledged: boolean },
  at = new Date().toISOString()): OutcomeNote[] {
  if (!environment.installed_windows_witnessed || !validateInstalledVersion(environment.installed_version) ||
    environment.access === "unknown" || input.latest_continuity_index < imported.watches ||
    existing.length < imported.outcomes || !input.personally_compared ||
    !input.hold_acknowledged || !OUTCOME_CATEGORIES.includes(input.category)) {
    throw new Error("Fresh non-imported continuity watch, installed Windows witness and two HOLD confirmations required.");
  }
  const comparison = compareContinuityOutcomes(watches, dispositions, recurrences,
    followups, history, checks, input.baseline_continuity_index, input.latest_continuity_index, at);
  if (!comparison.owner_trial_renewed) throw new Error("A genuinely newer owner trial after the earlier watch is required.");
  const next: OutcomeNote[] = [...existing, { ...comparison, recorded_at: at,
    category: input.category, personally_compared: true, hold_acknowledged: true,
    state: "PRIVATE_CONTINUITY_OUTCOME_NOT_SENT", field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED" }];
  validateOutcomeNotes(next, watches, dispositions, recurrences, followups, history, checks);
  return next;
}

export function createOutcomeReceipt(prior: ContinuityWatchReceipt,
  notes: readonly OutcomeNote[], at = new Date().toISOString()): OutcomeReceipt {
  if (prior.kind !== "rosevear_independent_disposition_continuity_watch" ||
    !validTime(at) || Date.parse(at) < Date.parse(prior.exported_at)) {
    throw new Error("Build 167 requires chronological complete Build 166 receipt.");
  }
  const nested = parseContinuityReceipt(JSON.stringify(prior));
  validateOutcomeNotes(notes, nested.continuity_watches, nested.disposition_followups,
    nested.review_recurrences, nested.owner_review_followups, nested.trial.observations,
    nested.checks, at);
  const receipt: OutcomeReceipt = {
    kind: "rosevear_independent_continuity_outcome_reconciliation", schema_version: 1,
    exported_at: at, field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED",
    automatic_dispatch: "DISABLED", automatic_reassignment: "DISABLED",
    evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS", continuity_receipt: prior,
    outcome_notes: notes.map(note => ({ ...note, signals: [...note.signals] })),
  };
  if (JSON.stringify(receipt).length > MAX_OUTCOME_BYTES) {
    throw new Error("Build 167 private receipt exceeds 4.65 MB.");
  }
  return receipt;
}

export function parseOutcomeReceipt(raw: string):
  ReturnType<typeof parseContinuityReceipt> & { outcome_notes: OutcomeNote[] } {
  if (raw.length > MAX_OUTCOME_BYTES) throw new Error("Build 167 receipt exceeds 4.65 MB.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Invalid private Build 167 JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid Build 167 envelope.");
  }
  const receipt = value as Record<string, unknown>;
  if (receipt.kind !== "rosevear_independent_continuity_outcome_reconciliation") {
    return { ...parseContinuityReceipt(raw), outcome_notes: [] };
  }
  const keys = ["kind", "schema_version", "exported_at", "field_acceptance",
    "independent_review", "closure", "automatic_dispatch", "automatic_reassignment",
    "evidence_authenticity", "continuity_receipt", "outcome_notes"];
  if (Object.keys(receipt).length !== keys.length || Object.keys(receipt).some(key => !keys.includes(key)) ||
    receipt.schema_version !== 1 || !validTime(receipt.exported_at) ||
    receipt.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
    receipt.independent_review !== "INDEPENDENT_REVIEW_HOLD" ||
    receipt.closure !== "NOT_AUTHORIZED" || receipt.automatic_dispatch !== "DISABLED" ||
    receipt.automatic_reassignment !== "DISABLED" ||
    receipt.evidence_authenticity !== "UNVERIFIED_PRIVATE_ATTESTATIONS" ||
    !receipt.continuity_receipt || !Array.isArray(receipt.outcome_notes)) {
    throw new Error("Unsafe Build 167 private independent HOLD receipt.");
  }
  const prior = receipt.continuity_receipt as ContinuityWatchReceipt;
  if (prior.kind !== "rosevear_independent_disposition_continuity_watch" ||
    Date.parse(prior.exported_at) > Date.parse(receipt.exported_at as string)) {
    throw new Error("Build 167 nested Build 166 chronology is invalid.");
  }
  const nested = parseContinuityReceipt(JSON.stringify(prior));
  const notes = receipt.outcome_notes as OutcomeNote[];
  validateOutcomeNotes(notes, nested.continuity_watches, nested.disposition_followups,
    nested.review_recurrences, nested.owner_review_followups, nested.trial.observations,
    nested.checks, receipt.exported_at as string);
  return { ...nested, outcome_notes: notes.map(note => ({ ...note, signals: [...note.signals] })) };
}

/** Strict structural append-only comparison of two complete Build 166 receipts; never identity proof. */
export function comparePrivateContinuityReceipts(previousRaw: string, currentRaw: string): {
  previous_watches: number; current_watches: number; new_watches: number;
  comparison: OutcomeComparison | null;
} {
  if (previousRaw.length > 4_300_000 || currentRaw.length > 4_300_000) {
    throw new Error("Build 166 comparison receipts exceed 4.3 MB.");
  }
  let previous: ContinuityWatchReceipt;
  let current: ContinuityWatchReceipt;
  try { previous = JSON.parse(previousRaw) as ContinuityWatchReceipt;
    current = JSON.parse(currentRaw) as ContinuityWatchReceipt;
  } catch { throw new Error("Invalid complete Build 166 comparison JSON."); }
  if (previous?.kind !== "rosevear_independent_disposition_continuity_watch" ||
    current?.kind !== "rosevear_independent_disposition_continuity_watch" ||
    Date.parse(previous.exported_at) >= Date.parse(current.exported_at)) {
    throw new Error("Two chronological complete Build 166 receipts are required.");
  }
  const before = parseContinuityReceipt(previousRaw);
  const after = parseContinuityReceipt(currentRaw);
  const prefix = (older: readonly unknown[], newer: readonly unknown[]) =>
    older.length <= newer.length && older.every((item, index) =>
      JSON.stringify(item) === JSON.stringify(newer[index]));
  const streams = ["handoffs", "events", "checks", "links", "reassessments", "followups",
    "decisions", "resolutions", "overdue_handoffs", "followup_reviews", "outcome_reviews",
    "recurrence_rechecks", "exception_watches", "watch_followup_audits", "reassignment_watches",
    "owner_review_followups", "review_recurrences", "disposition_followups", "continuity_watches"] as const;
  if (!prefix(before.trial.observations, after.trial.observations) ||
    !prefix(before.trial.source_readings, after.trial.source_readings) ||
    streams.some(stream => !prefix(before[stream], after[stream])) ||
    before.trial.environment.installed_version !== after.trial.environment.installed_version ||
    before.trial.environment.access !== after.trial.environment.access ||
    before.continuity_watches.length === 0 ||
    before.continuity_watches.length >= after.continuity_watches.length) {
    throw new Error("Build 166 evidence must be exact nonempty append-only prefixes with later continuity watches.");
  }
  let comparison: OutcomeComparison | null = null;
  for (let later = before.continuity_watches.length;
    later < after.continuity_watches.length && !comparison; later++) {
    for (let earlier = before.continuity_watches.length - 1; earlier >= 0; earlier--) {
      if (after.continuity_watches[earlier].reassignment_watch_index !==
        after.continuity_watches[later].reassignment_watch_index ||
        after.continuity_watches[earlier].latest_disposition_index >=
        after.continuity_watches[later].latest_disposition_index) continue;
      comparison = compareContinuityOutcomes(after.continuity_watches,
        after.disposition_followups, after.review_recurrences, after.owner_review_followups,
        after.trial.observations, after.checks, earlier, later, current.exported_at);
      break;
    }
  }
  return { previous_watches: before.continuity_watches.length,
    current_watches: after.continuity_watches.length,
    new_watches: after.continuity_watches.length - before.continuity_watches.length,
    comparison };
}
