import { describe, expect, it } from "vitest";
import { compareRecoveryHistory292, SIGNED_RECEIPT_PREREQUISITES_292 } from "./windowsDriftContinuity292";
import type { RecoveryHistoryEntry291 } from "./windowsRecoveryDecision291";

const base: RecoveryHistoryEntry291 = {
  recordedAtUtc: "2026-11-09T12:00:00.000Z",
  decision: "DEFER_ON_HOLD", reportedDisposition: "REPORTED_DRIFT_NEEDS_REVIEW",
  reportedBackendVersionState: "VERSION_DISAGREEMENT", reportedCandidateMatches: 2,
  ownerMainSha: "a".repeat(40), evidenceStatus: "OWNER_NOTED_UNVERIFIED",
  originalHostAccepted: false, signedReceiptVerified: false, masterShellAuthorized: false,
};
describe("Build 292 original-host history continuity", () => {
  it("groups consecutive drift episodes and never infers verified resolution", () => {
    const report = compareRecoveryHistory292([
      base, { ...base, recordedAtUtc: "2026-11-09T13:00:00.000Z" },
      { ...base, recordedAtUtc: "2026-11-09T14:00:00.000Z",
        reportedDisposition: "REPORTED_CANDIDATES_CONVERGE_UNVERIFIED" },
    ]);
    expect(report.episodes).toHaveLength(2);
    expect(report.episodes[0].observationCount).toBe(2);
    expect(report.transitions[0].interpretation).toBe("REPORTED_TRANSITION_ONLY_NOT_VERIFIED_CLOSURE");
    expect(report.independentlyVerifiedReceipts).toBe(0);
    expect(report.signedReceiptIntake).toBe("PREREQUISITES_ONLY_HOLD");
  });
  it("does not conflate different source refs or invalid records", () => {
    const report = compareRecoveryHistory292([
      base, { ...base, ownerMainSha: "b".repeat(40) },
      { ...base, originalHostAccepted: true } as unknown as RecoveryHistoryEntry291,
    ]);
    expect(report.comparedObservations).toBe(2);
    expect(report.episodes).toHaveLength(2);
  });
  it("caps observations and keeps seven intake gates in HOLD", () => {
    const report = compareRecoveryHistory292(Array(30).fill(base));
    expect(report.comparedObservations).toBe(20);
    expect(SIGNED_RECEIPT_PREREQUISITES_292).toHaveLength(7);
    expect(report.originalHostAcceptance).toBe("HOLD_UNVERIFIED");
  });
});
