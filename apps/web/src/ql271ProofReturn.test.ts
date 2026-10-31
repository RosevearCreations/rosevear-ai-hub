import { describe, expect, it } from "vitest";
import { inspectQl271Return, makeQl271HoldDisposition } from "./ql271ProofReturn";

const NOW = 1_800_000_000_000;
const A = "a".repeat(40);
const B = "b".repeat(40);
const valid = () => ({
  schema: "rosevear.ql271.public-original-review-return.v1",
  repository: "RosevearCreations/rosevear-ai-hub",
  observed_main_sha: "3845613bb7b7af6bb4fa97fb10b72c2600ba0e84",
  claimed_proof_http_status: 404,
  source_a_commit: A, candidate_proof_b_commit: B,
  source_to_b_claim: "NOT_REVIEWED", signature_claim: "NOT_VERIFIED",
  pin_claim: "NOT_VERIFIED", reviewer_disposition: "HOLD",
  reviewer_separation_claim: "NOT_VERIFIED", observed_at: NOW - 30_000,
  owner_test_authorization: "NOT_GIVEN", authenticated_gateway_gets: 0,
  windows_private_relay: "OFF"
});

describe("QL-271 fail-closed public return and original source audit", () => {
  it("reports NOT_RECEIVED for blank input", () => expect(inspectQl271Return("", NOW).status).toBe("NOT_RECEIVED"));
  it("screens a correctly shaped HOLD claim but never validates signer authority", () => {
    const c = inspectQl271Return(JSON.stringify(valid()), NOW);
    expect(c).toEqual({ status: "UNVERIFIED_PUBLIC_REVIEW_CLAIM", sourceA: A, proofB: B, claimedHttp: 404, disposition: "HOLD" });
    const r = makeQl271HoldDisposition(c, { status: "UNVERIFIED_PUBLIC_RENEWAL_CLAIM", proofB: B });
    expect(r.priorQl270Comparison).toBe("PUBLIC_B_CLAIMS_MATCH_UNVERIFIED");
    expect(r.authenticSignedOriginal).toBe("NOT_INDEPENDENTLY_RETRIEVED_OR_VERIFIED");
    expect(r.activationEligible).toBe(false);
    expect(r.authenticatedGatewayGets).toBe(0);
    expect(r.integration).toBe("DISCONNECTED / HOLD");
  });
  it("flags a conflicting 200 claim against independently observed 404", () => {
    const c = inspectQl271Return(JSON.stringify({ ...valid(), claimed_proof_http_status: 200 }), NOW);
    const r = makeQl271HoldDisposition(c);
    expect(r.publicClaimConflictsWithObserved404).toBe(true);
    expect(r.independentlyObservedOriginalProof).toBe("HTTP_404");
    expect(r.activationEligible).toBe(false);
  });
  it("flags conflicting public proof B even when the return schema is valid", () => {
    const r = makeQl271HoldDisposition(inspectQl271Return(JSON.stringify(valid()), NOW),
      { status: "UNVERIFIED_PUBLIC_RENEWAL_CLAIM", proofB: "c".repeat(40) });
    expect(r.priorQl270Comparison).toBe("PUBLIC_B_CLAIMS_CONFLICT");
  });
  it.each([
    ["invalid JSON", "{"], ["array", "[]"], ["null", "null"],
    ["unknown field", JSON.stringify({ ...valid(), password: "secret" })],
    ["wrong repo", JSON.stringify({ ...valid(), repository: "someone/else" })],
    ["wrong immutable source", JSON.stringify({ ...valid(), observed_main_sha: A })],
    ["same source A and B", JSON.stringify({ ...valid(), candidate_proof_b_commit: A })],
    ["bad SHA", JSON.stringify({ ...valid(), source_a_commit: "A".repeat(40) })],
    ["future timestamp", JSON.stringify({ ...valid(), observed_at: NOW + 1 })],
    ["stale timestamp", JSON.stringify({ ...valid(), observed_at: NOW - 600_001 })],
    ["private approval", JSON.stringify({ ...valid(), owner_test_authorization: "APPROVED" })],
    ["network GET", JSON.stringify({ ...valid(), authenticated_gateway_gets: 1 })],
    ["relay on", JSON.stringify({ ...valid(), windows_private_relay: "ON" })],
    ["improper reviewer approval", JSON.stringify({ ...valid(), reviewer_disposition: "APPROVED" })],
    ["signature field", JSON.stringify({ ...valid(), original_signature: "private-signature" })]
  ])("rejects %s", (_name, json) => {
    expect(inspectQl271Return(json, NOW).status).toBe("REJECTED_UNTRUSTED_OR_MALFORMED");
    expect(makeQl271HoldDisposition(inspectQl271Return(json, NOW)).claimedProofB).toBeNull();
  });
  it("rejects oversized payloads and unrealistic clocks", () => {
    expect(inspectQl271Return("x".repeat(4097), NOW).status).toBe("REJECTED_UNTRUSTED_OR_MALFORMED");
    expect(inspectQl271Return(JSON.stringify(valid()), Number.NaN).status).toBe("REJECTED_UNTRUSTED_OR_MALFORMED");
  });
  it("never returns private identities, raw payloads or bearer credentials in reports", () => {
    const report = JSON.stringify(makeQl271HoldDisposition(inspectQl271Return(JSON.stringify(valid()), NOW)));
    expect(report).not.toContain("source_a_commit");
    expect(report).not.toContain("reviewer_separation_claim");
    expect(report).toContain("NOT_VERIFIED");
  });
});
