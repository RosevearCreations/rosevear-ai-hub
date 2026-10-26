/** Build 153: read-only exception aging and private owner follow-up; never automated release or dispatch. */
import { type TrialCaseId, type TrialEnvironment, type TrialObservation, type TrialOwner,
  type TrialSourceReading } from "./ownerFieldTrial";
import { type RepairHandoff } from "./ownerTrialReconciliation";
import { REVIEW_CRITERIA, type ReviewCriterion, type ReviewEvidenceEvent } from "./ownerIndependentReview";
import { MANUAL_ROUTES, type SourceIdentityCheck } from "./ownerFieldRouting";
import { assessHoldReassessment, createReassessmentReceipt, parseReassessmentReceipt,
  type IndependentHoldReassessment, type ReassessmentReceipt, type RepeatTrialEvidenceLink,
  type ReviewerEvidenceComparison } from "./ownerRepeatTrialReassessment";

export type ExceptionCriterion = ReviewCriterion | "field_hold";
export type ExceptionStatus = "MISSING_CURRENT_EVIDENCE" | "REVIEWER_GAP" | "REVIEWER_CONTRADICTION" |
  "IMPORTED_REVIEW_CLAIM" | "RETEST_SUPERSEDED" | "IMPORTED_LINK_HOLD" | "SOURCE_CONTEXT_HOLD" |
  "REOPENED_AFTER_PACKET" | "PACKET_UNVERIFIED_HOLD";
export type ExceptionAge = "RECENT_UNDER_24H" | "WATCH_1_TO_3_DAYS" | "AGED_OVER_3_DAYS";
export type FollowupAction = "REQUEST_FRESH_REVIEW" | "REPEAT_OWNER_TRIAL" | "VERIFY_PRIVATE_SOURCE" |
  "RECHECK_WINDOWS_CONTEXT" | "REVIEW_SAFETY_HOLDS" | "INDEPENDENT_WITNESS_FOLLOWUP";

export interface ReassessmentException {
  link_index: number;
  case_id: TrialCaseId;
  criterion: ExceptionCriterion;
  label: string;
  section: string;
  status: ExceptionStatus;
  historical: ReviewerEvidenceComparison["historical"] | "not_applicable";
  fresh: ReviewerEvidenceComparison["fresh"] | "not_applicable";
  original_observed_at: string;
  retest_observed_at: string;
  first_linked_at: string;
  age_band: ExceptionAge;
  age_days: number;
  owner: Exclude<TrialOwner, "unassigned">;
  action: FollowupAction;
  instruction: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  closure: "NOT_AUTHORIZED";
}

export interface OwnerEvidenceFollowup {
  link_index: number;
  case_id: TrialCaseId;
  criterion: ExceptionCriterion;
  status_at_review: ExceptionStatus;
  source_linked_at: string;
  next_owner: Exclude<TrialOwner, "unassigned">;
  action: FollowupAction;
  reviewed_at: string;
  personally_reviewed: true;
  followup_state: "OPEN_MANUAL_HOLD";
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  closure: "NOT_AUTHORIZED";
}

export interface FollowupReceipt {
  kind: "rosevear_independent_reassessment_followup";
  schema_version: 1;
  exported_at: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
  automatic_dispatch: "DISABLED";
  evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS";
  reassessment: ReassessmentReceipt;
  followups: OwnerEvidenceFollowup[];
}

const followupKeys = ["link_index", "case_id", "criterion", "status_at_review", "source_linked_at", "next_owner",
  "action", "reviewed_at", "personally_reviewed", "followup_state", "field_acceptance", "closure"];
const states: ExceptionStatus[] = ["MISSING_CURRENT_EVIDENCE", "REVIEWER_GAP", "REVIEWER_CONTRADICTION",
  "IMPORTED_REVIEW_CLAIM", "RETEST_SUPERSEDED", "IMPORTED_LINK_HOLD", "SOURCE_CONTEXT_HOLD",
  "REOPENED_AFTER_PACKET", "PACKET_UNVERIFIED_HOLD"];
const actions: FollowupAction[] = ["REQUEST_FRESH_REVIEW", "REPEAT_OWNER_TRIAL", "VERIFY_PRIVATE_SOURCE",
  "RECHECK_WINDOWS_CONTEXT", "REVIEW_SAFETY_HOLDS", "INDEPENDENT_WITNESS_FOLLOWUP"];
const owners: Exclude<TrialOwner, "unassigned">[] = ["household_owner", "camera_operator", "workshop_operator"];
const MAX_FOLLOWUPS = 240;

function safeTime(value: unknown): value is string {
  return typeof value === "string" && /^20\d\d-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value)) &&
    Date.parse(value) >= Date.parse("2020-01-01T00:00:00Z") && Date.parse(value) <= Date.now() + 300_000;
}

function ageSince(linkedAt: string, now: string): { band: ExceptionAge; days: number } {
  const delta = Math.max(0, Date.parse(now) - Date.parse(linkedAt));
  const days = Math.floor(delta / 86_400_000);
  return { band: delta < 86_400_000 ? "RECENT_UNDER_24H" : delta < 3 * 86_400_000 ? "WATCH_1_TO_3_DAYS" : "AGED_OVER_3_DAYS", days };
}

function actionFor(criterion: ExceptionCriterion, status: ExceptionStatus): FollowupAction {
  if (status === "RETEST_SUPERSEDED" || status === "REOPENED_AFTER_PACKET") return "REPEAT_OWNER_TRIAL";
  if (criterion === "identity_match") return "VERIFY_PRIVATE_SOURCE";
  if (criterion === "installed_windows") return "RECHECK_WINDOWS_CONTEXT";
  if (criterion === "safety_permissions") return "REVIEW_SAFETY_HOLDS";
  if (criterion === "independent_witness") return "INDEPENDENT_WITNESS_FOLLOWUP";
  if (criterion === "field_hold" && status === "SOURCE_CONTEXT_HOLD") return "RECHECK_WINDOWS_CONTEXT";
  if (criterion === "field_hold" && status === "IMPORTED_LINK_HOLD") return "REPEAT_OWNER_TRIAL";
  return "REQUEST_FRESH_REVIEW";
}

/** Compute only from the current private session; age is an advisory counter, never a scheduled action. */
export function deriveReassessmentExceptionQueue(history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[],
  links: readonly RepeatTrialEvidenceLink[], environment: TrialEnvironment, handoffs: readonly RepairHandoff[],
  reviews: readonly ReviewEvidenceEvent[], reassessments: readonly IndependentHoldReassessment[], imported: {
    trials: number; checks: number; reviews: number; links: number; reassessments: number },
  now = new Date().toISOString()): ReassessmentException[] {
  if (!safeTime(now)) throw new Error("Invalid owner follow-up review timestamp.");
  const queue: ReassessmentException[] = [];
  links.forEach((link, index) => {
    const baseline = history[link.baseline_trial_index];
    const retest = history[link.retest_trial_index];
    if (!baseline || !retest) return;
    const assessment = assessHoldReassessment(history, checks, links, index, environment, handoffs, reviews, imported);
    const route = MANUAL_ROUTES[link.case_id];
    const age = ageSince(link.linked_at, now);
    let latestTrialIndex = -1;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].case_id === link.case_id) { latestTrialIndex = i; break; }
    }
    const superseded = latestTrialIndex !== link.retest_trial_index;
    const reviewAfterPacket = reassessments.some(entry => entry.link_index === index &&
      entry.mark === "packet_prepared_only");
    const contradictoryCurrent = (criterion: ReviewCriterion) => reviews.some((event, reviewIndex) =>
      reviewIndex >= imported.reviews && event.case_id === link.case_id &&
      event.source_observation_index === link.retest_trial_index && event.criterion === criterion &&
      event.state === "contradiction");
    const put = (criterion: ExceptionCriterion, label: string, status: ExceptionStatus,
      old: ReassessmentException["historical"], fresh: ReassessmentException["fresh"]) => {
      const owner = criterion === "independent_witness" ? "household_owner" :
        retest.outcome !== "passed" && retest.next_owner !== "unassigned" ? retest.next_owner : route.role;
      queue.push({ link_index: index, case_id: link.case_id, criterion, label, section: route.section, status,
        historical: old, fresh, original_observed_at: baseline.observed_at,
        retest_observed_at: retest.observed_at, first_linked_at: link.linked_at,
        age_band: age.band, age_days: age.days, owner, action: actionFor(criterion, status),
        instruction: criterion === "field_hold" ? route.instruction : REVIEW_CRITERIA.find(item => item.id === criterion)!.guidance,
        field_acceptance: "FIELD_ACCEPTANCE_HOLD", closure: "NOT_AUTHORIZED" });
    };
    for (const item of assessment.comparison) {
      const status: ExceptionStatus | null = superseded ? "RETEST_SUPERSEDED" : contradictoryCurrent(item.criterion)
        ? "REVIEWER_CONTRADICTION" : item.fresh === "imported_historical" ? "IMPORTED_REVIEW_CLAIM"
          : item.fresh === "gap" ? "REVIEWER_GAP" : item.fresh === "contradiction" ? "REVIEWER_CONTRADICTION"
            : item.requires_fresh_review ? "MISSING_CURRENT_EVIDENCE" : null;
      if (status) put(item.criterion, item.label, status, item.historical, item.fresh);
    }
    // The field hold is always visible, including after all seven reviewer criteria are claimed.
    const global: ExceptionStatus = index < imported.links || link.retest_trial_index < imported.trials
      ? "IMPORTED_LINK_HOLD" : superseded && reviewAfterPacket ? "REOPENED_AFTER_PACKET"
        : superseded ? "RETEST_SUPERSEDED" : reviewAfterPacket && assessment.blockers.length > 0
          ? "REOPENED_AFTER_PACKET" : assessment.blockers.some(message =>
            /Windows|source identity|source alias|physical identity|historical/.test(message)) ? "SOURCE_CONTEXT_HOLD"
            : "PACKET_UNVERIFIED_HOLD";
    put("field_hold", "Independent physical acceptance hold", global, "not_applicable", "not_applicable");
  });
  const urgency = (row: ReassessmentException) => row.status === "REOPENED_AFTER_PACKET" ||
    row.status === "REVIEWER_CONTRADICTION" ? 2 : row.age_band === "AGED_OVER_3_DAYS" ? 1 : 0;
  return queue.sort((a, b) => urgency(b) - urgency(a) || Date.parse(a.first_linked_at) - Date.parse(b.first_linked_at) ||
    a.case_id.localeCompare(b.case_id) || a.criterion.localeCompare(b.criterion));
}

function validateFollowups(history: readonly TrialObservation[], links: readonly RepeatTrialEvidenceLink[],
  followups: readonly OwnerEvidenceFollowup[], exportedAt?: string) {
  if (followups.length > MAX_FOLLOWUPS) throw new Error("Private follow-up history exceeds 240 records.");
  let last = 0;
  for (const event of followups) {
    if (!event || typeof event !== "object" || Object.keys(event).some(key => !followupKeys.includes(key)) ||
      !Number.isInteger(event.link_index) || !Object.hasOwn(MANUAL_ROUTES, event.case_id) ||
      ![...REVIEW_CRITERIA.map(item => item.id), "field_hold"].includes(event.criterion) ||
      !states.includes(event.status_at_review) || !owners.includes(event.next_owner) ||
      !actions.includes(event.action) || event.personally_reviewed !== true ||
      event.followup_state !== "OPEN_MANUAL_HOLD" || event.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
      event.closure !== "NOT_AUTHORIZED" || !safeTime(event.reviewed_at) || !safeTime(event.source_linked_at)) {
      throw new Error("Invalid or sensitive owner evidence follow-up; only fixed status categories are accepted.");
    }
    const link = links[event.link_index];
    const when = Date.parse(event.reviewed_at);
    if (!link || !history[link.baseline_trial_index] || !history[link.retest_trial_index] ||
      link.case_id !== event.case_id || link.linked_at !== event.source_linked_at ||
      when < Date.parse(link.linked_at) || when < last || (exportedAt && when > Date.parse(exportedAt))) {
      throw new Error("Owner follow-up conflicts with its exact source link or chronology.");
    }
    last = when;
  }
}

export function recordOwnerEvidenceFollowup(history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[],
  links: readonly RepeatTrialEvidenceLink[], previous: readonly OwnerEvidenceFollowup[], environment: TrialEnvironment,
  handoffs: readonly RepairHandoff[], reviews: readonly ReviewEvidenceEvent[],
  reassessments: readonly IndependentHoldReassessment[], imported: { trials: number; checks: number;
    reviews: number; links: number; reassessments: number }, input: { link_index: number;
    criterion: ExceptionCriterion; personally_reviewed: boolean }, now = new Date().toISOString()): OwnerEvidenceFollowup[] {
  if (!input.personally_reviewed || !safeTime(now)) throw new Error("Review the exact exception manually before recording a private follow-up.");
  const exception = deriveReassessmentExceptionQueue(history, checks, links, environment, handoffs, reviews,
    reassessments, imported, now).find(item => item.link_index === input.link_index && item.criterion === input.criterion);
  if (!exception) throw new Error("This exception no longer matches the current linked evidence; refresh before planning follow-up.");
  const updated: OwnerEvidenceFollowup[] = [...previous, {
    link_index: input.link_index, case_id: exception.case_id, criterion: exception.criterion,
    status_at_review: exception.status, source_linked_at: exception.first_linked_at,
    next_owner: exception.owner, action: exception.action, reviewed_at: now, personally_reviewed: true,
    followup_state: "OPEN_MANUAL_HOLD", field_acceptance: "FIELD_ACCEPTANCE_HOLD", closure: "NOT_AUTHORIZED",
  }];
  validateFollowups(history, links, updated);
  return updated;
}

export function createFollowupReceipt(environment: TrialEnvironment, readings: readonly TrialSourceReading[],
  history: readonly TrialObservation[], handoffs: readonly RepairHandoff[], reviews: readonly ReviewEvidenceEvent[],
  checks: readonly SourceIdentityCheck[], links: readonly RepeatTrialEvidenceLink[],
  reassessments: readonly IndependentHoldReassessment[], followups: readonly OwnerEvidenceFollowup[],
  now = new Date().toISOString()): FollowupReceipt {
  if (!safeTime(now)) throw new Error("Invalid private follow-up export timestamp.");
  validateFollowups(history, links, followups, now);
  return { kind: "rosevear_independent_reassessment_followup", schema_version: 1, exported_at: now,
    field_acceptance: "FIELD_ACCEPTANCE_HOLD", independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED",
    automatic_dispatch: "DISABLED", evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS",
    reassessment: createReassessmentReceipt(environment, readings, history, handoffs, reviews, checks, links, reassessments, now),
    followups: followups.map(item => ({ ...item })) };
}

export function parseFollowupReceipt(raw: string): ReturnType<typeof parseReassessmentReceipt> & { followups: OwnerEvidenceFollowup[] } {
  if (raw.length > 700_000) throw new Error("Private Build 153 follow-up receipt exceeds 700 KB.");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("Private follow-up receipt is not valid JSON."); }
  if (!parsed || typeof parsed !== "object") throw new Error("Invalid private follow-up receipt.");
  const receipt = parsed as Record<string, unknown>;
  if (receipt.kind !== "rosevear_independent_reassessment_followup") {
    return { ...parseReassessmentReceipt(raw), followups: [] };
  }
  const allowed = ["kind", "schema_version", "exported_at", "field_acceptance", "independent_review", "closure",
    "automatic_dispatch", "evidence_authenticity", "reassessment", "followups"];
  if (Object.keys(receipt).some(key => !allowed.includes(key)) || receipt.schema_version !== 1 ||
    receipt.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" || receipt.independent_review !== "INDEPENDENT_REVIEW_HOLD" ||
    receipt.closure !== "NOT_AUTHORIZED" || receipt.automatic_dispatch !== "DISABLED" ||
    receipt.evidence_authenticity !== "UNVERIFIED_PRIVATE_ATTESTATIONS" || !safeTime(receipt.exported_at) ||
    !receipt.reassessment || typeof receipt.reassessment !== "object" || !Array.isArray(receipt.followups)) {
    throw new Error("Unsafe or unsupported Build 153 follow-up receipt.");
  }
  const inner = receipt.reassessment as ReassessmentReceipt;
  if (inner.kind !== "rosevear_repeat_trial_reassessment" || Date.parse(inner.exported_at) > Date.parse(receipt.exported_at as string)) {
    throw new Error("Build 153 requires complete, chronologically valid Build 152 reassessment history.");
  }
  const prior = parseReassessmentReceipt(JSON.stringify(inner));
  const followups = receipt.followups as OwnerEvidenceFollowup[];
  validateFollowups(prior.trial.observations, prior.links, followups, receipt.exported_at as string);
  return { ...prior, followups: followups.map(item => ({ ...item })) };
}
