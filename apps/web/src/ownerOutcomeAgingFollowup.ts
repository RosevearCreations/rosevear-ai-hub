/** Build 169: operator-only follow-up comparison of two private Build 168 HOLD audits. */
import { validateInstalledVersion, type TrialEnvironment, type TrialObservation } from "./ownerFieldTrial";
import type { SourceIdentityCheck } from "./ownerFieldRouting";
import type { OwnerReviewFollowup } from "./ownerReassignmentReviewFollowup";
import type { ReviewRecurrenceNote } from "./ownerReviewRecurrence";
import type { DispositionFollowup } from "./ownerRecurrenceDisposition";
import type { ContinuityWatchNote } from "./ownerDispositionContinuity";
import type { OutcomeNote } from "./ownerContinuityOutcome";
import { parseAgingAuditReceipt, validateAgingAudits, type AgingAuditNote,
  type AgingAuditReceipt } from "./ownerOutcomeAgingAudit";

export type FollowupSignal = "OWNER_OUTCOME_DRIFT_CONTINUES" |
  "OWNER_CLAIM_CONFLICT_CONTINUES" | "NEW_OWNER_TRIAL_NOT_WITNESSED" |
  "SOURCE_RENEWED_ONLY_AS_PRIVATE_CLAIM" | "SOURCE_NOT_RENEWED_AFTER_PRIOR_AUDIT" |
  "SOURCE_ALIAS_OR_IDENTITY_CHANGED" | "SOURCE_IDENTITY_NOT_AUTHENTICATED" |
  "SOURCE_EVIDENCE_AGED" | "SOURCE_EVIDENCE_OVERDUE" |
  "REPEATED_OVERDUE_SOURCE_EVIDENCE" | "PRIOR_AGING_AUDIT_AGED" |
  "PRIOR_AGING_AUDIT_OVERDUE" | "INDEPENDENT_REVIEW_HOLD_PERSISTS";
export type FollowupCategory = "CONTINUE_INDEPENDENT_HOLD" |
  "REQUEST_OWNER_OUTCOME_FOLLOWUP" | "REQUEST_OVERDUE_SOURCE_RECHECK" |
  "REQUEST_INDEPENDENT_CONTINUITY_REVIEW";
export const FOLLOWUP_CATEGORIES: readonly FollowupCategory[] = [
  "CONTINUE_INDEPENDENT_HOLD", "REQUEST_OWNER_OUTCOME_FOLLOWUP",
  "REQUEST_OVERDUE_SOURCE_RECHECK", "REQUEST_INDEPENDENT_CONTINUITY_REVIEW",
];
export interface FollowupComparison {
  baseline_audit_index: number;
  latest_audit_index: number;
  reassignment_watch_index: number;
  case_id: AgingAuditNote["case_id"];
  baseline_at: string;
  latest_at: string;
  baseline_outcome_index: number;
  latest_outcome_index: number;
  baseline_owner_outcome: TrialObservation["outcome"];
  latest_owner_outcome: TrialObservation["outcome"];
  baseline_owner_claim: TrialObservation["next_owner"];
  latest_owner_claim: TrialObservation["next_owner"];
  latest_observation_index: number;
  baseline_source_check_index: number | null;
  latest_source_check_index: number | null;
  newer_witnessed_owner_trial: boolean;
  source_renewed_since_audit: boolean;
  latest_source_confirmed_alias_claim: boolean;
  source_age_days: number | null;
  earlier_source_age_days: number | null;
  prior_audit_age_days: number;
  age_band: "UNDER_THREE_DAYS" | "THREE_TO_SEVEN_DAYS" | "OVER_SEVEN_DAYS";
  signals: FollowupSignal[];
  unresolved: true;
}
export interface FollowupNote extends FollowupComparison {
  recorded_at: string;
  category: FollowupCategory;
  personally_compared: true;
  hold_acknowledged: true;
  state: "PRIVATE_OUTCOME_AGING_FOLLOWUP_NOT_SENT";
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
}
export interface FollowupReceipt {
  kind: "rosevear_independent_outcome_aging_followup_reconciliation";
  schema_version: 1;
  exported_at: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
  automatic_dispatch: "DISABLED";
  automatic_reassignment: "DISABLED";
  evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS";
  aging_receipt: AgingAuditReceipt;
  aging_followups: FollowupNote[];
}
export const MAX_AGING_FOLLOWUP_BYTES = 5_450_000;
const DAY = 86_400_000;
const comparisonKeys = ["baseline_audit_index", "latest_audit_index", "reassignment_watch_index",
  "case_id", "baseline_at", "latest_at", "baseline_outcome_index", "latest_outcome_index",
  "baseline_owner_outcome", "latest_owner_outcome", "baseline_owner_claim", "latest_owner_claim",
  "latest_observation_index", "baseline_source_check_index", "latest_source_check_index",
  "newer_witnessed_owner_trial", "source_renewed_since_audit", "latest_source_confirmed_alias_claim",
  "source_age_days", "earlier_source_age_days", "prior_audit_age_days", "age_band",
  "signals", "unresolved"] as const;
const noteKeys = [...comparisonKeys, "recorded_at", "category", "personally_compared",
  "hold_acknowledged", "state", "field_acceptance", "independent_review", "closure"];
function validTime(value: unknown): value is string {
  return typeof value === "string" && /^20\d\d-\d\d-\d\dT/.test(value) &&
    Number.isFinite(Date.parse(value)) && Date.parse(value) >= Date.parse("2020-01-01T00:00:00Z") &&
    Date.parse(value) <= Date.now() + 300_000;
}

/** The only source link is the immutable pseudonymous alias indexed by each Build 168 audit. */
export function compareAgingFollowups(audits: readonly AgingAuditNote[],
  outcomes: readonly OutcomeNote[], watches: readonly ContinuityWatchNote[],
  dispositions: readonly DispositionFollowup[], recurrences: readonly ReviewRecurrenceNote[],
  followups: readonly OwnerReviewFollowup[], history: readonly TrialObservation[],
  checks: readonly SourceIdentityCheck[], beforeIndex: number, afterIndex: number,
  at = new Date().toISOString()): FollowupComparison {
  const before = audits[beforeIndex]; const after = audits[afterIndex];
  if (!Number.isInteger(beforeIndex) || !Number.isInteger(afterIndex) ||
    beforeIndex < 0 || afterIndex <= beforeIndex || !before || !after ||
    before.reassignment_watch_index !== after.reassignment_watch_index ||
    before.case_id !== after.case_id ||
    before.latest_outcome_index >= after.latest_outcome_index ||
    Date.parse(before.recorded_at) >= Date.parse(after.recorded_at) ||
    !validTime(at) || Date.parse(at) < Date.parse(after.recorded_at)) {
    throw new Error("Two chronological Build 168 audits with a newer same-case held outcome are required.");
  }
  validateAgingAudits([before, after], outcomes, watches, dispositions, recurrences,
    followups, history, checks);
  const earlierSource = before.latest_source_check_index === null ? null :
    checks[before.latest_source_check_index];
  const latestSource = after.latest_source_check_index === null ? null :
    checks[after.latest_source_check_index];
  const observation = history[after.latest_observation_index];
  const trialRenewed = !!observation && observation.case_id === after.case_id &&
    observation.witnessed_by_operator &&
    Date.parse(observation.observed_at) > Date.parse(before.recorded_at) &&
    after.latest_observation_index !== before.latest_observation_index;
  const sourceRenewed = !!latestSource &&
    Date.parse(latestSource.captured_at) > Date.parse(before.recorded_at) &&
    after.latest_source_check_index !== before.latest_source_check_index &&
    (!earlierSource || Date.parse(latestSource.captured_at) > Date.parse(earlierSource.captured_at));
  const sourceAge = latestSource ? Math.floor((Date.parse(at) - Date.parse(latestSource.captured_at)) / DAY) : null;
  const earlierAge = earlierSource ? Math.floor((Date.parse(at) - Date.parse(earlierSource.captured_at)) / DAY) : null;
  const auditAge = Math.floor((Date.parse(at) - Date.parse(before.recorded_at)) / DAY);
  const signals: FollowupSignal[] = [];
  if (before.latest_owner_outcome !== after.latest_owner_outcome) signals.push("OWNER_OUTCOME_DRIFT_CONTINUES");
  if (before.latest_owner_claim !== after.latest_owner_claim) signals.push("OWNER_CLAIM_CONFLICT_CONTINUES");
  if (!trialRenewed) signals.push("NEW_OWNER_TRIAL_NOT_WITNESSED");
  if (sourceRenewed) signals.push("SOURCE_RENEWED_ONLY_AS_PRIVATE_CLAIM");
  else signals.push("SOURCE_NOT_RENEWED_AFTER_PRIOR_AUDIT");
  if (earlierSource && latestSource && (earlierSource.safe_alias !== latestSource.safe_alias ||
    earlierSource.identity_state !== latestSource.identity_state ||
    earlierSource.installed_version !== latestSource.installed_version ||
    earlierSource.access !== latestSource.access)) signals.push("SOURCE_ALIAS_OR_IDENTITY_CHANGED");
  if (!latestSource || latestSource.identity_state !== "confirmed_alias")
    signals.push("SOURCE_IDENTITY_NOT_AUTHENTICATED");
  if (sourceAge !== null && sourceAge >= 3) signals.push("SOURCE_EVIDENCE_AGED");
  if (sourceAge === null || sourceAge > 7) signals.push("SOURCE_EVIDENCE_OVERDUE");
  if ((earlierAge === null || earlierAge > 7) && (sourceAge === null || sourceAge > 7))
    signals.push("REPEATED_OVERDUE_SOURCE_EVIDENCE");
  if (auditAge >= 3) signals.push("PRIOR_AGING_AUDIT_AGED");
  if (auditAge > 7) signals.push("PRIOR_AGING_AUDIT_OVERDUE");
  signals.push("INDEPENDENT_REVIEW_HOLD_PERSISTS");
  return { baseline_audit_index: beforeIndex, latest_audit_index: afterIndex,
    reassignment_watch_index: before.reassignment_watch_index, case_id: before.case_id,
    baseline_at: before.recorded_at, latest_at: after.recorded_at,
    baseline_outcome_index: before.latest_outcome_index,
    latest_outcome_index: after.latest_outcome_index,
    baseline_owner_outcome: before.latest_owner_outcome,
    latest_owner_outcome: after.latest_owner_outcome,
    baseline_owner_claim: before.latest_owner_claim, latest_owner_claim: after.latest_owner_claim,
    latest_observation_index: after.latest_observation_index,
    baseline_source_check_index: before.latest_source_check_index,
    latest_source_check_index: after.latest_source_check_index,
    newer_witnessed_owner_trial: trialRenewed,
    source_renewed_since_audit: sourceRenewed,
    latest_source_confirmed_alias_claim: !!latestSource && latestSource.identity_state === "confirmed_alias",
    source_age_days: sourceAge, earlier_source_age_days: earlierAge,
    prior_audit_age_days: auditAge, age_band: auditAge > 7 ? "OVER_SEVEN_DAYS" :
      auditAge >= 3 ? "THREE_TO_SEVEN_DAYS" : "UNDER_THREE_DAYS",
    signals, unresolved: true };
}

export function validateAgingFollowups(notes: readonly FollowupNote[], audits: readonly AgingAuditNote[],
  outcomes: readonly OutcomeNote[], watches: readonly ContinuityWatchNote[],
  dispositions: readonly DispositionFollowup[], recurrences: readonly ReviewRecurrenceNote[],
  followups: readonly OwnerReviewFollowup[], history: readonly TrialObservation[],
  checks: readonly SourceIdentityCheck[], exportedAt?: string): void {
  if (notes.length > 100) throw new Error("Build 169 supports at most 100 private follow-up reconciliations.");
  const seen = new Set<string>(); let previous = 0;
  for (const note of notes) {
    if (!note || Object.keys(note).length !== noteKeys.length ||
      Object.keys(note).some(key => !noteKeys.includes(key)) || !validTime(note.recorded_at) ||
      !FOLLOWUP_CATEGORIES.includes(note.category) || note.personally_compared !== true ||
      note.hold_acknowledged !== true || note.state !== "PRIVATE_OUTCOME_AGING_FOLLOWUP_NOT_SENT" ||
      note.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
      note.independent_review !== "INDEPENDENT_REVIEW_HOLD" || note.closure !== "NOT_AUTHORIZED")
      throw new Error("Unsafe Build 169 immutable independent HOLD fields.");
    const when = Date.parse(note.recorded_at);
    if (when < previous || exportedAt && when > Date.parse(exportedAt))
      throw new Error("Build 169 follow-up chronology is invalid.");
    const expected = compareAgingFollowups(audits, outcomes, watches, dispositions,
      recurrences, followups, history, checks, note.baseline_audit_index,
      note.latest_audit_index, note.recorded_at);
    if (comparisonKeys.some(key => JSON.stringify(note[key]) !== JSON.stringify(expected[key])))
      throw new Error("Build 169 altered immutable source continuity, aging or owner evidence.");
    if (note.category === "REQUEST_OWNER_OUTCOME_FOLLOWUP" &&
      !expected.signals.some(signal => ["OWNER_OUTCOME_DRIFT_CONTINUES",
        "OWNER_CLAIM_CONFLICT_CONTINUES"].includes(signal)) ||
      note.category === "REQUEST_OVERDUE_SOURCE_RECHECK" &&
      !expected.signals.includes("SOURCE_EVIDENCE_OVERDUE") ||
      note.category === "REQUEST_INDEPENDENT_CONTINUITY_REVIEW" &&
      !expected.signals.includes("PRIOR_AGING_AUDIT_OVERDUE"))
      throw new Error("Build 169 follow-up category needs matching evidence signal.");
    const key = `${note.baseline_audit_index}:${note.latest_audit_index}:${note.category}`;
    if (seen.has(key)) throw new Error("Duplicate Build 169 private aging follow-up.");
    seen.add(key); previous = when;
  }
}

export function recordAgingFollowup(audits: readonly AgingAuditNote[],
  outcomes: readonly OutcomeNote[], watches: readonly ContinuityWatchNote[],
  dispositions: readonly DispositionFollowup[], recurrences: readonly ReviewRecurrenceNote[],
  followups: readonly OwnerReviewFollowup[], history: readonly TrialObservation[],
  checks: readonly SourceIdentityCheck[], existing: readonly FollowupNote[],
  environment: TrialEnvironment, imported: { audits: number; followups: number },
  input: { baseline_audit_index: number; latest_audit_index: number; category: FollowupCategory;
    personally_compared: boolean; hold_acknowledged: boolean },
  at = new Date().toISOString()): FollowupNote[] {
  if (!environment.installed_windows_witnessed || !validateInstalledVersion(environment.installed_version) ||
    environment.access === "unknown" || input.latest_audit_index < imported.audits ||
    existing.length < imported.followups || !input.personally_compared ||
    !input.hold_acknowledged || !FOLLOWUP_CATEGORIES.includes(input.category))
    throw new Error("Build 169 requires non-imported audit, witnessed Windows Hub and separate HOLD confirmations.");
  const comparison = compareAgingFollowups(audits, outcomes, watches, dispositions,
    recurrences, followups, history, checks, input.baseline_audit_index,
    input.latest_audit_index, at);
  if (!comparison.newer_witnessed_owner_trial)
    throw new Error("Build 169 requires a genuinely newer witnessed owner trial after the earlier aging audit.");
  const next: FollowupNote[] = [...existing, { ...comparison, recorded_at: at,
    category: input.category, personally_compared: true, hold_acknowledged: true,
    state: "PRIVATE_OUTCOME_AGING_FOLLOWUP_NOT_SENT", field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED" }];
  validateAgingFollowups(next, audits, outcomes, watches, dispositions, recurrences,
    followups, history, checks);
  return next;
}

export function createAgingFollowupReceipt(prior: AgingAuditReceipt,
  notes: readonly FollowupNote[], at = new Date().toISOString()): FollowupReceipt {
  if (prior.kind !== "rosevear_independent_continuity_outcome_aging_audit" ||
    !validTime(at) || Date.parse(at) < Date.parse(prior.exported_at))
    throw new Error("Build 169 requires a chronological complete Build 168 aging receipt.");
  const nested = parseAgingAuditReceipt(JSON.stringify(prior));
  validateAgingFollowups(notes, nested.aging_audits, nested.outcome_notes,
    nested.continuity_watches, nested.disposition_followups, nested.review_recurrences,
    nested.owner_review_followups, nested.trial.observations, nested.checks, at);
  const receipt: FollowupReceipt = {
    kind: "rosevear_independent_outcome_aging_followup_reconciliation", schema_version: 1,
    exported_at: at, field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED",
    automatic_dispatch: "DISABLED", automatic_reassignment: "DISABLED",
    evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS", aging_receipt: prior,
    aging_followups: notes.map(note => ({ ...note, signals: [...note.signals] })),
  };
  if (JSON.stringify(receipt).length > MAX_AGING_FOLLOWUP_BYTES)
    throw new Error("Build 169 receipt exceeds 5.45 MB.");
  return receipt;
}

/** Historical-only import. A JSON witness never becomes real installed Windows acceptance. */
export function parseAgingFollowupReceipt(raw: string):
  ReturnType<typeof parseAgingAuditReceipt> & { aging_followups: FollowupNote[] } {
  if (raw.length > MAX_AGING_FOLLOWUP_BYTES) throw new Error("Build 169 receipt exceeds 5.45 MB.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Invalid private Build 169 JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid Build 169 receipt envelope.");
  const obj = value as Record<string, unknown>;
  if (obj.kind !== "rosevear_independent_outcome_aging_followup_reconciliation")
    return { ...parseAgingAuditReceipt(raw), aging_followups: [] };
  const keys = ["kind", "schema_version", "exported_at", "field_acceptance",
    "independent_review", "closure", "automatic_dispatch", "automatic_reassignment",
    "evidence_authenticity", "aging_receipt", "aging_followups"];
  if (Object.keys(obj).length !== keys.length || Object.keys(obj).some(key => !keys.includes(key)) ||
    obj.schema_version !== 1 || !validTime(obj.exported_at) ||
    obj.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
    obj.independent_review !== "INDEPENDENT_REVIEW_HOLD" ||
    obj.closure !== "NOT_AUTHORIZED" || obj.automatic_dispatch !== "DISABLED" ||
    obj.automatic_reassignment !== "DISABLED" ||
    obj.evidence_authenticity !== "UNVERIFIED_PRIVATE_ATTESTATIONS" ||
    !obj.aging_receipt || !Array.isArray(obj.aging_followups))
    throw new Error("Unsafe Build 169 private independent HOLD receipt.");
  const prior = obj.aging_receipt as AgingAuditReceipt;
  if (prior.kind !== "rosevear_independent_continuity_outcome_aging_audit" ||
    Date.parse(prior.exported_at) > Date.parse(obj.exported_at as string))
    throw new Error("Build 169 nested Build 168 receipt chronology is invalid.");
  const nested = parseAgingAuditReceipt(JSON.stringify(prior));
  const notes = obj.aging_followups as FollowupNote[];
  validateAgingFollowups(notes, nested.aging_audits, nested.outcome_notes,
    nested.continuity_watches, nested.disposition_followups, nested.review_recurrences,
    nested.owner_review_followups, nested.trial.observations, nested.checks,
    obj.exported_at as string);
  return { ...nested, aging_followups: notes.map(note => ({ ...note, signals: [...note.signals] })) };
}

/** Compare entire private Build 168 export chains as exact append-only prefixes. */
export function comparePrivateAgingReceipts(previousRaw: string, currentRaw: string): {
  previous_audits: number; current_audits: number; new_audits: number;
  comparison: FollowupComparison | null;
} {
  if (previousRaw.length > 5_050_000 || currentRaw.length > 5_050_000)
    throw new Error("Complete Build 168 receipts exceed 5.05 MB.");
  let previous: AgingAuditReceipt; let current: AgingAuditReceipt;
  try { previous = JSON.parse(previousRaw) as AgingAuditReceipt;
    current = JSON.parse(currentRaw) as AgingAuditReceipt; }
  catch { throw new Error("Invalid complete Build 168 comparison JSON."); }
  if (previous?.kind !== "rosevear_independent_continuity_outcome_aging_audit" ||
    current?.kind !== "rosevear_independent_continuity_outcome_aging_audit" ||
    Date.parse(previous.exported_at) >= Date.parse(current.exported_at))
    throw new Error("Two chronological complete Build 168 audit receipts are required.");
  const before = parseAgingAuditReceipt(previousRaw);
  const after = parseAgingAuditReceipt(currentRaw);
  const prefix = (old: readonly unknown[], next: readonly unknown[]) =>
    old.length <= next.length && old.every((item, index) => JSON.stringify(item) === JSON.stringify(next[index]));
  const streams = ["handoffs", "events", "checks", "links", "reassessments", "followups",
    "decisions", "resolutions", "overdue_handoffs", "followup_reviews", "outcome_reviews",
    "recurrence_rechecks", "exception_watches", "watch_followup_audits", "reassignment_watches",
    "owner_review_followups", "review_recurrences", "disposition_followups",
    "continuity_watches", "outcome_notes", "aging_audits"] as const;
  if (!prefix(before.trial.observations, after.trial.observations) ||
    !prefix(before.trial.source_readings, after.trial.source_readings) ||
    streams.some(key => !prefix(before[key], after[key])) ||
    before.trial.environment.installed_version !== after.trial.environment.installed_version ||
    before.trial.environment.access !== after.trial.environment.access ||
    !before.aging_audits.length || before.aging_audits.length >= after.aging_audits.length)
    throw new Error("Build 168 receipt evidence must be an exact nonempty append-only prefix with later audits.");
  let comparison: FollowupComparison | null = null;
  for (let later = before.aging_audits.length; later < after.aging_audits.length && !comparison; later++) {
    for (let earlier = before.aging_audits.length - 1; earlier >= 0; earlier--) {
      if (after.aging_audits[earlier].reassignment_watch_index !==
        after.aging_audits[later].reassignment_watch_index ||
        after.aging_audits[earlier].latest_outcome_index >=
        after.aging_audits[later].latest_outcome_index) continue;
      comparison = compareAgingFollowups(after.aging_audits, after.outcome_notes,
        after.continuity_watches, after.disposition_followups, after.review_recurrences,
        after.owner_review_followups, after.trial.observations, after.checks,
        earlier, later, current.exported_at);
      break;
    }
  }
  return { previous_audits: before.aging_audits.length,
    current_audits: after.aging_audits.length,
    new_audits: after.aging_audits.length - before.aging_audits.length, comparison };
}
