import { strict as assert } from "node:assert";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { test } from "node:test";
import { APPLICATIONS, createQl257BlankCheckpoint, reviewQl257OwnerCheckpoint,
  reviewQl257PublicWitness } from "./ql257-hub-checkpoint.mjs";
import { canonicalQl256WitnessPayload } from "./ql256-hub-witness-envelope.mjs";

function status(app) {
  return { custodian_role: "NOT_ASSIGNED", witness_role: "NOT_ASSIGNED",
    reviewer_role: "NOT_ASSIGNED", key_host: "NOT_APPROVED",
    signer_status: "SIGNER_STATUS_UNKNOWN", spki_pin: "NOT_VERIFIED",
    tenant_isolation: ["yard-workers", "icamp"].includes(app) ? "NOT_VERIFIED" : "NOT_APPLICABLE",
    owner_test_authorization: "NOT_GIVEN", connection: "DISCONNECTED / HOLD" };
}
function packet() { return { schema_version: "rosevear.ql257.owner-status.v1",
  apps: Object.fromEntries(APPLICATIONS.map(app => [app, status(app)])) }; }

test("six complete but untrusted status reports remain DISCONNECTED / HOLD", () => {
  const result = reviewQl257OwnerCheckpoint(JSON.stringify(packet()));
  assert.equal(result.apps_received, 6);
  assert.equal(result.genuine_signed_proof_B, "NOT_AVAILABLE");
  assert.equal(result.original_gateway_GET_and_seven_denials, "NOT_RUN");
  assert.equal(result.owner_test_authorization, "NOT_GIVEN");
  assert.equal(result.connection, "DISCONNECTED / HOLD");
  assert.equal(result.reports[0].externally_authenticated_by_this_tool, false);
  assert.ok(result.reports.find(r => r.app === "icamp").blockers.includes("INDEPENDENTLY_CHECK_NONPRODUCTION_TENANT_ISOLATION"));
});

test("generated operator-safe template passes its own strict review", () => {
  const result = reviewQl257OwnerCheckpoint(JSON.stringify(createQl257BlankCheckpoint()));
  assert.equal(result.apps_received, 6);
  assert.equal(result.connection, "DISCONNECTED / HOLD");
});

test("claimed approved roles, host and pin cannot self-certify original proof or TEST", () => {
  const p = packet();
  for (const app of APPLICATIONS) {
    p.apps[app].custodian_role = "ASSIGNED_AND_INDEPENDENTLY_AUTHENTICATED";
    p.apps[app].witness_role = "ASSIGNED_AND_INDEPENDENTLY_AUTHENTICATED";
    p.apps[app].reviewer_role = "ASSIGNED_AND_INDEPENDENTLY_AUTHENTICATED";
    p.apps[app].key_host = "APPROVED";
    p.apps[app].signer_status = "SIGNER_EXISTS_CUSTODY_NOT_VERIFIED";
    p.apps[app].spki_pin = "VERIFIED_OUT_OF_BAND";
    if (p.apps[app].tenant_isolation !== "NOT_APPLICABLE") p.apps[app].tenant_isolation = "VERIFIED";
  }
  const result = reviewQl257OwnerCheckpoint(JSON.stringify(p));
  assert.equal(result.connection, "DISCONNECTED / HOLD");
  assert.ok(result.reports.every(r => r.operator_stated_only && r.blockers.includes(
    "INDEPENDENT_REVIEW_OF_GENUINE_ORIGINAL_SIGNED_PROOF_AND_RECEIPTS")));
});

test("report validation rejects absent sixth app, extra secret fields, PII, and injected values", () => {
  const p = packet(); delete p.apps.icamp;
  assert.throws(() => reviewQl257OwnerCheckpoint(JSON.stringify(p)), /exactly six/);
  const q = packet(); q.apps["rosevear-ai-hub"].private_key = "never";
  assert.throws(() => reviewQl257OwnerCheckpoint(JSON.stringify(q)), /invalid or prohibited/);
  const r = packet(); r.apps.rosiedazzlers.custodian_role = "Jack 519-555-1234";
  assert.throws(() => reviewQl257OwnerCheckpoint(JSON.stringify(r)), /invalid or prohibited/);
  const s = packet(); s.apps.devilndove.connection = "CONNECTED";
  assert.throws(() => reviewQl257OwnerCheckpoint(JSON.stringify(s)), /invalid or prohibited/);
});

test("explicit TEST consent is excluded from this nonsecret status packet", () => {
  const p = packet(); p.apps.icamp.owner_test_authorization = "GIVEN";
  assert.throws(() => reviewQl257OwnerCheckpoint(JSON.stringify(p)), /invalid or prohibited/);
  p.apps.icamp.owner_test_authorization = "NOT_GIVEN";
  p.apps.icamp.tenant_isolation = "NOT_APPLICABLE";
  assert.throws(() => reviewQl257OwnerCheckpoint(JSON.stringify(p)), /invalid or prohibited/);
});

test("expired or forged public witness metadata requests private renewal without approval", () => {
  const missing = reviewQl257PublicWitness("{}");
  assert.equal(missing.challenge_status, "REJECTED_RENEW_WITH_FRESH_PRIVATE_CHALLENGE");
  assert.equal(missing.publish_proof_B, false);
  const keys = generateKeyPairSync("ed25519");
  const now = Date.now();
  const payload = { schema_version: "rosevear.ql256.witness.v1",
    repository: "RosevearCreations/rosevear-ai-hub", source_sha_A: "a".repeat(40),
    source_ci_run_url: "https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/123",
    proof_commit_sha_B: null, business_id: "rosevear-ai-hub", tenant_id: null,
    signer_key_id: "source-key-01", signer_spki_sha256: "b".repeat(64),
    registry_snapshot_sha256: "c".repeat(64), custody_receipt_id: "custody-001",
    witness_receipt_id: "witness-001", challenge_sha256: "d".repeat(64),
    issued_at: now - 60_000, expires_at: now + 60_000 };
  const enveloped = () => JSON.stringify({ payload,
    witnessPublicKeyPem: keys.publicKey.export({ format: "pem", type: "spki" }).toString(),
    witnessSignatureBase64url: sign(null, canonicalQl256WitnessPayload(payload), keys.privateKey).toString("base64url") });
  const result = reviewQl257PublicWitness(enveloped(), { now });
  const fingerprint = createHash("sha256").update(keys.publicKey.export({ format: "der", type: "spki" })).digest("hex");
  assert.equal(result.witness_public_spki_sha256_candidate, fingerprint);
  assert.equal(result.challenge_status, "CURRENT_LOCAL_ED25519_MATCH_ONLY");
  assert.equal(result.independent_witness_origin, "NOT_VERIFIED");
  assert.equal(result.publish_proof_B, false);
  assert.equal(reviewQl257PublicWitness(enveloped(), { now: now + 61_000 }).challenge_status,
    "REJECTED_RENEW_WITH_FRESH_PRIVATE_CHALLENGE");
  const tampered = JSON.parse(enveloped()); tampered.payload.challenge_sha256 = "e".repeat(64);
  assert.equal(reviewQl257PublicWitness(JSON.stringify(tampered), { now }).challenge_status,
    "REJECTED_RENEW_WITH_FRESH_PRIVATE_CHALLENGE");
});
