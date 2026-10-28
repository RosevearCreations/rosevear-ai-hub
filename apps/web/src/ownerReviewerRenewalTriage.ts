/** Build 176: private source evidence comparison and operator-test preparation, not authorization. */
import { validateInstalledVersion, type TrialEnvironment } from "./ownerFieldTrial";
import { parseHeldReviewerReceipt, type ReviewerFollowupNote,
  type ReviewerFollowupReceipt } from "./ownerHeldReviewerFollowup";

export type RenewalTriageCategory = "CONTINUE_INDEPENDENT_HOLD" |
  "REQUEST_OWNER_REWITNESS" | "REQUEST_SOURCE_REVALIDATION" |
  "REQUEST_PRIVATE_RUNNER_SCOPE_REVIEW";
export const RENEWAL_TRIAGE_CATEGORIES: readonly RenewalTriageCategory[] = [
  "CONTINUE_INDEPENDENT_HOLD", "REQUEST_OWNER_REWITNESS",
  "REQUEST_SOURCE_REVALIDATION", "REQUEST_PRIVATE_RUNNER_SCOPE_REVIEW",
];
export type RenewalTriageSignal = "NEW_OWNER_EVIDENCE_MISSING" |
  "NEW_SOURCE_EVIDENCE_MISSING" | "LATER_PRIVATE_CLAIMS_UNVERIFIED" |
  "REPEATED_OWNER_GAP" | "REPEATED_SOURCE_GAP" |
  "SOURCE_IDENTITY_OR_ACCESS_DRIFT" | "SOURCE_RENEWAL_OVERDUE" |
  "EARLIER_REVIEW_AGED" | "EARLIER_REVIEW_OVERDUE" |
  "PRIVATE_RUNNER_APPROVAL_NOT_SUPPLIED" | "SEPARATE_REVIEWER_PROOF_NOT_SUPPLIED" |
  "QL248_PIN_AND_PROOF_PENDING" | "FIELD_AND_VAULT_HOLDS_CONTINUE";
export interface RenewalTriageComparison {
  earlier_reviewer_index: number;
  later_reviewer_index: number;
  case_id: ReviewerFollowupNote["case_id"];
  reassignment_watch_index: number;
  earlier_at: string;
  later_at: string;
  earlier_reassessment_index: number;
  later_reassessment_index: number;
  newer_owner_witness_claim: boolean;
  newer_distinct_source_claim: boolean;
  repeated_owner_gap: boolean;
  repeated_source_gap: boolean;
  source_identity_drift: boolean;
  source_age_days: number | null;
  earlier_review_age_days: number;
  age_band: "UNDER_THREE_DAYS" | "THREE_TO_SEVEN_DAYS" | "OVER_SEVEN_DAYS";
  signals: RenewalTriageSignal[];
  private_runner_approval: "NOT_GIVEN";
  independently_witnessed: false;
  closure: "NOT_AUTHORIZED";
}
export interface RenewalTriageNote extends RenewalTriageComparison {
  recorded_at: string;
  category: RenewalTriageCategory;
  personally_rechecked: true;
  separate_hold_acknowledged: true;
  state: "PRIVATE_REVIEWER_RENEWAL_TRIAGE_NOT_SENT";
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
}
export interface RenewalTriageReceipt {
  kind: "rosevear_independent_reviewer_renewal_outcome_triage";
  schema_version: 1;
  exported_at: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
  connection_state: "DISCONNECTED";
  private_runner_approval: "NOT_GIVEN";
  evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS";
  reviewer_receipt: ReviewerFollowupReceipt;
  renewal_triage_notes: RenewalTriageNote[];
}
export const MAX_RENEWAL_TRIAGE_BYTES = 7_900_000;
const DAY = 86_400_000;
const comparisonFields = ["earlier_reviewer_index", "later_reviewer_index", "case_id",
  "reassignment_watch_index", "earlier_at", "later_at", "earlier_reassessment_index",
  "later_reassessment_index", "newer_owner_witness_claim", "newer_distinct_source_claim",
  "repeated_owner_gap", "repeated_source_gap", "source_identity_drift",
  "source_age_days", "earlier_review_age_days", "age_band", "signals",
  "private_runner_approval", "independently_witnessed", "closure"] as const;
const noteFields = [...comparisonFields, "recorded_at", "category", "personally_rechecked",
  "separate_hold_acknowledged", "state", "field_acceptance", "independent_review"];
function safeTime(value: unknown): value is string {
  return typeof value === "string" && /^20\d\d-\d\d-\d\dT/.test(value) &&
    Number.isFinite(Date.parse(value)) && Date.parse(value) >= Date.parse("2020-01-01T00:00:00Z") &&
    Date.parse(value) <= Date.now() + 300_000;
}
function validCategory(category: RenewalTriageCategory, signals: readonly RenewalTriageSignal[]) {
  return category === "CONTINUE_INDEPENDENT_HOLD" ||
    category === "REQUEST_OWNER_REWITNESS" && signals.includes("NEW_OWNER_EVIDENCE_MISSING") ||
    category === "REQUEST_SOURCE_REVALIDATION" && signals.some(s =>
      ["NEW_SOURCE_EVIDENCE_MISSING", "SOURCE_IDENTITY_OR_ACCESS_DRIFT", "SOURCE_RENEWAL_OVERDUE"].includes(s)) ||
    category === "REQUEST_PRIVATE_RUNNER_SCOPE_REVIEW" &&
      signals.includes("PRIVATE_RUNNER_APPROVAL_NOT_SUPPLIED");
}

/** Public provenance/pin preparation is not a permitted private runner, even if all are claimed. */
export const PRIVATE_RUNNER_TRIAGE = Object.freeze([
  { check: "Owner's exact nonproduction GET test scope and expiry", state: "NOT_AUTHORIZED" },
  { check: "Isolated protected private test runner and transport", state: "NOT_PROVISIONED" },
  { check: "App-specific server-side HMAC key ID and replay registry", state: "NOT_PROVISIONED" },
  { check: "Independently authenticated source/gateway Ed25519 public pins", state: "UNVERIFIED" },
  { check: "Separate independent reviewer, original denials and durable audit", state: "UNVERIFIED" },
  { check: "Nonproduction scoped revocation, kill switch and rollback witness", state: "UNVERIFIED" },
  { check: "QL-248 two-commit verifier agreement and post-test signed proof", state: "PENDING" },
  { check: "Authenticated owner time-bounded read-only pilot decision", state: "NOT_GIVEN" },
] as const);

export function compareReviewerRenewalTriage(prior: ReviewerFollowupReceipt,
  earlierIndex: number, laterIndex: number, at = new Date().toISOString()): RenewalTriageComparison {
  const before = prior.reviewer_followups[earlierIndex];
  const after = prior.reviewer_followups[laterIndex];
  if (!Number.isInteger(earlierIndex) || !Number.isInteger(laterIndex) || earlierIndex < 0 ||
    laterIndex <= earlierIndex || !before || !after || before.case_id !== after.case_id ||
    before.reassignment_watch_index !== after.reassignment_watch_index ||
    after.later_reassessment_index <= before.later_reassessment_index ||
    Date.parse(before.recorded_at) >= Date.parse(after.recorded_at) ||
    !safeTime(at) || Date.parse(at) < Date.parse(after.recorded_at))
    throw new Error("Build 176 requires chronological same-watch reviewer follow-ups and progressive reassessment indices.");
  const nested = parseHeldReviewerReceipt(JSON.stringify(prior));
  const held = prior.held_receipt;
  const oldReassessment = held.held_disposition_reassessments[before.later_reassessment_index];
  const newReassessment = held.held_disposition_reassessments[after.later_reassessment_index];
  const disposition = held.disposition_receipt;
  const oldFollowup = disposition.recurrence_disposition_followups[oldReassessment?.later_followup_index];
  const newFollowup = disposition.recurrence_disposition_followups[newReassessment?.later_followup_index];
  if (!oldReassessment || !newReassessment || !oldFollowup || !newFollowup ||
    oldFollowup.case_id !== after.case_id || newFollowup.case_id !== after.case_id ||
    oldFollowup.reassignment_watch_index !== after.reassignment_watch_index ||
    newFollowup.reassignment_watch_index !== after.reassignment_watch_index)
    throw new Error("Build 176 referenced reassessment/source chronology is inconsistent.");
  const oldCheck = oldFollowup.later_source_check_index === null ? null :
    nested.checks[oldFollowup.later_source_check_index];
  const newCheck = newFollowup.later_source_check_index === null ? null :
    nested.checks[newFollowup.later_source_check_index];
  const recurrence = disposition.exception_receipt.exception_recurrences[newFollowup.later_recurrence_index];
  const outcome = disposition.exception_receipt.drift_outcome_receipt.drift_outcomes[recurrence?.latest_outcome_index];
  const renewal = disposition.exception_receipt.drift_outcome_receipt.renewal_receipt.renewal_rechecks[
    outcome?.latest_recheck_index];
  const ownerFollowup = nested.aging_followups[renewal?.latest_followup_index];
  const observationIndex = nested.aging_audits[ownerFollowup?.latest_audit_index]?.latest_observation_index;
  const owner = observationIndex === undefined ? null : nested.trial.observations[observationIndex];
  const ownerFresh = !!owner && owner.case_id === after.case_id && owner.witnessed_by_operator &&
    Date.parse(owner.observed_at) > Date.parse(before.recorded_at) &&
    Date.parse(owner.observed_at) <= Date.parse(after.recorded_at);
  const sourceFresh = !!newCheck && newCheck.case_id === after.case_id &&
    oldFollowup.later_source_check_index !== newFollowup.later_source_check_index &&
    Date.parse(newCheck.captured_at) > Date.parse(before.recorded_at) &&
    Date.parse(newCheck.captured_at) <= Date.parse(after.recorded_at) &&
    (!oldCheck || Date.parse(newCheck.captured_at) > Date.parse(oldCheck.captured_at));
  const repeatedOwner = before.signals.includes("LATER_OWNER_CLAIM_MISSING") &&
    after.signals.includes("LATER_OWNER_CLAIM_MISSING");
  const repeatedSource = before.signals.includes("LATER_SOURCE_CLAIM_MISSING") &&
    after.signals.includes("LATER_SOURCE_CLAIM_MISSING");
  const drift = before.source_identity_conflict || after.source_identity_conflict ||
    !!oldCheck && !!newCheck && (oldCheck.safe_alias !== newCheck.safe_alias ||
      oldCheck.identity_state !== newCheck.identity_state ||
      oldCheck.installed_version !== newCheck.installed_version || oldCheck.access !== newCheck.access);
  const sourceAge = newCheck ? Math.floor((Date.parse(at) - Date.parse(newCheck.captured_at)) / DAY) : null;
  const reviewAge = Math.floor((Date.parse(at) - Date.parse(before.recorded_at)) / DAY);
  const signals: RenewalTriageSignal[] = [];
  if (!ownerFresh) signals.push("NEW_OWNER_EVIDENCE_MISSING");
  if (!sourceFresh) signals.push("NEW_SOURCE_EVIDENCE_MISSING");
  if (ownerFresh || sourceFresh) signals.push("LATER_PRIVATE_CLAIMS_UNVERIFIED");
  if (repeatedOwner) signals.push("REPEATED_OWNER_GAP");
  if (repeatedSource) signals.push("REPEATED_SOURCE_GAP");
  if (drift) signals.push("SOURCE_IDENTITY_OR_ACCESS_DRIFT");
  if (sourceAge === null || sourceAge > 7) signals.push("SOURCE_RENEWAL_OVERDUE");
  if (reviewAge >= 3) signals.push("EARLIER_REVIEW_AGED");
  if (reviewAge > 7) signals.push("EARLIER_REVIEW_OVERDUE");
  signals.push("PRIVATE_RUNNER_APPROVAL_NOT_SUPPLIED", "SEPARATE_REVIEWER_PROOF_NOT_SUPPLIED",
    "QL248_PIN_AND_PROOF_PENDING", "FIELD_AND_VAULT_HOLDS_CONTINUE");
  return { earlier_reviewer_index: earlierIndex, later_reviewer_index: laterIndex,
    case_id: before.case_id, reassignment_watch_index: before.reassignment_watch_index,
    earlier_at: before.recorded_at, later_at: after.recorded_at,
    earlier_reassessment_index: before.later_reassessment_index,
    later_reassessment_index: after.later_reassessment_index,
    newer_owner_witness_claim: ownerFresh, newer_distinct_source_claim: sourceFresh,
    repeated_owner_gap: repeatedOwner, repeated_source_gap: repeatedSource,
    source_identity_drift: drift, source_age_days: sourceAge,
    earlier_review_age_days: reviewAge,
    age_band: reviewAge > 7 ? "OVER_SEVEN_DAYS" : reviewAge >= 3 ?
      "THREE_TO_SEVEN_DAYS" : "UNDER_THREE_DAYS", signals,
    private_runner_approval: "NOT_GIVEN", independently_witnessed: false,
    closure: "NOT_AUTHORIZED" };
}
export function validateReviewerRenewalTriage(prior: ReviewerFollowupReceipt,
  notes: readonly RenewalTriageNote[], exportedAt?: string) {
  if (notes.length > 100) throw new Error("Build 176 permits at most 100 private triage notes.");
  let previous = 0; const seen = new Set<string>();
  for (const note of notes) {
    if (!note || Object.keys(note).length !== noteFields.length ||
      Object.keys(note).some(k => !noteFields.includes(k)) || !safeTime(note.recorded_at) ||
      !RENEWAL_TRIAGE_CATEGORIES.includes(note.category) ||
      note.personally_rechecked !== true || note.separate_hold_acknowledged !== true ||
      note.state !== "PRIVATE_REVIEWER_RENEWAL_TRIAGE_NOT_SENT" ||
      note.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
      note.independent_review !== "INDEPENDENT_REVIEW_HOLD")
      throw new Error("Unsafe Build 176 immutable private triage note.");
    const time = Date.parse(note.recorded_at);
    if (time < previous || exportedAt && time > Date.parse(exportedAt))
      throw new Error("Build 176 triage chronology invalid.");
    const expected = compareReviewerRenewalTriage(prior,
      note.earlier_reviewer_index, note.later_reviewer_index, note.recorded_at);
    if (comparisonFields.some(k => JSON.stringify(note[k]) !== JSON.stringify(expected[k])))
      throw new Error("Build 176 immutable reviewer/runner evidence altered.");
    if (!validCategory(note.category, expected.signals))
      throw new Error("Build 176 category requires unresolved evidence.");
    const key = `${note.earlier_reviewer_index}:${note.later_reviewer_index}:${note.category}`;
    if (seen.has(key)) throw new Error("Duplicate Build 176 private triage note.");
    seen.add(key); previous = time;
  }
}
export function recordReviewerRenewalTriage(prior: ReviewerFollowupReceipt,
  notes: readonly RenewalTriageNote[], environment: TrialEnvironment,
  imported: { reviewers: number; triages: number }, input: {
    earlier_reviewer_index: number; later_reviewer_index: number;
    category: RenewalTriageCategory; personally_rechecked: boolean;
    separate_hold_acknowledged: boolean }, at = new Date().toISOString()): RenewalTriageNote[] {
  if (!environment.installed_windows_witnessed || !validateInstalledVersion(environment.installed_version) ||
    environment.access === "unknown" || input.later_reviewer_index < imported.reviewers ||
    notes.length < imported.triages || !input.personally_rechecked ||
    !input.separate_hold_acknowledged || !RENEWAL_TRIAGE_CATEGORIES.includes(input.category))
    throw new Error("Build 176 requires non-imported later reviewer note, witnessed Windows and two HOLD attestations.");
  const comparison = compareReviewerRenewalTriage(prior,
    input.earlier_reviewer_index, input.later_reviewer_index, at);
  if (!validCategory(input.category, comparison.signals))
    throw new Error("Build 176 category requires unresolved evidence.");
  const next: RenewalTriageNote[] = [...notes, { ...comparison, recorded_at: at,
    category: input.category, personally_rechecked: true, separate_hold_acknowledged: true,
    state: "PRIVATE_REVIEWER_RENEWAL_TRIAGE_NOT_SENT", field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD" }];
  validateReviewerRenewalTriage(prior, next);
  return next;
}
export function createReviewerRenewalReceipt(prior: ReviewerFollowupReceipt,
  notes: readonly RenewalTriageNote[], at = new Date().toISOString()): RenewalTriageReceipt {
  if (prior.kind !== "rosevear_held_reviewer_followup_source_renewal" || !safeTime(at) ||
    Date.parse(at) < Date.parse(prior.exported_at))
    throw new Error("Build 176 requires chronological complete Build 175 receipt.");
  parseHeldReviewerReceipt(JSON.stringify(prior));
  validateReviewerRenewalTriage(prior, notes, at);
  const receipt: RenewalTriageReceipt = {
    kind: "rosevear_independent_reviewer_renewal_outcome_triage", schema_version: 1,
    exported_at: at, field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED",
    connection_state: "DISCONNECTED", private_runner_approval: "NOT_GIVEN",
    evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS", reviewer_receipt: prior,
    renewal_triage_notes: notes.map(n => ({ ...n, signals: [...n.signals] })),
  };
  if (JSON.stringify(receipt).length > MAX_RENEWAL_TRIAGE_BYTES)
    throw new Error("Build 176 private triage receipt exceeds 7.9 MB.");
  return receipt;
}
export function parseReviewerRenewalReceipt(raw: string) {
  if (raw.length > MAX_RENEWAL_TRIAGE_BYTES) throw new Error("Build 176 import exceeds 7.9 MB.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Invalid Build 176 private JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid Build 176 receipt envelope.");
  const obj = value as Record<string, unknown>;
  if (obj.kind !== "rosevear_independent_reviewer_renewal_outcome_triage")
    return { ...parseHeldReviewerReceipt(raw), renewal_triage_notes: [] as RenewalTriageNote[] };
  const keys = ["kind", "schema_version", "exported_at", "field_acceptance",
    "independent_review", "closure", "connection_state", "private_runner_approval",
    "evidence_authenticity", "reviewer_receipt", "renewal_triage_notes"];
  if (Object.keys(obj).length !== keys.length || Object.keys(obj).some(k => !keys.includes(k)) ||
    obj.schema_version !== 1 || !safeTime(obj.exported_at) ||
    obj.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
    obj.independent_review !== "INDEPENDENT_REVIEW_HOLD" || obj.closure !== "NOT_AUTHORIZED" ||
    obj.connection_state !== "DISCONNECTED" || obj.private_runner_approval !== "NOT_GIVEN" ||
    obj.evidence_authenticity !== "UNVERIFIED_PRIVATE_ATTESTATIONS" ||
    !obj.reviewer_receipt || !Array.isArray(obj.renewal_triage_notes))
    throw new Error("Unsafe Build 176 permanent HOLD receipt.");
  const prior = obj.reviewer_receipt as ReviewerFollowupReceipt;
  if (prior.kind !== "rosevear_held_reviewer_followup_source_renewal" ||
    Date.parse(prior.exported_at) > Date.parse(obj.exported_at as string))
    throw new Error("Build 176 nested chronology invalid.");
  const nested = parseHeldReviewerReceipt(JSON.stringify(prior));
  validateReviewerRenewalTriage(prior, obj.renewal_triage_notes as RenewalTriageNote[],
    obj.exported_at as string);
  return { ...nested, renewal_triage_notes: (obj.renewal_triage_notes as RenewalTriageNote[])
    .map(n => ({ ...n, signals: [...n.signals] })) };
}
export function compareReviewerRenewalReceipts(beforeRaw: string, afterRaw: string) {
  if (beforeRaw.length > 7_600_000 || afterRaw.length > 7_600_000)
    throw new Error("Build 175 comparison exceeds 7.6 MB.");
  let before: ReviewerFollowupReceipt; let after: ReviewerFollowupReceipt;
  try { before = JSON.parse(beforeRaw) as ReviewerFollowupReceipt;
    after = JSON.parse(afterRaw) as ReviewerFollowupReceipt; }
  catch { throw new Error("Invalid Build 175 private JSON."); }
  if (before?.kind !== "rosevear_held_reviewer_followup_source_renewal" ||
    after?.kind !== "rosevear_held_reviewer_followup_source_renewal" ||
    Date.parse(before.exported_at) >= Date.parse(after.exported_at))
    throw new Error("Two chronological complete Build 175 receipts required.");
  parseHeldReviewerReceipt(beforeRaw); parseHeldReviewerReceipt(afterRaw);
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
  if (!prefix(before, after) || !before.reviewer_followups.length ||
    before.reviewer_followups.length >= after.reviewer_followups.length)
    throw new Error("Build 175 nested evidence must be an exact nonempty append-only historical prefix.");
  let comparison: RenewalTriageComparison | null = null;
  for (let later = before.reviewer_followups.length;
    later < after.reviewer_followups.length && !comparison; later++) {
    for (let earlier = before.reviewer_followups.length - 1; earlier >= 0; earlier--) {
      const old = after.reviewer_followups[earlier]; const next = after.reviewer_followups[later];
      if (old.case_id !== next.case_id ||
        old.reassignment_watch_index !== next.reassignment_watch_index ||
        old.later_reassessment_index >= next.later_reassessment_index) continue;
      comparison = compareReviewerRenewalTriage(after, earlier, later, after.exported_at); break;
    }
  }
  return { previous_reviewers: before.reviewer_followups.length,
    current_reviewers: after.reviewer_followups.length,
    new_reviewers: after.reviewer_followups.length - before.reviewer_followups.length,
    comparison };
}
