/** Build 157: exact private handoff receipt comparison and manually witnessed follow-up aging. */
import { type TrialEnvironment, type TrialObservation, type TrialSourceReading } from "./ownerFieldTrial";
import { type RepairHandoff } from "./ownerTrialReconciliation";
import { type ReviewEvidenceEvent } from "./ownerIndependentReview";
import { type SourceIdentityCheck } from "./ownerFieldRouting";
import { type IndependentHoldReassessment, type RepeatTrialEvidenceLink } from "./ownerRepeatTrialReassessment";
import { type OwnerEvidenceFollowup } from "./ownerReassessmentFollowup";
import { type FollowupDecision } from "./ownerFollowupDecisionReplay";
import { type RecurrenceResolutionEvidence } from "./ownerRecurrenceResolution";
import { createOverdueHandoffReceipt, parseOverdueHandoffReceipt, type HandoffImportCounts,
  type OverdueHandoffEvidence, type OverdueHandoffReceipt } from "./ownerOverdueHandoff";

export type HandoffDiscrepancy = "REOPENED_TRIAL_CHANGED" | "SOURCE_ALIAS_STATE_CHANGED" |
  "OWNER_CLAIM_CHANGED" | "OWNER_TRIAL_CHANGED" | "INDEPENDENT_FOLLOWUP_AGED";
export type HandoffFollowupCategory = "REQUEST_INDEPENDENT_RECHECK" |
  "REQUEST_REOPENED_TRIAL_WITNESS" | "REQUEST_SOURCE_ALIAS_WITNESS";
export type HandoffFollowupBand = "UNDER_24_HOURS" | "ONE_TO_THREE_DAYS" |
  "THREE_TO_SEVEN_DAYS" | "OVER_SEVEN_DAYS";

export interface HandoffComparison {
  baseline_handoff_index: number;
  latest_handoff_index: number;
  decision_index: number;
  case_id: OverdueHandoffEvidence["case_id"];
  original_decision_at: string;
  baseline_handoff_at: string;
  latest_handoff_at: string;
  original_followup_age_days: number;
  followup_age_band: HandoffFollowupBand;
  latest_handoff_age_days: number;
  discrepancies: HandoffDiscrepancy[];
  followup_outstanding: true;
}

export interface HandoffFollowupEvent extends HandoffComparison {
  recorded_at: string;
  followup_category: HandoffFollowupCategory;
  personally_compared: true;
  hold_acknowledged: true;
  state: "PRIVATE_RECHECK_NOTE_NOT_SENT";
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
}

export interface HandoffReconciliationReceipt {
  kind: "rosevear_independent_handoff_reconciliation";
  schema_version: 1;
  exported_at: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
  automatic_dispatch: "DISABLED";
  scheduled_followup: "DISABLED";
  evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS";
  handoff_receipt: OverdueHandoffReceipt;
  followup_reviews: HandoffFollowupEvent[];
}

const DAY = 86_400_000;
export const MAX_RECONCILIATION_BYTES = 1_450_000;
const MAX_REVIEWS = 160;
export const HANDOFF_FOLLOWUP_CATEGORIES: readonly HandoffFollowupCategory[] = [
  "REQUEST_INDEPENDENT_RECHECK", "REQUEST_REOPENED_TRIAL_WITNESS", "REQUEST_SOURCE_ALIAS_WITNESS",
];
const comparisonKeys = ["baseline_handoff_index", "latest_handoff_index", "decision_index", "case_id",
  "original_decision_at", "baseline_handoff_at", "latest_handoff_at", "original_followup_age_days",
  "followup_age_band", "latest_handoff_age_days", "discrepancies", "followup_outstanding"];
const eventKeys = [...comparisonKeys, "recorded_at", "followup_category", "personally_compared",
  "hold_acknowledged", "state", "field_acceptance", "independent_review", "closure"];

function validTime(value: unknown): value is string {
  return typeof value === "string" && /^20\d\d-\d\d-\d\dT/.test(value) &&
    Number.isFinite(Date.parse(value)) && Date.parse(value) >= Date.parse("2020-01-01T00:00:00Z") &&
    Date.parse(value) <= Date.now() + 300_000;
}

function ageBand(milliseconds: number): HandoffFollowupBand {
  return milliseconds < DAY ? "UNDER_24_HOURS" : milliseconds < DAY * 3 ? "ONE_TO_THREE_DAYS" :
    milliseconds < DAY * 7 ? "THREE_TO_SEVEN_DAYS" : "OVER_SEVEN_DAYS";
}

/** Two distinct snapshots of the same independent decision; never infer an accepted outcome. */
export function compareIndependentHandoffs(handoffs: readonly OverdueHandoffEvidence[],
  baselineIndex: number, latestIndex: number, at = new Date().toISOString()): HandoffComparison {
  const baseline = handoffs[baselineIndex];
  const latest = handoffs[latestIndex];
  if (!baseline || !latest || !Number.isInteger(baselineIndex) || !Number.isInteger(latestIndex) ||
    baselineIndex < 0 || latestIndex <= baselineIndex ||
    baseline.decision_index !== latest.decision_index || baseline.case_id !== latest.case_id ||
    baseline.decision_at !== latest.decision_at || !validTime(at) ||
    Date.parse(at) < Date.parse(latest.captured_at) ||
    Date.parse(latest.captured_at) <= Date.parse(baseline.captured_at)) {
    throw new Error("Two chronological handoffs of the same exact independent HOLD decision are required.");
  }
  const age = Date.parse(at) - Date.parse(baseline.captured_at);
  const discrepancies: HandoffDiscrepancy[] = [];
  if (baseline.reopened_comparison !== latest.reopened_comparison) discrepancies.push("REOPENED_TRIAL_CHANGED");
  if (baseline.source_alias_comparison !== latest.source_alias_comparison ||
    baseline.latest_source_check_index !== latest.latest_source_check_index) discrepancies.push("SOURCE_ALIAS_STATE_CHANGED");
  if (baseline.prior_owner_claim !== latest.prior_owner_claim ||
    baseline.resolution_index !== latest.resolution_index) discrepancies.push("OWNER_CLAIM_CHANGED");
  if (baseline.newest_trial_index !== latest.newest_trial_index ||
    baseline.newest_trial_outcome !== latest.newest_trial_outcome) discrepancies.push("OWNER_TRIAL_CHANGED");
  if (age >= DAY * 3) discrepancies.push("INDEPENDENT_FOLLOWUP_AGED");
  return { baseline_handoff_index: baselineIndex, latest_handoff_index: latestIndex,
    decision_index: baseline.decision_index, case_id: baseline.case_id,
    original_decision_at: baseline.decision_at, baseline_handoff_at: baseline.captured_at,
    latest_handoff_at: latest.captured_at, original_followup_age_days: Math.floor(age / DAY),
    followup_age_band: ageBand(age), latest_handoff_age_days: Math.floor((Date.parse(at) -
      Date.parse(latest.captured_at)) / DAY), discrepancies, followup_outstanding: true };
}

/** Prefix-only: a previous private receipt is a historical snapshot, not trusted source identity. */
export function comparePrivateHandoffReceipts(previousRaw: string, currentRaw: string): {
  previous_handoffs: number; current_handoffs: number; new_handoffs: number;
  comparison: HandoffComparison | null;
} {
  const previous = parseOverdueHandoffReceipt(previousRaw);
  const current = parseOverdueHandoffReceipt(currentRaw);
  const streams = ["handoffs", "events", "checks", "links", "reassessments",
    "followups", "decisions", "resolutions", "overdue_handoffs"] as const;
  const priorTrials = previous.trial;
  const currentTrials = current.trial;
  const samePrefix = (older: readonly unknown[], newer: readonly unknown[]) => older.length <= newer.length &&
    older.every((item, index) => JSON.stringify(item) === JSON.stringify(newer[index]));
  if (!samePrefix(priorTrials.observations, currentTrials.observations) ||
    !samePrefix(priorTrials.source_readings, currentTrials.source_readings) ||
    streams.some(key => !samePrefix(previous[key], current[key])) ||
    previous.trial.environment.installed_version !== current.trial.environment.installed_version ||
    previous.trial.environment.access !== current.trial.environment.access ||
    previous.overdue_handoffs.length === 0 ||
    Date.parse(previous.overdue_handoffs[previous.overdue_handoffs.length - 1].captured_at) >
      Date.parse(current.overdue_handoffs[current.overdue_handoffs.length - 1]?.captured_at ?? "") ||
    previous.overdue_handoffs.length >= current.overdue_handoffs.length) {
    throw new Error("The older private receipt must be an exact, nonempty evidence prefix of the newer handoff receipt. Neither receipt is independently authenticated.");
  }
  const firstNewIndex = previous.overdue_handoffs.length;
  const latest = current.overdue_handoffs;
  let comparison: HandoffComparison | null = null;
  for (let index = firstNewIndex; index < latest.length; index++) {
    for (let baseline = firstNewIndex - 1; baseline >= 0; baseline--) {
      if (latest[index].decision_index === latest[baseline].decision_index &&
        Date.parse(latest[index].captured_at) > Date.parse(latest[baseline].captured_at)) {
        comparison = compareIndependentHandoffs(latest, baseline, index, latest[index].captured_at);
        break;
      }
    }
    if (comparison) break;
  }
  return { previous_handoffs: firstNewIndex, current_handoffs: latest.length,
    new_handoffs: latest.length - firstNewIndex, comparison };
}

function validateReviews(handoffs: readonly OverdueHandoffEvidence[], reviews: readonly HandoffFollowupEvent[],
  exportedAt?: string): void {
  if (reviews.length > MAX_REVIEWS) throw new Error("Private Build 157 follow-up reviews exceed 160 records.");
  let previous = 0;
  const fingerprints = new Set<string>();
  for (const review of reviews) {
    if (!review || typeof review !== "object" || Object.keys(review).length !== eventKeys.length ||
      Object.keys(review).some(key => !eventKeys.includes(key)) || !validTime(review.recorded_at) ||
      !HANDOFF_FOLLOWUP_CATEGORIES.includes(review.followup_category) ||
      review.personally_compared !== true || review.hold_acknowledged !== true ||
      review.state !== "PRIVATE_RECHECK_NOTE_NOT_SENT" || review.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
      review.independent_review !== "INDEPENDENT_REVIEW_HOLD" || review.closure !== "NOT_AUTHORIZED") {
      throw new Error("Unsafe Build 157 private follow-up: exact witnessed HOLD-only fields are required.");
    }
    const at = Date.parse(review.recorded_at);
    if (at < previous || exportedAt && at > Date.parse(exportedAt)) {
      throw new Error("Build 157 follow-ups are not in exact chronological order.");
    }
    const expected = compareIndependentHandoffs(handoffs, review.baseline_handoff_index,
      review.latest_handoff_index, review.recorded_at);
    if (comparisonKeys.some(key => JSON.stringify(review[key as keyof HandoffComparison]) !==
      JSON.stringify(expected[key as keyof HandoffComparison]))) {
      throw new Error("Build 157 follow-up contradicts the immutable handoff indices, discrepancy or age.");
    }
    const fingerprint = [review.baseline_handoff_index, review.latest_handoff_index,
      review.followup_category].join(":");
    if (fingerprints.has(fingerprint)) throw new Error("Duplicate private follow-up for the exact handoff pair and reason.");
    fingerprints.add(fingerprint);
    previous = at;
  }
}

/** A local owner/reviewer comparison only; no task, message, schedule or authorization. */
export function recordHandoffFollowup(handoffs: readonly OverdueHandoffEvidence[],
  links: readonly RepeatTrialEvidenceLink[], previous: readonly HandoffFollowupEvent[], environment: TrialEnvironment,
  imported: Pick<HandoffImportCounts, "handoffs"> & { reviews: number },
  input: { baseline_handoff_index: number; latest_handoff_index: number;
    category: HandoffFollowupCategory; personally_compared: boolean; hold_acknowledged: boolean },
  now = new Date().toISOString()): HandoffFollowupEvent[] {
  if (!input.personally_compared || !input.hold_acknowledged ||
    !HANDOFF_FOLLOWUP_CATEGORIES.includes(input.category)) {
    throw new Error("Personally compare both source handoffs and acknowledge all permanent HOLDs.");
  }
  const comparison = compareIndependentHandoffs(handoffs, input.baseline_handoff_index,
    input.latest_handoff_index, now);
  const latest = handoffs[input.latest_handoff_index];
  if (input.latest_handoff_index < imported.handoffs ||
    !environment.installed_windows_witnessed || environment.access === "unknown" ||
    environment.installed_version !== links[latest.link_index]?.installed_version || !latest ||
    previous.length < imported.reviews) {
    throw new Error("An imported handoff or unwitnessed installed Windows context cannot authorize a fresh comparison.");
  }
  if (input.category === "REQUEST_REOPENED_TRIAL_WITNESS" &&
    !comparison.discrepancies.some(item => item === "REOPENED_TRIAL_CHANGED" || item === "OWNER_TRIAL_CHANGED") ||
    input.category === "REQUEST_SOURCE_ALIAS_WITNESS" &&
    !comparison.discrepancies.includes("SOURCE_ALIAS_STATE_CHANGED")) {
    throw new Error("The follow-up reason must match a real, exact handoff discrepancy.");
  }
  const updated: HandoffFollowupEvent[] = [...previous, { ...comparison, recorded_at: now,
    followup_category: input.category, personally_compared: true, hold_acknowledged: true,
    state: "PRIVATE_RECHECK_NOTE_NOT_SENT", field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED" }];
  validateReviews(handoffs, updated);
  return updated;
}

export function createHandoffReconciliationReceipt(environment: TrialEnvironment, readings: readonly TrialSourceReading[],
  history: readonly TrialObservation[], oldHandoffs: readonly RepairHandoff[], reviews: readonly ReviewEvidenceEvent[],
  checks: readonly SourceIdentityCheck[], links: readonly RepeatTrialEvidenceLink[],
  reassessments: readonly IndependentHoldReassessment[], followups: readonly OwnerEvidenceFollowup[],
  decisions: readonly FollowupDecision[], resolutions: readonly RecurrenceResolutionEvidence[],
  handoffs: readonly OverdueHandoffEvidence[], followupReviews: readonly HandoffFollowupEvent[],
  now = new Date().toISOString()): HandoffReconciliationReceipt {
  if (!validTime(now)) throw new Error("Invalid private Build 157 export time.");
  validateReviews(handoffs, followupReviews, now);
  const handoffReceipt = createOverdueHandoffReceipt(environment, readings, history, oldHandoffs,
    reviews, checks, links, reassessments, followups, decisions, resolutions, handoffs, now);
  const result: HandoffReconciliationReceipt = { kind: "rosevear_independent_handoff_reconciliation",
    schema_version: 1, exported_at: now, field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED",
    automatic_dispatch: "DISABLED", scheduled_followup: "DISABLED",
    evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS", handoff_receipt: handoffReceipt,
    followup_reviews: followupReviews.map(item => ({ ...item, discrepancies: [...item.discrepancies] })) };
  if (JSON.stringify(result).length > MAX_RECONCILIATION_BYTES) {
    throw new Error("Private Build 157 receipt is too large; preserve earlier private exports separately.");
  }
  return result;
}

/** Imports old receipts as historic evidence; no imported note grants fresh reviewer rights. */
export function parseHandoffReconciliationReceipt(raw: string): ReturnType<typeof parseOverdueHandoffReceipt> & {
  followup_reviews: HandoffFollowupEvent[] } {
  if (raw.length > MAX_RECONCILIATION_BYTES) throw new Error("Private Build 157 receipt exceeds 1.45 MB.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Invalid private Build 157 JSON receipt."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid private Build 157 receipt envelope.");
  const receipt = value as Record<string, unknown>;
  if (receipt.kind !== "rosevear_independent_handoff_reconciliation") {
    return { ...parseOverdueHandoffReceipt(raw), followup_reviews: [] };
  }
  const keys = ["kind", "schema_version", "exported_at", "field_acceptance", "independent_review",
    "closure", "automatic_dispatch", "scheduled_followup", "evidence_authenticity", "handoff_receipt",
    "followup_reviews"];
  if (Object.keys(receipt).length !== keys.length || Object.keys(receipt).some(key => !keys.includes(key)) ||
    receipt.schema_version !== 1 || !validTime(receipt.exported_at) ||
    receipt.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
    receipt.independent_review !== "INDEPENDENT_REVIEW_HOLD" || receipt.closure !== "NOT_AUTHORIZED" ||
    receipt.automatic_dispatch !== "DISABLED" || receipt.scheduled_followup !== "DISABLED" ||
    receipt.evidence_authenticity !== "UNVERIFIED_PRIVATE_ATTESTATIONS" ||
    !receipt.handoff_receipt || typeof receipt.handoff_receipt !== "object" ||
    !Array.isArray(receipt.followup_reviews)) {
    throw new Error("Unsafe or unsupported private Build 157 HOLD receipt.");
  }
  const nested = receipt.handoff_receipt as OverdueHandoffReceipt;
  if (nested.kind !== "rosevear_independent_overdue_handoff" ||
    Date.parse(nested.exported_at) > Date.parse(receipt.exported_at as string)) {
    throw new Error("Build 157 requires the complete prior Build 156 HOLD handoff receipt.");
  }
  const prior = parseOverdueHandoffReceipt(JSON.stringify(nested));
  const reviews = receipt.followup_reviews as HandoffFollowupEvent[];
  validateReviews(prior.overdue_handoffs, reviews, receipt.exported_at as string);
  return { ...prior, followup_reviews: reviews.map(item => ({ ...item, discrepancies: [...item.discrepancies] })) };
}
