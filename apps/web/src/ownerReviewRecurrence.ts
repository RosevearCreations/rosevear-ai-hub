/** Build 164: independent review follow-up recurrence evidence, not a real assignment or closure. */
import { validateInstalledVersion, type TrialEnvironment, type TrialObservation,
  type TrialOwner } from "./ownerFieldTrial";
import type { SourceIdentityCheck } from "./ownerFieldRouting";
import { parseOwnerReviewFollowupReceipt, type OwnerReviewFollowup,
  type OwnerReviewFollowupReceipt } from "./ownerReassignmentReviewFollowup";

export type ReviewRecurrenceSignal = "REVIEW_OUTCOME_REGRESSED" | "REVIEW_OUTCOME_CHANGED" |
  "FOLLOWUP_OWNER_CLAIM_CHANGED" | "FOLLOWUP_SOURCE_MISSING" |
  "FOLLOWUP_SOURCE_IDENTITY_CHANGED" | "FOLLOWUP_SOURCE_UNVERIFIED" |
  "FIRST_REVIEW_RESPONSE_AGED" | "FIRST_REVIEW_RESPONSE_OVERDUE" |
  "PRIOR_WATCH_AND_REVIEW_STILL_HELD";
export type ReviewRecurrenceCategory = "CONTINUE_INDEPENDENT_HOLD" |
  "REQUEST_RECURRENCE_EVIDENCE_RECHECK" | "REQUEST_SOURCE_WITNESS_RECHECK" |
  "REQUEST_OVERDUE_OWNER_REVIEW_RESPONSE";
export type ReviewRecurrenceAgeBand = "UNDER_THREE_DAYS" | "THREE_TO_SEVEN_DAYS" | "OVER_SEVEN_DAYS";

export interface ReviewRecurrenceComparison {
  baseline_followup_index: number;
  latest_followup_index: number;
  reassignment_watch_index: number;
  case_id: OwnerReviewFollowup["case_id"];
  baseline_observation_index: number;
  latest_observation_index: number;
  baseline_at: string;
  latest_at: string;
  first_watch_at: string;
  baseline_outcome: TrialObservation["outcome"];
  latest_outcome: TrialObservation["outcome"];
  baseline_owner_claim: TrialOwner;
  latest_owner_claim: TrialOwner;
  first_review_age_days: number;
  first_watch_age_days: number;
  age_band: ReviewRecurrenceAgeBand;
  signals: ReviewRecurrenceSignal[];
  unresolved: true;
}
export interface ReviewRecurrenceNote extends ReviewRecurrenceComparison {
  recorded_at: string;
  category: ReviewRecurrenceCategory;
  personally_compared: true;
  hold_acknowledged: true;
  state: "PRIVATE_REVIEW_RECURRENCE_NOT_SENT";
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
}
export interface ReviewRecurrenceReceipt {
  kind: "rosevear_independent_owner_review_recurrence";
  schema_version: 1;
  exported_at: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
  automatic_dispatch: "DISABLED";
  automatic_reassignment: "DISABLED";
  evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS";
  owner_review_receipt: OwnerReviewFollowupReceipt;
  review_recurrences: ReviewRecurrenceNote[];
}

export const MAX_REVIEW_RECURRENCE_BYTES = 3_600_000;
export const REVIEW_RECURRENCE_CATEGORIES: readonly ReviewRecurrenceCategory[] = [
  "CONTINUE_INDEPENDENT_HOLD", "REQUEST_RECURRENCE_EVIDENCE_RECHECK",
  "REQUEST_SOURCE_WITNESS_RECHECK", "REQUEST_OVERDUE_OWNER_REVIEW_RESPONSE",
];
const DAY = 86_400_000;
const comparisonKeys = ["baseline_followup_index", "latest_followup_index",
  "reassignment_watch_index", "case_id", "baseline_observation_index",
  "latest_observation_index", "baseline_at", "latest_at", "first_watch_at",
  "baseline_outcome", "latest_outcome", "baseline_owner_claim", "latest_owner_claim",
  "first_review_age_days", "first_watch_age_days", "age_band", "signals", "unresolved"] as const;
const noteKeys = [...comparisonKeys, "recorded_at", "category", "personally_compared",
  "hold_acknowledged", "state", "field_acceptance", "independent_review", "closure"];
function validTime(value: unknown): value is string {
  return typeof value === "string" && /^20\d\d-\d\d-\d\dT/.test(value) &&
    Number.isFinite(Date.parse(value)) && Date.parse(value) >= Date.parse("2020-01-01T00:00:00Z") &&
    Date.parse(value) <= Date.now() + 300_000;
}

/** A later same-watch owner review can contradict the earlier one; neither becomes authoritative. */
export function compareOwnerReviewRounds(followups: readonly OwnerReviewFollowup[],
  history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[],
  baselineIndex: number, latestIndex: number,
  at = new Date().toISOString()): ReviewRecurrenceComparison {
  const prior = followups[baselineIndex];
  const later = followups[latestIndex];
  if (!Number.isInteger(baselineIndex) || !Number.isInteger(latestIndex) || baselineIndex < 0 ||
    latestIndex <= baselineIndex || !prior || !later ||
    prior.reassignment_watch_index !== later.reassignment_watch_index ||
    prior.case_id !== later.case_id || prior.watch_recorded_at !== later.watch_recorded_at ||
    JSON.stringify(prior.audit_pair) !== JSON.stringify(later.audit_pair) ||
    prior.observation_index >= later.observation_index ||
    Date.parse(prior.recorded_at) >= Date.parse(later.recorded_at) ||
    Date.parse(later.followup_observed_at) <= Date.parse(prior.recorded_at) ||
    !validTime(at) || Date.parse(at) < Date.parse(later.recorded_at)) {
    throw new Error("Two chronological independent owner follow-ups of one exact reassignment watch and a later owner trial are required.");
  }
  const oldObservation = history[prior.observation_index];
  const newObservation = history[later.observation_index];
  if (!oldObservation || !newObservation || oldObservation.case_id !== prior.case_id ||
    newObservation.case_id !== later.case_id ||
    oldObservation.observed_at !== prior.followup_observed_at ||
    newObservation.observed_at !== later.followup_observed_at ||
    oldObservation.outcome !== prior.owner_outcome || newObservation.outcome !== later.owner_outcome ||
    oldObservation.finding !== prior.owner_finding || newObservation.finding !== later.owner_finding ||
    oldObservation.next_owner !== prior.current_owner_claim ||
    newObservation.next_owner !== later.current_owner_claim) {
    throw new Error("Build 164 owner follow-up identity has changed.");
  }
  const oldSource = prior.source_check_index === null ? null : checks[prior.source_check_index];
  const newSource = later.source_check_index === null ? null : checks[later.source_check_index];
  if (oldSource && (oldSource.trial_index !== prior.observation_index ||
    oldSource.case_id !== prior.case_id) || newSource &&
    (newSource.trial_index !== later.observation_index || newSource.case_id !== later.case_id)) {
    throw new Error("Build 164 source identity no longer links to the exact owner review.");
  }
  const signals: ReviewRecurrenceSignal[] = [];
  if (prior.owner_outcome === "passed" && later.owner_outcome !== "passed") {
    signals.push("REVIEW_OUTCOME_REGRESSED");
  }
  if (prior.owner_outcome !== later.owner_outcome || prior.owner_finding !== later.owner_finding) {
    signals.push("REVIEW_OUTCOME_CHANGED");
  }
  if (prior.current_owner_claim !== later.current_owner_claim) {
    signals.push("FOLLOWUP_OWNER_CLAIM_CHANGED");
  }
  if (!oldSource || !newSource) signals.push("FOLLOWUP_SOURCE_MISSING");
  else if (oldSource.safe_alias !== newSource.safe_alias ||
    oldSource.identity_state !== newSource.identity_state ||
    oldSource.installed_version !== newSource.installed_version ||
    oldSource.access !== newSource.access) signals.push("FOLLOWUP_SOURCE_IDENTITY_CHANGED");
  if (newSource && newSource.identity_state !== "confirmed_alias") {
    signals.push("FOLLOWUP_SOURCE_UNVERIFIED");
  }
  const age = Math.floor((Date.parse(at) - Date.parse(prior.recorded_at)) / DAY);
  if (age >= 3) signals.push("FIRST_REVIEW_RESPONSE_AGED");
  if (age > 7) signals.push("FIRST_REVIEW_RESPONSE_OVERDUE");
  signals.push("PRIOR_WATCH_AND_REVIEW_STILL_HELD");
  return { baseline_followup_index: baselineIndex, latest_followup_index: latestIndex,
    reassignment_watch_index: prior.reassignment_watch_index, case_id: prior.case_id,
    baseline_observation_index: prior.observation_index,
    latest_observation_index: later.observation_index,
    baseline_at: prior.recorded_at, latest_at: later.recorded_at,
    first_watch_at: prior.watch_recorded_at,
    baseline_outcome: prior.owner_outcome, latest_outcome: later.owner_outcome,
    baseline_owner_claim: prior.current_owner_claim, latest_owner_claim: later.current_owner_claim,
    first_review_age_days: age,
    first_watch_age_days: Math.floor((Date.parse(at) - Date.parse(prior.watch_recorded_at)) / DAY),
    age_band: age > 7 ? "OVER_SEVEN_DAYS" : age >= 3 ? "THREE_TO_SEVEN_DAYS" : "UNDER_THREE_DAYS",
    signals, unresolved: true };
}

export function validateReviewRecurrences(notes: readonly ReviewRecurrenceNote[],
  followups: readonly OwnerReviewFollowup[], history: readonly TrialObservation[],
  checks: readonly SourceIdentityCheck[], exportedAt?: string): void {
  if (notes.length > 100) throw new Error("Build 164 supports at most 100 private review recurrences.");
  let previous = 0;
  const seen = new Set<string>();
  for (const note of notes) {
    if (!note || Object.keys(note).length !== noteKeys.length ||
      Object.keys(note).some(key => !noteKeys.includes(key)) || !validTime(note.recorded_at) ||
      !REVIEW_RECURRENCE_CATEGORIES.includes(note.category) || note.personally_compared !== true ||
      note.hold_acknowledged !== true || note.state !== "PRIVATE_REVIEW_RECURRENCE_NOT_SENT" ||
      note.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
      note.independent_review !== "INDEPENDENT_REVIEW_HOLD" || note.closure !== "NOT_AUTHORIZED") {
      throw new Error("Unsafe Build 164 immutable independent HOLD fields.");
    }
    const when = Date.parse(note.recorded_at);
    if (when < previous || exportedAt && when > Date.parse(exportedAt)) {
      throw new Error("Build 164 owner review chronology is invalid.");
    }
    const expected = compareOwnerReviewRounds(followups, history, checks,
      note.baseline_followup_index, note.latest_followup_index, note.recorded_at);
    if (comparisonKeys.some(key => JSON.stringify(note[key]) !== JSON.stringify(expected[key]))) {
      throw new Error("Build 164 changed immutable owner review, source or recurrence age.");
    }
    if (note.category === "REQUEST_RECURRENCE_EVIDENCE_RECHECK" &&
      !expected.signals.some(signal => signal === "REVIEW_OUTCOME_REGRESSED" ||
        signal === "REVIEW_OUTCOME_CHANGED" || signal === "FOLLOWUP_OWNER_CLAIM_CHANGED") ||
      note.category === "REQUEST_SOURCE_WITNESS_RECHECK" &&
      !expected.signals.some(signal => signal.startsWith("FOLLOWUP_SOURCE_")) ||
      note.category === "REQUEST_OVERDUE_OWNER_REVIEW_RESPONSE" &&
      !expected.signals.includes("FIRST_REVIEW_RESPONSE_OVERDUE")) {
      throw new Error("Build 164 review category requires a matching unresolved signal.");
    }
    const key = `${note.baseline_followup_index}:${note.latest_followup_index}:${note.category}`;
    if (seen.has(key)) throw new Error("Duplicate Build 164 private review recurrence.");
    seen.add(key); previous = when;
  }
}

export function recordReviewRecurrence(followups: readonly OwnerReviewFollowup[],
  history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[],
  existing: readonly ReviewRecurrenceNote[], environment: TrialEnvironment,
  imported: { followups: number; recurrences: number },
  input: { baseline_followup_index: number; latest_followup_index: number;
    category: ReviewRecurrenceCategory; personally_compared: boolean; hold_acknowledged: boolean },
  at = new Date().toISOString()): ReviewRecurrenceNote[] {
  if (!environment.installed_windows_witnessed || !validateInstalledVersion(environment.installed_version) ||
    environment.access === "unknown" || input.latest_followup_index < imported.followups ||
    existing.length < imported.recurrences || !input.personally_compared ||
    !input.hold_acknowledged || !REVIEW_RECURRENCE_CATEGORIES.includes(input.category)) {
    throw new Error("Fresh non-imported owner review, installed Windows witness and two HOLD confirmations are required.");
  }
  const comparison = compareOwnerReviewRounds(followups, history, checks,
    input.baseline_followup_index, input.latest_followup_index, at);
  const notes: ReviewRecurrenceNote[] = [...existing, { ...comparison, recorded_at: at,
    category: input.category, personally_compared: true, hold_acknowledged: true,
    state: "PRIVATE_REVIEW_RECURRENCE_NOT_SENT", field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED" }];
  validateReviewRecurrences(notes, followups, history, checks);
  return notes;
}

export function createReviewRecurrenceReceipt(prior: OwnerReviewFollowupReceipt,
  notes: readonly ReviewRecurrenceNote[], at = new Date().toISOString()): ReviewRecurrenceReceipt {
  if (prior.kind !== "rosevear_independent_reassignment_review_followup" || !validTime(at) ||
    Date.parse(at) < Date.parse(prior.exported_at)) {
    throw new Error("Build 164 requires a chronological complete Build 163 owner review receipt.");
  }
  const nested = parseOwnerReviewFollowupReceipt(JSON.stringify(prior));
  validateReviewRecurrences(notes, nested.owner_review_followups,
    nested.trial.observations, nested.checks, at);
  const receipt: ReviewRecurrenceReceipt = {
    kind: "rosevear_independent_owner_review_recurrence", schema_version: 1,
    exported_at: at, field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED",
    automatic_dispatch: "DISABLED", automatic_reassignment: "DISABLED",
    evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS", owner_review_receipt: prior,
    review_recurrences: notes.map(note => ({ ...note, signals: [...note.signals] })) };
  if (JSON.stringify(receipt).length > MAX_REVIEW_RECURRENCE_BYTES) {
    throw new Error("Build 164 private receipt exceeds 3.6 MB.");
  }
  return receipt;
}

/** Every prior receipt is historical only, including previous Build 164 exports. */
export function parseReviewRecurrenceReceipt(raw: string):
  ReturnType<typeof parseOwnerReviewFollowupReceipt> & { review_recurrences: ReviewRecurrenceNote[] } {
  if (raw.length > MAX_REVIEW_RECURRENCE_BYTES) throw new Error("Build 164 receipt exceeds 3.6 MB.");
  let data: unknown;
  try { data = JSON.parse(raw); } catch { throw new Error("Invalid private Build 164 JSON."); }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid Build 164 envelope.");
  const receipt = data as Record<string, unknown>;
  if (receipt.kind !== "rosevear_independent_owner_review_recurrence") {
    return { ...parseOwnerReviewFollowupReceipt(raw), review_recurrences: [] };
  }
  const keys = ["kind", "schema_version", "exported_at", "field_acceptance", "independent_review",
    "closure", "automatic_dispatch", "automatic_reassignment", "evidence_authenticity",
    "owner_review_receipt", "review_recurrences"];
  if (Object.keys(receipt).length !== keys.length || Object.keys(receipt).some(key => !keys.includes(key)) ||
    receipt.schema_version !== 1 || !validTime(receipt.exported_at) ||
    receipt.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
    receipt.independent_review !== "INDEPENDENT_REVIEW_HOLD" || receipt.closure !== "NOT_AUTHORIZED" ||
    receipt.automatic_dispatch !== "DISABLED" || receipt.automatic_reassignment !== "DISABLED" ||
    receipt.evidence_authenticity !== "UNVERIFIED_PRIVATE_ATTESTATIONS" ||
    !receipt.owner_review_receipt || !Array.isArray(receipt.review_recurrences)) {
    throw new Error("Unsafe Build 164 private independent HOLD receipt.");
  }
  const prior = receipt.owner_review_receipt as OwnerReviewFollowupReceipt;
  if (prior.kind !== "rosevear_independent_reassignment_review_followup" ||
    Date.parse(prior.exported_at) > Date.parse(receipt.exported_at as string)) {
    throw new Error("Build 164 nested Build 163 chronology is invalid.");
  }
  const nested = parseOwnerReviewFollowupReceipt(JSON.stringify(prior));
  const notes = receipt.review_recurrences as ReviewRecurrenceNote[];
  validateReviewRecurrences(notes, nested.owner_review_followups,
    nested.trial.observations, nested.checks, receipt.exported_at as string);
  return { ...nested, review_recurrences: notes.map(note => ({ ...note, signals: [...note.signals] })) };
}

/** Strictly compare complete successive Build 163 private receipts; no authenticity is inferred. */
export function comparePrivateOwnerReviewReceipts(previousRaw: string, currentRaw: string): {
  previous_followups: number; current_followups: number; new_followups: number;
  comparison: ReviewRecurrenceComparison | null;
} {
  if (previousRaw.length > 3_250_000 || currentRaw.length > 3_250_000) {
    throw new Error("Build 163 receipts exceed the 3.25 MB comparison bound.");
  }
  const beforeEnvelope = JSON.parse(previousRaw) as OwnerReviewFollowupReceipt;
  const afterEnvelope = JSON.parse(currentRaw) as OwnerReviewFollowupReceipt;
  if (beforeEnvelope.kind !== "rosevear_independent_reassignment_review_followup" ||
    afterEnvelope.kind !== "rosevear_independent_reassignment_review_followup" ||
    Date.parse(beforeEnvelope.exported_at) >= Date.parse(afterEnvelope.exported_at)) {
    throw new Error("Two chronological complete Build 163 private receipts are required.");
  }
  const before = parseOwnerReviewFollowupReceipt(previousRaw);
  const after = parseOwnerReviewFollowupReceipt(currentRaw);
  const prefix = (older: readonly unknown[], newer: readonly unknown[]) =>
    older.length <= newer.length && older.every((item, i) =>
      JSON.stringify(item) === JSON.stringify(newer[i]));
  const streams = ["handoffs", "events", "checks", "links", "reassessments", "followups",
    "decisions", "resolutions", "overdue_handoffs", "followup_reviews", "outcome_reviews",
    "recurrence_rechecks", "exception_watches", "watch_followup_audits", "reassignment_watches",
    "owner_review_followups"] as const;
  if (!prefix(before.trial.observations, after.trial.observations) ||
    !prefix(before.trial.source_readings, after.trial.source_readings) ||
    streams.some(stream => !prefix(before[stream], after[stream])) ||
    before.trial.environment.installed_version !== after.trial.environment.installed_version ||
    before.trial.environment.access !== after.trial.environment.access ||
    before.owner_review_followups.length === 0 ||
    before.owner_review_followups.length >= after.owner_review_followups.length) {
    throw new Error("Build 163 review evidence must be a nonempty exact append-only prefix with newer follow-ups; no witness is independently authenticated.");
  }
  let comparison: ReviewRecurrenceComparison | null = null;
  for (let later = before.owner_review_followups.length;
    later < after.owner_review_followups.length && !comparison; later++) {
    for (let earlier = before.owner_review_followups.length - 1; earlier >= 0; earlier--) {
      const old = after.owner_review_followups[earlier];
      const current = after.owner_review_followups[later];
      if (old.reassignment_watch_index !== current.reassignment_watch_index ||
        Date.parse(current.followup_observed_at) <= Date.parse(old.recorded_at)) continue;
      comparison = compareOwnerReviewRounds(after.owner_review_followups,
        after.trial.observations, after.checks, earlier, later, afterEnvelope.exported_at);
      break;
    }
  }
  return { previous_followups: before.owner_review_followups.length,
    current_followups: after.owner_review_followups.length,
    new_followups: after.owner_review_followups.length - before.owner_review_followups.length,
    comparison };
}
