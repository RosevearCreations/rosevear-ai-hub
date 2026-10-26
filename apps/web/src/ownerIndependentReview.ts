/** Build 150: reviewer-authored evidence-gap ledger, never a field certification or closure engine. */
import { validateInstalledVersion, type TrialCaseId, type TrialEnvironment, type TrialObservation, type TrialSourceReading } from "./ownerFieldTrial";
import {
  compareRepairHandoff, createReconciliationReceipt, parseReconciliationReceipt,
  type RepairHandoff, type TrialReconciliationReceipt,
} from "./ownerTrialReconciliation";

export const REVIEW_CRITERIA = [
  { id: "original_finding", label: "Exact original finding", guidance: "Read the original witnessed issue and timestamp, rather than a copied summary." },
  { id: "prepared_handoff", label: "Reviewed manual repair handoff", guidance: "Inspect the prepared handoff and verify it has not executed or automatically closed a repair." },
  { id: "installed_windows", label: "Current installed Windows context", guidance: "Independently inspect the actual Hub version and private access. Source CI does not establish installation." },
  { id: "current_retest", label: "Current owner-observed retest", guidance: "Compare the exact failed case with a later, personally observed pass. A past import is not fresh evidence." },
  { id: "identity_match", label: "Same source and device identity", guidance: "Check the same approved service/device/camera identity, not just similar names or matching counts." },
  { id: "safety_permissions", label: "Safety holds and permissions", guidance: "Confirm permission exclusions, maintenance holds and no-action limits before any field acceptance decision." },
  { id: "independent_witness", label: "Separate independent reviewer", guidance: "A person other than the original trial observer must review; this checkbox remains an unverified private attestation." },
] as const;
export type ReviewCriterion = (typeof REVIEW_CRITERIA)[number]["id"];
export type EvidenceState = "present_claimed" | "gap" | "contradiction";
export type EvidenceStatus = EvidenceState | "missing" | "stale" | "imported_historical";

export interface ReviewEvidenceEvent {
  case_id: TrialCaseId;
  baseline_index: number;
  criterion: ReviewCriterion;
  state: EvidenceState;
  source_observation_index: number;
  recorded_at: string;
  witnessed_by_reviewer: true;
  separate_reviewer_attested: boolean;
}

export interface EvidenceAssessment {
  criteria: { id: ReviewCriterion; label: string; status: EvidenceStatus; recorded_at: string | null }[];
  present_claimed: number;
  gaps: number;
  unresolved_contradictions: number;
  packet_readiness: "EVIDENCE_GAPS_HOLD" | "REVIEW_PACKET_PREPARED_ONLY";
  conditional_closure: "NOT_AUTHORIZED";
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
}

export interface IndependentReviewReceipt {
  kind: "rosevear_owner_independent_review";
  schema_version: 1;
  exported_at: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  conditional_closure: "NOT_AUTHORIZED";
  evidence_authenticity: "UNVERIFIED_OPERATOR_ATTESTATIONS";
  reconciliation: TrialReconciliationReceipt;
  review_events: ReviewEvidenceEvent[];
}

const MAX_EVENTS = 280;
const criterionIds: ReviewCriterion[] = REVIEW_CRITERIA.map(item => item.id);
const states: EvidenceState[] = ["present_claimed", "gap", "contradiction"];

function safeTime(value: unknown): value is string {
  return typeof value === "string" && /^20\d\d-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value)) &&
    Date.parse(value) >= Date.parse("2020-01-01T00:00:00Z") && Date.parse(value) <= Date.now() + 300_000;
}

function lastCaseIndex(history: readonly TrialObservation[], caseId: TrialCaseId): number {
  for (let index = history.length - 1; index >= 0; index--) if (history[index].case_id === caseId) return index;
  return -1;
}

function ensureEvidenceValid(history: readonly TrialObservation[], handoffs: readonly RepairHandoff[],
  events: readonly ReviewEvidenceEvent[], exportedAt?: string) {
  if (events.length > MAX_EVENTS) throw new Error("Independent review evidence has reached its 280-record bound.");
  const monotonic = new Map<string, number>();
  const keys = ["case_id", "baseline_index", "criterion", "state", "source_observation_index", "recorded_at", "witnessed_by_reviewer", "separate_reviewer_attested"];
  for (const event of events) {
    if (!event || typeof event !== "object" || Object.keys(event).some(key => !keys.includes(key)) ||
      !Number.isInteger(event.baseline_index) || !Number.isInteger(event.source_observation_index) ||
      !criterionIds.includes(event.criterion) || !states.includes(event.state) ||
      event.witnessed_by_reviewer !== true || typeof event.separate_reviewer_attested !== "boolean" || !safeTime(event.recorded_at)) {
      throw new Error("Invalid or unsafe independent review evidence.");
    }
    const handoff = handoffs.find(item => item.case_id === event.case_id && item.baseline_index === event.baseline_index);
    const source = history[event.source_observation_index];
    if (!handoff || handoff.stage !== "prepared_for_private_handoff" || !handoff.prepared_at ||
      event.source_observation_index < event.baseline_index || !source || source.case_id !== event.case_id ||
      Date.parse(event.recorded_at) < Date.parse(handoff.prepared_at) || Date.parse(event.recorded_at) < Date.parse(source.observed_at) ||
      (exportedAt && Date.parse(event.recorded_at) > Date.parse(exportedAt)) ||
      (event.criterion === "current_retest" && event.state === "present_claimed" &&
        (event.source_observation_index === event.baseline_index || source.outcome !== "passed")) ||
      (event.separate_reviewer_attested !== (event.criterion === "independent_witness" && event.state === "present_claimed"))) {
      throw new Error("Independent review evidence conflicts with its exact trial baseline or handoff.");
    }
    const key = `${event.case_id}:${event.baseline_index}:${event.criterion}`;
    const previous = monotonic.get(key) ?? 0;
    if (Date.parse(event.recorded_at) < previous) throw new Error("Review evidence must retain chronological order.");
    monotonic.set(key, Date.parse(event.recorded_at));
  }
}

/** All review marks are explicit manual claims, not independent identity verification. */
export function recordIndependentEvidence(history: readonly TrialObservation[], handoffs: readonly RepairHandoff[],
  events: readonly ReviewEvidenceEvent[], environment: TrialEnvironment,
  input: { case_id: TrialCaseId; baseline_index: number; criterion: ReviewCriterion; state: EvidenceState;
    reviewer_witnessed: boolean; separate_reviewer: boolean }, now = new Date().toISOString(),
  importedTrialCount = 0): ReviewEvidenceEvent[] {
  if (!input.reviewer_witnessed || !safeTime(now)) throw new Error("A reviewer must personally witness the selected evidence classification.");
  const handoff = handoffs.find(item => item.case_id === input.case_id && item.baseline_index === input.baseline_index);
  if (!handoff || handoff.stage !== "prepared_for_private_handoff") throw new Error("Prepare the exact owner handoff before an independent evidence review.");
  const sourceIndex = lastCaseIndex(history, input.case_id);
  if (sourceIndex < 0 || !criterionIds.includes(input.criterion) || !states.includes(input.state))
    throw new Error("Unknown case, criterion or evidence state.");
  if (input.state === "present_claimed" && ["installed_windows", "current_retest", "identity_match", "safety_permissions", "independent_witness"].includes(input.criterion) &&
    (!environment.installed_windows_witnessed || environment.access === "unknown" || !environment.installed_version)) {
    throw new Error("Inspect and witness the actual installed Windows Hub before claiming current field evidence.");
  }
  if (input.state === "present_claimed" && ["installed_windows", "current_retest", "identity_match", "safety_permissions", "independent_witness"].includes(input.criterion)) {
    validateInstalledVersion(environment.installed_version);
  }
  if (input.criterion === "current_retest" && input.state === "present_claimed" &&
    compareRepairHandoff(history, handoff).state !== "owner_improvement_review_hold")
    throw new Error("A later owner-observed pass is required; unresolved or absent retests remain a gap.");
  if (input.criterion === "current_retest" && input.state === "present_claimed" && sourceIndex < importedTrialCount)
    throw new Error("Imported historical retests cannot count as fresh. Witness and record a new field check on Windows first.");
  if (input.criterion === "independent_witness" && input.state === "present_claimed" && !input.separate_reviewer)
    throw new Error("A separate reviewer must explicitly attest; this is still not verified identity proof.");
  const updated = [...events, { case_id: input.case_id, baseline_index: input.baseline_index,
    criterion: input.criterion, state: input.state, source_observation_index: sourceIndex,
    recorded_at: now, witnessed_by_reviewer: true as const,
    separate_reviewer_attested: input.criterion === "independent_witness" && input.state === "present_claimed" && input.separate_reviewer }];
  ensureEvidenceValid(history, handoffs, updated);
  return updated;
}

/** importedCount excludes every imported event from fresh readiness; new trial observations stale prior claims. */
export function assessIndependentEvidence(history: readonly TrialObservation[], handoff: RepairHandoff,
  events: readonly ReviewEvidenceEvent[], environment: TrialEnvironment, importedCount = 0,
  importedTrialCount = 0): EvidenceAssessment {
  const latestIndex = lastCaseIndex(history, handoff.case_id);
  const criteria = REVIEW_CRITERIA.map(criterion => {
    let index = -1;
    for (let i = events.length - 1; i >= 0; i--) if (events[i].case_id === handoff.case_id &&
      events[i].baseline_index === handoff.baseline_index && events[i].criterion === criterion.id) { index = i; break; }
    if (index < 0) return { id: criterion.id, label: criterion.label, status: "missing" as const, recorded_at: null };
    const event = events[index];
    const status: EvidenceStatus = index < importedCount ? "imported_historical"
      : event.source_observation_index !== latestIndex ? "stale"
      : event.state;
    return { id: criterion.id, label: criterion.label, status, recorded_at: event.recorded_at };
  });
  const present = criteria.filter(item => item.status === "present_claimed").length;
  // An earlier contradiction against the same source observation cannot be "resolved" by another checkbox.
  // It requires a new physical trial observation and renewed evidence intake.
  const contradictions = events.filter(event => event.case_id === handoff.case_id &&
    event.baseline_index === handoff.baseline_index && event.state === "contradiction" &&
    event.source_observation_index === latestIndex).length;
  const ready = present === REVIEW_CRITERIA.length && handoff.stage === "prepared_for_private_handoff" &&
    contradictions === 0 && latestIndex >= importedTrialCount && environment.installed_windows_witnessed &&
    compareRepairHandoff(history, handoff).state === "owner_improvement_review_hold";
  return { criteria, present_claimed: present, gaps: REVIEW_CRITERIA.length - present,
    unresolved_contradictions: contradictions,
    packet_readiness: ready ? "REVIEW_PACKET_PREPARED_ONLY" : "EVIDENCE_GAPS_HOLD",
    conditional_closure: "NOT_AUTHORIZED", field_acceptance: "FIELD_ACCEPTANCE_HOLD" };
}

export function createIndependentReviewReceipt(environment: TrialEnvironment, readings: readonly TrialSourceReading[],
  history: readonly TrialObservation[], handoffs: readonly RepairHandoff[], events: readonly ReviewEvidenceEvent[],
  now = new Date().toISOString()): IndependentReviewReceipt {
  if (!safeTime(now)) throw new Error("Invalid private independent review export timestamp.");
  ensureEvidenceValid(history, handoffs, events, now);
  return { kind: "rosevear_owner_independent_review", schema_version: 1, exported_at: now,
    field_acceptance: "FIELD_ACCEPTANCE_HOLD", conditional_closure: "NOT_AUTHORIZED",
    evidence_authenticity: "UNVERIFIED_OPERATOR_ATTESTATIONS",
    reconciliation: createReconciliationReceipt(environment, readings, history, handoffs, now),
    review_events: events.map(event => ({ ...event })) };
}

export function parseIndependentReviewReceipt(raw: string): {
  trial: TrialReconciliationReceipt["trial"]; handoffs: RepairHandoff[]; events: ReviewEvidenceEvent[];
} {
  if (raw.length > 360_000) throw new Error("Private independent review receipt exceeds 360 KB.");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("Private independent review receipt is not valid JSON."); }
  if (!parsed || typeof parsed !== "object") throw new Error("Invalid independent review receipt envelope.");
  const data = parsed as Record<string, unknown>;
  if (data.kind !== "rosevear_owner_independent_review") {
    const prior = parseReconciliationReceipt(raw);
    return { trial: prior.trial, handoffs: prior.handoffs, events: [] };
  }
  if (data.schema_version !== 1 || data.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
    data.conditional_closure !== "NOT_AUTHORIZED" || data.evidence_authenticity !== "UNVERIFIED_OPERATOR_ATTESTATIONS" ||
    !safeTime(data.exported_at) || !data.reconciliation || typeof data.reconciliation !== "object" ||
    !Array.isArray(data.review_events)) throw new Error("Unsupported review receipt or unsafe closure claim.");
  const prior = parseReconciliationReceipt(JSON.stringify(data.reconciliation));
  if (Date.parse(prior.trial.exported_at) > Date.parse(data.exported_at as string)) throw new Error("Review receipt predates the source trial.");
  const events = data.review_events as ReviewEvidenceEvent[];
  ensureEvidenceValid(prior.trial.observations, prior.handoffs, events, data.exported_at as string);
  return { trial: prior.trial, handoffs: prior.handoffs, events: events.map(event => ({ ...event })) };
}
