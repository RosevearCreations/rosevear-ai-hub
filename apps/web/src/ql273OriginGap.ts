/**
 * Build 198 / QL-273: a public-only action ledger, not a custody or signature verifier.
 * Owner-reported private-channel activity cannot close a real security gate.
 */
export const QL273_GAPS = [
  { id: "original_publication", label: "Original signed Proof-B publication", action: "Signer publishes the genuine original at the agreed repository path; independently recheck at an immutable commit." },
  { id: "commit_ancestry", label: "Original A → B source ancestry", action: "Independent reviewer confirms original A and B commit ancestry against the genuine published source." },
  { id: "signer_pin", label: "Out-of-band signer pin", action: "Independent reviewer validates the genuine signer key pin over the approved private channel." },
  { id: "reviewer_custody", label: "Independent reviewer and custodian", action: "Custodian supplies an independently witnessed role-separation and custody decision privately." },
  { id: "isolated_test", label: "Bounded nonproduction TEST authorization", action: "After the preceding gates, request separate owner TEST-only approval, scoped tenant and stop-plan review." }
] as const;

export type Ql273GapId = (typeof QL273_GAPS)[number]["id"];
export type Ql273GapProgress = "not_requested" | "requested_privately" | "owner_reports_return_received";
export type Ql273GapLedger = Record<Ql273GapId, Ql273GapProgress>;
export const EMPTY_QL273_GAPS: Ql273GapLedger = {
  original_publication: "not_requested", commit_ancestry: "not_requested", signer_pin: "not_requested",
  reviewer_custody: "not_requested", isolated_test: "not_requested"
};

export function makeQl273OriginGapDisposition(progress: Ql273GapLedger) {
  const gaps = QL273_GAPS.map(gap => {
    const reportedProgress = progress[gap.id];
    const accepted = reportedProgress === "not_requested" || reportedProgress === "requested_privately" ||
      reportedProgress === "owner_reports_return_received";
    return {
      gate: gap.id,
      reportedProgress: accepted ? reportedProgress : "not_requested",
      verified: false,
      nextAction: gap.action,
      disposition: reportedProgress === "owner_reports_return_received" ? "INDEPENDENT_VERIFICATION_REQUIRED" : "OPEN"
    };
  });
  return {
    schema: "rosevear.ql273.public-origin-gap-followup.v1",
    sourceRepository: "RosevearCreations/rosevear-ai-hub",
    originalProofPath: "docs/integration/ql246-source-proof.json",
    immutableObservedMain: "11861c13801b395d9be7f8a661fe7ebf8bc25fd5",
    independentlyObservedOriginalSource: "HTTP_404_NOT_FOUND",
    sourceCheckIsHistorical: true,
    evidenceGaps: gaps,
    verifiedGates: 0,
    originalSignedProofB: "NOT_RETRIEVED",
    independentlyAuthenticatedSignerAndCustodian: false,
    ownerTestAuthorization: "NOT_GIVEN",
    authenticatedGatewayGets: 0,
    conditionalGetSlot: "HELD_UNSCHEDULED",
    windowsPrivateRelay: "OFF_NOT_INSTALLED",
    activationEligible: false,
    integration: "DISCONNECTED / HOLD"
  } as const;
}
