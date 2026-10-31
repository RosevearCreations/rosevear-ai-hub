/**
 * Build 195 / QL-270: strictly bounded public *claims* about fresh custody/pin
 * review. Private decisions, signatures, identities and keys never enter here.
 * No web requests, signature verification, network TEST or relay activation.
 */
const REPOSITORY = "RosevearCreations/rosevear-ai-hub";
const SHA = /^[a-f0-9]{40}$/;
const DIGEST = /^[a-f0-9]{64}$/;
const FIELDS = [
  "schema", "repository", "proof_commit_b", "previous_public_digest",
  "renewed_public_digest", "claimed_proof_http_status", "custody_claim",
  "pin_claim", "issued_at", "expires_at", "owner_test_authorization",
  "authenticated_gateway_gets", "windows_private_relay"
] as const;

export type Ql270Renewal = {
  status: "NOT_RECEIVED" | "REJECTED_UNTRUSTED_OR_MALFORMED" | "UNVERIFIED_PUBLIC_RENEWAL_CLAIM";
  proofB: string | null;
  claimedHttp: 200 | 404 | null;
  distinctPublicDigests: boolean;
};

function empty(status: Ql270Renewal["status"] = "NOT_RECEIVED"): Ql270Renewal {
  return { status, proofB: null, claimedHttp: null, distinctPublicDigests: false };
}

function exactRecord(value: unknown): value is Record<(typeof FIELDS)[number], unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).length === FIELDS.length &&
    FIELDS.every(key => Object.prototype.hasOwnProperty.call(value, key));
}

export function inspectQl270PublicRenewal(raw: string, now = Date.now()): Ql270Renewal {
  if (!raw.trim()) return empty();
  if (raw.length > 4096 || !Number.isSafeInteger(now) || now <= 0)
    return empty("REJECTED_UNTRUSTED_OR_MALFORMED");
  try {
    const value: unknown = JSON.parse(raw);
    if (!exactRecord(value)) return empty("REJECTED_UNTRUSTED_OR_MALFORMED");
    if (value.schema !== "rosevear.ql270.public-custody-pin-renewal.v1" ||
      value.repository !== REPOSITORY ||
      typeof value.proof_commit_b !== "string" || !SHA.test(value.proof_commit_b) ||
      typeof value.previous_public_digest !== "string" || !DIGEST.test(value.previous_public_digest) ||
      typeof value.renewed_public_digest !== "string" || !DIGEST.test(value.renewed_public_digest) ||
      value.renewed_public_digest === value.previous_public_digest ||
      (value.claimed_proof_http_status !== 200 && value.claimed_proof_http_status !== 404) ||
      !["NOT_VERIFIED", "REVIEWER_REPORTS_RENEWED"].includes(String(value.custody_claim)) ||
      !["NOT_VERIFIED", "REVIEWER_REPORTS_REVALIDATED"].includes(String(value.pin_claim)) ||
      typeof value.issued_at !== "number" || typeof value.expires_at !== "number" ||
      !Number.isSafeInteger(value.issued_at) || !Number.isSafeInteger(value.expires_at) ||
      value.issued_at > now || value.expires_at <= now || value.expires_at <= value.issued_at ||
      value.expires_at - value.issued_at > 600_000 ||
      value.owner_test_authorization !== "NOT_GIVEN" ||
      value.authenticated_gateway_gets !== 0 || value.windows_private_relay !== "OFF")
      return empty("REJECTED_UNTRUSTED_OR_MALFORMED");
    return { status: "UNVERIFIED_PUBLIC_RENEWAL_CLAIM", proofB: value.proof_commit_b,
      claimedHttp: value.claimed_proof_http_status, distinctPublicDigests: true };
  } catch {
    return empty("REJECTED_UNTRUSTED_OR_MALFORMED");
  }
}

/** No untrusted raw digest, human identity or private data is exported. */
export function makeQl270HoldRecheck(
  renewal: Ql270Renewal,
  priorQl269: { status: string; proofB: string | null } | null = null
) {
  const comparison = renewal.status !== "UNVERIFIED_PUBLIC_RENEWAL_CLAIM" ? "NO_VALID_PUBLIC_RENEWAL" :
    priorQl269?.status !== "UNVERIFIED_PUBLIC_READBACK_CLAIM" ? "PRIOR_QL269_CLAIM_NOT_AVAILABLE" :
    priorQl269.proofB === renewal.proofB ? "PUBLIC_B_CLAIMS_MATCH_UNVERIFIED" : "PUBLIC_B_CLAIMS_CONFLICT";
  return {
    schema: "rosevear.ql270.public-renewal-recheck-hold.v1",
    repository: REPOSITORY,
    sourceApplication: "rosevear-ai-hub",
    observedMainSha: "4db6746cbb862b5a4b972c918601ef5c6f3ee927",
    observedMainCiUrl: "https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/41116285506",
    originalProofAtObservedMain: "HTTP_404",
    publicRenewalStatus: renewal.status,
    claimedProofB: renewal.status === "UNVERIFIED_PUBLIC_RENEWAL_CLAIM" ? renewal.proofB : null,
    claimedProofHttp: renewal.status === "UNVERIFIED_PUBLIC_RENEWAL_CLAIM" ? renewal.claimedHttp : null,
    distinctPublicDigestsScreened: renewal.distinctPublicDigests,
    priorQl269Comparison: comparison,
    originalSignedProofB: "NOT_INDEPENDENTLY_RETRIEVED_OR_VERIFIED",
    sourceAtoBAncestry: "NOT_INDEPENDENTLY_VERIFIED",
    signerSignatureAndOutOfBandPin: "NOT_INDEPENDENTLY_VERIFIED",
    originalPrivateCustodianWitnessReviewer: "NOT_VERIFIED",
    nonproductionTenantIsolation: "NOT_VERIFIED",
    perApplicationCredential: "NOT_ISSUED",
    ownerTestAuthorization: "NOT_GIVEN",
    authenticatedGatewayGets: 0,
    windowsPrivateRelay: "OFF_NOT_INSTALLED",
    conditionalTestSlot: "HELD_UNSCHEDULED",
    reversibleStopPlan: "NOT_APPROVED",
    activationEligible: false,
    integration: "DISCONNECTED / HOLD"
  } as const;
}
