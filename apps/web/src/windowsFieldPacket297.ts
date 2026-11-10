import { FIELD_RECEIPT_CHECKLIST_296, validCustody296, type ChecklistReview296 } from "./windowsCustodyReview296";
import type { CustodyNote295 } from "./windowsCustodyHandoff295";

/** Named applications are routing candidates, never proof that any transport exists. */
export const SOURCE_MAP_297 = [
  { application: "rosevear-ai-hub", role: "LOCAL_SOURCE", lane: "ORIGINAL_WINDOWS_EVIDENCE" },
  { application: "ai-data-platform", role: "MASTER_INTELLIGENCE", lane: "READ_ONLY_HEALTH_AND_EVIDENCE" },
  { application: "rosevear-comms-hub", role: "MASTER_OPERATIONS", lane: "OWNER_REVIEW_AND_INCIDENTS" },
  { application: "devilndove", role: "BUSINESS_SOURCE", lane: "TENANT_SCOPED_STATUS_ONLY" },
  { application: "rosiedazzlers", role: "BUSINESS_SOURCE", lane: "TENANT_SCOPED_STATUS_ONLY" },
  { application: "yw", role: "SAAS_SOURCE", lane: "TENANT_SCOPED_STATUS_ONLY" },
  { application: "icamp", role: "SAAS_SOURCE", lane: "TENANT_SCOPED_STATUS_ONLY" },
] as const;

const SHA = /^[a-f0-9]{40}$/;
export function prepareFieldPacket297(input: {
  note: CustodyNote295 | null;
  checklist: ChecklistReview296 | null;
  expectedMainSha: string;
  acknowledged: boolean;
  nowMs: number;
}) {
  const sha = input.expectedMainSha.trim().toLowerCase();
  if (!input.acknowledged || !SHA.test(sha) ||
      !Number.isSafeInteger(input.nowMs) || input.nowMs < 0 ||
      !validCustody296(input.note, sha, input.nowMs)) return null;
  const note = input.note;
  if (!note) return null;
  const checklist = input.checklist;
  if (!checklist || checklist.sourceSha !== sha ||
      checklist.ownerDecision !== "APPROVE_CHECKLIST_FOR_FIELD_REVIEW_ONLY" ||
      checklist.verifiedGateCount !== 0 || checklist.receiptAccepted !== false ||
      checklist.shellAuthorized !== false || checklist.originalHostAccepted !== false ||
      checklist.signedOwnerConsentVerified !== false ||
      checklist.gateStates.length !== FIELD_RECEIPT_CHECKLIST_296.length ||
      !FIELD_RECEIPT_CHECKLIST_296.every(g => checklist.gateStates.some(s =>
        s.id === g.id && s.state === "INDEPENDENT_PROOF_NOT_RECEIVED")) ||
      !Number.isFinite(Date.parse(checklist.reviewedAtUtc)) ||
      Date.parse(checklist.reviewedAtUtc) > input.nowMs + 60_000 ||
      Date.parse(checklist.reviewedAtUtc) < Date.parse(note.reviewedAtUtc)) return null;
  return {
    schema: "rosevear.ai-hub.independent-field-review-packet.v1" as const,
    createdAtUtc: new Date(input.nowMs).toISOString(),
    sourceSha: sha,
    provenance: "PRIVATE_BROWSER_SESSION_UNVERIFIED" as const,
    ownerAction: "SUPERVISED_REVIEW_HANDOFF_ONLY" as const,
    custodyDigestClaim: note.unsignedDigest,
    originalHostVerified: false as const,
    independentSignerVerified: false as const,
    witnessVerified: false as const,
    signedConsentVerified: false as const,
    cryptographicReceiptVerified: false as const,
    evidenceRequirements: FIELD_RECEIPT_CHECKLIST_296,
    sourceMapping: SOURCE_MAP_297.map(m => ({ ...m, connection: "NOT_VERIFIED" as const,
      transport: "DISABLED" as const, published: false as const })),
    verifiedReceipts: 0 as const,
    shellMessagesSent: 0 as const,
    productionAuthorization: "HOLD" as const,
  };
}
