/** Build 166: owner-safe recurrence disposition continuity and overdue source watch. */
import { validateInstalledVersion, type TrialEnvironment, type TrialObservation,
  type TrialOwner } from "./ownerFieldTrial";
import type { SourceIdentityCheck } from "./ownerFieldRouting";
import type { OwnerReviewFollowup } from "./ownerReassignmentReviewFollowup";
import type { ReviewRecurrenceNote } from "./ownerReviewRecurrence";
import { parseDispositionReceipt, validateDispositionFollowups,
  type DispositionFollowup, type DispositionReceipt } from "./ownerRecurrenceDisposition";

export type ContinuitySignal = "DISPOSITION_RECHECK_CHANGED" | "OWNER_OUTCOME_CHANGED" |
  "OWNER_CLAIM_CHANGED" | "SOURCE_RENEWAL_STALLED" | "SOURCE_RENEWAL_CHANGED" |
  "SOURCE_RENEWAL_UNVERIFIED" | "SOURCE_RENEWAL_RECORDED_NOT_CERTIFIED" |
  "EARLIER_DISPOSITION_AGED" | "EARLIER_DISPOSITION_OVERDUE" |
  "OVERDUE_SOURCE_RECHECK_NEEDED" | "ORIGINAL_INDEPENDENT_HOLD_PERSISTS";
export type ContinuityCategory = "CONTINUE_INDEPENDENT_HOLD" |
  "REQUEST_DISPOSITION_CONTINUITY_RECHECK" | "REQUEST_SOURCE_RENEWAL_WITNESS" |
  "REQUEST_OVERDUE_SOURCE_RENEWAL";
export type ContinuityAgeBand = "UNDER_THREE_DAYS" | "THREE_TO_SEVEN_DAYS" | "OVER_SEVEN_DAYS";

export interface ContinuityComparison {
  baseline_disposition_index: number;
  latest_disposition_index: number;
  reassignment_watch_index: number;
  case_id: DispositionFollowup["case_id"];
  baseline_recurrence_index: number;
  latest_recurrence_index: number;
  baseline_at: string;
  latest_at: string;
  first_watch_at: string;
  baseline_category: DispositionFollowup["category"];
  latest_category: DispositionFollowup["category"];
  baseline_outcome: TrialObservation["outcome"];
  latest_outcome: TrialObservation["outcome"];
  baseline_owner_claim: TrialOwner;
  latest_owner_claim: TrialOwner;
  baseline_source_check_index: number | null;
  latest_source_check_index: number | null;
  source_renewal_since_prior_disposition: boolean;
  latest_source_verified_claim: boolean;
  earlier_disposition_age_days: number;
  first_watch_age_days: number;
  age_band: ContinuityAgeBand;
  signals: ContinuitySignal[];
  unresolved: true;
}
export interface ContinuityWatchNote extends ContinuityComparison {
  recorded_at: string;
  category: ContinuityCategory;
  personally_compared: true;
  hold_acknowledged: true;
  state: "PRIVATE_DISPOSITION_CONTINUITY_NOT_SENT";
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
}
export interface ContinuityWatchReceipt {
  kind: "rosevear_independent_disposition_continuity_watch";
  schema_version: 1;
  exported_at: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
  automatic_dispatch: "DISABLED";
  automatic_reassignment: "DISABLED";
  evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS";
  disposition_receipt: DispositionReceipt;
  continuity_watches: ContinuityWatchNote[];
}

export const MAX_CONTINUITY_BYTES = 4_300_000;
export const CONTINUITY_CATEGORIES: readonly ContinuityCategory[] = [
  "CONTINUE_INDEPENDENT_HOLD", "REQUEST_DISPOSITION_CONTINUITY_RECHECK",
  "REQUEST_SOURCE_RENEWAL_WITNESS", "REQUEST_OVERDUE_SOURCE_RENEWAL",
];
const DAY = 86_400_000;
const comparisonKeys = ["baseline_disposition_index", "latest_disposition_index",
  "reassignment_watch_index", "case_id", "baseline_recurrence_index", "latest_recurrence_index",
  "baseline_at", "latest_at", "first_watch_at", "baseline_category", "latest_category",
  "baseline_outcome", "latest_outcome", "baseline_owner_claim", "latest_owner_claim",
  "baseline_source_check_index", "latest_source_check_index",
  "source_renewal_since_prior_disposition", "latest_source_verified_claim",
  "earlier_disposition_age_days", "first_watch_age_days", "age_band", "signals", "unresolved"] as const;
const noteKeys = [...comparisonKeys, "recorded_at", "category", "personally_compared",
  "hold_acknowledged", "state", "field_acceptance", "independent_review", "closure"];
function validTime(value: unknown): value is string {
  return typeof value === "string" && /^20\d\d-\d\d-\d\dT/.test(value) &&
    Number.isFinite(Date.parse(value)) && Date.parse(value) >= Date.parse("2020-01-01T00:00:00Z") &&
    Date.parse(value) <= Date.now() + 300_000;
}

/** Require a newer same-watch Build 165 disposition; any reported improvement stays on HOLD. */
export function compareDispositionContinuity(dispositions: readonly DispositionFollowup[],
  recurrences: readonly ReviewRecurrenceNote[], followups: readonly OwnerReviewFollowup[],
  history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[],
  baselineIndex: number, latestIndex: number,
  at = new Date().toISOString()): ContinuityComparison {
  const before = dispositions[baselineIndex];
  const after = dispositions[latestIndex];
  if (!Number.isInteger(baselineIndex) || !Number.isInteger(latestIndex) ||
    baselineIndex < 0 || latestIndex <= baselineIndex || !before || !after ||
    before.reassignment_watch_index !== after.reassignment_watch_index ||
    before.case_id !== after.case_id || before.first_watch_at !== after.first_watch_at ||
    before.latest_recurrence_index >= after.latest_recurrence_index ||
    Date.parse(before.recorded_at) >= Date.parse(after.recorded_at) ||
    !validTime(at) || Date.parse(at) < Date.parse(after.recorded_at)) {
    throw new Error("Two chronological Build 165 dispositions of one exact held watch with newer recurrence evidence are required.");
  }
  validateDispositionFollowups([before, after], recurrences, followups, history, checks);
  const earlierSource = before.latest_source_check_index === null ? null : checks[before.latest_source_check_index];
  const laterSource = after.latest_source_check_index === null ? null : checks[after.latest_source_check_index];
  const renewed = !!laterSource && before.latest_source_check_index !== after.latest_source_check_index &&
    Date.parse(laterSource.captured_at) > Date.parse(before.recorded_at) &&
    (!earlierSource || Date.parse(laterSource.captured_at) > Date.parse(earlierSource.captured_at));
  const verifiedClaim = !!laterSource && laterSource.identity_state === "confirmed_alias";
  const signals: ContinuitySignal[] = [];
  if (before.category !== after.category) signals.push("DISPOSITION_RECHECK_CHANGED");
  if (before.latest_outcome !== after.latest_outcome) signals.push("OWNER_OUTCOME_CHANGED");
  if (before.latest_owner_claim !== after.latest_owner_claim) signals.push("OWNER_CLAIM_CHANGED");
  if (!renewed) signals.push("SOURCE_RENEWAL_STALLED");
  if (earlierSource && laterSource && (earlierSource.safe_alias !== laterSource.safe_alias ||
    earlierSource.identity_state !== laterSource.identity_state ||
    earlierSource.installed_version !== laterSource.installed_version ||
    earlierSource.access !== laterSource.access)) signals.push("SOURCE_RENEWAL_CHANGED");
  if (!verifiedClaim) signals.push("SOURCE_RENEWAL_UNVERIFIED");
  if (renewed && verifiedClaim) signals.push("SOURCE_RENEWAL_RECORDED_NOT_CERTIFIED");
  const age = Math.floor((Date.parse(at) - Date.parse(before.recorded_at)) / DAY);
  if (age >= 3) signals.push("EARLIER_DISPOSITION_AGED");
  if (age > 7) signals.push("EARLIER_DISPOSITION_OVERDUE");
  if (age > 7 && (!renewed || !verifiedClaim)) signals.push("OVERDUE_SOURCE_RECHECK_NEEDED");
  signals.push("ORIGINAL_INDEPENDENT_HOLD_PERSISTS");
  return { baseline_disposition_index: baselineIndex, latest_disposition_index: latestIndex,
    reassignment_watch_index: before.reassignment_watch_index, case_id: before.case_id,
    baseline_recurrence_index: before.latest_recurrence_index,
    latest_recurrence_index: after.latest_recurrence_index,
    baseline_at: before.recorded_at, latest_at: after.recorded_at,
    first_watch_at: before.first_watch_at, baseline_category: before.category,
    latest_category: after.category, baseline_outcome: before.latest_outcome,
    latest_outcome: after.latest_outcome, baseline_owner_claim: before.latest_owner_claim,
    latest_owner_claim: after.latest_owner_claim,
    baseline_source_check_index: before.latest_source_check_index,
    latest_source_check_index: after.latest_source_check_index,
    source_renewal_since_prior_disposition: renewed, latest_source_verified_claim: verifiedClaim,
    earlier_disposition_age_days: age,
    first_watch_age_days: Math.floor((Date.parse(at) - Date.parse(before.first_watch_at)) / DAY),
    age_band: age > 7 ? "OVER_SEVEN_DAYS" : age >= 3 ? "THREE_TO_SEVEN_DAYS" : "UNDER_THREE_DAYS",
    signals, unresolved: true };
}

export function validateContinuityWatches(notes: readonly ContinuityWatchNote[],
  dispositions: readonly DispositionFollowup[], recurrences: readonly ReviewRecurrenceNote[],
  followups: readonly OwnerReviewFollowup[], history: readonly TrialObservation[],
  checks: readonly SourceIdentityCheck[], exportedAt?: string): void {
  if (notes.length > 100) throw new Error("Build 166 supports at most 100 private continuity watches.");
  let previous = 0;
  const seen = new Set<string>();
  for (const note of notes) {
    if (!note || Object.keys(note).length !== noteKeys.length ||
      Object.keys(note).some(key => !noteKeys.includes(key)) || !validTime(note.recorded_at) ||
      !CONTINUITY_CATEGORIES.includes(note.category) || note.personally_compared !== true ||
      note.hold_acknowledged !== true || note.state !== "PRIVATE_DISPOSITION_CONTINUITY_NOT_SENT" ||
      note.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
      note.independent_review !== "INDEPENDENT_REVIEW_HOLD" || note.closure !== "NOT_AUTHORIZED") {
      throw new Error("Unsafe Build 166 immutable independent HOLD fields.");
    }
    const when = Date.parse(note.recorded_at);
    if (when < previous || exportedAt && when > Date.parse(exportedAt)) {
      throw new Error("Build 166 continuity chronology is invalid.");
    }
    const expected = compareDispositionContinuity(dispositions, recurrences, followups,
      history, checks, note.baseline_disposition_index, note.latest_disposition_index,
      note.recorded_at);
    if (comparisonKeys.some(key => JSON.stringify(note[key]) !== JSON.stringify(expected[key]))) {
      throw new Error("Build 166 changed immutable disposition continuity, source or aging evidence.");
    }
    if (note.category === "REQUEST_DISPOSITION_CONTINUITY_RECHECK" &&
      !expected.signals.some(signal => ["DISPOSITION_RECHECK_CHANGED", "OWNER_OUTCOME_CHANGED", "OWNER_CLAIM_CHANGED"].includes(signal)) ||
      note.category === "REQUEST_SOURCE_RENEWAL_WITNESS" &&
      !expected.signals.some(signal => signal.startsWith("SOURCE_RENEWAL_")) ||
      note.category === "REQUEST_OVERDUE_SOURCE_RENEWAL" &&
      !expected.signals.includes("OVERDUE_SOURCE_RECHECK_NEEDED")) {
      throw new Error("Build 166 watch category requires a matching unresolved signal.");
    }
    const key = `${note.baseline_disposition_index}:${note.latest_disposition_index}:${note.category}`;
    if (seen.has(key)) throw new Error("Duplicate Build 166 private continuity watch.");
    seen.add(key); previous = when;
  }
}

export function recordContinuityWatch(dispositions: readonly DispositionFollowup[],
  recurrences: readonly ReviewRecurrenceNote[], followups: readonly OwnerReviewFollowup[],
  history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[],
  existing: readonly ContinuityWatchNote[], environment: TrialEnvironment,
  imported: { dispositions: number; watches: number },
  input: { baseline_disposition_index: number; latest_disposition_index: number;
    category: ContinuityCategory; personally_compared: boolean; hold_acknowledged: boolean },
  at = new Date().toISOString()): ContinuityWatchNote[] {
  if (!environment.installed_windows_witnessed || !validateInstalledVersion(environment.installed_version) ||
    environment.access === "unknown" || input.latest_disposition_index < imported.dispositions ||
    existing.length < imported.watches || !input.personally_compared ||
    !input.hold_acknowledged || !CONTINUITY_CATEGORIES.includes(input.category)) {
    throw new Error("Fresh non-imported disposition, witnessed installed Windows and two HOLD confirmations are required.");
  }
  const comparison = compareDispositionContinuity(dispositions, recurrences, followups,
    history, checks, input.baseline_disposition_index, input.latest_disposition_index, at);
  const next: ContinuityWatchNote[] = [...existing, { ...comparison, recorded_at: at,
    category: input.category, personally_compared: true, hold_acknowledged: true,
    state: "PRIVATE_DISPOSITION_CONTINUITY_NOT_SENT", field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED" }];
  validateContinuityWatches(next, dispositions, recurrences, followups, history, checks);
  return next;
}

export function createContinuityReceipt(prior: DispositionReceipt,
  notes: readonly ContinuityWatchNote[], at = new Date().toISOString()): ContinuityWatchReceipt {
  if (prior.kind !== "rosevear_independent_recurrence_disposition_followup" ||
    !validTime(at) || Date.parse(at) < Date.parse(prior.exported_at)) {
    throw new Error("Build 166 requires a chronological complete Build 165 disposition receipt.");
  }
  const nested = parseDispositionReceipt(JSON.stringify(prior));
  validateContinuityWatches(notes, nested.disposition_followups, nested.review_recurrences,
    nested.owner_review_followups, nested.trial.observations, nested.checks, at);
  const receipt: ContinuityWatchReceipt = {
    kind: "rosevear_independent_disposition_continuity_watch", schema_version: 1,
    exported_at: at, field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED",
    automatic_dispatch: "DISABLED", automatic_reassignment: "DISABLED",
    evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS", disposition_receipt: prior,
    continuity_watches: notes.map(note => ({ ...note, signals: [...note.signals] })),
  };
  if (JSON.stringify(receipt).length > MAX_CONTINUITY_BYTES) {
    throw new Error("Build 166 private receipt exceeds 4.3 MB.");
  }
  return receipt;
}

/** Imports never authorize a new reviewer. Earlier formats become historical claims. */
export function parseContinuityReceipt(raw: string):
  ReturnType<typeof parseDispositionReceipt> & { continuity_watches: ContinuityWatchNote[] } {
  if (raw.length > MAX_CONTINUITY_BYTES) throw new Error("Build 166 receipt exceeds 4.3 MB.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Invalid private Build 166 JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid Build 166 envelope.");
  }
  const receipt = value as Record<string, unknown>;
  if (receipt.kind !== "rosevear_independent_disposition_continuity_watch") {
    return { ...parseDispositionReceipt(raw), continuity_watches: [] };
  }
  const keys = ["kind", "schema_version", "exported_at", "field_acceptance",
    "independent_review", "closure", "automatic_dispatch", "automatic_reassignment",
    "evidence_authenticity", "disposition_receipt", "continuity_watches"];
  if (Object.keys(receipt).length !== keys.length || Object.keys(receipt).some(key => !keys.includes(key)) ||
    receipt.schema_version !== 1 || !validTime(receipt.exported_at) ||
    receipt.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
    receipt.independent_review !== "INDEPENDENT_REVIEW_HOLD" || receipt.closure !== "NOT_AUTHORIZED" ||
    receipt.automatic_dispatch !== "DISABLED" || receipt.automatic_reassignment !== "DISABLED" ||
    receipt.evidence_authenticity !== "UNVERIFIED_PRIVATE_ATTESTATIONS" ||
    !receipt.disposition_receipt || !Array.isArray(receipt.continuity_watches)) {
    throw new Error("Unsafe Build 166 private independent HOLD receipt.");
  }
  const prior = receipt.disposition_receipt as DispositionReceipt;
  if (prior.kind !== "rosevear_independent_recurrence_disposition_followup" ||
    Date.parse(prior.exported_at) > Date.parse(receipt.exported_at as string)) {
    throw new Error("Build 166 nested Build 165 chronology is invalid.");
  }
  const nested = parseDispositionReceipt(JSON.stringify(prior));
  const notes = receipt.continuity_watches as ContinuityWatchNote[];
  validateContinuityWatches(notes, nested.disposition_followups, nested.review_recurrences,
    nested.owner_review_followups, nested.trial.observations, nested.checks,
    receipt.exported_at as string);
  return { ...nested, continuity_watches: notes.map(note => ({ ...note, signals: [...note.signals] })) };
}

/** Compare two successive complete Build 165 receipts without trusting either identity claim. */
export function comparePrivateDispositionReceipts(previousRaw: string, currentRaw: string): {
  previous_dispositions: number; current_dispositions: number; new_dispositions: number;
  comparison: ContinuityComparison | null;
} {
  if (previousRaw.length > 3_950_000 || currentRaw.length > 3_950_000) {
    throw new Error("Build 165 receipts exceed 3.95 MB comparison bound.");
  }
  let beforeEnvelope: DispositionReceipt;
  let afterEnvelope: DispositionReceipt;
  try {
    beforeEnvelope = JSON.parse(previousRaw) as DispositionReceipt;
    afterEnvelope = JSON.parse(currentRaw) as DispositionReceipt;
  } catch { throw new Error("Invalid complete Build 165 comparison JSON."); }
  if (beforeEnvelope?.kind !== "rosevear_independent_recurrence_disposition_followup" ||
    afterEnvelope?.kind !== "rosevear_independent_recurrence_disposition_followup" ||
    Date.parse(beforeEnvelope.exported_at) >= Date.parse(afterEnvelope.exported_at)) {
    throw new Error("Two chronological complete Build 165 disposition receipts are required.");
  }
  const before = parseDispositionReceipt(previousRaw);
  const after = parseDispositionReceipt(currentRaw);
  const prefix = (older: readonly unknown[], newer: readonly unknown[]) =>
    older.length <= newer.length && older.every((item, index) =>
      JSON.stringify(item) === JSON.stringify(newer[index]));
  const streams = ["handoffs", "events", "checks", "links", "reassessments", "followups",
    "decisions", "resolutions", "overdue_handoffs", "followup_reviews", "outcome_reviews",
    "recurrence_rechecks", "exception_watches", "watch_followup_audits", "reassignment_watches",
    "owner_review_followups", "review_recurrences", "disposition_followups"] as const;
  if (!prefix(before.trial.observations, after.trial.observations) ||
    !prefix(before.trial.source_readings, after.trial.source_readings) ||
    streams.some(stream => !prefix(before[stream], after[stream])) ||
    before.trial.environment.installed_version !== after.trial.environment.installed_version ||
    before.trial.environment.access !== after.trial.environment.access ||
    before.disposition_followups.length === 0 ||
    before.disposition_followups.length >= after.disposition_followups.length) {
    throw new Error("Build 165 evidence must be an exact nonempty append-only prefix with newer disposition follow-ups.");
  }
  let comparison: ContinuityComparison | null = null;
  for (let later = before.disposition_followups.length;
    later < after.disposition_followups.length && !comparison; later++) {
    for (let earlier = before.disposition_followups.length - 1; earlier >= 0; earlier--) {
      const oldNote = after.disposition_followups[earlier];
      const newNote = after.disposition_followups[later];
      if (oldNote.reassignment_watch_index !== newNote.reassignment_watch_index ||
        oldNote.latest_recurrence_index >= newNote.latest_recurrence_index) continue;
      comparison = compareDispositionContinuity(after.disposition_followups,
        after.review_recurrences, after.owner_review_followups,
        after.trial.observations, after.checks, earlier, later, afterEnvelope.exported_at);
      break;
    }
  }
  return { previous_dispositions: before.disposition_followups.length,
    current_dispositions: after.disposition_followups.length,
    new_dispositions: after.disposition_followups.length - before.disposition_followups.length,
    comparison };
}
