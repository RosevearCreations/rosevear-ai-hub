/** Build 172: independently held outcome exception recurrence, entirely local evidence. */
import { validateInstalledVersion, type TrialEnvironment } from "./ownerFieldTrial";
import { parseDriftOutcomeReceipt, type DriftOutcomeNote,
  type DriftOutcomeReceipt } from "./ownerSourceDriftOutcome";

export type ExceptionCategory = "CONTINUE_INDEPENDENT_HOLD" |
  "REQUEST_OWNER_FRESHNESS_RECHECK" | "REQUEST_RECURRING_SOURCE_REVIEW" |
  "REQUEST_OVERDUE_EVIDENCE_RENEWAL";
export const EXCEPTION_CATEGORIES: readonly ExceptionCategory[] = [
  "CONTINUE_INDEPENDENT_HOLD", "REQUEST_OWNER_FRESHNESS_RECHECK",
  "REQUEST_RECURRING_SOURCE_REVIEW", "REQUEST_OVERDUE_EVIDENCE_RENEWAL",
];
export type ExceptionSignal = "REPEATED_OWNER_WITNESS_GAP" |
  "OWNER_CONTINUITY_NOT_FRESH" | "OWNER_DISPOSITION_CHANGED" |
  "REPEATED_SOURCE_RENEWAL_GAP" | "REPEATED_SOURCE_IDENTITY_DRIFT" |
  "VERSION_OR_ACCESS_CONFLICT_UNRESOLVED" | "SOURCE_STILL_OVERDUE" |
  "REPEATED_OVERDUE_SOURCE" | "OLDER_OUTCOME_AGED" |
  "OLDER_OUTCOME_OVERDUE" | "INDEPENDENT_HOLD_CONTINUES";
export interface ExceptionComparison {
  baseline_outcome_index: number;
  latest_outcome_index: number;
  case_id: DriftOutcomeNote["case_id"];
  reassignment_watch_index: number;
  baseline_at: string;
  latest_at: string;
  baseline_recheck_index: number;
  latest_recheck_index: number;
  baseline_source_check_index: number | null;
  latest_source_check_index: number | null;
  owner_witness_fresh_since_prior_outcome: boolean;
  source_evidence_fresh_since_prior_outcome: boolean;
  repeated_owner_gap: boolean;
  repeated_source_gap: boolean;
  repeated_identity_drift: boolean;
  version_or_access_conflict: boolean;
  baseline_source_age_days: number | null;
  latest_source_age_days: number | null;
  earlier_outcome_age_days: number;
  age_band: "UNDER_THREE_DAYS" | "THREE_TO_SEVEN_DAYS" | "OVER_SEVEN_DAYS";
  signals: ExceptionSignal[];
  unresolved: true;
}
export interface ExceptionNote extends ExceptionComparison {
  recorded_at: string;
  category: ExceptionCategory;
  personally_rechecked: true;
  independent_hold_acknowledged: true;
  state: "PRIVATE_OUTCOME_EXCEPTION_RECURRENCE_NOT_SENT";
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
}
export interface ExceptionReceipt {
  kind: "rosevear_independent_recheck_outcome_exception_recurrence";
  schema_version: 1;
  exported_at: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
  automatic_dispatch: "DISABLED";
  evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS";
  drift_outcome_receipt: DriftOutcomeReceipt;
  exception_recurrences: ExceptionNote[];
}
export const MAX_EXCEPTION_RECEIPT_BYTES = 6_700_000;
const DAY = 86_400_000;
const compareKeys = ["baseline_outcome_index", "latest_outcome_index", "case_id",
  "reassignment_watch_index", "baseline_at", "latest_at", "baseline_recheck_index",
  "latest_recheck_index", "baseline_source_check_index", "latest_source_check_index",
  "owner_witness_fresh_since_prior_outcome", "source_evidence_fresh_since_prior_outcome",
  "repeated_owner_gap", "repeated_source_gap", "repeated_identity_drift",
  "version_or_access_conflict", "baseline_source_age_days", "latest_source_age_days",
  "earlier_outcome_age_days", "age_band", "signals", "unresolved"] as const;
const noteKeys = [...compareKeys, "recorded_at", "category", "personally_rechecked",
  "independent_hold_acknowledged", "state", "field_acceptance", "independent_review", "closure"];

function safeTime(value: unknown): value is string {
  return typeof value === "string" && /^20\d\d-\d\d-\d\dT/.test(value) &&
    Number.isFinite(Date.parse(value)) && Date.parse(value) >= Date.parse("2020-01-01T00:00:00Z") &&
    Date.parse(value) <= Date.now() + 300_000;
}

export function compareOutcomeExceptions(prior: DriftOutcomeReceipt, beforeIndex: number,
  afterIndex: number, at = new Date().toISOString()): ExceptionComparison {
  const before = prior.drift_outcomes[beforeIndex]; const after = prior.drift_outcomes[afterIndex];
  if (!Number.isInteger(beforeIndex) || !Number.isInteger(afterIndex) || beforeIndex < 0 ||
    afterIndex <= beforeIndex || !before || !after || before.case_id !== after.case_id ||
    before.reassignment_watch_index !== after.reassignment_watch_index ||
    before.latest_recheck_index > after.latest_recheck_index ||
    Date.parse(before.recorded_at) >= Date.parse(after.recorded_at) ||
    !safeTime(at) || Date.parse(at) < Date.parse(after.recorded_at))
    throw new Error("Two chronological Build 171 HOLD outcomes for the same watch with no recheck regression are required.");
  // Revalidate the entire nested source chain before drawing any later inference.
  const nested = parseDriftOutcomeReceipt(JSON.stringify(prior));
  const oldCheck = before.latest_source_check_index === null ? null :
    nested.checks[before.latest_source_check_index];
  const newCheck = after.latest_source_check_index === null ? null :
    nested.checks[after.latest_source_check_index];
  const latestRecheck = prior.renewal_receipt.renewal_rechecks[after.latest_recheck_index];
  const latestFollowup = nested.aging_followups[latestRecheck?.latest_followup_index];
  const ownerIndex = nested.aging_audits[latestFollowup?.latest_audit_index]?.latest_observation_index;
  const owner = ownerIndex === undefined ? null : nested.trial.observations[ownerIndex];
  const freshOwner = !!owner && owner.case_id === after.case_id &&
    owner.witnessed_by_operator && Date.parse(owner.observed_at) > Date.parse(before.recorded_at);
  const freshSource = !!newCheck &&
    after.latest_source_check_index !== before.latest_source_check_index &&
    Date.parse(newCheck.captured_at) > Date.parse(before.recorded_at) &&
    (!oldCheck || Date.parse(newCheck.captured_at) > Date.parse(oldCheck.captured_at));
  const repeatedOwnerGap = !before.owner_witness_continuity && !after.owner_witness_continuity;
  const repeatedSourceGap = !before.source_renewed_after_prior_recheck &&
    !after.source_renewed_after_prior_recheck;
  const repeatedDrift = before.identity_or_access_drift_continues &&
    after.identity_or_access_drift_continues;
  const earlierRecheck = prior.renewal_receipt.renewal_rechecks[before.latest_recheck_index];
  const versionConflict = !!oldCheck && !!newCheck &&
    (oldCheck.installed_version !== newCheck.installed_version || oldCheck.access !== newCheck.access) ||
    !!earlierRecheck?.source_version_access_drift_claim &&
    !!latestRecheck?.source_version_access_drift_claim;
  const oldAge = oldCheck ? Math.floor((Date.parse(at) - Date.parse(oldCheck.captured_at)) / DAY) : null;
  const newAge = newCheck ? Math.floor((Date.parse(at) - Date.parse(newCheck.captured_at)) / DAY) : null;
  const outcomeAge = Math.floor((Date.parse(at) - Date.parse(before.recorded_at)) / DAY);
  const signals: ExceptionSignal[] = [];
  if (repeatedOwnerGap) signals.push("REPEATED_OWNER_WITNESS_GAP");
  if (!freshOwner) signals.push("OWNER_CONTINUITY_NOT_FRESH");
  if (before.category !== after.category) signals.push("OWNER_DISPOSITION_CHANGED");
  if (repeatedSourceGap) signals.push("REPEATED_SOURCE_RENEWAL_GAP");
  if (repeatedDrift) signals.push("REPEATED_SOURCE_IDENTITY_DRIFT");
  if (versionConflict) signals.push("VERSION_OR_ACCESS_CONFLICT_UNRESOLVED");
  if (newAge === null || newAge > 7) signals.push("SOURCE_STILL_OVERDUE");
  if ((oldAge === null || oldAge > 7) && (newAge === null || newAge > 7))
    signals.push("REPEATED_OVERDUE_SOURCE");
  if (outcomeAge >= 3) signals.push("OLDER_OUTCOME_AGED");
  if (outcomeAge > 7) signals.push("OLDER_OUTCOME_OVERDUE");
  signals.push("INDEPENDENT_HOLD_CONTINUES");
  return { baseline_outcome_index: beforeIndex, latest_outcome_index: afterIndex,
    case_id: before.case_id, reassignment_watch_index: before.reassignment_watch_index,
    baseline_at: before.recorded_at, latest_at: after.recorded_at,
    baseline_recheck_index: before.latest_recheck_index,
    latest_recheck_index: after.latest_recheck_index,
    baseline_source_check_index: before.latest_source_check_index,
    latest_source_check_index: after.latest_source_check_index,
    owner_witness_fresh_since_prior_outcome: freshOwner,
    source_evidence_fresh_since_prior_outcome: freshSource,
    repeated_owner_gap: repeatedOwnerGap, repeated_source_gap: repeatedSourceGap,
    repeated_identity_drift: repeatedDrift, version_or_access_conflict: versionConflict,
    baseline_source_age_days: oldAge, latest_source_age_days: newAge,
    earlier_outcome_age_days: outcomeAge,
    age_band: outcomeAge > 7 ? "OVER_SEVEN_DAYS" : outcomeAge >= 3 ?
      "THREE_TO_SEVEN_DAYS" : "UNDER_THREE_DAYS", signals, unresolved: true };
}

export function validateExceptionRecurrences(prior: DriftOutcomeReceipt,
  notes: readonly ExceptionNote[], exportedAt?: string): void {
  if (notes.length > 100) throw new Error("Build 172 permits at most 100 private recurrence notes.");
  let earlier = 0; const seen = new Set<string>();
  for (const note of notes) {
    if (!note || Object.keys(note).length !== noteKeys.length ||
      Object.keys(note).some(key => !noteKeys.includes(key)) || !safeTime(note.recorded_at) ||
      !EXCEPTION_CATEGORIES.includes(note.category) || note.personally_rechecked !== true ||
      note.independent_hold_acknowledged !== true ||
      note.state !== "PRIVATE_OUTCOME_EXCEPTION_RECURRENCE_NOT_SENT" ||
      note.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
      note.independent_review !== "INDEPENDENT_REVIEW_HOLD" || note.closure !== "NOT_AUTHORIZED")
      throw new Error("Unsafe Build 172 immutable private HOLD note.");
    const at = Date.parse(note.recorded_at);
    if (at < earlier || exportedAt && at > Date.parse(exportedAt))
      throw new Error("Build 172 recurrence chronology invalid.");
    const expected = compareOutcomeExceptions(prior, note.baseline_outcome_index,
      note.latest_outcome_index, note.recorded_at);
    if (compareKeys.some(key => JSON.stringify(note[key]) !== JSON.stringify(expected[key])))
      throw new Error("Build 172 altered immutable recurrence or owner freshness evidence.");
    if (note.category === "REQUEST_OWNER_FRESHNESS_RECHECK" &&
      !expected.signals.some(signal => ["OWNER_CONTINUITY_NOT_FRESH", "REPEATED_OWNER_WITNESS_GAP"].includes(signal)) ||
      note.category === "REQUEST_RECURRING_SOURCE_REVIEW" &&
      !expected.signals.some(signal => ["REPEATED_SOURCE_RENEWAL_GAP",
        "REPEATED_SOURCE_IDENTITY_DRIFT", "VERSION_OR_ACCESS_CONFLICT_UNRESOLVED"].includes(signal)) ||
      note.category === "REQUEST_OVERDUE_EVIDENCE_RENEWAL" &&
      !expected.signals.includes("SOURCE_STILL_OVERDUE"))
      throw new Error("Build 172 category requires an unresolved current exception.");
    const key = `${note.baseline_outcome_index}:${note.latest_outcome_index}:${note.category}`;
    if (seen.has(key)) throw new Error("Duplicate Build 172 private recurrence note.");
    seen.add(key); earlier = at;
  }
}

export function recordExceptionRecurrence(prior: DriftOutcomeReceipt,
  notes: readonly ExceptionNote[], environment: TrialEnvironment,
  imported: { outcomes: number; recurrences: number }, input: {
    baseline_outcome_index: number; latest_outcome_index: number;
    category: ExceptionCategory; personally_rechecked: boolean;
    independent_hold_acknowledged: boolean }, at = new Date().toISOString()): ExceptionNote[] {
  if (!environment.installed_windows_witnessed || !validateInstalledVersion(environment.installed_version) ||
    environment.access === "unknown" || input.latest_outcome_index < imported.outcomes ||
    notes.length < imported.recurrences || !input.personally_rechecked ||
    !input.independent_hold_acknowledged || !EXCEPTION_CATEGORIES.includes(input.category))
    throw new Error("Build 172 requires a non-imported later outcome, fresh Windows witness and two HOLD attestations.");
  const comparison = compareOutcomeExceptions(prior, input.baseline_outcome_index,
    input.latest_outcome_index, at);
  const next: ExceptionNote[] = [...notes, { ...comparison, recorded_at: at,
    category: input.category, personally_rechecked: true,
    independent_hold_acknowledged: true,
    state: "PRIVATE_OUTCOME_EXCEPTION_RECURRENCE_NOT_SENT",
    field_acceptance: "FIELD_ACCEPTANCE_HOLD", independent_review: "INDEPENDENT_REVIEW_HOLD",
    closure: "NOT_AUTHORIZED" }];
  validateExceptionRecurrences(prior, next);
  return next;
}

export function createExceptionReceipt(prior: DriftOutcomeReceipt,
  notes: readonly ExceptionNote[], at = new Date().toISOString()): ExceptionReceipt {
  if (prior.kind !== "rosevear_independent_source_drift_outcome_aging" ||
    !safeTime(at) || Date.parse(at) < Date.parse(prior.exported_at))
    throw new Error("Build 172 requires a chronological complete Build 171 receipt.");
  parseDriftOutcomeReceipt(JSON.stringify(prior));
  validateExceptionRecurrences(prior, notes, at);
  const receipt: ExceptionReceipt = {
    kind: "rosevear_independent_recheck_outcome_exception_recurrence", schema_version: 1,
    exported_at: at, field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED",
    automatic_dispatch: "DISABLED", evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS",
    drift_outcome_receipt: prior,
    exception_recurrences: notes.map(note => ({ ...note, signals: [...note.signals] })),
  };
  if (JSON.stringify(receipt).length > MAX_EXCEPTION_RECEIPT_BYTES)
    throw new Error("Build 172 private receipt exceeds 6.7 MB.");
  return receipt;
}

/** Any historical import is private testimony only; never restores Windows confirmation. */
export function parseExceptionReceipt(raw: string) {
  if (raw.length > MAX_EXCEPTION_RECEIPT_BYTES) throw new Error("Build 172 import exceeds 6.7 MB.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Invalid Build 172 private JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid Build 172 receipt envelope.");
  const obj = value as Record<string, unknown>;
  if (obj.kind !== "rosevear_independent_recheck_outcome_exception_recurrence")
    return { ...parseDriftOutcomeReceipt(raw), exception_recurrences: [] as ExceptionNote[] };
  const keys = ["kind", "schema_version", "exported_at", "field_acceptance",
    "independent_review", "closure", "automatic_dispatch", "evidence_authenticity",
    "drift_outcome_receipt", "exception_recurrences"];
  if (Object.keys(obj).length !== keys.length || Object.keys(obj).some(key => !keys.includes(key)) ||
    obj.schema_version !== 1 || !safeTime(obj.exported_at) ||
    obj.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
    obj.independent_review !== "INDEPENDENT_REVIEW_HOLD" || obj.closure !== "NOT_AUTHORIZED" ||
    obj.automatic_dispatch !== "DISABLED" ||
    obj.evidence_authenticity !== "UNVERIFIED_PRIVATE_ATTESTATIONS" ||
    !obj.drift_outcome_receipt || !Array.isArray(obj.exception_recurrences))
    throw new Error("Unsafe Build 172 permanent HOLD receipt.");
  const prior = obj.drift_outcome_receipt as DriftOutcomeReceipt;
  if (prior.kind !== "rosevear_independent_source_drift_outcome_aging" ||
    Date.parse(prior.exported_at) > Date.parse(obj.exported_at as string))
    throw new Error("Build 172 nested chronology invalid.");
  const nested = parseDriftOutcomeReceipt(JSON.stringify(prior));
  validateExceptionRecurrences(prior, obj.exception_recurrences as ExceptionNote[],
    obj.exported_at as string);
  return { ...nested, exception_recurrences: (obj.exception_recurrences as ExceptionNote[])
    .map(note => ({ ...note, signals: [...note.signals] })) };
}

/** Full nested Build 171 historical prefixes only; new notes cannot rewrite the past. */
export function comparePrivateDriftOutcomeReceipts(beforeRaw: string, afterRaw: string) {
  if (beforeRaw.length > 6_250_000 || afterRaw.length > 6_250_000)
    throw new Error("Build 171 comparison exceeds 6.25 MB.");
  let before: DriftOutcomeReceipt; let after: DriftOutcomeReceipt;
  try { before = JSON.parse(beforeRaw) as DriftOutcomeReceipt;
    after = JSON.parse(afterRaw) as DriftOutcomeReceipt; }
  catch { throw new Error("Invalid Build 171 private JSON."); }
  if (before?.kind !== "rosevear_independent_source_drift_outcome_aging" ||
    after?.kind !== "rosevear_independent_source_drift_outcome_aging" ||
    Date.parse(before.exported_at) >= Date.parse(after.exported_at))
    throw new Error("Two chronological complete Build 171 receipts are required.");
  const earlier = parseDriftOutcomeReceipt(beforeRaw);
  const later = parseDriftOutcomeReceipt(afterRaw);
  const prefix = (a: unknown, b: unknown, key = ""): boolean => {
    if (key === "exported_at") return safeTime(a) && safeTime(b) && Date.parse(a) <= Date.parse(b);
    if (Array.isArray(a)) return Array.isArray(b) && a.length <= b.length &&
      a.every((item, index) => prefix(item, b[index]));
    if (a !== null && typeof a === "object") {
      if (b === null || typeof b !== "object" || Array.isArray(b)) return false;
      const left = a as Record<string, unknown>; const right = b as Record<string, unknown>;
      return Object.keys(left).length === Object.keys(right).length &&
        Object.keys(left).every(name => Object.hasOwn(right, name) &&
          prefix(left[name], right[name], name));
    }
    return a === b;
  };
  if (!prefix(before, after) || !earlier.drift_outcomes.length ||
    earlier.drift_outcomes.length >= later.drift_outcomes.length)
    throw new Error("Build 171 nested evidence must be an exact nonempty append-only historical prefix.");
  let comparison: ExceptionComparison | null = null;
  for (let late = earlier.drift_outcomes.length; late < later.drift_outcomes.length && !comparison; late++) {
    for (let early = earlier.drift_outcomes.length - 1; early >= 0; early--) {
      if (later.drift_outcomes[early].case_id !== later.drift_outcomes[late].case_id ||
        later.drift_outcomes[early].reassignment_watch_index !==
        later.drift_outcomes[late].reassignment_watch_index) continue;
      comparison = compareOutcomeExceptions(after, early, late, after.exported_at); break;
    }
  }
  return { previous_outcomes: earlier.drift_outcomes.length,
    current_outcomes: later.drift_outcomes.length,
    new_outcomes: later.drift_outcomes.length - earlier.drift_outcomes.length, comparison };
}
