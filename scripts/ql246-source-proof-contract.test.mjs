import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { test } from "node:test";
import { canonicalQl246Payload, NEGATIVE_FIELDS, validateQl246HubProof } from "./ql246-source-proof-contract.mjs";

const sha = data => createHash("sha256").update(data).digest("hex");
// Disposable in-memory test key only; never a real Hub app signing credential or public proof.
const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const pub = publicKey.export({ type: "spki", format: "pem" }).toString();
const at = 1_793_000_000_000;
const payload = {
  schema_version: "rosevear.integration.v1", source_system: "rosevear-ai-hub",
  repository: "RosevearCreations/rosevear-ai-hub", source_revision: "a".repeat(40),
  challenge_id: "np-challenge-unit-test", challenge_sha256: "b".repeat(64),
  business_id: "rosevear-ai-hub", tenant_id: null, environment: "nonproduction",
  ci_run_url: "https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/123456",
  allowed_methods: ["GET"],
  allowed_paths: ["/api/integration/v1/health", "/api/integration/v1/capabilities"],
  negative_tests: Object.fromEntries(NEGATIVE_FIELDS.map(x => [x, true])),
  gateway_audit_receipt_id: null, health_receipt_id: null, capabilities_receipt_id: null,
  registered_key_id: null, owner_authorization: "NOT_GIVEN", connection_state: "DISCONNECTED",
  external_gateway_get_verified: false, durable_audit_verified: false,
  owner_identity_verified: false, issued_at: at - 60_000, expires_at: at + 60_000,
};
function fixture(currentPayload = payload) {
  const signature = sign(null, canonicalQl246Payload(currentPayload), privateKey).toString("base64url");
  const raw = Buffer.from(JSON.stringify({ publicKeyPem: pub, payload: currentPayload, signature }));
  const trusted = { rawBytesSha256: sha(raw), sourceRevision: "a".repeat(40),
    proofPublicationRevision: "c".repeat(40), challengeId: payload.challenge_id,
    challengeSha256: payload.challenge_sha256, ciRunUrl: payload.ci_run_url,
    independentlyWitnessedNegativeTests: [...NEGATIVE_FIELDS],
    outOfBandSpkiFingerprintSha256: sha(publicKey.export({ type: "spki", format: "der" })),
    challengeIssuedAtMs: at - 120_000, nowMs: at };
  return { raw, trusted };
}
test("accepts strictly authenticated synthetic signed metadata as HOLD-only", () => {
  const { raw, trusted } = fixture();
  assert.deepEqual(validateQl246HubProof(raw, trusted), {
    accepted_metadata_only: true, integration: "DISCONNECTED", owner_authorization: "NOT_GIVEN",
    gateway_pilot: "HOLD", source_revision: "a".repeat(40),
    proof_publication_revision: "c".repeat(40),
  });
});
test("rejects all missing independent negative witnesses", () => {
  const { raw, trusted } = fixture();
  assert.throws(() => validateQl246HubProof(raw, {
    ...trusted, independentlyWitnessedNegativeTests: NEGATIVE_FIELDS.slice(0, -1) }), /seven independently/);
});
test("rejects forged source claims even with locally recomputed signature", () => {
  for (const update of [
    { owner_authorization: "GIVEN" }, { connection_state: "CONNECTED" },
    { external_gateway_get_verified: true }, { allowed_methods: ["GET", "POST"] },
    { source_revision: "d".repeat(40) }, { tenant_id: "np-wrong-tenant" },
    { negative_tests: { ...payload.negative_tests, write_denied: false } },
  ]) {
    const { raw, trusted } = fixture({ ...payload, ...update });
    assert.throws(() => validateQl246HubProof(raw, trusted));
  }
});
test("rejects self-reference, wrong independent pin, absent challenge, stale and edited bytes", () => {
  const { raw, trusted } = fixture();
  assert.throws(() => validateQl246HubProof(raw, {
    ...trusted, proofPublicationRevision: trusted.sourceRevision }), /independently pinned/);
  assert.throws(() => validateQl246HubProof(raw, {
    ...trusted, outOfBandSpkiFingerprintSha256: "0".repeat(64) }), /fingerprint/);
  assert.throws(() => validateQl246HubProof(raw, {
    ...trusted, challengeId: "np-unknown" }), /challenge/);
  assert.throws(() => validateQl246HubProof(raw, { ...trusted, nowMs: at + 120_000 }), /expiration/);
  assert.throws(() => validateQl246HubProof(Buffer.concat([raw, Buffer.from(" ")]), trusted), /raw HTTPS/);
});
test("rejects altered signed payload when stale detached signature is replayed", () => {
  const { raw, trusted } = fixture();
  const altered = JSON.parse(raw.toString("utf8"));
  altered.payload.issued_at -= 1;
  const tamperedBytes = Buffer.from(JSON.stringify(altered));
  assert.throws(() => validateQl246HubProof(tamperedBytes,
    { ...trusted, rawBytesSha256: sha(tamperedBytes) }), /signature invalid/);
});
