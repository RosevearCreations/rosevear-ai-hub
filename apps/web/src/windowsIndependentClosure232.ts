/** Build 232: owner-entered independent-review references; no independent verification or closure is fabricated. */
import {
  safeWindowsFieldReference, type WindowsFieldDraft, type WindowsFieldScope,
} from "./windowsFieldAcceptance228";
import { type WindowsTriageDraft } from "./windowsFindingTriage229";
import { type WindowsRetestDraft } from "./windowsRecoveryRetest230";
import {
  summarizeWindowsClosure231, type WindowsClosure231Draft, type WindowsClosure231Id,
} from "./windowsOwnerClosure231";

export type WindowsIndependent232Outcome = "not_reviewed" | "corroborated" | "conflict" | "insufficient";
export type WindowsIndependent232Basis = "none" | "independent_observation" | "redacted_independent_log" | "supervised_independent_retest";
export type WindowsOwner232Decision = "pending" | "request_retest" | "defer" | "request_closure_review";
export type WindowsIndependent232Entry = {
  sourceKey: string;
  reviewerCode: string;
  reviewerReference: string;
  reviewerBasis: WindowsIndependent232Basis;
  reviewerOutcome: WindowsIndependent232Outcome;
  separateReviewerAttested: boolean;
  reviewerRecordedAt: string;
  reviewedEvidenceKey: string;
  ownerDecision: WindowsOwner232Decision;
  ownerDecisionReference: string;
  ownerSeparatelyAuthorized: boolean;
  ownerRecordedAt: string;
  reviewedDecisionKey: string;
};
export type WindowsIndependent232Draft = Partial<Record<WindowsClosure231Id, WindowsIndependent232Entry>>;
export type WindowsIndependent232Gate =
  "awaiting_231_owner_packet" | "source_changed" | "not_started" | "independent_reference_gap" |
  "independence_attestation_gap" | "reviewer_freshness_gap" | "reviewer_conflict" |
  "reviewer_insufficient" | "owner_decision_needed" | "owner_retest_requested" |
  "owner_deferred" | "owner_authorization_gap" | "owner_freshness_gap" | "owner_closure_review_request";

export const windowsIndependent232GateLabels: Record<WindowsIndependent232Gate, string> = {
  awaiting_231_owner_packet: "Build 231 owner packet and original source required",
  source_changed: "Upstream evidence changed — independent review is stale",
  not_started: "Separate reviewer has not started",
  independent_reference_gap: "Independent reviewer and fresh corroborating reference required",
  independence_attestation_gap: "Separate reviewer attestation missing",
  reviewer_freshness_gap: "Fresh reviewer timestamp or matching evidence snapshot required",
  reviewer_conflict: "Reviewer conflict — closure remains open",
  reviewer_insufficient: "Independent evidence insufficient — closure remains open",
  owner_decision_needed: "Separate owner disposition not recorded",
  owner_retest_requested: "Owner requests another retest — remains open",
  owner_deferred: "Owner deferred — remains open",
  owner_authorization_gap: "Separate owner authorization and decision reference missing",
  owner_freshness_gap: "Fresh owner decision timestamp or matching snapshot required",
  owner_closure_review_request: "Owner requested independent closure review — NOT independently closed",
};

export const defaultIndependent232Entry: WindowsIndependent232Entry = {
  sourceKey: "", reviewerCode: "", reviewerReference: "", reviewerBasis: "none",
  reviewerOutcome: "not_reviewed", separateReviewerAttested: false,
  reviewerRecordedAt: "", reviewedEvidenceKey: "", ownerDecision: "pending",
  ownerDecisionReference: "", ownerSeparatelyAuthorized: false,
  ownerRecordedAt: "", reviewedDecisionKey: "",
};

export function windows232SourceKey(row: ReturnType<typeof summarizeWindowsClosure231>["rows"][number]): string {
  // Fully bind a decision to the original 228 observation, 229 plan, 230 retest (when required),
  // and the precise Build 231 review and witnessed evidence snapshot.
  return JSON.stringify({ id: row.id, original: row.original, prior: row.prior, owner: row.entry, gate: row.gate });
}

export function windows232ReviewerKey(entry: WindowsIndependent232Entry): string {
  return [entry.sourceKey, entry.reviewerCode, entry.reviewerReference, entry.reviewerBasis,
    entry.reviewerOutcome, String(entry.separateReviewerAttested)].join("|");
}

export function windows232DecisionKey(entry: WindowsIndependent232Entry): string {
  return [windows232ReviewerKey(entry), entry.reviewerRecordedAt, entry.reviewedEvidenceKey,
    entry.ownerDecision, entry.ownerDecisionReference, String(entry.ownerSeparatelyAuthorized)].join("|");
}

export function summarizeWindowsIndependent232(
  draft: WindowsFieldDraft, scope: WindowsFieldScope, plans: WindowsTriageDraft,
  retests: WindowsRetestDraft, closure231: WindowsClosure231Draft, decisions: WindowsIndependent232Draft,
) {
  const owner = summarizeWindowsClosure231(draft, scope, plans, retests, closure231);
  const rows = owner.rows.map(source => {
    const entry = decisions[source.id] ?? defaultIndependent232Entry;
    const sourceKey = windows232SourceKey(source);
    const linked = !!entry.sourceKey && entry.sourceKey === sourceKey;
    const priorRefs = [source.original.reference, source.original.plan.reproductionReference,
      source.prior?.retest.reference ?? "", source.prior?.retest.changeReference ?? "",
      source.entry.firstReference, source.entry.secondReference, source.entry.reviewerReference]
      .filter(Boolean);
    const validCode = (code: string) => code.length >= 4 && code === safeWindowsFieldReference(code);
    const distinctEvidence = validCode(entry.reviewerCode) && validCode(entry.reviewerReference) &&
      entry.reviewerCode !== entry.reviewerReference &&
      !priorRefs.includes(entry.reviewerCode) && !priorRefs.includes(entry.reviewerReference) &&
      entry.reviewerBasis !== "none" && entry.reviewerOutcome !== "not_reviewed";
    const ownerTime = Date.parse(source.entry.recordedAt);
    const reviewerTime = Date.parse(entry.reviewerRecordedAt);
    const decisionTime = Date.parse(entry.ownerRecordedAt);
    const freshReview = Number.isFinite(ownerTime) && Number.isFinite(reviewerTime) &&
      reviewerTime > ownerTime && entry.reviewedEvidenceKey === windows232ReviewerKey(entry);
    const validOwnerDecision = validCode(entry.ownerDecisionReference) &&
      !priorRefs.includes(entry.ownerDecisionReference) &&
      ![entry.reviewerCode, entry.reviewerReference].includes(entry.ownerDecisionReference);
    const freshDecision = Number.isFinite(decisionTime) && Number.isFinite(reviewerTime) &&
      decisionTime > reviewerTime && entry.reviewedDecisionKey === windows232DecisionKey(entry);
    let gate: WindowsIndependent232Gate;
    if (source.gate !== "owner_packet_ready") gate = "awaiting_231_owner_packet";
    else if (entry.sourceKey && !linked) gate = "source_changed";
    else if (!entry.sourceKey) gate = "not_started";
    else if (!distinctEvidence) gate = "independent_reference_gap";
    else if (!entry.separateReviewerAttested) gate = "independence_attestation_gap";
    else if (!freshReview) gate = "reviewer_freshness_gap";
    else if (entry.reviewerOutcome === "conflict" && !["request_retest", "defer"].includes(entry.ownerDecision)) gate = "reviewer_conflict";
    else if (entry.reviewerOutcome === "insufficient" && !["request_retest", "defer"].includes(entry.ownerDecision)) gate = "reviewer_insufficient";
    else if (entry.ownerDecision === "pending") gate = "owner_decision_needed";
    else if (!validOwnerDecision || (entry.ownerDecision === "request_closure_review" && !entry.ownerSeparatelyAuthorized)) gate = "owner_authorization_gap";
    else if (!freshDecision) gate = "owner_freshness_gap";
    else if (entry.ownerDecision === "request_retest") gate = "owner_retest_requested";
    else if (entry.ownerDecision === "defer") gate = "owner_deferred";
    else if (entry.reviewerOutcome !== "corroborated") gate = "owner_authorization_gap";
    else gate = "owner_closure_review_request";
    return { ...source, source, entry, gate, linked };
  });
  return {
    rows, reportedFindings: rows.length,
    ownerPacketsReady: owner.ownerPacketsReady,
    reviewRequests: rows.filter(row => row.gate === "owner_closure_review_request").length,
    sourceGaps: rows.filter(row => row.gate === "awaiting_231_owner_packet" || row.gate === "source_changed").length,
    // Source-local metadata cannot independently authenticate the reviewer or close an installed issue.
    independentlyAuthenticated: false as const,
    verifiedClosures: 0 as const,
    repairsExecuted: false as const,
    privateRelay: "OFF" as const,
    integration: "DISCONNECTED / HOLD" as const,
    vault: "SECURITY HOLD" as const,
  };
}

export function formatWindowsIndependentPacket232(
  draft: WindowsFieldDraft, scope: WindowsFieldScope, plans: WindowsTriageDraft,
  retests: WindowsRetestDraft, closure231: WindowsClosure231Draft, decisions: WindowsIndependent232Draft,
): string {
  const result = summarizeWindowsIndependent232(draft, scope, plans, retests, closure231, decisions);
  return [
    "Rosevear AI Hub — Build 232 independent evidence reconciliation and separately authorized owner decisions",
    "OWNER-ENTERED REVIEW METADATA ONLY — reviewer independence NOT AUTHENTICATED; zero verified Windows closures.",
    `Source findings ${result.reportedFindings}; ready owner packets ${result.ownerPacketsReady}; proposed closure reviews ${result.reviewRequests}; verified closures 0`,
    ...result.rows.map(row => `${row.id} / ${row.label} | Build228 ${row.original.reference} | Build229 ${row.original.plan.reproductionReference} | Build231 ${row.source.entry.firstReference}/${row.source.entry.secondReference} | reviewer ${row.entry.reviewerCode || "MISSING"} | independent ref ${row.entry.reviewerReference || "MISSING"} | reviewer outcome ${row.entry.reviewerOutcome} | reviewer time ${row.entry.reviewerRecordedAt || "MISSING"} | owner decision ${row.entry.ownerDecision} | owner ref ${row.entry.ownerDecisionReference || "MISSING"} | owner time ${row.entry.ownerRecordedAt || "MISSING"} | gate ${row.gate}`),
    ...(result.rows.length ? [] : ["NO AUTHENTIC WINDOWS OWNER FINDINGS PROVIDED — NO REVIEW OR CLOSURE CLAIMED."]),
    "No decision made in this dashboard independently verifies a reviewer, resolves a Windows incident or authorizes repairs, restore, account changes, devices or camera operations.",
    "Six-app integration DISCONNECTED / HOLD; private relay OFF; QL-275 UNDER REVIEW; vault SECURITY HOLD.",
    "Local-only safe reference identifiers; never include credential, account names, IPs, camera images, full logs, paths or sensitive backup contents.",
  ].join("\n");
}
