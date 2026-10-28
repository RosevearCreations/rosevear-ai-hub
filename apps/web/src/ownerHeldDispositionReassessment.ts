/** Build 174: local-only continuity review; claims are not authenticated reviewer proof. */
import { validateInstalledVersion, type TrialEnvironment } from "./ownerFieldTrial";
import { parseDispositionFollowupReceipt, type DispositionFollowupNote,
  type DispositionFollowupReceipt } from "./ownerRecurrenceDispositionFollowup";

export type HeldReassessmentCategory = "CONTINUE_INDEPENDENT_HOLD" |
  "REQUEST_OWNER_REWITNESS" | "REQUEST_SOURCE_REVALIDATION" |
  "REQUEST_SEPARATE_REVIEWER_PROOF";
export const HELD_REASSESSMENT_CATEGORIES: readonly HeldReassessmentCategory[] = [
  "CONTINUE_INDEPENDENT_HOLD", "REQUEST_OWNER_REWITNESS",
  "REQUEST_SOURCE_REVALIDATION", "REQUEST_SEPARATE_REVIEWER_PROOF",
];
export type HeldSignal = "OWNER_CONTINUITY_GAP" | "SOURCE_CONTINUITY_GAP" |
  "REPEATED_OWNER_GAP" | "REPEATED_SOURCE_GAP" |
  "SOURCE_IDENTITY_CONFLICT_UNRESOLVED" | "FOLLOWUP_DISPOSITION_CHANGED" |
  "CLAIMED_LATER_OWNER_SOURCE_UNVERIFIED" | "SOURCE_OVERDUE" |
  "EARLIER_FOLLOWUP_AGED" | "EARLIER_FOLLOWUP_OVERDUE" |
  "SEPARATE_REVIEWER_PROOF_MISSING" | "INDEPENDENT_HOLD_CONTINUES";
export interface HeldReassessmentComparison {
  earlier_followup_index: number;
  later_followup_index: number;
  case_id: DispositionFollowupNote["case_id"];
  reassignment_watch_index: number;
  earlier_at: string;
  later_at: string;
  earlier_recurrence_index: number;
  later_recurrence_index: number;
  earlier_source_check_index: number | null;
  later_source_check_index: number | null;
  newer_owner_witness_claim: boolean;
  newer_source_check_claim: boolean;
  repeated_owner_gap: boolean;
  repeated_source_gap: boolean;
  identity_conflict_unresolved: boolean;
  source_age_days: number | null;
  earlier_followup_age_days: number;
  age_band: "UNDER_THREE_DAYS" | "THREE_TO_SEVEN_DAYS" | "OVER_SEVEN_DAYS";
  signals: HeldSignal[];
  independent_reviewer_verified: false;
  closure: "NOT_AUTHORIZED";
}
export interface HeldReassessmentNote extends HeldReassessmentComparison {
  recorded_at: string;
  category: HeldReassessmentCategory;
  personally_rechecked: true;
  separate_hold_acknowledged: true;
  state: "PRIVATE_HELD_DISPOSITION_REASSESSMENT_NOT_SENT";
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
}
export interface HeldReassessmentReceipt {
  kind: "rosevear_held_disposition_source_recheck_reassessment";
  schema_version: 1;
  exported_at: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
  automatic_dispatch: "DISABLED";
  evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS";
  disposition_receipt: DispositionFollowupReceipt;
  held_disposition_reassessments: HeldReassessmentNote[];
}
export const MAX_HELD_REASSESSMENT_BYTES = 7_300_000;
const DAY = 86_400_000;
const comparisonFields = ["earlier_followup_index", "later_followup_index", "case_id",
  "reassignment_watch_index", "earlier_at", "later_at", "earlier_recurrence_index",
  "later_recurrence_index", "earlier_source_check_index", "later_source_check_index",
  "newer_owner_witness_claim", "newer_source_check_claim", "repeated_owner_gap",
  "repeated_source_gap", "identity_conflict_unresolved", "source_age_days",
  "earlier_followup_age_days", "age_band", "signals", "independent_reviewer_verified",
  "closure"] as const;
const noteFields = [...comparisonFields, "recorded_at", "category", "personally_rechecked",
  "separate_hold_acknowledged", "state", "field_acceptance", "independent_review"];

function safeTime(value: unknown): value is string {
  return typeof value === "string" && /^20\d\d-\d\d-\d\dT/.test(value) &&
    Number.isFinite(Date.parse(value)) && Date.parse(value) >= Date.parse("2020-01-01T00:00:00Z") &&
    Date.parse(value) <= Date.now() + 300_000;
}

function validCategory(category: HeldReassessmentCategory, signals: readonly HeldSignal[]) {
  return category === "CONTINUE_INDEPENDENT_HOLD" ||
    category === "REQUEST_OWNER_REWITNESS" && signals.includes("OWNER_CONTINUITY_GAP") ||
    category === "REQUEST_SOURCE_REVALIDATION" && signals.some(s =>
      ["SOURCE_CONTINUITY_GAP", "SOURCE_IDENTITY_CONFLICT_UNRESOLVED", "SOURCE_OVERDUE"].includes(s)) ||
    category === "REQUEST_SEPARATE_REVIEWER_PROOF" &&
      signals.includes("SEPARATE_REVIEWER_PROOF_MISSING");
}

export function compareHeldDispositionReassessments(prior: DispositionFollowupReceipt,
  earlierIndex: number, laterIndex: number, at = new Date().toISOString()): HeldReassessmentComparison {
  const before = prior.recurrence_disposition_followups[earlierIndex];
  const after = prior.recurrence_disposition_followups[laterIndex];
  if (!Number.isInteger(earlierIndex) || !Number.isInteger(laterIndex) || earlierIndex < 0 ||
    laterIndex <= earlierIndex || !before || !after || before.case_id !== after.case_id ||
    before.reassignment_watch_index !== after.reassignment_watch_index ||
    before.later_recurrence_index > after.later_recurrence_index ||
    Date.parse(before.recorded_at) >= Date.parse(after.recorded_at) ||
    !safeTime(at) || Date.parse(at) < Date.parse(after.recorded_at))
    throw new Error("Build 174 requires chronological same-watch Build 173 HOLD follow-ups without recurrence regression.");
  const nested = parseDispositionFollowupReceipt(JSON.stringify(prior));
  const earlierCheck = before.later_source_check_index === null ? null :
    nested.checks[before.later_source_check_index];
  const laterCheck = after.later_source_check_index === null ? null :
    nested.checks[after.later_source_check_index];
  const exception = prior.exception_receipt;
  const laterRecurrence = exception.exception_recurrences[after.later_recurrence_index];
  const laterOutcome = exception.drift_outcome_receipt.drift_outcomes[laterRecurrence?.latest_outcome_index];
  const laterRenewal = exception.drift_outcome_receipt.renewal_receipt.renewal_rechecks[
    laterOutcome?.latest_recheck_index];
  const followup = nested.aging_followups[laterRenewal?.latest_followup_index];
  const observationIndex = nested.aging_audits[followup?.latest_audit_index]?.latest_observation_index;
  const owner = observationIndex === undefined ? null : nested.trial.observations[observationIndex];
  const newerOwner = !!owner && owner.case_id === after.case_id &&
    owner.witnessed_by_operator && Date.parse(owner.observed_at) > Date.parse(before.recorded_at) &&
    Date.parse(owner.observed_at) <= Date.parse(after.recorded_at);
  const newerSource = !!laterCheck && laterCheck.case_id === after.case_id &&
    after.later_source_check_index !== before.later_source_check_index &&
    Date.parse(laterCheck.captured_at) > Date.parse(before.recorded_at) &&
    Date.parse(laterCheck.captured_at) <= Date.parse(after.recorded_at) &&
    (!earlierCheck || Date.parse(laterCheck.captured_at) > Date.parse(earlierCheck.captured_at));
  const ownerGap = before.signals.includes("OWNER_REWITNESS_MISSING") &&
    after.signals.includes("OWNER_REWITNESS_MISSING");
  const sourceGap = before.signals.includes("SOURCE_RECHECK_MISSING") &&
    after.signals.includes("SOURCE_RECHECK_MISSING");
  const conflict = before.source_identity_or_access_conflict || after.source_identity_or_access_conflict ||
    !!earlierCheck && !!laterCheck && (
      earlierCheck.safe_alias !== laterCheck.safe_alias ||
      earlierCheck.identity_state !== laterCheck.identity_state ||
      earlierCheck.installed_version !== laterCheck.installed_version ||
      earlierCheck.access !== laterCheck.access);
  const sourceAge = laterCheck ? Math.floor((Date.parse(at) - Date.parse(laterCheck.captured_at)) / DAY) : null;
  const followupAge = Math.floor((Date.parse(at) - Date.parse(before.recorded_at)) / DAY);
  const signals: HeldSignal[] = [];
  if (!newerOwner) signals.push("OWNER_CONTINUITY_GAP");
  if (!newerSource) signals.push("SOURCE_CONTINUITY_GAP");
  if (ownerGap) signals.push("REPEATED_OWNER_GAP");
  if (sourceGap) signals.push("REPEATED_SOURCE_GAP");
  if (conflict) signals.push("SOURCE_IDENTITY_CONFLICT_UNRESOLVED");
  if (before.category !== after.category) signals.push("FOLLOWUP_DISPOSITION_CHANGED");
  if (newerOwner && newerSource) signals.push("CLAIMED_LATER_OWNER_SOURCE_UNVERIFIED");
  if (sourceAge === null || sourceAge > 7) signals.push("SOURCE_OVERDUE");
  if (followupAge >= 3) signals.push("EARLIER_FOLLOWUP_AGED");
  if (followupAge > 7) signals.push("EARLIER_FOLLOWUP_OVERDUE");
  signals.push("SEPARATE_REVIEWER_PROOF_MISSING", "INDEPENDENT_HOLD_CONTINUES");
  return { earlier_followup_index: earlierIndex, later_followup_index: laterIndex,
    case_id: before.case_id, reassignment_watch_index: before.reassignment_watch_index,
    earlier_at: before.recorded_at, later_at: after.recorded_at,
    earlier_recurrence_index: before.later_recurrence_index,
    later_recurrence_index: after.later_recurrence_index,
    earlier_source_check_index: before.later_source_check_index,
    later_source_check_index: after.later_source_check_index,
    newer_owner_witness_claim: newerOwner, newer_source_check_claim: newerSource,
    repeated_owner_gap: ownerGap, repeated_source_gap: sourceGap,
    identity_conflict_unresolved: conflict, source_age_days: sourceAge,
    earlier_followup_age_days: followupAge,
    age_band: followupAge > 7 ? "OVER_SEVEN_DAYS" : followupAge >= 3 ?
      "THREE_TO_SEVEN_DAYS" : "UNDER_THREE_DAYS", signals,
    independent_reviewer_verified: false, closure: "NOT_AUTHORIZED" };
}

export function validateHeldDispositionReassessments(prior: DispositionFollowupReceipt,
  notes: readonly HeldReassessmentNote[], exportedAt?: string) {
  if (notes.length > 100) throw new Error("Build 174 permits at most 100 private HOLD notes.");
  let previous = 0; const seen = new Set<string>();
  for (const note of notes) {
    if (!note || Object.keys(note).length !== noteFields.length ||
      Object.keys(note).some(key => !noteFields.includes(key)) || !safeTime(note.recorded_at) ||
      !HELD_REASSESSMENT_CATEGORIES.includes(note.category) ||
      note.personally_rechecked !== true || note.separate_hold_acknowledged !== true ||
      note.state !== "PRIVATE_HELD_DISPOSITION_REASSESSMENT_NOT_SENT" ||
      note.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
      note.independent_review !== "INDEPENDENT_REVIEW_HOLD")
      throw new Error("Unsafe Build 174 immutable private HOLD note.");
    const at = Date.parse(note.recorded_at);
    if (at < previous || exportedAt && at > Date.parse(exportedAt))
      throw new Error("Build 174 follow-up chronology invalid.");
    const expected = compareHeldDispositionReassessments(prior,
      note.earlier_followup_index, note.later_followup_index, note.recorded_at);
    if (comparisonFields.some(key => JSON.stringify(note[key]) !== JSON.stringify(expected[key])))
      throw new Error("Build 174 immutable source/reviewer evidence was altered.");
    if (!validCategory(note.category, expected.signals))
      throw new Error("Build 174 category requires an unresolved exception.");
    const key = `${note.earlier_followup_index}:${note.later_followup_index}:${note.category}`;
    if (seen.has(key)) throw new Error("Duplicate Build 174 private reassessment.");
    seen.add(key); previous = at;
  }
}

export function recordHeldDispositionReassessment(prior: DispositionFollowupReceipt,
  notes: readonly HeldReassessmentNote[], environment: TrialEnvironment,
  imported: { followups: number; reassessments: number }, input: {
    earlier_followup_index: number; later_followup_index: number;
    category: HeldReassessmentCategory; personally_rechecked: boolean;
    separate_hold_acknowledged: boolean }, at = new Date().toISOString()): HeldReassessmentNote[] {
  if (!environment.installed_windows_witnessed || !validateInstalledVersion(environment.installed_version) ||
    environment.access === "unknown" || input.later_followup_index < imported.followups ||
    notes.length < imported.reassessments || !input.personally_rechecked ||
    !input.separate_hold_acknowledged || !HELD_REASSESSMENT_CATEGORIES.includes(input.category))
    throw new Error("Build 174 requires a non-imported later follow-up, witnessed Windows and two HOLD attestations.");
  const comparison = compareHeldDispositionReassessments(prior,
    input.earlier_followup_index, input.later_followup_index, at);
  if (!validCategory(input.category, comparison.signals))
    throw new Error("Build 174 category requires unresolved evidence.");
  const next: HeldReassessmentNote[] = [...notes, { ...comparison, recorded_at: at,
    category: input.category, personally_rechecked: true, separate_hold_acknowledged: true,
    state: "PRIVATE_HELD_DISPOSITION_REASSESSMENT_NOT_SENT",
    field_acceptance: "FIELD_ACCEPTANCE_HOLD", independent_review: "INDEPENDENT_REVIEW_HOLD" }];
  validateHeldDispositionReassessments(prior, next);
  return next;
}

export function createHeldDispositionReceipt(prior: DispositionFollowupReceipt,
  notes: readonly HeldReassessmentNote[], at = new Date().toISOString()): HeldReassessmentReceipt {
  if (prior.kind !== "rosevear_independent_recurrence_disposition_followup" ||
    !safeTime(at) || Date.parse(at) < Date.parse(prior.exported_at))
    throw new Error("Build 174 requires a chronological complete Build 173 receipt.");
  parseDispositionFollowupReceipt(JSON.stringify(prior));
  validateHeldDispositionReassessments(prior, notes, at);
  const receipt: HeldReassessmentReceipt = {
    kind: "rosevear_held_disposition_source_recheck_reassessment", schema_version: 1,
    exported_at: at, field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED",
    automatic_dispatch: "DISABLED", evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS",
    disposition_receipt: prior,
    held_disposition_reassessments: notes.map(note => ({ ...note, signals: [...note.signals] })),
  };
  if (JSON.stringify(receipt).length > MAX_HELD_REASSESSMENT_BYTES)
    throw new Error("Build 174 receipt exceeds 7.3 MB.");
  return receipt;
}

export function parseHeldDispositionReceipt(raw: string) {
  if (raw.length > MAX_HELD_REASSESSMENT_BYTES) throw new Error("Build 174 import exceeds 7.3 MB.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Invalid Build 174 private JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid Build 174 receipt envelope.");
  const obj = value as Record<string, unknown>;
  if (obj.kind !== "rosevear_held_disposition_source_recheck_reassessment")
    return { ...parseDispositionFollowupReceipt(raw), held_disposition_reassessments: [] as HeldReassessmentNote[] };
  const keys = ["kind", "schema_version", "exported_at", "field_acceptance",
    "independent_review", "closure", "automatic_dispatch", "evidence_authenticity",
    "disposition_receipt", "held_disposition_reassessments"];
  if (Object.keys(obj).length !== keys.length || Object.keys(obj).some(k => !keys.includes(k)) ||
    obj.schema_version !== 1 || !safeTime(obj.exported_at) ||
    obj.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
    obj.independent_review !== "INDEPENDENT_REVIEW_HOLD" || obj.closure !== "NOT_AUTHORIZED" ||
    obj.automatic_dispatch !== "DISABLED" ||
    obj.evidence_authenticity !== "UNVERIFIED_PRIVATE_ATTESTATIONS" ||
    !obj.disposition_receipt || !Array.isArray(obj.held_disposition_reassessments))
    throw new Error("Unsafe Build 174 permanent HOLD receipt.");
  const prior = obj.disposition_receipt as DispositionFollowupReceipt;
  if (prior.kind !== "rosevear_independent_recurrence_disposition_followup" ||
    Date.parse(prior.exported_at) > Date.parse(obj.exported_at as string))
    throw new Error("Build 174 nested chronology invalid.");
  const nested = parseDispositionFollowupReceipt(JSON.stringify(prior));
  validateHeldDispositionReassessments(prior, obj.held_disposition_reassessments as HeldReassessmentNote[],
    obj.exported_at as string);
  return { ...nested, held_disposition_reassessments:
    (obj.held_disposition_reassessments as HeldReassessmentNote[]).map(note =>
      ({ ...note, signals: [...note.signals] })) };
}

/** Historical Build 173 exports must be exact append-only prefixes, including every nested stream. */
export function compareHeldDispositionReceipts(beforeRaw: string, afterRaw: string) {
  if (beforeRaw.length > 7_000_000 || afterRaw.length > 7_000_000)
    throw new Error("Build 173 comparison exceeds 7 MB.");
  let before: DispositionFollowupReceipt; let after: DispositionFollowupReceipt;
  try { before = JSON.parse(beforeRaw) as DispositionFollowupReceipt;
    after = JSON.parse(afterRaw) as DispositionFollowupReceipt; }
  catch { throw new Error("Invalid Build 173 private JSON."); }
  if (before?.kind !== "rosevear_independent_recurrence_disposition_followup" ||
    after?.kind !== "rosevear_independent_recurrence_disposition_followup" ||
    Date.parse(before.exported_at) >= Date.parse(after.exported_at))
    throw new Error("Two chronological complete Build 173 receipts are required.");
  parseDispositionFollowupReceipt(beforeRaw); parseDispositionFollowupReceipt(afterRaw);
  const prefix = (a: unknown, b: unknown, key = ""): boolean => {
    if (key === "exported_at") return safeTime(a) && safeTime(b) && Date.parse(a) <= Date.parse(b);
    if (Array.isArray(a)) return Array.isArray(b) && a.length <= b.length &&
      a.every((item, i) => prefix(item, b[i]));
    if (a !== null && typeof a === "object") {
      if (b === null || typeof b !== "object" || Array.isArray(b)) return false;
      const left = a as Record<string, unknown>; const right = b as Record<string, unknown>;
      return Object.keys(left).length === Object.keys(right).length &&
        Object.keys(left).every(k => Object.hasOwn(right, k) && prefix(left[k], right[k], k));
    }
    return a === b;
  };
  if (!prefix(before, after) || !before.recurrence_disposition_followups.length ||
    before.recurrence_disposition_followups.length >= after.recurrence_disposition_followups.length)
    throw new Error("Build 173 nested evidence must be an exact nonempty append-only historical prefix.");
  let comparison: HeldReassessmentComparison | null = null;
  for (let later = before.recurrence_disposition_followups.length;
    later < after.recurrence_disposition_followups.length && !comparison; later++) {
    for (let earlier = before.recurrence_disposition_followups.length - 1; earlier >= 0; earlier--) {
      if (after.recurrence_disposition_followups[earlier].case_id !==
        after.recurrence_disposition_followups[later].case_id ||
        after.recurrence_disposition_followups[earlier].reassignment_watch_index !==
        after.recurrence_disposition_followups[later].reassignment_watch_index) continue;
      comparison = compareHeldDispositionReassessments(after, earlier, later, after.exported_at); break;
    }
  }
  return { previous_followups: before.recurrence_disposition_followups.length,
    current_followups: after.recurrence_disposition_followups.length,
    new_followups: after.recurrence_disposition_followups.length -
      before.recurrence_disposition_followups.length, comparison };
}
