import { strict as assert } from "node:assert";
import { test } from "node:test";
import { inspectQl261OwnerPacket } from "./ql261-hub-source-return.mjs";

function original() {
  return { release: "ql258-six-app-owner-custody-checklist-public-source-recheck-held-v1",
    system: "rosevear-ai-hub", repository: "rosevear-ai-hub",
    publicGitHubSnapshot: { observed: "29 October 2026",
      mainSha: "99d64047c49678733af762ff906f288ec3ee0bb8",
      requiredPath: "docs/integration/ql246-source-proof.json", httpStatusAtObservedSha: 404 },
    ownerReportedUnverifiedProgress: { privateCustodian: "NOT_REPORTED",
      independentWitness: "NOT_REPORTED", independentReviewer: "NOT_REPORTED",
      privateHost: "NOT_REPORTED", signerPresence: "NOT_REPORTED",
      outOfBandPin: "NOT_REPORTED", tenantIsolation: "NOT_APPLICABLE" },
    independentCustodyAuthenticated: false, sourceProofAccepted: false,
    ownerTestAuthorization: "NOT_GIVEN", authenticatedGatewayGets: 0,
    connection: "DISCONNECTED", livePilotHolds: 12,
    disposition: "OWNER_SELF_REPORT_ONLY_NOT_SECURITY_EVIDENCE_HELD" };
}

test("original QL-258 handoff returns sanitized operator-only status with HOLD", () => {
  const p=original();p.ownerReportedUnverifiedProgress.privateCustodian="OWNER_REPORTS_DONE_NOT_VERIFIED";
  const result=inspectQl261OwnerPacket(JSON.stringify(p));
  assert.equal(result.owner_reported_done_not_verified, 1);
  assert.equal(result.actual_private_custody, "NOT_VERIFIED");
  assert.equal(result.original_signed_source_proof_B, "NOT_AVAILABLE");
  assert.equal(result.owner_test_authorization, "NOT_GIVEN");
  assert.equal(result.connection, "DISCONNECTED / HOLD");
  assert.deepEqual(result.sanitized_ql258_owner_packet, p);
});

test("extra secrets, real names, false source/approval and foreign app are rejected", () => {
  const p=original();p.apiSecret="never";
  assert.throws(()=>inspectQl261OwnerPacket(JSON.stringify(p)),/invalid/);
  delete p.apiSecret;
  p.ownerReportedUnverifiedProgress.privateHost="Jack /private/key";
  assert.throws(()=>inspectQl261OwnerPacket(JSON.stringify(p)),/rejected/);
  p.ownerReportedUnverifiedProgress.privateHost="NOT_REPORTED";
  p.independentCustodyAuthenticated=true;
  assert.throws(()=>inspectQl261OwnerPacket(JSON.stringify(p)),/invalid/);
  p.independentCustodyAuthenticated=false;
  p.system="icamp";
  assert.throws(()=>inspectQl261OwnerPacket(JSON.stringify(p)),/invalid/);
  p.system="rosevear-ai-hub";
  p.publicGitHubSnapshot.mainSha="a".repeat(40);
  assert.throws(()=>inspectQl261OwnerPacket(JSON.stringify(p)),/historical/);
});

test("missing source packet is not silently synthesized as completed owner evidence", () => {
  assert.throws(()=>inspectQl261OwnerPacket("{}"),/Expected only/);
  assert.throws(()=>inspectQl261OwnerPacket("not json"),/Expected only/);
});
