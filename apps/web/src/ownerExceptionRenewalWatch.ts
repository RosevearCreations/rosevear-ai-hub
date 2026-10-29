/** Build 179: private held exception renewal; QL-252 source provenance is NOT authentication. */
import { validateInstalledVersion, type TrialEnvironment } from "./ownerFieldTrial";
import { createTriageExceptionReceipt, parseTriageExceptionReceipt,
  type TriageExceptionNote, type TriageExceptionReceipt } from "./ownerTriageExceptionAging";

export type RenewalWatchCategory = "CONTINUE_INDEPENDENT_HOLD" |
  "REQUEST_NEW_OWNER_WITNESS" | "REQUEST_NEW_SOURCE_RECHECK" |
  "REQUEST_QL252_ORIGINAL_OPERATOR_PROOF";
export const RENEWAL_WATCH_CATEGORIES: readonly RenewalWatchCategory[] = [
  "CONTINUE_INDEPENDENT_HOLD", "REQUEST_NEW_OWNER_WITNESS",
  "REQUEST_NEW_SOURCE_RECHECK", "REQUEST_QL252_ORIGINAL_OPERATOR_PROOF",
];
export type RenewalWatchSignal = "REPEATED_OWNER_GAP" | "REPEATED_SOURCE_GAP" |
  "SOURCE_IDENTITY_DRIFT_UNRESOLVED" | "SOURCE_EVIDENCE_STALE_OR_MISSING" |
  "EARLIER_EXCEPTION_AGED" | "EARLIER_EXCEPTION_OVERDUE" |
  "LATER_PRIVATE_OWNER_CLAIM_UNVERIFIED" | "LATER_PRIVATE_SOURCE_CLAIM_UNVERIFIED" |
  "QL252_SOURCE_PROOF_MISSING_OR_UNVERIFIED" | "QL252_OPERATOR_PIN_AND_WITNESS_MISSING" |
  "PRIVATE_RUNNER_AND_OWNER_APPROVAL_NOT_GIVEN" | "FIELD_REVIEWER_VAULT_HOLDS";

export interface RenewalWatchComparison {
  earlier_exception_index: number;
  later_exception_index: number;
  case_id: TriageExceptionNote["case_id"];
  reassignment_watch_index: number;
  earlier_recorded_at: string;
  later_recorded_at: string;
  earlier_continuity_index: number;
  later_continuity_index: number;
  later_owner_claim: boolean;
  later_source_claim: boolean;
  repeated_owner_gap: boolean;
  repeated_source_gap: boolean;
  unresolved_source_drift: boolean;
  source_age_days: number | null;
  earlier_exception_age_days: number;
  age_band: "UNDER_THREE_DAYS" | "THREE_TO_SEVEN_DAYS" | "OVER_SEVEN_DAYS";
  signals: RenewalWatchSignal[];
  independent_source_provenance: "UNVERIFIED";
  ql252_proof: "NOT_PUBLISHED_OR_NOT_INDEPENDENTLY_VERIFIED";
  owner_test_decision: "NOT_GIVEN";
  private_runner: "NOT_AUTHORIZED";
  closure: "NOT_AUTHORIZED";
}
export interface RenewalWatchNote extends RenewalWatchComparison {
  recorded_at: string;
  category: RenewalWatchCategory;
  personally_rechecked: true;
  separate_hold_acknowledged: true;
  state: "PRIVATE_EXCEPTION_RENEWAL_WATCH_NOT_SENT";
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
}
export interface RenewalWatchReceipt {
  kind: "rosevear_private_exception_renewal_watch";
  schema_version: 1;
  exported_at: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
  connection_state: "DISCONNECTED";
  private_runner: "NOT_AUTHORIZED";
  owner_test_decision: "NOT_GIVEN";
  ql252_proof: "NOT_PUBLISHED_OR_NOT_INDEPENDENTLY_VERIFIED";
  evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS";
  exception_receipt: TriageExceptionReceipt;
  renewal_watch_notes: RenewalWatchNote[];
}
export const MAX_RENEWAL_WATCH_BYTES = 9_000_000;
const DAY = 86_400_000;
const comparisonFields = ["earlier_exception_index", "later_exception_index", "case_id",
  "reassignment_watch_index", "earlier_recorded_at", "later_recorded_at",
  "earlier_continuity_index", "later_continuity_index", "later_owner_claim",
  "later_source_claim", "repeated_owner_gap", "repeated_source_gap",
  "unresolved_source_drift", "source_age_days", "earlier_exception_age_days",
  "age_band", "signals", "independent_source_provenance", "ql252_proof",
  "owner_test_decision", "private_runner", "closure"] as const;
const noteFields = [...comparisonFields, "recorded_at", "category", "personally_rechecked",
  "separate_hold_acknowledged", "state", "field_acceptance"];
function safeTime(value: unknown): value is string {
  return typeof value === "string" && /^20\d\d-\d\d-\d\dT/.test(value) &&
    Number.isFinite(Date.parse(value)) && Date.parse(value) >= Date.parse("2020-01-01T00:00:00Z") &&
    Date.parse(value) <= Date.now() + 300_000;
}
function categoryAllowed(category: RenewalWatchCategory, signals: readonly RenewalWatchSignal[]) {
  return category === "CONTINUE_INDEPENDENT_HOLD" ||
    category === "REQUEST_NEW_OWNER_WITNESS" && signals.includes("REPEATED_OWNER_GAP") ||
    category === "REQUEST_NEW_SOURCE_RECHECK" && signals.some(s =>
      ["REPEATED_SOURCE_GAP", "SOURCE_IDENTITY_DRIFT_UNRESOLVED",
        "SOURCE_EVIDENCE_STALE_OR_MISSING"].includes(s)) ||
    category === "REQUEST_QL252_ORIGINAL_OPERATOR_PROOF" &&
      signals.includes("QL252_SOURCE_PROOF_MISSING_OR_UNVERIFIED");
}

/** Compare only later, same-watch PRIVATE claims; never call a timestamp an original witness. */
export function compareExceptionRenewal(prior: TriageExceptionReceipt,
  earlierIndex: number, laterIndex: number, at = new Date().toISOString()): RenewalWatchComparison {
  const earlier = prior.triage_exception_notes[earlierIndex];
  const later = prior.triage_exception_notes[laterIndex];
  if (!Number.isInteger(earlierIndex) || !Number.isInteger(laterIndex) || earlierIndex < 0 ||
    laterIndex <= earlierIndex || !earlier || !later || earlier.case_id !== later.case_id ||
    earlier.reassignment_watch_index !== later.reassignment_watch_index ||
    earlier.later_continuity_index >= later.later_continuity_index ||
    Date.parse(earlier.recorded_at) >= Date.parse(later.recorded_at) || !safeTime(at) ||
    Date.parse(at) < Date.parse(later.recorded_at))
    throw new Error("Build 179 requires chronological same-watch exceptions and a genuinely later continuity.");
  const repeatedOwner = earlier.signals.includes("POST_CONTINUITY_OWNER_MISSING") &&
    later.signals.includes("POST_CONTINUITY_OWNER_MISSING");
  const repeatedSource = earlier.signals.includes("POST_CONTINUITY_SOURCE_MISSING") &&
    later.signals.includes("POST_CONTINUITY_SOURCE_MISSING");
  const drift = earlier.source_identity_drift || later.source_identity_drift;
  const age = Math.floor((Date.parse(at) - Date.parse(earlier.recorded_at)) / DAY);
  // Source age was computed at the LATER PRIVATE note's date. It is not an external freshness check.
  const estimatedSourceAge = later.source_age_days === null ? null :
    later.source_age_days + Math.floor((Date.parse(at) - Date.parse(later.recorded_at)) / DAY);
  const signals: RenewalWatchSignal[] = [];
  if (repeatedOwner) signals.push("REPEATED_OWNER_GAP");
  if (repeatedSource) signals.push("REPEATED_SOURCE_GAP");
  if (drift) signals.push("SOURCE_IDENTITY_DRIFT_UNRESOLVED");
  if (estimatedSourceAge === null || estimatedSourceAge > 7)
    signals.push("SOURCE_EVIDENCE_STALE_OR_MISSING");
  if (age >= 3) signals.push("EARLIER_EXCEPTION_AGED");
  if (age > 7) signals.push("EARLIER_EXCEPTION_OVERDUE");
  if (later.later_owner_witness_claim) signals.push("LATER_PRIVATE_OWNER_CLAIM_UNVERIFIED");
  if (later.later_distinct_source_claim) signals.push("LATER_PRIVATE_SOURCE_CLAIM_UNVERIFIED");
  signals.push("QL252_SOURCE_PROOF_MISSING_OR_UNVERIFIED", "QL252_OPERATOR_PIN_AND_WITNESS_MISSING",
    "PRIVATE_RUNNER_AND_OWNER_APPROVAL_NOT_GIVEN", "FIELD_REVIEWER_VAULT_HOLDS");
  return {
    earlier_exception_index: earlierIndex, later_exception_index: laterIndex,
    case_id: earlier.case_id, reassignment_watch_index: earlier.reassignment_watch_index,
    earlier_recorded_at: earlier.recorded_at, later_recorded_at: later.recorded_at,
    earlier_continuity_index: earlier.later_continuity_index,
    later_continuity_index: later.later_continuity_index,
    later_owner_claim: later.later_owner_witness_claim,
    later_source_claim: later.later_distinct_source_claim,
    repeated_owner_gap: repeatedOwner, repeated_source_gap: repeatedSource,
    unresolved_source_drift: drift, source_age_days: estimatedSourceAge,
    earlier_exception_age_days: age,
    age_band: age > 7 ? "OVER_SEVEN_DAYS" : age >= 3 ?
      "THREE_TO_SEVEN_DAYS" : "UNDER_THREE_DAYS", signals,
    independent_source_provenance: "UNVERIFIED",
    ql252_proof: "NOT_PUBLISHED_OR_NOT_INDEPENDENTLY_VERIFIED",
    owner_test_decision: "NOT_GIVEN", private_runner: "NOT_AUTHORIZED",
    closure: "NOT_AUTHORIZED",
  };
}

export function validateRenewalWatchNotes(prior: TriageExceptionReceipt,
  notes: readonly RenewalWatchNote[], exportedAt?: string) {
  if (notes.length > 100) throw new Error("Build 179 limits private renewal watches to 100.");
  const seen = new Set<string>(); let previous = 0;
  for (const note of notes) {
    if (!note || Object.keys(note).length !== noteFields.length ||
      Object.keys(note).some(k => !noteFields.includes(k)) || !safeTime(note.recorded_at) ||
      !RENEWAL_WATCH_CATEGORIES.includes(note.category) ||
      note.personally_rechecked !== true || note.separate_hold_acknowledged !== true ||
      note.state !== "PRIVATE_EXCEPTION_RENEWAL_WATCH_NOT_SENT" ||
      note.field_acceptance !== "FIELD_ACCEPTANCE_HOLD")
      throw new Error("Unsafe Build 179 immutable renewal note.");
    const time = Date.parse(note.recorded_at);
    if (time < previous || exportedAt && time > Date.parse(exportedAt))
      throw new Error("Build 179 renewal watch chronology invalid.");
    const expected = compareExceptionRenewal(prior,
      note.earlier_exception_index, note.later_exception_index, note.recorded_at);
    if (comparisonFields.some(k => JSON.stringify(note[k]) !== JSON.stringify(expected[k])))
      throw new Error("Build 179 immutable renewal comparison changed.");
    if (!categoryAllowed(note.category, expected.signals))
      throw new Error("Build 179 category needs an original unresolved private gap.");
    const key = `${note.earlier_exception_index}:${note.later_exception_index}:${note.category}`;
    if (seen.has(key)) throw new Error("Duplicate Build 179 renewal watch.");
    seen.add(key); previous = time;
  }
}

export function recordRenewalWatch(prior: TriageExceptionReceipt,
  notes: readonly RenewalWatchNote[], environment: TrialEnvironment,
  imported: { exceptions: number; watches: number }, input: {
    earlier_exception_index: number; later_exception_index: number;
    category: RenewalWatchCategory; personally_rechecked: boolean;
    separate_hold_acknowledged: boolean;
  }, at = new Date().toISOString()): RenewalWatchNote[] {
  if (!environment.installed_windows_witnessed || !validateInstalledVersion(environment.installed_version) ||
    environment.access === "unknown" || input.later_exception_index < imported.exceptions ||
    notes.length < imported.watches || !input.personally_rechecked ||
    !input.separate_hold_acknowledged || !RENEWAL_WATCH_CATEGORIES.includes(input.category))
    throw new Error("Build 179 needs a non-imported later exception, Windows witness and two HOLD acknowledgements.");
  const comparison = compareExceptionRenewal(prior,
    input.earlier_exception_index, input.later_exception_index, at);
  if (!categoryAllowed(input.category, comparison.signals))
    throw new Error("Build 179 category needs unresolved source or owner evidence.");
  const next: RenewalWatchNote[] = [...notes, { ...comparison, recorded_at: at,
    category: input.category, personally_rechecked: true, separate_hold_acknowledged: true,
    state: "PRIVATE_EXCEPTION_RENEWAL_WATCH_NOT_SENT", field_acceptance: "FIELD_ACCEPTANCE_HOLD" }];
  validateRenewalWatchNotes(prior, next);
  return next;
}

export function createRenewalWatchReceipt(prior: TriageExceptionReceipt,
  notes: readonly RenewalWatchNote[], at = new Date().toISOString()): RenewalWatchReceipt {
  if (prior.kind !== "rosevear_private_triage_exception_aging_followup" || !safeTime(at) ||
    Date.parse(at) < Date.parse(prior.exported_at))
    throw new Error("Build 179 requires a chronological complete Build 178 receipt.");
  parseTriageExceptionReceipt(JSON.stringify(prior));
  validateRenewalWatchNotes(prior, notes, at);
  const receipt: RenewalWatchReceipt = {
    kind: "rosevear_private_exception_renewal_watch", schema_version: 1,
    exported_at: at, field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED",
    connection_state: "DISCONNECTED", private_runner: "NOT_AUTHORIZED",
    owner_test_decision: "NOT_GIVEN", ql252_proof: "NOT_PUBLISHED_OR_NOT_INDEPENDENTLY_VERIFIED",
    evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS", exception_receipt: prior,
    renewal_watch_notes: notes.map(n => ({ ...n, signals: [...n.signals] })),
  };
  if (JSON.stringify(receipt).length > MAX_RENEWAL_WATCH_BYTES)
    throw new Error("Build 179 private receipt exceeds 9 MB.");
  return receipt;
}

export function parseRenewalWatchReceipt(raw: string) {
  if (raw.length > MAX_RENEWAL_WATCH_BYTES) throw new Error("Build 179 import exceeds 9 MB.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Invalid Build 179 private JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid Build 179 receipt envelope.");
  const obj = value as Record<string, unknown>;
  if (obj.kind !== "rosevear_private_exception_renewal_watch")
    return { ...parseTriageExceptionReceipt(raw), renewal_watch_notes: [] as RenewalWatchNote[] };
  const fields = ["kind", "schema_version", "exported_at", "field_acceptance",
    "independent_review", "closure", "connection_state", "private_runner",
    "owner_test_decision", "ql252_proof", "evidence_authenticity",
    "exception_receipt", "renewal_watch_notes"];
  if (Object.keys(obj).length !== fields.length || Object.keys(obj).some(k => !fields.includes(k)) ||
    obj.schema_version !== 1 || !safeTime(obj.exported_at) ||
    obj.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
    obj.independent_review !== "INDEPENDENT_REVIEW_HOLD" || obj.closure !== "NOT_AUTHORIZED" ||
    obj.connection_state !== "DISCONNECTED" || obj.private_runner !== "NOT_AUTHORIZED" ||
    obj.owner_test_decision !== "NOT_GIVEN" ||
    obj.ql252_proof !== "NOT_PUBLISHED_OR_NOT_INDEPENDENTLY_VERIFIED" ||
    obj.evidence_authenticity !== "UNVERIFIED_PRIVATE_ATTESTATIONS" ||
    !obj.exception_receipt || !Array.isArray(obj.renewal_watch_notes))
    throw new Error("Unsafe Build 179 permanent HOLD receipt.");
  const prior = obj.exception_receipt as TriageExceptionReceipt;
  if (prior.kind !== "rosevear_private_triage_exception_aging_followup" ||
    Date.parse(prior.exported_at) > Date.parse(obj.exported_at as string))
    throw new Error("Build 179 nested exception chronology invalid.");
  const nested = parseTriageExceptionReceipt(JSON.stringify(prior));
  validateRenewalWatchNotes(prior, obj.renewal_watch_notes as RenewalWatchNote[],
    obj.exported_at as string);
  return { ...nested, renewal_watch_notes: (obj.renewal_watch_notes as RenewalWatchNote[])
    .map(n => ({ ...n, signals: [...n.signals] })) };
}

/** Historical Build 178 prefix must be immutable; all imported evidence remains historical. */
export function compareHistoricalRenewalWatches(beforeRaw: string, afterRaw: string) {
  if (beforeRaw.length > 8_500_000 || afterRaw.length > 8_500_000)
    throw new Error("Build 179 historical comparison exceeds 8.5 MB.");
  let before: TriageExceptionReceipt; let after: TriageExceptionReceipt;
  try { before = JSON.parse(beforeRaw); after = JSON.parse(afterRaw); }
  catch { throw new Error("Invalid Build 178 historical JSON."); }
  if (before?.kind !== "rosevear_private_triage_exception_aging_followup" ||
    after?.kind !== "rosevear_private_triage_exception_aging_followup" ||
    Date.parse(before.exported_at) >= Date.parse(after.exported_at))
    throw new Error("Chronological complete Build 178 receipts required.");
  parseTriageExceptionReceipt(beforeRaw); parseTriageExceptionReceipt(afterRaw);
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
  if (!prefix(before, after) || !before.triage_exception_notes.length ||
    before.triage_exception_notes.length >= after.triage_exception_notes.length)
    throw new Error("Build 178 source history must be an exact nonempty append-only prefix.");
  let comparison: RenewalWatchComparison | null = null;
  for (let later = before.triage_exception_notes.length;
    later < after.triage_exception_notes.length && !comparison; later++) {
    for (let earlier = before.triage_exception_notes.length - 1; earlier >= 0; earlier--) {
      const old = after.triage_exception_notes[earlier], next = after.triage_exception_notes[later];
      if (old.case_id !== next.case_id ||
        old.reassignment_watch_index !== next.reassignment_watch_index ||
        old.later_continuity_index >= next.later_continuity_index) continue;
      comparison = compareExceptionRenewal(after, earlier, later, after.exported_at);
      break;
    }
  }
  return { previous_exceptions: before.triage_exception_notes.length,
    current_exceptions: after.triage_exception_notes.length,
    new_exceptions: after.triage_exception_notes.length - before.triage_exception_notes.length,
    comparison };
}
