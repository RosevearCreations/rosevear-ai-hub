import { describe, expect, it } from "vitest";
import { inspectQl268PublicMetadata, makeQl268HubHoldAudit } from "./ql268HubAudit";

const NOW = Date.UTC(2026, 9, 30, 16, 0);
const A = "a".repeat(40);
const B = "b".repeat(40);
function packet(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    schema: "rosevear.ql268.public-proof-publication-candidate.v1",
    repository: "RosevearCreations/rosevear-ai-hub",
    source_commit_a: A,
    proof_commit_b: B,
    public_proof_url: `https://raw.githubusercontent.com/RosevearCreations/rosevear-ai-hub/${B}/docs/integration/ql246-source-proof.json`,
    exact_source_ci_url: "https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/41090667624",
    public_proof_status_claim: "PUBLISHED_UNVERIFIED",
    nonproduction_isolation_claim: "NOT_VERIFIED",
    independent_pin_claim: "NOT_VERIFIED",
    issued_at: NOW - 10_000,
    expires_at: NOW + 90_000,
    owner_test_authorization: "NOT_GIVEN",
    gateway_get_status: "NOT_RUN",
    windows_relay: "NOT_INSTALLED_OFF",
    ...overrides
  });
}

describe("QL-268 original source-proof exception intake", () => {
  it("keeps absent and malformed packets HELD", () => {
    expect(inspectQl268PublicMetadata("", NOW).status).toBe("NOT_RECEIVED");
    expect(inspectQl268PublicMetadata("{", NOW).status).toBe("REJECTED_UNTRUSTED_OR_MALFORMED");
  });

  it("screens plausible public proof metadata but never elevates the trust decision", () => {
    const result = inspectQl268PublicMetadata(packet(), NOW);
    expect(result.status).toBe("UNVERIFIED_PUBLIC_METADATA_CLAIM");
    expect(result.proofB).toBe(B);
    const audit = makeQl268HubHoldAudit(result);
    expect(audit.claimedProofB).toBe(B);
    expect(audit.originalSignature).toBe("NOT_INDEPENDENTLY_VERIFIED");
    expect(audit.ownerTestAuthorization).toBe("NOT_GIVEN");
    expect(audit.authenticatedGatewayGets).toBe(0);
    expect(audit.integration).toBe("DISCONNECTED / HOLD");
    expect(audit.activationEligible).toBe(false);
    expect(JSON.stringify(audit)).not.toContain("public_proof_url");
  });

  it.each([
    { token: "private" },
    { source_commit_a: B },
    { proof_commit_b: A },
    { public_proof_url: "http://localhost/private/source-proof.json" },
    { exact_source_ci_url: "https://github.com/elsewhere/actions/runs/123" },
    { independent_pin_claim: "VERIFIED" },
    { owner_test_authorization: "GIVEN" },
    { gateway_get_status: "RUN" },
    { windows_relay: "INSTALLED" },
    { expires_at: NOW - 1 },
    { issued_at: NOW + 1 },
    { expires_at: NOW + 1_000_000 }
  ])("rejects forged, privileged, stale or expanded metadata: %j", item => {
    expect(inspectQl268PublicMetadata(packet(item), NOW).status).toBe("REJECTED_UNTRUSTED_OR_MALFORMED");
  });

  it("never echoes rejected private fields", () => {
    const audit = makeQl268HubHoldAudit(inspectQl268PublicMetadata(packet({ private_key: "SHOULD_NOT_EXPORT" }), NOW));
    expect(JSON.stringify(audit)).not.toContain("SHOULD_NOT_EXPORT");
    expect(audit.claimedSourceA).toBeNull();
  });
});
