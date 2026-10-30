import { describe, expect, it } from "vitest";
import { inspectQl269PublicReadback, makeQl269PreflightReport } from "./ql269HubReview";

const NOW = Date.UTC(2026, 9, 30, 20);
const A = "a".repeat(40);
const B = "b".repeat(40);
function packet(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    schema: "rosevear.ql269.public-original-proof-return.v1",
    repository: "RosevearCreations/rosevear-ai-hub",
    source_commit_a: A, proof_commit_b: B,
    immutable_proof_url: `https://raw.githubusercontent.com/RosevearCreations/rosevear-ai-hub/${B}/docs/integration/ql246-source-proof.json`,
    claimed_http_status: 200,
    exact_source_ci_url: "https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/41109680006",
    observed_at: NOW - 10_000, expires_at: NOW + 10_000,
    tenant_isolation: "NOT_INDEPENDENTLY_VERIFIED", credential_scope: "NOT_ISSUED",
    owner_test_authorization: "NOT_GIVEN", gateway_get_count: 0, windows_relay: "OFF",
    ...overrides
  });
}

describe("Build 194 / QL-269 public proof return and isolated GET preflight", () => {
  it("rejects empty and malformed data without reflecting unknown input", () => {
    expect(inspectQl269PublicReadback("", NOW).status).toBe("NOT_RECEIVED");
    const result = inspectQl269PublicReadback('{"password":"PRIVATE"}', NOW);
    expect(result.status).toBe("REJECTED_UNTRUSTED_OR_MALFORMED");
    expect(JSON.stringify(makeQl269PreflightReport(result))).not.toContain("PRIVATE");
  });

  it("compares matching public A and B only as unverified claims and never activates GET", () => {
    const readback = inspectQl269PublicReadback(packet(), NOW);
    expect(readback.status).toBe("UNVERIFIED_PUBLIC_READBACK_CLAIM");
    const report = makeQl269PreflightReport(readback, { status: "UNVERIFIED_PUBLIC_METADATA_CLAIM", sourceA: A, proofB: B });
    expect(report.sourceAtoBPublicClaimComparison).toBe("PUBLIC_CLAIMS_MATCH_UNVERIFIED");
    expect(report.independentlyRetrievedOriginalProofB).toBe("NOT_VERIFIED");
    expect(report.independentlyVerifiedSignatureAndPinnedSpki).toBe("NOT_VERIFIED");
    expect(report.proposedMethodsOnly).toEqual(["GET"]);
    expect(report.proposedPathsOnly).toEqual(["/api/integration/v1/health", "/api/integration/v1/capabilities"]);
    expect(report.denialCasesPendingIndependentApproval).toHaveLength(7);
    expect(report.authenticatedGatewayGets).toBe(0);
    expect(report.activationEligible).toBe(false);
    expect(report.integration).toBe("DISCONNECTED / HOLD");
  });

  it("detects QL-268 absence and conflicting claims without treating HTTP 200 as signature proof", () => {
    const readback = inspectQl269PublicReadback(packet(), NOW);
    expect(makeQl269PreflightReport(readback).sourceAtoBPublicClaimComparison).toBe("QL268_SOURCE_NOT_AVAILABLE");
    expect(makeQl269PreflightReport(readback, { status: "UNVERIFIED_PUBLIC_METADATA_CLAIM", sourceA: A, proofB: "c".repeat(40) }).sourceAtoBPublicClaimComparison)
      .toBe("PUBLIC_CLAIMS_CONFLICT");
    expect(makeQl269PreflightReport(inspectQl269PublicReadback(packet({ claimed_http_status: 404 }), NOW)).activationEligible).toBe(false);
  });

  it.each([
    { private_signer: "SECRET" },
    { source_commit_a: B }, { proof_commit_b: A },
    { immutable_proof_url: "http://192.168.0.1/private" },
    { claimed_http_status: 201 },
    { exact_source_ci_url: "https://example.com/pretend-run" },
    { observed_at: NOW + 1 }, { expires_at: NOW - 1 }, { expires_at: NOW + 901_000 },
    { tenant_isolation: "VERIFIED" }, { credential_scope: "PRODUCTION" },
    { owner_test_authorization: "GIVEN" }, { gateway_get_count: 1 }, { windows_relay: "ON" }
  ])("rejects public reports with expanded, privileged or stale content: %j", overrides => {
    expect(inspectQl269PublicReadback(packet(overrides), NOW).status).toBe("REJECTED_UNTRUSTED_OR_MALFORMED");
  });
});
