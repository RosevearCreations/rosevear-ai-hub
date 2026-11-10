import { describe, expect, it } from "vitest";
import { checkSyntheticReplay294, recordSupervisedReview294, runSyntheticReplayHarness294 } from "./windowsSupervisedAcceptance294";
import type { IntakeNote293 } from "./windowsEvidenceIntake293";

const SHA = "a".repeat(40);
const NOW = Date.parse("2026-11-09T22:00:00.000Z");
const note: IntakeNote293 = {
  reviewedAtUtc: "2026-11-09T21:59:00.000Z",
  source: "OWNER_SELECTED_UNSIGNED_HANDOFF_UNVERIFIED",
  digest: "c".repeat(64), reportedReleaseSha: SHA, reportedCheckoutSha: SHA,
  expectedMainSha: SHA, crossReference: "REPORTED_SOURCE_ALIGNMENT_UNVERIFIED",
  relatedEpisodeCount: 1, historicalSample: false,
  ownerReview: "ACKNOWLEDGED_LOCAL_REVIEW_ONLY", originalHostAcceptance: "HOLD_UNVERIFIED",
  receiptVerification: "HOLD_NOT_CRYPTOGRAPHICALLY_VERIFIED",
  masterShellAuthorization: "HOLD_UNVERIFIED", independentlyVerifiedGateCount: 0,
};

describe("Build 294 owner-supervised original Windows acceptance design", () => {
  const input = { notes: [note], expectedMainSha: SHA, acknowledged: true,
    action: "MAP_SIGNER_WITNESS" as const, nowMs: NOW };
  it("fails closed without owner acknowledgement, source or clean local intake review", () => {
    expect(recordSupervisedReview294({ ...input, acknowledged: false })).toBeNull();
    expect(recordSupervisedReview294({ ...input, notes: [] })).toBeNull();
    expect(recordSupervisedReview294({ ...input, expectedMainSha: "bad" })).toBeNull();
    expect(recordSupervisedReview294({ ...input, nowMs: Number.NaN })).toBeNull();
    expect(recordSupervisedReview294({ ...input, notes: [{
      ...note, independentlyVerifiedGateCount: 1,
    } as unknown as IntakeNote293] })).toBeNull();
    expect(recordSupervisedReview294({ ...input, notes: [{...note, expectedMainSha: "b".repeat(40)}]})).toBeNull();
  });
  it("maps seven independent evidence authorities while all trust flags remain false", () => {
    const result = recordSupervisedReview294(input);
    expect(result?.evidenceMapping).toHaveLength(7);
    expect(result?.linkedIntakeCount).toBe(1);
    expect(result?.evidenceMapping.every(gate => gate.reviewState === "INDEPENDENT_REVIEW_REQUIRED")).toBe(true);
    expect(result?.originalHostAccepted).toBe(false);
    expect(result?.signerWitnessVerified).toBe(false);
    expect(result?.receiptVerified).toBe(false);
    expect(result?.masterShellAuthorized).toBe(false);
  });
});

describe("Build 294 synthetic receipt replay-safety harness", () => {
  it("rejects exact replay, event collisions, nonce reuse, time errors, audience and source changes", () => {
    const report = runSyntheticReplayHarness294(NOW);
    expect(report.results.map(item => item.verdict)).toEqual([
      "SIMULATED_FRESH_UNVERIFIED", "WOULD_BLOCK_REPLAY", "WOULD_BLOCK_EVENT_COLLISION",
      "WOULD_BLOCK_NONCE_REUSE", "WOULD_BLOCK_TIME_WINDOW", "WOULD_BLOCK_TIME_WINDOW",
      "WOULD_BLOCK_SOURCE_OR_AUDIENCE", "WOULD_BLOCK_SOURCE_OR_AUDIENCE",
    ]);
    expect(report.verifiedSignatures).toBe(0);
    expect(report.productionReceiptsAccepted).toBe(0);
  });
  it("rejects malformed strings and unsafe time windows without granting signing authority", () => {
    const report = runSyntheticReplayHarness294(NOW);
    const sample = {eventId:"demo-event-1",nonce:"demo-nonce-1",digest:"a".repeat(64),
      issuedAtMs: NOW-30_000,expiresAtMs:NOW+60_000,audience:"ai-data-platform",sourceId:"rosevear-ai-hub"};
    expect(checkSyntheticReplay294({...sample,eventId:"unsafe=\\n"},[],NOW)).toBe("WOULD_BLOCK_MALFORMED");
    expect(checkSyntheticReplay294({...sample,digest:"not-a-sha"},[],NOW)).toBe("WOULD_BLOCK_MALFORMED");
    expect(checkSyntheticReplay294({...sample,expiresAtMs:NOW+3600_000},[],NOW)).toBe("WOULD_BLOCK_TIME_WINDOW");
    expect(report.independentHostAcceptance).toBe("HOLD_UNVERIFIED");
  });
});
