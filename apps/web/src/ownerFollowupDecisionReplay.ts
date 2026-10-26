/** Build 154: private follow-up replay and reviewer decision provenance, never release authority. */
import { type TrialCaseId, type TrialEnvironment, type TrialObservation, type TrialSourceReading } from "./ownerFieldTrial";
import { type RepairHandoff } from "./ownerTrialReconciliation";
import { REVIEW_CRITERIA, type ReviewEvidenceEvent } from "./ownerIndependentReview";
import { MANUAL_ROUTES, type SourceIdentityCheck } from "./ownerFieldRouting";
import { type IndependentHoldReassessment, type RepeatTrialEvidenceLink } from "./ownerRepeatTrialReassessment";
import { createFollowupReceipt, deriveReassessmentExceptionQueue, parseFollowupReceipt,
  type ExceptionCriterion, type ExceptionStatus, type FollowupReceipt, type OwnerEvidenceFollowup } from "./ownerReassessmentFollowup";

export type DecisionChoice = "REPEAT_TRIAL_REQUESTED" | "RECHECK_SOURCE_IDENTITY" |
  "RECONCILE_REVIEWER_CONTRADICTION" | "OWNER_NOTE_REQUIRED" | "INDEPENDENT_FIELD_HOLD_REVIEW";
export type RecurrenceSignal = "REPEATED_OWNER_FOLLOWUP" | "REPEATED_REVIEW_DECISION" |
  "REVIEWER_CONTRADICTION" | "SOURCE_IDENTITY_RECURRENCE" | "SUPERSEDED_TRIAL" |
  "WINDOWS_RECHECK" | "IMPORTED_HISTORY" | "EVIDENCE_STATUS_CHANGED";
export type DecisionSnapshotStatus = ExceptionStatus | "CURRENT_REVIEW_CLAIMED_HOLD";

export interface FollowupDecision {
  source_followup_index: number;
  link_index: number;
  case_id: TrialCaseId;
  criterion: ExceptionCriterion;
  source_followup_at: string;
  source_linked_at: string;
  status_at_decision: DecisionSnapshotStatus;
  decision: DecisionChoice;
  reviewed_at: string;
  reviewer_witnessed: true;
  separate_reviewer_attested: true;
  review_state: "INDEPENDENT_FOLLOWUP_REVIEW_HOLD";
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  closure: "NOT_AUTHORIZED";
}

export interface FollowupDecisionReplay {
  link_index: number;
  case_id: TrialCaseId;
  criterion: ExceptionCriterion;
  source_followup_index: number;
  first_owner_note_at: string;
  latest_owner_note_at: string;
  first_linked_at: string;
  historical_status: ExceptionStatus;
  current_status: DecisionSnapshotStatus;
  owner_notes: number;
  decisions: number;
  latest_decision: DecisionChoice | null;
  recurrence: RecurrenceSignal[];
  review_priority: "RECURRING_HOLD_RECHECK" | "HISTORICAL_REWITNESS_REQUIRED" | "MANUAL_REVIEW_HOLD";
  suggested_action: DecisionChoice;
  section: string;
  source_imported: boolean;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  closure: "NOT_AUTHORIZED";
}

export interface DecisionReplayReceipt {
  kind: "rosevear_independent_followup_decision_replay";
  schema_version: 1;
  exported_at: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
  automatic_dispatch: "DISABLED";
  evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS";
  followup: FollowupReceipt;
  decisions: FollowupDecision[];
}

const validCriteria: ExceptionCriterion[] = [...REVIEW_CRITERIA.map(item => item.id), "field_hold"];
const validStatuses: DecisionSnapshotStatus[] = ["MISSING_CURRENT_EVIDENCE", "REVIEWER_GAP",
  "REVIEWER_CONTRADICTION", "IMPORTED_REVIEW_CLAIM", "RETEST_SUPERSEDED", "IMPORTED_LINK_HOLD",
  "SOURCE_CONTEXT_HOLD", "REOPENED_AFTER_PACKET", "PACKET_UNVERIFIED_HOLD", "CURRENT_REVIEW_CLAIMED_HOLD"];
const decisionsAllowed: DecisionChoice[] = ["REPEAT_TRIAL_REQUESTED", "RECHECK_SOURCE_IDENTITY",
  "RECONCILE_REVIEWER_CONTRADICTION", "OWNER_NOTE_REQUIRED", "INDEPENDENT_FIELD_HOLD_REVIEW"];
const eventKeys = ["source_followup_index", "link_index", "case_id", "criterion", "source_followup_at",
  "source_linked_at", "status_at_decision", "decision", "reviewed_at", "reviewer_witnessed",
  "separate_reviewer_attested", "review_state", "field_acceptance", "closure"];
const MAX_DECISIONS = 240;

function safeTime(value: unknown): value is string {
  return typeof value === "string" && /^20\d\d-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value)) &&
    Date.parse(value) >= Date.parse("2020-01-01T00:00:00Z") && Date.parse(value) <= Date.now() + 300_000;
}

function validateDecisions(links: readonly RepeatTrialEvidenceLink[], followups: readonly OwnerEvidenceFollowup[],
  decisions: readonly FollowupDecision[], exportedAt?: string): void {
  if (decisions.length > MAX_DECISIONS) throw new Error("Private decision replay exceeds 240 records.");
  let previous = 0;
  const seen = new Set<number>();
  for (const item of decisions) {
    if (!item || typeof item !== "object" || Object.keys(item).some(key => !eventKeys.includes(key)) ||
      !Number.isInteger(item.source_followup_index) || !Number.isInteger(item.link_index) ||
      !Object.hasOwn(MANUAL_ROUTES, item.case_id) || !validCriteria.includes(item.criterion) ||
      !validStatuses.includes(item.status_at_decision) || !decisionsAllowed.includes(item.decision) ||
      item.reviewer_witnessed !== true || item.separate_reviewer_attested !== true ||
      item.review_state !== "INDEPENDENT_FOLLOWUP_REVIEW_HOLD" ||
      item.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" || item.closure !== "NOT_AUTHORIZED" ||
      !safeTime(item.source_followup_at) || !safeTime(item.source_linked_at) || !safeTime(item.reviewed_at)) {
      throw new Error("Unsafe private decision record; only fixed review fields and HOLD statuses are accepted.");
    }
    const source = followups[item.source_followup_index];
    const link = links[item.link_index];
    const when = Date.parse(item.reviewed_at);
    if (!source || !link || seen.has(item.source_followup_index) || source.link_index !== item.link_index ||
      source.case_id !== item.case_id || source.criterion !== item.criterion ||
      source.reviewed_at !== item.source_followup_at || source.source_linked_at !== item.source_linked_at ||
      link.case_id !== item.case_id || link.linked_at !== item.source_linked_at ||
      when < Date.parse(source.reviewed_at) || when < previous ||
      (exportedAt && when > Date.parse(exportedAt))) {
      throw new Error("Decision replay has duplicate, missing or conflicting exact follow-up provenance.");
    }
    previous = when;
    seen.add(item.source_followup_index);
  }
}

/** Derives only from bounded private source records. A changed status is not independent acceptance. */
export function deriveFollowupDecisionReplay(history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[],
  links: readonly RepeatTrialEvidenceLink[], followups: readonly OwnerEvidenceFollowup[],
  decisions: readonly FollowupDecision[], environment: TrialEnvironment, handoffs: readonly RepairHandoff[],
  reviews: readonly ReviewEvidenceEvent[], reassessments: readonly IndependentHoldReassessment[],
  imported: { trials: number; checks: number; reviews: number; links: number; reassessments: number;
    followups: number; decisions: number }, now = new Date().toISOString()): FollowupDecisionReplay[] {
  if (!safeTime(now)) throw new Error("Invalid decision replay timestamp.");
  const queue = deriveReassessmentExceptionQueue(history, checks, links, environment, handoffs, reviews,
    reassessments, imported, now);
  const groups = new Map<string, number[]>();
  followups.forEach((note, index) => {
    const key = `${note.link_index}:${note.criterion}`;
    groups.set(key, [...(groups.get(key) ?? []), index]);
  });
  const rows: FollowupDecisionReplay[] = [];
  for (const positions of groups.values()) {
    const first = followups[positions[0]];
    const latest = followups[positions[positions.length - 1]];
    const link = links[latest.link_index];
    if (!link) continue;
    const relatedDecisions = decisions.filter(item => item.link_index === latest.link_index && item.criterion === latest.criterion);
    const active = queue.find(item => item.link_index === latest.link_index && item.criterion === latest.criterion);
    const current: DecisionSnapshotStatus = active?.status ?? "CURRENT_REVIEW_CLAIMED_HOLD";
    const flags: RecurrenceSignal[] = [];
    if (positions.length > 1) flags.push("REPEATED_OWNER_FOLLOWUP");
    if (relatedDecisions.length > 1) flags.push("REPEATED_REVIEW_DECISION");
    const conflictingReviews = reviews.some(item => item.case_id === link.case_id &&
      item.source_observation_index >= link.retest_trial_index && item.state === "contradiction" &&
      (latest.criterion === "field_hold" || item.criterion === latest.criterion));
    if (conflictingReviews || current === "REVIEWER_CONTRADICTION") flags.push("REVIEWER_CONTRADICTION");
    const sourceChecks = checks.filter(check => check.case_id === link.case_id && check.trial_index >= link.retest_trial_index);
    if (sourceChecks.some(check => check.identity_state === "operator_mismatch" ||
      (link.source_alias && check.safe_alias && check.safe_alias !== link.source_alias))) {
      flags.push("SOURCE_IDENTITY_RECURRENCE");
    }
    if (history.some((item, index) => index > link.retest_trial_index && item.case_id === link.case_id)) {
      flags.push("SUPERSEDED_TRIAL");
    }
    if (!environment.installed_windows_witnessed || environment.access === "unknown" ||
      environment.installed_version !== link.installed_version) flags.push("WINDOWS_RECHECK");
    const importedReviewerEvidence = reviews.some((item, index) => index < imported.reviews &&
      item.case_id === link.case_id && item.source_observation_index >= link.retest_trial_index);
    const importedSourceEvidence = checks.some((check, index) => index < imported.checks &&
      check.case_id === link.case_id && check.trial_index >= link.retest_trial_index);
    const sourceImported = positions.some(index => index < imported.followups) ||
      latest.link_index < imported.links || importedReviewerEvidence || importedSourceEvidence;
    if (sourceImported) flags.push("IMPORTED_HISTORY");
    if (latest.status_at_review !== current) flags.push("EVIDENCE_STATUS_CHANGED");
    const urgent = flags.some(flag => ["REPEATED_OWNER_FOLLOWUP", "REPEATED_REVIEW_DECISION",
      "REVIEWER_CONTRADICTION", "SOURCE_IDENTITY_RECURRENCE", "SUPERSEDED_TRIAL"].includes(flag));
    const suggested: DecisionChoice = flags.includes("SUPERSEDED_TRIAL") ? "REPEAT_TRIAL_REQUESTED" :
      flags.includes("SOURCE_IDENTITY_RECURRENCE") ? "RECHECK_SOURCE_IDENTITY" :
        flags.includes("REVIEWER_CONTRADICTION") ? "RECONCILE_REVIEWER_CONTRADICTION" :
          sourceImported || flags.includes("WINDOWS_RECHECK") ? "OWNER_NOTE_REQUIRED" : "INDEPENDENT_FIELD_HOLD_REVIEW";
    rows.push({ link_index: latest.link_index, case_id: latest.case_id, criterion: latest.criterion,
      source_followup_index: positions[positions.length - 1], first_owner_note_at: first.reviewed_at,
      latest_owner_note_at: latest.reviewed_at, first_linked_at: link.linked_at,
      historical_status: latest.status_at_review, current_status: current, owner_notes: positions.length,
      decisions: relatedDecisions.length, latest_decision: relatedDecisions.at(-1)?.decision ?? null,
      recurrence: flags, review_priority: urgent ? "RECURRING_HOLD_RECHECK" : sourceImported ||
        flags.includes("WINDOWS_RECHECK") ? "HISTORICAL_REWITNESS_REQUIRED" : "MANUAL_REVIEW_HOLD",
      suggested_action: suggested, section: MANUAL_ROUTES[latest.case_id].section, source_imported: sourceImported,
      field_acceptance: "FIELD_ACCEPTANCE_HOLD", closure: "NOT_AUTHORIZED" });
  }
  const priority = (row: FollowupDecisionReplay) => row.review_priority === "RECURRING_HOLD_RECHECK" ? 2 :
    row.review_priority === "HISTORICAL_REWITNESS_REQUIRED" ? 1 : 0;
  return rows.sort((a, b) => priority(b) - priority(a) || Date.parse(a.first_owner_note_at) -
    Date.parse(b.first_owner_note_at) || a.case_id.localeCompare(b.case_id) || a.criterion.localeCompare(b.criterion));
}

/** A review note is an unverified private claim, not a signed independent decision or approval. */
export function recordFollowupDecision(history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[],
  links: readonly RepeatTrialEvidenceLink[], followups: readonly OwnerEvidenceFollowup[],
  previous: readonly FollowupDecision[], environment: TrialEnvironment, handoffs: readonly RepairHandoff[],
  reviews: readonly ReviewEvidenceEvent[], reassessments: readonly IndependentHoldReassessment[],
  imported: { trials: number; checks: number; reviews: number; links: number; reassessments: number;
    followups: number; decisions: number }, input: { source_followup_index: number; decision: DecisionChoice;
    personally_reviewed: boolean; separate_reviewer: boolean }, now = new Date().toISOString()): FollowupDecision[] {
  if (!input.personally_reviewed || !input.separate_reviewer || !safeTime(now)) {
    throw new Error("A separate reviewer must personally inspect the exact owner note before any private decision replay.");
  }
  if (!decisionsAllowed.includes(input.decision)) throw new Error("Choose a fixed manual HOLD-only review decision.");
  const note = followups[input.source_followup_index];
  const link = note && links[note.link_index];
  if (!note || !link || input.source_followup_index < imported.followups || note.link_index < imported.links ||
    !environment.installed_windows_witnessed || environment.access === "unknown" ||
    environment.installed_version !== link.installed_version) {
    throw new Error("Imported notes or unverified installed Windows context require fresh owner witnessing first.");
  }
  const row = deriveFollowupDecisionReplay(history, checks, links, followups, previous, environment,
    handoffs, reviews, reassessments, imported, now).find(entry => entry.link_index === note.link_index &&
      entry.criterion === note.criterion);
  if (!row || row.source_followup_index !== input.source_followup_index ||
    previous.some(item => item.source_followup_index === input.source_followup_index)) {
    throw new Error("This exact owner note has already been reviewed or is no longer linked to the current session.");
  }
  const next: FollowupDecision[] = [...previous, { source_followup_index: input.source_followup_index,
    link_index: note.link_index, case_id: note.case_id, criterion: note.criterion,
    source_followup_at: note.reviewed_at, source_linked_at: note.source_linked_at,
    status_at_decision: row.current_status, decision: input.decision, reviewed_at: now,
    reviewer_witnessed: true, separate_reviewer_attested: true,
    review_state: "INDEPENDENT_FOLLOWUP_REVIEW_HOLD", field_acceptance: "FIELD_ACCEPTANCE_HOLD",
    closure: "NOT_AUTHORIZED" }];
  validateDecisions(links, followups, next);
  return next;
}

export function createDecisionReplayReceipt(environment: TrialEnvironment, readings: readonly TrialSourceReading[],
  history: readonly TrialObservation[], handoffs: readonly RepairHandoff[], reviews: readonly ReviewEvidenceEvent[],
  checks: readonly SourceIdentityCheck[], links: readonly RepeatTrialEvidenceLink[],
  reassessments: readonly IndependentHoldReassessment[], followups: readonly OwnerEvidenceFollowup[],
  decisions: readonly FollowupDecision[], now = new Date().toISOString()): DecisionReplayReceipt {
  if (!safeTime(now)) throw new Error("Invalid decision replay export timestamp.");
  validateDecisions(links, followups, decisions, now);
  return { kind: "rosevear_independent_followup_decision_replay", schema_version: 1, exported_at: now,
    field_acceptance: "FIELD_ACCEPTANCE_HOLD", independent_review: "INDEPENDENT_REVIEW_HOLD",
    closure: "NOT_AUTHORIZED", automatic_dispatch: "DISABLED",
    evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS",
    followup: createFollowupReceipt(environment, readings, history, handoffs, reviews, checks, links,
      reassessments, followups, now), decisions: decisions.map(item => ({ ...item })) };
}

export function parseDecisionReplayReceipt(raw: string): ReturnType<typeof parseFollowupReceipt> & {
  decisions: FollowupDecision[] } {
  if (raw.length > 900_000) throw new Error("Private Build 154 decision replay receipt exceeds 900 KB.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Private decision replay receipt is not valid JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid private decision replay receipt.");
  }
  const receipt = value as Record<string, unknown>;
  if (receipt.kind !== "rosevear_independent_followup_decision_replay") {
    return { ...parseFollowupReceipt(raw), decisions: [] };
  }
  const keys = ["kind", "schema_version", "exported_at", "field_acceptance", "independent_review",
    "closure", "automatic_dispatch", "evidence_authenticity", "followup", "decisions"];
  if (Object.keys(receipt).some(key => !keys.includes(key)) || receipt.schema_version !== 1 ||
    receipt.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" || receipt.independent_review !== "INDEPENDENT_REVIEW_HOLD" ||
    receipt.closure !== "NOT_AUTHORIZED" || receipt.automatic_dispatch !== "DISABLED" ||
    receipt.evidence_authenticity !== "UNVERIFIED_PRIVATE_ATTESTATIONS" || !safeTime(receipt.exported_at) ||
    !receipt.followup || typeof receipt.followup !== "object" || !Array.isArray(receipt.decisions)) {
    throw new Error("Unsafe or unsupported Build 154 decision replay receipt.");
  }
  const inner = receipt.followup as FollowupReceipt;
  if (inner.kind !== "rosevear_independent_reassessment_followup" ||
    Date.parse(inner.exported_at) > Date.parse(receipt.exported_at as string)) {
    throw new Error("Build 154 requires complete chronological Build 153 owner follow-up history.");
  }
  const prior = parseFollowupReceipt(JSON.stringify(inner));
  const decisions = receipt.decisions as FollowupDecision[];
  validateDecisions(prior.links, prior.followups, decisions, receipt.exported_at as string);
  return { ...prior, decisions: decisions.map(item => ({ ...item })) };
}
