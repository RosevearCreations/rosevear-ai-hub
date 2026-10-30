/**
 * Build 194 / QL-269. Public source readback is an untrusted CLAIM until
 * independently retrieved, pinned, signature-verified and witnessed outside
 * this local UI. This module makes NO requests and cannot enable a gateway.
 */
const SHA = /^[a-f0-9]{40}$/;
const REPOSITORY = "RosevearCreations/rosevear-ai-hub";
const PUBLIC_FIELDS = [
  "schema", "repository", "source_commit_a", "proof_commit_b",
  "immutable_proof_url", "claimed_http_status", "exact_source_ci_url",
  "observed_at", "expires_at", "tenant_isolation", "credential_scope",
  "owner_test_authorization", "gateway_get_count", "windows_relay"
] as const;

export type Ql269PublicReadback = {
  status: "NOT_RECEIVED" | "REJECTED_UNTRUSTED_OR_MALFORMED" | "UNVERIFIED_PUBLIC_READBACK_CLAIM";
  sourceA: string | null;
  proofB: string | null;
  claimedHttpStatus: 200 | 404 | null;
};

const empty = (status: Ql269PublicReadback["status"] = "NOT_RECEIVED"): Ql269PublicReadback => ({
  status, sourceA: null, proofB: null, claimedHttpStatus: null
});

function exactFields(value: unknown): value is Record<(typeof PUBLIC_FIELDS)[number], unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).length === PUBLIC_FIELDS.length &&
    PUBLIC_FIELDS.every(key => Object.prototype.hasOwnProperty.call(value, key));
}

export function inspectQl269PublicReadback(raw: string, nowMs = Date.now()): Ql269PublicReadback {
  if (!raw.trim()) return empty();
  if (raw.length > 4096 || !Number.isSafeInteger(nowMs) || nowMs <= 0)
    return empty("REJECTED_UNTRUSTED_OR_MALFORMED");
  try {
    const value: unknown = JSON.parse(raw);
    if (!exactFields(value)) return empty("REJECTED_UNTRUSTED_OR_MALFORMED");
    const sourceA = value.source_commit_a;
    const proofB = value.proof_commit_b;
    const observedAt = value.observed_at;
    const expiresAt = value.expires_at;
    if (value.schema !== "rosevear.ql269.public-original-proof-return.v1" ||
      value.repository !== REPOSITORY ||
      typeof sourceA !== "string" || !SHA.test(sourceA) ||
      typeof proofB !== "string" || !SHA.test(proofB) || sourceA === proofB ||
      value.immutable_proof_url !== `https://raw.githubusercontent.com/${REPOSITORY}/${proofB}/docs/integration/ql246-source-proof.json` ||
      typeof value.exact_source_ci_url !== "string" ||
      !/^https:\/\/github\.com\/RosevearCreations\/rosevear-ai-hub\/actions\/runs\/[1-9][0-9]{0,17}$/.test(value.exact_source_ci_url) ||
      (value.claimed_http_status !== 200 && value.claimed_http_status !== 404) ||
      typeof observedAt !== "number" || typeof expiresAt !== "number" ||
      !Number.isSafeInteger(observedAt) || !Number.isSafeInteger(expiresAt) ||
      observedAt > nowMs || expiresAt <= nowMs ||
      expiresAt <= observedAt || expiresAt - observedAt > 900_000 ||
      value.tenant_isolation !== "NOT_INDEPENDENTLY_VERIFIED" ||
      value.credential_scope !== "NOT_ISSUED" ||
      value.owner_test_authorization !== "NOT_GIVEN" ||
      value.gateway_get_count !== 0 || value.windows_relay !== "OFF")
      return empty("REJECTED_UNTRUSTED_OR_MALFORMED");
    return { status: "UNVERIFIED_PUBLIC_READBACK_CLAIM", sourceA, proofB, claimedHttpStatus: value.claimed_http_status };
  } catch {
    return empty("REJECTED_UNTRUSTED_OR_MALFORMED");
  }
}

/** Fixed-field report. Comparing two self-reports cannot establish provenance. */
export function makeQl269PreflightReport(
  readback: Ql269PublicReadback,
  precedingQl268: { status: string; sourceA: string | null; proofB: string | null } | null = null
) {
  const matchingPublicClaims = readback.status === "UNVERIFIED_PUBLIC_READBACK_CLAIM" &&
    precedingQl268?.status === "UNVERIFIED_PUBLIC_METADATA_CLAIM" &&
    precedingQl268.sourceA === readback.sourceA && precedingQl268.proofB === readback.proofB;
  const comparison = readback.status !== "UNVERIFIED_PUBLIC_READBACK_CLAIM" ? "NO_VALID_PUBLIC_READBACK" :
    precedingQl268?.status !== "UNVERIFIED_PUBLIC_METADATA_CLAIM" ? "QL268_SOURCE_NOT_AVAILABLE" :
    matchingPublicClaims ? "PUBLIC_CLAIMS_MATCH_UNVERIFIED" : "PUBLIC_CLAIMS_CONFLICT";
  return {
    schema: "rosevear.ql269.hub-independent-return-and-get-hold.v1",
    sourceApplication: "rosevear-ai-hub",
    repository: REPOSITORY,
    publicReadbackScreening: readback.status,
    claimedSourceA: readback.status === "UNVERIFIED_PUBLIC_READBACK_CLAIM" ? readback.sourceA : null,
    claimedProofB: readback.status === "UNVERIFIED_PUBLIC_READBACK_CLAIM" ? readback.proofB : null,
    claimedProofHttp: readback.status === "UNVERIFIED_PUBLIC_READBACK_CLAIM" ? readback.claimedHttpStatus : null,
    sourceAtoBPublicClaimComparison: comparison,
    independentlyRetrievedOriginalProofB: "NOT_VERIFIED",
    independentlyVerifiedAtoBAncestry: "NOT_VERIFIED",
    independentlyVerifiedSignatureAndPinnedSpki: "NOT_VERIFIED",
    independentlyVerifiedExactCommitCi: "NOT_VERIFIED",
    originalPrivateCustodianWitnessReviewer: "NOT_VERIFIED",
    isolatedNonproductionTenantAndScope: "NOT_VERIFIED",
    approvedPerAppScopedCredential: "NOT_ISSUED",
    proposedMethodsOnly: ["GET"],
    proposedPathsOnly: ["/api/integration/v1/health", "/api/integration/v1/capabilities"],
    proposedMaxRequests: 9,
    proposedMaxSeconds: 900,
    denialCasesPendingIndependentApproval: [
      "missing_authentication", "invalid_credential", "expired_credential",
      "wrong_nonproduction_tenant", "wrong_application_audience",
      "replayed_nonce", "mismatched_independent_pin"
    ],
    reversibleStopAndRollback: "NOT_AUTHORIZED",
    ownerTestAuthorization: "NOT_GIVEN",
    scheduledGetSlot: "HELD_UNSCHEDULED",
    networkRequestsMadeByThisScreen: 0,
    authenticatedGatewayGets: 0,
    windowsPrivateRelay: "OFF_NOT_INSTALLED",
    activationEligible: false,
    integration: "DISCONNECTED / HOLD"
  } as const;
}
