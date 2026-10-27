/** Build 161: point-in-time follow-up of private Build 160 HOLD watches. No reviewer authority. */
import { validateInstalledVersion, type TrialEnvironment, type TrialObservation } from "./ownerFieldTrial";
import type { SourceIdentityCheck } from "./ownerFieldRouting";
import { parseRecheckDecisionWatchReceipt, type ExceptionWatchNote,
  type RecheckDecisionWatchReceipt } from "./ownerRecheckDecisionWatch";

export type WatchAuditSignal = "OWNER_OUTCOME_CHANGED" | "OWNER_IMPROVEMENT_UNVERIFIED" |
  "OWNER_ISSUE_STILL_OPEN" | "SOURCE_IDENTITY_CONTRADICTION" |
  "SOURCE_IDENTITY_UNVERIFIED" | "FRESH_SOURCE_WITNESS_MISSING" |
  "INDEPENDENT_WATCH_AGED" | "INDEPENDENT_WATCH_OVERDUE" |
  "HISTORICAL_EXCEPTION_UNRESOLVED";
export type WatchAuditCategory = "CONTINUE_HISTORICAL_REVIEW_HOLD" |
  "REQUEST_OWNER_OUTCOME_RECHECK" | "REQUEST_SOURCE_IDENTITY_RECHECK";
export type WatchAgeBand = "UNDER_THREE_DAYS" | "THREE_TO_SEVEN_DAYS" | "OVER_SEVEN_DAYS";
export interface HistoricalWatchComparison {
  watch_index: number;
  observation_index: number;
  source_check_index: number | null;
  baseline_source_check_index: number | null;
  case_id: ExceptionWatchNote["case_id"];
  watch_recorded_at: string;
  first_recheck_at: string;
  followup_observed_at: string;
  watch_age_days: number;
  original_exception_age_days: number;
  watch_age_band: WatchAgeBand;
  owner_outcome: TrialObservation["outcome"];
  owner_finding: TrialObservation["finding"];
  signals: WatchAuditSignal[];
  outstanding: true;
}
export interface HistoricalWatchAuditNote extends HistoricalWatchComparison {
  recorded_at: string;
  category: WatchAuditCategory;
  personally_witnessed: true;
  hold_acknowledged: true;
  state: "PRIVATE_WATCH_FOLLOWUP_NOT_SENT";
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
}
export interface HistoricalWatchAuditReceipt {
  kind: "rosevear_historical_watch_outcome_audit";
  schema_version: 1;
  exported_at: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
  automatic_dispatch: "DISABLED";
  scheduled_followup: "DISABLED";
  evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS";
  watch_receipt: RecheckDecisionWatchReceipt;
  watch_followup_audits: HistoricalWatchAuditNote[];
}

export const MAX_WATCH_AUDIT_BYTES = 2_500_000;
export const WATCH_AUDIT_CATEGORIES: readonly WatchAuditCategory[] = [
  "CONTINUE_HISTORICAL_REVIEW_HOLD", "REQUEST_OWNER_OUTCOME_RECHECK",
  "REQUEST_SOURCE_IDENTITY_RECHECK",
];
const DAY = 86_400_000;
const comparisonKeys = ["watch_index", "observation_index", "source_check_index",
  "baseline_source_check_index", "case_id", "watch_recorded_at", "first_recheck_at",
  "followup_observed_at", "watch_age_days", "original_exception_age_days",
  "watch_age_band", "owner_outcome", "owner_finding", "signals", "outstanding"] as const;
const noteKeys = [...comparisonKeys, "recorded_at", "category", "personally_witnessed",
  "hold_acknowledged", "state", "field_acceptance", "independent_review", "closure"];
function validTime(value: unknown): value is string {
  return typeof value === "string" && /^20\d\d-\d\d-\d\dT/.test(value) &&
    Number.isFinite(Date.parse(value)) && Date.parse(value) >= Date.parse("2020-01-01T00:00:00Z") &&
    Date.parse(value) <= Date.now() + 300_000;
}

/** Audit historical owner claims; even a later pass or identical alias leaves the watch unresolved. */
export function compareHistoricalWatchFollowup(watches: readonly ExceptionWatchNote[],
  history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[], watchIndex: number,
  observationIndex: number, sourceCheckIndex: number | null,
  at = new Date().toISOString()): HistoricalWatchComparison {
  const watch = watches[watchIndex];
  const observation = history[observationIndex];
  if (!Number.isInteger(watchIndex) || !Number.isInteger(observationIndex) ||
    watchIndex < 0 || observationIndex < 0 || !watch || !observation ||
    observation.case_id !== watch.case_id || !validTime(at) ||
    Date.parse(observation.observed_at) <= Date.parse(watch.recorded_at) ||
    Date.parse(at) < Date.parse(observation.observed_at) ||
    Date.parse(at) < Date.parse(watch.recorded_at) ||
    !Number.isInteger(watch.baseline_recheck_index) || !validTime(watch.baseline_at) ||
    Date.parse(watch.baseline_at) > Date.parse(watch.recorded_at)) {
    throw new Error("Select a later owner observation of the exact historical watch case; every watch stays on HOLD.");
  }
  const priorObs = history.slice(0, observationIndex).filter(item =>
    item.case_id === watch.case_id && Date.parse(item.observed_at) <= Date.parse(watch.recorded_at)).at(-1);
  // Take only source claims present at the original watch, never interpret later aliases as old evidence.
  let baselineSourceIndex: number | null = null;
  checks.forEach((check, index) => {
    if (check.case_id === watch.case_id && Date.parse(check.captured_at) <= Date.parse(watch.recorded_at)) {
      baselineSourceIndex = index;
    }
  });
  if (sourceCheckIndex !== null && (!Number.isInteger(sourceCheckIndex) || sourceCheckIndex < 0 ||
    !checks[sourceCheckIndex] || checks[sourceCheckIndex].case_id !== watch.case_id ||
    checks[sourceCheckIndex].trial_index !== observationIndex ||
    Date.parse(checks[sourceCheckIndex].captured_at) < Date.parse(observation.observed_at) ||
    Date.parse(checks[sourceCheckIndex].captured_at) <= Date.parse(watch.recorded_at) ||
    Date.parse(checks[sourceCheckIndex].captured_at) > Date.parse(at))) {
    throw new Error("Fresh source claim must identify the exact later owner trial, or be explicitly missing.");
  }
  const baseline = baselineSourceIndex === null ? null : checks[baselineSourceIndex];
  const newer = sourceCheckIndex === null ? null : checks[sourceCheckIndex];
  const signals: WatchAuditSignal[] = [];
  if (priorObs && priorObs.outcome !== observation.outcome) signals.push("OWNER_OUTCOME_CHANGED");
  if (observation.outcome === "passed") signals.push("OWNER_IMPROVEMENT_UNVERIFIED");
  else signals.push("OWNER_ISSUE_STILL_OPEN");
  if (!newer) signals.push("FRESH_SOURCE_WITNESS_MISSING");
  else {
    if (!baseline || baseline.identity_state !== newer.identity_state ||
      baseline.safe_alias !== newer.safe_alias || baseline.installed_version !== newer.installed_version ||
      baseline.access !== newer.access) signals.push("SOURCE_IDENTITY_CONTRADICTION");
    if (newer.identity_state !== "confirmed_alias") signals.push("SOURCE_IDENTITY_UNVERIFIED");
  }
  const watchAgeDays = Math.floor((Date.parse(at) - Date.parse(watch.recorded_at)) / DAY);
  if (watchAgeDays >= 3) signals.push("INDEPENDENT_WATCH_AGED");
  if (watchAgeDays > 7) signals.push("INDEPENDENT_WATCH_OVERDUE");
  signals.push("HISTORICAL_EXCEPTION_UNRESOLVED");
  return { watch_index: watchIndex, observation_index: observationIndex,
    source_check_index: sourceCheckIndex, baseline_source_check_index: baselineSourceIndex,
    case_id: watch.case_id, watch_recorded_at: watch.recorded_at, first_recheck_at: watch.baseline_at,
    followup_observed_at: observation.observed_at, watch_age_days: watchAgeDays,
    original_exception_age_days: Math.floor((Date.parse(at) - Date.parse(watch.baseline_at)) / DAY),
    watch_age_band: watchAgeDays > 7 ? "OVER_SEVEN_DAYS" : watchAgeDays >= 3 ?
      "THREE_TO_SEVEN_DAYS" : "UNDER_THREE_DAYS", owner_outcome: observation.outcome,
    owner_finding: observation.finding, signals, outstanding: true };
}

export function validateHistoricalWatchAudits(notes: readonly HistoricalWatchAuditNote[],
  watches: readonly ExceptionWatchNote[], history: readonly TrialObservation[],
  checks: readonly SourceIdentityCheck[], exportedAt?: string): void {
  if (notes.length > 100) throw new Error("Build 161 is limited to 100 private audit notes.");
  let previous = 0;
  const seen = new Set<string>();
  for (const note of notes) {
    if (!note || Object.keys(note).length !== noteKeys.length ||
      Object.keys(note).some(key => !noteKeys.includes(key)) || !validTime(note.recorded_at) ||
      !WATCH_AUDIT_CATEGORIES.includes(note.category) || note.personally_witnessed !== true ||
      note.hold_acknowledged !== true || note.state !== "PRIVATE_WATCH_FOLLOWUP_NOT_SENT" ||
      note.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
      note.independent_review !== "INDEPENDENT_REVIEW_HOLD" || note.closure !== "NOT_AUTHORIZED") {
      throw new Error("Unsafe Build 161 immutable HOLD audit fields.");
    }
    const now = Date.parse(note.recorded_at);
    if (now < previous || exportedAt && now > Date.parse(exportedAt)) {
      throw new Error("Build 161 chronological audit history is invalid.");
    }
    const expected = compareHistoricalWatchFollowup(watches, history, checks,
      note.watch_index, note.observation_index, note.source_check_index, note.recorded_at);
    if (comparisonKeys.some(key => JSON.stringify(note[key]) !== JSON.stringify(expected[key]))) {
      throw new Error("Build 161 audit changed original watch, owner outcome, source claim or computed age.");
    }
    if (note.category === "REQUEST_OWNER_OUTCOME_RECHECK" &&
      !expected.signals.some(signal => signal === "OWNER_OUTCOME_CHANGED" ||
        signal === "OWNER_ISSUE_STILL_OPEN") ||
      note.category === "REQUEST_SOURCE_IDENTITY_RECHECK" &&
      !expected.signals.some(signal => signal === "SOURCE_IDENTITY_CONTRADICTION" ||
        signal === "SOURCE_IDENTITY_UNVERIFIED" || signal === "FRESH_SOURCE_WITNESS_MISSING")) {
      throw new Error("Build 161 audit category must match the observed unresolved exception.");
    }
    const key = `${note.watch_index}:${note.observation_index}:${note.source_check_index}:${note.category}`;
    if (seen.has(key)) throw new Error("Duplicate Build 161 historical watch audit.");
    seen.add(key);
    previous = now;
  }
}

export function recordHistoricalWatchAudit(watches: readonly ExceptionWatchNote[],
  history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[],
  previous: readonly HistoricalWatchAuditNote[], environment: TrialEnvironment,
  imported: { trials: number; checks: number; audits: number },
  input: { watch_index: number; observation_index: number; source_check_index: number | null;
    category: WatchAuditCategory; personally_witnessed: boolean; hold_acknowledged: boolean },
  now = new Date().toISOString()): HistoricalWatchAuditNote[] {
  if (!environment.installed_windows_witnessed || !validateInstalledVersion(environment.installed_version) ||
    environment.access === "unknown" || !input.personally_witnessed || !input.hold_acknowledged ||
    input.observation_index < imported.trials || previous.length < imported.audits ||
    input.source_check_index !== null && input.source_check_index < imported.checks ||
    !WATCH_AUDIT_CATEGORIES.includes(input.category)) {
    throw new Error("A fresh non-imported owner trial, installed Windows witness and both HOLD confirmations are mandatory.");
  }
  const comparison = compareHistoricalWatchFollowup(watches, history, checks,
    input.watch_index, input.observation_index, input.source_check_index, now);
  const notes: HistoricalWatchAuditNote[] = [...previous, { ...comparison,
    recorded_at: now, category: input.category, personally_witnessed: true, hold_acknowledged: true,
    state: "PRIVATE_WATCH_FOLLOWUP_NOT_SENT", field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED" }];
  validateHistoricalWatchAudits(notes, watches, history, checks);
  return notes;
}

export function createHistoricalWatchAuditReceipt(prior: RecheckDecisionWatchReceipt,
  audits: readonly HistoricalWatchAuditNote[], now = new Date().toISOString()): HistoricalWatchAuditReceipt {
  if (prior.kind !== "rosevear_independent_recheck_decision_watch" || !validTime(now) ||
    Date.parse(now) < Date.parse(prior.exported_at)) throw new Error("Invalid Build 161 export chronology.");
  const nested = parseRecheckDecisionWatchReceipt(JSON.stringify(prior));
  validateHistoricalWatchAudits(audits, nested.exception_watches,
    nested.trial.observations, nested.checks, now);
  const receipt: HistoricalWatchAuditReceipt = { kind: "rosevear_historical_watch_outcome_audit",
    schema_version: 1, exported_at: now, field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED",
    automatic_dispatch: "DISABLED", scheduled_followup: "DISABLED",
    evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS", watch_receipt: prior,
    watch_followup_audits: audits.map(note => ({ ...note, signals: [...note.signals] })) };
  if (JSON.stringify(receipt).length > MAX_WATCH_AUDIT_BYTES) throw new Error("Build 161 receipt exceeds 2.5 MB.");
  return receipt;
}

/** Build 148–160 imports are historical-only, with no fresh Windows witness carried forward. */
export function parseHistoricalWatchAuditReceipt(raw: string): ReturnType<typeof parseRecheckDecisionWatchReceipt> &
  { watch_followup_audits: HistoricalWatchAuditNote[] } {
  if (raw.length > MAX_WATCH_AUDIT_BYTES) throw new Error("Build 161 receipt exceeds 2.5 MB.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Invalid private Build 161 JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid Build 161 envelope.");
  const receipt = value as Record<string, unknown>;
  if (receipt.kind !== "rosevear_historical_watch_outcome_audit") {
    return { ...parseRecheckDecisionWatchReceipt(raw), watch_followup_audits: [] };
  }
  const keys = ["kind", "schema_version", "exported_at", "field_acceptance", "independent_review",
    "closure", "automatic_dispatch", "scheduled_followup", "evidence_authenticity",
    "watch_receipt", "watch_followup_audits"];
  if (Object.keys(receipt).length !== keys.length || Object.keys(receipt).some(key => !keys.includes(key)) ||
    receipt.schema_version !== 1 || !validTime(receipt.exported_at) ||
    receipt.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" || receipt.independent_review !== "INDEPENDENT_REVIEW_HOLD" ||
    receipt.closure !== "NOT_AUTHORIZED" || receipt.automatic_dispatch !== "DISABLED" ||
    receipt.scheduled_followup !== "DISABLED" ||
    receipt.evidence_authenticity !== "UNVERIFIED_PRIVATE_ATTESTATIONS" ||
    !receipt.watch_receipt || !Array.isArray(receipt.watch_followup_audits)) {
    throw new Error("Unsafe Build 161 private HOLD envelope.");
  }
  const prior = receipt.watch_receipt as RecheckDecisionWatchReceipt;
  if (prior.kind !== "rosevear_independent_recheck_decision_watch" ||
    Date.parse(prior.exported_at) > Date.parse(receipt.exported_at as string)) {
    throw new Error("Build 161 requires a chronological complete Build 160 watch receipt.");
  }
  const nested = parseRecheckDecisionWatchReceipt(JSON.stringify(prior));
  const notes = receipt.watch_followup_audits as HistoricalWatchAuditNote[];
  validateHistoricalWatchAudits(notes, nested.exception_watches, nested.trial.observations,
    nested.checks, receipt.exported_at as string);
  return { ...nested, watch_followup_audits: notes.map(item => ({ ...item, signals: [...item.signals] })) };
}

/** Read-only snapshot comparison; exact evidence-prefix checks never import or authenticate either file. */
export function comparePrivateWatchReceipts(previousRaw: string, currentRaw: string): {
  previous_observations: number; current_observations: number; new_observations: number;
  previous_watches: number; comparison: HistoricalWatchComparison | null;
} {
  const previousEnvelope = JSON.parse(previousRaw) as RecheckDecisionWatchReceipt;
  const currentEnvelope = JSON.parse(currentRaw) as RecheckDecisionWatchReceipt;
  if (previousEnvelope.kind !== "rosevear_independent_recheck_decision_watch" ||
    currentEnvelope.kind !== "rosevear_independent_recheck_decision_watch" ||
    Date.parse(previousEnvelope.exported_at) >= Date.parse(currentEnvelope.exported_at)) {
    throw new Error("Two chronological Build 160 private watch receipts are required.");
  }
  const previous = parseRecheckDecisionWatchReceipt(previousRaw);
  const current = parseRecheckDecisionWatchReceipt(currentRaw);
  const prefix = (earlier: readonly unknown[], later: readonly unknown[]) =>
    earlier.length <= later.length && earlier.every((item, index) =>
      JSON.stringify(item) === JSON.stringify(later[index]));
  const streams = ["source_readings"] as const;
  const nestedStreams = ["handoffs", "events", "checks", "links", "reassessments", "followups",
    "decisions", "resolutions", "overdue_handoffs", "followup_reviews", "outcome_reviews",
    "recurrence_rechecks", "exception_watches"] as const;
  if (!prefix(previous.trial.observations, current.trial.observations) ||
    streams.some(key => !prefix(previous.trial[key], current.trial[key])) ||
    nestedStreams.some(key => !prefix(previous[key], current[key])) ||
    previous.trial.environment.installed_version !== current.trial.environment.installed_version ||
    previous.trial.environment.access !== current.trial.environment.access ||
    previous.exception_watches.length === 0 ||
    previous.trial.observations.length >= current.trial.observations.length) {
    throw new Error("An exact append-only Build 160 watch and newer owner trial history are required; neither file is authenticated.");
  }
  let comparison: HistoricalWatchComparison | null = null;
  for (let watchIndex = 0; watchIndex < previous.exception_watches.length && !comparison; watchIndex++) {
    for (let index = previous.trial.observations.length; index < current.trial.observations.length; index++) {
      if (current.trial.observations[index].case_id !== previous.exception_watches[watchIndex].case_id ||
        Date.parse(current.trial.observations[index].observed_at) <=
          Date.parse(previous.exception_watches[watchIndex].recorded_at)) continue;
      const sourceIndex = current.checks.findIndex(check => check.trial_index === index &&
        check.case_id === current.trial.observations[index].case_id);
      comparison = compareHistoricalWatchFollowup(current.exception_watches,
        current.trial.observations, current.checks, watchIndex, index,
        sourceIndex < 0 ? null : sourceIndex, currentEnvelope.exported_at);
      break;
    }
  }
  return { previous_observations: previous.trial.observations.length,
    current_observations: current.trial.observations.length,
    new_observations: current.trial.observations.length - previous.trial.observations.length,
    previous_watches: previous.exception_watches.length, comparison };
}
