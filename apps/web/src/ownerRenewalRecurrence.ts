/** Build 181: append-only, private disposition recurrence; never an integration witness. */
import { validateInstalledVersion, type TrialEnvironment } from "./ownerFieldTrial";
import { createRenewalDispositionReceipt, parseRenewalDispositionReceipt,
  type RenewalDispositionNote, type RenewalDispositionReceipt } from "./ownerRenewalDisposition";

export type RecurrenceAction = "CONTINUE_REVIEW_HOLD" | "REQUEST_NEW_ORIGINAL_OWNER_SOURCE_WITNESS" |
  "REQUEST_SEPARATE_QL253_SIGNER_PIN_AND_TEST_DECISION";
export const RECURRENCE_ACTIONS: readonly RecurrenceAction[] = [
  "CONTINUE_REVIEW_HOLD", "REQUEST_NEW_ORIGINAL_OWNER_SOURCE_WITNESS",
  "REQUEST_SEPARATE_QL253_SIGNER_PIN_AND_TEST_DECISION",
];
export type RecurrenceSignal = "LATER_INDEPENDENT_DISPOSITION_RECURRED" |
  "REPEATED_SOURCE_DRIFT_OR_MISSING_ORIGINALS" | "EARLIER_DISPOSITION_OVERDUE" |
  "QL253_PUBLIC_SIGNED_SOURCE_PROOF_NOT_VERIFIED" |
  "QL253_PRIVATE_CUSTODIAN_REGISTRY_AND_DISTINCT_WITNESS_UNVERIFIED" |
  "OWNER_TEST_NOT_GIVEN_NO_PRIVATE_RELAY_APPROVAL" |
  "PHYSICAL_FIELD_AND_FIRST_PARTY_VAULT_HOLD";
export interface RecurrenceComparison {
  earlier_disposition_index: number;
  later_disposition_index: number;
  case_id: RenewalDispositionNote["case_id"];
  reassignment_watch_index: number;
  earlier_renewal_index: number;
  later_renewal_index: number;
  earlier_at: string;
  later_at: string;
  recurrence_age_days: number;
  source_drift_or_gap_persisted: boolean;
  signals: RecurrenceSignal[];
  original_proof: "UNVERIFIED_OR_MISSING";
  pin_registry_witness: "NOT_AVAILABLE";
  owner_test_decision: "NOT_GIVEN";
  relay_deployment: "NOT_AUTHORIZED";
  connection_state: "DISCONNECTED";
  closure: "NOT_AUTHORIZED";
}
export interface RecurrenceNote extends RecurrenceComparison {
  recorded_at: string;
  action: RecurrenceAction;
  fresh_private_recheck: true;
  independent_hold_acknowledged: true;
  state: "PRIVATE_DISPOSITION_RECURRENCE_NOT_SENT";
}
export interface RecurrenceReceipt {
  kind: "rosevear_private_renewal_disposition_exception_recurrence";
  schema_version: 1;
  exported_at: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  ql253_proof: "UNVERIFIED_OR_MISSING";
  pin_registry: "NOT_AVAILABLE";
  owner_test_decision: "NOT_GIVEN";
  relay_deployment: "NOT_AUTHORIZED";
  connection_state: "DISCONNECTED";
  closure: "NOT_AUTHORIZED";
  renewal_disposition_receipt: RenewalDispositionReceipt;
  recurrence_notes: RecurrenceNote[];
}
export const MAX_RECURRENCE_RECEIPT_BYTES = 10_000_000;
const DAY = 86_400_000;
const comparisonKeys = ["earlier_disposition_index", "later_disposition_index", "case_id",
  "reassignment_watch_index", "earlier_renewal_index", "later_renewal_index",
  "earlier_at", "later_at", "recurrence_age_days", "source_drift_or_gap_persisted",
  "signals", "original_proof", "pin_registry_witness", "owner_test_decision",
  "relay_deployment", "connection_state", "closure"] as const;
const noteKeys: readonly string[] = [...comparisonKeys, "recorded_at", "action",
  "fresh_private_recheck", "independent_hold_acknowledged", "state"];
function timeValid(value: unknown): value is string {
  return typeof value === "string" && /^20\d\d-\d\d-\d\dT/.test(value) &&
    Number.isFinite(Date.parse(value)) && Date.parse(value) >= Date.parse("2020-01-01T00:00:00Z") &&
    Date.parse(value) <= Date.now() + 300_000;
}
function allowed(action: RecurrenceAction, result: RecurrenceComparison): boolean {
  return action === "CONTINUE_REVIEW_HOLD" ||
    action === "REQUEST_NEW_ORIGINAL_OWNER_SOURCE_WITNESS" && result.source_drift_or_gap_persisted ||
    action === "REQUEST_SEPARATE_QL253_SIGNER_PIN_AND_TEST_DECISION" &&
      result.signals.includes("QL253_PRIVATE_CUSTODIAN_REGISTRY_AND_DISTINCT_WITNESS_UNVERIFIED");
}
export function compareRenewalRecurrence(prior: RenewalDispositionReceipt, earlierIndex: number,
  laterIndex: number, at = new Date().toISOString()): RecurrenceComparison {
  const earlier = prior.renewal_disposition_notes[earlierIndex];
  const later = prior.renewal_disposition_notes[laterIndex];
  if (!Number.isInteger(earlierIndex) || !Number.isInteger(laterIndex) || earlierIndex < 0 ||
    laterIndex <= earlierIndex || !earlier || !later || earlier.case_id !== later.case_id ||
    earlier.reassignment_watch_index !== later.reassignment_watch_index ||
    earlier.later_renewal_index >= later.later_renewal_index ||
    Date.parse(earlier.recorded_at) >= Date.parse(later.recorded_at) ||
    !timeValid(at) || Date.parse(at) < Date.parse(later.recorded_at))
    throw new Error("Build 181 requires chronological same-watch recurrence against a later private disposition and renewal.");
  const age = Math.floor((Date.parse(at) - Date.parse(earlier.recorded_at)) / DAY);
  const gap = earlier.repeated_owner_or_source_gap && later.repeated_owner_or_source_gap ||
    earlier.repeated_source_drift && later.repeated_source_drift ||
    earlier.source_age_days === null && later.source_age_days === null;
  const signals: RecurrenceSignal[] = ["LATER_INDEPENDENT_DISPOSITION_RECURRED"];
  if (gap) signals.push("REPEATED_SOURCE_DRIFT_OR_MISSING_ORIGINALS");
  if (age > 7) signals.push("EARLIER_DISPOSITION_OVERDUE");
  signals.push("QL253_PUBLIC_SIGNED_SOURCE_PROOF_NOT_VERIFIED",
    "QL253_PRIVATE_CUSTODIAN_REGISTRY_AND_DISTINCT_WITNESS_UNVERIFIED",
    "OWNER_TEST_NOT_GIVEN_NO_PRIVATE_RELAY_APPROVAL", "PHYSICAL_FIELD_AND_FIRST_PARTY_VAULT_HOLD");
  return { earlier_disposition_index: earlierIndex, later_disposition_index: laterIndex,
    case_id: earlier.case_id, reassignment_watch_index: earlier.reassignment_watch_index,
    earlier_renewal_index: earlier.later_renewal_index,
    later_renewal_index: later.later_renewal_index, earlier_at: earlier.recorded_at,
    later_at: later.recorded_at, recurrence_age_days: age,
    source_drift_or_gap_persisted: gap, signals, original_proof: "UNVERIFIED_OR_MISSING",
    pin_registry_witness: "NOT_AVAILABLE", owner_test_decision: "NOT_GIVEN",
    relay_deployment: "NOT_AUTHORIZED", connection_state: "DISCONNECTED",
    closure: "NOT_AUTHORIZED" };
}
export function validateRecurrenceNotes(prior: RenewalDispositionReceipt,
  notes: readonly RecurrenceNote[], exportedAt?: string): void {
  if (notes.length > 100) throw new Error("Build 181 recurrence exceeds 100 notes.");
  const seen = new Set<string>(); let previous = 0;
  for (const note of notes) {
    if (!note || Object.keys(note).length !== noteKeys.length ||
      Object.keys(note).some(k => !noteKeys.includes(k)) || !timeValid(note.recorded_at) ||
      !RECURRENCE_ACTIONS.includes(note.action) || note.fresh_private_recheck !== true ||
      note.independent_hold_acknowledged !== true ||
      note.state !== "PRIVATE_DISPOSITION_RECURRENCE_NOT_SENT")
      throw new Error("Unsafe Build 181 recurrence note fields.");
    const time = Date.parse(note.recorded_at);
    if (time < previous || exportedAt && time > Date.parse(exportedAt))
      throw new Error("Build 181 recurrence chronology invalid.");
    const expected = compareRenewalRecurrence(prior, note.earlier_disposition_index,
      note.later_disposition_index, note.recorded_at);
    if (comparisonKeys.some(key => JSON.stringify(note[key]) !== JSON.stringify(expected[key])) ||
      !allowed(note.action, expected))
      throw new Error("Build 181 recurrence original comparison or action changed.");
    const key = `${note.earlier_disposition_index}:${note.later_disposition_index}:${note.action}`;
    if (seen.has(key)) throw new Error("Duplicate Build 181 recurrence action.");
    seen.add(key); previous = time;
  }
}
export function recordRenewalRecurrence(prior: RenewalDispositionReceipt,
  notes: readonly RecurrenceNote[], environment: TrialEnvironment,
  imported: { dispositions: number; recurrences: number }, input: {
    earlier_disposition_index: number; later_disposition_index: number;
    action: RecurrenceAction; fresh_private_recheck: boolean;
    independent_hold_acknowledged: boolean;
  }, at = new Date().toISOString()): RecurrenceNote[] {
  if (!environment.installed_windows_witnessed || !validateInstalledVersion(environment.installed_version) ||
    environment.access === "unknown" || input.later_disposition_index < imported.dispositions ||
    notes.length < imported.recurrences || !input.fresh_private_recheck ||
    !input.independent_hold_acknowledged || !RECURRENCE_ACTIONS.includes(input.action))
    throw new Error("Build 181 requires non-imported later disposition, fresh installed Windows evidence and two HOLD attestations.");
  const expected = compareRenewalRecurrence(prior, input.earlier_disposition_index,
    input.later_disposition_index, at);
  if (!allowed(input.action, expected)) throw new Error("Build 181 action requires a matching unresolved source gap.");
  const next: RecurrenceNote[] = [...notes, { ...expected, recorded_at: at,
    action: input.action, fresh_private_recheck: true, independent_hold_acknowledged: true,
    state: "PRIVATE_DISPOSITION_RECURRENCE_NOT_SENT" }];
  validateRecurrenceNotes(prior, next);
  return next;
}
export function createRecurrenceReceipt(prior: RenewalDispositionReceipt,
  notes: readonly RecurrenceNote[], at = new Date().toISOString()): RecurrenceReceipt {
  if (prior.kind !== "rosevear_private_renewal_watch_exception_disposition" || !timeValid(at) ||
    Date.parse(at) < Date.parse(prior.exported_at))
    throw new Error("Build 181 requires chronological complete Build 180 disposition receipt.");
  parseRenewalDispositionReceipt(JSON.stringify(prior));
  validateRecurrenceNotes(prior, notes, at);
  const receipt: RecurrenceReceipt = { kind: "rosevear_private_renewal_disposition_exception_recurrence",
    schema_version: 1, exported_at: at, field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", ql253_proof: "UNVERIFIED_OR_MISSING",
    pin_registry: "NOT_AVAILABLE", owner_test_decision: "NOT_GIVEN",
    relay_deployment: "NOT_AUTHORIZED", connection_state: "DISCONNECTED",
    closure: "NOT_AUTHORIZED", renewal_disposition_receipt: prior,
    recurrence_notes: notes.map(n => ({ ...n, signals: [...n.signals] })) };
  if (JSON.stringify(receipt).length > MAX_RECURRENCE_RECEIPT_BYTES)
    throw new Error("Build 181 private recurrence export exceeds 10 MB.");
  return receipt;
}
export function parseRecurrenceReceipt(raw: string) {
  if (raw.length > MAX_RECURRENCE_RECEIPT_BYTES) throw new Error("Build 181 import exceeds 10 MB.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Build 181 JSON invalid."); }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Build 181 envelope invalid.");
  const obj = value as Record<string, unknown>;
  if (obj.kind !== "rosevear_private_renewal_disposition_exception_recurrence")
    return { ...parseRenewalDispositionReceipt(raw), recurrence_notes: [] as RecurrenceNote[] };
  const fields = ["kind", "schema_version", "exported_at", "field_acceptance",
    "independent_review", "ql253_proof", "pin_registry", "owner_test_decision",
    "relay_deployment", "connection_state", "closure", "renewal_disposition_receipt",
    "recurrence_notes"];
  if (Object.keys(obj).length !== fields.length || Object.keys(obj).some(k => !fields.includes(k)) ||
    obj.schema_version !== 1 || !timeValid(obj.exported_at) ||
    obj.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
    obj.independent_review !== "INDEPENDENT_REVIEW_HOLD" ||
    obj.ql253_proof !== "UNVERIFIED_OR_MISSING" || obj.pin_registry !== "NOT_AVAILABLE" ||
    obj.owner_test_decision !== "NOT_GIVEN" || obj.relay_deployment !== "NOT_AUTHORIZED" ||
    obj.connection_state !== "DISCONNECTED" || obj.closure !== "NOT_AUTHORIZED" ||
    !obj.renewal_disposition_receipt || !Array.isArray(obj.recurrence_notes))
    throw new Error("Unsafe Build 181 permanent HOLD receipt.");
  const prior = obj.renewal_disposition_receipt as RenewalDispositionReceipt;
  if (prior.kind !== "rosevear_private_renewal_watch_exception_disposition" ||
    Date.parse(prior.exported_at) > Date.parse(obj.exported_at as string))
    throw new Error("Build 181 nested disposition chronology invalid.");
  const nested = parseRenewalDispositionReceipt(JSON.stringify(prior));
  validateRecurrenceNotes(prior, obj.recurrence_notes as RecurrenceNote[], obj.exported_at as string);
  return { ...nested, recurrence_notes: (obj.recurrence_notes as RecurrenceNote[])
    .map(n => ({ ...n, signals: [...n.signals] })) };
}
