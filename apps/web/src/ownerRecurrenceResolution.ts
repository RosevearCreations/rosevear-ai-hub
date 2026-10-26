/** Build 155: owner-witnessed recurrence evidence and an on-demand overdue watch, never closure. */
import { type TrialCaseId, type TrialEnvironment, type TrialObservation, type TrialOutcome,
  type TrialSourceReading } from "./ownerFieldTrial";
import { type RepairHandoff } from "./ownerTrialReconciliation";
import { type ReviewEvidenceEvent } from "./ownerIndependentReview";
import { MANUAL_ROUTES, type SourceIdentityCheck } from "./ownerFieldRouting";
import { type IndependentHoldReassessment, type RepeatTrialEvidenceLink } from "./ownerRepeatTrialReassessment";
import { type OwnerEvidenceFollowup } from "./ownerReassessmentFollowup";
import { createDecisionReplayReceipt, parseDecisionReplayReceipt, type DecisionReplayReceipt,
  type FollowupDecision } from "./ownerFollowupDecisionReplay";

export type ResolutionClaim = "RECURRING_ISSUE_REPORTED" | "OWNER_IMPROVEMENT_UNVERIFIED";
export type SourceComparison = "NO_NEW_SOURCE_WITNESS" | "ALIAS_MATCH_UNVERIFIED" | "SOURCE_RECHECK_HOLD";
export type DecisionWatch = "HISTORICAL_REWITNESS_HOLD" | "WAITING_FOR_NEW_OWNER_TRIAL" |
  "NEW_TRIAL_NEEDS_MANUAL_INTAKE" | "OWNER_EVIDENCE_NEEDS_INDEPENDENT_REVIEW" |
  "NEWER_TRIAL_REQUIRES_FRESH_DECISION";
export type DecisionAge = "RECENT_UNDER_24H" | "WATCH_1_TO_3_DAYS" |
  "OVERDUE_3_TO_7_DAYS" | "OVERDUE_OVER_7_DAYS";

export interface RecurrenceResolutionEvidence {
  decision_index: number;
  case_id: TrialCaseId;
  link_index: number;
  source_followup_index: number;
  criterion: FollowupDecision["criterion"];
  decision_at: string;
  source_linked_at: string;
  trial_index: number;
  trial_at: string;
  outcome_at_intake: TrialOutcome;
  source_check_index: number | null;
  source_comparison: SourceComparison;
  resolution_claim: ResolutionClaim;
  recorded_at: string;
  personally_witnessed: true;
  resolution_state: "OWNER_RECURRENCE_EVIDENCE_UNVERIFIED_HOLD";
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
}

export interface RecurrenceWatchRow {
  decision_index: number;
  case_id: TrialCaseId;
  criterion: FollowupDecision["criterion"];
  link_index: number;
  original_linked_at: string;
  decision_at: string;
  decision: FollowupDecision["decision"];
  newest_trial_index: number | null;
  newest_trial_at: string | null;
  source_comparison: SourceComparison;
  evidence_index: number | null;
  evidence_at: string | null;
  claim: ResolutionClaim | null;
  age_days: number;
  age_band: DecisionAge;
  overdue: boolean;
  state: DecisionWatch;
  source_imported: boolean;
  section: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
}

export interface RecurrenceResolutionReceipt {
  kind: "rosevear_independent_recurrence_resolution_watch";
  schema_version: 1;
  exported_at: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
  automatic_dispatch: "DISABLED";
  scheduled_watch: "DISABLED";
  evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS";
  replay: DecisionReplayReceipt;
  resolutions: RecurrenceResolutionEvidence[];
}

export type ResolutionImportCounts = { trials: number; checks: number; decisions: number; resolutions: number };
const evidenceKeys = ["decision_index", "case_id", "link_index", "source_followup_index", "criterion",
  "decision_at", "source_linked_at", "trial_index", "trial_at", "outcome_at_intake",
  "source_check_index", "source_comparison", "resolution_claim", "recorded_at", "personally_witnessed",
  "resolution_state", "field_acceptance", "independent_review", "closure"];
const MAX_RESOLUTIONS = 200;
const MAX_BYTES = 1_050_000;
const DAY_MS = 86_400_000;

function safeTime(value: unknown): value is string {
  return typeof value === "string" && /^20\d\d-\d\d-\d\dT/.test(value) &&
    Number.isFinite(Date.parse(value)) && Date.parse(value) >= Date.parse("2020-01-01T00:00:00Z") &&
    Date.parse(value) <= Date.now() + 300_000;
}

function sourceEvidence(checks: readonly SourceIdentityCheck[], link: RepeatTrialEvidenceLink,
  trialIndex: number, trialAt: string, cutoff: string): { index: number | null; state: SourceComparison } {
  let index: number | null = null;
  checks.forEach((check, position) => {
    if (check.case_id === link.case_id && check.trial_index === trialIndex &&
      Date.parse(check.captured_at) >= Date.parse(trialAt) &&
      Date.parse(check.captured_at) <= Date.parse(cutoff)) index = position;
  });
  if (index === null) return { index: null, state: "NO_NEW_SOURCE_WITNESS" };
  const check = checks[index];
  return { index, state: check.identity_state === "confirmed_alias" && !!link.source_alias &&
    check.safe_alias === link.source_alias && check.installed_version === link.installed_version
    ? "ALIAS_MATCH_UNVERIFIED" : "SOURCE_RECHECK_HOLD" };
}

function claimFor(outcome: TrialOutcome): ResolutionClaim {
  return outcome === "passed" ? "OWNER_IMPROVEMENT_UNVERIFIED" : "RECURRING_ISSUE_REPORTED";
}

function validateResolutions(history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[],
  links: readonly RepeatTrialEvidenceLink[], decisions: readonly FollowupDecision[],
  resolutions: readonly RecurrenceResolutionEvidence[], exportedAt?: string): void {
  if (resolutions.length > MAX_RESOLUTIONS) throw new Error("Private resolution evidence exceeds 200 entries.");
  const seen = new Set<number>();
  let previous = 0;
  for (const item of resolutions) {
    if (!item || typeof item !== "object" || Object.keys(item).some(key => !evidenceKeys.includes(key)) ||
      !Number.isInteger(item.decision_index) || !Number.isInteger(item.trial_index) ||
      !Number.isInteger(item.link_index) || !Number.isInteger(item.source_followup_index) ||
      (item.source_check_index !== null && !Number.isInteger(item.source_check_index)) ||
      !Object.hasOwn(MANUAL_ROUTES, item.case_id) || !safeTime(item.decision_at) ||
      !safeTime(item.source_linked_at) || !safeTime(item.trial_at) || !safeTime(item.recorded_at) ||
      !["passed", "issue", "blocked"].includes(item.outcome_at_intake) ||
      !["NO_NEW_SOURCE_WITNESS", "ALIAS_MATCH_UNVERIFIED", "SOURCE_RECHECK_HOLD"].includes(item.source_comparison) ||
      !["RECURRING_ISSUE_REPORTED", "OWNER_IMPROVEMENT_UNVERIFIED"].includes(item.resolution_claim) ||
      item.personally_witnessed !== true ||
      item.resolution_state !== "OWNER_RECURRENCE_EVIDENCE_UNVERIFIED_HOLD" ||
      item.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
      item.independent_review !== "INDEPENDENT_REVIEW_HOLD" || item.closure !== "NOT_AUTHORIZED") {
      throw new Error("Unsafe private resolution evidence: only bounded witnessed HOLD records are accepted.");
    }
    const decision = decisions[item.decision_index];
    const trial = history[item.trial_index];
    const link = links[item.link_index];
    const when = Date.parse(item.recorded_at);
    if (!decision || !trial || !link || seen.has(item.decision_index) ||
      decision.case_id !== item.case_id || decision.link_index !== item.link_index ||
      decision.criterion !== item.criterion ||
      decision.source_followup_index !== item.source_followup_index ||
      decision.reviewed_at !== item.decision_at || decision.source_linked_at !== item.source_linked_at ||
      link.case_id !== item.case_id || link.linked_at !== item.source_linked_at ||
      trial.case_id !== item.case_id || trial.observed_at !== item.trial_at ||
      trial.witnessed_by_operator !== true || trial.outcome !== item.outcome_at_intake ||
      item.resolution_claim !== claimFor(trial.outcome) ||
      Date.parse(trial.observed_at) <= Date.parse(decision.reviewed_at) ||
      when < Date.parse(trial.observed_at) || when < previous ||
      (exportedAt && when > Date.parse(exportedAt))) {
      throw new Error("Resolution evidence has conflicting decision, trial or chronological provenance.");
    }
    const source = sourceEvidence(checks, link, item.trial_index, item.trial_at, item.recorded_at);
    if (source.index !== item.source_check_index || source.state !== item.source_comparison) {
      throw new Error("Resolution evidence source snapshot does not match its exact source check.");
    }
    previous = when;
    seen.add(item.decision_index);
  }
}

/** The watch is recomputed only on an explicit UI render; there are no timers or background tasks. */
export function deriveRecurrenceWatch(history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[],
  links: readonly RepeatTrialEvidenceLink[], decisions: readonly FollowupDecision[],
  resolutions: readonly RecurrenceResolutionEvidence[], imported: ResolutionImportCounts,
  now = new Date().toISOString()): RecurrenceWatchRow[] {
  if (!safeTime(now)) throw new Error("Invalid private watch timestamp.");
  const rows: RecurrenceWatchRow[] = decisions.map((decision, decisionIndex) => {
    const link = links[decision.link_index];
    const candidates = history.map((trial, trialIndex) => ({ trial, trialIndex })).filter(item =>
      item.trial.case_id === decision.case_id &&
      Date.parse(item.trial.observed_at) > Date.parse(decision.reviewed_at));
    const newest = candidates.at(-1);
    const evidenceIndex = resolutions.findIndex(entry => entry.decision_index === decisionIndex);
    const evidence = evidenceIndex >= 0 ? resolutions[evidenceIndex] : null;
    const importedDecision = decisionIndex < imported.decisions || !!evidence && evidenceIndex < imported.resolutions;
    const source = link && newest ? sourceEvidence(checks, link, newest.trialIndex, newest.trial.observed_at, now) :
      { index: null, state: "NO_NEW_SOURCE_WITNESS" as const };
    const age = Math.max(0, Date.parse(now) - Date.parse(decision.reviewed_at));
    const ageBand: DecisionAge = age < DAY_MS ? "RECENT_UNDER_24H" : age < DAY_MS * 3 ?
      "WATCH_1_TO_3_DAYS" : age < DAY_MS * 7 ? "OVERDUE_3_TO_7_DAYS" : "OVERDUE_OVER_7_DAYS";
    const sourceImported = importedDecision || !!newest && newest.trialIndex < imported.trials;
    const state: DecisionWatch = sourceImported ? "HISTORICAL_REWITNESS_HOLD" : evidence && newest &&
      newest.trialIndex > evidence.trial_index ? "NEWER_TRIAL_REQUIRES_FRESH_DECISION" : evidence ?
      "OWNER_EVIDENCE_NEEDS_INDEPENDENT_REVIEW" : newest ? "NEW_TRIAL_NEEDS_MANUAL_INTAKE" :
        "WAITING_FOR_NEW_OWNER_TRIAL";
    return { decision_index: decisionIndex, case_id: decision.case_id, criterion: decision.criterion,
      link_index: decision.link_index, original_linked_at: decision.source_linked_at,
      decision_at: decision.reviewed_at, decision: decision.decision,
      newest_trial_index: newest?.trialIndex ?? null, newest_trial_at: newest?.trial.observed_at ?? null,
      source_comparison: source.state, evidence_index: evidence ? evidenceIndex : null,
      evidence_at: evidence?.recorded_at ?? null, claim: evidence?.resolution_claim ?? null,
      age_days: Math.floor(age / DAY_MS), age_band: ageBand, overdue: age >= DAY_MS * 3,
      state, source_imported: sourceImported, section: MANUAL_ROUTES[decision.case_id].section,
      field_acceptance: "FIELD_ACCEPTANCE_HOLD", independent_review: "INDEPENDENT_REVIEW_HOLD",
      closure: "NOT_AUTHORIZED" };
  });
  return rows.sort((a, b) => Number(b.overdue) - Number(a.overdue) ||
    Date.parse(a.decision_at) - Date.parse(b.decision_at) || a.decision_index - b.decision_index);
}

export function recordRecurrenceResolution(history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[],
  links: readonly RepeatTrialEvidenceLink[], decisions: readonly FollowupDecision[],
  previous: readonly RecurrenceResolutionEvidence[], environment: TrialEnvironment,
  imported: ResolutionImportCounts,
  input: { decision_index: number; trial_index: number; personally_witnessed: boolean;
    hold_acknowledged: boolean }, now = new Date().toISOString()): RecurrenceResolutionEvidence[] {
  if (!input.personally_witnessed || !input.hold_acknowledged || !safeTime(now)) {
    throw new Error("Personally witness the exact new owner trial and confirm independent HOLD before intake.");
  }
  const decision = decisions[input.decision_index];
  const trial = history[input.trial_index];
  const link = decision && links[decision.link_index];
  if (!decision || !trial || !link || input.decision_index < imported.decisions ||
    input.trial_index < imported.trials || !environment.installed_windows_witnessed ||
    environment.access === "unknown" || environment.installed_version !== link.installed_version) {
    throw new Error("Historical/imported decisions, trials or unverified Windows context require a fresh witnessed trial and decision.");
  }
  if (trial.case_id !== decision.case_id || trial.witnessed_by_operator !== true ||
    Date.parse(trial.observed_at) <= Date.parse(decision.reviewed_at) ||
    Date.parse(trial.observed_at) > Date.parse(now) ||
    history.some((item, index) => index > input.trial_index && item.case_id === decision.case_id) ||
    decisions.some((item, index) => index > input.decision_index && item.case_id === decision.case_id &&
      item.link_index === decision.link_index && item.criterion === decision.criterion) ||
    previous.some(item => item.decision_index === input.decision_index)) {
    throw new Error("Select the newest exact post-decision trial and a current, unreviewed decision; superseded evidence cannot be re-used.");
  }
  const source = sourceEvidence(checks, link, input.trial_index, trial.observed_at, now);
  const updated: RecurrenceResolutionEvidence[] = [...previous, {
    decision_index: input.decision_index, case_id: decision.case_id,
    link_index: decision.link_index, source_followup_index: decision.source_followup_index,
    criterion: decision.criterion, decision_at: decision.reviewed_at,
    source_linked_at: decision.source_linked_at, trial_index: input.trial_index,
    trial_at: trial.observed_at, outcome_at_intake: trial.outcome, source_check_index: source.index,
    source_comparison: source.state, resolution_claim: claimFor(trial.outcome), recorded_at: now,
    personally_witnessed: true, resolution_state: "OWNER_RECURRENCE_EVIDENCE_UNVERIFIED_HOLD",
    field_acceptance: "FIELD_ACCEPTANCE_HOLD", independent_review: "INDEPENDENT_REVIEW_HOLD",
    closure: "NOT_AUTHORIZED" }];
  validateResolutions(history, checks, links, decisions, updated);
  return updated;
}

export function createRecurrenceResolutionReceipt(environment: TrialEnvironment, readings: readonly TrialSourceReading[],
  history: readonly TrialObservation[], handoffs: readonly RepairHandoff[], reviews: readonly ReviewEvidenceEvent[],
  checks: readonly SourceIdentityCheck[], links: readonly RepeatTrialEvidenceLink[],
  reassessments: readonly IndependentHoldReassessment[], followups: readonly OwnerEvidenceFollowup[],
  decisions: readonly FollowupDecision[], resolutions: readonly RecurrenceResolutionEvidence[],
  now = new Date().toISOString()): RecurrenceResolutionReceipt {
  if (!safeTime(now)) throw new Error("Invalid private recurrence export time.");
  validateResolutions(history, checks, links, decisions, resolutions, now);
  return { kind: "rosevear_independent_recurrence_resolution_watch", schema_version: 1, exported_at: now,
    field_acceptance: "FIELD_ACCEPTANCE_HOLD", independent_review: "INDEPENDENT_REVIEW_HOLD",
    closure: "NOT_AUTHORIZED", automatic_dispatch: "DISABLED", scheduled_watch: "DISABLED",
    evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS",
    replay: createDecisionReplayReceipt(environment, readings, history, handoffs, reviews, checks, links,
      reassessments, followups, decisions, now), resolutions: resolutions.map(item => ({ ...item })) };
}

export function parseRecurrenceResolutionReceipt(raw: string): ReturnType<typeof parseDecisionReplayReceipt> & {
  resolutions: RecurrenceResolutionEvidence[] } {
  if (raw.length > MAX_BYTES) throw new Error("Private Build 155 receipt exceeds 1.05 MB.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Private resolution receipt is not valid JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid private resolution receipt envelope.");
  }
  const receipt = value as Record<string, unknown>;
  if (receipt.kind !== "rosevear_independent_recurrence_resolution_watch") {
    return { ...parseDecisionReplayReceipt(raw), resolutions: [] };
  }
  const keys = ["kind", "schema_version", "exported_at", "field_acceptance", "independent_review",
    "closure", "automatic_dispatch", "scheduled_watch", "evidence_authenticity", "replay", "resolutions"];
  if (Object.keys(receipt).some(key => !keys.includes(key)) || receipt.schema_version !== 1 ||
    receipt.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" || receipt.independent_review !== "INDEPENDENT_REVIEW_HOLD" ||
    receipt.closure !== "NOT_AUTHORIZED" || receipt.automatic_dispatch !== "DISABLED" ||
    receipt.scheduled_watch !== "DISABLED" ||
    receipt.evidence_authenticity !== "UNVERIFIED_PRIVATE_ATTESTATIONS" || !safeTime(receipt.exported_at) ||
    !receipt.replay || typeof receipt.replay !== "object" || !Array.isArray(receipt.resolutions)) {
    throw new Error("Unsafe or unsupported Build 155 resolution receipt.");
  }
  const inner = receipt.replay as DecisionReplayReceipt;
  if (inner.kind !== "rosevear_independent_followup_decision_replay" ||
    Date.parse(inner.exported_at) > Date.parse(receipt.exported_at as string)) {
    throw new Error("Build 155 requires the complete chronological Build 154 decision history.");
  }
  const prior = parseDecisionReplayReceipt(JSON.stringify(inner));
  const resolutions = receipt.resolutions as RecurrenceResolutionEvidence[];
  validateResolutions(prior.trial.observations, prior.checks, prior.links, prior.decisions, resolutions,
    receipt.exported_at as string);
  return { ...prior, resolutions: resolutions.map(item => ({ ...item })) };
}
