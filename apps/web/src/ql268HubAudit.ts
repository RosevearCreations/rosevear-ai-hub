/**
 * Build 193 / QL-268: public-only, OFFLINE exception screening.
 * This code never retrieves a URL, verifies a signature, authorizes TEST or
 * accepts a public self-report as an independent human reviewer receipt.
 */
const SHA = /^[a-f0-9]{40}$/;
const SOURCE = "RosevearCreations/rosevear-ai-hub";
const FIELDS = [
  "schema", "repository", "source_commit_a", "proof_commit_b",
  "public_proof_url", "exact_source_ci_url", "public_proof_status_claim",
  "nonproduction_isolation_claim", "independent_pin_claim", "issued_at",
  "expires_at", "owner_test_authorization", "gateway_get_status", "windows_relay"
] as const;

export type Ql268Screening = {
  status: "NOT_RECEIVED" | "REJECTED_UNTRUSTED_OR_MALFORMED" | "UNVERIFIED_PUBLIC_METADATA_CLAIM";
  sourceA: string | null;
  proofB: string | null;
  proofClaim: "UNKNOWN" | "MISSING" | "PUBLISHED_UNVERIFIED";
};

function empty(status: Ql268Screening["status"] = "NOT_RECEIVED"): Ql268Screening {
  return { status, sourceA: null, proofB: null, proofClaim: "UNKNOWN" };
}

function isExactRecord(value: unknown): value is Record<(typeof FIELDS)[number], unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).length === FIELDS.length &&
    FIELDS.every(key => Object.prototype.hasOwnProperty.call(value, key));
}

/** Candidate metadata is for an exception queue, never a proof verdict. */
export function inspectQl268PublicMetadata(raw: string, nowMs = Date.now()): Ql268Screening {
  if (!raw.trim()) return empty();
  if (raw.length > 4096 || !Number.isSafeInteger(nowMs) || nowMs <= 0)
    return empty("REJECTED_UNTRUSTED_OR_MALFORMED");
  try {
    const value: unknown = JSON.parse(raw);
    if (!isExactRecord(value)) return empty("REJECTED_UNTRUSTED_OR_MALFORMED");
    if (value.schema !== "rosevear.ql268.public-proof-publication-candidate.v1" ||
      value.repository !== SOURCE ||
      typeof value.source_commit_a !== "string" || !SHA.test(value.source_commit_a) ||
      typeof value.proof_commit_b !== "string" || !SHA.test(value.proof_commit_b) ||
      value.proof_commit_b === value.source_commit_a ||
      value.public_proof_url !==
        `https://raw.githubusercontent.com/${SOURCE}/${value.proof_commit_b}/docs/integration/ql246-source-proof.json` ||
      typeof value.exact_source_ci_url !== "string" ||
      !/^https:\/\/github\.com\/RosevearCreations\/rosevear-ai-hub\/actions\/runs\/[1-9][0-9]{0,17}$/.test(value.exact_source_ci_url) ||
      !["MISSING", "PUBLISHED_UNVERIFIED"].includes(String(value.public_proof_status_claim)) ||
      !["NOT_VERIFIED", "REVIEWER_REPORTS_ISOLATED_NONPRODUCTION"].includes(String(value.nonproduction_isolation_claim)) ||
      !["NOT_VERIFIED", "REVIEWER_REPORTS_VERIFIED_OUT_OF_BAND"].includes(String(value.independent_pin_claim)) ||
      value.owner_test_authorization !== "NOT_GIVEN" ||
      value.gateway_get_status !== "NOT_RUN" ||
      value.windows_relay !== "NOT_INSTALLED_OFF" ||
      typeof value.issued_at !== "number" || !Number.isSafeInteger(value.issued_at) ||
      typeof value.expires_at !== "number" || !Number.isSafeInteger(value.expires_at) ||
      value.issued_at > nowMs || value.expires_at <= nowMs ||
      value.expires_at - value.issued_at > 900_000 ||
      value.expires_at <= value.issued_at)
      return empty("REJECTED_UNTRUSTED_OR_MALFORMED");
    return {
      status: "UNVERIFIED_PUBLIC_METADATA_CLAIM",
      sourceA: value.source_commit_a,
      proofB: value.proof_commit_b,
      proofClaim: value.public_proof_status_claim as Ql268Screening["proofClaim"]
    };
  } catch {
    return empty("REJECTED_UNTRUSTED_OR_MALFORMED");
  }
}

/** One-source, fixed-field sanitized HOLD result; no raw input or private receipts. */
export function makeQl268HubHoldAudit(screening: Ql268Screening = empty()) {
  return {
    schema: "rosevear.ql268.hub-proof-exception-hold.v1",
    repository: SOURCE,
    sourceApplication: "rosevear-ai-hub",
    latestIndependentlyObservedMainSha: "57a4bce43be6b8af175c0c7f45afa325c2900619",
    latestIndependentlyObservedMainCi: "https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/41090667624",
    originalProofAtObservedMain: "HTTP_404",
    publicMetadataScreening: screening.status,
    claimedSourceA: screening.status === "UNVERIFIED_PUBLIC_METADATA_CLAIM" ? screening.sourceA : null,
    claimedProofB: screening.status === "UNVERIFIED_PUBLIC_METADATA_CLAIM" ? screening.proofB : null,
    claimedProofPublication: screening.status === "UNVERIFIED_PUBLIC_METADATA_CLAIM" ? screening.proofClaim : "UNKNOWN",
    immutableAtoBAncestry: "NOT_INDEPENDENTLY_VERIFIED",
    originalSignature: "NOT_INDEPENDENTLY_VERIFIED",
    outOfBandSpkiPin: "NOT_INDEPENDENTLY_VERIFIED",
    exactSourceCi: "NOT_INDEPENDENTLY_VERIFIED_FOR_CLAIMED_PROOF_B",
    authenticatedCustodianWitnessReviewer: "NOT_VERIFIED",
    isolatedNonproductionTenant: "NOT_VERIFIED",
    conditionalGetSlot: "HELD_UNSCHEDULED",
    allowedMethodsIfSeparatelyApproved: ["GET"],
    maxGetTrialMinutesIfSeparatelyApproved: 15,
    maxGetRequestsIfSeparatelyApproved: 9,
    ownerTestAuthorization: "NOT_GIVEN",
    authenticatedGatewayGets: 0,
    windowsPrivateRelay: "NOT_INSTALLED_OFF",
    reversibleStopPlan: "REQUIRED_NOT_AUTHORIZED",
    activationEligible: false,
    integration: "DISCONNECTED / HOLD"
  } as const;
}
