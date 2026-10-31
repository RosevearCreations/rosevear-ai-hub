/**
 * Build 196 / QL-271 — screens bounded, nonsecret public REVIEW CLAIMS only.
 * The authentic signed original, a human reviewer and out-of-band pin must be
 * verified outside the app. This module deliberately performs no fetches.
 */
const REPOSITORY = "RosevearCreations/rosevear-ai-hub";
const OBSERVED_MAIN = "3845613bb7b7af6bb4fa97fb10b72c2600ba0e84";
const SHA = /^[a-f0-9]{40}$/;
const FIELDS = [
  "schema", "repository", "observed_main_sha", "claimed_proof_http_status",
  "source_a_commit", "candidate_proof_b_commit", "source_to_b_claim",
  "signature_claim", "pin_claim", "reviewer_disposition",
  "reviewer_separation_claim", "observed_at", "owner_test_authorization",
  "authenticated_gateway_gets", "windows_private_relay"
] as const;

export type Ql271Return = {
  status: "NOT_RECEIVED" | "REJECTED_UNTRUSTED_OR_MALFORMED" | "UNVERIFIED_PUBLIC_REVIEW_CLAIM";
  sourceA: string | null;
  proofB: string | null;
  claimedHttp: 200 | 404 | null;
  disposition: "HOLD" | "REVIEW_PENDING" | null;
};

function empty(status: Ql271Return["status"] = "NOT_RECEIVED"): Ql271Return {
  return { status, sourceA: null, proofB: null, claimedHttp: null, disposition: null };
}

function exact(value: unknown): value is Record<(typeof FIELDS)[number], unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).length === FIELDS.length && FIELDS.every(key => Object.prototype.hasOwnProperty.call(value, key));
}

export function inspectQl271Return(raw: string, now = Date.now()): Ql271Return {
  if (!raw.trim()) return empty();
  if (raw.length > 4096 || !Number.isSafeInteger(now) || now <= 0)
    return empty("REJECTED_UNTRUSTED_OR_MALFORMED");
  try {
    const value: unknown = JSON.parse(raw);
    if (!exact(value)) return empty("REJECTED_UNTRUSTED_OR_MALFORMED");
    if (value.schema !== "rosevear.ql271.public-original-review-return.v1" ||
      value.repository !== REPOSITORY || value.observed_main_sha !== OBSERVED_MAIN ||
      typeof value.source_a_commit !== "string" || !SHA.test(value.source_a_commit) ||
      typeof value.candidate_proof_b_commit !== "string" || !SHA.test(value.candidate_proof_b_commit) ||
      value.source_a_commit === value.candidate_proof_b_commit ||
      (value.claimed_proof_http_status !== 200 && value.claimed_proof_http_status !== 404) ||
      !["NOT_REVIEWED", "REVIEWER_REPORTS_DESCENDANT"].includes(String(value.source_to_b_claim)) ||
      !["NOT_VERIFIED", "REVIEWER_REPORTS_VALID"].includes(String(value.signature_claim)) ||
      !["NOT_VERIFIED", "REVIEWER_REPORTS_PIN_MATCH"].includes(String(value.pin_claim)) ||
      (value.reviewer_disposition !== "HOLD" && value.reviewer_disposition !== "REVIEW_PENDING") ||
      !["NOT_VERIFIED", "REVIEWER_REPORTS_INDEPENDENT"].includes(String(value.reviewer_separation_claim)) ||
      typeof value.observed_at !== "number" || !Number.isSafeInteger(value.observed_at) ||
      value.observed_at > now || now - value.observed_at > 600_000 ||
      value.owner_test_authorization !== "NOT_GIVEN" ||
      value.authenticated_gateway_gets !== 0 || value.windows_private_relay !== "OFF")
      return empty("REJECTED_UNTRUSTED_OR_MALFORMED");
    return { status: "UNVERIFIED_PUBLIC_REVIEW_CLAIM", sourceA: value.source_a_commit,
      proofB: value.candidate_proof_b_commit, claimedHttp: value.claimed_proof_http_status,
      disposition: value.reviewer_disposition };
  } catch {
    return empty("REJECTED_UNTRUSTED_OR_MALFORMED");
  }
}

/** Sanitized, explicitly HELD disposition, not a signed reviewer receipt. */
export function makeQl271HoldDisposition(
  claim: Ql271Return,
  priorQl270: { status: string; proofB: string | null } | null = null
) {
  const comparison = claim.status !== "UNVERIFIED_PUBLIC_REVIEW_CLAIM" ? "NO_VALID_PUBLIC_RETURN" :
    priorQl270?.status !== "UNVERIFIED_PUBLIC_RENEWAL_CLAIM" ? "PRIOR_QL270_CLAIM_NOT_AVAILABLE" :
      priorQl270.proofB === claim.proofB ? "PUBLIC_B_CLAIMS_MATCH_UNVERIFIED" : "PUBLIC_B_CLAIMS_CONFLICT";
  return {
    schema: "rosevear.ql271.original-proof-review-hold.v1",
    repository: REPOSITORY,
    observedMainSha: OBSERVED_MAIN,
    observedMainCiUrl: "https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/41150092231",
    independentlyObservedOriginalProof: "HTTP_404",
    publicReturnStatus: claim.status,
    claimedProofB: claim.status === "UNVERIFIED_PUBLIC_REVIEW_CLAIM" ? claim.proofB : null,
    claimedHttp: claim.status === "UNVERIFIED_PUBLIC_REVIEW_CLAIM" ? claim.claimedHttp : null,
    publicClaimConflictsWithObserved404: claim.claimedHttp === 200,
    priorQl270Comparison: comparison,
    reportedReviewerDisposition: claim.disposition,
    authenticSignedOriginal: "NOT_INDEPENDENTLY_RETRIEVED_OR_VERIFIED",
    sourceAtoBAncestry: "NOT_INDEPENDENTLY_VERIFIED",
    signatureAndOutOfBandPin: "NOT_INDEPENDENTLY_VERIFIED",
    independentHumanReviewerAndCustodian: "NOT_VERIFIED",
    ownerTestAuthorization: "NOT_GIVEN",
    authenticatedGatewayGets: 0,
    windowsPrivateRelay: "OFF_NOT_INSTALLED",
    conditionalGetSlot: "HELD_UNSCHEDULED",
    activationEligible: false,
    integration: "DISCONNECTED / HOLD"
  } as const;
}
