import { describe, expect, it } from "vitest";
import { inspectQl270PublicRenewal, makeQl270HoldRecheck } from "./ql270HubRenewal";

const NOW = Date.UTC(2026, 9, 30, 21);
const B = "b".repeat(40);
const EARLIER = "a".repeat(64);
const RENEWED = "c".repeat(64);
function packet(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    schema: "rosevear.ql270.public-custody-pin-renewal.v1",
    repository: "RosevearCreations/rosevear-ai-hub",
    proof_commit_b: B,
    previous_public_digest: EARLIER,
    renewed_public_digest: RENEWED,
    claimed_proof_http_status: 200,
    custody_claim: "REVIEWER_REPORTS_RENEWED",
    pin_claim: "REVIEWER_REPORTS_REVALIDATED",
    issued_at: NOW - 10_000, expires_at: NOW + 10_000,
    owner_test_authorization: "NOT_GIVEN", authenticated_gateway_gets: 0,
    windows_private_relay: "OFF",
    ...overrides
  });
}

describe("Build 195 QL-270 public custody and pin renewal review", () => {
  it("keeps missing or malformed returns held and clears private data from export", () => {
    expect(inspectQl270PublicRenewal("", NOW).status).toBe("NOT_RECEIVED");
    const rejected = inspectQl270PublicRenewal('{"secret":"MUST_NOT_EXPORT"}', NOW);
    expect(rejected.status).toBe("REJECTED_UNTRUSTED_OR_MALFORMED");
    expect(JSON.stringify(makeQl270HoldRecheck(rejected))).not.toContain("MUST_NOT_EXPORT");
  });
  it("accepts only the format of a fresh distinct public renewal, never independent trust", () => {
    const screened = inspectQl270PublicRenewal(packet(), NOW);
    expect(screened.status).toBe("UNVERIFIED_PUBLIC_RENEWAL_CLAIM");
    const report = makeQl270HoldRecheck(screened, { status: "UNVERIFIED_PUBLIC_READBACK_CLAIM", proofB: B });
    expect(report.priorQl269Comparison).toBe("PUBLIC_B_CLAIMS_MATCH_UNVERIFIED");
    expect(report.originalProofAtObservedMain).toBe("HTTP_404");
    expect(report.signerSignatureAndOutOfBandPin).toBe("NOT_INDEPENDENTLY_VERIFIED");
    expect(report.ownerTestAuthorization).toBe("NOT_GIVEN");
    expect(report.authenticatedGatewayGets).toBe(0);
    expect(report.activationEligible).toBe(false);
    expect(report.integration).toBe("DISCONNECTED / HOLD");
    expect(JSON.stringify(report)).not.toContain(EARLIER);
    expect(JSON.stringify(report)).not.toContain(RENEWED);
  });
  it("detects missing or conflicting earlier source claims while staying held", () => {
    const screened = inspectQl270PublicRenewal(packet({ claimed_proof_http_status: 404 }), NOW);
    expect(makeQl270HoldRecheck(screened).priorQl269Comparison).toBe("PRIOR_QL269_CLAIM_NOT_AVAILABLE");
    expect(makeQl270HoldRecheck(screened, { status: "UNVERIFIED_PUBLIC_READBACK_CLAIM", proofB: "d".repeat(40) }).priorQl269Comparison)
      .toBe("PUBLIC_B_CLAIMS_CONFLICT");
  });
  it.each([
    { credential: "SENSITIVE" }, { renewed_public_digest: EARLIER },
    { renewed_public_digest: "NOT_A_DIGEST" }, { proof_commit_b: "broken" },
    { claimed_proof_http_status: 201 }, { custody_claim: "VERIFIED" },
    { pin_claim: "PIN_CONFIRMED" },
    { issued_at: NOW + 1 }, { expires_at: NOW - 1 },
    { expires_at: NOW + 900_000 },
    { owner_test_authorization: "GIVEN" },
    { authenticated_gateway_gets: 1 }, { windows_private_relay: "ON" }
  ])("rejects expanded, stale, spoofed or privileged renewals: %j", overrides => {
    expect(inspectQl270PublicRenewal(packet(overrides), NOW).status).toBe("REJECTED_UNTRUSTED_OR_MALFORMED");
  });
});
