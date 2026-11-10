import { describe, expect, it } from "vitest";
import { prepareFieldPacket297 } from "./windowsFieldPacket297";
import { recordOwnerChecklist296 } from "./windowsCustodyReview296";
import { reviewDecisionEvidence300 } from "./windowsReviewerDecision300";
import { AUTHORITY_GATES_301, authorityEnrollmentChecklist301,
  exportProtectedIntakeStatus301, inspectReceiptCandidate301,
  recordLocalReplaySimulation301 } from "./windowsAuthorityReplay301";
import type { CustodyNote295 } from "./windowsCustodyHandoff295";

const SHA = "a".repeat(40);
const NOW = Date.parse("2026-11-10T11:05:00.000Z");
const note: CustodyNote295 = {
  reviewedAtUtc: "2026-11-10T11:00:00.000Z",
  source: "BROWSER_SESSION_OWNER_REPORTED_CHAIN_ONLY", sourceSha: SHA,
  unsignedDigest: "b".repeat(64), localIntakeAtUtc: "2026-11-10T10:56:00.000Z",
  supervisedReviewAtUtc: "2026-11-10T10:58:00.000Z",
  supervisedAction: "REVIEW_ORIGINAL_HOST", linkage: "SOURCE_AND_TIME_CORRELATION_ONLY",
  authority: "OWNER_ACKNOWLEDGED_DRY_RUN_ONLY", verifiedRegistryRecords: 0,
  independentlyVerifiedGates: 0, physicalHostAccepted: false,
  cryptographicReceiptVerified: false, masterShellPublisherAuthorized: false,
};
const checklist = recordOwnerChecklist296({ note, expectedMainSha: SHA,
  acknowledged: true, nowMs: NOW - 60_000 })!;
const packet = prepareFieldPacket297({ note, checklist, expectedMainSha: SHA,
  acknowledged: true, nowMs: NOW })!;
const reviewer = {
  schema: "rosevear.ai-hub.original-host-reviewer-candidate.v1", sourceId: "rosevear-ai-hub",
  sourceSha: SHA, custodyDigestClaim: "b".repeat(64), reviewerReference: "REVIEW_299_A",
  reviewedAtUtc: "2026-11-10T11:05:01.000Z", evidenceOrigin: "OWNER_SUPPLIED_METADATA_ONLY",
  independentIdentityState: "NOT_VERIFIED", signatureState: "NOT_VERIFIED",
  originalHostState: "NOT_VERIFIED", ownerConsentState: "NOT_VERIFIED",
};
const decision = {
  schema: "rosevear.ai-hub.reviewer-decision-candidate.v1", sourceId: "rosevear-ai-hub",
  sourceSha: SHA, reviewerReference: "REVIEW_299_A", decisionReference: "DECISION_300_A",
  decidedAtUtc: "2026-11-10T11:05:02.000Z", decision: "DEFER_PENDING_INDEPENDENT_EVIDENCE",
  evidenceOrigin: "OWNER_SUPPLIED_METADATA_ONLY", reviewerIdentityState: "NOT_VERIFIED",
  originalReceiptState: "NOT_VERIFIED", ownerConsentState: "NOT_VERIFIED",
  shellAuthority: "NOT_GRANTED", transport: "DISABLED",
};
const report300 = reviewDecisionEvidence300({ packetRaw: JSON.stringify(packet),
  reviewerRaw: JSON.stringify(reviewer), decisionRaw: JSON.stringify(decision),
  expectedMainSha: SHA, observedMainSha: SHA, nowMs: NOW + 3000 });
const receipt = {
  schema: "rosevear.ai-hub.receipt-replay-candidate.v1", sourceId: "rosevear-ai-hub",
  sourceSha: SHA, receiptReference: "RECEIPT_301_A", receiptDigestClaim: "c".repeat(64),
  nonceReference: "NONCE_301_A", sequence: 1,
  issuedAtUtc: "2026-11-10T11:04:00.000Z", expiresAtUtc: "2026-11-10T11:08:00.000Z",
  evidenceOrigin: "OWNER_SUPPLIED_METADATA_ONLY", signatureState: "NOT_VERIFIED",
  publisherAuthorization: "NOT_GRANTED",
};
const inspect = (raw: unknown = receipt, prior: Parameters<typeof inspectReceiptCandidate301>[0]["prior"] = [],
  extras: Partial<Parameters<typeof inspectReceiptCandidate301>[0]> = {}) =>
  inspectReceiptCandidate301({ candidateRaw: JSON.stringify(raw), expectedMainSha: SHA,
    decision: report300, prior, nowMs: NOW + 4000, ...extras });

describe("Build 301 authority enrollment and protected intake replay simulation", () => {
  it("shows independent enrollment requirements without granting any trust", () => {
    expect(report300.state).toBe("CANDIDATE_DEFERRED_HOLD");
    const list = authorityEnrollmentChecklist301(report300);
    expect(list.gateStates).toHaveLength(AUTHORITY_GATES_301.length);
    expect(list.gateStates.every(g => g.state === "PROTECTED_INDEPENDENT_PROOF_REQUIRED")).toBe(true);
    expect(list.enrolledAuthorities).toBe(0);
    expect(list.actualReplayRegistry).toBe("NOT_CONNECTED");
    expect(list.authorizedToPublish).toBe(false);
  });
  it("simulates a fresh bounded candidate but cannot accept a real receipt", () => {
    const first = inspect();
    expect(first.state).toBe("UNVERIFIED_CANDIDATE_HOLD");
    expect(first.issues).toEqual(["INDEPENDENT_AUTHORITY_NOT_ENROLLED"]);
    expect(first.acceptedReceipts).toBe(0);
    expect(first.transport).toBe("DISABLED");
    expect(recordLocalReplaySimulation301({ review: first, prior: [],
      acknowledged: false, nowMs: NOW + 4000 })).toBeNull();
    expect(recordLocalReplaySimulation301({ review: first, prior: [],
      acknowledged: true, nowMs: NOW + 4000 })?.key.receiptReference)
      .toBe("RECEIPT_301_A");
  });
  it("detects replay and collision by receipt, nonce, digest, or source sequence", () => {
    const first = inspect();
    const observation = recordLocalReplaySimulation301({ review: first, prior: [],
      acknowledged: true, nowMs: NOW + 4000 })!;
    const variants = [receipt,
      { ...receipt, receiptReference: "RECEIPT_301_B" },
      { ...receipt, nonceReference: "NONCE_301_B" },
      { ...receipt, receiptDigestClaim: "d".repeat(64) },
      { ...receipt, sequence: 2 },
    ];
    for (const variant of variants) {
      const replay = inspect(variant, [observation]);
      expect(replay.state).toBe("BLOCKED_HOLD");
      expect(replay.issues).toContain("REPLAY_OR_COLLISION_DETECTED");
      expect(recordLocalReplaySimulation301({ review: replay, prior: [observation],
        acknowledged: true, nowMs: NOW + 4000 })).toBeNull();
    }
  });
  it("rejects invalid schemas, positive trust claims, source drift and expired candidates", () => {
    for (const value of [
      { ...receipt, sourceId: "icamp" },
      { ...receipt, signatureState: "VERIFIED" },
      { ...receipt, extra: "private" },
      { ...receipt, sequence: 0 },
      { ...receipt, receiptReference: "A Person" },
    ]) expect(inspect(value).issues).toContain("RECEIPT_SCHEMA_INVALID");
    expect(inspect(receipt, [], { candidateRaw: "X".repeat(4097) }).issues)
      .toContain("RECEIPT_SCHEMA_INVALID");
    expect(inspect({ ...receipt, sourceSha: "d".repeat(40) }).issues)
      .toContain("RECEIPT_SOURCE_MISMATCH");
    expect(inspect({ ...receipt, expiresAtUtc: "2026-11-10T11:04:00.000Z" }).issues)
      .toContain("RECEIPT_TIME_INVALID");
    expect(inspect(receipt, [], { decision: reviewDecisionEvidence300({ packetRaw: "",
      reviewerRaw: "", decisionRaw: "", observedMainSha: "", expectedMainSha: SHA,
      nowMs: NOW + 4000 }) }).issues).toContain("PRIOR_DECISION_NOT_REVIEWABLE");
  });
  it("downloads only a bounded, explicitly acknowledged HOLD readiness envelope", () => {
    const request = { expectedMainSha: SHA, decision: report300, simulatedCandidates: 1,
      acknowledged: true, nowMs: NOW + 4000 };
    expect(exportProtectedIntakeStatus301({ ...request, acknowledged: false })).toBeNull();
    expect(exportProtectedIntakeStatus301({ ...request, simulatedCandidates: 51 })).toBeNull();
    const output = exportProtectedIntakeStatus301(request)!;
    expect(output.connection).toBe("HOLD");
    expect(output.published).toBe(false);
    expect(output.independentlyVerifiedReceipts).toBe(0);
    expect(output.persistentReplayLedger).toBe("NOT_CONNECTED");
    expect(JSON.stringify(output)).not.toContain("RECEIPT_301_A");
    expect(JSON.stringify(output)).not.toContain("c".repeat(64));
  });
});
