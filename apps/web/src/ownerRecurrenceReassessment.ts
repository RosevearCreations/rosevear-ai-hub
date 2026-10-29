/** Build 182: immutable private recurrence re-assessment; no real-world proof upgrade. */
import { validateInstalledVersion, type TrialEnvironment } from "./ownerFieldTrial";
import { parseRecurrenceReceipt, type RecurrenceNote, type RecurrenceReceipt } from "./ownerRenewalRecurrence";

export type ReassessmentAction = "CONTINUE_INDEPENDENT_HOLD" |
  "REQUEST_NEW_OWNER_SOURCE_ORIGINALS" | "ESCALATE_QL254_CUSTODY_WITNESS_GAP";
export const REASSESSMENT_ACTIONS: readonly ReassessmentAction[] = [
  "CONTINUE_INDEPENDENT_HOLD", "REQUEST_NEW_OWNER_SOURCE_ORIGINALS",
  "ESCALATE_QL254_CUSTODY_WITNESS_GAP",
];
export type ReassessmentSignal = "REPEATED_PRIVATE_RECURRENCE" |
  "PERSISTENT_OWNER_SOURCE_ORIGINAL_GAP" | "OLDER_RECURRENCE_OVERDUE" |
  "QL254_SIGNED_PROOF_MISSING_OR_UNTRUSTED" |
  "QL254_SEPARATE_CUSTODIAN_AND_WITNESS_NOT_VERIFIED" |
  "NO_OWNER_TEST_OR_ORIGINAL_GATEWAY_DENIALS" |
  "PRIVATE_MINISERVER_ROLLBACK_SIMULATION_ONLY" | "FIELD_AND_VAULT_HOLD";
export interface ReassessmentComparison {
  earlier_recurrence_index: number;
  later_recurrence_index: number;
  case_id: RecurrenceNote["case_id"];
  reassignment_watch_index: number;
  earlier_disposition_index: number;
  later_disposition_index: number;
  earlier_at: string;
  later_at: string;
  earlier_age_days: number;
  persistent_original_gap: boolean;
  signals: ReassessmentSignal[];
  public_original_proof: "NOT_VERIFIED";
  out_of_band_registry: "NOT_VERIFIED";
  owner_test_decision: "NOT_GIVEN";
  private_relay: "NOT_INSTALLED_OR_AUTHORIZED";
  connection_state: "DISCONNECTED";
  closure: "NOT_AUTHORIZED";
}
export interface ReassessmentNote extends ReassessmentComparison {
  recorded_at: string;
  action: ReassessmentAction;
  fresh_installed_windows_review: true;
  separate_hold_attestation: true;
  state: "PRIVATE_RECURRENCE_REASSESSMENT_NOT_SENT";
}
export interface ReassessmentReceipt {
  kind: "rosevear_private_recurrence_exception_reassessment";
  schema_version: 1;
  exported_at: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  public_original_proof: "NOT_VERIFIED";
  out_of_band_registry: "NOT_VERIFIED";
  owner_test_decision: "NOT_GIVEN";
  private_relay: "NOT_INSTALLED_OR_AUTHORIZED";
  connection_state: "DISCONNECTED";
  closure: "NOT_AUTHORIZED";
  recurrence_receipt: RecurrenceReceipt;
  reassessment_notes: ReassessmentNote[];
}
export const MAX_REASSESSMENT_BYTES = 10_500_000;
const DAY = 86_400_000;
const comparisonKeys = ["earlier_recurrence_index", "later_recurrence_index", "case_id",
  "reassignment_watch_index", "earlier_disposition_index", "later_disposition_index",
  "earlier_at", "later_at", "earlier_age_days", "persistent_original_gap", "signals",
  "public_original_proof", "out_of_band_registry", "owner_test_decision",
  "private_relay", "connection_state", "closure"] as const;
const noteKeys: readonly string[] = [...comparisonKeys, "recorded_at", "action",
  "fresh_installed_windows_review", "separate_hold_attestation", "state"];
function safeTime(t: unknown): t is string {
  return typeof t === "string" && /^20\d\d-\d\d-\d\dT/.test(t) &&
    Number.isFinite(Date.parse(t)) && Date.parse(t) >= Date.parse("2020-01-01T00:00:00Z") &&
    Date.parse(t) <= Date.now() + 300_000;
}
function allowed(action: ReassessmentAction, c: ReassessmentComparison): boolean {
  return action === "CONTINUE_INDEPENDENT_HOLD" ||
    action === "REQUEST_NEW_OWNER_SOURCE_ORIGINALS" && c.persistent_original_gap ||
    action === "ESCALATE_QL254_CUSTODY_WITNESS_GAP" &&
      c.signals.includes("QL254_SEPARATE_CUSTODIAN_AND_WITNESS_NOT_VERIFIED");
}
export function compareRecurrenceReassessment(prior: RecurrenceReceipt,
  earlierIndex: number, laterIndex: number, at = new Date().toISOString()): ReassessmentComparison {
  const earlier = prior.recurrence_notes[earlierIndex];
  const later = prior.recurrence_notes[laterIndex];
  if (!Number.isInteger(earlierIndex) || !Number.isInteger(laterIndex) || earlierIndex < 0 ||
    laterIndex <= earlierIndex || !earlier || !later || earlier.case_id !== later.case_id ||
    earlier.reassignment_watch_index !== later.reassignment_watch_index ||
    earlier.later_disposition_index >= later.later_disposition_index ||
    Date.parse(earlier.recorded_at) >= Date.parse(later.recorded_at) ||
    !safeTime(at) || Date.parse(at) < Date.parse(later.recorded_at))
    throw new Error("Build 182 requires chronological same-case/watch recurrence referencing a later disposition.");
  const age = Math.floor((Date.parse(at) - Date.parse(earlier.recorded_at)) / DAY);
  const gap = earlier.source_drift_or_gap_persisted && later.source_drift_or_gap_persisted;
  const signals: ReassessmentSignal[] = ["REPEATED_PRIVATE_RECURRENCE"];
  if (gap) signals.push("PERSISTENT_OWNER_SOURCE_ORIGINAL_GAP");
  if (age > 7) signals.push("OLDER_RECURRENCE_OVERDUE");
  signals.push("QL254_SIGNED_PROOF_MISSING_OR_UNTRUSTED",
    "QL254_SEPARATE_CUSTODIAN_AND_WITNESS_NOT_VERIFIED",
    "NO_OWNER_TEST_OR_ORIGINAL_GATEWAY_DENIALS",
    "PRIVATE_MINISERVER_ROLLBACK_SIMULATION_ONLY", "FIELD_AND_VAULT_HOLD");
  return { earlier_recurrence_index: earlierIndex, later_recurrence_index: laterIndex,
    case_id: earlier.case_id, reassignment_watch_index: earlier.reassignment_watch_index,
    earlier_disposition_index: earlier.later_disposition_index,
    later_disposition_index: later.later_disposition_index,
    earlier_at: earlier.recorded_at, later_at: later.recorded_at,
    earlier_age_days: age, persistent_original_gap: gap, signals,
    public_original_proof: "NOT_VERIFIED", out_of_band_registry: "NOT_VERIFIED",
    owner_test_decision: "NOT_GIVEN", private_relay: "NOT_INSTALLED_OR_AUTHORIZED",
    connection_state: "DISCONNECTED", closure: "NOT_AUTHORIZED" };
}
export function validateReassessmentNotes(prior: RecurrenceReceipt,
  notes: readonly ReassessmentNote[], exportedAt?: string) {
  if (notes.length > 100) throw new Error("Build 182 reassessment exceeds 100 notes.");
  const seen = new Set<string>(); let previous = 0;
  for (const note of notes) {
    if (!note || Object.keys(note).length !== noteKeys.length ||
      Object.keys(note).some(k => !noteKeys.includes(k)) || !safeTime(note.recorded_at) ||
      !REASSESSMENT_ACTIONS.includes(note.action) ||
      note.fresh_installed_windows_review !== true || note.separate_hold_attestation !== true ||
      note.state !== "PRIVATE_RECURRENCE_REASSESSMENT_NOT_SENT")
      throw new Error("Unsafe Build 182 private reassessment note.");
    const time = Date.parse(note.recorded_at);
    if (time < previous || exportedAt && time > Date.parse(exportedAt))
      throw new Error("Build 182 reassessment chronology invalid.");
    const expected = compareRecurrenceReassessment(prior, note.earlier_recurrence_index,
      note.later_recurrence_index, note.recorded_at);
    if (comparisonKeys.some(k => JSON.stringify(note[k]) !== JSON.stringify(expected[k])) ||
      !allowed(note.action, expected))
      throw new Error("Build 182 immutable comparison or source-gap disposition was altered.");
    const id = `${note.earlier_recurrence_index}:${note.later_recurrence_index}:${note.action}`;
    if (seen.has(id)) throw new Error("Duplicate Build 182 reassessment.");
    seen.add(id); previous = time;
  }
}
export function recordRecurrenceReassessment(prior: RecurrenceReceipt,
  notes: readonly ReassessmentNote[], environment: TrialEnvironment,
  imported: { recurrences: number; reassessments: number }, input: {
    earlier_recurrence_index: number; later_recurrence_index: number;
    action: ReassessmentAction; fresh_installed_windows_review: boolean;
    separate_hold_attestation: boolean;
  }, at = new Date().toISOString()): ReassessmentNote[] {
  if (!environment.installed_windows_witnessed || !validateInstalledVersion(environment.installed_version) ||
    environment.access === "unknown" || input.later_recurrence_index < imported.recurrences ||
    notes.length < imported.reassessments || !input.fresh_installed_windows_review ||
    !input.separate_hold_attestation || !REASSESSMENT_ACTIONS.includes(input.action))
    throw new Error("Build 182 requires non-imported later recurrence, fresh installed Windows and separate HOLD attestations.");
  const expected = compareRecurrenceReassessment(prior, input.earlier_recurrence_index,
    input.later_recurrence_index, at);
  if (!allowed(input.action, expected)) throw new Error("Build 182 action needs matching unresolved original gap.");
  const next: ReassessmentNote[] = [...notes, { ...expected, recorded_at: at,
    action: input.action, fresh_installed_windows_review: true, separate_hold_attestation: true,
    state: "PRIVATE_RECURRENCE_REASSESSMENT_NOT_SENT" }];
  validateReassessmentNotes(prior, next);
  return next;
}
export function createReassessmentReceipt(prior: RecurrenceReceipt,
  notes: readonly ReassessmentNote[], at = new Date().toISOString()): ReassessmentReceipt {
  if (prior.kind !== "rosevear_private_renewal_disposition_exception_recurrence" ||
    !safeTime(at) || Date.parse(at) < Date.parse(prior.exported_at))
    throw new Error("Build 182 requires chronological complete Build 181 receipt.");
  parseRecurrenceReceipt(JSON.stringify(prior)); validateReassessmentNotes(prior, notes, at);
  const result: ReassessmentReceipt = {
    kind: "rosevear_private_recurrence_exception_reassessment", schema_version: 1,
    exported_at: at, field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", public_original_proof: "NOT_VERIFIED",
    out_of_band_registry: "NOT_VERIFIED", owner_test_decision: "NOT_GIVEN",
    private_relay: "NOT_INSTALLED_OR_AUTHORIZED", connection_state: "DISCONNECTED",
    closure: "NOT_AUTHORIZED", recurrence_receipt: prior,
    reassessment_notes: notes.map(n => ({ ...n, signals: [...n.signals] })) };
  if (JSON.stringify(result).length > MAX_REASSESSMENT_BYTES)
    throw new Error("Build 182 reassessment receipt exceeds 10.5 MB.");
  return result;
}
export function parseReassessmentReceipt(raw: string) {
  if (raw.length > MAX_REASSESSMENT_BYTES) throw new Error("Build 182 import exceeds 10.5 MB.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Build 182 JSON invalid."); }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Build 182 receipt envelope invalid.");
  const obj = value as Record<string, unknown>;
  if (obj.kind !== "rosevear_private_recurrence_exception_reassessment")
    return { ...parseRecurrenceReceipt(raw), reassessment_notes: [] as ReassessmentNote[] };
  const fields = ["kind", "schema_version", "exported_at", "field_acceptance",
    "independent_review", "public_original_proof", "out_of_band_registry",
    "owner_test_decision", "private_relay", "connection_state", "closure",
    "recurrence_receipt", "reassessment_notes"];
  if (Object.keys(obj).length !== fields.length || Object.keys(obj).some(k => !fields.includes(k)) ||
    obj.schema_version !== 1 || !safeTime(obj.exported_at) ||
    obj.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
    obj.independent_review !== "INDEPENDENT_REVIEW_HOLD" ||
    obj.public_original_proof !== "NOT_VERIFIED" || obj.out_of_band_registry !== "NOT_VERIFIED" ||
    obj.owner_test_decision !== "NOT_GIVEN" || obj.private_relay !== "NOT_INSTALLED_OR_AUTHORIZED" ||
    obj.connection_state !== "DISCONNECTED" || obj.closure !== "NOT_AUTHORIZED" ||
    !obj.recurrence_receipt || !Array.isArray(obj.reassessment_notes))
    throw new Error("Unsafe Build 182 permanent HOLD receipt.");
  const prior = obj.recurrence_receipt as RecurrenceReceipt;
  if (prior.kind !== "rosevear_private_renewal_disposition_exception_recurrence" ||
    Date.parse(prior.exported_at) > Date.parse(obj.exported_at as string))
    throw new Error("Build 182 nested recurrence chronology invalid.");
  const nested = parseRecurrenceReceipt(JSON.stringify(prior));
  validateReassessmentNotes(prior, obj.reassessment_notes as ReassessmentNote[], obj.exported_at as string);
  return { ...nested, reassessment_notes: (obj.reassessment_notes as ReassessmentNote[])
    .map(n => ({ ...n, signals: [...n.signals] })) };
}
