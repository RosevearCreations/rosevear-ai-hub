/** Build 152: locally linked trial/reviewer claims. Nothing here certifies physical acceptance. */
import { TRIAL_CASES, validateInstalledVersion, type TrialCaseId, type TrialEnvironment,
  type TrialObservation, type TrialSourceReading } from "./ownerFieldTrial";
import { type RepairHandoff } from "./ownerTrialReconciliation";
import { REVIEW_CRITERIA, type EvidenceState, type ReviewEvidenceEvent, type ReviewCriterion } from "./ownerIndependentReview";
import { createFieldRoutingReceipt, deriveRepeatTrialRoutes, parseFieldRoutingReceipt,
  type FieldRoutingReceipt, type RouteReason, type SourceIdentityCheck } from "./ownerFieldRouting";

export interface RepeatTrialEvidenceLink {
  case_id: TrialCaseId;
  baseline_trial_index: number;
  retest_trial_index: number;
  route_reason: RouteReason;
  source_check_index: number | null;
  source_alias: string | null;
  installed_version: string;
  linked_at: string;
  witnessed_on_windows: true;
}

export type ReassessmentMark = "repeat_trial_requested" | "reviewer_gaps_hold" | "packet_prepared_only";
export interface IndependentHoldReassessment {
  link_index: number;
  mark: ReassessmentMark;
  reviewed_at: string;
  reviewer_witnessed: true;
  separate_reviewer_attested: boolean;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  closure: "NOT_AUTHORIZED";
}

export interface ReassessmentReceipt {
  kind: "rosevear_repeat_trial_reassessment";
  schema_version: 1;
  exported_at: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  closure: "NOT_AUTHORIZED";
  automatic_dispatch: "DISABLED";
  evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS";
  source_routing: FieldRoutingReceipt;
  trial_links: RepeatTrialEvidenceLink[];
  reassessments: IndependentHoldReassessment[];
}

export interface ReviewerEvidenceComparison {
  criterion: ReviewCriterion;
  label: string;
  historical: EvidenceState | "missing" | "imported_historical";
  fresh: EvidenceState | "missing" | "imported_historical";
  requires_fresh_review: boolean;
}

export interface HoldReassessmentSummary {
  comparison: ReviewerEvidenceComparison[];
  blockers: string[];
  packet_status: "REVIEW_PACKET_PREPARED_ONLY" | "INDEPENDENT_HOLD_REASSESSMENT_REQUIRED";
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  closure: "NOT_AUTHORIZED";
}

const reasonValues: RouteReason[] = ["NO_OWNER_TRIAL", "HISTORICAL_OWNER_TRIAL", "WINDOWS_CONTEXT_UNKNOWN",
  "NO_IDENTITY_EVIDENCE", "IMPORTED_IDENTITY_HISTORICAL", "IDENTITY_UNKNOWN", "SOURCE_IDENTITY_MISMATCH",
  "SOURCE_ALIAS_CHANGED", "IDENTITY_SNAPSHOT_STALE", "INSTALLED_VERSION_SUPERSEDED", "REOPENED_AFTER_PASS",
  "ACTIVE_FINDING", "INDEPENDENT_EVIDENCE_GAPS"];
const marks: ReassessmentMark[] = ["repeat_trial_requested", "reviewer_gaps_hold", "packet_prepared_only"];
const linkKeys = ["case_id", "baseline_trial_index", "retest_trial_index", "route_reason", "source_check_index",
  "source_alias", "installed_version", "linked_at", "witnessed_on_windows"];
const reviewKeys = ["link_index", "mark", "reviewed_at", "reviewer_witnessed", "separate_reviewer_attested",
  "field_acceptance", "closure"];
const MAX_LINKS = 200;
const MAX_REASSESSMENTS = 200;

function safeTime(value: unknown): value is string {
  return typeof value === "string" && /^20\d\d-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value)) &&
    Date.parse(value) >= Date.parse("2020-01-01T00:00:00Z") && Date.parse(value) <= Date.now() + 300_000;
}

function lastCaseIndex(history: readonly TrialObservation[], caseId: TrialCaseId, end = history.length): number {
  for (let i = end - 1; i >= 0; i--) if (history[i].case_id === caseId) return i;
  return -1;
}

/** Only the newest, personally observed retest can be linked; historical imports are context, not fresh evidence. */
export function repeatTrialCandidates(history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[],
  environment: TrialEnvironment, handoffs: readonly RepairHandoff[], reviews: readonly ReviewEvidenceEvent[],
  imported: { trials: number; checks: number; reviews: number }): { case_id: TrialCaseId; baseline_index: number;
    retest_index: number; reasons: RouteReason[]; source_check_index: number | null }[] {
  return TRIAL_CASES.flatMap(item => {
    const retestIndex = lastCaseIndex(history, item.id);
    const baselineIndex = lastCaseIndex(history, item.id, retestIndex);
    if (baselineIndex < 0 || retestIndex < imported.trials) return [];
    const routeChecks = checks.filter(check => check.trial_index < retestIndex);
    const reasons = deriveRepeatTrialRoutes(history.slice(0, retestIndex), routeChecks, environment, handoffs, reviews,
      { trials: Math.min(imported.trials, retestIndex), checks: Math.min(imported.checks, routeChecks.length), reviews: imported.reviews })
      .find(route => route.case_id === item.id)?.reasons.filter(reason => reason !== "NO_OWNER_TRIAL") ?? [];
    if (!reasons.length) return [];
    let sourceCheckIndex: number | null = null;
    for (let i = checks.length - 1; i >= 0; i--) {
      if (checks[i].case_id === item.id && checks[i].trial_index <= baselineIndex) { sourceCheckIndex = i; break; }
    }
    return [{ case_id: item.id, baseline_index: baselineIndex, retest_index: retestIndex,
      reasons, source_check_index: sourceCheckIndex }];
  });
}

function validateLinks(history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[],
  links: readonly RepeatTrialEvidenceLink[], exportedAt?: string) {
  if (links.length > MAX_LINKS) throw new Error("Repeat-trial links exceed the 200-record private bound.");
  const signatures = new Set<string>();
  let previousTime = 0;
  for (const link of links) {
    if (!link || typeof link !== "object" || Object.keys(link).some(key => !linkKeys.includes(key)) ||
      !TRIAL_CASES.some(item => item.id === link.case_id) || !reasonValues.includes(link.route_reason) ||
      link.route_reason === "NO_OWNER_TRIAL" || !Number.isInteger(link.baseline_trial_index) ||
      !Number.isInteger(link.retest_trial_index) || link.witnessed_on_windows !== true || !safeTime(link.linked_at) ||
      typeof link.installed_version !== "string" || !validateInstalledVersion(link.installed_version) ||
      !link.installed_version) throw new Error("Invalid, incomplete or unsafe repeat-trial evidence link.");
    const baseline = history[link.baseline_trial_index];
    const retest = history[link.retest_trial_index];
    if (!baseline || !retest || baseline.case_id !== link.case_id || retest.case_id !== link.case_id ||
      link.baseline_trial_index >= link.retest_trial_index ||
      lastCaseIndex(history, link.case_id, link.retest_trial_index) !== link.baseline_trial_index ||
      Date.parse(link.linked_at) < Date.parse(retest.observed_at) ||
      Date.parse(link.linked_at) < previousTime ||
      (exportedAt && Date.parse(link.linked_at) > Date.parse(exportedAt))) {
      throw new Error("Repeat-trial link conflicts with original and current trial chronology.");
    }
    previousTime = Date.parse(link.linked_at);
    if (link.source_check_index === null) {
      if (link.source_alias !== null) throw new Error("Unverified source alias cannot be attached without a source check.");
    } else {
      if (!Number.isInteger(link.source_check_index)) throw new Error("Invalid source evidence reference.");
      const check = checks[link.source_check_index];
      if (!check || check.case_id !== link.case_id || check.trial_index > link.baseline_trial_index ||
        check.safe_alias !== link.source_alias || Date.parse(check.captured_at) > Date.parse(link.linked_at)) {
        throw new Error("Repeat-trial alias does not match its exact historical source check.");
      }
    }
    const key = `${link.case_id}:${link.retest_trial_index}:${link.route_reason}`;
    if (signatures.has(key)) throw new Error("Duplicate exact repeat-trial route link.");
    signatures.add(key);
  }
}

function validateReassessments(history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[],
  handoffs: readonly RepairHandoff[], reviews: readonly ReviewEvidenceEvent[], links: readonly RepeatTrialEvidenceLink[],
  entries: readonly IndependentHoldReassessment[], exportedAt?: string) {
  if (entries.length > MAX_REASSESSMENTS) throw new Error("Reassessment handoffs exceed the 200-record private bound.");
  const latestByLink = new Map<number, number>();
  let last = 0;
  for (const entry of entries) {
    if (!entry || typeof entry !== "object" || Object.keys(entry).some(key => !reviewKeys.includes(key)) ||
      !Number.isInteger(entry.link_index) || !marks.includes(entry.mark) || entry.reviewer_witnessed !== true ||
      typeof entry.separate_reviewer_attested !== "boolean" || entry.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" ||
      entry.closure !== "NOT_AUTHORIZED" || !safeTime(entry.reviewed_at)) {
      throw new Error("Invalid or unsafe independent reassessment handoff.");
    }
    const link = links[entry.link_index];
    const time = Date.parse(entry.reviewed_at);
    if (!link || !history[link.retest_trial_index] || time < Date.parse(link.linked_at) ||
      time < last || time < (latestByLink.get(entry.link_index) ?? 0) ||
      (exportedAt && time > Date.parse(exportedAt)) ||
      (entry.mark === "packet_prepared_only" && !entry.separate_reviewer_attested)) {
      throw new Error("Independent reassessment has stale source linkage or contradictory chronology.");
    }
    if (entry.mark === "packet_prepared_only") {
      const prepared = handoffs.filter(handoff => handoff.case_id === link.case_id &&
        handoff.baseline_index <= link.baseline_trial_index && handoff.stage === "prepared_for_private_handoff" &&
        !!handoff.prepared_at && Date.parse(handoff.prepared_at) <= time);
      const source = checks.filter(check => check.case_id === link.case_id &&
        check.trial_index === link.retest_trial_index && Date.parse(check.captured_at) <= time);
      const current = source.at(-1);
      const relevant = reviews.filter(event => event.case_id === link.case_id &&
        event.source_observation_index === link.retest_trial_index && Date.parse(event.recorded_at) <= time &&
        prepared.some(handoff => handoff.baseline_index === event.baseline_index));
      const evidencePresent = REVIEW_CRITERIA.every(criterion => {
        const latest = relevant.filter(event => event.criterion === criterion.id).at(-1);
        return latest?.state === "present_claimed" &&
          (criterion.id !== "independent_witness" || latest.separate_reviewer_attested);
      });
      if (!prepared.length || history[link.retest_trial_index].outcome !== "passed" || !link.source_alias ||
        !current || current.identity_state !== "confirmed_alias" || current.safe_alias !== link.source_alias ||
        source.some(check => check.identity_state === "operator_mismatch") ||
        new Set(source.filter(check => check.safe_alias).map(check => check.safe_alias)).size > 1 ||
        relevant.some(event => event.state === "contradiction") || !evidencePresent ||
        history.some((observation, index) => index > link.retest_trial_index && observation.case_id === link.case_id &&
          Date.parse(observation.observed_at) <= time)) {
        throw new Error("Prepared-only reviewer claim lacks complete chronological, non-contradictory source evidence.");
      }
    }
    last = time;
    latestByLink.set(entry.link_index, time);
  }
}

export function recordRepeatTrialLink(history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[],
  prior: readonly RepeatTrialEvidenceLink[], environment: TrialEnvironment, handoffs: readonly RepairHandoff[],
  reviews: readonly ReviewEvidenceEvent[], imported: { trials: number; checks: number; reviews: number },
  input: { case_id: TrialCaseId; route_reason: RouteReason; personally_witnessed: boolean },
  now = new Date().toISOString()): RepeatTrialEvidenceLink[] {
  if (!input.personally_witnessed || !environment.installed_windows_witnessed || environment.access === "unknown" ||
    !validateInstalledVersion(environment.installed_version) || !safeTime(now)) {
    throw new Error("Personally witness this repeat trial and the current installed Windows version before linking evidence.");
  }
  const candidate = repeatTrialCandidates(history, checks, environment, handoffs, reviews, imported)
    .find(item => item.case_id === input.case_id && item.reasons.includes(input.route_reason));
  if (!candidate) throw new Error("Choose a fresh repeated trial and an actual historical Build 151 routing reason.");
  const check = candidate.source_check_index === null ? null : checks[candidate.source_check_index];
  const updated: RepeatTrialEvidenceLink[] = [...prior, { case_id: candidate.case_id,
    baseline_trial_index: candidate.baseline_index, retest_trial_index: candidate.retest_index,
    route_reason: input.route_reason, source_check_index: candidate.source_check_index,
    source_alias: check?.safe_alias ?? null, installed_version: validateInstalledVersion(environment.installed_version),
    linked_at: now, witnessed_on_windows: true }];
  validateLinks(history, checks, updated);
  return updated;
}

/** Old classifications never become current merely because a label or alias matches. */
export function compareReviewerEvidence(history: readonly TrialObservation[], reviews: readonly ReviewEvidenceEvent[],
  handoffs: readonly RepairHandoff[], link: RepeatTrialEvidenceLink, importedReviews = 0): ReviewerEvidenceComparison[] {
  const prepared = handoffs.filter(h => h.case_id === link.case_id && h.stage === "prepared_for_private_handoff" &&
    h.baseline_index <= link.baseline_trial_index);
  return REVIEW_CRITERIA.map(criterion => {
    const related = reviews.map((event, index) => ({ event, index })).filter(({ event }) =>
      event.case_id === link.case_id && event.criterion === criterion.id &&
      prepared.some(handoff => handoff.baseline_index === event.baseline_index));
    const prior = related.filter(({ event }) => event.source_observation_index < link.retest_trial_index).at(-1);
    const fresh = related.filter(({ event }) => event.source_observation_index === link.retest_trial_index).at(-1);
    const status = (match: typeof prior): EvidenceState | "missing" | "imported_historical" =>
      !match ? "missing" : match.index < importedReviews ? "imported_historical" : match.event.state;
    const historical = status(prior);
    const current = status(fresh);
    return { criterion: criterion.id, label: criterion.label, historical, fresh: current,
      requires_fresh_review: current !== "present_claimed" || (criterion.id === "independent_witness" &&
        !fresh?.event.separate_reviewer_attested) };
  });
}

export function assessHoldReassessment(history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[],
  links: readonly RepeatTrialEvidenceLink[], linkIndex: number, environment: TrialEnvironment,
  handoffs: readonly RepairHandoff[], reviews: readonly ReviewEvidenceEvent[], imported: {
    trials: number; checks: number; reviews: number; links: number }): HoldReassessmentSummary {
  const link = links[linkIndex];
  if (!link) throw new Error("Select an exact linked repeat-trial result first.");
  const comparison = compareReviewerEvidence(history, reviews, handoffs, link, imported.reviews);
  const blockers: string[] = [];
  if (linkIndex < imported.links || link.retest_trial_index < imported.trials) blockers.push("Imported historical link or trial: witness a new Windows trial.");
  if (!environment.installed_windows_witnessed || environment.access === "unknown" ||
    environment.installed_version !== link.installed_version) blockers.push("Missing or changed installed Windows witness/version.");
  if (lastCaseIndex(history, link.case_id) !== link.retest_trial_index) blockers.push("A newer trial superseded this linked retest.");
  if (history[link.retest_trial_index]?.outcome !== "passed") blockers.push("Latest linked retest did not pass its manually observed check.");
  const check = checks.map((item, index) => ({ item, index })).filter(({ item }) =>
    item.case_id === link.case_id && item.trial_index === link.retest_trial_index).at(-1);
  if (!check || check.index < imported.checks || check.item.identity_state !== "confirmed_alias")
    blockers.push("Fresh post-retest source identity inspection is absent or unresolved.");
  if (checks.some(item => item.case_id === link.case_id && item.trial_index === link.retest_trial_index &&
    item.identity_state === "operator_mismatch")) blockers.push("An identity contradiction on this retest remains unresolved; repeat physical source inspection.");
  if (new Set(checks.filter(item => item.case_id === link.case_id && item.trial_index === link.retest_trial_index && item.safe_alias)
    .map(item => item.safe_alias)).size > 1) blockers.push("Conflicting safe source aliases on the same retest require a new physical trial.");
  if (!link.source_alias || !check?.item.safe_alias || link.source_alias !== check.item.safe_alias)
    blockers.push("Historical and current safe source aliases cannot be verified as matching; inspect physical identity independently.");
  if (!handoffs.some(handoff => handoff.case_id === link.case_id && handoff.stage === "prepared_for_private_handoff" &&
    handoff.baseline_index <= link.baseline_trial_index)) blockers.push("Prepared private repair handoff for the original finding is missing.");
  if (comparison.some(item => item.requires_fresh_review)) blockers.push("Fresh independent reviewer checklist is incomplete, stale or contradictory.");
  if (reviews.some(event => event.case_id === link.case_id && event.source_observation_index === link.retest_trial_index &&
    event.state === "contradiction")) blockers.push("A contradictory reviewer mark against this exact retest requires a later physical trial.");
  // Even a ready reviewer packet is an unsigned operator claim and cannot authorize closure.
  return { comparison, blockers, packet_status: blockers.length ? "INDEPENDENT_HOLD_REASSESSMENT_REQUIRED" : "REVIEW_PACKET_PREPARED_ONLY",
    field_acceptance: "FIELD_ACCEPTANCE_HOLD", closure: "NOT_AUTHORIZED" };
}

export function recordHoldReassessment(history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[],
  links: readonly RepeatTrialEvidenceLink[], prior: readonly IndependentHoldReassessment[], environment: TrialEnvironment,
  handoffs: readonly RepairHandoff[], reviews: readonly ReviewEvidenceEvent[], imported: {
    trials: number; checks: number; reviews: number; links: number }, input: {
    link_index: number; mark: ReassessmentMark; reviewer_witnessed: boolean; separate_reviewer: boolean },
  now = new Date().toISOString()): IndependentHoldReassessment[] {
  if (!input.reviewer_witnessed || !safeTime(now)) throw new Error("A reviewer must personally examine the exact linked evidence before a handoff note.");
  const assessment = assessHoldReassessment(history, checks, links, input.link_index, environment, handoffs, reviews, imported);
  if (input.mark === "packet_prepared_only" && (!input.separate_reviewer ||
    assessment.packet_status !== "REVIEW_PACKET_PREPARED_ONLY")) {
    throw new Error("Reviewer packet cannot be prepared while any fresh evidence, source identity or independent witness gap remains.");
  }
  const updated: IndependentHoldReassessment[] = [...prior, { link_index: input.link_index, mark: input.mark,
    reviewed_at: now, reviewer_witnessed: true, separate_reviewer_attested: input.separate_reviewer,
    field_acceptance: "FIELD_ACCEPTANCE_HOLD", closure: "NOT_AUTHORIZED" }];
  validateReassessments(history, checks, handoffs, reviews, links, updated);
  return updated;
}

export function createReassessmentReceipt(environment: TrialEnvironment, readings: readonly TrialSourceReading[],
  history: readonly TrialObservation[], handoffs: readonly RepairHandoff[], reviews: readonly ReviewEvidenceEvent[],
  checks: readonly SourceIdentityCheck[], links: readonly RepeatTrialEvidenceLink[],
  reassessments: readonly IndependentHoldReassessment[], now = new Date().toISOString()): ReassessmentReceipt {
  if (!safeTime(now)) throw new Error("Invalid reassessment export timestamp.");
  validateLinks(history, checks, links, now);
  validateReassessments(history, checks, handoffs, reviews, links, reassessments, now);
  return { kind: "rosevear_repeat_trial_reassessment", schema_version: 1, exported_at: now,
    field_acceptance: "FIELD_ACCEPTANCE_HOLD", independent_review: "INDEPENDENT_REVIEW_HOLD",
    closure: "NOT_AUTHORIZED", automatic_dispatch: "DISABLED", evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS",
    source_routing: createFieldRoutingReceipt(environment, readings, history, handoffs, reviews, checks, now),
    trial_links: links.map(item => ({ ...item })), reassessments: reassessments.map(item => ({ ...item })) };
}

export function parseReassessmentReceipt(raw: string): {
  trial: FieldRoutingReceipt["independent_review"]["reconciliation"]["trial"];
  handoffs: RepairHandoff[]; events: ReviewEvidenceEvent[]; checks: SourceIdentityCheck[];
  links: RepeatTrialEvidenceLink[]; reassessments: IndependentHoldReassessment[];
} {
  if (raw.length > 580_000) throw new Error("Private Build 152 reassessment receipt exceeds 580 KB.");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("Private reassessment receipt is not valid JSON."); }
  if (!parsed || typeof parsed !== "object") throw new Error("Invalid reassessment receipt.");
  const receipt = parsed as Record<string, unknown>;
  if (receipt.kind !== "rosevear_repeat_trial_reassessment") {
    return { ...parseFieldRoutingReceipt(raw), links: [], reassessments: [] };
  }
  const allowed = ["kind", "schema_version", "exported_at", "field_acceptance", "independent_review", "closure",
    "automatic_dispatch", "evidence_authenticity", "source_routing", "trial_links", "reassessments"];
  if (Object.keys(receipt).some(key => !allowed.includes(key)) || receipt.schema_version !== 1 ||
    receipt.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" || receipt.independent_review !== "INDEPENDENT_REVIEW_HOLD" ||
    receipt.closure !== "NOT_AUTHORIZED" || receipt.automatic_dispatch !== "DISABLED" ||
    receipt.evidence_authenticity !== "UNVERIFIED_PRIVATE_ATTESTATIONS" || !safeTime(receipt.exported_at) ||
    !receipt.source_routing || typeof receipt.source_routing !== "object" ||
    !Array.isArray(receipt.trial_links) || !Array.isArray(receipt.reassessments)) {
    throw new Error("Unsafe or unsupported Build 152 reassessment receipt.");
  }
  const inner = receipt.source_routing as FieldRoutingReceipt;
  if (inner.kind !== "rosevear_owner_source_identity_routing") {
    throw new Error("Build 152 requires the complete validated Build 151 source routing receipt.");
  }
  if (Date.parse(inner.exported_at) > Date.parse(receipt.exported_at as string)) {
    throw new Error("Reassessment receipt predates its routing evidence.");
  }
  const prior = parseFieldRoutingReceipt(JSON.stringify(inner));
  const links = receipt.trial_links as RepeatTrialEvidenceLink[];
  const reassessments = receipt.reassessments as IndependentHoldReassessment[];
  validateLinks(prior.trial.observations, prior.checks, links, receipt.exported_at as string);
  validateReassessments(prior.trial.observations, prior.checks, prior.handoffs, prior.events, links, reassessments,
    receipt.exported_at as string);
  return { ...prior, links: links.map(item => ({ ...item })), reassessments: reassessments.map(item => ({ ...item })) };
}
