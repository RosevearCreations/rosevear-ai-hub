/** Build 177: private chronological triage continuity, never a gateway or reviewer approval. */
import { validateInstalledVersion, type TrialEnvironment } from "./ownerFieldTrial";
import { parseHeldReviewerReceipt } from "./ownerHeldReviewerFollowup";
import { parseReviewerRenewalReceipt, type RenewalTriageNote,
  type RenewalTriageReceipt } from "./ownerReviewerRenewalTriage";

export type TriageContinuityCategory = "CONTINUE_REVIEWER_TRIAGE_HOLD" |
  "REQUEST_POST_TRIAGE_OWNER_REWITNESS" | "REQUEST_POST_TRIAGE_SOURCE_RECHECK" |
  "REQUEST_QL248_TWO_SHA_OPERATOR_AUDIT";
export const TRIAGE_CONTINUITY_CATEGORIES: readonly TriageContinuityCategory[] = [
  "CONTINUE_REVIEWER_TRIAGE_HOLD", "REQUEST_POST_TRIAGE_OWNER_REWITNESS",
  "REQUEST_POST_TRIAGE_SOURCE_RECHECK", "REQUEST_QL248_TWO_SHA_OPERATOR_AUDIT",
];
export type TriageContinuitySignal = "POST_TRIAGE_OWNER_WITNESS_MISSING" |
  "POST_TRIAGE_SOURCE_RECHECK_MISSING" | "NEW_PRIVATE_CLAIMS_UNVERIFIED" |
  "REPEATED_OWNER_GAP" | "REPEATED_SOURCE_GAP" | "SOURCE_IDENTITY_OR_ACCESS_DRIFT" |
  "SOURCE_RECHECK_OVERDUE" | "EARLIER_TRIAGE_AGED" | "EARLIER_TRIAGE_OVERDUE" |
  "INDEPENDENT_REVIEWER_NOT_VERIFIED" | "QL248_TWO_SHA_CONSUMER_AGREEMENT_PENDING" |
  "PRIVATE_RUNNER_NOT_AUTHORIZED" | "FIELD_AND_VAULT_HOLDS_CONTINUE";
export interface TriageContinuityComparison {
  earlier_triage_index: number;
  later_triage_index: number;
  case_id: RenewalTriageNote["case_id"];
  reassignment_watch_index: number;
  earlier_at: string;
  later_at: string;
  earlier_reviewer_index: number;
  later_reviewer_index: number;
  newer_owner_witness_claim: boolean;
  newer_distinct_source_claim: boolean;
  repeated_owner_gap: boolean;
  repeated_source_gap: boolean;
  source_identity_drift: boolean;
  source_age_days: number | null;
  earlier_triage_age_days: number;
  age_band: "UNDER_THREE_DAYS" | "THREE_TO_SEVEN_DAYS" | "OVER_SEVEN_DAYS";
  signals: TriageContinuitySignal[];
  ql248_trust: "FORMAT_ONLY_UNVERIFIED";
  private_runner_approval: "NOT_GIVEN";
  independently_witnessed: false;
  closure: "NOT_AUTHORIZED";
}
export interface TriageContinuityNote extends TriageContinuityComparison {
  recorded_at: string;
  category: TriageContinuityCategory;
  personally_rechecked: true;
  separate_hold_acknowledged: true;
  state: "PRIVATE_TRIAGE_RENEWAL_CONTINUITY_NOT_SENT";
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
}
export interface TriageContinuityReceipt {
  kind: "rosevear_private_reviewer_triage_renewal_continuity";
  schema_version: 1;
  exported_at: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
  connection_state: "DISCONNECTED";
  private_runner_approval: "NOT_GIVEN";
  ql248_trust: "FORMAT_ONLY_UNVERIFIED";
  evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS";
  triage_receipt: RenewalTriageReceipt;
  triage_continuity_notes: TriageContinuityNote[];
}
export const MAX_TRIAGE_CONTINUITY_BYTES = 8_200_000;
const DAY = 86_400_000;
const compareFields = ["earlier_triage_index", "later_triage_index", "case_id",
  "reassignment_watch_index", "earlier_at", "later_at", "earlier_reviewer_index",
  "later_reviewer_index", "newer_owner_witness_claim", "newer_distinct_source_claim",
  "repeated_owner_gap", "repeated_source_gap", "source_identity_drift", "source_age_days",
  "earlier_triage_age_days", "age_band", "signals", "ql248_trust",
  "private_runner_approval", "independently_witnessed", "closure"] as const;
const noteFields = [...compareFields, "recorded_at", "category", "personally_rechecked",
  "separate_hold_acknowledged", "state", "field_acceptance", "independent_review"] as const;
function safeTime(value: unknown): value is string {
  return typeof value === "string" && /^20\d\d-\d\d-\d\dT/.test(value) &&
    Number.isFinite(Date.parse(value)) && Date.parse(value) >= Date.parse("2020-01-01T00:00:00Z") &&
    Date.parse(value) <= Date.now() + 300_000;
}
function validCategory(category: TriageContinuityCategory, signals: readonly TriageContinuitySignal[]) {
  return category === "CONTINUE_REVIEWER_TRIAGE_HOLD" ||
    category === "REQUEST_POST_TRIAGE_OWNER_REWITNESS" && signals.includes("POST_TRIAGE_OWNER_WITNESS_MISSING") ||
    category === "REQUEST_POST_TRIAGE_SOURCE_RECHECK" && signals.some(s =>
      ["POST_TRIAGE_SOURCE_RECHECK_MISSING", "SOURCE_IDENTITY_OR_ACCESS_DRIFT",
        "SOURCE_RECHECK_OVERDUE"].includes(s)) ||
    category === "REQUEST_QL248_TWO_SHA_OPERATOR_AUDIT" &&
      signals.includes("QL248_TWO_SHA_CONSUMER_AGREEMENT_PENDING");
}

export function compareTriageRenewalContinuity(prior: RenewalTriageReceipt,
  earlierIndex: number, laterIndex: number, at = new Date().toISOString()): TriageContinuityComparison {
  const earlier = prior.renewal_triage_notes[earlierIndex];
  const later = prior.renewal_triage_notes[laterIndex];
  if (!Number.isInteger(earlierIndex) || !Number.isInteger(laterIndex) || earlierIndex < 0 ||
    laterIndex <= earlierIndex || !earlier || !later || earlier.case_id !== later.case_id ||
    earlier.reassignment_watch_index !== later.reassignment_watch_index ||
    earlier.later_reviewer_index >= later.later_reviewer_index ||
    Date.parse(earlier.recorded_at) >= Date.parse(later.recorded_at) || !safeTime(at) ||
    Date.parse(at) < Date.parse(later.recorded_at))
    throw new Error("Build 177 requires chronological same-watch triages with progressively later reviewer evidence.");
  const nested = parseHeldReviewerReceipt(JSON.stringify(prior.reviewer_receipt));
  const reviewerNotes = prior.reviewer_receipt.reviewer_followups;
  const held = prior.reviewer_receipt.held_receipt;
  const followups = held.disposition_receipt.recurrence_disposition_followups;
  const getSource = (note: RenewalTriageNote) => {
    const reassessment = held.held_disposition_reassessments[
      reviewerNotes[note.later_reviewer_index]?.later_reassessment_index];
    const followup = followups[reassessment?.later_followup_index];
    if (!followup || followup.case_id !== note.case_id ||
      followup.reassignment_watch_index !== note.reassignment_watch_index)
      throw new Error("Build 177 source lineage does not match the held reassignment watch.");
    return { check: followup.later_source_check_index === null ? null :
      nested.checks[followup.later_source_check_index], followup };
  };
  const before = getSource(earlier);
  const after = getSource(later);
  const disposition = held.disposition_receipt;
  const recurrence = disposition.exception_receipt.exception_recurrences[after.followup.later_recurrence_index];
  const outcome = disposition.exception_receipt.drift_outcome_receipt.drift_outcomes[recurrence?.latest_outcome_index];
  const renewal = disposition.exception_receipt.drift_outcome_receipt.renewal_receipt.renewal_rechecks[
    outcome?.latest_recheck_index];
  const ownerFollowup = nested.aging_followups[renewal?.latest_followup_index];
  const obsIndex = nested.aging_audits[ownerFollowup?.latest_audit_index]?.latest_observation_index;
  const owner = obsIndex === undefined ? null : nested.trial.observations[obsIndex];
  const ownerFresh = !!owner && owner.case_id === later.case_id && owner.witnessed_by_operator &&
    Date.parse(owner.observed_at) > Date.parse(earlier.recorded_at) &&
    Date.parse(owner.observed_at) <= Date.parse(later.recorded_at);
  const sourceFresh = !!after.check && after.check.case_id === later.case_id &&
    before.followup.later_source_check_index !== after.followup.later_source_check_index &&
    Date.parse(after.check.captured_at) > Date.parse(earlier.recorded_at) &&
    Date.parse(after.check.captured_at) <= Date.parse(later.recorded_at) &&
    (!before.check || Date.parse(after.check.captured_at) > Date.parse(before.check.captured_at));
  const repeatedOwner = earlier.signals.includes("NEW_OWNER_EVIDENCE_MISSING") &&
    later.signals.includes("NEW_OWNER_EVIDENCE_MISSING");
  const repeatedSource = earlier.signals.includes("NEW_SOURCE_EVIDENCE_MISSING") &&
    later.signals.includes("NEW_SOURCE_EVIDENCE_MISSING");
  const drift = earlier.source_identity_drift || later.source_identity_drift ||
    !!before.check && !!after.check && (before.check.safe_alias !== after.check.safe_alias ||
      before.check.identity_state !== after.check.identity_state ||
      before.check.installed_version !== after.check.installed_version ||
      before.check.access !== after.check.access);
  const sourceAge = after.check ? Math.floor((Date.parse(at) - Date.parse(after.check.captured_at)) / DAY) : null;
  const triageAge = Math.floor((Date.parse(at) - Date.parse(earlier.recorded_at)) / DAY);
  const signals: TriageContinuitySignal[] = [];
  if (!ownerFresh) signals.push("POST_TRIAGE_OWNER_WITNESS_MISSING");
  if (!sourceFresh) signals.push("POST_TRIAGE_SOURCE_RECHECK_MISSING");
  if (ownerFresh || sourceFresh) signals.push("NEW_PRIVATE_CLAIMS_UNVERIFIED");
  if (repeatedOwner) signals.push("REPEATED_OWNER_GAP");
  if (repeatedSource) signals.push("REPEATED_SOURCE_GAP");
  if (drift) signals.push("SOURCE_IDENTITY_OR_ACCESS_DRIFT");
  if (sourceAge === null || sourceAge > 7) signals.push("SOURCE_RECHECK_OVERDUE");
  if (triageAge >= 3) signals.push("EARLIER_TRIAGE_AGED");
  if (triageAge > 7) signals.push("EARLIER_TRIAGE_OVERDUE");
  signals.push("INDEPENDENT_REVIEWER_NOT_VERIFIED", "QL248_TWO_SHA_CONSUMER_AGREEMENT_PENDING",
    "PRIVATE_RUNNER_NOT_AUTHORIZED", "FIELD_AND_VAULT_HOLDS_CONTINUE");
  return { earlier_triage_index: earlierIndex, later_triage_index: laterIndex,
    case_id: earlier.case_id, reassignment_watch_index: earlier.reassignment_watch_index,
    earlier_at: earlier.recorded_at, later_at: later.recorded_at,
    earlier_reviewer_index: earlier.later_reviewer_index,
    later_reviewer_index: later.later_reviewer_index,
    newer_owner_witness_claim: ownerFresh, newer_distinct_source_claim: sourceFresh,
    repeated_owner_gap: repeatedOwner, repeated_source_gap: repeatedSource,
    source_identity_drift: drift, source_age_days: sourceAge,
    earlier_triage_age_days: triageAge,
    age_band: triageAge > 7 ? "OVER_SEVEN_DAYS" : triageAge >= 3 ?
      "THREE_TO_SEVEN_DAYS" : "UNDER_THREE_DAYS", signals,
    ql248_trust: "FORMAT_ONLY_UNVERIFIED", private_runner_approval: "NOT_GIVEN",
    independently_witnessed: false, closure: "NOT_AUTHORIZED" };
}

export function validateTriageContinuityNotes(prior: RenewalTriageReceipt,
  notes: readonly TriageContinuityNote[], exportedAt?: string) {
  if (notes.length > 100) throw new Error("Build 177 permits at most 100 private continuity notes.");
  let previous = 0; const seen = new Set<string>();
  for (const note of notes) {
    if (!note || Object.keys(note).length !== noteFields.length ||
      Object.keys(note).some(k => !noteFields.includes(k as typeof noteFields[number])) ||
      !safeTime(note.recorded_at) || !TRIAGE_CONTINUITY_CATEGORIES.includes(note.category) ||
      note.personally_rechecked !== true || note.separate_hold_acknowledged !== true ||
      note.state !== "PRIVATE_TRIAGE_RENEWAL_CONTINUITY_NOT_SENT" ||
      note.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
      note.independent_review !== "INDEPENDENT_REVIEW_HOLD")
      throw new Error("Unsafe Build 177 private continuity note.");
    const time = Date.parse(note.recorded_at);
    if (time < previous || exportedAt && time > Date.parse(exportedAt))
      throw new Error("Build 177 continuity chronology invalid.");
    const expected = compareTriageRenewalContinuity(prior,
      note.earlier_triage_index, note.later_triage_index, note.recorded_at);
    if (compareFields.some(k => JSON.stringify(note[k]) !== JSON.stringify(expected[k])))
      throw new Error("Build 177 immutable triage/source evidence altered.");
    if (!validCategory(note.category, expected.signals))
      throw new Error("Build 177 category requires unresolved evidence.");
    const key = `${note.earlier_triage_index}:${note.later_triage_index}:${note.category}`;
    if (seen.has(key)) throw new Error("Duplicate Build 177 private continuity note.");
    seen.add(key); previous = time;
  }
}

export function recordTriageContinuity(prior: RenewalTriageReceipt,
  notes: readonly TriageContinuityNote[], environment: TrialEnvironment,
  imported: { triages: number; continuity: number }, input: {
    earlier_triage_index: number; later_triage_index: number; category: TriageContinuityCategory;
    personally_rechecked: boolean; separate_hold_acknowledged: boolean;
  }, at = new Date().toISOString()): TriageContinuityNote[] {
  if (!environment.installed_windows_witnessed || !validateInstalledVersion(environment.installed_version) ||
    environment.access === "unknown" || input.later_triage_index < imported.triages ||
    notes.length < imported.continuity || !input.personally_rechecked ||
    !input.separate_hold_acknowledged || !TRIAGE_CONTINUITY_CATEGORIES.includes(input.category))
    throw new Error("Build 177 requires non-imported later triage, witnessed Windows and two HOLD attestations.");
  const comparison = compareTriageRenewalContinuity(prior,
    input.earlier_triage_index, input.later_triage_index, at);
  if (!validCategory(input.category, comparison.signals))
    throw new Error("Build 177 category requires unresolved evidence.");
  const next: TriageContinuityNote[] = [...notes, { ...comparison, recorded_at: at,
    category: input.category, personally_rechecked: true, separate_hold_acknowledged: true,
    state: "PRIVATE_TRIAGE_RENEWAL_CONTINUITY_NOT_SENT",
    field_acceptance: "FIELD_ACCEPTANCE_HOLD", independent_review: "INDEPENDENT_REVIEW_HOLD" }];
  validateTriageContinuityNotes(prior, next);
  return next;
}

export function createTriageContinuityReceipt(prior: RenewalTriageReceipt,
  notes: readonly TriageContinuityNote[], at = new Date().toISOString()): TriageContinuityReceipt {
  if (prior.kind !== "rosevear_independent_reviewer_renewal_outcome_triage" || !safeTime(at) ||
    Date.parse(at) < Date.parse(prior.exported_at))
    throw new Error("Build 177 requires chronological complete Build 176 receipt.");
  parseReviewerRenewalReceipt(JSON.stringify(prior));
  validateTriageContinuityNotes(prior, notes, at);
  const receipt: TriageContinuityReceipt = {
    kind: "rosevear_private_reviewer_triage_renewal_continuity", schema_version: 1,
    exported_at: at, field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED",
    connection_state: "DISCONNECTED", private_runner_approval: "NOT_GIVEN",
    ql248_trust: "FORMAT_ONLY_UNVERIFIED", evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS",
    triage_receipt: prior, triage_continuity_notes: notes.map(n => ({ ...n, signals: [...n.signals] })),
  };
  if (JSON.stringify(receipt).length > MAX_TRIAGE_CONTINUITY_BYTES)
    throw new Error("Build 177 private continuity receipt exceeds 8.2 MB.");
  return receipt;
}

export function parseTriageContinuityReceipt(raw: string) {
  if (raw.length > MAX_TRIAGE_CONTINUITY_BYTES) throw new Error("Build 177 import exceeds 8.2 MB.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Invalid Build 177 private JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid Build 177 private receipt envelope.");
  const obj = value as Record<string, unknown>;
  if (obj.kind !== "rosevear_private_reviewer_triage_renewal_continuity")
    return { ...parseReviewerRenewalReceipt(raw), triage_continuity_notes: [] as TriageContinuityNote[] };
  const keys = ["kind", "schema_version", "exported_at", "field_acceptance",
    "independent_review", "closure", "connection_state", "private_runner_approval",
    "ql248_trust", "evidence_authenticity", "triage_receipt", "triage_continuity_notes"];
  if (Object.keys(obj).length !== keys.length || Object.keys(obj).some(k => !keys.includes(k)) ||
    obj.schema_version !== 1 || !safeTime(obj.exported_at) ||
    obj.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
    obj.independent_review !== "INDEPENDENT_REVIEW_HOLD" || obj.closure !== "NOT_AUTHORIZED" ||
    obj.connection_state !== "DISCONNECTED" || obj.private_runner_approval !== "NOT_GIVEN" ||
    obj.ql248_trust !== "FORMAT_ONLY_UNVERIFIED" ||
    obj.evidence_authenticity !== "UNVERIFIED_PRIVATE_ATTESTATIONS" ||
    !obj.triage_receipt || !Array.isArray(obj.triage_continuity_notes))
    throw new Error("Unsafe Build 177 permanent HOLD receipt.");
  const prior = obj.triage_receipt as RenewalTriageReceipt;
  if (prior.kind !== "rosevear_independent_reviewer_renewal_outcome_triage" ||
    Date.parse(prior.exported_at) > Date.parse(obj.exported_at as string))
    throw new Error("Build 177 nested triage chronology invalid.");
  const nested = parseReviewerRenewalReceipt(JSON.stringify(prior));
  validateTriageContinuityNotes(prior, obj.triage_continuity_notes as TriageContinuityNote[],
    obj.exported_at as string);
  return { ...nested, triage_continuity_notes: (obj.triage_continuity_notes as TriageContinuityNote[])
    .map(n => ({ ...n, signals: [...n.signals] })) };
}

/** Whole-record historical prefix: old private evidence cannot be edited or promoted on import. */
export function compareHistoricalTriageContinuity(beforeRaw: string, afterRaw: string) {
  if (beforeRaw.length > 8_000_000 || afterRaw.length > 8_000_000)
    throw new Error("Build 177 comparison exceeds 8 MB.");
  let before: RenewalTriageReceipt; let after: RenewalTriageReceipt;
  try { before = JSON.parse(beforeRaw); after = JSON.parse(afterRaw); }
  catch { throw new Error("Invalid Build 176 historical JSON."); }
  if (before?.kind !== "rosevear_independent_reviewer_renewal_outcome_triage" ||
    after?.kind !== "rosevear_independent_reviewer_renewal_outcome_triage" ||
    Date.parse(before.exported_at) >= Date.parse(after.exported_at))
    throw new Error("Two chronological complete Build 176 receipts required.");
  parseReviewerRenewalReceipt(beforeRaw); parseReviewerRenewalReceipt(afterRaw);
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
  if (!prefix(before, after) || !before.renewal_triage_notes.length ||
    before.renewal_triage_notes.length >= after.renewal_triage_notes.length)
    throw new Error("Build 176 nested triage evidence must be an exact nonempty append-only historical prefix.");
  let comparison: TriageContinuityComparison | null = null;
  for (let later = before.renewal_triage_notes.length;
    later < after.renewal_triage_notes.length && !comparison; later++) {
    for (let earlier = before.renewal_triage_notes.length - 1; earlier >= 0; earlier--) {
      const old = after.renewal_triage_notes[earlier];
      const next = after.renewal_triage_notes[later];
      if (old.case_id !== next.case_id || old.reassignment_watch_index !== next.reassignment_watch_index ||
        old.later_reviewer_index >= next.later_reviewer_index) continue;
      comparison = compareTriageRenewalContinuity(after, earlier, later, after.exported_at);
      break;
    }
  }
  return { previous_triages: before.renewal_triage_notes.length,
    current_triages: after.renewal_triage_notes.length,
    new_triages: after.renewal_triage_notes.length - before.renewal_triage_notes.length,
    comparison };
}

/** Public identifier format checks only: no fetch, signature validation, pin trust or approval. */
export interface Ql248AuditDraft {
  repository: string;
  source_sha: string;
  source_ci_url: string;
  proof_commit_sha: string;
  raw_proof_sha256: string;
  public_spki_sha256: string;
}
export function inspectQl248AuditDraft(draft: Ql248AuditDraft) {
  const sha = (s: string) => /^[0-9a-f]{40}$/.test(s);
  const digest = (s: string) => /^[0-9a-f]{64}$/.test(s);
  const repoValid = draft.repository === "RosevearCreations/rosevear-ai-hub";
  const checks = [
    { check: "Exact AI Hub repository", ready: repoValid },
    { check: "Audited source commit S format", ready: sha(draft.source_sha) },
    { check: "Exact source-repository GitHub Actions run URL format",
      ready: repoValid && /^https:\/\/github\.com\/RosevearCreations\/rosevear-ai-hub\/actions\/runs\/[1-9]\d*$/.test(draft.source_ci_url) },
    { check: "Separate immutable proof-bearing commit P format",
      ready: sha(draft.proof_commit_sha) && draft.proof_commit_sha !== draft.source_sha },
    { check: "Raw public proof JSON SHA-256 format", ready: digest(draft.raw_proof_sha256) },
    { check: "Out-of-band public Ed25519 SPKI SHA-256 format", ready: digest(draft.public_spki_sha256) },
  ];
  return { format_only: true as const, status: "UNVERIFIED_NOT_AUTHORIZED" as const,
    source_proof_separate: sha(draft.source_sha) && sha(draft.proof_commit_sha) &&
      draft.source_sha !== draft.proof_commit_sha,
    checks, format_complete: checks.every(c => c.ready),
    external_retrieval: "NOT_PERFORMED" as const, consumer_agreement: "PENDING" as const,
    public_key_pin: "NOT_AUTHENTICATED" as const, authenticated_get: "NOT_PERFORMED" as const,
    seven_denials: "UNVERIFIED" as const, owner_pilot_authorization: "NOT_GIVEN" as const };
}
