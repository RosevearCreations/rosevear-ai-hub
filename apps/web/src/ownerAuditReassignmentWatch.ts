/** Build 162: chronological private aging-audit reconciliation; never an owner reassignment command. */
import { validateInstalledVersion, type TrialEnvironment, type TrialObservation,
  type TrialOwner } from "./ownerFieldTrial";
import type { SourceIdentityCheck } from "./ownerFieldRouting";
import { parseHistoricalWatchAuditReceipt, type HistoricalWatchAuditNote,
  type HistoricalWatchAuditReceipt } from "./ownerHistoricalWatchAudit";

export type ReassignmentSignal = "OWNER_REASSIGNMENT_PROPOSED" |
  "OWNER_OUTCOME_CONTRADICTION" | "SOURCE_WITNESS_GAP" |
  "SOURCE_ALIAS_OR_STATE_CHANGED" | "SOURCE_IDENTITY_UNVERIFIED" |
  "INDEPENDENT_RESPONSE_AGED" | "INDEPENDENT_RESPONSE_OVERDUE" |
  "ORIGINAL_EXCEPTION_STILL_HELD";
export type ReassignmentWatchCategory = "CONTINUE_INDEPENDENT_HOLD" |
  "REQUEST_OWNER_REASSIGNMENT_WITNESS" |
  "REQUEST_SOURCE_CONTRADICTION_RECHECK" |
  "REQUEST_OVERDUE_INDEPENDENT_RESPONSE";
export type ReassignmentAgeBand = "UNDER_THREE_DAYS" | "THREE_TO_SEVEN_DAYS" | "OVER_SEVEN_DAYS";

export interface AuditRoundComparison {
  baseline_audit_index: number;
  latest_audit_index: number;
  watch_index: number;
  case_id: HistoricalWatchAuditNote["case_id"];
  baseline_observation_index: number;
  latest_observation_index: number;
  baseline_at: string;
  latest_at: string;
  original_watch_at: string;
  baseline_owner: TrialOwner;
  latest_owner: TrialOwner;
  first_audit_age_days: number;
  original_watch_age_days: number;
  age_band: ReassignmentAgeBand;
  signals: ReassignmentSignal[];
  unresolved: true;
}
export interface ReassignmentWatchNote extends AuditRoundComparison {
  recorded_at: string;
  category: ReassignmentWatchCategory;
  personally_compared: true;
  hold_acknowledged: true;
  state: "PRIVATE_REASSIGNMENT_WATCH_NOT_SENT";
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
}
export interface AuditReassignmentWatchReceipt {
  kind: "rosevear_independent_audit_reassignment_watch";
  schema_version: 1;
  exported_at: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
  automatic_dispatch: "DISABLED";
  scheduled_reassignment: "DISABLED";
  evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS";
  aging_audit_receipt: HistoricalWatchAuditReceipt;
  reassignment_watches: ReassignmentWatchNote[];
}

export const MAX_REASSIGNMENT_WATCH_BYTES = 2_900_000;
export const REASSIGNMENT_CATEGORIES: readonly ReassignmentWatchCategory[] = [
  "CONTINUE_INDEPENDENT_HOLD", "REQUEST_OWNER_REASSIGNMENT_WITNESS",
  "REQUEST_SOURCE_CONTRADICTION_RECHECK", "REQUEST_OVERDUE_INDEPENDENT_RESPONSE",
];
const DAY = 86_400_000;
const comparisonKeys = ["baseline_audit_index", "latest_audit_index", "watch_index", "case_id",
  "baseline_observation_index", "latest_observation_index", "baseline_at", "latest_at",
  "original_watch_at", "baseline_owner", "latest_owner", "first_audit_age_days",
  "original_watch_age_days", "age_band", "signals", "unresolved"] as const;
const noteKeys = [...comparisonKeys, "recorded_at", "category", "personally_compared",
  "hold_acknowledged", "state", "field_acceptance", "independent_review", "closure"];
function validTime(value: unknown): value is string {
  return typeof value === "string" && /^20\d\d-\d\d-\d\dT/.test(value) &&
    Number.isFinite(Date.parse(value)) && Date.parse(value) >= Date.parse("2020-01-01T00:00:00Z") &&
    Date.parse(value) <= Date.now() + 300_000;
}

/** Compare two audit rounds on one exact old watch; a different owner is only a private proposal. */
export function compareAuditRounds(audits: readonly HistoricalWatchAuditNote[],
  history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[],
  baselineIndex: number, latestIndex: number, at = new Date().toISOString()): AuditRoundComparison {
  const baseline = audits[baselineIndex];
  const latest = audits[latestIndex];
  if (!Number.isInteger(baselineIndex) || !Number.isInteger(latestIndex) || baselineIndex < 0 ||
    latestIndex <= baselineIndex || !baseline || !latest ||
    baseline.watch_index !== latest.watch_index || baseline.case_id !== latest.case_id ||
    !validTime(at) || !validTime(baseline.watch_recorded_at) ||
    baseline.watch_recorded_at !== latest.watch_recorded_at ||
    baseline.first_recheck_at !== latest.first_recheck_at ||
    baseline.observation_index >= latest.observation_index ||
    Date.parse(baseline.recorded_at) >= Date.parse(latest.recorded_at) ||
    Date.parse(latest.followup_observed_at) <= Date.parse(baseline.recorded_at) ||
    Date.parse(at) < Date.parse(latest.recorded_at)) {
    throw new Error("Two chronological independent aging audits of one exact historical watch and a later owner trial are required.");
  }
  const earlier = history[baseline.observation_index];
  const newer = history[latest.observation_index];
  if (!earlier || !newer || earlier.case_id !== baseline.case_id ||
    newer.case_id !== baseline.case_id || earlier.observed_at !== baseline.followup_observed_at ||
    newer.observed_at !== latest.followup_observed_at ||
    earlier.outcome !== baseline.owner_outcome || newer.outcome !== latest.owner_outcome ||
    earlier.finding !== baseline.owner_finding || newer.finding !== latest.owner_finding) {
    throw new Error("Build 162 original owner observation identity has changed.");
  }
  const oldSource = baseline.source_check_index === null ? null : checks[baseline.source_check_index];
  const newSource = latest.source_check_index === null ? null : checks[latest.source_check_index];
  if (oldSource && (oldSource.trial_index !== baseline.observation_index ||
    oldSource.case_id !== baseline.case_id) || newSource &&
    (newSource.trial_index !== latest.observation_index || newSource.case_id !== latest.case_id)) {
    throw new Error("Build 162 private source evidence no longer links to the original trial.");
  }
  const signals: ReassignmentSignal[] = [];
  if (earlier.next_owner !== newer.next_owner) signals.push("OWNER_REASSIGNMENT_PROPOSED");
  if (earlier.outcome !== newer.outcome || earlier.finding !== newer.finding) {
    signals.push("OWNER_OUTCOME_CONTRADICTION");
  }
  if (!oldSource || !newSource) signals.push("SOURCE_WITNESS_GAP");
  else if (oldSource.identity_state !== newSource.identity_state ||
    oldSource.safe_alias !== newSource.safe_alias ||
    oldSource.installed_version !== newSource.installed_version ||
    oldSource.access !== newSource.access) signals.push("SOURCE_ALIAS_OR_STATE_CHANGED");
  if (newSource && newSource.identity_state !== "confirmed_alias") signals.push("SOURCE_IDENTITY_UNVERIFIED");
  const age = Math.floor((Date.parse(at) - Date.parse(baseline.recorded_at)) / DAY);
  if (age >= 3) signals.push("INDEPENDENT_RESPONSE_AGED");
  if (age > 7) signals.push("INDEPENDENT_RESPONSE_OVERDUE");
  signals.push("ORIGINAL_EXCEPTION_STILL_HELD");
  return { baseline_audit_index: baselineIndex, latest_audit_index: latestIndex,
    watch_index: baseline.watch_index, case_id: baseline.case_id,
    baseline_observation_index: baseline.observation_index,
    latest_observation_index: latest.observation_index, baseline_at: baseline.recorded_at,
    latest_at: latest.recorded_at, original_watch_at: baseline.watch_recorded_at,
    baseline_owner: earlier.next_owner, latest_owner: newer.next_owner,
    first_audit_age_days: age,
    original_watch_age_days: Math.floor((Date.parse(at) - Date.parse(baseline.watch_recorded_at)) / DAY),
    age_band: age > 7 ? "OVER_SEVEN_DAYS" : age >= 3 ?
      "THREE_TO_SEVEN_DAYS" : "UNDER_THREE_DAYS", signals, unresolved: true };
}

export function validateReassignmentWatches(notes: readonly ReassignmentWatchNote[],
  audits: readonly HistoricalWatchAuditNote[], history: readonly TrialObservation[],
  checks: readonly SourceIdentityCheck[], exportedAt?: string): void {
  if (notes.length > 100) throw new Error("Build 162 supports at most 100 private reassignment watch notes.");
  let previous = 0;
  const seen = new Set<string>();
  for (const note of notes) {
    if (!note || Object.keys(note).length !== noteKeys.length ||
      Object.keys(note).some(key => !noteKeys.includes(key)) || !validTime(note.recorded_at) ||
      !REASSIGNMENT_CATEGORIES.includes(note.category) || note.personally_compared !== true ||
      note.hold_acknowledged !== true || note.state !== "PRIVATE_REASSIGNMENT_WATCH_NOT_SENT" ||
      note.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
      note.independent_review !== "INDEPENDENT_REVIEW_HOLD" || note.closure !== "NOT_AUTHORIZED") {
      throw new Error("Unsafe Build 162 immutable private reassignment HOLD fields.");
    }
    const at = Date.parse(note.recorded_at);
    if (at < previous || exportedAt && at > Date.parse(exportedAt)) {
      throw new Error("Build 162 reassignment watch chronology is invalid.");
    }
    const expected = compareAuditRounds(audits, history, checks,
      note.baseline_audit_index, note.latest_audit_index, note.recorded_at);
    if (comparisonKeys.some(key => JSON.stringify(note[key]) !== JSON.stringify(expected[key]))) {
      throw new Error("Build 162 changed immutable owner, source, original watch or computed age.");
    }
    if (note.category === "REQUEST_OWNER_REASSIGNMENT_WITNESS" &&
      !expected.signals.includes("OWNER_REASSIGNMENT_PROPOSED") ||
      note.category === "REQUEST_SOURCE_CONTRADICTION_RECHECK" &&
      !expected.signals.some(signal => signal === "SOURCE_WITNESS_GAP" ||
        signal === "SOURCE_ALIAS_OR_STATE_CHANGED" || signal === "SOURCE_IDENTITY_UNVERIFIED") ||
      note.category === "REQUEST_OVERDUE_INDEPENDENT_RESPONSE" &&
      !expected.signals.includes("INDEPENDENT_RESPONSE_OVERDUE")) {
      throw new Error("Build 162 reassignment category lacks a matching unresolved signal.");
    }
    const key = `${note.baseline_audit_index}:${note.latest_audit_index}:${note.category}`;
    if (seen.has(key)) throw new Error("Duplicate Build 162 private reassignment watch.");
    seen.add(key); previous = at;
  }
}

export function recordReassignmentWatch(audits: readonly HistoricalWatchAuditNote[],
  history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[],
  existing: readonly ReassignmentWatchNote[], environment: TrialEnvironment,
  imported: { audits: number; watches: number },
  input: { baseline_audit_index: number; latest_audit_index: number;
    category: ReassignmentWatchCategory; personally_compared: boolean; hold_acknowledged: boolean },
  at = new Date().toISOString()): ReassignmentWatchNote[] {
  if (!environment.installed_windows_witnessed || !validateInstalledVersion(environment.installed_version) ||
    environment.access === "unknown" || input.latest_audit_index < imported.audits ||
    existing.length < imported.watches || !input.personally_compared || !input.hold_acknowledged ||
    !REASSIGNMENT_CATEGORIES.includes(input.category)) {
    throw new Error("Fresh non-imported independent audit, installed Windows witnessing and two HOLD confirmations are required.");
  }
  const comparison = compareAuditRounds(audits, history, checks,
    input.baseline_audit_index, input.latest_audit_index, at);
  const notes: ReassignmentWatchNote[] = [...existing, { ...comparison,
    recorded_at: at, category: input.category, personally_compared: true,
    hold_acknowledged: true, state: "PRIVATE_REASSIGNMENT_WATCH_NOT_SENT",
    field_acceptance: "FIELD_ACCEPTANCE_HOLD", independent_review: "INDEPENDENT_REVIEW_HOLD",
    closure: "NOT_AUTHORIZED" }];
  validateReassignmentWatches(notes, audits, history, checks);
  return notes;
}

export function createAuditReassignmentWatchReceipt(prior: HistoricalWatchAuditReceipt,
  watches: readonly ReassignmentWatchNote[], at = new Date().toISOString()): AuditReassignmentWatchReceipt {
  if (prior.kind !== "rosevear_historical_watch_outcome_audit" || !validTime(at) ||
    Date.parse(at) < Date.parse(prior.exported_at)) {
    throw new Error("Build 162 requires a complete chronological Build 161 receipt.");
  }
  const nested = parseHistoricalWatchAuditReceipt(JSON.stringify(prior));
  validateReassignmentWatches(watches, nested.watch_followup_audits, nested.trial.observations,
    nested.checks, at);
  const receipt: AuditReassignmentWatchReceipt = {
    kind: "rosevear_independent_audit_reassignment_watch", schema_version: 1,
    exported_at: at, field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED",
    automatic_dispatch: "DISABLED", scheduled_reassignment: "DISABLED",
    evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS", aging_audit_receipt: prior,
    reassignment_watches: watches.map(item => ({ ...item, signals: [...item.signals] })) };
  if (JSON.stringify(receipt).length > MAX_REASSIGNMENT_WATCH_BYTES) {
    throw new Error("Build 162 private receipt exceeds 2.9 MB.");
  }
  return receipt;
}

/** Imports from Builds 148–161 remain historical only: never automatic reassignment or field acceptance. */
export function parseAuditReassignmentWatchReceipt(raw: string): ReturnType<typeof parseHistoricalWatchAuditReceipt> &
  { reassignment_watches: ReassignmentWatchNote[] } {
  if (raw.length > MAX_REASSIGNMENT_WATCH_BYTES) throw new Error("Build 162 receipt exceeds 2.9 MB.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Invalid private Build 162 JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid Build 162 envelope.");
  const receipt = value as Record<string, unknown>;
  if (receipt.kind !== "rosevear_independent_audit_reassignment_watch") {
    return { ...parseHistoricalWatchAuditReceipt(raw), reassignment_watches: [] };
  }
  const keys = ["kind", "schema_version", "exported_at", "field_acceptance", "independent_review",
    "closure", "automatic_dispatch", "scheduled_reassignment", "evidence_authenticity",
    "aging_audit_receipt", "reassignment_watches"];
  if (Object.keys(receipt).length !== keys.length || Object.keys(receipt).some(key => !keys.includes(key)) ||
    receipt.schema_version !== 1 || !validTime(receipt.exported_at) ||
    receipt.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
    receipt.independent_review !== "INDEPENDENT_REVIEW_HOLD" ||
    receipt.closure !== "NOT_AUTHORIZED" || receipt.automatic_dispatch !== "DISABLED" ||
    receipt.scheduled_reassignment !== "DISABLED" ||
    receipt.evidence_authenticity !== "UNVERIFIED_PRIVATE_ATTESTATIONS" ||
    !receipt.aging_audit_receipt || !Array.isArray(receipt.reassignment_watches)) {
    throw new Error("Unsafe Build 162 private HOLD receipt.");
  }
  const prior = receipt.aging_audit_receipt as HistoricalWatchAuditReceipt;
  if (prior.kind !== "rosevear_historical_watch_outcome_audit" ||
    Date.parse(prior.exported_at) > Date.parse(receipt.exported_at as string)) {
    throw new Error("Build 162 nested historical audit chronology is invalid.");
  }
  const nested = parseHistoricalWatchAuditReceipt(JSON.stringify(prior));
  const watches = receipt.reassignment_watches as ReassignmentWatchNote[];
  validateReassignmentWatches(watches, nested.watch_followup_audits,
    nested.trial.observations, nested.checks, receipt.exported_at as string);
  return { ...nested, reassignment_watches: watches.map(item => ({ ...item, signals: [...item.signals] })) };
}

/** Exact immutable Build 161 prefix comparison; neither file is imported or source-authenticated. */
export function comparePrivateAgingAuditReceipts(previousRaw: string, currentRaw: string): {
  previous_audits: number; current_audits: number; new_audits: number;
  comparison: AuditRoundComparison | null;
} {
  if (previousRaw.length > 2_500_000 || currentRaw.length > 2_500_000) {
    throw new Error("Build 161 historical audit files exceed the 2.5 MB bound.");
  }
  const olderEnvelope = JSON.parse(previousRaw) as HistoricalWatchAuditReceipt;
  const newerEnvelope = JSON.parse(currentRaw) as HistoricalWatchAuditReceipt;
  if (olderEnvelope.kind !== "rosevear_historical_watch_outcome_audit" ||
    newerEnvelope.kind !== "rosevear_historical_watch_outcome_audit" ||
    Date.parse(olderEnvelope.exported_at) >= Date.parse(newerEnvelope.exported_at)) {
    throw new Error("Two chronological complete Build 161 private audit receipts are required.");
  }
  const older = parseHistoricalWatchAuditReceipt(previousRaw);
  const newer = parseHistoricalWatchAuditReceipt(currentRaw);
  const prefix = (before: readonly unknown[], after: readonly unknown[]) =>
    before.length <= after.length && before.every((item, index) =>
      JSON.stringify(item) === JSON.stringify(after[index]));
  const streams = ["handoffs", "events", "checks", "links", "reassessments", "followups",
    "decisions", "resolutions", "overdue_handoffs", "followup_reviews", "outcome_reviews",
    "recurrence_rechecks", "exception_watches", "watch_followup_audits"] as const;
  if (!prefix(older.trial.observations, newer.trial.observations) ||
    !prefix(older.trial.source_readings, newer.trial.source_readings) ||
    streams.some(stream => !prefix(older[stream], newer[stream])) ||
    older.trial.environment.installed_version !== newer.trial.environment.installed_version ||
    older.trial.environment.access !== newer.trial.environment.access ||
    older.watch_followup_audits.length === 0 ||
    older.watch_followup_audits.length >= newer.watch_followup_audits.length) {
    throw new Error("Build 161 private audit must be an exact nonempty append-only prefix with newer audits; neither receipt proves a witness.");
  }
  let comparison: AuditRoundComparison | null = null;
  for (let latestIndex = older.watch_followup_audits.length;
    latestIndex < newer.watch_followup_audits.length && !comparison; latestIndex++) {
    for (let previous = older.watch_followup_audits.length - 1; previous >= 0; previous--) {
      const baseline = newer.watch_followup_audits[previous];
      const latest = newer.watch_followup_audits[latestIndex];
      if (baseline.watch_index !== latest.watch_index ||
        Date.parse(latest.followup_observed_at) <= Date.parse(baseline.recorded_at)) continue;
      comparison = compareAuditRounds(newer.watch_followup_audits, newer.trial.observations,
        newer.checks, previous, latestIndex, newerEnvelope.exported_at);
      break;
    }
  }
  return { previous_audits: older.watch_followup_audits.length,
    current_audits: newer.watch_followup_audits.length,
    new_audits: newer.watch_followup_audits.length - older.watch_followup_audits.length,
    comparison };
}
