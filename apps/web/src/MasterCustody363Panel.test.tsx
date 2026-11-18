import { describe, expect, it } from "vitest";
import { isTrustedReview363 } from "./MasterCustody363Panel";

const sample = {
  schema: "rosevear.hub.ql472.anchor-and-drill-status363.v1",
  sourceBuild: 363, originalHost: "DESKTOP-AE894KC",
  serverShell: "ai-data-platform",
  offHostStorageIndependentlyVerified: false,
  physicalUnattendedProductionGreen: false,
  threeMasterWorkerProductionGreen: false,
  commsPrivateReceiverAuthorized: false,
  webMutationAvailable: false,
  rebootCorrelation: {
    physicalRebootIndependentlyProven: false,
    authenticatedGuestRuntimeIndependentlyProven: false,
  },
  workerReviews: ["Rosevear-AIDataPlatform", "Rosevear-CommsHub"].map(worker => ({
    worker, escalation: "HOLD", pilotInstallAuthorized: false,
    sourceEvidenceMeansLivePeer: false,
    signedPeerAckIndependentlyVerified: false,
    rollbackIndependentlyWitnessed: false,
  })),
};
describe("QL-472 independent custody review never conveys live authority", () => {
  it("validates only owner read-only physical-HOLD outcomes", () => {
    expect(isTrustedReview363(sample)).toBe(true);
    expect(isTrustedReview363({ ...sample, physicalUnattendedProductionGreen: true })).toBe(false);
    expect(isTrustedReview363({ ...sample, offHostStorageIndependentlyVerified: true })).toBe(false);
    expect(isTrustedReview363({ ...sample, commsPrivateReceiverAuthorized: true })).toBe(false);
  });
  it("rejects fabricated worker approval and boot proof", () => {
    expect(isTrustedReview363({
      ...sample, workerReviews: [{ ...sample.workerReviews[0], pilotInstallAuthorized: true },
        sample.workerReviews[1]],
    })).toBe(false);
    expect(isTrustedReview363({
      ...sample, rebootCorrelation: { ...sample.rebootCorrelation,
        physicalRebootIndependentlyProven: true },
    })).toBe(false);
  });
});
