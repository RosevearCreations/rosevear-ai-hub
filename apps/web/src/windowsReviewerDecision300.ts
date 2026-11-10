import { reconcileOriginalProvenance299 } from "./windowsProvenance299";

const SHA40 = /^[a-f0-9]{40}$/;
const REF = /^[A-Z0-9][A-Z0-9_-]{3,63}$/;
const ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const DECISION_KEYS = ["schema", "sourceId", "sourceSha", "reviewerReference",
  "decisionReference", "decidedAtUtc", "decision", "evidenceOrigin",
  "reviewerIdentityState", "originalReceiptState", "ownerConsentState",
  "shellAuthority", "transport"] as const;

export type DecisionIssue300 = "PROVENANCE_NOT_CORRELATED" | "SOURCE_REVISION_UNAVAILABLE" |
  "SOURCE_REVISION_DRIFT" | "DECISION_CANDIDATE_MISSING" | "DECISION_SCHEMA_INVALID" |
  "DECISION_REVIEWER_MISMATCH" | "DECISION_SOURCE_MISMATCH" |
  "DECISION_CHRONOLOGY_INVALID" | "DECISION_STALE" | "INDEPENDENT_AUTHORITY_MISSING";

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function hasExactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return record(value) && Object.keys(value).length === keys.length &&
    keys.every(key => Object.hasOwn(value, key));
}
function utcMs(value: unknown): number | null {
  if (typeof value !== "string" || !ISO.test(value)) return null;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) && milliseconds >= 0 &&
    new Date(milliseconds).toISOString() === value ? milliseconds : null;
}

/** Candidate disposition correlation only: no identity verifier, network or trusted registry. */
export function reviewDecisionEvidence300(input: {
  packetRaw: string;
  reviewerRaw: string;
  decisionRaw: string;
  expectedMainSha: string;
  observedMainSha: string;
  nowMs: number;
}) {
  const provenance = reconcileOriginalProvenance299(input);
  const issues: DecisionIssue300[] = [];
  if (provenance.state !== "CANDIDATE_CORRELATED_HOLD")
    issues.push("PROVENANCE_NOT_CORRELATED");
  if (!SHA40.test(input.expectedMainSha) || !SHA40.test(input.observedMainSha))
    issues.push("SOURCE_REVISION_UNAVAILABLE");
  else if (input.expectedMainSha !== input.observedMainSha)
    issues.push("SOURCE_REVISION_DRIFT");

  let decision: unknown;
  let reviewer: unknown;
  if (!input.decisionRaw.trim()) issues.push("DECISION_CANDIDATE_MISSING");
  else if (input.decisionRaw.length > 4096 || !Number.isSafeInteger(input.nowMs) ||
    input.nowMs < 0) issues.push("DECISION_SCHEMA_INVALID");
  else {
    try { decision = JSON.parse(input.decisionRaw); reviewer = JSON.parse(input.reviewerRaw); }
    catch { issues.push("DECISION_SCHEMA_INVALID"); }
    if (!issues.includes("DECISION_SCHEMA_INVALID")) {
      if (!hasExactKeys(decision, DECISION_KEYS) ||
        decision.schema !== "rosevear.ai-hub.reviewer-decision-candidate.v1" ||
        decision.sourceId !== "rosevear-ai-hub" ||
        typeof decision.sourceSha !== "string" || !SHA40.test(decision.sourceSha) ||
        typeof decision.reviewerReference !== "string" || !REF.test(decision.reviewerReference) ||
        typeof decision.decisionReference !== "string" || !REF.test(decision.decisionReference) ||
        decision.decisionReference === decision.reviewerReference ||
        !["DEFER_PENDING_INDEPENDENT_EVIDENCE", "REJECT_CANDIDATE"].includes(String(decision.decision)) ||
        decision.evidenceOrigin !== "OWNER_SUPPLIED_METADATA_ONLY" ||
        decision.reviewerIdentityState !== "NOT_VERIFIED" ||
        decision.originalReceiptState !== "NOT_VERIFIED" ||
        decision.ownerConsentState !== "NOT_VERIFIED" ||
        decision.shellAuthority !== "NOT_GRANTED" || decision.transport !== "DISABLED" ||
        utcMs(decision.decidedAtUtc) === null) issues.push("DECISION_SCHEMA_INVALID");
      else {
        if (decision.sourceSha !== input.expectedMainSha)
          issues.push("DECISION_SOURCE_MISMATCH");
        if (!record(reviewer) || decision.reviewerReference !== reviewer.reviewerReference)
          issues.push("DECISION_REVIEWER_MISMATCH");
        const decisionMs = utcMs(decision.decidedAtUtc)!;
        const reviewerMs = record(reviewer) ? utcMs(reviewer.reviewedAtUtc) : null;
        if (reviewerMs === null || decisionMs < reviewerMs || decisionMs > input.nowMs + 60_000)
          issues.push("DECISION_CHRONOLOGY_INVALID");
        if (input.nowMs - decisionMs > 30 * 60_000) issues.push("DECISION_STALE");
      }
    }
  }
  const exceptionCount = issues.length;
  issues.push("INDEPENDENT_AUTHORITY_MISSING");
  const candidateAccepted = exceptionCount === 0 && hasExactKeys(decision, DECISION_KEYS);
  const rejectedCandidate = candidateAccepted && record(decision) &&
    decision.decision === "REJECT_CANDIDATE";
  return {
    schema: "rosevear.ai-hub.reviewer-decision-review.v1" as const,
    sourceId: "rosevear-ai-hub" as const,
    expectedMainSha: SHA40.test(input.expectedMainSha) ? input.expectedMainSha : null,
    provenanceState: provenance.state,
    sourceRecheck: !SHA40.test(input.expectedMainSha) || !SHA40.test(input.observedMainSha)
      ? "UNAVAILABLE_HOLD" as const : input.expectedMainSha === input.observedMainSha
        ? "OWNER_REPORTED_MATCH_UNVERIFIED" as const : "REVISION_DRIFT_HOLD" as const,
    state: candidateAccepted ? rejectedCandidate
      ? "CANDIDATE_REJECTED_HOLD" as const : "CANDIDATE_DEFERRED_HOLD" as const
      : "EXCEPTION_HOLD" as const,
    shellIntakeReadiness: candidateAccepted && !rejectedCandidate
      ? "READ_ONLY_PACKET_PREPARED_HOLD" as const : "BLOCKED_HOLD" as const,
    issues,
    independentReviewerVerified: false as const,
    originalReceiptVerified: false as const,
    signedOwnerConsentVerified: false as const,
    authorizedToPublish: false as const,
    connection: "HOLD" as const,
    messagesSent: 0 as const,
  };
}

/** Output is a local, non-authorizing handoff preview; no raw candidate information. */
export function exportShellIntake300(input: {
  report: ReturnType<typeof reviewDecisionEvidence300>;
  expectedMainSha: string;
  acknowledged: boolean;
  nowMs: number;
}) {
  if (!input.acknowledged || !SHA40.test(input.expectedMainSha) ||
    input.report.expectedMainSha !== input.expectedMainSha ||
    !Number.isSafeInteger(input.nowMs) || input.nowMs < 0 ||
    !Number.isFinite(new Date(input.nowMs).getTime())) return null;
  return {
    schema: "rosevear.ai-hub.shell-intake-readiness.v1" as const,
    createdAtUtc: new Date(input.nowMs).toISOString(),
    sourceId: "rosevear-ai-hub" as const,
    sourceSha: input.expectedMainSha,
    provenance: "PRIVATE_BROWSER_UNVERIFIED_CANDIDATE" as const,
    decisionState: input.report.state,
    sourceRecheck: input.report.sourceRecheck,
    issueCodes: input.report.issues,
    shellIntakeReadiness: input.report.shellIntakeReadiness,
    destinations: ["ai-data-platform", "rosevear-comms-hub"] as const,
    independentlyAuthenticated: false as const,
    signedReceiptVerified: false as const,
    signedOwnerConsentVerified: false as const,
    publishAuthorization: "NOT_GRANTED" as const,
    transport: "DISABLED" as const,
    messagesSent: 0 as const,
    published: false as const,
    connection: "HOLD" as const,
  };
}
