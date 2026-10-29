/** Build 178: manual follow-up of still-held private triage exceptions; no action or approval. */
import { validateInstalledVersion, type TrialEnvironment } from "./ownerFieldTrial";
import { parseHeldReviewerReceipt } from "./ownerHeldReviewerFollowup";
import { parseTriageContinuityReceipt,
  type TriageContinuityNote, type TriageContinuityReceipt } from "./ownerReviewerTriageContinuity";

export type TriageExceptionCategory = "KEEP_INDEPENDENT_HOLD" |
  "REQUEST_LATER_OWNER_EVIDENCE" | "REQUEST_LATER_SOURCE_RECHECK" |
  "REQUEST_QL248_PROVENANCE_WITNESS";
export const TRIAGE_EXCEPTION_CATEGORIES: readonly TriageExceptionCategory[] = [
  "KEEP_INDEPENDENT_HOLD", "REQUEST_LATER_OWNER_EVIDENCE",
  "REQUEST_LATER_SOURCE_RECHECK", "REQUEST_QL248_PROVENANCE_WITNESS",
];
export type TriageExceptionSignal = "POST_CONTINUITY_OWNER_MISSING" |
  "POST_CONTINUITY_SOURCE_MISSING" | "NEW_PRIVATE_EVIDENCE_UNVERIFIED" |
  "REPEATED_OWNER_EXCEPTION" | "REPEATED_SOURCE_EXCEPTION" |
  "SOURCE_IDENTITY_OR_ACCESS_CONFLICT" | "SOURCE_CHECK_OVERDUE" |
  "PRIOR_CONTINUITY_AGED" | "PRIOR_CONTINUITY_OVERDUE" |
  "QL248_SOURCE_PROOF_PROVENANCE_UNVERIFIED" |
  "PRIVATE_RUNNER_AND_REVIEWER_HOLD" | "FIELD_AND_VAULT_HOLDS_CONTINUE";
export interface TriageExceptionComparison {
  earlier_continuity_index: number;
  later_continuity_index: number;
  case_id: TriageContinuityNote["case_id"];
  reassignment_watch_index: number;
  earlier_at: string;
  later_at: string;
  earlier_triage_index: number;
  later_triage_index: number;
  later_owner_witness_claim: boolean;
  later_distinct_source_claim: boolean;
  repeated_owner_exception: boolean;
  repeated_source_exception: boolean;
  source_identity_drift: boolean;
  source_age_days: number | null;
  earlier_continuity_age_days: number;
  age_band: "UNDER_THREE_DAYS" | "THREE_TO_SEVEN_DAYS" | "OVER_SEVEN_DAYS";
  signals: TriageExceptionSignal[];
  source_provenance: "UNVERIFIED";
  independent_reviewer: "INDEPENDENT_REVIEW_HOLD";
  private_runner: "NOT_AUTHORIZED";
  closure: "NOT_AUTHORIZED";
}
export interface TriageExceptionNote extends TriageExceptionComparison {
  recorded_at: string;
  category: TriageExceptionCategory;
  personally_rechecked: true;
  separate_hold_acknowledged: true;
  state: "PRIVATE_TRIAGE_EXCEPTION_FOLLOWUP_NOT_SENT";
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
}
export interface TriageExceptionReceipt {
  kind: "rosevear_private_triage_exception_aging_followup";
  schema_version: 1;
  exported_at: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
  connection_state: "DISCONNECTED";
  private_runner: "NOT_AUTHORIZED";
  source_provenance: "UNVERIFIED";
  evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS";
  continuity_receipt: TriageContinuityReceipt;
  triage_exception_notes: TriageExceptionNote[];
}
export const MAX_TRIAGE_EXCEPTION_BYTES = 8_500_000;
const DAY = 86_400_000;
const comparisonFields = ["earlier_continuity_index", "later_continuity_index", "case_id",
  "reassignment_watch_index", "earlier_at", "later_at", "earlier_triage_index", "later_triage_index",
  "later_owner_witness_claim", "later_distinct_source_claim", "repeated_owner_exception",
  "repeated_source_exception", "source_identity_drift", "source_age_days",
  "earlier_continuity_age_days", "age_band", "signals", "source_provenance",
  "independent_reviewer", "private_runner", "closure"] as const;
const noteFields: readonly string[] = [...comparisonFields, "recorded_at", "category",
  "personally_rechecked", "separate_hold_acknowledged", "state", "field_acceptance"];
function safeTime(value: unknown): value is string {
  return typeof value === "string" && /^20\d\d-\d\d-\d\dT/.test(value) &&
    Number.isFinite(Date.parse(value)) && Date.parse(value) >= Date.parse("2020-01-01T00:00:00Z") &&
    Date.parse(value) <= Date.now() + 300_000;
}
function categoryValid(category: TriageExceptionCategory, signals: readonly TriageExceptionSignal[]) {
  return category === "KEEP_INDEPENDENT_HOLD" ||
    category === "REQUEST_LATER_OWNER_EVIDENCE" && signals.includes("POST_CONTINUITY_OWNER_MISSING") ||
    category === "REQUEST_LATER_SOURCE_RECHECK" && signals.some(s =>
      ["POST_CONTINUITY_SOURCE_MISSING", "SOURCE_IDENTITY_OR_ACCESS_CONFLICT",
        "SOURCE_CHECK_OVERDUE"].includes(s)) ||
    category === "REQUEST_QL248_PROVENANCE_WITNESS" &&
      signals.includes("QL248_SOURCE_PROOF_PROVENANCE_UNVERIFIED");
}

export function compareTriageExceptionAging(prior: TriageContinuityReceipt,
  earlierIndex: number, laterIndex: number, at = new Date().toISOString()): TriageExceptionComparison {
  const earlier = prior.triage_continuity_notes[earlierIndex];
  const later = prior.triage_continuity_notes[laterIndex];
  if (!Number.isInteger(earlierIndex) || !Number.isInteger(laterIndex) || earlierIndex < 0 ||
    laterIndex <= earlierIndex || !earlier || !later || earlier.case_id !== later.case_id ||
    earlier.reassignment_watch_index !== later.reassignment_watch_index ||
    earlier.later_triage_index >= later.later_triage_index ||
    Date.parse(earlier.recorded_at) >= Date.parse(later.recorded_at) || !safeTime(at) ||
    Date.parse(at) < Date.parse(later.recorded_at))
    throw new Error("Build 178 requires chronological same-watch continuity outcomes and a progressively later triage.");
  const triage = prior.triage_receipt;
  const reviewer = triage.reviewer_receipt;
  const nested = parseHeldReviewerReceipt(JSON.stringify(reviewer));
  const disposition = reviewer.held_receipt.disposition_receipt;
  function evidenceFor(note: TriageContinuityNote) {
    const triageNote = triage.renewal_triage_notes[note.later_triage_index];
    const reviewerNote = reviewer.reviewer_followups[triageNote?.later_reviewer_index];
    const reassessment = reviewer.held_receipt.held_disposition_reassessments[
      reviewerNote?.later_reassessment_index];
    const followup = disposition.recurrence_disposition_followups[reassessment?.later_followup_index];
    if (!triageNote || !followup || triageNote.case_id !== note.case_id ||
      followup.case_id !== note.case_id ||
      followup.reassignment_watch_index !== note.reassignment_watch_index)
      throw new Error("Build 178 continuity evidence source lineage changed its original watch.");
    const check = followup.later_source_check_index === null ? null :
      nested.checks[followup.later_source_check_index];
    const recurrence = disposition.exception_receipt.exception_recurrences[followup.later_recurrence_index];
    const outcome = disposition.exception_receipt.drift_outcome_receipt.drift_outcomes[
      recurrence?.latest_outcome_index];
    const renewal = disposition.exception_receipt.drift_outcome_receipt.renewal_receipt.renewal_rechecks[
      outcome?.latest_recheck_index];
    const ownerFollowup = nested.aging_followups[renewal?.latest_followup_index];
    const obsIndex = nested.aging_audits[ownerFollowup?.latest_audit_index]?.latest_observation_index;
    return { check, checkIndex: followup.later_source_check_index,
      owner: obsIndex === undefined ? null : nested.trial.observations[obsIndex] };
  }
  const previous = evidenceFor(earlier);
  const current = evidenceFor(later);
  const ownerFresh = !!current.owner && current.owner.case_id === later.case_id &&
    current.owner.witnessed_by_operator &&
    Date.parse(current.owner.observed_at) > Date.parse(earlier.recorded_at) &&
    Date.parse(current.owner.observed_at) <= Date.parse(later.recorded_at);
  const sourceFresh = !!current.check && current.check.case_id === later.case_id &&
    previous.checkIndex !== current.checkIndex &&
    Date.parse(current.check.captured_at) > Date.parse(earlier.recorded_at) &&
    Date.parse(current.check.captured_at) <= Date.parse(later.recorded_at) &&
    (!previous.check || Date.parse(current.check.captured_at) > Date.parse(previous.check.captured_at));
  const repeatedOwner = earlier.signals.includes("POST_TRIAGE_OWNER_WITNESS_MISSING") &&
    later.signals.includes("POST_TRIAGE_OWNER_WITNESS_MISSING");
  const repeatedSource = earlier.signals.includes("POST_TRIAGE_SOURCE_RECHECK_MISSING") &&
    later.signals.includes("POST_TRIAGE_SOURCE_RECHECK_MISSING");
  const drift = earlier.source_identity_drift || later.source_identity_drift ||
    !!previous.check && !!current.check && (previous.check.safe_alias !== current.check.safe_alias ||
      previous.check.identity_state !== current.check.identity_state ||
      previous.check.installed_version !== current.check.installed_version ||
      previous.check.access !== current.check.access);
  const sourceAge = current.check ? Math.floor((Date.parse(at) - Date.parse(current.check.captured_at)) / DAY) : null;
  const continuityAge = Math.floor((Date.parse(at) - Date.parse(earlier.recorded_at)) / DAY);
  const signals: TriageExceptionSignal[] = [];
  if (!ownerFresh) signals.push("POST_CONTINUITY_OWNER_MISSING");
  if (!sourceFresh) signals.push("POST_CONTINUITY_SOURCE_MISSING");
  if (ownerFresh || sourceFresh) signals.push("NEW_PRIVATE_EVIDENCE_UNVERIFIED");
  if (repeatedOwner) signals.push("REPEATED_OWNER_EXCEPTION");
  if (repeatedSource) signals.push("REPEATED_SOURCE_EXCEPTION");
  if (drift) signals.push("SOURCE_IDENTITY_OR_ACCESS_CONFLICT");
  if (sourceAge === null || sourceAge > 7) signals.push("SOURCE_CHECK_OVERDUE");
  if (continuityAge >= 3) signals.push("PRIOR_CONTINUITY_AGED");
  if (continuityAge > 7) signals.push("PRIOR_CONTINUITY_OVERDUE");
  signals.push("QL248_SOURCE_PROOF_PROVENANCE_UNVERIFIED",
    "PRIVATE_RUNNER_AND_REVIEWER_HOLD", "FIELD_AND_VAULT_HOLDS_CONTINUE");
  return { earlier_continuity_index: earlierIndex, later_continuity_index: laterIndex,
    case_id: earlier.case_id, reassignment_watch_index: earlier.reassignment_watch_index,
    earlier_at: earlier.recorded_at, later_at: later.recorded_at,
    earlier_triage_index: earlier.later_triage_index, later_triage_index: later.later_triage_index,
    later_owner_witness_claim: ownerFresh, later_distinct_source_claim: sourceFresh,
    repeated_owner_exception: repeatedOwner, repeated_source_exception: repeatedSource,
    source_identity_drift: drift, source_age_days: sourceAge,
    earlier_continuity_age_days: continuityAge,
    age_band: continuityAge > 7 ? "OVER_SEVEN_DAYS" : continuityAge >= 3 ?
      "THREE_TO_SEVEN_DAYS" : "UNDER_THREE_DAYS", signals,
    source_provenance: "UNVERIFIED", independent_reviewer: "INDEPENDENT_REVIEW_HOLD",
    private_runner: "NOT_AUTHORIZED", closure: "NOT_AUTHORIZED" };
}

export function validateTriageExceptionNotes(prior: TriageContinuityReceipt,
  notes: readonly TriageExceptionNote[], exportedAt?: string) {
  if (notes.length > 100) throw new Error("Build 178 limits private exception follow-ups to 100.");
  let previous = 0; const seen = new Set<string>();
  for (const note of notes) {
    if (!note || Object.keys(note).length !== noteFields.length ||
      Object.keys(note).some(k => !noteFields.includes(k)) || !safeTime(note.recorded_at) ||
      !TRIAGE_EXCEPTION_CATEGORIES.includes(note.category) || note.personally_rechecked !== true ||
      note.separate_hold_acknowledged !== true ||
      note.state !== "PRIVATE_TRIAGE_EXCEPTION_FOLLOWUP_NOT_SENT" ||
      note.field_acceptance !== "FIELD_ACCEPTANCE_HOLD")
      throw new Error("Unsafe Build 178 immutable exception note.");
    const time = Date.parse(note.recorded_at);
    if (time < previous || exportedAt && time > Date.parse(exportedAt))
      throw new Error("Build 178 exception chronology invalid.");
    const expected = compareTriageExceptionAging(prior,
      note.earlier_continuity_index, note.later_continuity_index, note.recorded_at);
    if (comparisonFields.some(k => JSON.stringify(note[k]) !== JSON.stringify(expected[k])))
      throw new Error("Build 178 immutable private exception evidence changed.");
    if (!categoryValid(note.category, expected.signals))
      throw new Error("Build 178 category needs original unresolved evidence.");
    const key = `${note.earlier_continuity_index}:${note.later_continuity_index}:${note.category}`;
    if (seen.has(key)) throw new Error("Duplicate Build 178 private exception follow-up.");
    seen.add(key); previous = time;
  }
}

export function recordTriageException(prior: TriageContinuityReceipt,
  notes: readonly TriageExceptionNote[], environment: TrialEnvironment,
  imported: { continuity: number; exceptions: number }, input: {
    earlier_continuity_index: number; later_continuity_index: number;
    category: TriageExceptionCategory; personally_rechecked: boolean;
    separate_hold_acknowledged: boolean;
  }, at = new Date().toISOString()): TriageExceptionNote[] {
  if (!environment.installed_windows_witnessed || !validateInstalledVersion(environment.installed_version) ||
    environment.access === "unknown" || input.later_continuity_index < imported.continuity ||
    notes.length < imported.exceptions || !input.personally_rechecked ||
    !input.separate_hold_acknowledged || !TRIAGE_EXCEPTION_CATEGORIES.includes(input.category))
    throw new Error("Build 178 requires a non-imported later continuity, witnessed Windows and two HOLD acknowledgements.");
  const comparison = compareTriageExceptionAging(prior,
    input.earlier_continuity_index, input.later_continuity_index, at);
  if (!categoryValid(input.category, comparison.signals))
    throw new Error("Build 178 category needs original unresolved evidence.");
  const next: TriageExceptionNote[] = [...notes, { ...comparison, recorded_at: at,
    category: input.category, personally_rechecked: true, separate_hold_acknowledged: true,
    state: "PRIVATE_TRIAGE_EXCEPTION_FOLLOWUP_NOT_SENT", field_acceptance: "FIELD_ACCEPTANCE_HOLD" }];
  validateTriageExceptionNotes(prior, next);
  return next;
}

export function createTriageExceptionReceipt(prior: TriageContinuityReceipt,
  notes: readonly TriageExceptionNote[], at = new Date().toISOString()): TriageExceptionReceipt {
  if (prior.kind !== "rosevear_private_reviewer_triage_renewal_continuity" || !safeTime(at) ||
    Date.parse(at) < Date.parse(prior.exported_at))
    throw new Error("Build 178 requires chronological complete Build 177 receipt.");
  parseTriageContinuityReceipt(JSON.stringify(prior));
  validateTriageExceptionNotes(prior, notes, at);
  const receipt: TriageExceptionReceipt = {
    kind: "rosevear_private_triage_exception_aging_followup", schema_version: 1,
    exported_at: at, field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED",
    connection_state: "DISCONNECTED", private_runner: "NOT_AUTHORIZED",
    source_provenance: "UNVERIFIED", evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS",
    continuity_receipt: prior, triage_exception_notes: notes.map(n => ({ ...n, signals: [...n.signals] })),
  };
  if (JSON.stringify(receipt).length > MAX_TRIAGE_EXCEPTION_BYTES)
    throw new Error("Build 178 private receipt exceeds 8.5 MB.");
  return receipt;
}

export function parseTriageExceptionReceipt(raw: string) {
  if (raw.length > MAX_TRIAGE_EXCEPTION_BYTES) throw new Error("Build 178 import exceeds 8.5 MB.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Invalid Build 178 private JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid Build 178 private receipt envelope.");
  const obj = value as Record<string, unknown>;
  if (obj.kind !== "rosevear_private_triage_exception_aging_followup")
    return { ...parseTriageContinuityReceipt(raw), triage_exception_notes: [] as TriageExceptionNote[] };
  const fields = ["kind", "schema_version", "exported_at", "field_acceptance",
    "independent_review", "closure", "connection_state", "private_runner",
    "source_provenance", "evidence_authenticity", "continuity_receipt", "triage_exception_notes"];
  if (Object.keys(obj).length !== fields.length || Object.keys(obj).some(k => !fields.includes(k)) ||
    obj.schema_version !== 1 || !safeTime(obj.exported_at) ||
    obj.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
    obj.independent_review !== "INDEPENDENT_REVIEW_HOLD" || obj.closure !== "NOT_AUTHORIZED" ||
    obj.connection_state !== "DISCONNECTED" || obj.private_runner !== "NOT_AUTHORIZED" ||
    obj.source_provenance !== "UNVERIFIED" ||
    obj.evidence_authenticity !== "UNVERIFIED_PRIVATE_ATTESTATIONS" ||
    !obj.continuity_receipt || !Array.isArray(obj.triage_exception_notes))
    throw new Error("Unsafe Build 178 permanent HOLD receipt.");
  const prior = obj.continuity_receipt as TriageContinuityReceipt;
  if (prior.kind !== "rosevear_private_reviewer_triage_renewal_continuity" ||
    Date.parse(prior.exported_at) > Date.parse(obj.exported_at as string))
    throw new Error("Build 178 nested continuity chronology invalid.");
  const nested = parseTriageContinuityReceipt(JSON.stringify(prior));
  validateTriageExceptionNotes(prior, obj.triage_exception_notes as TriageExceptionNote[],
    obj.exported_at as string);
  return { ...nested, triage_exception_notes: (obj.triage_exception_notes as TriageExceptionNote[])
    .map(n => ({ ...n, signals: [...n.signals] })) };
}

/** Compare two *complete* Build 177 receipts; never upgrade an imported historic claim. */
export function compareHistoricalTriageExceptions(beforeRaw: string, afterRaw: string) {
  if (beforeRaw.length > 8_300_000 || afterRaw.length > 8_300_000)
    throw new Error("Build 178 historical comparison exceeds 8.3 MB.");
  let before: TriageContinuityReceipt; let after: TriageContinuityReceipt;
  try { before = JSON.parse(beforeRaw); after = JSON.parse(afterRaw); }
  catch { throw new Error("Invalid Build 177 historical JSON."); }
  if (before?.kind !== "rosevear_private_reviewer_triage_renewal_continuity" ||
    after?.kind !== "rosevear_private_reviewer_triage_renewal_continuity" ||
    Date.parse(before.exported_at) >= Date.parse(after.exported_at))
    throw new Error("Two chronological complete Build 177 receipts required.");
  parseTriageContinuityReceipt(beforeRaw); parseTriageContinuityReceipt(afterRaw);
  const prefix = (a: unknown, b: unknown, key = ""): boolean => {
    if (key === "exported_at") return safeTime(a) && safeTime(b) && Date.parse(a) <= Date.parse(b);
    if (Array.isArray(a)) return Array.isArray(b) && a.length <= b.length &&
      a.every((item, index) => prefix(item, b[index]));
    if (a !== null && typeof a === "object") {
      if (b === null || typeof b !== "object" || Array.isArray(b)) return false;
      const left = a as Record<string, unknown>; const right = b as Record<string, unknown>;
      return Object.keys(left).length === Object.keys(right).length &&
        Object.keys(left).every(k => Object.hasOwn(right, k) && prefix(left[k], right[k], k));
    }
    return a === b;
  };
  if (!prefix(before, after) || !before.triage_continuity_notes.length ||
    before.triage_continuity_notes.length >= after.triage_continuity_notes.length)
    throw new Error("Build 177 nested evidence must be an exact nonempty append-only historical prefix.");
  let comparison: TriageExceptionComparison | null = null;
  for (let later = before.triage_continuity_notes.length;
    later < after.triage_continuity_notes.length && !comparison; later++) {
    for (let earlier = before.triage_continuity_notes.length - 1; earlier >= 0; earlier--) {
      const old = after.triage_continuity_notes[earlier];
      const next = after.triage_continuity_notes[later];
      if (old.case_id !== next.case_id || old.reassignment_watch_index !== next.reassignment_watch_index ||
        old.later_triage_index >= next.later_triage_index) continue;
      comparison = compareTriageExceptionAging(after, earlier, later, after.exported_at);
      break;
    }
  }
  return { previous_continuity: before.triage_continuity_notes.length,
    current_continuity: after.triage_continuity_notes.length,
    new_continuity: after.triage_continuity_notes.length - before.triage_continuity_notes.length,
    comparison };
}
