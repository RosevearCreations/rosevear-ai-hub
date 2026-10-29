import { strict as assert } from "node:assert";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { test } from "node:test";
import { canonicalQl256WitnessPayload, verifyQl256WitnessEnvelope } from "./ql256-hub-witness-envelope.mjs";

// Ephemeral fixture keys only. They are deliberately NOT original signer/custody evidence.
function fixture(now = Date.now()) {
  const pair = generateKeyPairSync("ed25519");
  const payload = {
    schema_version: "rosevear.ql256.witness.v1",
    repository: "RosevearCreations/rosevear-ai-hub",
    source_sha_A: "a".repeat(40),
    source_ci_run_url: "https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/123",
    proof_commit_sha_B: null, business_id: "rosevear-ai-hub", tenant_id: null,
    signer_key_id: "source-key-01", signer_spki_sha256: "b".repeat(64),
    registry_snapshot_sha256: "c".repeat(64), custody_receipt_id: "custody-001",
    witness_receipt_id: "witness-001", challenge_sha256: "d".repeat(64),
    issued_at: now - 30_000, expires_at: now + 150_000,
  };
  const envelope = {
    payload, witnessPublicKeyPem: pair.publicKey.export({ format: "pem", type: "spki" }).toString(),
    witnessSignatureBase64url: "",
  };
  const resign = () => { envelope.witnessSignatureBase64url =
    sign(null, canonicalQl256WitnessPayload(payload), pair.privateKey).toString("base64url");
    return JSON.stringify(envelope); };
  const digest = createHash("sha256").update(pair.publicKey.export({ format: "der", type: "spki" })).digest("hex");
  return { envelope, payload, resign, digest };
}
test("synthetic QL-256 witness signature can match mathematically but NEVER establishes real witness trust", () => {
  const f = fixture(); const result = verifyQl256WitnessEnvelope(f.resign(), { expectedWitnessSpkiSha256: f.digest });
  assert.equal(result.signature_math, "LOCAL_ED25519_MATCH_ONLY");
  assert.equal(result.separately_authenticated_witness_origin, "NOT_VERIFIED");
  assert.equal(result.trusted_pin_registry, "NOT_VERIFIED");
  assert.equal(result.proof_publication_gate, "HELD_UNTIL_ORIGINAL_TEST_RECEIPTS_AND_PRIVATE_TRUST");
  assert.equal(result.owner_test_decision, "NOT_GIVEN");
});
test("QL-256 rejects mismatched claimed signer fingerprint, witness key, and changed metadata", () => {
  const f = fixture(); const raw=f.resign();
  assert.throws(() => verifyQl256WitnessEnvelope(raw, {expectedWitnessSpkiSha256:"0".repeat(64)}), /pin candidate/);
  const altered = JSON.parse(raw); altered.payload.business_id="other";
  assert.throws(() => verifyQl256WitnessEnvelope(JSON.stringify(altered)), /invalid/);
  const tampered = JSON.parse(raw); tampered.payload.signer_spki_sha256="e".repeat(64);
  assert.throws(() => verifyQl256WitnessEnvelope(JSON.stringify(tampered)), /signature/);
});
test("QL-256 rejects a self-contained private key and extra credential field", () => {
  const f=fixture(); const raw=f.resign(); const obj=JSON.parse(raw);
  obj.privateKey="never"; assert.throws(()=>verifyQl256WitnessEnvelope(JSON.stringify(obj)),/prohibited/);
  const priv=JSON.parse(raw);priv.witnessPublicKeyPem="-----BEGIN PRIVATE KEY-----secret";
  assert.throws(()=>verifyQl256WitnessEnvelope(JSON.stringify(priv)),/private keys/);
});
test("QL-256 rejects replay/expiry, same-role receipt, and unproven source B", () => {
  const f=fixture(); const raw=f.resign();
  assert.throws(()=>verifyQl256WitnessEnvelope(raw,{now:Date.now()+500_000}),/expiry/);
  f.payload.witness_receipt_id=f.payload.custody_receipt_id;
  assert.throws(()=>verifyQl256WitnessEnvelope(f.resign()),/invalid/);
  f.payload.witness_receipt_id="witness-002";f.payload.proof_commit_sha_B=f.payload.source_sha_A;
  assert.throws(()=>verifyQl256WitnessEnvelope(f.resign()),/invalid/);
});
test("QL-256 missing metadata cannot grant owner permission or a relay", () => {
  assert.throws(()=>verifyQl256WitnessEnvelope("{}"),/Missing or oversized/);
});
