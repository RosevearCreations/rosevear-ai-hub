/** QL-256 Build 184: cryptographic check of independently supplied PUBLIC witness metadata ONLY.
 * A self-contained signature is NOT trusted custody, owner identity or authorization. */
import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SHA = /^[a-f0-9]{40}$/;
const DIGEST = /^[a-f0-9]{64}$/;
const OPAQUE = /^[a-zA-Z0-9_-]{8,80}$/;
const REPO = "RosevearCreations/rosevear-ai-hub";
const PAYLOAD_KEYS = ["schema_version", "repository", "source_sha_A", "source_ci_run_url",
  "proof_commit_sha_B", "business_id", "tenant_id", "signer_key_id",
  "signer_spki_sha256", "registry_snapshot_sha256", "custody_receipt_id",
  "witness_receipt_id", "challenge_sha256", "issued_at", "expires_at"];
const ENVELOPE_KEYS = ["payload", "witnessPublicKeyPem", "witnessSignatureBase64url"];

function exactKeys(value, keys) {
  return !!value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && Object.keys(value).every(key => keys.includes(key));
}
const hex = bytes => createHash("sha256").update(bytes).digest("hex");

/** Deterministic canonical payload for genuine external Ed25519 signers. */
export function canonicalQl256WitnessPayload(payload) {
  if (!exactKeys(payload, PAYLOAD_KEYS)) throw new Error("QL-256 witness payload must contain exactly the public metadata fields.");
  return Buffer.from(JSON.stringify(Object.fromEntries(PAYLOAD_KEYS.map(key => [key, payload[key]]))), "utf8");
}

export function verifyQl256WitnessEnvelope(raw, { now = Date.now(), expectedWitnessSpkiSha256 } = {}) {
  if (typeof raw !== "string" || raw.length < 100 || raw.length > 16_384)
    throw new Error("Missing or oversized public-only QL-256 witness envelope.");
  if (expectedWitnessSpkiSha256 !== undefined && !DIGEST.test(expectedWitnessSpkiSha256))
    throw new Error("Only a 64-hex out-of-band public witness pin candidate is accepted.");
  let envelope;
  try { envelope = JSON.parse(raw); } catch { throw new Error("QL-256 witness JSON invalid."); }
  if (!exactKeys(envelope, ENVELOPE_KEYS))
    throw new Error("QL-256 witness envelope includes missing or prohibited fields.");
  const p = envelope.payload;
  const canonical = canonicalQl256WitnessPayload(p);
  if (p.schema_version !== "rosevear.ql256.witness.v1" || p.repository !== REPO ||
    !SHA.test(p.source_sha_A) || p.business_id !== "rosevear-ai-hub" || p.tenant_id !== null ||
    typeof p.source_ci_run_url !== "string" ||
    !/^https:\/\/github\.com\/RosevearCreations\/rosevear-ai-hub\/actions\/runs\/[1-9][0-9]*$/.test(p.source_ci_run_url) ||
    p.proof_commit_sha_B !== null && (!SHA.test(p.proof_commit_sha_B) || p.proof_commit_sha_B === p.source_sha_A) ||
    !OPAQUE.test(p.signer_key_id) || !DIGEST.test(p.signer_spki_sha256) ||
    !DIGEST.test(p.registry_snapshot_sha256) || !OPAQUE.test(p.custody_receipt_id) ||
    !OPAQUE.test(p.witness_receipt_id) || p.custody_receipt_id === p.witness_receipt_id ||
    !DIGEST.test(p.challenge_sha256) || !Number.isSafeInteger(p.issued_at) ||
    !Number.isSafeInteger(p.expires_at) || p.expires_at <= p.issued_at ||
    p.expires_at - p.issued_at > 300_000 || p.issued_at > now || p.expires_at <= now)
    throw new Error("QL-256 public witness source, role separation, challenge or expiry invalid.");
  if (typeof envelope.witnessPublicKeyPem !== "string" ||
    envelope.witnessPublicKeyPem.includes("PRIVATE KEY") ||
    !envelope.witnessPublicKeyPem.includes("-----BEGIN PUBLIC KEY-----"))
    throw new Error("Only witness public SPKI allowed; no private keys.");
  let witnessKey;
  try { witnessKey = createPublicKey(envelope.witnessPublicKeyPem); }
  catch { throw new Error("Invalid independent witness public key."); }
  if (witnessKey.asymmetricKeyType !== "ed25519") throw new Error("Witness key must be Ed25519.");
  if (typeof envelope.witnessSignatureBase64url !== "string" ||
    !/^[a-zA-Z0-9_-]{86}$/.test(envelope.witnessSignatureBase64url))
    throw new Error("Missing canonical detached witness signature.");
  const signature = Buffer.from(envelope.witnessSignatureBase64url, "base64url");
  if (signature.length !== 64 || signature.toString("base64url") !== envelope.witnessSignatureBase64url ||
    !verify(null, canonical, witnessKey, signature))
    throw new Error("QL-256 witness detached signature does not match canonical metadata.");
  const witnessDigest = hex(witnessKey.export({ format: "der", type: "spki" }));
  if (expectedWitnessSpkiSha256 && witnessDigest !== expectedWitnessSpkiSha256)
    throw new Error("Public witness SPKI does not match separately supplied pin candidate.");
  return {
    source_sha_A: p.source_sha_A, source_ci_run_url_claim: p.source_ci_run_url,
    proof_commit_sha_B_claim: p.proof_commit_sha_B ?? "NOT_AVAILABLE",
    signer_public_spki_sha256_claim: p.signer_spki_sha256,
    witness_public_spki_sha256_candidate: witnessDigest,
    registry_snapshot_sha256_claim: p.registry_snapshot_sha256,
    custody_receipt_id_claim: p.custody_receipt_id,
    independent_witness_receipt_id_claim: p.witness_receipt_id,
    canonical_payload_sha256: hex(canonical),
    signature_math: "LOCAL_ED25519_MATCH_ONLY",
    separately_authenticated_witness_origin: "NOT_VERIFIED",
    trusted_pin_registry: "NOT_VERIFIED",
    original_gateway_seven_denials: "NOT_VERIFIED",
    owner_test_decision: "NOT_GIVEN",
    actual_gateway_get: "NOT_RUN",
    proof_publication_gate: "HELD_UNTIL_ORIGINAL_TEST_RECEIPTS_AND_PRIVATE_TRUST",
    relay_installed_or_started: "NO", connection_state: "DISCONNECTED",
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const option = name => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
  if (args.includes("--help")) process.stdout.write("Offline public metadata verification: --envelope <PUBLIC-witness-envelope.json> [--pin <separately received public SPKI SHA256>]. No private keys, no network, no gateway, no trust upgrade.\n");
  else if (!args.includes("--envelope")) process.stdout.write(JSON.stringify({
    original_witness_envelope: "NOT_PROVIDED", signer_status: "SIGNER_STATUS_UNKNOWN",
    private_custodian_and_witness: "NOT_VERIFIED", proof_publication_gate: "HELD",
    owner_test_decision: "NOT_GIVEN", connection_state: "DISCONNECTED",
  }, null, 2) + "\n");
  else {
    try { const result = verifyQl256WitnessEnvelope(readFileSync(option("--envelope"), "utf8"),
      { expectedWitnessSpkiSha256: option("--pin") });
      process.stdout.write(JSON.stringify(result, null, 2) + "\n"); }
    catch (error) { process.stderr.write(`QL-256 private-witness origin NOT authenticated: ${error.message}\n`);
      process.exitCode = 1; }
  }
}
