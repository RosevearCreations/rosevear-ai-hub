import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import {
  reconcileQl264PublicDecision, planQl264ReversibleTestOnly,
  auditQl264PublicProofB
} from "./ql264-hub-custody-proof-readiness.mjs";

const A = "a".repeat(40), B = "b".repeat(40);
const digest = raw => createHash("sha256").update(raw).digest("hex");
const at = Date.now();

function sample(now = at) {
  return {
    schema_version: "rosevear.ql264.public-private-decision-status.v1",
    repository: "RosevearCreations/rosevear-ai-hub",
    source_system: "rosevear-ai-hub",
    audited_source_sha_A: A,
    role_receipts: {
      custodian: "np-custodian123456", witness: "np-witness12345678",
      reviewer: "np-reviewer123456"
    },
    signer_status: "SIGNER_EXISTS_CUSTODY_NOT_VERIFIED",
    signer_pin_status: "REVIEWER_REPORTS_VERIFIED_OUT_OF_BAND",
    restricted_store_status: "REVIEWER_REPORTS_APPROVED",
    custodian_status: "REVIEWER_REPORTS_VERIFIED_OUT_OF_BAND",
    witness_status: "REVIEWER_REPORTS_VERIFIED_OUT_OF_BAND",
    reviewer_status: "REVIEWER_REPORTS_VERIFIED_OUT_OF_BAND",
    nonproduction_isolation: "REVIEWER_REPORTS_ISOLATED_NONPRODUCTION",
    issued_at: now - 1_000, expires_at: now + 60_000,
    owner_test_authorization: "NOT_GIVEN", gateway_get_status: "NOT_RUN",
    windows_relay: "NOT_INSTALLED_OFF"
  };
}

test("missing original receipt yields explicit unknowns and absolute HOLD", () => {
  const result = reconcileQl264PublicDecision();
  assert.equal(result.original_public_decision, "NOT_PROVIDED");
  assert.equal(result.signer_existence, "SIGNER_STATUS_UNKNOWN");
  assert.equal(result.source_proof_B_accepted, false);
  assert.equal(result.owner_test_authorization, "NOT_GIVEN");
  assert.equal(result.connection, "DISCONNECTED / HOLD");
});

test("even claimed private approvals plus matching byte digest never authenticate private humans", () => {
  const raw = JSON.stringify(sample());
  const result = reconcileQl264PublicDecision(raw,
    { sourceA: A, expectedRawSha256: digest(raw), nowMs: at });
  assert.equal(result.original_public_decision, "RECEIVED_SCHEMA_VALID_CLAIMS_ONLY");
  assert.equal(result.private_custody_authentication, "NOT_VERIFIED_BY_PUBLIC_RETURN");
  assert.equal(result.real_independent_reviewer_decision, "REQUIRES_PRIVATE_ORIGINAL_REVIEW");
  assert.equal(result.claimed_private_role_statuses.reviewer, "REVIEWER_REPORTS_VERIFIED_OUT_OF_BAND");
  assert.equal(result.source_proof_B_accepted, false);
  assert.equal(result.gateway_gets, "NOT_RUN");
  assert.equal(result.connection, "DISCONNECTED / HOLD");
});

test("private fields, false authority, role collision, stale receipt and source drift fail closed", () => {
  const p = sample();
  assert.throws(() => reconcileQl264PublicDecision(JSON.stringify({...p, homeIp:"PRIVATE"}),
    {sourceA:A,nowMs:at}), /private-capable/);
  assert.throws(() => reconcileQl264PublicDecision(JSON.stringify({...p,owner_test_authorization:"GIVEN"}),
    {sourceA:A,nowMs:at}), /HOLD/);
  assert.throws(() => reconcileQl264PublicDecision(JSON.stringify({...p,windows_relay:"ON"}),
    {sourceA:A,nowMs:at}), /HOLD/);
  assert.throws(() => reconcileQl264PublicDecision(JSON.stringify({...p,
    role_receipts:{...p.role_receipts,witness:p.role_receipts.custodian}}),
    {sourceA:A,nowMs:at}), /distinct/);
  assert.throws(() => reconcileQl264PublicDecision(JSON.stringify(p),
    {sourceA:B,nowMs:at}), /source identity/);
  assert.throws(() => reconcileQl264PublicDecision(JSON.stringify(p),
    {sourceA:A,nowMs:at+120_000}), /freshness/);
  assert.throws(() => reconcileQl264PublicDecision(JSON.stringify(p),
    {sourceA:A,nowMs:at,expectedRawSha256:"0".repeat(64)}), /differ/);
  assert.throws(() => reconcileQl264PublicDecision(JSON.stringify({...p,
    role_receipts:{...p.role_receipts,custodian:null}}), {sourceA:A,nowMs:at}), /reference/);
});

test("reversible TEST-only preview is fixed in-process with seven unexecuted denials", () => {
  const p = planQl264ReversibleTestOnly();
  assert.deepEqual(p.allowlisted_methods, ["GET"]);
  assert.deepEqual(p.allowlisted_paths, [
    "/api/integration/v1/health", "/api/integration/v1/capabilities"
  ]);
  assert.equal(p.proposed_seven_denials.length, 7);
  assert.equal(new Set(p.proposed_seven_denials).size, 7);
  assert.equal(p.proposed_max_gets, 9);
  assert.equal(p.proposed_max_minutes, 15);
  assert.equal(p.network_requests, 0);
  assert.equal(p.activation_eligible, false);
  assert.equal(p.windows_private_relay, "NOT_INSTALLED_OFF");
});

test("public proof B audit distinguishes 404 from 200 yet never clears the HOLD", async () => {
  const base = { source_A:A, proof_B_observed_main_sha:B, proof_B_accepted:"NO",
    exact_main_push_ci:"https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/1",
    connection:"DISCONNECTED / HOLD" };
  const missing = await auditQl264PublicProofB({
    sourceA:A,proofB:B,recheck:async()=>({...base,exact_proof_http_status:404})
  });
  assert.equal(missing.public_file_status,"MISSING");
  assert.equal(missing.original_proof_B_accepted,false);
  const present = await auditQl264PublicProofB({
    sourceA:A,proofB:B,recheck:async()=>({...base,exact_proof_http_status:200})
  });
  assert.equal(present.public_file_status,"PUBLIC_BYTES_PRESENT_UNTRUSTED");
  assert.equal(present.owner_test_authorization,"NOT_GIVEN");
  await assert.rejects(auditQl264PublicProofB({
    sourceA:A,proofB:B,recheck:async()=>({...base,proof_B_accepted:"YES",exact_proof_http_status:200})
  }), /inconsistent/);
  await assert.rejects(auditQl264PublicProofB({sourceA:A,proofB:A}), /Distinct/);
});

