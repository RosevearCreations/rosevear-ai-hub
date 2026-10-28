/** Offline-only QL-246 metadata checker. This cannot witness gateway negatives or authorize a pilot. */
import { createHash, createPublicKey, verify } from "node:crypto";

export const PAYLOAD_FIELDS = Object.freeze([
  "schema_version", "source_system", "repository", "source_revision",
  "challenge_id", "challenge_sha256", "business_id", "tenant_id",
  "environment", "ci_run_url", "allowed_methods", "allowed_paths",
  "negative_tests", "gateway_audit_receipt_id", "health_receipt_id",
  "capabilities_receipt_id", "registered_key_id", "owner_authorization",
  "connection_state", "external_gateway_get_verified", "durable_audit_verified",
  "owner_identity_verified", "issued_at", "expires_at",
]);
export const NEGATIVE_FIELDS = Object.freeze([
  "nonce_replay_denied", "stale_request_denied", "cross_business_denied",
  "cross_tenant_denied", "revoked_key_denied", "write_denied", "dispatch_denied",
]);
const REPO = "RosevearCreations/rosevear-ai-hub";
const PATHS = ["/api/integration/v1/health", "/api/integration/v1/capabilities"];
const SHA = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40}$/;

export function canonicalQl246Payload(payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload) ||
    Object.keys(payload).length !== PAYLOAD_FIELDS.length ||
    PAYLOAD_FIELDS.some((key, index) => Object.keys(payload)[index] !== key))
    throw new Error("QL-246 payload must contain exactly the canonical 24 fields in order.");
  return Buffer.from(PAYLOAD_FIELDS.map(field => JSON.stringify([field, payload[field]])).join("\n"));
}

function exactObjectKeys(value, keys) {
  return !!value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((field, index) => Object.keys(value)[index] === field);
}

function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }

/**
 * Requires caller-supplied, independently authenticated expected values and witnessed negatives.
 * Never derives external proof from source CI, local fixtures or the envelope itself.
 */
export function validateQl246HubProof(rawBytes, trusted) {
  if (!Buffer.isBuffer(rawBytes) || !trusted || typeof trusted !== "object")
    throw new Error("Raw HTTPS proof bytes and independent operator evidence required.");
  if (!SHA.test(trusted.rawBytesSha256) || sha256(rawBytes) !== trusted.rawBytesSha256)
    throw new Error("QL-246 raw HTTPS bytes digest is not independently pinned.");
  let envelope;
  try { envelope = JSON.parse(rawBytes.toString("utf8")); }
  catch { throw new Error("Invalid QL-246 JSON."); }
  if (!exactObjectKeys(envelope, ["publicKeyPem", "payload", "signature"]))
    throw new Error("QL-246 envelope fields are not exact.");
  const { publicKeyPem, payload, signature } = envelope;
  const canonical = canonicalQl246Payload(payload);
  if (typeof publicKeyPem !== "string" || typeof signature !== "string" ||
    !/^[A-Za-z0-9_-]{86}$/.test(signature))
    throw new Error("QL-246 Ed25519 public key/signature encoding invalid.");
  if (!COMMIT.test(payload.source_revision) || payload.source_revision !== trusted.sourceRevision ||
    !COMMIT.test(trusted.proofPublicationRevision) ||
    trusted.sourceRevision === trusted.proofPublicationRevision)
    throw new Error("QL-246 audited source and later immutable proof publication must be independently pinned.");
  if (payload.schema_version !== "rosevear.integration.v1" ||
    payload.source_system !== "rosevear-ai-hub" || payload.repository !== REPO ||
    payload.business_id !== "rosevear-ai-hub" || payload.tenant_id !== null ||
    payload.environment !== "nonproduction" || payload.owner_authorization !== "NOT_GIVEN" ||
    payload.connection_state !== "DISCONNECTED" ||
    payload.external_gateway_get_verified !== false ||
    payload.durable_audit_verified !== false || payload.owner_identity_verified !== false ||
    JSON.stringify(payload.allowed_methods) !== '["GET"]' ||
    JSON.stringify(payload.allowed_paths) !== JSON.stringify(PATHS))
    throw new Error("QL-246 Hub source identity, nonproduction scope or HOLD flags are invalid.");
  if (!/^np-[A-Za-z0-9_-]+$/.test(payload.challenge_id) ||
    payload.challenge_id !== trusted.challengeId || !SHA.test(payload.challenge_sha256) ||
    payload.challenge_sha256 !== trusted.challengeSha256)
    throw new Error("QL-246 separate operator nonce challenge is not authenticated.");
  if (typeof payload.ci_run_url !== "string" ||
    !/^https:\/\/github\.com\/RosevearCreations\/rosevear-ai-hub\/actions\/runs\/[1-9][0-9]*$/.test(payload.ci_run_url) ||
    payload.ci_run_url !== trusted.ciRunUrl)
    throw new Error("QL-246 exact independent GitHub Actions run required.");
  if (!exactObjectKeys(payload.negative_tests, NEGATIVE_FIELDS) ||
    NEGATIVE_FIELDS.some(key => payload.negative_tests[key] !== true) ||
    !Array.isArray(trusted.independentlyWitnessedNegativeTests) ||
    NEGATIVE_FIELDS.some(key => !trusted.independentlyWitnessedNegativeTests.includes(key)))
    throw new Error("QL-246 seven independently witnessed external negative tests are missing.");
  for (const key of ["gateway_audit_receipt_id", "health_receipt_id",
    "capabilities_receipt_id", "registered_key_id"]) {
    if (payload[key] !== null &&
      (typeof payload[key] !== "string" || !/^np-[A-Za-z0-9_-]+$/.test(payload[key])))
      throw new Error("QL-246 receipt IDs must be real nonsecret np- identifiers or null.");
  }
  const now = Number.isSafeInteger(trusted.nowMs) ? trusted.nowMs : Date.now();
  if (!Number.isSafeInteger(payload.issued_at) || !Number.isSafeInteger(payload.expires_at) ||
    payload.issued_at > now || payload.expires_at <= now ||
    payload.expires_at - payload.issued_at > 3_600_000 ||
    payload.expires_at <= payload.issued_at ||
    !Number.isSafeInteger(trusted.challengeIssuedAtMs) ||
    payload.issued_at < trusted.challengeIssuedAtMs)
    throw new Error("QL-246 challenge issuance/expiration window invalid.");
  let publicKey;
  try { publicKey = createPublicKey(publicKeyPem); }
  catch { throw new Error("QL-246 public SPKI PEM invalid."); }
  if (publicKey.asymmetricKeyType !== "ed25519")
    throw new Error("QL-246 must use an Ed25519 public key.");
  const spki = publicKey.export({ type: "spki", format: "der" });
  if (!SHA.test(trusted.outOfBandSpkiFingerprintSha256) ||
    sha256(spki) !== trusted.outOfBandSpkiFingerprintSha256)
    throw new Error("QL-246 public SPKI fingerprint does not match independent out-of-band pin.");
  const sigBytes = Buffer.from(signature, "base64url");
  if (sigBytes.length !== 64 || sigBytes.toString("base64url") !== signature ||
    !verify(null, canonical, publicKey, sigBytes))
    throw new Error("QL-246 detached Ed25519 signature invalid.");
  return Object.freeze({ accepted_metadata_only: true, integration: "DISCONNECTED",
    owner_authorization: "NOT_GIVEN", gateway_pilot: "HOLD",
    source_revision: payload.source_revision,
    proof_publication_revision: trusted.proofPublicationRevision });
}
