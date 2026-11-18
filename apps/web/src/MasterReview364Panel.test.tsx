import { describe, expect, it } from "vitest";
import { trustedReview364 } from "./MasterReview364Panel";

const base = {
  schema: "rosevear.hub.ql473.cross-module-acceptance364.v1",
  sourceBuild: 364,
  originalHost: "DESKTOP-AE894KC",
  serverShell: "ai-data-platform",
  featureCoverageBaseline: 68,
  sourceFeatureCoverageEstimate: 73,
  estimatedSourceFeatureGainPoints: 5,
  fieldAcceptanceEstimate: 25,
  estimatedOverallReadiness: 56,
  progressIsPlanningEstimateNotRuntimeProof: true,
  anchorStatus: "HOLD_MISSING_OR_INVALID",
  readbackStatus: "HOLD_MISSING_OR_INVALID",
  peerPilotStatus: "HOLD_MISSING_OR_INVALID",
  liveThreeMasterPilotIndependentlyVerified: false,
  offHostStorageIndependentlyProven: false,
  originalHostUnattendedRecoveryVerified: false,
  physicalUnattendedProductionGreen: false,
  threeMasterWorkerProductionGreen: false,
  commsPrivateReceiverAuthorized: false,
  workerAutomaticStartupAuthorized: false,
  webMutationAvailable: false,
  workerReviews: ["Rosevear-AIHub", "Rosevear-AIDataPlatform", "Rosevear-CommsHub"].map(worker => ({
    worker,
    readOnlySignedClaimStatus: "HOLD_MISSING_INDEPENDENT_LIVE_EVIDENCE",
    liveConnectedVerified: false,
    ownerPilotInstallationApproved: false,
    realRollbackWitnessed: false,
  })),
};

describe("QL-473 signed evidence is not physical activation authority", () => {
  it("accepts only the bounded source estimate and HOLD contract", () => {
    expect(trustedReview364(base)).toBe(true);
    expect(trustedReview364({ ...base, sourceFeatureCoverageEstimate: 78 })).toBe(false);
    expect(trustedReview364({ ...base, progressIsPlanningEstimateNotRuntimeProof: false })).toBe(false);
    expect(trustedReview364({ ...base, liveThreeMasterPilotIndependentlyVerified: true })).toBe(false);
    expect(trustedReview364({ ...base, commsPrivateReceiverAuthorized: true })).toBe(false);
  });
  it("blocks forged installed worker or operational GREEN state", () => {
    expect(trustedReview364({
      ...base,
      workerReviews: base.workerReviews.map((w, i) =>
        i === 1 ? { ...w, liveConnectedVerified: true } : w),
    })).toBe(false);
    expect(trustedReview364({ ...base, workerAutomaticStartupAuthorized: true })).toBe(false);
    expect(trustedReview364({ ...base, physicalUnattendedProductionGreen: true })).toBe(false);
  });
});
