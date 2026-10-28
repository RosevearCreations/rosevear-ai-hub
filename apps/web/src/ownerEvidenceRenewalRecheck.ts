/** Build 170: chronological private follow-up evidence renewal / source drift recheck. */
import { validateInstalledVersion, type TrialEnvironment } from "./ownerFieldTrial";
import type { TrialObservation } from "./ownerFieldTrial";
import type { SourceIdentityCheck } from "./ownerFieldRouting";
import type { OwnerReviewFollowup } from "./ownerReassignmentReviewFollowup";
import type { ReviewRecurrenceNote } from "./ownerReviewRecurrence";
import type { DispositionFollowup } from "./ownerRecurrenceDisposition";
import type { ContinuityWatchNote } from "./ownerDispositionContinuity";
import type { OutcomeNote } from "./ownerContinuityOutcome";
import type { AgingAuditNote } from "./ownerOutcomeAgingAudit";
import { parseAgingFollowupReceipt, validateAgingFollowups,
  type FollowupNote, type FollowupReceipt } from "./ownerOutcomeAgingFollowup";

export type RenewalSignal = "OWNER_OUTCOME_DRIFT_PERSISTS" |
  "OWNER_CLAIM_DRIFT_PERSISTS" | "NEW_OWNER_TRIAL_NOT_LINKED" |
  "SOURCE_RENEWED_PRIVATE_ONLY" | "SOURCE_RECHECK_NOT_RENEWED" |
  "SOURCE_ALIAS_OR_IDENTITY_DRIFT" | "SOURCE_VERSION_OR_ACCESS_DRIFT" |
  "SOURCE_IDENTITY_NOT_AUTHENTICATED" | "SOURCE_EVIDENCE_AGED" |
  "SOURCE_EVIDENCE_OVERDUE" | "REPEATED_OVERDUE_SOURCE_EVIDENCE" |
  "EARLIER_FOLLOWUP_AGED" | "EARLIER_FOLLOWUP_OVERDUE" |
  "INDEPENDENT_HOLD_CONTINUES";
export type RenewalCategory = "CONTINUE_INDEPENDENT_HOLD" |
  "REQUEST_OWNER_EVIDENCE_RECHECK" | "REQUEST_SOURCE_IDENTITY_DRIFT_RECHECK" |
  "REQUEST_OVERDUE_SOURCE_RENEWAL";
export const RENEWAL_CATEGORIES: readonly RenewalCategory[] = [
  "CONTINUE_INDEPENDENT_HOLD", "REQUEST_OWNER_EVIDENCE_RECHECK",
  "REQUEST_SOURCE_IDENTITY_DRIFT_RECHECK", "REQUEST_OVERDUE_SOURCE_RENEWAL",
];
export interface RenewalComparison {
  baseline_followup_index: number;
  latest_followup_index: number;
  reassignment_watch_index: number;
  case_id: FollowupNote["case_id"];
  baseline_at: string;
  latest_at: string;
  baseline_audit_index: number;
  latest_audit_index: number;
  baseline_owner_outcome: TrialObservation["outcome"];
  latest_owner_outcome: TrialObservation["outcome"];
  baseline_owner_claim: TrialObservation["next_owner"];
  latest_owner_claim: TrialObservation["next_owner"];
  baseline_source_check_index: number | null;
  latest_source_check_index: number | null;
  newer_owner_trial_since_followup: boolean;
  renewed_source_since_followup: boolean;
  source_identity_drift_claim: boolean;
  source_version_access_drift_claim: boolean;
  latest_confirmed_alias_claim: boolean;
  prior_source_age_days: number | null;
  latest_source_age_days: number | null;
  earlier_followup_age_days: number;
  age_band: "UNDER_THREE_DAYS" | "THREE_TO_SEVEN_DAYS" | "OVER_SEVEN_DAYS";
  signals: RenewalSignal[];
  unresolved: true;
}
export interface RenewalNote extends RenewalComparison {
  recorded_at: string;
  category: RenewalCategory;
  personally_rechecked: true;
  hold_acknowledged: true;
  state: "PRIVATE_EVIDENCE_RENEWAL_RECHECK_NOT_SENT";
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
}
export interface RenewalReceipt {
  kind: "rosevear_independent_evidence_renewal_drift_recheck";
  schema_version: 1;
  exported_at: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
  automatic_dispatch: "DISABLED";
  automatic_reassignment: "DISABLED";
  evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS";
  followup_receipt: FollowupReceipt;
  renewal_rechecks: RenewalNote[];
}
export const MAX_RENEWAL_RECHECK_BYTES = 5_850_000;
const DAY = 86_400_000;
const comparisonKeys = ["baseline_followup_index", "latest_followup_index",
  "reassignment_watch_index", "case_id", "baseline_at", "latest_at",
  "baseline_audit_index", "latest_audit_index", "baseline_owner_outcome", "latest_owner_outcome",
  "baseline_owner_claim", "latest_owner_claim", "baseline_source_check_index", "latest_source_check_index",
  "newer_owner_trial_since_followup", "renewed_source_since_followup", "source_identity_drift_claim",
  "source_version_access_drift_claim", "latest_confirmed_alias_claim", "prior_source_age_days",
  "latest_source_age_days", "earlier_followup_age_days", "age_band", "signals", "unresolved"] as const;
const noteKeys = [...comparisonKeys, "recorded_at", "category", "personally_rechecked",
  "hold_acknowledged", "state", "field_acceptance", "independent_review", "closure"];
function validTime(value: unknown): value is string {
  return typeof value === "string" && /^20\d\d-\d\d-\d\dT/.test(value) &&
    Number.isFinite(Date.parse(value)) && Date.parse(value) >= Date.parse("2020-01-01T00:00:00Z") &&
    Date.parse(value) <= Date.now() + 300_000;
}

/** All source claims remain indexed, pseudonymous and manually witnessed, never authenticated. */
export function compareEvidenceRenewal(rounds: readonly FollowupNote[],
  audits: readonly AgingAuditNote[], outcomes: readonly OutcomeNote[],
  watches: readonly ContinuityWatchNote[], dispositions: readonly DispositionFollowup[],
  recurrences: readonly ReviewRecurrenceNote[], followups: readonly OwnerReviewFollowup[],
  history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[],
  beforeIndex: number, afterIndex: number,
  at = new Date().toISOString()): RenewalComparison {
  const before = rounds[beforeIndex]; const after = rounds[afterIndex];
  if (!Number.isInteger(beforeIndex) || !Number.isInteger(afterIndex) ||
    beforeIndex < 0 || afterIndex <= beforeIndex || !before || !after ||
    before.case_id !== after.case_id ||
    before.reassignment_watch_index !== after.reassignment_watch_index ||
    before.latest_audit_index > after.latest_audit_index ||
    Date.parse(before.recorded_at) >= Date.parse(after.recorded_at) ||
    !validTime(at) || Date.parse(at) < Date.parse(after.recorded_at))
    throw new Error("Two chronological Build 169 follow-ups for one original held watch without audit regression are required.");
  validateAgingFollowups([before, after], audits, outcomes, watches, dispositions,
    recurrences, followups, history, checks);
  const oldCheck = before.latest_source_check_index === null ? null :
    checks[before.latest_source_check_index];
  const newCheck = after.latest_source_check_index === null ? null :
    checks[after.latest_source_check_index];
  const latestObs = audits[after.latest_audit_index]?.latest_observation_index;
  const observation = latestObs === undefined ? null : history[latestObs];
  const ownerRenewed = !!observation && observation.case_id === after.case_id &&
    observation.witnessed_by_operator &&
    Date.parse(observation.observed_at) > Date.parse(before.recorded_at);
  const sourceRenewed = !!newCheck &&
    after.latest_source_check_index !== before.latest_source_check_index &&
    Date.parse(newCheck.captured_at) > Date.parse(before.recorded_at) &&
    (!oldCheck || Date.parse(newCheck.captured_at) > Date.parse(oldCheck.captured_at));
  const identityDrift = !!oldCheck && !!newCheck &&
    (oldCheck.safe_alias !== newCheck.safe_alias || oldCheck.identity_state !== newCheck.identity_state);
  const accessDrift = !!oldCheck && !!newCheck &&
    (oldCheck.installed_version !== newCheck.installed_version || oldCheck.access !== newCheck.access);
  const priorAge = oldCheck ? Math.floor((Date.parse(at) - Date.parse(oldCheck.captured_at)) / DAY) : null;
  const latestAge = newCheck ? Math.floor((Date.parse(at) - Date.parse(newCheck.captured_at)) / DAY) : null;
  const followupAge = Math.floor((Date.parse(at) - Date.parse(before.recorded_at)) / DAY);
  const signals: RenewalSignal[] = [];
  if (before.latest_owner_outcome !== after.latest_owner_outcome) signals.push("OWNER_OUTCOME_DRIFT_PERSISTS");
  if (before.latest_owner_claim !== after.latest_owner_claim) signals.push("OWNER_CLAIM_DRIFT_PERSISTS");
  if (!ownerRenewed) signals.push("NEW_OWNER_TRIAL_NOT_LINKED");
  if (sourceRenewed) signals.push("SOURCE_RENEWED_PRIVATE_ONLY");
  else signals.push("SOURCE_RECHECK_NOT_RENEWED");
  if (identityDrift) signals.push("SOURCE_ALIAS_OR_IDENTITY_DRIFT");
  if (accessDrift) signals.push("SOURCE_VERSION_OR_ACCESS_DRIFT");
  if (!newCheck || newCheck.identity_state !== "confirmed_alias")
    signals.push("SOURCE_IDENTITY_NOT_AUTHENTICATED");
  if (latestAge !== null && latestAge >= 3) signals.push("SOURCE_EVIDENCE_AGED");
  if (latestAge === null || latestAge > 7) signals.push("SOURCE_EVIDENCE_OVERDUE");
  if ((priorAge === null || priorAge > 7) && (latestAge === null || latestAge > 7))
    signals.push("REPEATED_OVERDUE_SOURCE_EVIDENCE");
  if (followupAge >= 3) signals.push("EARLIER_FOLLOWUP_AGED");
  if (followupAge > 7) signals.push("EARLIER_FOLLOWUP_OVERDUE");
  signals.push("INDEPENDENT_HOLD_CONTINUES");
  return { baseline_followup_index: beforeIndex, latest_followup_index: afterIndex,
    reassignment_watch_index: before.reassignment_watch_index, case_id: before.case_id,
    baseline_at: before.recorded_at, latest_at: after.recorded_at,
    baseline_audit_index: before.latest_audit_index, latest_audit_index: after.latest_audit_index,
    baseline_owner_outcome: before.latest_owner_outcome, latest_owner_outcome: after.latest_owner_outcome,
    baseline_owner_claim: before.latest_owner_claim, latest_owner_claim: after.latest_owner_claim,
    baseline_source_check_index: before.latest_source_check_index,
    latest_source_check_index: after.latest_source_check_index,
    newer_owner_trial_since_followup: ownerRenewed, renewed_source_since_followup: sourceRenewed,
    source_identity_drift_claim: identityDrift, source_version_access_drift_claim: accessDrift,
    latest_confirmed_alias_claim: !!newCheck && newCheck.identity_state === "confirmed_alias",
    prior_source_age_days: priorAge, latest_source_age_days: latestAge,
    earlier_followup_age_days: followupAge,
    age_band: followupAge > 7 ? "OVER_SEVEN_DAYS" : followupAge >= 3 ?
      "THREE_TO_SEVEN_DAYS" : "UNDER_THREE_DAYS", signals, unresolved: true };
}

export function validateRenewalRechecks(notes: readonly RenewalNote[], rounds: readonly FollowupNote[],
  audits: readonly AgingAuditNote[], outcomes: readonly OutcomeNote[],
  watches: readonly ContinuityWatchNote[], dispositions: readonly DispositionFollowup[],
  recurrences: readonly ReviewRecurrenceNote[], followups: readonly OwnerReviewFollowup[],
  history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[],
  exportedAt?: string): void {
  if (notes.length > 100) throw new Error("Build 170 supports at most 100 private drift rechecks.");
  let prior = 0; const seen = new Set<string>();
  for (const note of notes) {
    if (!note || Object.keys(note).length !== noteKeys.length ||
      Object.keys(note).some(key => !noteKeys.includes(key)) || !validTime(note.recorded_at) ||
      !RENEWAL_CATEGORIES.includes(note.category) || note.personally_rechecked !== true ||
      note.hold_acknowledged !== true || note.state !== "PRIVATE_EVIDENCE_RENEWAL_RECHECK_NOT_SENT" ||
      note.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
      note.independent_review !== "INDEPENDENT_REVIEW_HOLD" || note.closure !== "NOT_AUTHORIZED")
      throw new Error("Unsafe Build 170 immutable independent HOLD fields.");
    const when = Date.parse(note.recorded_at);
    if (when < prior || exportedAt && when > Date.parse(exportedAt))
      throw new Error("Build 170 drift recheck chronology invalid.");
    const expected = compareEvidenceRenewal(rounds, audits, outcomes, watches,
      dispositions, recurrences, followups, history, checks,
      note.baseline_followup_index, note.latest_followup_index, note.recorded_at);
    if (comparisonKeys.some(key => JSON.stringify(note[key]) !== JSON.stringify(expected[key])))
      throw new Error("Build 170 altered immutable source renewal, identity or aging evidence.");
    if (note.category === "REQUEST_OWNER_EVIDENCE_RECHECK" &&
      !expected.signals.some(signal => ["OWNER_OUTCOME_DRIFT_PERSISTS", "OWNER_CLAIM_DRIFT_PERSISTS",
        "NEW_OWNER_TRIAL_NOT_LINKED"].includes(signal)) ||
      note.category === "REQUEST_SOURCE_IDENTITY_DRIFT_RECHECK" &&
      !expected.signals.some(signal => ["SOURCE_ALIAS_OR_IDENTITY_DRIFT",
        "SOURCE_VERSION_OR_ACCESS_DRIFT", "SOURCE_IDENTITY_NOT_AUTHENTICATED"].includes(signal)) ||
      note.category === "REQUEST_OVERDUE_SOURCE_RENEWAL" &&
      !expected.signals.includes("SOURCE_EVIDENCE_OVERDUE"))
      throw new Error("Build 170 category requires matching unresolved evidence.");
    const key = `${note.baseline_followup_index}:${note.latest_followup_index}:${note.category}`;
    if (seen.has(key)) throw new Error("Duplicate Build 170 private source drift recheck.");
    seen.add(key); prior = when;
  }
}

/** A stale source can be documented as an exception, but never certified as renewed. */
export function recordRenewalRecheck(rounds: readonly FollowupNote[],
  audits: readonly AgingAuditNote[], outcomes: readonly OutcomeNote[],
  watches: readonly ContinuityWatchNote[], dispositions: readonly DispositionFollowup[],
  recurrences: readonly ReviewRecurrenceNote[], followups: readonly OwnerReviewFollowup[],
  history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[],
  existing: readonly RenewalNote[], environment: TrialEnvironment,
  imported: { followups: number; rechecks: number },
  input: { baseline_followup_index: number; latest_followup_index: number;
    category: RenewalCategory; personally_rechecked: boolean; hold_acknowledged: boolean },
  at = new Date().toISOString()): RenewalNote[] {
  if (!environment.installed_windows_witnessed || !validateInstalledVersion(environment.installed_version) ||
    environment.access === "unknown" || input.latest_followup_index < imported.followups ||
    existing.length < imported.rechecks || !input.personally_rechecked ||
    !input.hold_acknowledged || !RENEWAL_CATEGORIES.includes(input.category))
    throw new Error("Build 170 requires non-imported follow-up, installed Windows witness and two HOLD confirmations.");
  const comparison = compareEvidenceRenewal(rounds, audits, outcomes, watches,
    dispositions, recurrences, followups, history, checks,
    input.baseline_followup_index, input.latest_followup_index, at);
  const notes: RenewalNote[] = [...existing, { ...comparison, recorded_at: at,
    category: input.category, personally_rechecked: true, hold_acknowledged: true,
    state: "PRIVATE_EVIDENCE_RENEWAL_RECHECK_NOT_SENT", field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED" }];
  validateRenewalRechecks(notes, rounds, audits, outcomes, watches, dispositions,
    recurrences, followups, history, checks);
  return notes;
}

export function createRenewalReceipt(prior: FollowupReceipt,
  notes: readonly RenewalNote[], at = new Date().toISOString()): RenewalReceipt {
  if (prior.kind !== "rosevear_independent_outcome_aging_followup_reconciliation" ||
    !validTime(at) || Date.parse(at) < Date.parse(prior.exported_at))
    throw new Error("Build 170 requires a chronological complete Build 169 follow-up receipt.");
  const nested = parseAgingFollowupReceipt(JSON.stringify(prior));
  validateRenewalRechecks(notes, nested.aging_followups, nested.aging_audits,
    nested.outcome_notes, nested.continuity_watches, nested.disposition_followups,
    nested.review_recurrences, nested.owner_review_followups, nested.trial.observations,
    nested.checks, at);
  const receipt: RenewalReceipt = {
    kind: "rosevear_independent_evidence_renewal_drift_recheck", schema_version: 1,
    exported_at: at, field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED",
    automatic_dispatch: "DISABLED", automatic_reassignment: "DISABLED",
    evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS", followup_receipt: prior,
    renewal_rechecks: notes.map(note => ({ ...note, signals: [...note.signals] })),
  };
  if (JSON.stringify(receipt).length > MAX_RENEWAL_RECHECK_BYTES)
    throw new Error("Build 170 private receipt exceeds 5.85 MB.");
  return receipt;
}

/** Imports remain historical operator testimony: they cannot set fresh Windows witness state. */
export function parseRenewalReceipt(raw: string):
  ReturnType<typeof parseAgingFollowupReceipt> & { renewal_rechecks: RenewalNote[] } {
  if (raw.length > MAX_RENEWAL_RECHECK_BYTES) throw new Error("Build 170 receipt exceeds 5.85 MB.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Invalid private Build 170 JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid Build 170 private receipt envelope.");
  const obj = value as Record<string, unknown>;
  if (obj.kind !== "rosevear_independent_evidence_renewal_drift_recheck")
    return { ...parseAgingFollowupReceipt(raw), renewal_rechecks: [] };
  const keys = ["kind", "schema_version", "exported_at", "field_acceptance",
    "independent_review", "closure", "automatic_dispatch", "automatic_reassignment",
    "evidence_authenticity", "followup_receipt", "renewal_rechecks"];
  if (Object.keys(obj).length !== keys.length || Object.keys(obj).some(key => !keys.includes(key)) ||
    obj.schema_version !== 1 || !validTime(obj.exported_at) ||
    obj.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
    obj.independent_review !== "INDEPENDENT_REVIEW_HOLD" ||
    obj.closure !== "NOT_AUTHORIZED" || obj.automatic_dispatch !== "DISABLED" ||
    obj.automatic_reassignment !== "DISABLED" ||
    obj.evidence_authenticity !== "UNVERIFIED_PRIVATE_ATTESTATIONS" ||
    !obj.followup_receipt || !Array.isArray(obj.renewal_rechecks))
    throw new Error("Unsafe Build 170 independent HOLD receipt.");
  const prior = obj.followup_receipt as FollowupReceipt;
  if (prior.kind !== "rosevear_independent_outcome_aging_followup_reconciliation" ||
    Date.parse(prior.exported_at) > Date.parse(obj.exported_at as string))
    throw new Error("Build 170 nested Build 169 chronology invalid.");
  const nested = parseAgingFollowupReceipt(JSON.stringify(prior));
  const notes = obj.renewal_rechecks as RenewalNote[];
  validateRenewalRechecks(notes, nested.aging_followups, nested.aging_audits,
    nested.outcome_notes, nested.continuity_watches, nested.disposition_followups,
    nested.review_recurrences, nested.owner_review_followups, nested.trial.observations,
    nested.checks, obj.exported_at as string);
  return { ...nested, renewal_rechecks: notes.map(note => ({ ...note, signals: [...note.signals] })) };
}

/** Structural comparison of complete Build 169 receipts only, not approval or authentication. */
export function comparePrivateFollowupReceipts(previousRaw: string, currentRaw: string): {
  previous_followups: number; current_followups: number; new_followups: number;
  comparison: RenewalComparison | null;
} {
  if (previousRaw.length > 5_450_000 || currentRaw.length > 5_450_000)
    throw new Error("Build 169 complete comparison receipts exceed 5.45 MB.");
  let previous: FollowupReceipt; let current: FollowupReceipt;
  try { previous = JSON.parse(previousRaw) as FollowupReceipt;
    current = JSON.parse(currentRaw) as FollowupReceipt; }
  catch { throw new Error("Invalid Build 169 complete comparison JSON."); }
  if (previous?.kind !== "rosevear_independent_outcome_aging_followup_reconciliation" ||
    current?.kind !== "rosevear_independent_outcome_aging_followup_reconciliation" ||
    Date.parse(previous.exported_at) >= Date.parse(current.exported_at))
    throw new Error("Two chronological complete Build 169 receipts are required.");
  const before = parseAgingFollowupReceipt(previousRaw);
  const after = parseAgingFollowupReceipt(currentRaw);
  const prefix = (old: readonly unknown[], next: readonly unknown[]) =>
    old.length <= next.length && old.every((item, index) => JSON.stringify(item) === JSON.stringify(next[index]));
  const streams = ["handoffs", "events", "checks", "links", "reassessments", "followups",
    "decisions", "resolutions", "overdue_handoffs", "followup_reviews", "outcome_reviews",
    "recurrence_rechecks", "exception_watches", "watch_followup_audits", "reassignment_watches",
    "owner_review_followups", "review_recurrences", "disposition_followups",
    "continuity_watches", "outcome_notes", "aging_audits", "aging_followups"] as const;
  if (!prefix(before.trial.observations, after.trial.observations) ||
    !prefix(before.trial.source_readings, after.trial.source_readings) ||
    streams.some(key => !prefix(before[key], after[key])) ||
    before.trial.environment.installed_version !== after.trial.environment.installed_version ||
    before.trial.environment.access !== after.trial.environment.access ||
    !before.aging_followups.length ||
    before.aging_followups.length >= after.aging_followups.length)
    throw new Error("Build 169 evidence must be an exact nonempty append-only prefix with newer follow-ups.");
  let comparison: RenewalComparison | null = null;
  for (let later = before.aging_followups.length; later < after.aging_followups.length && !comparison; later++) {
    for (let earlier = before.aging_followups.length - 1; earlier >= 0; earlier--) {
      if (after.aging_followups[earlier].reassignment_watch_index !==
        after.aging_followups[later].reassignment_watch_index ||
        after.aging_followups[earlier].latest_audit_index >
        after.aging_followups[later].latest_audit_index) continue;
      comparison = compareEvidenceRenewal(after.aging_followups, after.aging_audits,
        after.outcome_notes, after.continuity_watches, after.disposition_followups,
        after.review_recurrences, after.owner_review_followups, after.trial.observations,
        after.checks, earlier, later, current.exported_at);
      break;
    }
  }
  return { previous_followups: before.aging_followups.length,
    current_followups: after.aging_followups.length,
    new_followups: after.aging_followups.length - before.aging_followups.length,
    comparison };
}
