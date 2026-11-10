import type { reviewDecisionEvidence300 } from "./windowsReviewerDecision300";

type DecisionReview300 = ReturnType<typeof reviewDecisionEvidence300>;
const SHA40 = /^[a-f0-9]{40}$/;
const SHA64 = /^[a-f0-9]{64}$/;
const REF = /^[A-Z0-9][A-Z0-9_-]{3,63}$/;
const ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const RECEIPT_FIELDS = ["schema", "sourceId", "sourceSha", "receiptReference",
  "receiptDigestClaim", "nonceReference", "sequence", "issuedAtUtc", "expiresAtUtc",
  "evidenceOrigin", "signatureState", "publisherAuthorization"] as const;

/** Checklists specify the independently authenticated requirements; no step auto-enrolls. */
export const AUTHORITY_GATES_301 = [
  { id: "ORIGINAL_WINDOWS_HOST", required: "Original installed Windows process identity and release" },
  { id: "SOURCE_ISSUER_SIGNER", required: "Independent issuer/signer enrollment and key custody" },
  { id: "INDEPENDENT_REVIEWER", required: "Reviewer identity and protected witness record" },
  { id: "SIGNED_OWNER_CONSENT", required: "Original signed owner consent for exact scope" },
  { id: "MASTER_RECEIVER", required: "Receiver enrollment, nonce ledger and owner-approved route" },
] as const;

type ReplayKey301 = {
  sourceSha: string;
  receiptReference: string;
  nonceReference: string;
  receiptDigestClaim: string;
  sequence: number;
};
export type ReplaySimulation301 = { key: ReplayKey301; observedAtMs: number };
export type ReplayIssue301 = "PRIOR_DECISION_NOT_REVIEWABLE" | "SOURCE_SHA_INVALID" |
  "RECEIPT_CANDIDATE_MISSING" | "RECEIPT_SCHEMA_INVALID" |
  "RECEIPT_SOURCE_MISMATCH" | "RECEIPT_TIME_INVALID" |
  "REPLAY_OR_COLLISION_DETECTED" | "INDEPENDENT_AUTHORITY_NOT_ENROLLED";

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function exact(value: unknown, fields: readonly string[]): value is Record<string, unknown> {
  return object(value) && Object.keys(value).length === fields.length &&
    fields.every(field => Object.hasOwn(value, field));
}
function time(value: unknown): number | null {
  if (typeof value !== "string" || !ISO.test(value)) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp >= 0 &&
    new Date(timestamp).toISOString() === value ? timestamp : null;
}

export function authorityEnrollmentChecklist301(report: DecisionReview300) {
  return {
    schema: "rosevear.ai-hub.authority-enrollment-checklist.v1" as const,
    sourceId: "rosevear-ai-hub" as const,
    relatedDecision: report.state,
    gateStates: AUTHORITY_GATES_301.map(gate => ({ ...gate,
      state: "PROTECTED_INDEPENDENT_PROOF_REQUIRED" as const })),
    enrolledAuthorities: 0 as const,
    verifiedOriginalReceipts: 0 as const,
    protectedIntake: "NOT_CONFIGURED" as const,
    actualReplayRegistry: "NOT_CONNECTED" as const,
    authorizedToPublish: false as const,
  };
}

/** An in-memory replay simulation only. It does not validate signatures or write a nonce ledger. */
export function inspectReceiptCandidate301(input: {
  candidateRaw: string;
  expectedMainSha: string;
  decision: DecisionReview300;
  prior: readonly ReplaySimulation301[];
  nowMs: number;
}) {
  const issues: ReplayIssue301[] = [];
  const eligible = input.decision.state === "CANDIDATE_DEFERRED_HOLD" &&
    input.decision.shellIntakeReadiness === "READ_ONLY_PACKET_PREPARED_HOLD" &&
    input.decision.expectedMainSha === input.expectedMainSha;
  if (!eligible) issues.push("PRIOR_DECISION_NOT_REVIEWABLE");
  if (!SHA40.test(input.expectedMainSha)) issues.push("SOURCE_SHA_INVALID");
  let candidate: unknown;
  if (!input.candidateRaw.trim()) issues.push("RECEIPT_CANDIDATE_MISSING");
  else if (input.candidateRaw.length > 4096 || !Number.isSafeInteger(input.nowMs) ||
    input.nowMs < 0) issues.push("RECEIPT_SCHEMA_INVALID");
  else {
    try { candidate = JSON.parse(input.candidateRaw); }
    catch { issues.push("RECEIPT_SCHEMA_INVALID"); }
    if (!issues.includes("RECEIPT_SCHEMA_INVALID")) {
      if (!exact(candidate, RECEIPT_FIELDS) ||
        candidate.schema !== "rosevear.ai-hub.receipt-replay-candidate.v1" ||
        candidate.sourceId !== "rosevear-ai-hub" ||
        typeof candidate.sourceSha !== "string" || !SHA40.test(candidate.sourceSha) ||
        typeof candidate.receiptReference !== "string" || !REF.test(candidate.receiptReference) ||
        typeof candidate.nonceReference !== "string" || !REF.test(candidate.nonceReference) ||
        candidate.receiptReference === candidate.nonceReference ||
        typeof candidate.receiptDigestClaim !== "string" || !SHA64.test(candidate.receiptDigestClaim) ||
        typeof candidate.sequence !== "number" ||
        !Number.isSafeInteger(candidate.sequence) || candidate.sequence < 1 ||
        candidate.sequence > 1_000_000 ||
        candidate.evidenceOrigin !== "OWNER_SUPPLIED_METADATA_ONLY" ||
        candidate.signatureState !== "NOT_VERIFIED" ||
        candidate.publisherAuthorization !== "NOT_GRANTED" ||
        time(candidate.issuedAtUtc) === null || time(candidate.expiresAtUtc) === null)
        issues.push("RECEIPT_SCHEMA_INVALID");
      else {
        const parsed = candidate;
        if (candidate.sourceSha !== input.expectedMainSha)
          issues.push("RECEIPT_SOURCE_MISMATCH");
        const issued = time(candidate.issuedAtUtc)!;
        const expires = time(candidate.expiresAtUtc)!;
        if (issued > input.nowMs + 60_000 || expires <= input.nowMs ||
          expires <= issued || expires - issued > 10 * 60_000)
          issues.push("RECEIPT_TIME_INVALID");
        if (input.prior.some(previous =>
          previous.key.sourceSha === parsed.sourceSha && (
            previous.key.receiptReference === parsed.receiptReference ||
            previous.key.nonceReference === parsed.nonceReference ||
            previous.key.receiptDigestClaim === parsed.receiptDigestClaim ||
            previous.key.sequence === parsed.sequence)))
          issues.push("REPLAY_OR_COLLISION_DETECTED");
      }
    }
  }
  const parsedCandidate = exact(candidate, RECEIPT_FIELDS) ? candidate : null;
  const readyForSimulation = issues.length === 0 && parsedCandidate !== null;
  const key: ReplayKey301 | null = readyForSimulation && parsedCandidate ? {
    sourceSha: parsedCandidate.sourceSha as string,
    receiptReference: parsedCandidate.receiptReference as string,
    nonceReference: parsedCandidate.nonceReference as string,
    receiptDigestClaim: parsedCandidate.receiptDigestClaim as string,
    sequence: parsedCandidate.sequence as number,
  } : null;
  issues.push("INDEPENDENT_AUTHORITY_NOT_ENROLLED");
  return {
    schema: "rosevear.ai-hub.protected-receipt-intake-simulation.v1" as const,
    state: readyForSimulation ? "UNVERIFIED_CANDIDATE_HOLD" as const : "BLOCKED_HOLD" as const,
    issues,
    key,
    storedInRealReplayLedger: false as const,
    enrolledAuthorities: 0 as const,
    acceptedReceipts: 0 as const,
    messagesSent: 0 as const,
    transport: "DISABLED" as const,
    connection: "HOLD" as const,
  };
}

/** Single browser-session observation; no persistence, signed verification or replay acceptance. */
export function recordLocalReplaySimulation301(input: {
  review: ReturnType<typeof inspectReceiptCandidate301>;
  prior: readonly ReplaySimulation301[];
  acknowledged: boolean;
  nowMs: number;
}) {
  if (!input.acknowledged || !input.review.key ||
    input.review.state !== "UNVERIFIED_CANDIDATE_HOLD" ||
    !Number.isSafeInteger(input.nowMs) || input.nowMs < 0 ||
    input.prior.length > 50 ||
    input.prior.some(previous => previous.key.sourceSha === input.review.key!.sourceSha && (
      previous.key.receiptReference === input.review.key!.receiptReference ||
      previous.key.nonceReference === input.review.key!.nonceReference ||
      previous.key.receiptDigestClaim === input.review.key!.receiptDigestClaim ||
      previous.key.sequence === input.review.key!.sequence))) return null;
  return { key: input.review.key, observedAtMs: input.nowMs } satisfies ReplaySimulation301;
}

/** Status-only preview for offline operator review. No claim keys, nonce or raw evidence. */
export function exportProtectedIntakeStatus301(input: {
  expectedMainSha: string;
  decision: DecisionReview300;
  simulatedCandidates: number;
  acknowledged: boolean;
  nowMs: number;
}) {
  if (!input.acknowledged || !SHA40.test(input.expectedMainSha) ||
    input.decision.expectedMainSha !== input.expectedMainSha ||
    !Number.isSafeInteger(input.nowMs) || input.nowMs < 0 ||
    !Number.isFinite(new Date(input.nowMs).getTime()) ||
    !Number.isSafeInteger(input.simulatedCandidates) ||
    input.simulatedCandidates < 0 || input.simulatedCandidates > 50) return null;
  return {
    schema: "rosevear.ai-hub.protected-intake-status.v1" as const,
    createdAtUtc: new Date(input.nowMs).toISOString(),
    sourceId: "rosevear-ai-hub" as const,
    sourceSha: input.expectedMainSha,
    destinations: ["ai-data-platform", "rosevear-comms-hub"] as const,
    authorityGates: AUTHORITY_GATES_301.map(gate => ({ id: gate.id,
      state: "PROTECTED_INDEPENDENT_PROOF_REQUIRED" as const })),
    simulatedCandidates: input.simulatedCandidates,
    enrolledAuthorities: 0 as const,
    independentlyVerifiedReceipts: 0 as const,
    acceptedReceipts: 0 as const,
    persistentReplayLedger: "NOT_CONNECTED" as const,
    protectedIntake: "NOT_CONFIGURED" as const,
    ownerConsentVerified: false as const,
    shellPublishAuthorized: false as const,
    transport: "DISABLED" as const,
    published: false as const,
    connection: "HOLD" as const,
  };
}
