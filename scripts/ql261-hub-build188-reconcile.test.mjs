import { strict as assert } from "node:assert";
import { test } from "node:test";
import { inspectQl261SourceProofLineage, reconcileQl261HubOwnerPacket } from "./ql261-hub-build188-reconcile.mjs";

const A = "a".repeat(40);
const B = "b".repeat(40);
const base = {
  release: "ql258-six-app-owner-custody-checklist-public-source-recheck-held-v1",
  system: "rosevear-ai-hub", repository: "rosevear-ai-hub",
  publicGitHubSnapshot: { observed: "29 October 2026",
    mainSha: "99d64047c49678733af762ff906f288ec3ee0bb8",
    requiredPath: "docs/integration/ql246-source-proof.json", httpStatusAtObservedSha: 404 },
  ownerReportedUnverifiedProgress: { privateCustodian: "OWNER_REPORTS_DONE_NOT_VERIFIED",
    independentWitness: "OWNER_REPORTS_DONE_NOT_VERIFIED", independentReviewer: "NOT_REPORTED",
    privateHost: "NOT_REPORTED", signerPresence: "NOT_REPORTED",
    outOfBandPin: "NOT_REPORTED", tenantIsolation: "NOT_APPLICABLE" },
  independentCustodyAuthenticated: false, sourceProofAccepted: false,
  ownerTestAuthorization: "NOT_GIVEN", authenticatedGatewayGets: 0,
  connection: "DISCONNECTED", livePilotHolds: 12,
  disposition: "OWNER_SELF_REPORT_ONLY_NOT_SECURITY_EVIDENCE_HELD",
};
const compare = { status: "ahead", base_commit: { sha: A }, merge_base_commit: { sha: A },
  ahead_by: 1, behind_by: 0, commits: [{ sha: B }] };
const response = (data, status=200) => new Response(status === 404 ? "" : JSON.stringify(data), { status });

test("no actual owner original stays absent, NOT a synthetic receipt", () => {
  const out = reconcileQl261HubOwnerPacket();
  assert.equal(out.original_owner_packet, "NOT_PROVIDED");
  assert.equal(out.original_owner_packet_sha256, "NOT_AVAILABLE");
  assert.equal(out.signer_existence, "SIGNER_STATUS_UNKNOWN");
  assert.equal(out.integration, "DISCONNECTED / HOLD");
  assert.equal(out.windows_mini_server_relay, "NOT_INSTALLED_OFF");
});

test("original owner status is byte-digested but never independently certified", () => {
  const owner = JSON.stringify(base);
  const out = reconcileQl261HubOwnerPacket(owner);
  assert.equal(out.original_owner_packet, "RECEIVED_SCHEMA_VALID_SELF_REPORT_ONLY");
  assert.match(out.original_owner_packet_sha256, /^[a-f0-9]{64}$/);
  assert.equal(out.owner_done_self_reports, 2);
  assert.equal(out.owner_report_trust, "NOT_AUTHENTICATED");
  assert.equal(out.private_custodian, "NOT_INDEPENDENTLY_AUTHENTICATED");
  assert.equal(out.separate_nonce_witness, "NOT_INDEPENDENTLY_AUTHENTICATED");
  assert.equal(out.owner_test_authorization, "NOT_GIVEN");
  assert.throws(() => reconcileQl261HubOwnerPacket(JSON.stringify({ ...base, privateKey: "secret" })));
  assert.throws(() => reconcileQl261HubOwnerPacket(JSON.stringify({ ...base, ownerTestAuthorization: "APPROVED" })));
  assert.throws(() => reconcileQl261HubOwnerPacket(JSON.stringify({ ...base,
    ownerReportedUnverifiedProgress: { ...base.ownerReportedUnverifiedProgress, privateHost: "/private/home/secret" } })));
});

test("only public immutable GitHub URLs may be consulted; missing proof stays missing", async () => {
  const urls=[];
  const get=async url => { urls.push(url);return response(url.includes("compare/") ? compare : {}, url.includes("compare/") ? 200 : 404); };
  const result=await inspectQl261SourceProofLineage({ sourceA:A, proofB:B, get });
  assert.deepEqual(urls, [
    `https://api.github.com/repos/RosevearCreations/rosevear-ai-hub/compare/${A}...${B}`,
    `https://raw.githubusercontent.com/RosevearCreations/rosevear-ai-hub/${B}/docs/integration/ql246-source-proof.json`,
  ]);
  assert.equal(result.independent_public_ancestry, "VERIFIED_DESCENDANT_ONLY");
  assert.equal(result.proof_http_status_at_B, 404);
  assert.equal(result.genuine_source_proof, "NOT_ACCEPTED");
  assert.equal(result.integration, "DISCONNECTED / HOLD");
});

test("public proof 200 never upgrades an unpinned signature or independent custody", async () => {
  const proof={ publicKeyPem: "untrusted sample public key", signature:"untrusted-signature",
    payload: { source_revision:A, source_system:"rosevear-ai-hub",
      repository:"RosevearCreations/rosevear-ai-hub", connection_state:"DISCONNECTED",
      owner_authorization:"NOT_GIVEN" } };
  const get=async url => response(url.includes("compare/") ? compare : proof);
  const result=await inspectQl261SourceProofLineage({ sourceA:A, proofB:B, get });
  assert.equal(result.proof_http_status_at_B, 200);
  assert.equal(result.proof_bytes_disposition, "PUBLIC_BYTES_PRESENT_UNVERIFIED_SIGNATURE_PIN_AND_REVIEW");
  assert.equal(result.genuine_source_proof, "NOT_ACCEPTED");
  assert.equal(result.independent_public_spki_pin, "NOT_VERIFIED_OUT_OF_BAND");
  assert.equal(result.owner_test_authorization, "NOT_GIVEN");
});

test("wrong lineage, wrong source, forbidden state and malformed HTTP fail closed", async () => {
  await assert.rejects(inspectQl261SourceProofLineage({ sourceA:A, proofB:A, get: async()=>{throw Error("should not fetch");} }));
  const badCompare={ ...compare, merge_base_commit: { sha: "f".repeat(40) } };
  await assert.rejects(inspectQl261SourceProofLineage({ sourceA:A, proofB:B, get:async()=>response(badCompare) }), /strict descendant/);
  const wrongProof={ publicKeyPem:"public", signature:"fake", payload:{source_revision:B,source_system:"rosevear-ai-hub",repository:"RosevearCreations/rosevear-ai-hub",connection_state:"CONNECTED",owner_authorization:"GIVEN"}};
  await assert.rejects(inspectQl261SourceProofLineage({ sourceA:A, proofB:B,
    get: async url => response(url.includes("compare/") ? compare : wrongProof) }), /identity or HOLD/);
  await assert.rejects(inspectQl261SourceProofLineage({ sourceA:A, proofB:B,
    get: async()=>response({},403) }), /unavailable/);
});
