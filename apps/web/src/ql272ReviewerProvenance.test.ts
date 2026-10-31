import { describe, expect, it } from "vitest";
import { inspectQl272PublicProvenance, makeQl272ProvenanceHoldReport } from "./ql272ReviewerProvenance";

const NOW = 1_800_000_000_000;
const PROOF_B = "b".repeat(40);
const valid = () => ({
  schema: "rosevear.ql272.public-reviewer-provenance.v1",
  repository: "RosevearCreations/rosevear-ai-hub",
  observed_main_sha: "1ffb37c4eb750b4c8969b44f76692c74845179bb",
  original_proof_path: "docs/integration/ql246-source-proof.json",
  claimed_source_http_status: 404,
  candidate_proof_b_commit: PROOF_B,
  public_source_manifest_digest: "a".repeat(64),
  public_reviewer_receipt_digest: "c".repeat(64),
  reviewer_provenance_claim: "NOT_ATTESTED",
  independent_role_claim: "NOT_ATTESTED",
  reviewer_disposition: "HOLD",
  observed_at: NOW - 5000,
  owner_test_authorization: "NOT_GIVEN",
  authenticated_gateway_gets: 0,
  windows_private_relay: "OFF"
});

describe("QL-272 bounded public reviewer provenance and immutable 404", () => {
  it("does not assume a reviewer receipt was received", () => {
    expect(inspectQl272PublicProvenance("", NOW).status).toBe("NOT_RECEIVED");
    const r = makeQl272ProvenanceHoldReport(inspectQl272PublicProvenance("", NOW));
    expect(r.originalSignedProofB).toBe("NOT_INDEPENDENTLY_RETRIEVED");
    expect(r.activationEligible).toBe(false);
  });
  it("screens format only and compares previous QL-271 public B without certifying signer provenance", () => {
    const c = inspectQl272PublicProvenance(JSON.stringify(valid()), NOW);
    expect(c).toEqual({ status: "UNVERIFIED_PUBLIC_PROVENANCE_CLAIM", proofB: PROOF_B,
      claimedHttp: 404, distinctDigests: true, reviewerDisposition: "HOLD" });
    const r = makeQl272ProvenanceHoldReport(c, { status: "UNVERIFIED_PUBLIC_REVIEW_CLAIM", proofB: PROOF_B });
    expect(r.priorQl271Comparison).toBe("PUBLIC_PROOF_B_CLAIMS_MATCH_UNVERIFIED");
    expect(r.disposition).toBe("PUBLIC_REVIEWER_CLAIM_ONLY_HOLD");
    expect(r.outOfBandPinAndHumanCustody).toBe("NOT_INDEPENDENTLY_VERIFIED");
    expect(r.authenticatedGatewayGets).toBe(0);
  });
  it("flags a public 200 claim against independently retrieved HTTP 404", () => {
    const c = inspectQl272PublicProvenance(JSON.stringify({ ...valid(), claimed_source_http_status: 200 }), NOW);
    expect(makeQl272ProvenanceHoldReport(c).disposition).toBe("CONTRADICTS_IMMUTABLE_SOURCE_HTTP_404");
  });
  it("flags conflicting candidate B even when both public reports pass shape screening", () => {
    const c = inspectQl272PublicProvenance(JSON.stringify(valid()), NOW);
    const r = makeQl272ProvenanceHoldReport(c, { status: "UNVERIFIED_PUBLIC_REVIEW_CLAIM", proofB: "d".repeat(40) });
    expect(r.priorQl271Comparison).toBe("PUBLIC_PROOF_B_CLAIMS_CONFLICT");
    expect(r.disposition).toBe("B_CLAIM_CONTRADICTION_HOLD");
  });
  it("never exports untrusted digests or private reviewer identifiers", () => {
    const r = JSON.stringify(makeQl272ProvenanceHoldReport(inspectQl272PublicProvenance(JSON.stringify(valid()), NOW)));
    expect(r).not.toContain("public_reviewer_receipt_digest");
    expect(r).not.toContain("c".repeat(64));
    expect(r).not.toContain("reviewer_provenance_claim");
  });
  it.each([
    ["malformed", "{"], ["array", "[]"], ["null", "null"],
    ["additional secret", JSON.stringify({ ...valid(), privateWitness: "someone" })],
    ["wrong repository", JSON.stringify({ ...valid(), repository: "test/repo" })],
    ["wrong immutable observation", JSON.stringify({ ...valid(), observed_main_sha: "a".repeat(40) })],
    ["wrong proof path", JSON.stringify({ ...valid(), original_proof_path: "/private/proof" })],
    ["bad SHA", JSON.stringify({ ...valid(), candidate_proof_b_commit: "B".repeat(40) })],
    ["bad digest", JSON.stringify({ ...valid(), public_reviewer_receipt_digest: "0" })],
    ["reused digest", JSON.stringify({ ...valid(), public_reviewer_receipt_digest: "a".repeat(64) })],
    ["future", JSON.stringify({ ...valid(), observed_at: NOW + 1 })],
    ["expired", JSON.stringify({ ...valid(), observed_at: NOW - 600_001 })],
    ["approval", JSON.stringify({ ...valid(), reviewer_disposition: "APPROVED" })],
    ["owner TEST", JSON.stringify({ ...valid(), owner_test_authorization: "APPROVED" })],
    ["GET attempt", JSON.stringify({ ...valid(), authenticated_gateway_gets: 1 })],
    ["relay", JSON.stringify({ ...valid(), windows_private_relay: "ON" })]
  ])("rejects %s", (_case, json) => {
    const c = inspectQl272PublicProvenance(json, NOW);
    expect(c.status).toBe("REJECTED_UNTRUSTED_OR_MALFORMED");
    expect(makeQl272ProvenanceHoldReport(c).claimedProofB).toBeNull();
  });
  it("rejects oversized inputs and untrusted clocks", () => {
    expect(inspectQl272PublicProvenance("X".repeat(4097), NOW).status).toBe("REJECTED_UNTRUSTED_OR_MALFORMED");
    expect(inspectQl272PublicProvenance(JSON.stringify(valid()), NaN).status).toBe("REJECTED_UNTRUSTED_OR_MALFORMED");
  });
});
