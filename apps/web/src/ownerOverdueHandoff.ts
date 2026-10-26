/** Build 156: exact, append-only private overdue handoffs and reopened-trial comparisons; no dispatch. */
import { type TrialCaseId, type TrialEnvironment, type TrialObservation, type TrialOutcome,
  type TrialSourceReading } from "./ownerFieldTrial";
import { type RepairHandoff } from "./ownerTrialReconciliation";
import { type ReviewEvidenceEvent } from "./ownerIndependentReview";
import { MANUAL_ROUTES, type SourceIdentityCheck } from "./ownerFieldRouting";
import { type IndependentHoldReassessment, type RepeatTrialEvidenceLink } from "./ownerRepeatTrialReassessment";
import { type OwnerEvidenceFollowup } from "./ownerReassessmentFollowup";
import { type FollowupDecision } from "./ownerFollowupDecisionReplay";
import { createRecurrenceResolutionReceipt, parseRecurrenceResolutionReceipt,
  type RecurrenceResolutionEvidence, type RecurrenceResolutionReceipt, type ResolutionClaim,
  type ResolutionImportCounts, type DecisionAge } from "./ownerRecurrenceResolution";

export type ReopenedComparison = "NO_NEW_OWNER_TRIAL" | "NEW_OWNER_TRIAL_UNVERIFIED" |
  "NO_TRIAL_AFTER_RESOLUTION" | "REOPENED_ISSUE_AFTER_RESOLUTION" |
  "REOPENED_PASS_AFTER_RESOLUTION_UNVERIFIED";
export type AliasChange = "NO_LATER_SOURCE_CHECK" | "ALIAS_STILL_UNVERIFIED" |
  "ALIAS_CHANGED_RECHECK_HOLD" | "SOURCE_CHECK_DISPUTED_HOLD";
export type ManualHandoffCategory = "OVERDUE_INDEPENDENT_REVIEW_REQUEST" |
  "REOPENED_TRIAL_COMPARISON_REQUEST" | "SOURCE_ALIAS_RECHECK_REQUEST";

export interface HandoffSnapshot {
  decision_index: number;
  case_id: TrialCaseId;
  criterion: FollowupDecision["criterion"];
  link_index: number;
  source_followup_index: number;
  source_linked_at: string;
  decision_at: string;
  captured_at: string;
  age_days: number;
  age_band: DecisionAge;
  overdue: boolean;
  resolution_index: number | null;
  resolution_recorded_at: string | null;
  prior_owner_claim: ResolutionClaim | null;
  prior_trial_index: number | null;
  newest_trial_index: number | null;
  newest_trial_at: string | null;
  newest_trial_outcome: TrialOutcome | null;
  latest_source_check_index: number | null;
  reopened_comparison: ReopenedComparison;
  source_alias_comparison: AliasChange;
}

export interface OverdueHandoffEvidence extends HandoffSnapshot {
  handoff_category: ManualHandoffCategory;
  personally_reviewed: true;
  hold_acknowledged: true;
  handoff_state: "PREPARED_PRIVATE_HANDOFF_NOT_SENT";
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
}

export interface HandoffWatchRow extends HandoffSnapshot {
  source_imported: boolean;
  eligible_for_manual_handoff: boolean;
  existing_handoffs: number;
  section: string;
}

export interface OverdueHandoffReceipt {
  kind: "rosevear_independent_overdue_handoff";
  schema_version: 1;
  exported_at: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
  automatic_dispatch: "DISABLED";
  automatic_escalation: "DISABLED";
  evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS";
  recurrence: RecurrenceResolutionReceipt;
  overdue_handoffs: OverdueHandoffEvidence[];
}

export type HandoffImportCounts = ResolutionImportCounts & { links: number; followups: number; handoffs: number };
const DAY_MS = 86_400_000;
const MAX_HANDOFFS = 160;
export const MAX_HANDOFF_BYTES = 1_200_000;
const handoffCategories: ManualHandoffCategory[] = ["OVERDUE_INDEPENDENT_REVIEW_REQUEST",
  "REOPENED_TRIAL_COMPARISON_REQUEST", "SOURCE_ALIAS_RECHECK_REQUEST"];
const snapshotKeys = ["decision_index", "case_id", "criterion", "link_index", "source_followup_index",
  "source_linked_at", "decision_at", "captured_at", "age_days", "age_band", "overdue",
  "resolution_index", "resolution_recorded_at", "prior_owner_claim", "prior_trial_index",
  "newest_trial_index", "newest_trial_at", "newest_trial_outcome", "latest_source_check_index",
  "reopened_comparison", "source_alias_comparison"];
const eventKeys = [...snapshotKeys, "handoff_category", "personally_reviewed", "hold_acknowledged",
  "handoff_state", "field_acceptance", "independent_review", "closure"];

function safeTime(value: unknown): value is string {
  return typeof value === "string" && /^20\d\d-\d\d-\d\dT/.test(value) &&
    Number.isFinite(Date.parse(value)) && Date.parse(value) >= Date.parse("2020-01-01T00:00:00Z") &&
    Date.parse(value) <= Date.now() + 300_000;
}

/** Compute an as-of snapshot: future trials/checks must never rewrite a recorded handoff. */
export function captureHandoffSnapshot(history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[],
  links: readonly RepeatTrialEvidenceLink[], decisions: readonly FollowupDecision[],
  resolutions: readonly RecurrenceResolutionEvidence[], decisionIndex: number,
  now = new Date().toISOString()): HandoffSnapshot {
  if (!safeTime(now)) throw new Error("Invalid owner handoff snapshot time.");
  const decision = decisions[decisionIndex];
  const link = decision && links[decision.link_index];
  if (!decision || !link || Date.parse(now) < Date.parse(decision.reviewed_at)) {
    throw new Error("An exact past independent decision is required for a private handoff.");
  }
  const cutoff = Date.parse(now);
  const age = Math.max(0, cutoff - Date.parse(decision.reviewed_at));
  const ageBand: DecisionAge = age < DAY_MS ? "RECENT_UNDER_24H" : age < DAY_MS * 3 ?
    "WATCH_1_TO_3_DAYS" : age < DAY_MS * 7 ? "OVERDUE_3_TO_7_DAYS" : "OVERDUE_OVER_7_DAYS";
  const resolutionIndex = resolutions.findIndex(entry => entry.decision_index === decisionIndex &&
    Date.parse(entry.recorded_at) <= cutoff);
  const resolution = resolutionIndex >= 0 ? resolutions[resolutionIndex] : null;
  let newestTrialIndex: number | null = null;
  history.forEach((trial, index) => {
    if (trial.case_id === decision.case_id && Date.parse(trial.observed_at) > Date.parse(decision.reviewed_at) &&
      Date.parse(trial.observed_at) <= cutoff) newestTrialIndex = index;
  });
  const newest: TrialObservation | null = newestTrialIndex !== null ? history[newestTrialIndex] : null;
  let latestSourceCheckIndex: number | null = null;
  checks.forEach((check, index) => {
    if (newest && check.case_id === decision.case_id && check.trial_index === newestTrialIndex &&
      Date.parse(check.captured_at) >= Date.parse(newest.observed_at) &&
      Date.parse(check.captured_at) <= cutoff) latestSourceCheckIndex = index;
  });
  const latestCheck: SourceIdentityCheck | null = latestSourceCheckIndex !== null ? checks[latestSourceCheckIndex] : null;
  const baselineCheck = resolution?.source_check_index !== null && resolution?.source_check_index !== undefined ?
    checks[resolution.source_check_index] : null;
  const baselineAlias = baselineCheck?.safe_alias ?? link.source_alias;
  const baselineCheckAt = baselineCheck ? Date.parse(baselineCheck.captured_at) : Date.parse(decision.reviewed_at);
  const laterCheck = latestCheck && Date.parse(latestCheck.captured_at) > baselineCheckAt &&
    latestSourceCheckIndex !== resolution?.source_check_index;
  const alias: AliasChange = !laterCheck ? "NO_LATER_SOURCE_CHECK" :
    latestCheck.identity_state !== "confirmed_alias" || !latestCheck.safe_alias ? "SOURCE_CHECK_DISPUTED_HOLD" :
      latestCheck.safe_alias !== baselineAlias || latestCheck.installed_version !== link.installed_version ?
        "ALIAS_CHANGED_RECHECK_HOLD" : "ALIAS_STILL_UNVERIFIED";
  const reopened: ReopenedComparison = !resolution ? newest ? "NEW_OWNER_TRIAL_UNVERIFIED" : "NO_NEW_OWNER_TRIAL" :
    newestTrialIndex === null || newestTrialIndex <= resolution.trial_index ? "NO_TRIAL_AFTER_RESOLUTION" :
      newest?.outcome === "passed" ? "REOPENED_PASS_AFTER_RESOLUTION_UNVERIFIED" :
        "REOPENED_ISSUE_AFTER_RESOLUTION";
  return { decision_index: decisionIndex, case_id: decision.case_id, criterion: decision.criterion,
    link_index: decision.link_index, source_followup_index: decision.source_followup_index,
    source_linked_at: decision.source_linked_at, decision_at: decision.reviewed_at, captured_at: now,
    age_days: Math.floor(age / DAY_MS), age_band: ageBand, overdue: age >= 3 * DAY_MS,
    resolution_index: resolution ? resolutionIndex : null,
    resolution_recorded_at: resolution?.recorded_at ?? null, prior_owner_claim: resolution?.resolution_claim ?? null,
    prior_trial_index: resolution?.trial_index ?? null, newest_trial_index: newestTrialIndex,
    newest_trial_at: newest?.observed_at ?? null, newest_trial_outcome: newest?.outcome ?? null,
    latest_source_check_index: latestSourceCheckIndex,
    reopened_comparison: reopened, source_alias_comparison: alias };
}

function isHistoricallyImported(snapshot: HandoffSnapshot, imported: HandoffImportCounts): boolean {
  return snapshot.decision_index < imported.decisions ||
    snapshot.link_index < imported.links || snapshot.source_followup_index < imported.followups ||
    snapshot.resolution_index !== null && snapshot.resolution_index < imported.resolutions ||
    snapshot.newest_trial_index !== null && snapshot.newest_trial_index < imported.trials ||
    snapshot.latest_source_check_index !== null && snapshot.latest_source_check_index < imported.checks;
}

function handoffRelevant(snapshot: HandoffSnapshot): boolean {
  return snapshot.overdue || snapshot.reopened_comparison === "REOPENED_ISSUE_AFTER_RESOLUTION" ||
    snapshot.reopened_comparison === "REOPENED_PASS_AFTER_RESOLUTION_UNVERIFIED" ||
    snapshot.source_alias_comparison === "ALIAS_CHANGED_RECHECK_HOLD" ||
    snapshot.source_alias_comparison === "SOURCE_CHECK_DISPUTED_HOLD";
}

function reasonMatchesEvidence(snapshot: HandoffSnapshot, reason: ManualHandoffCategory): boolean {
  return reason === "OVERDUE_INDEPENDENT_REVIEW_REQUEST" ? snapshot.overdue :
    reason === "REOPENED_TRIAL_COMPARISON_REQUEST" ? snapshot.reopened_comparison.startsWith("REOPENED_") :
      ["ALIAS_CHANGED_RECHECK_HOLD", "SOURCE_CHECK_DISPUTED_HOLD"].includes(snapshot.source_alias_comparison);
}

export function deriveOverdueHandoffWatch(history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[],
  links: readonly RepeatTrialEvidenceLink[], decisions: readonly FollowupDecision[],
  resolutions: readonly RecurrenceResolutionEvidence[], handoffs: readonly OverdueHandoffEvidence[],
  imported: HandoffImportCounts, now = new Date().toISOString()): HandoffWatchRow[] {
  const rows = decisions.map((decision, index) => {
    const snapshot = captureHandoffSnapshot(history, checks, links, decisions, resolutions, index, now);
    const sourceImported = isHistoricallyImported(snapshot, imported);
    return { ...snapshot, source_imported: sourceImported,
      eligible_for_manual_handoff: handoffRelevant(snapshot) && !sourceImported,
      existing_handoffs: handoffs.filter(event => event.decision_index === index).length,
      section: MANUAL_ROUTES[decision.case_id].section };
  });
  return rows.sort((a, b) => Number(b.overdue) - Number(a.overdue) ||
    Number(b.reopened_comparison === "REOPENED_ISSUE_AFTER_RESOLUTION") -
    Number(a.reopened_comparison === "REOPENED_ISSUE_AFTER_RESOLUTION") ||
    Date.parse(a.decision_at) - Date.parse(b.decision_at));
}

function validateHandoffs(history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[],
  links: readonly RepeatTrialEvidenceLink[], decisions: readonly FollowupDecision[],
  resolutions: readonly RecurrenceResolutionEvidence[], handoffs: readonly OverdueHandoffEvidence[],
  exportedAt?: string): void {
  if (handoffs.length > MAX_HANDOFFS) throw new Error("Private Build 156 handoffs exceed 160 records.");
  let previous = 0;
  const seen = new Set<string>();
  for (const item of handoffs) {
    if (!item || typeof item !== "object" || Object.keys(item).length !== eventKeys.length ||
      Object.keys(item).some(key => !eventKeys.includes(key)) ||
      !Number.isInteger(item.decision_index) || !safeTime(item.captured_at) ||
      !handoffCategories.includes(item.handoff_category) || item.personally_reviewed !== true ||
      item.hold_acknowledged !== true || item.handoff_state !== "PREPARED_PRIVATE_HANDOFF_NOT_SENT" ||
      item.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
      item.independent_review !== "INDEPENDENT_REVIEW_HOLD" || item.closure !== "NOT_AUTHORIZED") {
      throw new Error("Unsafe Build 156 private handoff: witnessed HOLD-only fields are required.");
    }
    const when = Date.parse(item.captured_at);
    if (when < previous || exportedAt && when > Date.parse(exportedAt)) {
      throw new Error("Private handoffs are not in exact chronological order.");
    }
    const snapshot = captureHandoffSnapshot(history, checks, links, decisions, resolutions,
      item.decision_index, item.captured_at);
    if (!handoffRelevant(snapshot) || !reasonMatchesEvidence(snapshot, item.handoff_category) || snapshotKeys.some(key =>
      item[key as keyof HandoffSnapshot] !== snapshot[key as keyof HandoffSnapshot])) {
      throw new Error("Private handoff snapshot contradicts the exact decision, owner trial, age or source alias.");
    }
    const fingerprint = [item.decision_index, item.age_band, item.newest_trial_index,
      item.latest_source_check_index, item.handoff_category].join(":");
    if (seen.has(fingerprint)) throw new Error("Duplicate private handoff snapshot for this exact evidence context.");
    seen.add(fingerprint);
    previous = when;
  }
}

/** A human prepares an offline handoff. This function never sends, assigns or verifies anything. */
export function recordOverdueHandoff(history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[],
  links: readonly RepeatTrialEvidenceLink[], decisions: readonly FollowupDecision[],
  resolutions: readonly RecurrenceResolutionEvidence[], previous: readonly OverdueHandoffEvidence[],
  environment: TrialEnvironment, imported: HandoffImportCounts,
  input: { decision_index: number; category: ManualHandoffCategory; personally_reviewed: boolean;
    hold_acknowledged: boolean }, now = new Date().toISOString()): OverdueHandoffEvidence[] {
  if (!input.personally_reviewed || !input.hold_acknowledged || !safeTime(now)) {
    throw new Error("Personally inspect this exact owner/reviewer chain and acknowledge every HOLD before preparing a private handoff.");
  }
  if (!handoffCategories.includes(input.category)) throw new Error("Select a fixed manual HOLD handoff category.");
  const snapshot = captureHandoffSnapshot(history, checks, links, decisions, resolutions, input.decision_index, now);
  const link = links[snapshot.link_index];
  if (isHistoricallyImported(snapshot, imported) || !environment.installed_windows_witnessed ||
    environment.access === "unknown" || environment.installed_version !== link.installed_version) {
    throw new Error("Historical imported evidence or unwitnessed Windows context requires a new private owner/reviewer chain.");
  }
  if (!handoffRelevant(snapshot)) throw new Error("Only an overdue, reopened or source-disputed HOLD can prepare a Build 156 handoff.");
  if (!reasonMatchesEvidence(snapshot, input.category)) {
    throw new Error("The fixed manual handoff reason must match the witnessed overdue, reopened or source-disputed evidence.");
  }
  if (decisions.some((decision, index) => index > input.decision_index &&
    decision.case_id === snapshot.case_id && decision.link_index === snapshot.link_index &&
    decision.criterion === snapshot.criterion)) {
    throw new Error("A newer independent decision supersedes this handoff; inspect its exact evidence instead.");
  }
  const result: OverdueHandoffEvidence[] = [...previous, { ...snapshot, handoff_category: input.category,
    personally_reviewed: true, hold_acknowledged: true,
    handoff_state: "PREPARED_PRIVATE_HANDOFF_NOT_SENT", field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED" }];
  validateHandoffs(history, checks, links, decisions, resolutions, result);
  return result;
}

export function createOverdueHandoffReceipt(environment: TrialEnvironment, readings: readonly TrialSourceReading[],
  history: readonly TrialObservation[], oldHandoffs: readonly RepairHandoff[], reviews: readonly ReviewEvidenceEvent[],
  checks: readonly SourceIdentityCheck[], links: readonly RepeatTrialEvidenceLink[],
  reassessments: readonly IndependentHoldReassessment[], followups: readonly OwnerEvidenceFollowup[],
  decisions: readonly FollowupDecision[], resolutions: readonly RecurrenceResolutionEvidence[],
  handoffs: readonly OverdueHandoffEvidence[], now = new Date().toISOString()): OverdueHandoffReceipt {
  if (!safeTime(now)) throw new Error("Invalid Build 156 private export timestamp.");
  validateHandoffs(history, checks, links, decisions, resolutions, handoffs, now);
  const result: OverdueHandoffReceipt = { kind: "rosevear_independent_overdue_handoff", schema_version: 1, exported_at: now,
    field_acceptance: "FIELD_ACCEPTANCE_HOLD", independent_review: "INDEPENDENT_REVIEW_HOLD",
    closure: "NOT_AUTHORIZED", automatic_dispatch: "DISABLED", automatic_escalation: "DISABLED",
    evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS",
    recurrence: createRecurrenceResolutionReceipt(environment, readings, history, oldHandoffs, reviews,
      checks, links, reassessments, followups, decisions, resolutions, now),
    overdue_handoffs: handoffs.map(item => ({ ...item })) };
  if (JSON.stringify(result).length > MAX_HANDOFF_BYTES ||
    JSON.stringify(result.recurrence).length > 1_050_000) {
    throw new Error("Private handoff receipt is too large; preserve earlier exports separately.");
  }
  return result;
}

/** Older Build 148–155 receipts remain historical context, never imported fresh authority. */
export function parseOverdueHandoffReceipt(raw: string): ReturnType<typeof parseRecurrenceResolutionReceipt> & {
  overdue_handoffs: OverdueHandoffEvidence[] } {
  if (raw.length > MAX_HANDOFF_BYTES) throw new Error("Private Build 156 receipt exceeds 1.2 MB.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Invalid private Build 156 JSON receipt."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid private handoff envelope.");
  const receipt = value as Record<string, unknown>;
  if (receipt.kind !== "rosevear_independent_overdue_handoff") {
    return { ...parseRecurrenceResolutionReceipt(raw), overdue_handoffs: [] };
  }
  const keys = ["kind", "schema_version", "exported_at", "field_acceptance", "independent_review",
    "closure", "automatic_dispatch", "automatic_escalation", "evidence_authenticity", "recurrence", "overdue_handoffs"];
  if (Object.keys(receipt).length !== keys.length || Object.keys(receipt).some(key => !keys.includes(key)) ||
    receipt.schema_version !== 1 || !safeTime(receipt.exported_at) ||
    receipt.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" || receipt.independent_review !== "INDEPENDENT_REVIEW_HOLD" ||
    receipt.closure !== "NOT_AUTHORIZED" || receipt.automatic_dispatch !== "DISABLED" ||
    receipt.automatic_escalation !== "DISABLED" ||
    receipt.evidence_authenticity !== "UNVERIFIED_PRIVATE_ATTESTATIONS" ||
    !receipt.recurrence || typeof receipt.recurrence !== "object" || !Array.isArray(receipt.overdue_handoffs)) {
    throw new Error("Unsafe or unsupported private Build 156 receipt.");
  }
  const nested = receipt.recurrence as RecurrenceResolutionReceipt;
  if (nested.kind !== "rosevear_independent_recurrence_resolution_watch" ||
    Date.parse(nested.exported_at) > Date.parse(receipt.exported_at as string)) {
    throw new Error("Build 156 requires the complete prior Build 155 HOLD receipt.");
  }
  const prior = parseRecurrenceResolutionReceipt(JSON.stringify(nested));
  const handoffs = receipt.overdue_handoffs as OverdueHandoffEvidence[];
  validateHandoffs(prior.trial.observations, prior.checks, prior.links, prior.decisions,
    prior.resolutions, handoffs, receipt.exported_at as string);
  return { ...prior, overdue_handoffs: handoffs.map(item => ({ ...item })) };
}
