import { describe, expect, it } from "vitest";
import { inspectQl274PublicReturn, makeQl274CustodianHoldReport } from "./ql274CustodianReturn";

const NOW = 1_800_000_000_000;
const B = "b".repeat(40);
const valid = () => ({
  schema: "rosevear.ql274.public-custodian-return.v1",
  repository: "RosevearCreations/rosevear-ai-hub",
  observed_main_sha: "29e1fbe490c020efd34d598c080a7da72c9bffd5",
  original_proof_path: "docs/integration/ql246-source-proof.json",
  claimed_original_http_status: 404,
  candidate_b_sha: B,
  public_return_digest: "a".repeat(64),
  reported_signer_custody: "NOT_ATTESTED",
  reported_reviewer_separation: "NOT_ATTESTED",
  reported_pin_witness: "NOT_ATTESTED",
  observed_at: NOW - 1000,
  owner_test_authorization: "NOT_GIVEN",
  authenticated_gateway_gets: 0,
  windows_private_relay: "OFF"
});

describe("Build 199 public-only independent custodian return reconciliation", () => {
  it("preserves the real immutable 404 and release HOLD without a return", () => {
    const c = inspectQl274PublicReturn("", NOW);
    expect(c.status).toBe("NOT_RECEIVED");
    const r = makeQl274CustodianHoldReport(c, null);
    expect(r.observedImmutableMain).toBe("29e1fbe490c020efd34d598c080a7da72c9bffd5");
    expect(r.independentlyObservedOriginal).toBe("HTTP_404_NOT_FOUND");
    expect(r.verifiedCustodianReturns).toBe(0);
    expect(r.activationEligible).toBe(false);
  });
  it("compares public B values but cannot authenticate matching roles, pin or digest", () => {
    const c = inspectQl274PublicReturn(JSON.stringify({ ...valid(),
      reported_signer_custody: "REPORTED_RETURN_SENT_PRIVATELY",
      reported_reviewer_separation: "REPORTED_SEPARATE_ROLES",
      reported_pin_witness: "REPORTED_PRIVATE_WITNESS" }), NOW);
    expect(c.status).toBe("UNVERIFIED_PUBLIC_RETURN_CLAIM");
    const r = makeQl274CustodianHoldReport(c, { status: "UNVERIFIED_PUBLIC_PROVENANCE_CLAIM", proofB: B });
    expect(r.priorPublicBComparison).toBe("PUBLIC_B_CLAIMS_MATCH_UNVERIFIED");
    expect(r.signerAndCustodianRolesReportedOnly).toBe(true);
    expect(r.outOfBandPinWitnessReportedOnly).toBe(true);
    expect(r.privateCustodianAndPinWitness).toBe("NOT_INDEPENDENTLY_VERIFIED");
    expect(r.authenticatedGatewayGets).toBe(0);
    expect(JSON.stringify(r)).not.toContain("a".repeat(64));
  });
  it("detects contradictory source 200 and public candidate B mismatch", () => {
    const twoHundred = inspectQl274PublicReturn(JSON.stringify({ ...valid(), claimed_original_http_status: 200 }), NOW);
    expect(makeQl274CustodianHoldReport(twoHundred, null).exception).toBe("PUBLIC_200_CONTRADICTS_IMMUTABLE_404");
    const mismatch = inspectQl274PublicReturn(JSON.stringify(valid()), NOW);
    const r = makeQl274CustodianHoldReport(mismatch, { status: "UNVERIFIED_PUBLIC_PROVENANCE_CLAIM", proofB: "c".repeat(40) });
    expect(r.priorPublicBComparison).toBe("PUBLIC_B_CLAIMS_CONFLICT_HOLD");
    expect(r.exception).toBe("PUBLIC_B_MISMATCH_HOLD");
  });
  it.each([
    ["bad JSON", "{"], ["array", "[]"], ["null", "null"],
    ["private extra", JSON.stringify({ ...valid(), signer_private_key: "forbidden" })],
    ["repository", JSON.stringify({ ...valid(), repository: "other/repo" })],
    ["SHA", JSON.stringify({ ...valid(), observed_main_sha: "d".repeat(40) })],
    ["path", JSON.stringify({ ...valid(), original_proof_path: "private/original" })],
    ["uppercase B", JSON.stringify({ ...valid(), candidate_b_sha: "B".repeat(40) })],
    ["invalid digest", JSON.stringify({ ...valid(), public_return_digest: "a" })],
    ["unknown roles", JSON.stringify({ ...valid(), reported_reviewer_separation: "APPROVED" })],
    ["pin attested", JSON.stringify({ ...valid(), reported_pin_witness: "VERIFIED" })],
    ["future time", JSON.stringify({ ...valid(), observed_at: NOW + 1 })],
    ["expired", JSON.stringify({ ...valid(), observed_at: NOW - 600_001 })],
    ["TEST", JSON.stringify({ ...valid(), owner_test_authorization: "GIVEN" })],
    ["GET", JSON.stringify({ ...valid(), authenticated_gateway_gets: 1 })],
    ["relay", JSON.stringify({ ...valid(), windows_private_relay: "ON" })]
  ])("rejects %s", (_name, json) => {
    const c = inspectQl274PublicReturn(json, NOW);
    expect(c.status).toBe("REJECTED_UNTRUSTED_OR_MALFORMED");
    expect(makeQl274CustodianHoldReport(c, null).claimedB).toBeNull();
  });
  it("rejects oversized and invalid time input", () => {
    expect(inspectQl274PublicReturn("A".repeat(4097), NOW).status).toBe("REJECTED_UNTRUSTED_OR_MALFORMED");
    expect(inspectQl274PublicReturn(JSON.stringify(valid()), Number.NaN).status).toBe("REJECTED_UNTRUSTED_OR_MALFORMED");
  });
});
