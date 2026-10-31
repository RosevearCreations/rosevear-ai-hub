import { describe, expect, it } from "vitest";
import { QL275_REVIEW, makeQl275OwnerFollowupReview } from "./ql275DeferredReview";

describe("Build 200 owner-deferred QL-275 review", () => {
  it("keeps the review label separate from real integration permission", () => {
    expect(QL275_REVIEW.trackingStatus).toBe("UNDER_REVIEW");
    expect(QL275_REVIEW.queueDisposition).toBe("PAUSED_AT_OWNER_REQUEST");
    expect(QL275_REVIEW.resumeCondition).toBe("NEW_EXPLICIT_OWNER_DIRECTION");
    expect(QL275_REVIEW.sourceMainSha).toBe("1eb0b0216c6d26e7de795339d7e3dbd6ebb9224b");
    expect(QL275_REVIEW.originalSourceObservation).toBe("HTTP_404_NOT_FOUND");
    expect(QL275_REVIEW.signedOriginal).toBe("NOT_RETRIEVED");
    expect(QL275_REVIEW.activationEligible).toBe(false);
    expect(QL275_REVIEW.ownerTestAuthorization).toBe("NOT_GIVEN");
    expect(QL275_REVIEW.authenticatedGatewayGets).toBe(0);
    expect(QL275_REVIEW.connection).toBe("DISCONNECTED / HOLD");
  });

  it("summarizes only local owner retest reports, never independent acceptance", () => {
    const item = makeQl275OwnerFollowupReview({
      baselineCapturedInThisBrowserSession: true,
      changedChecks: 2,
      reportedImprovementsStillUnwitnessed: 1
    });
    expect(item.trackingStatus).toBe("UNDER_REVIEW");
    expect(item.ownerReportedChanges).toBe(2);
    expect(item.reportedImprovementsAwaitingIndependentWitness).toBe(1);
    expect(item.actualWindowsDeviceAcceptance).toBe("NOT_VERIFIED");
    expect(item.signedOwnerApproval).toBe("NOT_RECEIVED");
    expect(item.savedToBackend).toBe(false);
    expect(item.engineeringFixVerified).toBe(false);
    expect(item.activationEligible).toBe(false);
    expect(item.authenticatedGatewayGets).toBe(0);
  });
});
