/**
 * Build 192 / QL-267. Browser memory only. Public source status is never
 * independent human custody, genuine signed proof or owner TEST authorization.
 */
export type Ql267HubIntakeStatus =
  | "NOT_RECEIVED"
  | "REJECTED_UNTRUSTED_OR_MALFORMED"
  | "PUBLIC_CUSTODY_STATUS_CLAIM_ONLY";

type Ql267HubIntake = {
  status: Ql267HubIntakeStatus;
  sourceAClaim: string | null;
  signerClaim: "SIGNER_STATUS_UNKNOWN" | "SIGNER_NOT_PROVISIONED" |
    "SIGNER_EXISTS_CUSTODY_NOT_VERIFIED";
  rolesClaim: "NOT_VERIFIED" | "REVIEWER_REPORTS_VERIFIED_OUT_OF_BAND" | "REJECTED";
};

const SOURCE = "RosevearCreations/rosevear-ai-hub";
const SHA = /^[a-f0-9]{40}$/;
const OPAQUE = /^np-[A-Za-z0-9_-]{8,80}$/;
const FIELDS = [
  "schema_version", "repository", "source_system", "audited_source_sha_A",
  "role_receipts", "signer_status", "signer_pin_status", "restricted_store_status",
  "custodian_status", "witness_status", "reviewer_status", "nonproduction_isolation",
  "issued_at", "expires_at", "owner_test_authorization", "gateway_get_status",
  "windows_relay"
] as const;
const ROLES = ["custodian", "witness", "reviewer"] as const;
const CLAIMS = ["NOT_VERIFIED", "REVIEWER_REPORTS_VERIFIED_OUT_OF_BAND", "REJECTED"] as const;
const SIGNERS = [
  "SIGNER_STATUS_UNKNOWN", "SIGNER_NOT_PROVISIONED",
  "SIGNER_EXISTS_CUSTODY_NOT_VERIFIED"
] as const;
const exact = (value: unknown, keys: readonly string[]): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value) &&
  Object.keys(value).length === keys.length &&
  keys.every((key, index) => Object.keys(value)[index] === key);
const oneOf = <T extends string>(value: unknown, values: readonly T[]): value is T =>
  typeof value === "string" && values.includes(value as T);

const missing = (): Ql267HubIntake => ({
  status: "NOT_RECEIVED", sourceAClaim: null,
  signerClaim: "SIGNER_STATUS_UNKNOWN", rolesClaim: "NOT_VERIFIED"
});
const rejected = (): Ql267HubIntake => ({
  ...missing(), status: "REJECTED_UNTRUSTED_OR_MALFORMED"
});

/** Reject unknown/private fields; never echo opaque role receipt identifiers. */
export function inspectQl267HubDecision(raw: string, nowMs = Date.now()): Ql267HubIntake {
  if (!raw.trim()) return missing();
  if (raw.length > 8192 || !Number.isSafeInteger(nowMs) || nowMs <= 0)
    return rejected();
  try {
    const candidate: unknown = JSON.parse(raw);
    if (!exact(candidate, FIELDS) || !exact(candidate.role_receipts, ROLES))
      return rejected();
    const refs = ROLES.map(role => candidate.role_receipts[role]);
    const populated = refs.filter((ref): ref is string => typeof ref === "string");
    if (refs.some(ref => ref !== null && (typeof ref !== "string" || !OPAQUE.test(ref))) ||
      new Set(populated).size !== populated.length)
      return rejected();
    if (candidate.schema_version !== "rosevear.ql264.public-private-decision-status.v1" ||
      candidate.repository !== SOURCE || candidate.source_system !== "rosevear-ai-hub" ||
      typeof candidate.audited_source_sha_A !== "string" ||
      !SHA.test(candidate.audited_source_sha_A) ||
      !oneOf(candidate.signer_status, SIGNERS) ||
      !oneOf(candidate.signer_pin_status, CLAIMS) ||
      !oneOf(candidate.custodian_status, CLAIMS) ||
      !oneOf(candidate.witness_status, CLAIMS) ||
      !oneOf(candidate.reviewer_status, CLAIMS) ||
      !["NOT_APPROVED", "REVIEWER_REPORTS_APPROVED"].includes(
        String(candidate.restricted_store_status)
      ) ||
      !["NOT_VERIFIED", "REVIEWER_REPORTS_ISOLATED_NONPRODUCTION"].includes(
        String(candidate.nonproduction_isolation)
      ) ||
      candidate.owner_test_authorization !== "NOT_GIVEN" ||
      candidate.gateway_get_status !== "NOT_RUN" ||
      candidate.windows_relay !== "NOT_INSTALLED_OFF" ||
      typeof candidate.issued_at !== "number" ||
      typeof candidate.expires_at !== "number" ||
      !Number.isSafeInteger(candidate.issued_at) ||
      !Number.isSafeInteger(candidate.expires_at) ||
      candidate.issued_at > nowMs || candidate.expires_at <= nowMs ||
      candidate.expires_at <= candidate.issued_at ||
      candidate.expires_at - candidate.issued_at > 900_000)
      return rejected();
    for (const role of ROLES) {
      if (candidate[`${role}_status`] === "REVIEWER_REPORTS_VERIFIED_OUT_OF_BAND" &&
        candidate.role_receipts[role] === null) return rejected();
    }
    return {
      status: "PUBLIC_CUSTODY_STATUS_CLAIM_ONLY",
      sourceAClaim: candidate.audited_source_sha_A,
      signerClaim: candidate.signer_status,
      rolesClaim: candidate.reviewer_status
    };
  } catch {
    return rejected();
  }
}

/** Fixed-field export, never the original pasted bytes or claimed private receipt IDs. */
export function makeQl267HubSafeHandoff(intake: Ql267HubIntake = missing()) {
  const accepted = intake.status === "PUBLIC_CUSTODY_STATUS_CLAIM_ONLY" &&
    typeof intake.sourceAClaim === "string" && SHA.test(intake.sourceAClaim) &&
    oneOf(intake.signerClaim, SIGNERS) && oneOf(intake.rolesClaim, CLAIMS);
  return {
    schema: "rosevear.ql267.hub-source-sanitized-handoff.v1",
    sourceApplication: "rosevear-ai-hub",
    repository: SOURCE,
    historicalMainSha: "9d0536a54fbe3024851efa1f600d4a302d0c0d01",
    historicalMainGreenCi:
      "https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/41073975078",
    historicalOriginalProofAtMain: "HTTP_404",
    historicalSnapshotIsCurrentProof: false,
    ql264OriginalPublicDecisionIntake: accepted ? intake.status :
      intake.status === "NOT_RECEIVED" ? "NOT_RECEIVED" : "REJECTED_UNTRUSTED_OR_MALFORMED",
    auditedSourceAClaim: accepted ? intake.sourceAClaim : null,
    claimedSignerStatus: accepted ? intake.signerClaim : "SIGNER_STATUS_UNKNOWN",
    claimedReviewerStatus: accepted ? intake.rolesClaim : "NOT_VERIFIED",
    independentlyAuthenticatedCustodian: "NOT_VERIFIED",
    distinctNonceWitness: "NOT_VERIFIED",
    independentlyAuthenticatedReviewer: "NOT_VERIFIED",
    approvedPersistentSignerStore: "NOT_VERIFIED",
    outOfBandSignerSpkiPin: "NOT_VERIFIED",
    originalSignedProofB: "NOT_AVAILABLE",
    independentlyVerifiedNonproductionIsolation: "NOT_VERIFIED",
    conditionalTestSlot: "HELD_UNSCHEDULED",
    ownerTestAuthorization: "NOT_GIVEN",
    authenticatedGatewayGets: 0,
    witnessedDenials: "NOT_RUN",
    windowsPrivateRelay: "NOT_INSTALLED_OFF",
    livePilotHolds: 12,
    activationEligible: false,
    integration: "DISCONNECTED / HOLD"
  } as const;
}
