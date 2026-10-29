/** Build 180: private renewal-watch disposition with permanent independent HOLD. */
import { validateInstalledVersion, type TrialEnvironment } from "./ownerFieldTrial";
import { parseRenewalWatchReceipt, type RenewalWatchNote,
  type RenewalWatchReceipt } from "./ownerExceptionRenewalWatch";

export type RenewalDispositionCategory = "CONTINUE_INDEPENDENT_HOLD" |
  "REQUEST_LATER_OWNER_SOURCE_ORIGINALS" | "REQUEST_QL252_SIGNED_PROOF_AND_PIN_WITNESSES";
export const RENEWAL_DISPOSITION_CATEGORIES: readonly RenewalDispositionCategory[] = [
  "CONTINUE_INDEPENDENT_HOLD", "REQUEST_LATER_OWNER_SOURCE_ORIGINALS",
  "REQUEST_QL252_SIGNED_PROOF_AND_PIN_WITNESSES",
];
export type RenewalDispositionSignal = "REPEATED_OWNER_OR_SOURCE_GAP" |
  "REPEATED_SOURCE_DRIFT" | "SOURCE_EVIDENCE_OVERDUE_OR_MISSING" |
  "EARLIER_RENEWAL_AGED" | "EARLIER_RENEWAL_OVERDUE" |
  "LATER_PRIVATE_CLAIMS_NOT_ORIGINAL_WITNESSES" |
  "QL252_PUBLIC_PROOF_MISSING_OR_UNVERIFIED" |
  "QL252_OUT_OF_BAND_CUSTODY_AND_DENIAL_WITNESS_NOT_AVAILABLE" |
  "OWNER_TEST_NOT_GIVEN_PRIVATE_RUNNER_NOT_AUTHORIZED" |
  "FIELD_REVIEWER_VAULT_UNCHANGED_HOLD";

export interface RenewalDispositionComparison {
  earlier_renewal_index: number;
  later_renewal_index: number;
  case_id: RenewalWatchNote["case_id"];
  reassignment_watch_index: number;
  earlier_at: string;
  later_at: string;
  earlier_exception_index: number;
  later_exception_index: number;
  repeated_owner_or_source_gap: boolean;
  repeated_source_drift: boolean;
  later_owner_claim: boolean;
  later_source_claim: boolean;
  source_age_days: number | null;
  earlier_renewal_age_days: number;
  age_band: "UNDER_THREE_DAYS" | "THREE_TO_SEVEN_DAYS" | "OVER_SEVEN_DAYS";
  signals: RenewalDispositionSignal[];
  original_source_proof: "UNVERIFIED_OR_MISSING";
  owner_test_decision: "NOT_GIVEN";
  connection_state: "DISCONNECTED";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
}
export interface RenewalDispositionNote extends RenewalDispositionComparison {
  recorded_at: string;
  category: RenewalDispositionCategory;
  personally_rechecked: true;
  separate_hold_acknowledged: true;
  state: "PRIVATE_RENEWAL_DISPOSITION_NOT_SENT";
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
}
export interface RenewalDispositionReceipt {
  kind: "rosevear_private_renewal_watch_exception_disposition";
  schema_version: 1;
  exported_at: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  owner_test_decision: "NOT_GIVEN";
  connection_state: "DISCONNECTED";
  closure: "NOT_AUTHORIZED";
  ql252_proof: "UNVERIFIED_OR_MISSING";
  private_runner: "NOT_AUTHORIZED";
  evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS";
  renewal_watch_receipt: RenewalWatchReceipt;
  renewal_disposition_notes: RenewalDispositionNote[];
}
export const MAX_RENEWAL_DISPOSITION_BYTES = 9_500_000;
const DAY = 86_400_000;
const comparisonKeys = ["earlier_renewal_index", "later_renewal_index", "case_id",
  "reassignment_watch_index", "earlier_at", "later_at", "earlier_exception_index",
  "later_exception_index", "repeated_owner_or_source_gap", "repeated_source_drift",
  "later_owner_claim", "later_source_claim", "source_age_days",
  "earlier_renewal_age_days", "age_band", "signals", "original_source_proof",
  "owner_test_decision", "connection_state", "independent_review", "closure"] as const;
const noteKeys: readonly string[] = [...comparisonKeys, "recorded_at", "category",
  "personally_rechecked", "separate_hold_acknowledged", "state", "field_acceptance"];
function safeTime(value: unknown): value is string {
  return typeof value === "string" && /^20\d\d-\d\d-\d\dT/.test(value) &&
    Number.isFinite(Date.parse(value)) && Date.parse(value) >= Date.parse("2020-01-01T00:00:00Z") &&
    Date.parse(value) <= Date.now() + 300_000;
}
function categoryAllowed(category: RenewalDispositionCategory, signals: readonly RenewalDispositionSignal[]) {
  return category === "CONTINUE_INDEPENDENT_HOLD" ||
    category === "REQUEST_LATER_OWNER_SOURCE_ORIGINALS" &&
      signals.includes("REPEATED_OWNER_OR_SOURCE_GAP") ||
    category === "REQUEST_QL252_SIGNED_PROOF_AND_PIN_WITNESSES" &&
      signals.includes("QL252_PUBLIC_PROOF_MISSING_OR_UNVERIFIED");
}

/** Progressively later ORIGINAL watch; never convert private claims into source validation. */
export function compareRenewalDisposition(prior: RenewalWatchReceipt,
  earlierIndex: number, laterIndex: number, at = new Date().toISOString()): RenewalDispositionComparison {
  const earlier = prior.renewal_watch_notes[earlierIndex];
  const later = prior.renewal_watch_notes[laterIndex];
  if (!Number.isInteger(earlierIndex) || !Number.isInteger(laterIndex) || earlierIndex < 0 ||
    laterIndex <= earlierIndex || !earlier || !later || earlier.case_id !== later.case_id ||
    earlier.reassignment_watch_index !== later.reassignment_watch_index ||
    earlier.later_exception_index >= later.later_exception_index ||
    Date.parse(earlier.recorded_at) >= Date.parse(later.recorded_at) ||
    !safeTime(at) || Date.parse(at) < Date.parse(later.recorded_at))
    throw new Error("Build 180 requires chronological same-watch renewal with a genuinely later exception.");
  const repeated = earlier.repeated_owner_gap && later.repeated_owner_gap ||
    earlier.repeated_source_gap && later.repeated_source_gap;
  const drift = earlier.unresolved_source_drift && later.unresolved_source_drift;
  const age = Math.floor((Date.parse(at) - Date.parse(earlier.recorded_at)) / DAY);
  // Build 179's source age is only a pseudonymous private estimate, not a gateway event.
  const estimatedSourceAge = later.source_age_days === null ? null :
    later.source_age_days + Math.floor((Date.parse(at) - Date.parse(later.recorded_at)) / DAY);
  const signals: RenewalDispositionSignal[] = [];
  if (repeated) signals.push("REPEATED_OWNER_OR_SOURCE_GAP");
  if (drift) signals.push("REPEATED_SOURCE_DRIFT");
  if (estimatedSourceAge === null || estimatedSourceAge > 7)
    signals.push("SOURCE_EVIDENCE_OVERDUE_OR_MISSING");
  if (age >= 3) signals.push("EARLIER_RENEWAL_AGED");
  if (age > 7) signals.push("EARLIER_RENEWAL_OVERDUE");
  if (later.later_owner_claim || later.later_source_claim)
    signals.push("LATER_PRIVATE_CLAIMS_NOT_ORIGINAL_WITNESSES");
  signals.push("QL252_PUBLIC_PROOF_MISSING_OR_UNVERIFIED",
    "QL252_OUT_OF_BAND_CUSTODY_AND_DENIAL_WITNESS_NOT_AVAILABLE",
    "OWNER_TEST_NOT_GIVEN_PRIVATE_RUNNER_NOT_AUTHORIZED",
    "FIELD_REVIEWER_VAULT_UNCHANGED_HOLD");
  return { earlier_renewal_index: earlierIndex, later_renewal_index: laterIndex,
    case_id: earlier.case_id, reassignment_watch_index: earlier.reassignment_watch_index,
    earlier_at: earlier.recorded_at, later_at: later.recorded_at,
    earlier_exception_index: earlier.later_exception_index,
    later_exception_index: later.later_exception_index,
    repeated_owner_or_source_gap: repeated, repeated_source_drift: drift,
    later_owner_claim: later.later_owner_claim, later_source_claim: later.later_source_claim,
    source_age_days: estimatedSourceAge, earlier_renewal_age_days: age,
    age_band: age > 7 ? "OVER_SEVEN_DAYS" : age >= 3 ?
      "THREE_TO_SEVEN_DAYS" : "UNDER_THREE_DAYS", signals,
    original_source_proof: "UNVERIFIED_OR_MISSING", owner_test_decision: "NOT_GIVEN",
    connection_state: "DISCONNECTED", independent_review: "INDEPENDENT_REVIEW_HOLD",
    closure: "NOT_AUTHORIZED" };
}

export function validateRenewalDispositionNotes(prior: RenewalWatchReceipt,
  notes: readonly RenewalDispositionNote[], exportedAt?: string) {
  if (notes.length > 100) throw new Error("Build 180 private disposition limit is 100.");
  const seen = new Set<string>(); let previous = 0;
  for (const note of notes) {
    if (!note || Object.keys(note).length !== noteKeys.length ||
      Object.keys(note).some(k => !noteKeys.includes(k)) || !safeTime(note.recorded_at) ||
      !RENEWAL_DISPOSITION_CATEGORIES.includes(note.category) ||
      note.personally_rechecked !== true || note.separate_hold_acknowledged !== true ||
      note.state !== "PRIVATE_RENEWAL_DISPOSITION_NOT_SENT" ||
      note.field_acceptance !== "FIELD_ACCEPTANCE_HOLD")
      throw new Error("Unsafe Build 180 immutable disposition note.");
    const time = Date.parse(note.recorded_at);
    if (time < previous || exportedAt && time > Date.parse(exportedAt))
      throw new Error("Build 180 disposition chronology invalid.");
    const expected = compareRenewalDisposition(prior,
      note.earlier_renewal_index, note.later_renewal_index, note.recorded_at);
    if (comparisonKeys.some(k => JSON.stringify(note[k]) !== JSON.stringify(expected[k])))
      throw new Error("Build 180 immutable private disposition comparison changed.");
    if (!categoryAllowed(note.category, expected.signals))
      throw new Error("Build 180 category has no matching unresolved original gap.");
    const key = `${note.earlier_renewal_index}:${note.later_renewal_index}:${note.category}`;
    if (seen.has(key)) throw new Error("Duplicate Build 180 private disposition.");
    seen.add(key); previous = time;
  }
}

export function recordRenewalDisposition(prior: RenewalWatchReceipt,
  notes: readonly RenewalDispositionNote[], environment: TrialEnvironment,
  imported: { renewals: number; dispositions: number }, input: {
    earlier_renewal_index: number; later_renewal_index: number;
    category: RenewalDispositionCategory; personally_rechecked: boolean;
    separate_hold_acknowledged: boolean;
  }, at = new Date().toISOString()): RenewalDispositionNote[] {
  if (!environment.installed_windows_witnessed || !validateInstalledVersion(environment.installed_version) ||
    environment.access === "unknown" || input.later_renewal_index < imported.renewals ||
    notes.length < imported.dispositions || !input.personally_rechecked ||
    !input.separate_hold_acknowledged || !RENEWAL_DISPOSITION_CATEGORIES.includes(input.category))
    throw new Error("Build 180 needs a non-imported later renewal, Windows witness and two HOLD acknowledgements.");
  const comparison = compareRenewalDisposition(prior,
    input.earlier_renewal_index, input.later_renewal_index, at);
  if (!categoryAllowed(input.category, comparison.signals))
    throw new Error("Build 180 requires an unresolved original exception category.");
  const next: RenewalDispositionNote[] = [...notes, { ...comparison, recorded_at: at,
    category: input.category, personally_rechecked: true, separate_hold_acknowledged: true,
    state: "PRIVATE_RENEWAL_DISPOSITION_NOT_SENT", field_acceptance: "FIELD_ACCEPTANCE_HOLD" }];
  validateRenewalDispositionNotes(prior, next);
  return next;
}

export function createRenewalDispositionReceipt(prior: RenewalWatchReceipt,
  notes: readonly RenewalDispositionNote[], at = new Date().toISOString()): RenewalDispositionReceipt {
  if (prior.kind !== "rosevear_private_exception_renewal_watch" || !safeTime(at) ||
    Date.parse(at) < Date.parse(prior.exported_at))
    throw new Error("Build 180 requires chronological full Build 179 source receipt.");
  parseRenewalWatchReceipt(JSON.stringify(prior));
  validateRenewalDispositionNotes(prior, notes, at);
  const receipt: RenewalDispositionReceipt = {
    kind: "rosevear_private_renewal_watch_exception_disposition", schema_version: 1,
    exported_at: at, field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", owner_test_decision: "NOT_GIVEN",
    connection_state: "DISCONNECTED", closure: "NOT_AUTHORIZED",
    ql252_proof: "UNVERIFIED_OR_MISSING", private_runner: "NOT_AUTHORIZED",
    evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS", renewal_watch_receipt: prior,
    renewal_disposition_notes: notes.map(n => ({ ...n, signals: [...n.signals] })),
  };
  if (JSON.stringify(receipt).length > MAX_RENEWAL_DISPOSITION_BYTES)
    throw new Error("Build 180 receipt exceeds 9.5 MB.");
  return receipt;
}

export function parseRenewalDispositionReceipt(raw: string) {
  if (raw.length > MAX_RENEWAL_DISPOSITION_BYTES) throw new Error("Build 180 import exceeds 9.5 MB.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Invalid Build 180 JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid Build 180 receipt envelope.");
  const obj = value as Record<string, unknown>;
  if (obj.kind !== "rosevear_private_renewal_watch_exception_disposition")
    return { ...parseRenewalWatchReceipt(raw), renewal_disposition_notes: [] as RenewalDispositionNote[] };
  const fields = ["kind", "schema_version", "exported_at", "field_acceptance",
    "independent_review", "owner_test_decision", "connection_state", "closure",
    "ql252_proof", "private_runner", "evidence_authenticity",
    "renewal_watch_receipt", "renewal_disposition_notes"];
  if (Object.keys(obj).length !== fields.length || Object.keys(obj).some(k => !fields.includes(k)) ||
    obj.schema_version !== 1 || !safeTime(obj.exported_at) ||
    obj.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
    obj.independent_review !== "INDEPENDENT_REVIEW_HOLD" ||
    obj.owner_test_decision !== "NOT_GIVEN" || obj.connection_state !== "DISCONNECTED" ||
    obj.closure !== "NOT_AUTHORIZED" || obj.ql252_proof !== "UNVERIFIED_OR_MISSING" ||
    obj.private_runner !== "NOT_AUTHORIZED" ||
    obj.evidence_authenticity !== "UNVERIFIED_PRIVATE_ATTESTATIONS" ||
    !obj.renewal_watch_receipt || !Array.isArray(obj.renewal_disposition_notes))
    throw new Error("Unsafe Build 180 permanent HOLD receipt.");
  const prior = obj.renewal_watch_receipt as RenewalWatchReceipt;
  if (prior.kind !== "rosevear_private_exception_renewal_watch" ||
    Date.parse(prior.exported_at) > Date.parse(obj.exported_at as string))
    throw new Error("Build 180 nested renewal chronology invalid.");
  const nested = parseRenewalWatchReceipt(JSON.stringify(prior));
  validateRenewalDispositionNotes(prior, obj.renewal_disposition_notes as RenewalDispositionNote[],
    obj.exported_at as string);
  return { ...nested, renewal_disposition_notes: (obj.renewal_disposition_notes as RenewalDispositionNote[])
    .map(n => ({ ...n, signals: [...n.signals] })) };
}

/** Only a complete, exact historical Build 179 nested prefix can be compared. */
export function compareHistoricalRenewalDispositions(beforeRaw: string, afterRaw: string) {
  if (beforeRaw.length > 9_000_000 || afterRaw.length > 9_000_000)
    throw new Error("Build 180 historical comparison exceeds 9 MB.");
  let before: RenewalWatchReceipt; let after: RenewalWatchReceipt;
  try { before = JSON.parse(beforeRaw); after = JSON.parse(afterRaw); }
  catch { throw new Error("Invalid Build 179 historical JSON."); }
  if (before?.kind !== "rosevear_private_exception_renewal_watch" ||
    after?.kind !== "rosevear_private_exception_renewal_watch" ||
    Date.parse(before.exported_at) >= Date.parse(after.exported_at))
    throw new Error("Two chronological complete Build 179 receipts required.");
  parseRenewalWatchReceipt(beforeRaw); parseRenewalWatchReceipt(afterRaw);
  const prefix = (a: unknown, b: unknown, key = ""): boolean => {
    if (key === "exported_at") return safeTime(a) && safeTime(b) && Date.parse(a) <= Date.parse(b);
    if (Array.isArray(a)) return Array.isArray(b) && a.length <= b.length &&
      a.every((item, index) => prefix(item, b[index]));
    if (a !== null && typeof a === "object") {
      if (b === null || typeof b !== "object" || Array.isArray(b)) return false;
      const left = a as Record<string, unknown>, right = b as Record<string, unknown>;
      return Object.keys(left).length === Object.keys(right).length &&
        Object.keys(left).every(k => Object.hasOwn(right, k) && prefix(left[k], right[k], k));
    }
    return a === b;
  };
  if (!prefix(before, after) || !before.renewal_watch_notes.length ||
    before.renewal_watch_notes.length >= after.renewal_watch_notes.length)
    throw new Error("Build 179 historical renewal must be an exact nonempty append-only prefix.");
  let comparison: RenewalDispositionComparison | null = null;
  for (let later = before.renewal_watch_notes.length;
    later < after.renewal_watch_notes.length && !comparison; later++) {
    for (let earlier = before.renewal_watch_notes.length - 1; earlier >= 0; earlier--) {
      const old = after.renewal_watch_notes[earlier], next = after.renewal_watch_notes[later];
      if (old.case_id !== next.case_id ||
        old.reassignment_watch_index !== next.reassignment_watch_index ||
        old.later_exception_index >= next.later_exception_index) continue;
      comparison = compareRenewalDisposition(after, earlier, later, after.exported_at);
      break;
    }
  }
  return { previous_renewals: before.renewal_watch_notes.length,
    current_renewals: after.renewal_watch_notes.length,
    new_renewals: after.renewal_watch_notes.length - before.renewal_watch_notes.length,
    comparison };
}
