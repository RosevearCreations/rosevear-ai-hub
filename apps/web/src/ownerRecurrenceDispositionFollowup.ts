/** Build 173: private, non-dispatching comparison of successive held Build 172 recurrences. */
import { validateInstalledVersion, type TrialEnvironment } from "./ownerFieldTrial";
import { parseExceptionReceipt, type ExceptionNote, type ExceptionReceipt } from "./ownerOutcomeExceptionRecurrence";

export type FollowupCategory = "CONTINUE_INDEPENDENT_HOLD" |
  "REQUEST_OWNER_REWITNESS" | "REQUEST_SOURCE_REVALIDATION" | "REQUEST_OVERDUE_REVIEW";
export const FOLLOWUP_CATEGORIES: readonly FollowupCategory[] = [
  "CONTINUE_INDEPENDENT_HOLD", "REQUEST_OWNER_REWITNESS",
  "REQUEST_SOURCE_REVALIDATION", "REQUEST_OVERDUE_REVIEW",
];
export type FollowupSignal = "REPEATED_OWNER_GAP" | "OWNER_REWITNESS_MISSING" |
  "REPEATED_SOURCE_GAP" | "SOURCE_RECHECK_MISSING" |
  "SOURCE_IDENTITY_OR_ACCESS_CONFLICT" | "DISPOSITION_CATEGORY_CHANGED" |
  "CLAIMED_LATER_OWNER_AND_SOURCE_UNVERIFIED" | "SOURCE_OVERDUE" |
  "REPEATED_OVERDUE_SOURCE" | "EARLIER_RECURRENCE_AGED" |
  "EARLIER_RECURRENCE_OVERDUE" | "INDEPENDENT_HOLD_CONTINUES";
export interface DispositionComparison {
  earlier_recurrence_index: number;
  later_recurrence_index: number;
  case_id: ExceptionNote["case_id"];
  reassignment_watch_index: number;
  earlier_at: string;
  later_at: string;
  earlier_outcome_index: number;
  later_outcome_index: number;
  earlier_source_check_index: number | null;
  later_source_check_index: number | null;
  newer_witnessed_owner_claim: boolean;
  newer_distinct_source_claim: boolean;
  source_identity_or_access_conflict: boolean;
  repeated_owner_gap: boolean;
  repeated_source_gap: boolean;
  earlier_source_age_days: number | null;
  later_source_age_days: number | null;
  earlier_recurrence_age_days: number;
  age_band: "UNDER_THREE_DAYS" | "THREE_TO_SEVEN_DAYS" | "OVER_SEVEN_DAYS";
  signals: FollowupSignal[];
  independently_verified: false;
  unresolved: true;
}
export interface DispositionFollowupNote extends DispositionComparison {
  recorded_at: string;
  category: FollowupCategory;
  personally_rechecked: true;
  independent_hold_acknowledged: true;
  state: "PRIVATE_RECURRENCE_DISPOSITION_FOLLOWUP_NOT_SENT";
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
}
export interface DispositionFollowupReceipt {
  kind: "rosevear_independent_recurrence_disposition_followup";
  schema_version: 1;
  exported_at: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
  automatic_dispatch: "DISABLED";
  evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS";
  exception_receipt: ExceptionReceipt;
  recurrence_disposition_followups: DispositionFollowupNote[];
}
export const MAX_DISPOSITION_FOLLOWUP_BYTES = 7_000_000;
const DAY = 86_400_000;
const compareKeys = ["earlier_recurrence_index", "later_recurrence_index", "case_id",
  "reassignment_watch_index", "earlier_at", "later_at", "earlier_outcome_index",
  "later_outcome_index", "earlier_source_check_index", "later_source_check_index",
  "newer_witnessed_owner_claim", "newer_distinct_source_claim",
  "source_identity_or_access_conflict", "repeated_owner_gap", "repeated_source_gap",
  "earlier_source_age_days", "later_source_age_days", "earlier_recurrence_age_days",
  "age_band", "signals", "independently_verified", "unresolved"] as const;
const noteKeys = [...compareKeys, "recorded_at", "category", "personally_rechecked",
  "independent_hold_acknowledged", "state", "field_acceptance", "independent_review", "closure"];

function safeTime(value: unknown): value is string {
  return typeof value === "string" && /^20\d\d-\d\d-\d\dT/.test(value) &&
    Number.isFinite(Date.parse(value)) && Date.parse(value) >= Date.parse("2020-01-01T00:00:00Z") &&
    Date.parse(value) <= Date.now() + 300_000;
}

function categoryAllowed(category: FollowupCategory, signals: readonly FollowupSignal[]) {
  return category === "CONTINUE_INDEPENDENT_HOLD" ||
    category === "REQUEST_OWNER_REWITNESS" && signals.some(s =>
      s === "REPEATED_OWNER_GAP" || s === "OWNER_REWITNESS_MISSING") ||
    category === "REQUEST_SOURCE_REVALIDATION" && signals.some(s =>
      ["REPEATED_SOURCE_GAP", "SOURCE_RECHECK_MISSING",
        "SOURCE_IDENTITY_OR_ACCESS_CONFLICT"].includes(s)) ||
    category === "REQUEST_OVERDUE_REVIEW" && signals.includes("SOURCE_OVERDUE");
}

export function compareDispositionFollowups(prior: ExceptionReceipt, beforeIndex: number,
  afterIndex: number, at = new Date().toISOString()): DispositionComparison {
  const before = prior.exception_recurrences[beforeIndex];
  const after = prior.exception_recurrences[afterIndex];
  if (!Number.isInteger(beforeIndex) || !Number.isInteger(afterIndex) || beforeIndex < 0 ||
    afterIndex <= beforeIndex || !before || !after || before.case_id !== after.case_id ||
    before.reassignment_watch_index !== after.reassignment_watch_index ||
    before.latest_outcome_index > after.latest_outcome_index ||
    before.latest_recheck_index > after.latest_recheck_index ||
    Date.parse(before.recorded_at) >= Date.parse(after.recorded_at) ||
    !safeTime(at) || Date.parse(at) < Date.parse(after.recorded_at))
    throw new Error("Two chronological Build 172 recurrences for the same held watch without outcome regression are required.");
  const nested = parseExceptionReceipt(JSON.stringify(prior));
  const checks = nested.checks;
  const earlierCheck = before.latest_source_check_index === null ? null :
    checks[before.latest_source_check_index];
  const laterCheck = after.latest_source_check_index === null ? null :
    checks[after.latest_source_check_index];
  const latestOutcome = prior.drift_outcome_receipt.drift_outcomes[after.latest_outcome_index];
  const latestRecheck = prior.drift_outcome_receipt.renewal_receipt.renewal_rechecks[
    latestOutcome?.latest_recheck_index];
  const latestFollowup = nested.aging_followups[latestRecheck?.latest_followup_index];
  const ownerIndex = nested.aging_audits[latestFollowup?.latest_audit_index]?.latest_observation_index;
  const owner = ownerIndex === undefined ? null : nested.trial.observations[ownerIndex];
  // This establishes only a structurally later *claim* in a private receipt.
  const newerOwner = !!owner && owner.case_id === after.case_id &&
    owner.witnessed_by_operator && Date.parse(owner.observed_at) > Date.parse(before.recorded_at) &&
    Date.parse(owner.observed_at) <= Date.parse(after.recorded_at);
  const newerSource = !!laterCheck && laterCheck.case_id === after.case_id &&
    after.latest_source_check_index !== before.latest_source_check_index &&
    Date.parse(laterCheck.captured_at) > Date.parse(before.recorded_at) &&
    Date.parse(laterCheck.captured_at) <= Date.parse(after.recorded_at) &&
    (!earlierCheck || Date.parse(laterCheck.captured_at) > Date.parse(earlierCheck.captured_at));
  const conflict = before.version_or_access_conflict || after.version_or_access_conflict ||
    before.repeated_identity_drift || after.repeated_identity_drift ||
    !!earlierCheck && !!laterCheck && (
      earlierCheck.safe_alias !== laterCheck.safe_alias ||
      earlierCheck.identity_state !== laterCheck.identity_state ||
      earlierCheck.installed_version !== laterCheck.installed_version ||
      earlierCheck.access !== laterCheck.access);
  const repeatedOwner = before.signals.includes("OWNER_CONTINUITY_NOT_FRESH") &&
    after.signals.includes("OWNER_CONTINUITY_NOT_FRESH");
  const repeatedSource = before.signals.includes("REPEATED_SOURCE_RENEWAL_GAP") &&
    after.signals.includes("REPEATED_SOURCE_RENEWAL_GAP");
  const oldAge = earlierCheck ? Math.floor((Date.parse(at) - Date.parse(earlierCheck.captured_at)) / DAY) : null;
  const newAge = laterCheck ? Math.floor((Date.parse(at) - Date.parse(laterCheck.captured_at)) / DAY) : null;
  const recurrenceAge = Math.floor((Date.parse(at) - Date.parse(before.recorded_at)) / DAY);
  const signals: FollowupSignal[] = [];
  if (repeatedOwner) signals.push("REPEATED_OWNER_GAP");
  if (!newerOwner) signals.push("OWNER_REWITNESS_MISSING");
  if (repeatedSource) signals.push("REPEATED_SOURCE_GAP");
  if (!newerSource) signals.push("SOURCE_RECHECK_MISSING");
  if (conflict) signals.push("SOURCE_IDENTITY_OR_ACCESS_CONFLICT");
  if (before.category !== after.category) signals.push("DISPOSITION_CATEGORY_CHANGED");
  if (newerOwner && newerSource) signals.push("CLAIMED_LATER_OWNER_AND_SOURCE_UNVERIFIED");
  if (newAge === null || newAge > 7) signals.push("SOURCE_OVERDUE");
  if ((oldAge === null || oldAge > 7) && (newAge === null || newAge > 7))
    signals.push("REPEATED_OVERDUE_SOURCE");
  if (recurrenceAge >= 3) signals.push("EARLIER_RECURRENCE_AGED");
  if (recurrenceAge > 7) signals.push("EARLIER_RECURRENCE_OVERDUE");
  signals.push("INDEPENDENT_HOLD_CONTINUES");
  return { earlier_recurrence_index: beforeIndex, later_recurrence_index: afterIndex,
    case_id: before.case_id, reassignment_watch_index: before.reassignment_watch_index,
    earlier_at: before.recorded_at, later_at: after.recorded_at,
    earlier_outcome_index: before.latest_outcome_index,
    later_outcome_index: after.latest_outcome_index,
    earlier_source_check_index: before.latest_source_check_index,
    later_source_check_index: after.latest_source_check_index,
    newer_witnessed_owner_claim: newerOwner, newer_distinct_source_claim: newerSource,
    source_identity_or_access_conflict: conflict,
    repeated_owner_gap: repeatedOwner, repeated_source_gap: repeatedSource,
    earlier_source_age_days: oldAge, later_source_age_days: newAge,
    earlier_recurrence_age_days: recurrenceAge,
    age_band: recurrenceAge > 7 ? "OVER_SEVEN_DAYS" : recurrenceAge >= 3 ?
      "THREE_TO_SEVEN_DAYS" : "UNDER_THREE_DAYS",
    signals, independently_verified: false, unresolved: true };
}

export function validateDispositionFollowups(prior: ExceptionReceipt,
  notes: readonly DispositionFollowupNote[], exportedAt?: string): void {
  if (notes.length > 100) throw new Error("Build 173 permits at most 100 private follow-up notes.");
  let earlier = 0; const seen = new Set<string>();
  for (const note of notes) {
    if (!note || Object.keys(note).length !== noteKeys.length ||
      Object.keys(note).some(key => !noteKeys.includes(key)) || !safeTime(note.recorded_at) ||
      !FOLLOWUP_CATEGORIES.includes(note.category) || note.personally_rechecked !== true ||
      note.independent_hold_acknowledged !== true ||
      note.state !== "PRIVATE_RECURRENCE_DISPOSITION_FOLLOWUP_NOT_SENT" ||
      note.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
      note.independent_review !== "INDEPENDENT_REVIEW_HOLD" || note.closure !== "NOT_AUTHORIZED")
      throw new Error("Unsafe Build 173 immutable private HOLD note.");
    const at = Date.parse(note.recorded_at);
    if (at < earlier || exportedAt && at > Date.parse(exportedAt))
      throw new Error("Build 173 follow-up chronology invalid.");
    const expected = compareDispositionFollowups(prior, note.earlier_recurrence_index,
      note.later_recurrence_index, note.recorded_at);
    if (compareKeys.some(key => JSON.stringify(note[key]) !== JSON.stringify(expected[key])))
      throw new Error("Build 173 altered immutable disposition or source freshness evidence.");
    if (!categoryAllowed(note.category, expected.signals))
      throw new Error("Build 173 category requires an unresolved follow-up exception.");
    const key = `${note.earlier_recurrence_index}:${note.later_recurrence_index}:${note.category}`;
    if (seen.has(key)) throw new Error("Duplicate Build 173 private disposition follow-up.");
    seen.add(key); earlier = at;
  }
}

export function recordDispositionFollowup(prior: ExceptionReceipt,
  notes: readonly DispositionFollowupNote[], environment: TrialEnvironment,
  imported: { recurrences: number; followups: number }, input: {
    earlier_recurrence_index: number; later_recurrence_index: number;
    category: FollowupCategory; personally_rechecked: boolean;
    independent_hold_acknowledged: boolean }, at = new Date().toISOString()) {
  if (!environment.installed_windows_witnessed || !validateInstalledVersion(environment.installed_version) ||
    environment.access === "unknown" || input.later_recurrence_index < imported.recurrences ||
    notes.length < imported.followups || !input.personally_rechecked ||
    !input.independent_hold_acknowledged || !FOLLOWUP_CATEGORIES.includes(input.category))
    throw new Error("Build 173 requires a non-imported later recurrence, witnessed Windows and two independent HOLD attestations.");
  const comparison = compareDispositionFollowups(prior, input.earlier_recurrence_index,
    input.later_recurrence_index, at);
  if (!categoryAllowed(input.category, comparison.signals))
    throw new Error("Build 173 category requires unresolved evidence.");
  const next: DispositionFollowupNote[] = [...notes, { ...comparison, recorded_at: at,
    category: input.category, personally_rechecked: true,
    independent_hold_acknowledged: true,
    state: "PRIVATE_RECURRENCE_DISPOSITION_FOLLOWUP_NOT_SENT",
    field_acceptance: "FIELD_ACCEPTANCE_HOLD", independent_review: "INDEPENDENT_REVIEW_HOLD",
    closure: "NOT_AUTHORIZED" }];
  validateDispositionFollowups(prior, next);
  return next;
}

export function createDispositionFollowupReceipt(prior: ExceptionReceipt,
  notes: readonly DispositionFollowupNote[], at = new Date().toISOString()): DispositionFollowupReceipt {
  if (prior.kind !== "rosevear_independent_recheck_outcome_exception_recurrence" ||
    !safeTime(at) || Date.parse(at) < Date.parse(prior.exported_at))
    throw new Error("Build 173 requires a chronological complete Build 172 receipt.");
  parseExceptionReceipt(JSON.stringify(prior));
  validateDispositionFollowups(prior, notes, at);
  const receipt: DispositionFollowupReceipt = {
    kind: "rosevear_independent_recurrence_disposition_followup", schema_version: 1,
    exported_at: at, field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED",
    automatic_dispatch: "DISABLED", evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS",
    exception_receipt: prior,
    recurrence_disposition_followups: notes.map(note => ({ ...note, signals: [...note.signals] })),
  };
  if (JSON.stringify(receipt).length > MAX_DISPOSITION_FOLLOWUP_BYTES)
    throw new Error("Build 173 private receipt exceeds 7 MB.");
  return receipt;
}

/** Historical imports never grant a fresh Windows witness or independent approval. */
export function parseDispositionFollowupReceipt(raw: string) {
  if (raw.length > MAX_DISPOSITION_FOLLOWUP_BYTES) throw new Error("Build 173 import exceeds 7 MB.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Invalid Build 173 private JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid Build 173 receipt envelope.");
  const obj = value as Record<string, unknown>;
  if (obj.kind !== "rosevear_independent_recurrence_disposition_followup")
    return { ...parseExceptionReceipt(raw), recurrence_disposition_followups: [] as DispositionFollowupNote[] };
  const keys = ["kind", "schema_version", "exported_at", "field_acceptance",
    "independent_review", "closure", "automatic_dispatch", "evidence_authenticity",
    "exception_receipt", "recurrence_disposition_followups"];
  if (Object.keys(obj).length !== keys.length || Object.keys(obj).some(key => !keys.includes(key)) ||
    obj.schema_version !== 1 || !safeTime(obj.exported_at) ||
    obj.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
    obj.independent_review !== "INDEPENDENT_REVIEW_HOLD" || obj.closure !== "NOT_AUTHORIZED" ||
    obj.automatic_dispatch !== "DISABLED" ||
    obj.evidence_authenticity !== "UNVERIFIED_PRIVATE_ATTESTATIONS" ||
    !obj.exception_receipt || !Array.isArray(obj.recurrence_disposition_followups))
    throw new Error("Unsafe Build 173 permanent HOLD receipt.");
  const prior = obj.exception_receipt as ExceptionReceipt;
  if (prior.kind !== "rosevear_independent_recheck_outcome_exception_recurrence" ||
    Date.parse(prior.exported_at) > Date.parse(obj.exported_at as string))
    throw new Error("Build 173 nested chronology invalid.");
  const nested = parseExceptionReceipt(JSON.stringify(prior));
  validateDispositionFollowups(prior, obj.recurrence_disposition_followups as DispositionFollowupNote[],
    obj.exported_at as string);
  return { ...nested, recurrence_disposition_followups: (obj.recurrence_disposition_followups as DispositionFollowupNote[])
    .map(note => ({ ...note, signals: [...note.signals] })) };
}

/** Strict nested Build 172 append-only prefix: later exports cannot rewrite earlier notes. */
export function comparePrivateExceptionReceipts(beforeRaw: string, afterRaw: string) {
  if (beforeRaw.length > 6_700_000 || afterRaw.length > 6_700_000)
    throw new Error("Build 172 comparison exceeds 6.7 MB.");
  let before: ExceptionReceipt; let after: ExceptionReceipt;
  try { before = JSON.parse(beforeRaw) as ExceptionReceipt;
    after = JSON.parse(afterRaw) as ExceptionReceipt; }
  catch { throw new Error("Invalid Build 172 private JSON."); }
  if (before?.kind !== "rosevear_independent_recheck_outcome_exception_recurrence" ||
    after?.kind !== "rosevear_independent_recheck_outcome_exception_recurrence" ||
    Date.parse(before.exported_at) >= Date.parse(after.exported_at))
    throw new Error("Two chronological complete Build 172 receipts are required.");
  parseExceptionReceipt(beforeRaw); parseExceptionReceipt(afterRaw);
  const prefix = (a: unknown, b: unknown, key = ""): boolean => {
    if (key === "exported_at") return safeTime(a) && safeTime(b) && Date.parse(a) <= Date.parse(b);
    if (Array.isArray(a)) return Array.isArray(b) && a.length <= b.length &&
      a.every((item, index) => prefix(item, b[index]));
    if (a !== null && typeof a === "object") {
      if (b === null || typeof b !== "object" || Array.isArray(b)) return false;
      const left = a as Record<string, unknown>; const right = b as Record<string, unknown>;
      return Object.keys(left).length === Object.keys(right).length &&
        Object.keys(left).every(name => Object.hasOwn(right, name) && prefix(left[name], right[name], name));
    }
    return a === b;
  };
  if (!prefix(before, after) || !before.exception_recurrences.length ||
    before.exception_recurrences.length >= after.exception_recurrences.length)
    throw new Error("Build 172 nested evidence must be an exact nonempty append-only historical prefix.");
  let comparison: DispositionComparison | null = null;
  for (let late = before.exception_recurrences.length;
    late < after.exception_recurrences.length && !comparison; late++) {
    for (let early = before.exception_recurrences.length - 1; early >= 0; early--) {
      if (after.exception_recurrences[early].case_id !== after.exception_recurrences[late].case_id ||
        after.exception_recurrences[early].reassignment_watch_index !==
        after.exception_recurrences[late].reassignment_watch_index) continue;
      comparison = compareDispositionFollowups(after, early, late, after.exported_at); break;
    }
  }
  return { previous_recurrences: before.exception_recurrences.length,
    current_recurrences: after.exception_recurrences.length,
    new_recurrences: after.exception_recurrences.length - before.exception_recurrences.length,
    comparison };
}
