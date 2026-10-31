/**
 * Build 200: QL-275 is an owner-deferred review item, not an active proof intake.
 * Presentation status is deliberately distinct from the fail-closed connection gate.
 */
export const QL275_REVIEW = {
  schema: "rosevear.ql275.owner-deferred-review.v1",
  trackingStatus: "UNDER_REVIEW",
  queueDisposition: "PAUSED_AT_OWNER_REQUEST",
  resumeCondition: "NEW_EXPLICIT_OWNER_DIRECTION",
  sourceMainSha: "1eb0b0216c6d26e7de795339d7e3dbd6ebb9224b",
  sourcePath: "docs/integration/ql246-source-proof.json",
  originalSourceObservation: "HTTP_404_NOT_FOUND",
  sourceCiRun: 41164501279,
  sourceCiResult: "FIVE_JOBS_SUCCESS",
  signedOriginal: "NOT_RETRIEVED",
  independentCustodianAndPinWitness: "NOT_VERIFIED",
  ownerTestAuthorization: "NOT_GIVEN",
  authenticatedGatewayGets: 0,
  privateRelay: "OFF",
  activationEligible: false,
  connection: "DISCONNECTED / HOLD"
} as const;

export function makeQl275OwnerFollowupReview(audit: {
  baselineCapturedInThisBrowserSession: boolean;
  changedChecks: number;
  reportedImprovementsStillUnwitnessed: number;
}) {
  return {
    schema: "rosevear.build200.ql275-windows-owner-followup-review.v1",
    trackingStatus: QL275_REVIEW.trackingStatus,
    queueDisposition: QL275_REVIEW.queueDisposition,
    baselineRecordedLocally: audit.baselineCapturedInThisBrowserSession,
    ownerReportedChanges: audit.changedChecks,
    reportedImprovementsAwaitingIndependentWitness: audit.reportedImprovementsStillUnwitnessed,
    actualWindowsDeviceAcceptance: "NOT_VERIFIED",
    signedOwnerApproval: "NOT_RECEIVED",
    savedToBackend: false,
    engineeringFixVerified: false,
    ownerTestAuthorization: QL275_REVIEW.ownerTestAuthorization,
    authenticatedGatewayGets: 0,
    activationEligible: false,
    connection: QL275_REVIEW.connection
  } as const;
}
