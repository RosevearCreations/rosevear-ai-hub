/**
 * Build 199 / QL-274: sanitize a public metadata *claim* only.
 * Authentic source ancestry, private signer pin, human custodian and witness must be checked independently.
 */
const REPO = "RosevearCreations/rosevear-ai-hub";
const MAIN = "29e1fbe490c020efd34d598c080a7da72c9bffd5";
const PROOF = "docs/integration/ql246-source-proof.json";
const SHA = /^[a-f0-9]{40}$/;
const DIGEST = /^[a-f0-9]{64}$/;
const KEYS = ["schema", "repository", "observed_main_sha", "original_proof_path",
  "claimed_original_http_status", "candidate_b_sha", "public_return_digest",
  "reported_signer_custody", "reported_reviewer_separation", "reported_pin_witness",
  "observed_at", "owner_test_authorization", "authenticated_gateway_gets", "windows_private_relay"] as const;

export type Ql274CustodianReturn = {
  status: "NOT_RECEIVED" | "REJECTED_UNTRUSTED_OR_MALFORMED" | "UNVERIFIED_PUBLIC_RETURN_CLAIM";
  candidateB: string | null;
  claimedHttp: 200 | 404 | null;
  roleReported: boolean;
  pinReported: boolean;
};

function empty(status: Ql274CustodianReturn["status"] = "NOT_RECEIVED"): Ql274CustodianReturn {
  return { status, candidateB: null, claimedHttp: null, roleReported: false, pinReported: false };
}

export function inspectQl274PublicReturn(raw: string, now = Date.now()): Ql274CustodianReturn {
  if (!raw.trim()) return empty();
  if (raw.length > 4096 || !Number.isSafeInteger(now) || now <= 0)
    return empty("REJECTED_UNTRUSTED_OR_MALFORMED");
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) return empty("REJECTED_UNTRUSTED_OR_MALFORMED");
    const record = data as Record<string, unknown>;
    if (Object.keys(record).length !== KEYS.length || !KEYS.every(key => Object.prototype.hasOwnProperty.call(record, key)) ||
      record.schema !== "rosevear.ql274.public-custodian-return.v1" || record.repository !== REPO ||
      record.observed_main_sha !== MAIN || record.original_proof_path !== PROOF ||
      (record.claimed_original_http_status !== 200 && record.claimed_original_http_status !== 404) ||
      typeof record.candidate_b_sha !== "string" || !SHA.test(record.candidate_b_sha) ||
      typeof record.public_return_digest !== "string" || !DIGEST.test(record.public_return_digest) ||
      !["NOT_ATTESTED", "REPORTED_RETURN_SENT_PRIVATELY"].includes(String(record.reported_signer_custody)) ||
      !["NOT_ATTESTED", "REPORTED_SEPARATE_ROLES"].includes(String(record.reported_reviewer_separation)) ||
      !["NOT_ATTESTED", "REPORTED_PRIVATE_WITNESS"].includes(String(record.reported_pin_witness)) ||
      typeof record.observed_at !== "number" || !Number.isSafeInteger(record.observed_at) ||
      record.observed_at > now || now - record.observed_at > 600_000 ||
      record.owner_test_authorization !== "NOT_GIVEN" || record.authenticated_gateway_gets !== 0 ||
      record.windows_private_relay !== "OFF") return empty("REJECTED_UNTRUSTED_OR_MALFORMED");
    return {
      status: "UNVERIFIED_PUBLIC_RETURN_CLAIM", candidateB: record.candidate_b_sha,
      claimedHttp: record.claimed_original_http_status,
      roleReported: record.reported_reviewer_separation === "REPORTED_SEPARATE_ROLES" && record.reported_signer_custody === "REPORTED_RETURN_SENT_PRIVATELY",
      pinReported: record.reported_pin_witness === "REPORTED_PRIVATE_WITNESS"
    };
  } catch { return empty("REJECTED_UNTRUSTED_OR_MALFORMED"); }
}

/** Only fixed public metadata leaves the browser worksheet; no digest or private witness is exported. */
export function makeQl274CustodianHoldReport(
  claim: Ql274CustodianReturn,
  priorQl272: { status: string; proofB: string | null } | null
) {
  const usable = claim.status === "UNVERIFIED_PUBLIC_RETURN_CLAIM";
  const comparison = !usable ? "NO_VALID_PUBLIC_RETURN" :
    priorQl272?.status !== "UNVERIFIED_PUBLIC_PROVENANCE_CLAIM" ? "PRIOR_QL272_PUBLIC_CLAIM_UNAVAILABLE" :
      priorQl272.proofB === claim.candidateB ? "PUBLIC_B_CLAIMS_MATCH_UNVERIFIED" : "PUBLIC_B_CLAIMS_CONFLICT_HOLD";
  const exception = !usable ? "NO_VALID_PUBLIC_RETURN" :
    claim.claimedHttp === 200 ? "PUBLIC_200_CONTRADICTS_IMMUTABLE_404" :
      comparison === "PUBLIC_B_CLAIMS_CONFLICT_HOLD" ? "PUBLIC_B_MISMATCH_HOLD" :
        "ORIGINAL_NOT_PUBLISHED_AT_OBSERVED_SOURCE";
  return {
    schema: "rosevear.ql274.custodian-return-exception.v1",
    repository: REPO,
    observedImmutableMain: MAIN,
    independentlyObservedOriginal: "HTTP_404_NOT_FOUND",
    observedMatchingMainCi: "https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/41160623174",
    claimScreening: claim.status,
    claimedB: usable ? claim.candidateB : null,
    claimedHttp: usable ? claim.claimedHttp : null,
    priorPublicBComparison: comparison,
    signerAndCustodianRolesReportedOnly: usable && claim.roleReported,
    outOfBandPinWitnessReportedOnly: usable && claim.pinReported,
    exception,
    authenticSignedProofB: "NOT_RETRIEVED",
    originalAncestryAndSignature: "NOT_INDEPENDENTLY_VERIFIED",
    privateCustodianAndPinWitness: "NOT_INDEPENDENTLY_VERIFIED",
    verifiedCustodianReturns: 0,
    ownerTestAuthorization: "NOT_GIVEN",
    authenticatedGatewayGets: 0,
    privateRelay: "OFF_NOT_INSTALLED",
    conditionalGetSlot: "HELD_UNSCHEDULED",
    activationEligible: false,
    integration: "DISCONNECTED / HOLD"
  } as const;
}
