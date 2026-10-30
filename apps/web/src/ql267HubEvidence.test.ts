import { describe, expect, it } from "vitest";
import { inspectQl267HubDecision, makeQl267HubSafeHandoff } from "./ql267HubEvidence";

const NOW = 1_793_400_000_000;
const A = "a".repeat(40);
const good = () => ({
  schema_version: "rosevear.ql264.public-private-decision-status.v1",
  repository: "RosevearCreations/rosevear-ai-hub",
  source_system: "rosevear-ai-hub", audited_source_sha_A: A,
  role_receipts: {
    custodian: "np-custodian98765", witness: "np-witness987654",
    reviewer: "np-reviewer98765"
  },
  signer_status: "SIGNER_EXISTS_CUSTODY_NOT_VERIFIED",
  signer_pin_status: "REVIEWER_REPORTS_VERIFIED_OUT_OF_BAND",
  restricted_store_status: "REVIEWER_REPORTS_APPROVED",
  custodian_status: "REVIEWER_REPORTS_VERIFIED_OUT_OF_BAND",
  witness_status: "REVIEWER_REPORTS_VERIFIED_OUT_OF_BAND",
  reviewer_status: "REVIEWER_REPORTS_VERIFIED_OUT_OF_BAND",
  nonproduction_isolation: "REVIEWER_REPORTS_ISOLATED_NONPRODUCTION",
  issued_at: NOW - 1000, expires_at: NOW + 60_000,
  owner_test_authorization: "NOT_GIVEN", gateway_get_status: "NOT_RUN",
  windows_relay: "NOT_INSTALLED_OFF"
});

describe("Build 192 QL-267 local-only Hub status and safe export", () => {
  it("no original return stays NOT_RECEIVED and HOLD", () => {
    const packet = makeQl267HubSafeHandoff(inspectQl267HubDecision("", NOW));
    expect(packet.ql264OriginalPublicDecisionIntake).toBe("NOT_RECEIVED");
    expect(packet.authenticatedGatewayGets).toBe(0);
    expect(packet.ownerTestAuthorization).toBe("NOT_GIVEN");
    expect(packet.integration).toBe("DISCONNECTED / HOLD");
  });
  it("claimed reviewer verification stays a claim and strips all receipt IDs", () => {
    const original = good();
    const inspected = inspectQl267HubDecision(JSON.stringify(original), NOW);
    expect(inspected.status).toBe("PUBLIC_CUSTODY_STATUS_CLAIM_ONLY");
    const safe = makeQl267HubSafeHandoff(inspected);
    expect(safe.claimedReviewerStatus).toBe("REVIEWER_REPORTS_VERIFIED_OUT_OF_BAND");
    expect(safe.independentlyAuthenticatedReviewer).toBe("NOT_VERIFIED");
    expect(safe.originalSignedProofB).toBe("NOT_AVAILABLE");
    expect(safe.activationEligible).toBe(false);
    const copied = JSON.stringify(safe);
    expect(copied).not.toContain(original.role_receipts.custodian);
    expect(copied).not.toContain(original.role_receipts.witness);
    expect(copied).not.toContain(original.role_receipts.reviewer);
    expect(copied).not.toContain("PRIVATE KEY");
  });
  it("forged consent, relay activation, old time, secret fields and role collision are rejected", () => {
    const changed = [
      { ...good(), owner_test_authorization: "GIVEN" },
      { ...good(), gateway_get_status: "DONE" },
      { ...good(), windows_relay: "ON" },
      { ...good(), password: "private" },
      { ...good(), role_receipts: { ...good().role_receipts, witness: good().role_receipts.custodian } },
      { ...good(), reviewer_status: "REVIEWER_REPORTS_VERIFIED_OUT_OF_BAND",
        role_receipts: { ...good().role_receipts, reviewer: null } },
      { ...good(), repository: "RosevearCreations/rosiedazzlers" }
    ];
    for (const value of changed) {
      const parsed = inspectQl267HubDecision(JSON.stringify(value), NOW);
      expect(parsed.status).toBe("REJECTED_UNTRUSTED_OR_MALFORMED");
      expect(makeQl267HubSafeHandoff(parsed).activationEligible).toBe(false);
    }
    expect(inspectQl267HubDecision(JSON.stringify(good()), NOW + 120_000).status)
      .toBe("REJECTED_UNTRUSTED_OR_MALFORMED");
  });
});
