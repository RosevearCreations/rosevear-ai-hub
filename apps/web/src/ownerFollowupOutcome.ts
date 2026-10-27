/** Build 158: private reassessment of witnessed follow-up outcomes; never a closure decision. */
import type { TrialEnvironment, TrialObservation } from "./ownerFieldTrial";
import type { SourceIdentityCheck } from "./ownerFieldRouting";
import type { HandoffFollowupEvent, HandoffReconciliationReceipt } from "./ownerHandoffReconciliation";
import { parseHandoffReconciliationReceipt } from "./ownerHandoffReconciliation";

export type OutcomeClassification = "ISSUE_RECURRED" | "OWNER_IMPROVEMENT_UNVERIFIED" | "OBSERVATION_BLOCKED";
export interface FollowupOutcomeEvent {
  review_index: number;
  observation_index: number;
  source_check_index: number | null;
  recorded_at: string;
  observation_at: string;
  outcome: OutcomeClassification;
  historical_exception_continues: true;
  personally_witnessed: true;
  hold_acknowledged: true;
  state: "PRIVATE_REASSESSMENT_NOT_SENT";
  closure: "NOT_AUTHORIZED";
}
export interface FollowupOutcomeReceipt {
  kind: "rosevear_independent_followup_outcome";
  schema_version: 1;
  exported_at: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
  automatic_dispatch: "DISABLED";
  scheduled_followup: "DISABLED";
  evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS";
  reconciliation_receipt: HandoffReconciliationReceipt;
  outcome_reviews: FollowupOutcomeEvent[];
}
export const MAX_OUTCOME_BYTES = 1_650_000;
const eventKeys = ["review_index", "observation_index", "source_check_index", "recorded_at",
  "observation_at", "outcome", "historical_exception_continues", "personally_witnessed",
  "hold_acknowledged", "state", "closure"];
function time(value: unknown): value is string {
  return typeof value === "string" && /^20\d\d-\d\d-\d\dT/.test(value) &&
    Number.isFinite(Date.parse(value)) && Date.parse(value) >= Date.parse("2020-01-01T00:00:00Z") &&
    Date.parse(value) <= Date.now() + 300_000;
}
function classification(observation: TrialObservation): OutcomeClassification {
  return observation.outcome === "passed" ? "OWNER_IMPROVEMENT_UNVERIFIED" :
    observation.outcome === "issue" ? "ISSUE_RECURRED" : "OBSERVATION_BLOCKED";
}
export function validateOutcomeReviews(reviews: readonly FollowupOutcomeEvent[], followups: readonly HandoffFollowupEvent[],
  observations: readonly TrialObservation[], checks: readonly SourceIdentityCheck[], exportedAt?: string): void {
  if (reviews.length > 120) throw new Error("Build 158 permits at most 120 private outcomes.");
  const seen = new Set<string>();
  let previous = 0;
  for (const event of reviews) {
    if (!event || Object.keys(event).length !== eventKeys.length ||
      Object.keys(event).some(key => !eventKeys.includes(key)) ||
      !Number.isInteger(event.review_index) || !Number.isInteger(event.observation_index) ||
      !time(event.recorded_at) || event.historical_exception_continues !== true ||
      event.personally_witnessed !== true || event.hold_acknowledged !== true ||
      event.state !== "PRIVATE_REASSESSMENT_NOT_SENT" || event.closure !== "NOT_AUTHORIZED") {
      throw new Error("Invalid Build 158 HOLD-only reassessment event.");
    }
    const followup = followups[event.review_index];
    const observation = observations[event.observation_index];
    const check = event.source_check_index === null ? null : checks[event.source_check_index];
    if (!followup || !observation || observation.case_id !== followup.case_id ||
      event.observation_at !== observation.observed_at ||
      event.outcome !== classification(observation) ||
      Date.parse(observation.observed_at) <= Date.parse(followup.recorded_at) ||
      Date.parse(event.recorded_at) < Date.parse(observation.observed_at) ||
      Date.parse(event.recorded_at) < previous ||
      exportedAt && Date.parse(event.recorded_at) > Date.parse(exportedAt) ||
      event.source_check_index !== null && (!Number.isInteger(event.source_check_index) || !check ||
        check.case_id !== observation.case_id || Date.parse(check.captured_at) > Date.parse(event.recorded_at))) {
      throw new Error("Build 158 evidence must refer to a later exact same-case witnessed observation.");
    }
    const key = `${event.review_index}:${event.observation_index}`;
    if (seen.has(key)) throw new Error("Duplicate Build 158 follow-up/outcome pair.");
    seen.add(key);
    previous = Date.parse(event.recorded_at);
  }
}
export function recordFollowupOutcome(followups: readonly HandoffFollowupEvent[], observations: readonly TrialObservation[],
  checks: readonly SourceIdentityCheck[], previous: readonly FollowupOutcomeEvent[], environment: TrialEnvironment,
  imported: { reviews: number; observations: number; outcomes: number },
  input: { review_index: number; observation_index: number; source_check_index: number | null;
    personally_witnessed: boolean; hold_acknowledged: boolean }, now = new Date().toISOString()): FollowupOutcomeEvent[] {
  if (!environment.installed_windows_witnessed || !environment.installed_version ||
    environment.access === "unknown" || !input.personally_witnessed || !input.hold_acknowledged ||
    input.review_index < imported.reviews || input.observation_index < imported.observations ||
    previous.length < imported.outcomes || !time(now)) {
    throw new Error("Fresh Windows witnessing, a non-imported follow-up and a new observation are required.");
  }
  const observation = observations[input.observation_index];
  if (!observation) throw new Error("Select a later witnessed owner observation.");
  const event: FollowupOutcomeEvent = { review_index: input.review_index,
    observation_index: input.observation_index, source_check_index: input.source_check_index,
    recorded_at: now, observation_at: observation.observed_at, outcome: classification(observation),
    historical_exception_continues: true, personally_witnessed: true, hold_acknowledged: true,
    state: "PRIVATE_REASSESSMENT_NOT_SENT", closure: "NOT_AUTHORIZED" };
  const updated = [...previous, event];
  validateOutcomeReviews(updated, followups, observations, checks);
  return updated;
}
export function createFollowupOutcomeReceipt(reconciliation: HandoffReconciliationReceipt,
  outcomes: readonly FollowupOutcomeEvent[], now = new Date().toISOString()): FollowupOutcomeReceipt {
  if (!time(now) || Date.parse(now) < Date.parse(reconciliation.exported_at)) throw new Error("Invalid Build 158 export time.");
  const prior = parseHandoffReconciliationReceipt(JSON.stringify(reconciliation));
  validateOutcomeReviews(outcomes, prior.followup_reviews, prior.trial.observations, prior.checks, now);
  const receipt: FollowupOutcomeReceipt = { kind: "rosevear_independent_followup_outcome", schema_version: 1,
    exported_at: now, field_acceptance: "FIELD_ACCEPTANCE_HOLD", independent_review: "INDEPENDENT_REVIEW_HOLD",
    closure: "NOT_AUTHORIZED", automatic_dispatch: "DISABLED", scheduled_followup: "DISABLED",
    evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS", reconciliation_receipt: reconciliation,
    outcome_reviews: outcomes.map(item => ({ ...item })) };
  if (JSON.stringify(receipt).length > MAX_OUTCOME_BYTES) throw new Error("Build 158 private receipt exceeds 1.65 MB.");
  return receipt;
}
export function parseFollowupOutcomeReceipt(raw: string): ReturnType<typeof parseHandoffReconciliationReceipt> &
  { outcome_reviews: FollowupOutcomeEvent[] } {
  if (raw.length > MAX_OUTCOME_BYTES) throw new Error("Build 158 private receipt exceeds 1.65 MB.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Invalid private Build 158 JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid private receipt.");
  const receipt = value as Record<string, unknown>;
  if (receipt.kind !== "rosevear_independent_followup_outcome") {
    return { ...parseHandoffReconciliationReceipt(raw), outcome_reviews: [] };
  }
  const keys = ["kind", "schema_version", "exported_at", "field_acceptance", "independent_review",
    "closure", "automatic_dispatch", "scheduled_followup", "evidence_authenticity", "reconciliation_receipt", "outcome_reviews"];
  if (Object.keys(receipt).length !== keys.length || Object.keys(receipt).some(key => !keys.includes(key)) ||
    receipt.schema_version !== 1 || !time(receipt.exported_at) ||
    receipt.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" || receipt.independent_review !== "INDEPENDENT_REVIEW_HOLD" ||
    receipt.closure !== "NOT_AUTHORIZED" || receipt.automatic_dispatch !== "DISABLED" ||
    receipt.scheduled_followup !== "DISABLED" || receipt.evidence_authenticity !== "UNVERIFIED_PRIVATE_ATTESTATIONS" ||
    !receipt.reconciliation_receipt || !Array.isArray(receipt.outcome_reviews)) {
    throw new Error("Unsafe Build 158 HOLD receipt.");
  }
  const nested = receipt.reconciliation_receipt as HandoffReconciliationReceipt;
  if (Date.parse(nested.exported_at) > Date.parse(receipt.exported_at as string)) throw new Error("Invalid nested export chronology.");
  const prior = parseHandoffReconciliationReceipt(JSON.stringify(nested));
  const outcomes = receipt.outcome_reviews as FollowupOutcomeEvent[];
  validateOutcomeReviews(outcomes, prior.followup_reviews, prior.trial.observations, prior.checks, receipt.exported_at as string);
  return { ...prior, outcome_reviews: outcomes.map(item => ({ ...item })) };
}
