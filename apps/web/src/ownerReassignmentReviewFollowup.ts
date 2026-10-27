/** Build 163: private receipt follow-up; no real owner, reviewer or device action. */
import { validateInstalledVersion, type TrialEnvironment, type TrialObservation,
  type TrialOwner } from "./ownerFieldTrial";
import type { SourceIdentityCheck } from "./ownerFieldRouting";
import { parseAuditReassignmentWatchReceipt, validateReassignmentWatches,
  type AuditReassignmentWatchReceipt, type ReassignmentWatchNote } from "./ownerAuditReassignmentWatch";

export type OwnerReviewSignal = "OWNER_REVIEW_OUTCOME_CHANGED" |
  "OWNER_NEXT_ACTION_CLAIM_CHANGED" | "OWNER_REVIEW_STILL_UNRESOLVED" |
  "SOURCE_REVIEW_WITNESS_MISSING" | "SOURCE_ALIAS_RECHECK_CHANGED" |
  "SOURCE_REVIEW_IDENTITY_UNVERIFIED" | "OWNER_REVIEW_AGED" |
  "OWNER_REVIEW_OVERDUE" | "ORIGINAL_REASSIGNMENT_WATCH_HELD";
export type OwnerReviewCategory = "CONTINUE_REASSIGNMENT_HOLD" |
  "REQUEST_OWNER_REVIEW_REEVIDENCE" | "REQUEST_SOURCE_IDENTITY_RECHECK" |
  "REQUEST_OVERDUE_REVIEW_WITNESS";
export type OwnerReviewAgeBand = "UNDER_THREE_DAYS" | "THREE_TO_SEVEN_DAYS" | "OVER_SEVEN_DAYS";

export interface OwnerReviewComparison {
  reassignment_watch_index: number;
  observation_index: number;
  source_check_index: number | null;
  case_id: ReassignmentWatchNote["case_id"];
  watch_recorded_at: string;
  audit_pair: [number, number];
  followup_observed_at: string;
  prior_owner_claim: TrialOwner;
  current_owner_claim: TrialOwner;
  owner_outcome: TrialObservation["outcome"];
  owner_finding: TrialObservation["finding"];
  watch_age_days: number;
  age_band: OwnerReviewAgeBand;
  signals: OwnerReviewSignal[];
  unresolved: true;
}
export interface OwnerReviewFollowup extends OwnerReviewComparison {
  recorded_at: string;
  category: OwnerReviewCategory;
  personally_witnessed: true;
  hold_acknowledged: true;
  state: "PRIVATE_OWNER_REVIEW_FOLLOWUP_NOT_SENT";
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
}
export interface OwnerReviewFollowupReceipt {
  kind: "rosevear_independent_reassignment_review_followup";
  schema_version: 1;
  exported_at: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
  automatic_dispatch: "DISABLED";
  automatic_reassignment: "DISABLED";
  evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS";
  reassignment_watch_receipt: AuditReassignmentWatchReceipt;
  owner_review_followups: OwnerReviewFollowup[];
}

export const MAX_OWNER_REVIEW_RECEIPT_BYTES = 3_250_000;
export const OWNER_REVIEW_CATEGORIES: readonly OwnerReviewCategory[] = [
  "CONTINUE_REASSIGNMENT_HOLD", "REQUEST_OWNER_REVIEW_REEVIDENCE",
  "REQUEST_SOURCE_IDENTITY_RECHECK", "REQUEST_OVERDUE_REVIEW_WITNESS",
];
const DAY = 86_400_000;
const comparisonKeys = ["reassignment_watch_index", "observation_index", "source_check_index",
  "case_id", "watch_recorded_at", "audit_pair", "followup_observed_at", "prior_owner_claim",
  "current_owner_claim", "owner_outcome", "owner_finding", "watch_age_days", "age_band",
  "signals", "unresolved"] as const;
const noteKeys = [...comparisonKeys, "recorded_at", "category", "personally_witnessed",
  "hold_acknowledged", "state", "field_acceptance", "independent_review", "closure"];

function validTime(value: unknown): value is string {
  return typeof value === "string" && /^20\d\d-\d\d-\d\dT/.test(value) &&
    Number.isFinite(Date.parse(value)) && Date.parse(value) >= Date.parse("2020-01-01T00:00:00Z") &&
    Date.parse(value) <= Date.now() + 300_000;
}

/** Compare a specific previously watched audit pair with a strictly later same-case owner trial. */
export function compareOwnerReviewEvidence(watches: readonly ReassignmentWatchNote[],
  history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[],
  watchIndex: number, observationIndex: number, sourceIndex: number | null,
  at = new Date().toISOString()): OwnerReviewComparison {
  const watch = watches[watchIndex];
  const trial = history[observationIndex];
  if (!Number.isInteger(watchIndex) || watchIndex < 0 || !watch ||
    !Number.isInteger(observationIndex) || observationIndex <= watch.latest_observation_index ||
    !trial || trial.case_id !== watch.case_id || !trial.witnessed_by_operator ||
    !validTime(at) || !validTime(trial.observed_at) ||
    Date.parse(trial.observed_at) <= Date.parse(watch.recorded_at) ||
    Date.parse(at) < Date.parse(trial.observed_at)) {
    throw new Error("A strictly later witnessed same-case owner review after the exact Build 162 watch is required.");
  }
  const oldSource = checks.find(check => check.trial_index === watch.latest_observation_index &&
    check.case_id === watch.case_id) ?? null;
  if (sourceIndex !== null && (!Number.isInteger(sourceIndex) || sourceIndex < 0)) {
    throw new Error("Invalid owner review source check index.");
  }
  const source = sourceIndex === null ? null : checks[sourceIndex];
  if (sourceIndex !== null && (!source || source.trial_index !== observationIndex ||
    source.case_id !== trial.case_id || !source.witnessed_on_windows ||
    Date.parse(source.captured_at) < Date.parse(trial.observed_at) ||
    Date.parse(source.captured_at) > Date.parse(at))) {
    throw new Error("Owner review source check must be witnessed for the exact later trial.");
  }
  const signals: OwnerReviewSignal[] = [];
  if (trial.outcome !== "passed" || trial.finding !== "none") signals.push("OWNER_REVIEW_STILL_UNRESOLVED");
  if (trial.outcome !== history[watch.latest_observation_index]?.outcome ||
    trial.finding !== history[watch.latest_observation_index]?.finding) {
    signals.push("OWNER_REVIEW_OUTCOME_CHANGED");
  }
  if (trial.next_owner !== watch.latest_owner) signals.push("OWNER_NEXT_ACTION_CLAIM_CHANGED");
  if (!source || !oldSource) signals.push("SOURCE_REVIEW_WITNESS_MISSING");
  else if (source.safe_alias !== oldSource.safe_alias || source.identity_state !== oldSource.identity_state ||
    source.installed_version !== oldSource.installed_version || source.access !== oldSource.access) {
    signals.push("SOURCE_ALIAS_RECHECK_CHANGED");
  }
  if (source && source.identity_state !== "confirmed_alias") signals.push("SOURCE_REVIEW_IDENTITY_UNVERIFIED");
  const age = Math.floor((Date.parse(at) - Date.parse(watch.recorded_at)) / DAY);
  if (age >= 3) signals.push("OWNER_REVIEW_AGED");
  if (age > 7) signals.push("OWNER_REVIEW_OVERDUE");
  signals.push("ORIGINAL_REASSIGNMENT_WATCH_HELD");
  return { reassignment_watch_index: watchIndex, observation_index: observationIndex,
    source_check_index: sourceIndex, case_id: watch.case_id,
    watch_recorded_at: watch.recorded_at,
    audit_pair: [watch.baseline_audit_index, watch.latest_audit_index],
    followup_observed_at: trial.observed_at, prior_owner_claim: watch.latest_owner,
    current_owner_claim: trial.next_owner, owner_outcome: trial.outcome,
    owner_finding: trial.finding, watch_age_days: age,
    age_band: age > 7 ? "OVER_SEVEN_DAYS" : age >= 3 ? "THREE_TO_SEVEN_DAYS" : "UNDER_THREE_DAYS",
    signals, unresolved: true };
}

export function validateOwnerReviewFollowups(notes: readonly OwnerReviewFollowup[],
  watches: readonly ReassignmentWatchNote[], history: readonly TrialObservation[],
  checks: readonly SourceIdentityCheck[], exportedAt?: string): void {
  if (notes.length > 100) throw new Error("Build 163 supports at most 100 private owner review follow-ups.");
  const seen = new Set<string>();
  let previous = 0;
  for (const note of notes) {
    if (!note || Object.keys(note).length !== noteKeys.length ||
      Object.keys(note).some(key => !noteKeys.includes(key)) || !validTime(note.recorded_at) ||
      !OWNER_REVIEW_CATEGORIES.includes(note.category) || note.personally_witnessed !== true ||
      note.hold_acknowledged !== true || note.state !== "PRIVATE_OWNER_REVIEW_FOLLOWUP_NOT_SENT" ||
      note.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
      note.independent_review !== "INDEPENDENT_REVIEW_HOLD" || note.closure !== "NOT_AUTHORIZED") {
      throw new Error("Unsafe Build 163 immutable independent HOLD fields.");
    }
    const when = Date.parse(note.recorded_at);
    if (when < previous || exportedAt && when > Date.parse(exportedAt)) {
      throw new Error("Build 163 owner review chronology is invalid.");
    }
    const expected = compareOwnerReviewEvidence(watches, history, checks,
      note.reassignment_watch_index, note.observation_index, note.source_check_index,
      note.recorded_at);
    if (comparisonKeys.some(key => JSON.stringify(note[key]) !== JSON.stringify(expected[key]))) {
      throw new Error("Build 163 changed immutable watch, owner, source or overdue audit evidence.");
    }
    if (note.category === "REQUEST_SOURCE_IDENTITY_RECHECK" &&
      !expected.signals.some(signal => signal.startsWith("SOURCE_")) ||
      note.category === "REQUEST_OVERDUE_REVIEW_WITNESS" &&
      !expected.signals.includes("OWNER_REVIEW_OVERDUE") ||
      note.category === "REQUEST_OWNER_REVIEW_REEVIDENCE" &&
      !expected.signals.some(signal => signal.startsWith("OWNER_REVIEW_") ||
        signal === "OWNER_NEXT_ACTION_CLAIM_CHANGED")) {
      throw new Error("Build 163 follow-up category needs corresponding independent HOLD evidence.");
    }
    const key = `${note.reassignment_watch_index}:${note.observation_index}:${note.category}`;
    if (seen.has(key)) throw new Error("Duplicate Build 163 private owner review follow-up.");
    seen.add(key); previous = when;
  }
}

export function recordOwnerReviewFollowup(watches: readonly ReassignmentWatchNote[],
  history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[],
  existing: readonly OwnerReviewFollowup[], environment: TrialEnvironment,
  imported: { trials: number; followups: number },
  input: { reassignment_watch_index: number; observation_index: number;
    source_check_index: number | null; category: OwnerReviewCategory;
    personally_witnessed: boolean; hold_acknowledged: boolean },
  at = new Date().toISOString()): OwnerReviewFollowup[] {
  if (!environment.installed_windows_witnessed || !validateInstalledVersion(environment.installed_version) ||
    environment.access === "unknown" || input.observation_index < imported.trials ||
    existing.length < imported.followups || !input.personally_witnessed ||
    !input.hold_acknowledged || !OWNER_REVIEW_CATEGORIES.includes(input.category)) {
    throw new Error("Fresh non-imported owner trial, installed Windows witness and two separate HOLD confirmations are required.");
  }
  const comparison = compareOwnerReviewEvidence(watches, history, checks,
    input.reassignment_watch_index, input.observation_index, input.source_check_index, at);
  const notes: OwnerReviewFollowup[] = [...existing, { ...comparison,
    recorded_at: at, category: input.category, personally_witnessed: true, hold_acknowledged: true,
    state: "PRIVATE_OWNER_REVIEW_FOLLOWUP_NOT_SENT", field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED" }];
  validateOwnerReviewFollowups(notes, watches, history, checks);
  return notes;
}

export function createOwnerReviewFollowupReceipt(prior: AuditReassignmentWatchReceipt,
  notes: readonly OwnerReviewFollowup[], at = new Date().toISOString()): OwnerReviewFollowupReceipt {
  if (prior.kind !== "rosevear_independent_audit_reassignment_watch" || !validTime(at) ||
    Date.parse(at) < Date.parse(prior.exported_at)) {
    throw new Error("Build 163 requires a complete chronological Build 162 watch receipt.");
  }
  const nested = parseAuditReassignmentWatchReceipt(JSON.stringify(prior));
  validateOwnerReviewFollowups(notes, nested.reassignment_watches,
    nested.trial.observations, nested.checks, at);
  const receipt: OwnerReviewFollowupReceipt = {
    kind: "rosevear_independent_reassignment_review_followup", schema_version: 1,
    exported_at: at, field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED",
    automatic_dispatch: "DISABLED", automatic_reassignment: "DISABLED",
    evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS",
    reassignment_watch_receipt: prior,
    owner_review_followups: notes.map(note => ({ ...note, audit_pair: [...note.audit_pair],
      signals: [...note.signals] })) };
  if (JSON.stringify(receipt).length > MAX_OWNER_REVIEW_RECEIPT_BYTES) {
    throw new Error("Build 163 private receipt exceeds 3.25 MB.");
  }
  return receipt;
}

/** Earlier formats stay historical only; imports do not authorize new independent field decisions. */
export function parseOwnerReviewFollowupReceipt(raw: string):
  ReturnType<typeof parseAuditReassignmentWatchReceipt> & { owner_review_followups: OwnerReviewFollowup[] } {
  if (raw.length > MAX_OWNER_REVIEW_RECEIPT_BYTES) throw new Error("Build 163 receipt exceeds 3.25 MB.");
  let data: unknown;
  try { data = JSON.parse(raw); } catch { throw new Error("Invalid private Build 163 JSON."); }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid Build 163 envelope.");
  const receipt = data as Record<string, unknown>;
  if (receipt.kind !== "rosevear_independent_reassignment_review_followup") {
    return { ...parseAuditReassignmentWatchReceipt(raw), owner_review_followups: [] };
  }
  const keys = ["kind", "schema_version", "exported_at", "field_acceptance", "independent_review",
    "closure", "automatic_dispatch", "automatic_reassignment", "evidence_authenticity",
    "reassignment_watch_receipt", "owner_review_followups"];
  if (Object.keys(receipt).length !== keys.length || Object.keys(receipt).some(key => !keys.includes(key)) ||
    receipt.schema_version !== 1 || !validTime(receipt.exported_at) ||
    receipt.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
    receipt.independent_review !== "INDEPENDENT_REVIEW_HOLD" ||
    receipt.closure !== "NOT_AUTHORIZED" || receipt.automatic_dispatch !== "DISABLED" ||
    receipt.automatic_reassignment !== "DISABLED" ||
    receipt.evidence_authenticity !== "UNVERIFIED_PRIVATE_ATTESTATIONS" ||
    !receipt.reassignment_watch_receipt || !Array.isArray(receipt.owner_review_followups)) {
    throw new Error("Unsafe Build 163 private independent HOLD receipt.");
  }
  const prior = receipt.reassignment_watch_receipt as AuditReassignmentWatchReceipt;
  if (prior.kind !== "rosevear_independent_audit_reassignment_watch" ||
    Date.parse(prior.exported_at) > Date.parse(receipt.exported_at as string)) {
    throw new Error("Build 163 nested Build 162 chronology is invalid.");
  }
  const nested = parseAuditReassignmentWatchReceipt(JSON.stringify(prior));
  const notes = receipt.owner_review_followups as OwnerReviewFollowup[];
  validateOwnerReviewFollowups(notes, nested.reassignment_watches,
    nested.trial.observations, nested.checks, receipt.exported_at as string);
  return { ...nested, owner_review_followups: notes.map(note => ({ ...note,
    audit_pair: [...note.audit_pair], signals: [...note.signals] })) };
}

/** Two complete Build 162 exports: every earlier private source and watch entry must be unchanged. */
export function comparePrivateReassignmentReceipts(previousRaw: string, currentRaw: string): {
  previous_watches: number; current_watches: number; new_watches: number;
  latest_unverified_case: string | null;
} {
  if (previousRaw.length > 2_900_000 || currentRaw.length > 2_900_000) {
    throw new Error("Build 162 receipts exceed the 2.9 MB comparison bound.");
  }
  const oldEnvelope = JSON.parse(previousRaw) as AuditReassignmentWatchReceipt;
  const newEnvelope = JSON.parse(currentRaw) as AuditReassignmentWatchReceipt;
  if (oldEnvelope.kind !== "rosevear_independent_audit_reassignment_watch" ||
    newEnvelope.kind !== "rosevear_independent_audit_reassignment_watch" ||
    Date.parse(oldEnvelope.exported_at) >= Date.parse(newEnvelope.exported_at)) {
    throw new Error("Two chronological complete Build 162 private receipts are required.");
  }
  const old = parseAuditReassignmentWatchReceipt(previousRaw);
  const next = parseAuditReassignmentWatchReceipt(currentRaw);
  const prefix = (before: readonly unknown[], after: readonly unknown[]) =>
    before.length <= after.length && before.every((item, i) =>
      JSON.stringify(item) === JSON.stringify(after[i]));
  const streams = ["handoffs", "events", "checks", "links", "reassessments", "followups",
    "decisions", "resolutions", "overdue_handoffs", "followup_reviews", "outcome_reviews",
    "recurrence_rechecks", "exception_watches", "watch_followup_audits", "reassignment_watches"] as const;
  if (!prefix(old.trial.observations, next.trial.observations) ||
    !prefix(old.trial.source_readings, next.trial.source_readings) ||
    streams.some(stream => !prefix(old[stream], next[stream])) ||
    old.trial.environment.installed_version !== next.trial.environment.installed_version ||
    old.trial.environment.access !== next.trial.environment.access ||
    old.reassignment_watches.length === 0 ||
    old.reassignment_watches.length >= next.reassignment_watches.length) {
    throw new Error("Build 162 private watches must be an exact nonempty append-only prefix; receipt claims are not independently authenticated.");
  }
  return { previous_watches: old.reassignment_watches.length,
    current_watches: next.reassignment_watches.length,
    new_watches: next.reassignment_watches.length - old.reassignment_watches.length,
    latest_unverified_case: next.reassignment_watches.at(-1)?.case_id ?? null };
}
