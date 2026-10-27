/** Build 165: privately witnessed recurrence disposition and source renewal. Never an approval. */
import { validateInstalledVersion, type TrialEnvironment, type TrialOwner,
  type TrialObservation } from "./ownerFieldTrial";
import type { SourceIdentityCheck } from "./ownerFieldRouting";
import type { OwnerReviewFollowup } from "./ownerReassignmentReviewFollowup";
import { parseReviewRecurrenceReceipt, validateReviewRecurrences,
  type ReviewRecurrenceNote, type ReviewRecurrenceReceipt } from "./ownerReviewRecurrence";

export type DispositionSignal = "DISPOSITION_CHANGED" | "OWNER_OUTCOME_CHANGED" |
  "OWNER_CLAIM_CHANGED" | "SOURCE_EVIDENCE_NOT_RENEWED" | "SOURCE_EVIDENCE_CHANGED" |
  "SOURCE_EVIDENCE_UNVERIFIED" | "PRIOR_DISPOSITION_AGED" |
  "PRIOR_DISPOSITION_OVERDUE" | "ORIGINAL_WATCH_STILL_HELD";
export type DispositionCategory = "CONTINUE_INDEPENDENT_HOLD" |
  "REQUEST_DISPOSITION_RECHECK" | "REQUEST_SOURCE_EVIDENCE_RENEWAL" |
  "REQUEST_OVERDUE_INDEPENDENT_REVIEW";
export type DispositionAgeBand = "UNDER_THREE_DAYS" | "THREE_TO_SEVEN_DAYS" | "OVER_SEVEN_DAYS";

export interface DispositionComparison {
  baseline_recurrence_index: number;
  latest_recurrence_index: number;
  reassignment_watch_index: number;
  case_id: ReviewRecurrenceNote["case_id"];
  baseline_followup_index: number;
  latest_followup_index: number;
  baseline_at: string;
  latest_at: string;
  first_watch_at: string;
  baseline_disposition: ReviewRecurrenceNote["category"];
  latest_disposition: ReviewRecurrenceNote["category"];
  baseline_outcome: TrialObservation["outcome"];
  latest_outcome: TrialObservation["outcome"];
  baseline_owner_claim: TrialOwner;
  latest_owner_claim: TrialOwner;
  baseline_source_check_index: number | null;
  latest_source_check_index: number | null;
  source_evidence_renewed: boolean;
  age_since_first_disposition_days: number;
  age_since_watch_days: number;
  age_band: DispositionAgeBand;
  signals: DispositionSignal[];
  unresolved: true;
}
export interface DispositionFollowup extends DispositionComparison {
  recorded_at: string;
  category: DispositionCategory;
  personally_compared: true;
  hold_acknowledged: true;
  state: "PRIVATE_RECURRENCE_DISPOSITION_NOT_SENT";
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
}
export interface DispositionReceipt {
  kind: "rosevear_independent_recurrence_disposition_followup";
  schema_version: 1;
  exported_at: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
  automatic_dispatch: "DISABLED";
  automatic_reassignment: "DISABLED";
  evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS";
  recurrence_receipt: ReviewRecurrenceReceipt;
  disposition_followups: DispositionFollowup[];
}
export const MAX_DISPOSITION_BYTES = 3_950_000;
export const DISPOSITION_CATEGORIES: readonly DispositionCategory[] = [
  "CONTINUE_INDEPENDENT_HOLD", "REQUEST_DISPOSITION_RECHECK",
  "REQUEST_SOURCE_EVIDENCE_RENEWAL", "REQUEST_OVERDUE_INDEPENDENT_REVIEW",
];
const DAY = 86_400_000;
const comparisonKeys = ["baseline_recurrence_index", "latest_recurrence_index",
  "reassignment_watch_index", "case_id", "baseline_followup_index", "latest_followup_index",
  "baseline_at", "latest_at", "first_watch_at", "baseline_disposition", "latest_disposition",
  "baseline_outcome", "latest_outcome", "baseline_owner_claim", "latest_owner_claim",
  "baseline_source_check_index", "latest_source_check_index", "source_evidence_renewed",
  "age_since_first_disposition_days", "age_since_watch_days", "age_band", "signals", "unresolved"] as const;
const noteKeys = [...comparisonKeys, "recorded_at", "category", "personally_compared",
  "hold_acknowledged", "state", "field_acceptance", "independent_review", "closure"];
function validTime(value: unknown): value is string {
  return typeof value === "string" && /^20\d\d-\d\d-\d\dT/.test(value) &&
    Number.isFinite(Date.parse(value)) && Date.parse(value) >= Date.parse("2020-01-01T00:00:00Z") &&
    Date.parse(value) <= Date.now() + 300_000;
}

/** Only distinct chronological recurrence rounds of one exact held watch qualify. */
export function compareRecurrenceDispositions(recurrences: readonly ReviewRecurrenceNote[],
  followups: readonly OwnerReviewFollowup[], history: readonly TrialObservation[],
  checks: readonly SourceIdentityCheck[], baselineIndex: number, latestIndex: number,
  at = new Date().toISOString()): DispositionComparison {
  const earlier = recurrences[baselineIndex];
  const later = recurrences[latestIndex];
  if (!Number.isInteger(baselineIndex) || !Number.isInteger(latestIndex) ||
    baselineIndex < 0 || latestIndex <= baselineIndex || !earlier || !later ||
    earlier.reassignment_watch_index !== later.reassignment_watch_index ||
    earlier.case_id !== later.case_id || earlier.first_watch_at !== later.first_watch_at ||
    earlier.latest_followup_index >= later.latest_followup_index ||
    Date.parse(earlier.recorded_at) >= Date.parse(later.recorded_at) ||
    !validTime(at) || Date.parse(at) < Date.parse(later.recorded_at)) {
    throw new Error("Two chronological recurrence dispositions of one exact held watch with a new owner review are required.");
  }
  // Recompute both underlying immutable recurrence rounds before deriving a source claim.
  validateReviewRecurrences([earlier, later], followups, history, checks);
  const oldReview = followups[earlier.latest_followup_index];
  const newReview = followups[later.latest_followup_index];
  const priorSource = oldReview.source_check_index === null ? null : checks[oldReview.source_check_index];
  const newSource = newReview.source_check_index === null ? null : checks[newReview.source_check_index];
  const renewed = !!newSource && !!priorSource &&
    oldReview.source_check_index !== newReview.source_check_index &&
    Date.parse(newSource.captured_at) > Date.parse(earlier.recorded_at) &&
    Date.parse(newSource.captured_at) > Date.parse(priorSource.captured_at);
  const signals: DispositionSignal[] = [];
  if (earlier.category !== later.category) signals.push("DISPOSITION_CHANGED");
  if (earlier.latest_outcome !== later.latest_outcome) signals.push("OWNER_OUTCOME_CHANGED");
  if (earlier.latest_owner_claim !== later.latest_owner_claim) signals.push("OWNER_CLAIM_CHANGED");
  if (!renewed) signals.push("SOURCE_EVIDENCE_NOT_RENEWED");
  if (priorSource && newSource && (priorSource.safe_alias !== newSource.safe_alias ||
    priorSource.identity_state !== newSource.identity_state ||
    priorSource.installed_version !== newSource.installed_version ||
    priorSource.access !== newSource.access)) signals.push("SOURCE_EVIDENCE_CHANGED");
  if (!newSource || newSource.identity_state !== "confirmed_alias") {
    signals.push("SOURCE_EVIDENCE_UNVERIFIED");
  }
  const age = Math.floor((Date.parse(at) - Date.parse(earlier.recorded_at)) / DAY);
  if (age >= 3) signals.push("PRIOR_DISPOSITION_AGED");
  if (age > 7) signals.push("PRIOR_DISPOSITION_OVERDUE");
  signals.push("ORIGINAL_WATCH_STILL_HELD");
  return { baseline_recurrence_index: baselineIndex, latest_recurrence_index: latestIndex,
    reassignment_watch_index: earlier.reassignment_watch_index, case_id: earlier.case_id,
    baseline_followup_index: earlier.latest_followup_index,
    latest_followup_index: later.latest_followup_index,
    baseline_at: earlier.recorded_at, latest_at: later.recorded_at,
    first_watch_at: earlier.first_watch_at,
    baseline_disposition: earlier.category, latest_disposition: later.category,
    baseline_outcome: earlier.latest_outcome, latest_outcome: later.latest_outcome,
    baseline_owner_claim: earlier.latest_owner_claim,
    latest_owner_claim: later.latest_owner_claim,
    baseline_source_check_index: oldReview.source_check_index,
    latest_source_check_index: newReview.source_check_index,
    source_evidence_renewed: renewed,
    age_since_first_disposition_days: age,
    age_since_watch_days: Math.floor((Date.parse(at) - Date.parse(earlier.first_watch_at)) / DAY),
    age_band: age > 7 ? "OVER_SEVEN_DAYS" : age >= 3 ? "THREE_TO_SEVEN_DAYS" : "UNDER_THREE_DAYS",
    signals, unresolved: true };
}

export function validateDispositionFollowups(notes: readonly DispositionFollowup[],
  recurrences: readonly ReviewRecurrenceNote[], followups: readonly OwnerReviewFollowup[],
  history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[],
  exportedAt?: string): void {
  if (notes.length > 100) throw new Error("Build 165 supports at most 100 private disposition follow-ups.");
  let previous = 0;
  const seen = new Set<string>();
  for (const note of notes) {
    if (!note || Object.keys(note).length !== noteKeys.length ||
      Object.keys(note).some(key => !noteKeys.includes(key)) || !validTime(note.recorded_at) ||
      !DISPOSITION_CATEGORIES.includes(note.category) || note.personally_compared !== true ||
      note.hold_acknowledged !== true || note.state !== "PRIVATE_RECURRENCE_DISPOSITION_NOT_SENT" ||
      note.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
      note.independent_review !== "INDEPENDENT_REVIEW_HOLD" || note.closure !== "NOT_AUTHORIZED") {
      throw new Error("Unsafe Build 165 immutable independent HOLD fields.");
    }
    const when = Date.parse(note.recorded_at);
    if (when < previous || exportedAt && when > Date.parse(exportedAt)) {
      throw new Error("Build 165 disposition chronology is invalid.");
    }
    const expected = compareRecurrenceDispositions(recurrences, followups, history, checks,
      note.baseline_recurrence_index, note.latest_recurrence_index, note.recorded_at);
    if (comparisonKeys.some(key => JSON.stringify(note[key]) !== JSON.stringify(expected[key]))) {
      throw new Error("Build 165 changed immutable recurrence disposition, owner, source or age evidence.");
    }
    if (note.category === "REQUEST_DISPOSITION_RECHECK" &&
      !expected.signals.some(signal => ["DISPOSITION_CHANGED", "OWNER_OUTCOME_CHANGED", "OWNER_CLAIM_CHANGED"].includes(signal)) ||
      note.category === "REQUEST_SOURCE_EVIDENCE_RENEWAL" &&
      !expected.signals.some(signal => signal.startsWith("SOURCE_EVIDENCE_")) ||
      note.category === "REQUEST_OVERDUE_INDEPENDENT_REVIEW" &&
      !expected.signals.includes("PRIOR_DISPOSITION_OVERDUE")) {
      throw new Error("Build 165 disposition category requires a matching held evidence signal.");
    }
    const key = `${note.baseline_recurrence_index}:${note.latest_recurrence_index}:${note.category}`;
    if (seen.has(key)) throw new Error("Duplicate Build 165 private disposition follow-up.");
    seen.add(key); previous = when;
  }
}

export function recordDispositionFollowup(recurrences: readonly ReviewRecurrenceNote[],
  followups: readonly OwnerReviewFollowup[], history: readonly TrialObservation[],
  checks: readonly SourceIdentityCheck[], existing: readonly DispositionFollowup[],
  environment: TrialEnvironment, imported: { recurrences: number; dispositions: number },
  input: { baseline_recurrence_index: number; latest_recurrence_index: number;
    category: DispositionCategory; personally_compared: boolean; hold_acknowledged: boolean },
  at = new Date().toISOString()): DispositionFollowup[] {
  if (!environment.installed_windows_witnessed || !validateInstalledVersion(environment.installed_version) ||
    environment.access === "unknown" || input.latest_recurrence_index < imported.recurrences ||
    existing.length < imported.dispositions || !input.personally_compared ||
    !input.hold_acknowledged || !DISPOSITION_CATEGORIES.includes(input.category)) {
    throw new Error("Fresh non-imported recurrence, installed Windows witness and two HOLD confirmations are required.");
  }
  const comparison = compareRecurrenceDispositions(recurrences, followups, history, checks,
    input.baseline_recurrence_index, input.latest_recurrence_index, at);
  const next: DispositionFollowup[] = [...existing, { ...comparison, recorded_at: at,
    category: input.category, personally_compared: true, hold_acknowledged: true,
    state: "PRIVATE_RECURRENCE_DISPOSITION_NOT_SENT", field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED" }];
  validateDispositionFollowups(next, recurrences, followups, history, checks);
  return next;
}

export function createDispositionReceipt(prior: ReviewRecurrenceReceipt,
  notes: readonly DispositionFollowup[], at = new Date().toISOString()): DispositionReceipt {
  if (prior.kind !== "rosevear_independent_owner_review_recurrence" || !validTime(at) ||
    Date.parse(at) < Date.parse(prior.exported_at)) {
    throw new Error("Build 165 requires a chronological complete Build 164 recurrence receipt.");
  }
  const nested = parseReviewRecurrenceReceipt(JSON.stringify(prior));
  validateDispositionFollowups(notes, nested.review_recurrences,
    nested.owner_review_followups, nested.trial.observations, nested.checks, at);
  const receipt: DispositionReceipt = {
    kind: "rosevear_independent_recurrence_disposition_followup", schema_version: 1,
    exported_at: at, field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED",
    automatic_dispatch: "DISABLED", automatic_reassignment: "DISABLED",
    evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS", recurrence_receipt: prior,
    disposition_followups: notes.map(note => ({ ...note, signals: [...note.signals] })),
  };
  if (JSON.stringify(receipt).length > MAX_DISPOSITION_BYTES) {
    throw new Error("Build 165 private receipt exceeds 3.95 MB.");
  }
  return receipt;
}

/** Previous receipts are historical claims, never new owner/independent authorization. */
export function parseDispositionReceipt(raw: string):
  ReturnType<typeof parseReviewRecurrenceReceipt> & { disposition_followups: DispositionFollowup[] } {
  if (raw.length > MAX_DISPOSITION_BYTES) throw new Error("Build 165 receipt exceeds 3.95 MB.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Invalid private Build 165 JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid Build 165 envelope.");
  }
  const receipt = value as Record<string, unknown>;
  if (receipt.kind !== "rosevear_independent_recurrence_disposition_followup") {
    return { ...parseReviewRecurrenceReceipt(raw), disposition_followups: [] };
  }
  const keys = ["kind", "schema_version", "exported_at", "field_acceptance",
    "independent_review", "closure", "automatic_dispatch", "automatic_reassignment",
    "evidence_authenticity", "recurrence_receipt", "disposition_followups"];
  if (Object.keys(receipt).length !== keys.length || Object.keys(receipt).some(key => !keys.includes(key)) ||
    receipt.schema_version !== 1 || !validTime(receipt.exported_at) ||
    receipt.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
    receipt.independent_review !== "INDEPENDENT_REVIEW_HOLD" || receipt.closure !== "NOT_AUTHORIZED" ||
    receipt.automatic_dispatch !== "DISABLED" || receipt.automatic_reassignment !== "DISABLED" ||
    receipt.evidence_authenticity !== "UNVERIFIED_PRIVATE_ATTESTATIONS" ||
    !receipt.recurrence_receipt || !Array.isArray(receipt.disposition_followups)) {
    throw new Error("Unsafe Build 165 private independent HOLD receipt.");
  }
  const prior = receipt.recurrence_receipt as ReviewRecurrenceReceipt;
  if (prior.kind !== "rosevear_independent_owner_review_recurrence" ||
    Date.parse(prior.exported_at) > Date.parse(receipt.exported_at as string)) {
    throw new Error("Build 165 nested Build 164 chronology is invalid.");
  }
  const nested = parseReviewRecurrenceReceipt(JSON.stringify(prior));
  const notes = receipt.disposition_followups as DispositionFollowup[];
  validateDispositionFollowups(notes, nested.review_recurrences,
    nested.owner_review_followups, nested.trial.observations, nested.checks,
    receipt.exported_at as string);
  return { ...nested, disposition_followups: notes.map(note => ({ ...note, signals: [...note.signals] })) };
}

/** Strict, full upstream append-only comparison of two private Build 164 exports. */
export function comparePrivateRecurrenceReceipts(previousRaw: string, currentRaw: string): {
  previous_recurrences: number; current_recurrences: number; new_recurrences: number;
  comparison: DispositionComparison | null;
} {
  if (previousRaw.length > 3_600_000 || currentRaw.length > 3_600_000) {
    throw new Error("Build 164 receipts exceed 3.6 MB comparison bound.");
  }
  let beforeEnvelope: ReviewRecurrenceReceipt;
  let afterEnvelope: ReviewRecurrenceReceipt;
  try {
    beforeEnvelope = JSON.parse(previousRaw) as ReviewRecurrenceReceipt;
    afterEnvelope = JSON.parse(currentRaw) as ReviewRecurrenceReceipt;
  } catch { throw new Error("Invalid complete Build 164 comparison JSON."); }
  if (beforeEnvelope?.kind !== "rosevear_independent_owner_review_recurrence" ||
    afterEnvelope?.kind !== "rosevear_independent_owner_review_recurrence" ||
    Date.parse(beforeEnvelope.exported_at) >= Date.parse(afterEnvelope.exported_at)) {
    throw new Error("Two chronological complete Build 164 recurrence receipts are required.");
  }
  const before = parseReviewRecurrenceReceipt(previousRaw);
  const after = parseReviewRecurrenceReceipt(currentRaw);
  const prefix = (older: readonly unknown[], newer: readonly unknown[]) =>
    older.length <= newer.length && older.every((item, index) =>
      JSON.stringify(item) === JSON.stringify(newer[index]));
  const streams = ["handoffs", "events", "checks", "links", "reassessments", "followups",
    "decisions", "resolutions", "overdue_handoffs", "followup_reviews", "outcome_reviews",
    "recurrence_rechecks", "exception_watches", "watch_followup_audits", "reassignment_watches",
    "owner_review_followups", "review_recurrences"] as const;
  if (!prefix(before.trial.observations, after.trial.observations) ||
    !prefix(before.trial.source_readings, after.trial.source_readings) ||
    streams.some(stream => !prefix(before[stream], after[stream])) ||
    before.trial.environment.installed_version !== after.trial.environment.installed_version ||
    before.trial.environment.access !== after.trial.environment.access ||
    before.review_recurrences.length === 0 ||
    before.review_recurrences.length >= after.review_recurrences.length) {
    throw new Error("Build 164 evidence must be an exact nonempty append-only prefix with newer recurrence rounds.");
  }
  let comparison: DispositionComparison | null = null;
  for (let later = before.review_recurrences.length;
    later < after.review_recurrences.length && !comparison; later++) {
    for (let earlier = before.review_recurrences.length - 1; earlier >= 0; earlier--) {
      const oldNote = after.review_recurrences[earlier];
      const newNote = after.review_recurrences[later];
      if (oldNote.reassignment_watch_index !== newNote.reassignment_watch_index ||
        oldNote.latest_followup_index >= newNote.latest_followup_index) continue;
      comparison = compareRecurrenceDispositions(after.review_recurrences,
        after.owner_review_followups, after.trial.observations, after.checks,
        earlier, later, afterEnvelope.exported_at);
      break;
    }
  }
  return { previous_recurrences: before.review_recurrences.length,
    current_recurrences: after.review_recurrences.length,
    new_recurrences: after.review_recurrences.length - before.review_recurrences.length,
    comparison };
}
