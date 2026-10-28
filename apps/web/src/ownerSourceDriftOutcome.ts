/** Build 171: private same-watch source drift outcome aging, never a device authorization. */
import { validateInstalledVersion, type TrialEnvironment } from "./ownerFieldTrial";
import { parseRenewalReceipt, type RenewalNote, type RenewalReceipt } from "./ownerEvidenceRenewalRecheck";

export type DriftOutcomeCategory = "CONTINUE_INDEPENDENT_HOLD" |
  "REQUEST_OWNER_CONTINUITY_WITNESS" | "REQUEST_SOURCE_DRIFT_REVIEW" |
  "REQUEST_OVERDUE_SOURCE_REFRESH";
export const DRIFT_OUTCOME_CATEGORIES: readonly DriftOutcomeCategory[] = [
  "CONTINUE_INDEPENDENT_HOLD", "REQUEST_OWNER_CONTINUITY_WITNESS",
  "REQUEST_SOURCE_DRIFT_REVIEW", "REQUEST_OVERDUE_SOURCE_REFRESH",
];
export type DriftOutcomeSignal = "SOURCE_DRIFT_UNRESOLVED" | "SOURCE_RENEWAL_STILL_UNVERIFIED" |
  "SOURCE_AGE_REPEATED_OVERDUE" | "SOURCE_EVIDENCE_OVERDUE" |
  "OWNER_WITNESS_GAP" | "OWNER_CLAIM_CHANGED" |
  "EARLIER_DRIFT_OUTCOME_AGED" | "EARLIER_DRIFT_OUTCOME_OVERDUE" |
  "INDEPENDENT_HOLD_CONTINUES";
export interface DriftOutcomeComparison {
  baseline_recheck_index: number;
  latest_recheck_index: number;
  case_id: RenewalNote["case_id"];
  reassignment_watch_index: number;
  baseline_at: string;
  latest_at: string;
  baseline_followup_index: number;
  latest_followup_index: number;
  baseline_source_check_index: number | null;
  latest_source_check_index: number | null;
  owner_witness_continuity: boolean;
  source_renewed_after_prior_recheck: boolean;
  identity_or_access_drift_continues: boolean;
  prior_source_age_days: number | null;
  latest_source_age_days: number | null;
  earlier_recheck_age_days: number;
  age_band: "UNDER_THREE_DAYS" | "THREE_TO_SEVEN_DAYS" | "OVER_SEVEN_DAYS";
  signals: DriftOutcomeSignal[];
  unresolved: true;
}
export interface DriftOutcomeNote extends DriftOutcomeComparison {
  recorded_at: string;
  category: DriftOutcomeCategory;
  personally_compared: true;
  permanent_hold_acknowledged: true;
  state: "PRIVATE_DRIFT_OUTCOME_AGING_NOT_SENT";
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
}
export interface DriftOutcomeReceipt {
  kind: "rosevear_independent_source_drift_outcome_aging";
  schema_version: 1;
  exported_at: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
  automatic_dispatch: "DISABLED";
  evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS";
  renewal_receipt: RenewalReceipt;
  drift_outcomes: DriftOutcomeNote[];
}
export const MAX_DRIFT_OUTCOME_BYTES = 6_250_000;
const DAY = 86_400_000;
const compareKeys = ["baseline_recheck_index", "latest_recheck_index", "case_id",
  "reassignment_watch_index", "baseline_at", "latest_at", "baseline_followup_index",
  "latest_followup_index", "baseline_source_check_index", "latest_source_check_index",
  "owner_witness_continuity", "source_renewed_after_prior_recheck",
  "identity_or_access_drift_continues", "prior_source_age_days", "latest_source_age_days",
  "earlier_recheck_age_days", "age_band", "signals", "unresolved"] as const;
const noteKeys = [...compareKeys, "recorded_at", "category", "personally_compared",
  "permanent_hold_acknowledged", "state", "field_acceptance", "independent_review", "closure"];
function safeTime(value: unknown): value is string {
  return typeof value === "string" && /^20\d\d-\d\d-\d\dT/.test(value) &&
    Number.isFinite(Date.parse(value)) && Date.parse(value) >= Date.parse("2020-01-01T00:00:00Z") &&
    Date.parse(value) <= Date.now() + 300_000;
}

export function compareDriftOutcomes(prior: RenewalReceipt, baselineIndex: number,
  latestIndex: number, at = new Date().toISOString()): DriftOutcomeComparison {
  const notes = prior.renewal_rechecks;
  const baseline = notes[baselineIndex]; const latest = notes[latestIndex];
  if (!Number.isInteger(baselineIndex) || !Number.isInteger(latestIndex) ||
    baselineIndex < 0 || latestIndex <= baselineIndex || !baseline || !latest ||
    baseline.case_id !== latest.case_id ||
    baseline.reassignment_watch_index !== latest.reassignment_watch_index ||
    baseline.latest_followup_index > latest.latest_followup_index ||
    Date.parse(baseline.recorded_at) >= Date.parse(latest.recorded_at) ||
    !safeTime(at) || Date.parse(at) < Date.parse(latest.recorded_at))
    throw new Error("Two chronological Build 170 rechecks for the same held watch without follow-up regression are required.");
  const nested = parseRenewalReceipt(JSON.stringify(prior));
  const checks = nested.checks;
  const oldCheck = baseline.latest_source_check_index === null ? null :
    checks[baseline.latest_source_check_index];
  const newCheck = latest.latest_source_check_index === null ? null :
    checks[latest.latest_source_check_index];
  const audits = nested.aging_audits;
  const newestOwnerIndex = audits[nested.aging_followups[latest.latest_followup_index]
    ?.latest_audit_index]?.latest_observation_index;
  const ownerObservation = newestOwnerIndex === undefined ? null : nested.trial.observations[newestOwnerIndex];
  const ownerContinuity = !!ownerObservation && ownerObservation.case_id === latest.case_id &&
    ownerObservation.witnessed_by_operator &&
    Date.parse(ownerObservation.observed_at) > Date.parse(baseline.recorded_at);
  const sourceRenewed = !!newCheck &&
    latest.latest_source_check_index !== baseline.latest_source_check_index &&
    Date.parse(newCheck.captured_at) > Date.parse(baseline.recorded_at) &&
    (!oldCheck || Date.parse(newCheck.captured_at) > Date.parse(oldCheck.captured_at));
  const identityDrift = baseline.source_identity_drift_claim ||
    baseline.source_version_access_drift_claim || latest.source_identity_drift_claim ||
    latest.source_version_access_drift_claim || !!oldCheck && !!newCheck &&
    (oldCheck.safe_alias !== newCheck.safe_alias || oldCheck.identity_state !== newCheck.identity_state ||
      oldCheck.installed_version !== newCheck.installed_version || oldCheck.access !== newCheck.access);
  const priorAge = oldCheck ? Math.floor((Date.parse(at) - Date.parse(oldCheck.captured_at)) / DAY) : null;
  const latestAge = newCheck ? Math.floor((Date.parse(at) - Date.parse(newCheck.captured_at)) / DAY) : null;
  const age = Math.floor((Date.parse(at) - Date.parse(baseline.recorded_at)) / DAY);
  const signals: DriftOutcomeSignal[] = [];
  if (identityDrift) signals.push("SOURCE_DRIFT_UNRESOLVED");
  if (!sourceRenewed) signals.push("SOURCE_RENEWAL_STILL_UNVERIFIED");
  if (latestAge === null || latestAge > 7) signals.push("SOURCE_EVIDENCE_OVERDUE");
  if ((priorAge === null || priorAge > 7) && (latestAge === null || latestAge > 7))
    signals.push("SOURCE_AGE_REPEATED_OVERDUE");
  if (!ownerContinuity) signals.push("OWNER_WITNESS_GAP");
  if (baseline.latest_owner_claim !== latest.latest_owner_claim ||
    baseline.latest_owner_outcome !== latest.latest_owner_outcome) signals.push("OWNER_CLAIM_CHANGED");
  if (age >= 3) signals.push("EARLIER_DRIFT_OUTCOME_AGED");
  if (age > 7) signals.push("EARLIER_DRIFT_OUTCOME_OVERDUE");
  signals.push("INDEPENDENT_HOLD_CONTINUES");
  return { baseline_recheck_index: baselineIndex, latest_recheck_index: latestIndex,
    case_id: baseline.case_id, reassignment_watch_index: baseline.reassignment_watch_index,
    baseline_at: baseline.recorded_at, latest_at: latest.recorded_at,
    baseline_followup_index: baseline.latest_followup_index,
    latest_followup_index: latest.latest_followup_index,
    baseline_source_check_index: baseline.latest_source_check_index,
    latest_source_check_index: latest.latest_source_check_index,
    owner_witness_continuity: ownerContinuity, source_renewed_after_prior_recheck: sourceRenewed,
    identity_or_access_drift_continues: identityDrift, prior_source_age_days: priorAge,
    latest_source_age_days: latestAge, earlier_recheck_age_days: age,
    age_band: age > 7 ? "OVER_SEVEN_DAYS" : age >= 3 ? "THREE_TO_SEVEN_DAYS" : "UNDER_THREE_DAYS",
    signals, unresolved: true };
}

export function validateDriftOutcomeNotes(prior: RenewalReceipt, notes: readonly DriftOutcomeNote[],
  exportedAt?: string): void {
  if (notes.length > 100) throw new Error("Build 171 permits at most 100 private outcome notes.");
  let earlier = 0; const seen = new Set<string>();
  for (const note of notes) {
    if (!note || Object.keys(note).length !== noteKeys.length ||
      Object.keys(note).some(key => !noteKeys.includes(key)) || !safeTime(note.recorded_at) ||
      !DRIFT_OUTCOME_CATEGORIES.includes(note.category) || note.personally_compared !== true ||
      note.permanent_hold_acknowledged !== true ||
      note.state !== "PRIVATE_DRIFT_OUTCOME_AGING_NOT_SENT" ||
      note.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
      note.independent_review !== "INDEPENDENT_REVIEW_HOLD" || note.closure !== "NOT_AUTHORIZED")
      throw new Error("Unsafe Build 171 immutable HOLD fields.");
    const when = Date.parse(note.recorded_at);
    if (when < earlier || exportedAt && when > Date.parse(exportedAt))
      throw new Error("Build 171 outcome chronology invalid.");
    const expected = compareDriftOutcomes(prior, note.baseline_recheck_index,
      note.latest_recheck_index, note.recorded_at);
    if (compareKeys.some(key => JSON.stringify(note[key]) !== JSON.stringify(expected[key])))
      throw new Error("Build 171 altered immutable private continuity evidence.");
    if (note.category === "REQUEST_OWNER_CONTINUITY_WITNESS" &&
      !expected.signals.some(signal => signal === "OWNER_WITNESS_GAP" || signal === "OWNER_CLAIM_CHANGED") ||
      note.category === "REQUEST_SOURCE_DRIFT_REVIEW" &&
      !expected.signals.includes("SOURCE_DRIFT_UNRESOLVED") ||
      note.category === "REQUEST_OVERDUE_SOURCE_REFRESH" &&
      !expected.signals.includes("SOURCE_EVIDENCE_OVERDUE"))
      throw new Error("Build 171 category requires an unresolved matching source signal.");
    const identity = `${note.baseline_recheck_index}:${note.latest_recheck_index}:${note.category}`;
    if (seen.has(identity)) throw new Error("Duplicate Build 171 private review.");
    seen.add(identity); earlier = when;
  }
}

export function recordDriftOutcome(prior: RenewalReceipt, existing: readonly DriftOutcomeNote[],
  environment: TrialEnvironment, imported: { rechecks: number; outcomes: number },
  input: { baseline_recheck_index: number; latest_recheck_index: number;
    category: DriftOutcomeCategory; personally_compared: boolean; permanent_hold_acknowledged: boolean },
  at = new Date().toISOString()): DriftOutcomeNote[] {
  if (!environment.installed_windows_witnessed || !validateInstalledVersion(environment.installed_version) ||
    environment.access === "unknown" || input.latest_recheck_index < imported.rechecks ||
    existing.length < imported.outcomes || !input.personally_compared ||
    !input.permanent_hold_acknowledged || !DRIFT_OUTCOME_CATEGORIES.includes(input.category))
    throw new Error("Build 171 needs a non-imported later recheck, witnessed Windows and two HOLD confirmations.");
  const comparison = compareDriftOutcomes(prior, input.baseline_recheck_index,
    input.latest_recheck_index, at);
  const updated: DriftOutcomeNote[] = [...existing, { ...comparison, recorded_at: at,
    category: input.category, personally_compared: true, permanent_hold_acknowledged: true,
    state: "PRIVATE_DRIFT_OUTCOME_AGING_NOT_SENT", field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED" }];
  validateDriftOutcomeNotes(prior, updated);
  return updated;
}

export function createDriftOutcomeReceipt(prior: RenewalReceipt,
  notes: readonly DriftOutcomeNote[], at = new Date().toISOString()): DriftOutcomeReceipt {
  if (prior.kind !== "rosevear_independent_evidence_renewal_drift_recheck" ||
    !safeTime(at) || Date.parse(at) < Date.parse(prior.exported_at))
    throw new Error("Build 171 requires a complete chronological Build 170 receipt.");
  parseRenewalReceipt(JSON.stringify(prior));
  validateDriftOutcomeNotes(prior, notes, at);
  const receipt: DriftOutcomeReceipt = { kind: "rosevear_independent_source_drift_outcome_aging",
    schema_version: 1, exported_at: at, field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED",
    automatic_dispatch: "DISABLED", evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS",
    renewal_receipt: prior, drift_outcomes: notes.map(note => ({ ...note, signals: [...note.signals] })) };
  if (JSON.stringify(receipt).length > MAX_DRIFT_OUTCOME_BYTES)
    throw new Error("Build 171 private chain exceeds 6.25 MB.");
  return receipt;
}

/** Legacy nested imports and current imports are all historical, never fresh witnesses. */
export function parseDriftOutcomeReceipt(raw: string) {
  if (raw.length > MAX_DRIFT_OUTCOME_BYTES) throw new Error("Build 171 import exceeds 6.25 MB.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Invalid Build 171 private JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid Build 171 receipt.");
  const obj = value as Record<string, unknown>;
  if (obj.kind !== "rosevear_independent_source_drift_outcome_aging")
    return { ...parseRenewalReceipt(raw), drift_outcomes: [] as DriftOutcomeNote[] };
  const keys = ["kind", "schema_version", "exported_at", "field_acceptance",
    "independent_review", "closure", "automatic_dispatch", "evidence_authenticity",
    "renewal_receipt", "drift_outcomes"];
  if (Object.keys(obj).length !== keys.length || Object.keys(obj).some(key => !keys.includes(key)) ||
    obj.schema_version !== 1 || !safeTime(obj.exported_at) ||
    obj.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
    obj.independent_review !== "INDEPENDENT_REVIEW_HOLD" || obj.closure !== "NOT_AUTHORIZED" ||
    obj.automatic_dispatch !== "DISABLED" ||
    obj.evidence_authenticity !== "UNVERIFIED_PRIVATE_ATTESTATIONS" ||
    !obj.renewal_receipt || !Array.isArray(obj.drift_outcomes))
    throw new Error("Unsafe Build 171 permanent HOLD receipt.");
  const prior = obj.renewal_receipt as RenewalReceipt;
  if (prior.kind !== "rosevear_independent_evidence_renewal_drift_recheck" ||
    Date.parse(prior.exported_at) > Date.parse(obj.exported_at as string))
    throw new Error("Build 171 nested chronology invalid.");
  const nested = parseRenewalReceipt(JSON.stringify(prior));
  validateDriftOutcomeNotes(prior, obj.drift_outcomes as DriftOutcomeNote[], obj.exported_at as string);
  return { ...nested, drift_outcomes: (obj.drift_outcomes as DriftOutcomeNote[])
    .map(note => ({ ...note, signals: [...note.signals] })) };
}

/** Complete Build 170 receipts must remain exact historical prefixes, not partial snippets. */
export function comparePrivateRenewalReceipts(beforeRaw: string, afterRaw: string) {
  if (beforeRaw.length > 5_850_000 || afterRaw.length > 5_850_000)
    throw new Error("Build 170 comparison exceeds 5.85 MB.");
  let before: RenewalReceipt; let after: RenewalReceipt;
  try { before = JSON.parse(beforeRaw) as RenewalReceipt;
    after = JSON.parse(afterRaw) as RenewalReceipt; }
  catch { throw new Error("Invalid Build 170 receipt JSON."); }
  if (before?.kind !== "rosevear_independent_evidence_renewal_drift_recheck" ||
    after?.kind !== "rosevear_independent_evidence_renewal_drift_recheck" ||
    Date.parse(before.exported_at) >= Date.parse(after.exported_at))
    throw new Error("Two chronological complete Build 170 receipts are required.");
  const earlier = parseRenewalReceipt(beforeRaw);
  const later = parseRenewalReceipt(afterRaw);
  const prefix = (a: unknown, b: unknown, key = ""): boolean => {
    if (key === "exported_at") return safeTime(a) && safeTime(b) &&
      Date.parse(a) <= Date.parse(b);
    if (Array.isArray(a)) return Array.isArray(b) && a.length <= b.length &&
      a.every((item, index) => prefix(item, b[index]));
    if (a !== null && typeof a === "object") {
      if (b === null || typeof b !== "object" || Array.isArray(b)) return false;
      const left = a as Record<string, unknown>; const right = b as Record<string, unknown>;
      return Object.keys(left).length === Object.keys(right).length &&
        Object.keys(left).every(name => Object.hasOwn(right, name) &&
          prefix(left[name], right[name], name));
    }
    return a === b;
  };
  if (!prefix(before, after) ||
    !earlier.renewal_rechecks.length ||
    earlier.renewal_rechecks.length >= later.renewal_rechecks.length)
    throw new Error("Build 170 complete nested evidence must remain an exact historical prefix with later rechecks.");
  let comparison: DriftOutcomeComparison | null = null;
  for (let late = earlier.renewal_rechecks.length; late < later.renewal_rechecks.length && !comparison; late++) {
    for (let early = earlier.renewal_rechecks.length - 1; early >= 0; early--) {
      if (later.renewal_rechecks[early].case_id !== later.renewal_rechecks[late].case_id ||
        later.renewal_rechecks[early].reassignment_watch_index !==
        later.renewal_rechecks[late].reassignment_watch_index) continue;
      comparison = compareDriftOutcomes(after, early, late, after.exported_at); break;
    }
  }
  return { previous_rechecks: earlier.renewal_rechecks.length,
    current_rechecks: later.renewal_rechecks.length,
    new_rechecks: later.renewal_rechecks.length - earlier.renewal_rechecks.length, comparison };
}
