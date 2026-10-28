/** Build 175: manual private reviewer/owner/source continuity, never external authentication. */
import { validateInstalledVersion, type TrialEnvironment } from "./ownerFieldTrial";
import { parseHeldDispositionReceipt, type HeldReassessmentReceipt,
  type HeldReassessmentNote } from "./ownerHeldDispositionReassessment";

export type ReviewerFollowupCategory = "CONTINUE_INDEPENDENT_HOLD" |
  "REQUEST_SEPARATE_REVIEWER" | "REQUEST_OWNER_REWITNESS" |
  "REQUEST_OVERDUE_SOURCE_RENEWAL";
export const REVIEWER_FOLLOWUP_CATEGORIES: readonly ReviewerFollowupCategory[] = [
  "CONTINUE_INDEPENDENT_HOLD", "REQUEST_SEPARATE_REVIEWER",
  "REQUEST_OWNER_REWITNESS", "REQUEST_OVERDUE_SOURCE_RENEWAL",
];
export type ReviewerFollowupSignal = "LATER_OWNER_CLAIM_MISSING" |
  "LATER_SOURCE_CLAIM_MISSING" | "LATER_CLAIM_UNVERIFIED" |
  "REPEATED_OWNER_GAP" | "REPEATED_SOURCE_GAP" |
  "SOURCE_IDENTITY_DRIFT_UNRESOLVED" | "OVERDUE_SOURCE_RENEWAL" |
  "EARLIER_REVIEW_AGED" | "EARLIER_REVIEW_OVERDUE" |
  "INDEPENDENT_REVIEWER_EVIDENCE_MISSING" | "FIELD_AND_VAULT_HOLDS_CONTINUE";
export interface ReviewerFollowupComparison {
  earlier_reassessment_index: number;
  later_reassessment_index: number;
  case_id: HeldReassessmentNote["case_id"];
  reassignment_watch_index: number;
  earlier_at: string;
  later_at: string;
  earlier_followup_index: number;
  later_followup_index: number;
  later_owner_claim: boolean;
  later_distinct_source_claim: boolean;
  repeated_owner_gap: boolean;
  repeated_source_gap: boolean;
  source_identity_conflict: boolean;
  source_age_days: number | null;
  earlier_review_age_days: number;
  age_band: "UNDER_THREE_DAYS" | "THREE_TO_SEVEN_DAYS" | "OVER_SEVEN_DAYS";
  signals: ReviewerFollowupSignal[];
  independent_reviewer_verified: false;
  closure: "NOT_AUTHORIZED";
}
export interface ReviewerFollowupNote extends ReviewerFollowupComparison {
  recorded_at: string;
  category: ReviewerFollowupCategory;
  owner_evidence_rechecked: true;
  independent_hold_acknowledged: true;
  state: "PRIVATE_HELD_REVIEWER_FOLLOWUP_NOT_SENT";
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
}
export interface ReviewerFollowupReceipt {
  kind: "rosevear_held_reviewer_followup_source_renewal";
  schema_version: 1;
  exported_at: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
  automatic_dispatch: "DISABLED";
  evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS";
  held_receipt: HeldReassessmentReceipt;
  reviewer_followups: ReviewerFollowupNote[];
}
export const MAX_REVIEWER_FOLLOWUP_BYTES = 7_600_000;
const DAY = 86_400_000;
const comparisonFields = ["earlier_reassessment_index", "later_reassessment_index", "case_id",
  "reassignment_watch_index", "earlier_at", "later_at", "earlier_followup_index",
  "later_followup_index", "later_owner_claim", "later_distinct_source_claim",
  "repeated_owner_gap", "repeated_source_gap", "source_identity_conflict",
  "source_age_days", "earlier_review_age_days", "age_band", "signals",
  "independent_reviewer_verified", "closure"] as const;
const noteFields = [...comparisonFields, "recorded_at", "category", "owner_evidence_rechecked",
  "independent_hold_acknowledged", "state", "field_acceptance", "independent_review"];
function safeTime(value: unknown): value is string {
  return typeof value === "string" && /^20\d\d-\d\d-\d\dT/.test(value) &&
    Number.isFinite(Date.parse(value)) && Date.parse(value) >= Date.parse("2020-01-01T00:00:00Z") &&
    Date.parse(value) <= Date.now() + 300_000;
}
function validCategory(category: ReviewerFollowupCategory, signals: ReviewerFollowupSignal[]) {
  return category === "CONTINUE_INDEPENDENT_HOLD" ||
    category === "REQUEST_SEPARATE_REVIEWER" && signals.includes("INDEPENDENT_REVIEWER_EVIDENCE_MISSING") ||
    category === "REQUEST_OWNER_REWITNESS" && signals.includes("LATER_OWNER_CLAIM_MISSING") ||
    category === "REQUEST_OVERDUE_SOURCE_RENEWAL" && signals.includes("OVERDUE_SOURCE_RENEWAL");
}
export function compareHeldReviewerFollowups(prior: HeldReassessmentReceipt,
  earlierIndex: number, laterIndex: number, at = new Date().toISOString()): ReviewerFollowupComparison {
  const before = prior.held_disposition_reassessments[earlierIndex];
  const after = prior.held_disposition_reassessments[laterIndex];
  if (!Number.isInteger(earlierIndex) || !Number.isInteger(laterIndex) || earlierIndex < 0 ||
    laterIndex <= earlierIndex || !before || !after || before.case_id !== after.case_id ||
    before.reassignment_watch_index !== after.reassignment_watch_index ||
    after.later_followup_index <= before.later_followup_index ||
    Date.parse(before.recorded_at) >= Date.parse(after.recorded_at) ||
    !safeTime(at) || Date.parse(at) < Date.parse(after.recorded_at))
    throw new Error("Build 175 requires chronological same-watch held reassessments with a later disposition follow-up.");
  const nested = parseHeldDispositionReceipt(JSON.stringify(prior));
  const base = prior.disposition_receipt;
  const olderFollowup = base.recurrence_disposition_followups[before.later_followup_index];
  const newerFollowup = base.recurrence_disposition_followups[after.later_followup_index];
  if (!olderFollowup || !newerFollowup || olderFollowup.case_id !== after.case_id ||
    newerFollowup.case_id !== after.case_id ||
    olderFollowup.reassignment_watch_index !== after.reassignment_watch_index ||
    newerFollowup.reassignment_watch_index !== after.reassignment_watch_index)
    throw new Error("Build 175 referenced held disposition evidence is inconsistent.");
  const oldCheck = olderFollowup.later_source_check_index === null ? null :
    nested.checks[olderFollowup.later_source_check_index];
  const newCheck = newerFollowup.later_source_check_index === null ? null :
    nested.checks[newerFollowup.later_source_check_index];
  const recurrence = base.exception_receipt.exception_recurrences[newerFollowup.later_recurrence_index];
  const outcome = base.exception_receipt.drift_outcome_receipt.drift_outcomes[recurrence?.latest_outcome_index];
  const renewal = base.exception_receipt.drift_outcome_receipt.renewal_receipt.renewal_rechecks[
    outcome?.latest_recheck_index];
  const ownerFollowup = nested.aging_followups[renewal?.latest_followup_index];
  const observationIndex = nested.aging_audits[ownerFollowup?.latest_audit_index]?.latest_observation_index;
  const owner = observationIndex === undefined ? null : nested.trial.observations[observationIndex];
  const ownerFresh = !!owner && owner.case_id === after.case_id && owner.witnessed_by_operator &&
    Date.parse(owner.observed_at) > Date.parse(before.recorded_at) &&
    Date.parse(owner.observed_at) <= Date.parse(after.recorded_at);
  const sourceFresh = !!newCheck && newCheck.case_id === after.case_id &&
    olderFollowup.later_source_check_index !== newerFollowup.later_source_check_index &&
    Date.parse(newCheck.captured_at) > Date.parse(before.recorded_at) &&
    Date.parse(newCheck.captured_at) <= Date.parse(after.recorded_at) &&
    (!oldCheck || Date.parse(newCheck.captured_at) > Date.parse(oldCheck.captured_at));
  const ownerGap = before.signals.includes("OWNER_CONTINUITY_GAP") &&
    after.signals.includes("OWNER_CONTINUITY_GAP");
  const sourceGap = before.signals.includes("SOURCE_CONTINUITY_GAP") &&
    after.signals.includes("SOURCE_CONTINUITY_GAP");
  const conflict = before.identity_conflict_unresolved || after.identity_conflict_unresolved ||
    !!oldCheck && !!newCheck && (oldCheck.safe_alias !== newCheck.safe_alias ||
      oldCheck.identity_state !== newCheck.identity_state ||
      oldCheck.installed_version !== newCheck.installed_version || oldCheck.access !== newCheck.access);
  const sourceAge = newCheck ? Math.floor((Date.parse(at) - Date.parse(newCheck.captured_at)) / DAY) : null;
  const reviewAge = Math.floor((Date.parse(at) - Date.parse(before.recorded_at)) / DAY);
  const signals: ReviewerFollowupSignal[] = [];
  if (!ownerFresh) signals.push("LATER_OWNER_CLAIM_MISSING");
  if (!sourceFresh) signals.push("LATER_SOURCE_CLAIM_MISSING");
  if (ownerFresh || sourceFresh) signals.push("LATER_CLAIM_UNVERIFIED");
  if (ownerGap) signals.push("REPEATED_OWNER_GAP");
  if (sourceGap) signals.push("REPEATED_SOURCE_GAP");
  if (conflict) signals.push("SOURCE_IDENTITY_DRIFT_UNRESOLVED");
  if (sourceAge === null || sourceAge > 7) signals.push("OVERDUE_SOURCE_RENEWAL");
  if (reviewAge >= 3) signals.push("EARLIER_REVIEW_AGED");
  if (reviewAge > 7) signals.push("EARLIER_REVIEW_OVERDUE");
  signals.push("INDEPENDENT_REVIEWER_EVIDENCE_MISSING", "FIELD_AND_VAULT_HOLDS_CONTINUE");
  return { earlier_reassessment_index: earlierIndex, later_reassessment_index: laterIndex,
    case_id: before.case_id, reassignment_watch_index: before.reassignment_watch_index,
    earlier_at: before.recorded_at, later_at: after.recorded_at,
    earlier_followup_index: before.later_followup_index, later_followup_index: after.later_followup_index,
    later_owner_claim: ownerFresh, later_distinct_source_claim: sourceFresh,
    repeated_owner_gap: ownerGap, repeated_source_gap: sourceGap,
    source_identity_conflict: conflict, source_age_days: sourceAge,
    earlier_review_age_days: reviewAge,
    age_band: reviewAge > 7 ? "OVER_SEVEN_DAYS" : reviewAge >= 3 ?
      "THREE_TO_SEVEN_DAYS" : "UNDER_THREE_DAYS", signals,
    independent_reviewer_verified: false, closure: "NOT_AUTHORIZED" };
}
export function validateHeldReviewerFollowups(prior: HeldReassessmentReceipt,
  notes: readonly ReviewerFollowupNote[], exportedAt?: string) {
  if (notes.length > 100) throw new Error("Build 175 permits at most 100 HOLD reviewer notes.");
  let previous = 0; const seen = new Set<string>();
  for (const note of notes) {
    if (!note || Object.keys(note).length !== noteFields.length ||
      Object.keys(note).some(k => !noteFields.includes(k)) || !safeTime(note.recorded_at) ||
      !REVIEWER_FOLLOWUP_CATEGORIES.includes(note.category) ||
      note.owner_evidence_rechecked !== true || note.independent_hold_acknowledged !== true ||
      note.state !== "PRIVATE_HELD_REVIEWER_FOLLOWUP_NOT_SENT" ||
      note.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
      note.independent_review !== "INDEPENDENT_REVIEW_HOLD")
      throw new Error("Unsafe Build 175 immutable reviewer HOLD note.");
    const time = Date.parse(note.recorded_at);
    if (time < previous || exportedAt && time > Date.parse(exportedAt))
      throw new Error("Build 175 reviewer chronology invalid.");
    const expected = compareHeldReviewerFollowups(prior,
      note.earlier_reassessment_index, note.later_reassessment_index, note.recorded_at);
    if (comparisonFields.some(k => JSON.stringify(note[k]) !== JSON.stringify(expected[k])))
      throw new Error("Build 175 immutable reviewer/source evidence was altered.");
    if (!validCategory(note.category, expected.signals))
      throw new Error("Build 175 category requires unresolved evidence.");
    const key = `${note.earlier_reassessment_index}:${note.later_reassessment_index}:${note.category}`;
    if (seen.has(key)) throw new Error("Duplicate Build 175 private reviewer follow-up.");
    seen.add(key); previous = time;
  }
}
export function recordHeldReviewerFollowup(prior: HeldReassessmentReceipt,
  notes: readonly ReviewerFollowupNote[], environment: TrialEnvironment,
  imported: { reassessments: number; followups: number }, input: {
    earlier_reassessment_index: number; later_reassessment_index: number;
    category: ReviewerFollowupCategory; owner_evidence_rechecked: boolean;
    independent_hold_acknowledged: boolean }, at = new Date().toISOString()): ReviewerFollowupNote[] {
  if (!environment.installed_windows_witnessed || !validateInstalledVersion(environment.installed_version) ||
    environment.access === "unknown" || input.later_reassessment_index < imported.reassessments ||
    notes.length < imported.followups || !input.owner_evidence_rechecked ||
    !input.independent_hold_acknowledged || !REVIEWER_FOLLOWUP_CATEGORIES.includes(input.category))
    throw new Error("Build 175 requires a non-imported later reassessment, witnessed Windows and two HOLD attestations.");
  const comparison = compareHeldReviewerFollowups(prior,
    input.earlier_reassessment_index, input.later_reassessment_index, at);
  if (!validCategory(input.category, comparison.signals))
    throw new Error("Build 175 category requires unresolved evidence.");
  const next: ReviewerFollowupNote[] = [...notes, { ...comparison, recorded_at: at,
    category: input.category, owner_evidence_rechecked: true, independent_hold_acknowledged: true,
    state: "PRIVATE_HELD_REVIEWER_FOLLOWUP_NOT_SENT", field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD" }];
  validateHeldReviewerFollowups(prior, next);
  return next;
}
export function createHeldReviewerReceipt(prior: HeldReassessmentReceipt,
  notes: readonly ReviewerFollowupNote[], at = new Date().toISOString()): ReviewerFollowupReceipt {
  if (prior.kind !== "rosevear_held_disposition_source_recheck_reassessment" ||
    !safeTime(at) || Date.parse(at) < Date.parse(prior.exported_at))
    throw new Error("Build 175 requires a chronological full Build 174 receipt.");
  parseHeldDispositionReceipt(JSON.stringify(prior));
  validateHeldReviewerFollowups(prior, notes, at);
  const receipt: ReviewerFollowupReceipt = { kind: "rosevear_held_reviewer_followup_source_renewal",
    schema_version: 1, exported_at: at, field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED",
    automatic_dispatch: "DISABLED", evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS",
    held_receipt: prior, reviewer_followups: notes.map(n => ({ ...n, signals: [...n.signals] })) };
  if (JSON.stringify(receipt).length > MAX_REVIEWER_FOLLOWUP_BYTES)
    throw new Error("Build 175 private receipt exceeds 7.6 MB.");
  return receipt;
}
export function parseHeldReviewerReceipt(raw: string) {
  if (raw.length > MAX_REVIEWER_FOLLOWUP_BYTES) throw new Error("Build 175 import exceeds 7.6 MB.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Invalid Build 175 private JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid Build 175 receipt envelope.");
  const obj = value as Record<string, unknown>;
  if (obj.kind !== "rosevear_held_reviewer_followup_source_renewal")
    return { ...parseHeldDispositionReceipt(raw), reviewer_followups: [] as ReviewerFollowupNote[] };
  const keys = ["kind", "schema_version", "exported_at", "field_acceptance",
    "independent_review", "closure", "automatic_dispatch", "evidence_authenticity",
    "held_receipt", "reviewer_followups"];
  if (Object.keys(obj).length !== keys.length || Object.keys(obj).some(k => !keys.includes(k)) ||
    obj.schema_version !== 1 || !safeTime(obj.exported_at) ||
    obj.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
    obj.independent_review !== "INDEPENDENT_REVIEW_HOLD" || obj.closure !== "NOT_AUTHORIZED" ||
    obj.automatic_dispatch !== "DISABLED" ||
    obj.evidence_authenticity !== "UNVERIFIED_PRIVATE_ATTESTATIONS" ||
    !obj.held_receipt || !Array.isArray(obj.reviewer_followups))
    throw new Error("Unsafe Build 175 reviewer HOLD receipt.");
  const prior = obj.held_receipt as HeldReassessmentReceipt;
  if (prior.kind !== "rosevear_held_disposition_source_recheck_reassessment" ||
    Date.parse(prior.exported_at) > Date.parse(obj.exported_at as string))
    throw new Error("Build 175 nested chronology invalid.");
  const nested = parseHeldDispositionReceipt(JSON.stringify(prior));
  validateHeldReviewerFollowups(prior, obj.reviewer_followups as ReviewerFollowupNote[],
    obj.exported_at as string);
  return { ...nested, reviewer_followups: (obj.reviewer_followups as ReviewerFollowupNote[])
    .map(n => ({ ...n, signals: [...n.signals] })) };
}
/** Historical Build 174 exports are exact append-only nested prefixes, not independently signed proof. */
export function compareHeldReviewerReceipts(beforeRaw: string, afterRaw: string) {
  if (beforeRaw.length > 7_300_000 || afterRaw.length > 7_300_000)
    throw new Error("Build 174 historical comparison exceeds 7.3 MB.");
  let before: HeldReassessmentReceipt; let after: HeldReassessmentReceipt;
  try { before = JSON.parse(beforeRaw) as HeldReassessmentReceipt;
    after = JSON.parse(afterRaw) as HeldReassessmentReceipt; }
  catch { throw new Error("Invalid Build 174 private JSON."); }
  if (before?.kind !== "rosevear_held_disposition_source_recheck_reassessment" ||
    after?.kind !== "rosevear_held_disposition_source_recheck_reassessment" ||
    Date.parse(before.exported_at) >= Date.parse(after.exported_at))
    throw new Error("Two chronological complete Build 174 receipts are required.");
  parseHeldDispositionReceipt(beforeRaw); parseHeldDispositionReceipt(afterRaw);
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
  if (!prefix(before, after) || !before.held_disposition_reassessments.length ||
    before.held_disposition_reassessments.length >= after.held_disposition_reassessments.length)
    throw new Error("Build 174 nested evidence must be an exact nonempty append-only historical prefix.");
  let comparison: ReviewerFollowupComparison | null = null;
  for (let later = before.held_disposition_reassessments.length;
    later < after.held_disposition_reassessments.length && !comparison; later++) {
    for (let earlier = before.held_disposition_reassessments.length - 1; earlier >= 0; earlier--) {
      const old = after.held_disposition_reassessments[earlier];
      const next = after.held_disposition_reassessments[later];
      if (old.case_id !== next.case_id ||
        old.reassignment_watch_index !== next.reassignment_watch_index ||
        old.later_followup_index >= next.later_followup_index) continue;
      comparison = compareHeldReviewerFollowups(after, earlier, later, after.exported_at); break;
    }
  }
  return { previous_reassessments: before.held_disposition_reassessments.length,
    current_reassessments: after.held_disposition_reassessments.length,
    new_reassessments: after.held_disposition_reassessments.length -
      before.held_disposition_reassessments.length, comparison };
}
