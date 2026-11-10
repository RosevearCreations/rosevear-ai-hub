import type { inspectReceiptCandidate301 } from "./windowsAuthorityReplay301";

const SHA40 = /^[a-f0-9]{40}$/;
type ReceiptReview301 = ReturnType<typeof inspectReceiptCandidate301>;

/** Required by a future separately authenticated service, not satisfied by this browser. */
export const SIGNED_RECEIPT_REQUIREMENTS_302 = [
  { id: "ORIGINAL_HOST_BINDING", required: "Independently attest original installed Windows process and release revision" },
  { id: "SOURCE_SIGNER_ENROLLMENT", required: "Enroll an authorized issuer key through a protected, audited owner-approved ceremony" },
  { id: "CANONICAL_SIGNED_PAYLOAD", required: "Define exact versioned signed bytes: source, revision, receiver, nonce, sequence, scope and expiry" },
  { id: "CRYPTOGRAPHIC_SIGNATURE", required: "Verify a permitted signature algorithm and original issuer public key, not a claimed digest" },
  { id: "INDEPENDENT_REVIEW", required: "Authenticate independent reviewer and witness evidence outside the operator browser" },
  { id: "OWNER_CONSENT", required: "Verify signed owner consent bound to source, receiver, action, time and scope" },
  { id: "DURABLE_REPLAY_LEDGER", required: "Atomically reject duplicate receipts/nonces and invalid or expired source sequences" },
  { id: "MASTER_RECEIVER_AUTHORITY", required: "Independently enroll receiver, restrict role/tenant scope and authorize the exact route" },
] as const;

/** Operator routing labels only: there is no external ticket/receiver integration. */
export const ESCALATION_ROUTES_302 = [
  { issue: "ORIGINAL_HOST_UNVERIFIED", owner: "SOURCE_OWNER", next: "Inspect original host process and installed release independently" },
  { issue: "SOURCE_SIGNER_MISSING", owner: "SOURCE_OWNER", next: "Request protected signer enrollment and key custody proof" },
  { issue: "SIGNED_RECEIPT_MISSING", owner: "SOURCE_OWNER", next: "Request an original source-signed receipt via protected intake" },
  { issue: "INDEPENDENT_REVIEW_MISSING", owner: "INDEPENDENT_REVIEWER", next: "Obtain original reviewer/witness identity and disposition" },
  { issue: "SIGNED_CONSENT_MISSING", owner: "SOURCE_OWNER", next: "Verify original owner consent for exact scope and destination" },
  { issue: "RECEIVER_ENROLLMENT_MISSING", owner: "SHELL_OPERATOR", next: "Verify approved receiver identity, role and route" },
  { issue: "DURABLE_REPLAY_LEDGER_MISSING", owner: "SHELL_OPERATOR", next: "Require server-side atomic nonce/sequence replay enforcement" },
  { issue: "SOURCE_REVISION_DRIFT", owner: "SOURCE_OWNER", next: "Recheck signed source revision against original host and main" },
  { issue: "REPLAY_SUSPECTED", owner: "SHELL_OPERATOR", next: "Quarantine candidate and independently inspect replay history" },
  { issue: "RECEIPT_SCHEMA_REJECTED", owner: "SOURCE_OWNER", next: "Request corrected original source receipt through approved channel" },
] as const;

export type EscalationIssue302 = typeof ESCALATION_ROUTES_302[number]["issue"];
export type LocalEscalation302 = {
  sequence: number;
  sourceSha: string;
  issue: EscalationIssue302;
  ownerRole: typeof ESCALATION_ROUTES_302[number]["owner"];
  nextStep: string;
  recordedAtUtc: string;
  status: "OPEN_HOLD";
  route: "OFFLINE_COMMS_REVIEW_CANDIDATE";
  messagesSent: 0;
};

export function applicableEscalations302(report: ReceiptReview301) {
  return ESCALATION_ROUTES_302.filter(route => {
    if (route.issue === "REPLAY_SUSPECTED")
      return report.issues.includes("REPLAY_OR_COLLISION_DETECTED");
    if (route.issue === "RECEIPT_SCHEMA_REJECTED")
      return report.issues.includes("RECEIPT_SCHEMA_INVALID");
    if (route.issue === "SOURCE_REVISION_DRIFT")
      return report.issues.includes("RECEIPT_SOURCE_MISMATCH") ||
        report.issues.includes("SOURCE_SHA_INVALID");
    return true; // Independent source/consent/receiver authority is never verified here.
  });
}

export function operatorIntakeReview302(report: ReceiptReview301) {
  return {
    schema: "rosevear.ai-hub.protected-operator-intake.v1" as const,
    sourceId: "rosevear-ai-hub" as const,
    workflow: "PROTECTED_ORIGINAL_RECEIPT_REVIEW_REQUIRED" as const,
    candidateState: report.state,
    issueCodes: report.issues,
    signingRequirements: SIGNED_RECEIPT_REQUIREMENTS_302.map(item => ({ ...item,
      state: "INDEPENDENT_PROOF_REQUIRED" as const })),
    availableEscalations: applicableEscalations302(report),
    independentlyVerifiedSigners: 0 as const,
    acceptedReceipts: 0 as const,
    enrolledReceivers: 0 as const,
    protectedTransport: "NOT_CONFIGURED" as const,
    authorizedToPublish: false as const,
    connection: "HOLD" as const,
  };
}

export function recordOperatorEscalation302(input: {
  expectedMainSha: string;
  report: ReceiptReview301;
  issue: EscalationIssue302;
  previous: readonly LocalEscalation302[];
  acknowledged: boolean;
  nowMs: number;
}): LocalEscalation302 | null {
  const route = applicableEscalations302(input.report).find(r => r.issue === input.issue);
  if (!input.acknowledged || !SHA40.test(input.expectedMainSha) ||
      !route || !Number.isSafeInteger(input.nowMs) || input.nowMs < 0 ||
      !Number.isFinite(new Date(input.nowMs).getTime()) ||
      input.previous.length >= 25 ||
      input.previous.some(p => p.issue === input.issue || p.sourceSha !== input.expectedMainSha))
    return null;
  return {
    sequence: input.previous.length + 1,
    sourceSha: input.expectedMainSha,
    issue: route.issue,
    ownerRole: route.owner,
    nextStep: route.next,
    recordedAtUtc: new Date(input.nowMs).toISOString(),
    status: "OPEN_HOLD",
    route: "OFFLINE_COMMS_REVIEW_CANDIDATE",
    messagesSent: 0,
  };
}

/** Sanitize any local work into a no-send HOLD status. Never export receipt bytes or opaque identifiers. */
export function exportOperatorEscalations302(input: {
  expectedMainSha: string;
  report: ReceiptReview301;
  previous: readonly LocalEscalation302[];
  acknowledged: boolean;
  nowMs: number;
}) {
  if (!input.acknowledged || !SHA40.test(input.expectedMainSha) ||
      !Number.isSafeInteger(input.nowMs) || input.nowMs < 0 ||
      !Number.isFinite(new Date(input.nowMs).getTime()) ||
      input.previous.length > 25 ||
      input.previous.some(p => p.sourceSha !== input.expectedMainSha ||
        p.status !== "OPEN_HOLD" || p.route !== "OFFLINE_COMMS_REVIEW_CANDIDATE" ||
        p.messagesSent !== 0 ||
        !ESCALATION_ROUTES_302.some(r => r.issue === p.issue && r.owner === p.ownerRole))) return null;
  return {
    schema: "rosevear.ai-hub.shell-enrollment-exception-export.v1" as const,
    createdAtUtc: new Date(input.nowMs).toISOString(),
    sourceId: "rosevear-ai-hub" as const,
    sourceSha: input.expectedMainSha,
    destinations: ["ai-data-platform", "rosevear-comms-hub"] as const,
    source: "OFFLINE_BROWSER_UNVERIFIED_REVIEW" as const,
    candidateState: input.report.state,
    issueCodes: input.report.issues,
    cases: input.previous.map(entry => ({ sequence: entry.sequence,
      issue: entry.issue, ownerRole: entry.ownerRole, status: "OPEN_HOLD" as const,
      nextStep: entry.nextStep })),
    signedReceiptVerified: false as const,
    independentReviewerVerified: false as const,
    ownerConsentVerified: false as const,
    receiverEnrolled: false as const,
    messagesSent: 0 as const,
    transport: "DISABLED" as const,
    published: false as const,
    connection: "HOLD" as const,
  };
}
