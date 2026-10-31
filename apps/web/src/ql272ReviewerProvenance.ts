/**
 * QL-272 / Build 197: public provenance metadata is not a signed receipt.
 * Never fetch, sign, verify private witnesses, install a relay or approve TEST.
 */
const REPOSITORY = "RosevearCreations/rosevear-ai-hub";
const OBSERVED_MAIN = "1ffb37c4eb750b4c8969b44f76692c74845179bb";
const ORIGINAL_PATH = "docs/integration/ql246-source-proof.json";
const SHA = /^[a-f0-9]{40}$/;
const DIGEST = /^[a-f0-9]{64}$/;
const FIELDS = [
  "schema", "repository", "observed_main_sha", "original_proof_path",
  "claimed_source_http_status", "candidate_proof_b_commit", "public_source_manifest_digest",
  "public_reviewer_receipt_digest", "reviewer_provenance_claim", "independent_role_claim",
  "reviewer_disposition", "observed_at", "owner_test_authorization",
  "authenticated_gateway_gets", "windows_private_relay"
] as const;

export type Ql272Provenance = {
  status: "NOT_RECEIVED" | "REJECTED_UNTRUSTED_OR_MALFORMED" | "UNVERIFIED_PUBLIC_PROVENANCE_CLAIM";
  proofB: string | null;
  claimedHttp: 200 | 404 | null;
  distinctDigests: boolean;
  reviewerDisposition: "HOLD" | "RECHECK_REQUESTED" | null;
};

function empty(status: Ql272Provenance["status"] = "NOT_RECEIVED"): Ql272Provenance {
  return { status, proofB: null, claimedHttp: null, distinctDigests: false, reviewerDisposition: null };
}

function exactRecord(value: unknown): value is Record<(typeof FIELDS)[number], unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).length === FIELDS.length &&
    FIELDS.every(field => Object.prototype.hasOwnProperty.call(value, field));
}

export function inspectQl272PublicProvenance(raw: string, now = Date.now()): Ql272Provenance {
  if (!raw.trim()) return empty();
  if (raw.length > 4096 || !Number.isSafeInteger(now) || now <= 0)
    return empty("REJECTED_UNTRUSTED_OR_MALFORMED");
  try {
    const value: unknown = JSON.parse(raw);
    if (!exactRecord(value)) return empty("REJECTED_UNTRUSTED_OR_MALFORMED");
    if (value.schema !== "rosevear.ql272.public-reviewer-provenance.v1" ||
      value.repository !== REPOSITORY || value.observed_main_sha !== OBSERVED_MAIN ||
      value.original_proof_path !== ORIGINAL_PATH ||
      (value.claimed_source_http_status !== 200 && value.claimed_source_http_status !== 404) ||
      typeof value.candidate_proof_b_commit !== "string" || !SHA.test(value.candidate_proof_b_commit) ||
      typeof value.public_source_manifest_digest !== "string" || !DIGEST.test(value.public_source_manifest_digest) ||
      typeof value.public_reviewer_receipt_digest !== "string" || !DIGEST.test(value.public_reviewer_receipt_digest) ||
      value.public_source_manifest_digest === value.public_reviewer_receipt_digest ||
      !["NOT_ATTESTED", "REVIEWER_REPORTS_SOURCE_TRACED"].includes(String(value.reviewer_provenance_claim)) ||
      !["NOT_ATTESTED", "REVIEWER_REPORTS_SEPARATE_ROLES"].includes(String(value.independent_role_claim)) ||
      (value.reviewer_disposition !== "HOLD" && value.reviewer_disposition !== "RECHECK_REQUESTED") ||
      typeof value.observed_at !== "number" || !Number.isSafeInteger(value.observed_at) ||
      value.observed_at > now || now - value.observed_at > 600_000 ||
      value.owner_test_authorization !== "NOT_GIVEN" || value.authenticated_gateway_gets !== 0 ||
      value.windows_private_relay !== "OFF") return empty("REJECTED_UNTRUSTED_OR_MALFORMED");
    return { status: "UNVERIFIED_PUBLIC_PROVENANCE_CLAIM", proofB: value.candidate_proof_b_commit,
      claimedHttp: value.claimed_source_http_status, distinctDigests: true,
      reviewerDisposition: value.reviewer_disposition };
  } catch {
    return empty("REJECTED_UNTRUSTED_OR_MALFORMED");
  }
}

/** No receipt digests, private witness identities or raw supplied data leak. */
export function makeQl272ProvenanceHoldReport(
  claim: Ql272Provenance,
  priorQl271: { status: string; proofB: string | null } | null = null
) {
  const comparison = claim.status !== "UNVERIFIED_PUBLIC_PROVENANCE_CLAIM" ? "NO_VALID_QL272_CLAIM" :
    priorQl271?.status !== "UNVERIFIED_PUBLIC_REVIEW_CLAIM" ? "PRIOR_QL271_CLAIM_NOT_AVAILABLE" :
      priorQl271.proofB === claim.proofB ? "PUBLIC_PROOF_B_CLAIMS_MATCH_UNVERIFIED" :
        "PUBLIC_PROOF_B_CLAIMS_CONFLICT";
  const provenanceDisposition = claim.status !== "UNVERIFIED_PUBLIC_PROVENANCE_CLAIM" ? "NO_PROVENANCE_RETURN" :
    claim.claimedHttp === 200 ? "CONTRADICTS_IMMUTABLE_SOURCE_HTTP_404" :
      comparison === "PUBLIC_PROOF_B_CLAIMS_CONFLICT" ? "B_CLAIM_CONTRADICTION_HOLD" :
        "PUBLIC_REVIEWER_CLAIM_ONLY_HOLD";
  return {
    schema: "rosevear.ql272.public-provenance-exception-hold.v1",
    repository: REPOSITORY,
    independentlyObservedMainSha: OBSERVED_MAIN,
    independentlyObservedSource: "HTTP_404",
    observedMainCiUrl: "https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/41153883513",
    publicProvenanceStatus: claim.status,
    claimedProofB: claim.status === "UNVERIFIED_PUBLIC_PROVENANCE_CLAIM" ? claim.proofB : null,
    claimedSourceHttp: claim.status === "UNVERIFIED_PUBLIC_PROVENANCE_CLAIM" ? claim.claimedHttp : null,
    distinctPublicFingerprintsScreened: claim.distinctDigests,
    priorQl271Comparison: comparison,
    reportedReviewerDisposition: claim.reviewerDisposition,
    disposition: provenanceDisposition,
    originalSignedProofB: "NOT_INDEPENDENTLY_RETRIEVED",
    reviewerSourceAncestryAndSignature: "NOT_INDEPENDENTLY_VERIFIED",
    outOfBandPinAndHumanCustody: "NOT_INDEPENDENTLY_VERIFIED",
    onDeviceWindowsAcceptance: "NOT_VERIFIED",
    ownerTestAuthorization: "NOT_GIVEN",
    authenticatedGatewayGets: 0,
    windowsPrivateRelay: "OFF_NOT_INSTALLED",
    conditionalGetSlot: "HELD_UNSCHEDULED",
    activationEligible: false,
    integration: "DISCONNECTED / HOLD"
  } as const;
}
