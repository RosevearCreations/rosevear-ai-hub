import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { test } from "node:test";
import { canonicalQl246Payload, NEGATIVE_FIELDS } from "./ql246-source-proof-contract.mjs";
import { checkQl252HubPublic, inspectPublicEnvelope } from "./ql252-hub-public-check.mjs";

const repo = "RosevearCreations/rosevear-ai-hub";
const source = "a".repeat(40), proofCommit = "b".repeat(40);
const ci = `https://github.com/${repo}/actions/runs/987654`;
const at = 1_793_000_000_000;
const { privateKey, publicKey } = generateKeyPairSync("ed25519"); // disposable test-only keys
const payload = {
  schema_version: "rosevear.integration.v1", source_system: "rosevear-ai-hub",
  repository: repo, source_revision: source, challenge_id: "np-only-test",
  challenge_sha256: "c".repeat(64), business_id: "rosevear-ai-hub", tenant_id: null,
  environment: "nonproduction", ci_run_url: ci, allowed_methods: ["GET"],
  allowed_paths: ["/api/integration/v1/health", "/api/integration/v1/capabilities"],
  negative_tests: Object.fromEntries(NEGATIVE_FIELDS.map(name => [name, true])),
  gateway_audit_receipt_id: null, health_receipt_id: null, capabilities_receipt_id: null,
  registered_key_id: null, owner_authorization: "NOT_GIVEN", connection_state: "DISCONNECTED",
  external_gateway_get_verified: false, durable_audit_verified: false,
  owner_identity_verified: false, issued_at: at - 30_000, expires_at: at + 30_000,
};
function signedBytes(p = payload) {
  return Buffer.from(JSON.stringify({
    publicKeyPem: publicKey.export({ format: "pem", type: "spki" }).toString(),
    payload: p, signature: sign(null, canonicalQl246Payload(p), privateKey).toString("base64url"),
  }));
}
const response = (status, body) => ({ status, ok: status === 200,
  arrayBuffer: async () => Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body)) });
function fakeGet({ status = 200, compare = { status: "ahead", ahead_by: 2, behind_by: 0 },
  runs = [{ head_sha: source, status: "completed", conclusion: "success", id: 987654,
    html_url: ci, repository: { full_name: repo } }], bytes = signedBytes() } = {}) {
  const requests = [];
  const get = async url => {
    requests.push(url);
    if (url.startsWith("https://raw.githubusercontent.com/")) return response(status, bytes);
    if (url.includes("/compare/")) return response(200, compare);
    if (url.includes("/actions/runs?")) return response(200, { workflow_runs: runs });
    throw new Error("Unexpected non-GitHub URL");
  };
  return { get, requests };
}

test("immutable proof 404 is reported honestly, with no other network request", async () => {
  const x = fakeGet({ status: 404 });
  const result = await checkQl252HubPublic({ mainSha: source, get: x.get });
  assert.equal(result.reason, "HTTP_404_NO_PUBLIC_SIGNED_PROOF");
  assert.equal(result.immutable_proof_http_status, 404);
  assert.equal(result.owner_test_decision, "NOT_GIVEN");
  assert.equal(result.connection_state, "DISCONNECTED");
  assert.equal(x.requests.length, 1);
  assert.match(x.requests[0], /^https:\/\/raw\.githubusercontent\.com\//);
});
test("signed synthetic source/proof A and B remain untrusted HOLD without original witnesses", async () => {
  const x = fakeGet();
  const result = await checkQl252HubPublic({ sourceSha: source, proofSha: proofCommit,
    get: x.get, now: at });
  assert.equal(result.status, "HELD");
  assert.equal(result.reason, "LOCAL_PUBLIC_PROVENANCE_ONLY_INDEPENDENT_WITNESS_AND_OWNER_MISSING");
  assert.equal(result.source_ancestor_of_proof, true);
  assert.equal(result.source_ci_run_url, ci);
  assert.equal(result.public_signature_result, "LOCAL_MATCH_UNTRUSTED_NOT_WITNESSED");
  assert.equal(result.out_of_band_custody_receipt_id, "NOT_AVAILABLE");
  assert.equal(result.actual_gateway_test, "NOT_RUN");
  assert.equal(x.requests.length, 3);
});
test("denies self-reference, missing ancestry, mismatched source CI, expired and altered signatures", async () => {
  const self = await checkQl252HubPublic({ sourceSha: source, proofSha: source,
    get: fakeGet().get });
  assert.equal(self.reason, "SOURCE_A_CANNOT_BE_ITS_OWN_PROOF_B");
  const divergent = await checkQl252HubPublic({ sourceSha: source, proofSha: proofCommit,
    get: fakeGet({ compare: { status: "diverged", ahead_by: 2, behind_by: 1 } }).get });
  assert.equal(divergent.reason, "SOURCE_A_NOT_PROVEN_ANCESTOR_OF_B");
  const ciBad = await checkQl252HubPublic({ sourceSha: source, proofSha: proofCommit,
    get: fakeGet({ runs: [{ id: 987654, head_sha: "d".repeat(40), status: "completed",
      conclusion: "success", html_url: ci, repository: { full_name: repo } }] }).get });
  assert.equal(ciBad.reason, "SOURCE_A_SAME_SHA_GREEN_CI_MISSING");
  const expired = await checkQl252HubPublic({ sourceSha: source, proofSha: proofCommit,
    get: fakeGet().get, now: at + 300_000 });
  assert.equal(expired.reason, "PUBLIC_PROOF_FORMAT_OR_SIGNATURE_INVALID");
  const altered = JSON.parse(signedBytes().toString("utf8"));
  altered.payload.owner_authorization = "GIVEN";
  const forgery = await checkQl252HubPublic({ sourceSha: source, proofSha: proofCommit,
    get: fakeGet({ bytes: Buffer.from(JSON.stringify(altered)) }).get, now: at });
  assert.equal(forgery.reason, "PUBLIC_PROOF_FORMAT_OR_SIGNATURE_INVALID");
});
test("canonical public proof verifier enforces read-only HOLD and digest without accepting witnessed negatives", () => {
  const raw = signedBytes();
  const match = inspectPublicEnvelope(raw, source, ci, at);
  assert.equal(match.exact_proof_bytes_sha256, createHash("sha256").update(raw).digest("hex"));
  assert.equal(match.public_spki_sha256.length, 64);
  assert.match(match.public_signature_result, /UNTRUSTED/);
  const swapped = JSON.parse(raw.toString("utf8"));
  swapped.signature = "a".repeat(86);
  assert.throws(() => inspectPublicEnvelope(Buffer.from(JSON.stringify(swapped)), source, ci, at));
  assert.throws(() => inspectPublicEnvelope(raw, proofCommit, ci, at), /invalid/);
});
test("dry-run CLI API never fetches without an immutable public destination", async () => {
  const x = fakeGet();
  const result = await checkQl252HubPublic({ get: x.get });
  assert.equal(result.reason, "NO_IMMUTABLE_PROOF_COMMIT_SUPPLIED");
  assert.equal(x.requests.length, 0);
  await assert.rejects(() => checkQl252HubPublic({ mainSha: "main", get: x.get }), /complete lowercase/);
});
