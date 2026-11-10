import { describe, expect, it } from "vitest";
import { prepareFieldPacket297 } from "./windowsFieldPacket297";
import { recordOwnerChecklist296 } from "./windowsCustodyReview296";
import { exportShellStatus299, reconcileOriginalProvenance299 } from "./windowsProvenance299";
import type { CustodyNote295 } from "./windowsCustodyHandoff295";

const SHA = "a".repeat(40);
const NOW = Date.parse("2026-11-10T05:15:00.000Z");
const note: CustodyNote295 = {
  reviewedAtUtc: "2026-11-10T05:05:00.000Z",
  source: "BROWSER_SESSION_OWNER_REPORTED_CHAIN_ONLY", sourceSha: SHA,
  unsignedDigest: "b".repeat(64), localIntakeAtUtc: "2026-11-10T05:00:00.000Z",
  supervisedReviewAtUtc: "2026-11-10T05:02:00.000Z",
  supervisedAction: "REVIEW_ORIGINAL_HOST",
  linkage: "SOURCE_AND_TIME_CORRELATION_ONLY",
  authority: "OWNER_ACKNOWLEDGED_DRY_RUN_ONLY",
  verifiedRegistryRecords: 0, independentlyVerifiedGates: 0,
  physicalHostAccepted: false, cryptographicReceiptVerified: false,
  masterShellPublisherAuthorized: false,
};
const checklist = recordOwnerChecklist296({ note, expectedMainSha: SHA,
  acknowledged: true, nowMs: NOW - 60_000 })!;
const packet = prepareFieldPacket297({ note, checklist, expectedMainSha: SHA,
  acknowledged: true, nowMs: NOW })!;
const reviewer = {
  schema: "rosevear.ai-hub.original-host-reviewer-candidate.v1",
  sourceId: "rosevear-ai-hub", sourceSha: SHA, custodyDigestClaim: "b".repeat(64),
  reviewerReference: "CASE_299_A", reviewedAtUtc: "2026-11-10T05:15:01.000Z",
  evidenceOrigin: "OWNER_SUPPLIED_METADATA_ONLY",
  independentIdentityState: "NOT_VERIFIED", signatureState: "NOT_VERIFIED",
  originalHostState: "NOT_VERIFIED", ownerConsentState: "NOT_VERIFIED",
};
const run = (r: unknown = reviewer, p: unknown = packet, at = NOW + 2_000) =>
  reconcileOriginalProvenance299({ packetRaw: JSON.stringify(p), reviewerRaw: JSON.stringify(r),
    expectedMainSha: SHA, nowMs: at });

describe("Build 299 original host provenance and reviewer metadata", () => {
  it("correlates claims without authenticating issuer, reviewer, consent or connection", () => {
    const result = run();
    expect(result.state).toBe("CANDIDATE_CORRELATED_HOLD");
    expect(result.issues).toEqual(["ORIGINAL_PROOF_UNVERIFIED"]);
    expect(result.originalHostAuthenticated).toBe(false);
    expect(result.independentReviewerAuthenticated).toBe(false);
    expect(result.signedReceiptVerified).toBe(false);
    expect(result.shellConnection).toBe("HOLD");
  });
  it("rejects missing, oversized, extra, spoofed and trust-positive reviewer metadata", () => {
    const missing = reconcileOriginalProvenance299({ packetRaw: JSON.stringify(packet),
      reviewerRaw: "", expectedMainSha: SHA, nowMs: NOW + 2_000 });
    expect(missing.issues).toEqual(["REVIEWER_CANDIDATE_MISSING"]);
    for (const input of [
      { ...reviewer, sourceId: "yw" },
      { ...reviewer, signatureState: "VERIFIED" },
      { ...reviewer, extra: "PASS" },
      { ...reviewer, reviewerReference: "John Smith" },
      { ...reviewer, custodyDigestClaim: "not a digest" },
    ]) expect(run(input).issues).toEqual(["REVIEWER_SCHEMA_INVALID"]);
    expect(reconcileOriginalProvenance299({ packetRaw: JSON.stringify(packet),
      reviewerRaw: "X".repeat(4097), expectedMainSha: SHA, nowMs: NOW + 2_000 })
      .issues).toEqual(["REVIEWER_SCHEMA_INVALID"]);
  });
  it("separates source drift, digest mismatch, chronology and stale reviewer", () => {
    expect(run({ ...reviewer, sourceSha: "c".repeat(40) }).issues)
      .toContain("SOURCE_REVISION_MISMATCH");
    expect(run({ ...reviewer, custodyDigestClaim: "d".repeat(64) }).issues)
      .toContain("CUSTODY_DIGEST_MISMATCH");
    expect(run({ ...reviewer, reviewedAtUtc: "2026-11-10T05:00:00.000Z" }).issues)
      .toContain("REVIEWER_CHRONOLOGY_INVALID");
    expect(run(reviewer, packet, NOW + 31 * 60_000).issues)
      .toEqual(["PACKET_NOT_REVIEWABLE"]);
    expect(run(reviewer, { ...packet, sourceSha: "c".repeat(40) }).issues)
      .toEqual(["PACKET_NOT_REVIEWABLE"]);
  });
  it("exports only a bounded fail-closed Shell status with explicit owner acknowledgement", () => {
    const report = run();
    const input = { report, expectedMainSha: SHA, acknowledged: true, nowMs: NOW + 2000 };
    expect(exportShellStatus299({ ...input, acknowledged: false })).toBeNull();
    expect(exportShellStatus299({ ...input, expectedMainSha: "wrong" })).toBeNull();
    const output = exportShellStatus299(input)!;
    expect(output.productionConnection).toBe("HOLD");
    expect(output.destinations).toEqual(["ai-data-platform", "rosevear-comms-hub"]);
    expect(output.acceptedEvidence).toBe(0);
    expect(output.messagesSent).toBe(0);
    expect(output.published).toBe(false);
    expect(JSON.stringify(output)).not.toContain("CASE_299_A");
    expect(JSON.stringify(output)).not.toContain("b".repeat(64));
  });
});

