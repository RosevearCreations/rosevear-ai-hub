import type { IntakeNote293 } from "./windowsEvidenceIntake293";
import { RECEIPT_VERIFICATION_GATES_293 } from "./windowsEvidenceIntake293";
import type { SupervisedReview294 } from "./windowsSupervisedAcceptance294";

/** Design-stage registry contract: no registry endpoint, credential, or verifier is connected. */
export const EVIDENCE_REGISTRY_GATES_295 = RECEIPT_VERIFICATION_GATES_293.map(gate => ({
  id: gate.id, authority: gate.authority,
  requiredEvidence: gate.requirement,
  status: "INDEPENDENT_ORIGINAL_EVIDENCE_REQUIRED" as const,
})) as readonly Readonly<{
  id: string; authority: string; requiredEvidence: string;
  status: "INDEPENDENT_ORIGINAL_EVIDENCE_REQUIRED";
}>[];

export type CustodyNote295 = Readonly<{
  reviewedAtUtc: string;
  source: "BROWSER_SESSION_OWNER_REPORTED_CHAIN_ONLY";
  sourceSha: string;
  unsignedDigest: string;
  localIntakeAtUtc: string;
  supervisedReviewAtUtc: string;
  supervisedAction: SupervisedReview294["action"];
  linkage: "SOURCE_AND_TIME_CORRELATION_ONLY";
  authority: "OWNER_ACKNOWLEDGED_DRY_RUN_ONLY";
  verifiedRegistryRecords: 0;
  independentlyVerifiedGates: 0;
  physicalHostAccepted: false;
  cryptographicReceiptVerified: false;
  masterShellPublisherAuthorized: false;
}>;

export type CustodyDecision295 =
  | { state: "REJECTED"; reason:
      "OWNER_ACKNOWLEDGEMENT_REQUIRED" | "INVALID_SOURCE_OR_CLOCK" |
      "NO_VALID_LOCAL_INTAKE" | "NO_VALID_SUPERVISED_REVIEW" }
  | { state: "OWNER_CUSTODY_NOTE_ONLY"; note: CustodyNote295 };

const SHA40 = /^[a-f0-9]{40}$/;
const DIGEST64 = /^[a-f0-9]{64}$/;
function validObservedAt(iso: string, nowMs: number): number | null {
  const time = Date.parse(iso);
  return Number.isFinite(time) && time >= 0 && time <= nowMs + 60_000 ? time : null;
}

export function recordCustodyReview295(input: {
  intakeNotes: readonly IntakeNote293[];
  supervisedReviews: readonly SupervisedReview294[];
  expectedMainSha: string;
  acknowledged: boolean;
  nowMs: number;
}): CustodyDecision295 {
  if (!input.acknowledged)
    return { state: "REJECTED", reason: "OWNER_ACKNOWLEDGEMENT_REQUIRED" };
  const sha = input.expectedMainSha.trim().toLowerCase();
  if (!SHA40.test(sha) || !Number.isSafeInteger(input.nowMs) || input.nowMs < 0)
    return { state: "REJECTED", reason: "INVALID_SOURCE_OR_CLOCK" };

  // A note is a local statement only; neither its digest nor reported SHA verifies origin.
  const intakes = input.intakeNotes.slice(-10).filter(note =>
    note.source === "OWNER_SELECTED_UNSIGNED_HANDOFF_UNVERIFIED" &&
    note.expectedMainSha === sha && DIGEST64.test(note.digest) &&
    note.ownerReview === "ACKNOWLEDGED_LOCAL_REVIEW_ONLY" &&
    note.originalHostAcceptance === "HOLD_UNVERIFIED" &&
    note.receiptVerification === "HOLD_NOT_CRYPTOGRAPHICALLY_VERIFIED" &&
    note.masterShellAuthorization === "HOLD_UNVERIFIED" &&
    note.independentlyVerifiedGateCount === 0 &&
    validObservedAt(note.reviewedAtUtc, input.nowMs) !== null
  );
  if (!intakes.length) return { state: "REJECTED", reason: "NO_VALID_LOCAL_INTAKE" };

  const supervised = [...input.supervisedReviews.slice(-10)].reverse().find(review =>
    review.expectedMainSha === sha &&
    review.ownerAcknowledgement === "LOCAL_NON_AUTHORIZING_ACKNOWLEDGEMENT" &&
    review.linkedIntakeCount > 0 &&
    review.originalHostAccepted === false &&
    review.signerWitnessVerified === false &&
    review.receiptVerified === false &&
    review.masterShellAuthorized === false &&
    review.evidenceMapping.length === EVIDENCE_REGISTRY_GATES_295.length &&
    EVIDENCE_REGISTRY_GATES_295.every(gate =>
      review.evidenceMapping.some(mapped =>
        mapped.id === gate.id && mapped.authority === gate.authority &&
        mapped.reviewState === "INDEPENDENT_REVIEW_REQUIRED")) &&
    validObservedAt(review.reviewedAtUtc, input.nowMs) !== null &&
    intakes.some(note => (validObservedAt(note.reviewedAtUtc, input.nowMs) ?? Infinity) <=
      (validObservedAt(review.reviewedAtUtc, input.nowMs) ?? -Infinity))
  );
  if (!supervised) return { state: "REJECTED", reason: "NO_VALID_SUPERVISED_REVIEW" };

  const intake = [...intakes].reverse().find(note =>
    (validObservedAt(note.reviewedAtUtc, input.nowMs) ?? Infinity) <=
    (validObservedAt(supervised.reviewedAtUtc, input.nowMs) ?? -Infinity))!;
  return { state: "OWNER_CUSTODY_NOTE_ONLY", note: {
    reviewedAtUtc: new Date(input.nowMs).toISOString(),
    source: "BROWSER_SESSION_OWNER_REPORTED_CHAIN_ONLY",
    sourceSha: sha, unsignedDigest: intake.digest,
    localIntakeAtUtc: intake.reviewedAtUtc,
    supervisedReviewAtUtc: supervised.reviewedAtUtc,
    supervisedAction: supervised.action,
    linkage: "SOURCE_AND_TIME_CORRELATION_ONLY",
    authority: "OWNER_ACKNOWLEDGED_DRY_RUN_ONLY",
    verifiedRegistryRecords: 0, independentlyVerifiedGates: 0,
    physicalHostAccepted: false, cryptographicReceiptVerified: false,
    masterShellPublisherAuthorized: false,
  }};
}

export function evidenceRegistryInterface295(note: CustodyNote295 | null) {
  return {
    schema: "rosevear.ai-hub.original-windows-evidence-registry-interface.v1" as const,
    connection: "NOT_CONNECTED" as const,
    recordState: "NO_INDEPENDENT_RECORDS" as const,
    source: "BROWSER_SESSION_METADATA_ONLY" as const,
    candidateSourceSha: note?.sourceSha ?? null,
    candidateUnsignedDigest: note?.unsignedDigest ?? null,
    requirements: EVIDENCE_REGISTRY_GATES_295,
    independentVerifiedCount: 0 as const,
    acceptsEvidence: false as const,
    writesEnabled: false as const,
  };
}

export type HandoffDestination295 =
  | "AI_DATA_PLATFORM_READ_ONLY_REVIEW"
  | "COMMS_HUB_OPERATOR_REVIEW";
export type HandoffDryRun295 = Readonly<{
  schema: "rosevear.ai-hub.windows-handoff-dry-run.v1";
  simulatedAtUtc: string;
  destination: HandoffDestination295;
  sourceSha: string;
  source: "OWNER_CUSTODY_METADATA_UNVERIFIED";
  decision: "BLOCKED_UNVERIFIED_ORIGINAL_EVIDENCE";
  missingIndependentAuthorities: 7;
  registryConnected: false;
  transport: "DISABLED";
  messagesSent: 0;
  verifiedReceipts: 0;
  masterShellAuthorized: false;
}>;

export function runHandoffDryRun295(input: {
  note: CustodyNote295 | null;
  expectedMainSha: string;
  destination: HandoffDestination295;
  acknowledged: boolean;
  nowMs: number;
}): HandoffDryRun295 | null {
  const sha = input.expectedMainSha.trim().toLowerCase();
  if (!input.acknowledged || !input.note ||
    !["AI_DATA_PLATFORM_READ_ONLY_REVIEW", "COMMS_HUB_OPERATOR_REVIEW"].includes(input.destination) ||
    !SHA40.test(sha) || input.note.sourceSha !== sha ||
    input.note.source !== "BROWSER_SESSION_OWNER_REPORTED_CHAIN_ONLY" ||
    input.note.verifiedRegistryRecords !== 0 ||
    input.note.independentlyVerifiedGates !== 0 ||
    input.note.physicalHostAccepted !== false ||
    input.note.cryptographicReceiptVerified !== false ||
    input.note.masterShellPublisherAuthorized !== false ||
    !Number.isSafeInteger(input.nowMs) || input.nowMs < 0 ||
    validObservedAt(input.note.reviewedAtUtc, input.nowMs) === null) return null;
  return {
    schema: "rosevear.ai-hub.windows-handoff-dry-run.v1",
    simulatedAtUtc: new Date(input.nowMs).toISOString(),
    destination: input.destination, sourceSha: sha,
    source: "OWNER_CUSTODY_METADATA_UNVERIFIED",
    decision: "BLOCKED_UNVERIFIED_ORIGINAL_EVIDENCE",
    missingIndependentAuthorities: 7,
    registryConnected: false, transport: "DISABLED",
    messagesSent: 0, verifiedReceipts: 0, masterShellAuthorized: false,
  };
}

export function exportCustody295(notes: readonly CustodyNote295[], dryRuns: readonly HandoffDryRun295[]) {
  return {
    schema: "rosevear.ai-hub.owner-custody-dry-run.v1" as const,
    source: "PRIVATE_BROWSER_SESSION_METADATA_ONLY" as const,
    registeredEvidence: 0 as const,
    independentVerifiedAuthorities: 0 as const,
    trust: "HOLD_NOT_AUTHORIZED" as const,
    notes: notes.slice(-10),
    dryRuns: dryRuns.slice(-10),
  };
}
