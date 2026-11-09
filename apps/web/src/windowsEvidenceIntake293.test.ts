import { describe, expect, it } from "vitest";
import { exportIntakeReview293, RECEIPT_VERIFICATION_GATES_293, reviewOriginalWindowsIntake293 } from "./windowsEvidenceIntake293";
import type { OfflineHandoffReview289 } from "./windowsOfflineHandoffReview289";
import type { DriftEpisode292 } from "./windowsDriftContinuity292";

const SHA = "a".repeat(40);
const ALT = "b".repeat(40);
const NOW = Date.parse("2026-11-09T22:00:00.000Z");
const handoff: OfflineHandoffReview289 = {
  state: "DIGEST_MATCH_UNVERIFIED", digest: "c".repeat(64),
  sampleAt: "2026-11-09T21:58:00.000Z", ownerRecordedAt: "2026-11-09T21:59:00.000Z",
  releaseCandidate: SHA, checkoutCandidate: SHA,
  ownerOutcome: "owner_reported_working", olderThanFiveMinutes: false,
  driftAcknowledged: false,
};
const episode: DriftEpisode292 = {
  firstObservedUtc: "2026-11-09T21:50:00.000Z",
  lastObservedUtc: "2026-11-09T21:55:00.000Z",
  observationCount: 2, sourceSha: SHA,
  disposition: "REPORTED_DRIFT_NEEDS_REVIEW", status: "REPORTED_DRIFT_UNVERIFIED",
};
const input = {
  handoff, episodes: [episode], expectedMainSha: SHA, acknowledged: true, nowMs: NOW,
};

describe("Build 293 local original-Windows intake review", () => {
  it("requires a deliberate owner/operator acknowledgement at the moment of review", () => {
    expect(reviewOriginalWindowsIntake293({ ...input, acknowledged: false }))
      .toEqual({ state: "REJECTED", reason: "OWNER_ACKNOWLEDGEMENT_REQUIRED" });
    expect(reviewOriginalWindowsIntake293({ ...input, handoff: null }))
      .toEqual({ state: "REJECTED", reason: "UNSAFE_UNSIGNED_HANDOFF" });
    expect(reviewOriginalWindowsIntake293({ ...input, handoff: { state: "REJECTED", reason: "INVALID_JSON" } }))
      .toEqual({ state: "REJECTED", reason: "UNSAFE_UNSIGNED_HANDOFF" });
  });
  it("cross-references only the reported source and never upgrades receipt or original host trust", () => {
    const result = reviewOriginalWindowsIntake293(input);
    expect(result.state).toBe("LOCAL_REVIEW_ON_HOLD");
    if (result.state !== "LOCAL_REVIEW_ON_HOLD") throw new Error("Unexpected rejected result");
    expect(result.note.relatedEpisodeCount).toBe(1);
    expect(result.note.crossReference).toBe("REPORTED_SOURCE_ALIGNMENT_UNVERIFIED");
    expect(result.note.originalHostAcceptance).toBe("HOLD_UNVERIFIED");
    expect(result.note.receiptVerification).toBe("HOLD_NOT_CRYPTOGRAPHICALLY_VERIFIED");
    expect(result.note.independentlyVerifiedGateCount).toBe(0);
    expect(exportIntakeReview293([result.note]).signedReceiptVerification)
      .toBe("HOLD_NOT_CRYPTOGRAPHICALLY_VERIFIED");
  });
  it("displays disagreement, source mismatch and missing candidate independently", () => {
    const drift = reviewOriginalWindowsIntake293({ ...input, handoff: {
      ...handoff, checkoutCandidate: ALT,
    } });
    expect(drift.state === "LOCAL_REVIEW_ON_HOLD" && drift.note.crossReference).toBe("REPORTED_CANDIDATE_DRIFT");
    const mismatch = reviewOriginalWindowsIntake293({ ...input, expectedMainSha: ALT });
    expect(mismatch.state === "LOCAL_REVIEW_ON_HOLD" && mismatch.note.crossReference).toBe("SOURCE_MISMATCH");
    const missing = reviewOriginalWindowsIntake293({ ...input, handoff: {
      ...handoff, checkoutCandidate: null, releaseCandidate: null,
    } });
    expect(missing.state === "LOCAL_REVIEW_ON_HOLD" && missing.note.crossReference).toBe("MISSING_CANDIDATES");
  });
  it("rejects invalid source, clock and future evidence, and marks old samples historical", () => {
    expect(reviewOriginalWindowsIntake293({ ...input, expectedMainSha: "token=unsafe" }).state).toBe("REJECTED");
    expect(reviewOriginalWindowsIntake293({ ...input, nowMs: Number.NaN }).state).toBe("REJECTED");
    expect(reviewOriginalWindowsIntake293({ ...input, handoff: {
      ...handoff, sampleAt: "2026-11-09T23:30:00.000Z",
    } }).state).toBe("REJECTED");
    const old = reviewOriginalWindowsIntake293({ ...input, nowMs: NOW + 60 * 60_000 });
    expect(old.state === "LOCAL_REVIEW_ON_HOLD" && old.note.historicalSample).toBe(true);
  });
  it("retains only ten metadata-only notes and seven independent HOLD gates", () => {
    const result = reviewOriginalWindowsIntake293(input);
    if (result.state !== "LOCAL_REVIEW_ON_HOLD") throw new Error("Unexpected rejected result");
    const exported = exportIntakeReview293(Array(15).fill(result.note));
    expect(exported.notes).toHaveLength(10);
    expect(exported.independentlyVerifiedGateCount).toBe(0);
    expect(RECEIPT_VERIFICATION_GATES_293).toHaveLength(7);
    expect(JSON.stringify(exported)).not.toMatch(/token=|SECRET|privateKey/);
  });
});
