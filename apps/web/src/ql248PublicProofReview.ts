/** Build 178: local-only public bytes/signature checks; NEVER independently authenticated trust. */
import { inspectQl248AuditDraft, type Ql248AuditDraft } from "./ownerReviewerTriageContinuity";

export const QL248_MAX_PUBLIC_PROOF_BYTES = 128_000;
const FIELDS = ["schema_version", "source_system", "repository", "source_revision",
  "challenge_id", "challenge_sha256", "business_id", "tenant_id", "environment",
  "ci_run_url", "allowed_methods", "allowed_paths", "negative_tests",
  "gateway_audit_receipt_id", "health_receipt_id", "capabilities_receipt_id",
  "registered_key_id", "owner_authorization", "connection_state",
  "external_gateway_get_verified", "durable_audit_verified", "owner_identity_verified",
  "issued_at", "expires_at"] as const;
const NEGATIVES = ["nonce_replay_denied", "stale_request_denied", "cross_business_denied",
  "cross_tenant_denied", "revoked_key_denied", "write_denied", "dispatch_denied"] as const;
const paths = ["/api/integration/v1/health", "/api/integration/v1/capabilities"];
const digestPattern = /^[0-9a-f]{64}$/;
function exactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key, index) => Object.keys(value)[index] === key);
}
function hex(bytes: Uint8Array): string { return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join(""); }
async function sha256(bytes: Uint8Array): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error("Secure browser WebCrypto is required for public proof inspection.");
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes as BufferSource)));
}
function base64Bytes(raw: string): Uint8Array {
  const decoded = atob(raw.replaceAll("-", "+").replaceAll("_", "/"));
  return Uint8Array.from(decoded, ch => ch.charCodeAt(0));
}

export interface Ql248LocalProofReview {
  review: "LOCAL_PUBLIC_BYTES_AND_SIGNATURE_ONLY";
  bytes_match_typed_digest: true;
  local_ed25519_signature_valid: true;
  signed_source_matches_typed_s: true;
  typed_public_key_matches_typed_pin: true;
  proof_commit_external_fetch_verified: false;
  source_ci_external_verified: false;
  pin_independently_authenticated: false;
  challenge_and_seven_denials_independently_verified: false;
  consumer_two_sha_agreement: "PENDING";
  authenticated_gateway_get: "NOT_PERFORMED";
  owner_pilot_approval: "NOT_GIVEN";
  connection_state: "DISCONNECTED";
  result: "LOCAL_CRYPTO_MATCH_UNTRUSTED_HOLD";
}

/**
 * Caller supplies *public* proof bytes from a local file and typed public identifiers.
 * No HTTP, trusted source/P Git fetch, out-of-band pin or real denial observation occurs.
 * A LOCAL_CRYPTO_MATCH_UNTRUSTED_HOLD is deliberately NOT an acceptance result.
 */
export async function reviewQl248LocalPublicProof(rawBytes: Uint8Array,
  typed: Ql248AuditDraft, atMs = Date.now()): Promise<Ql248LocalProofReview> {
  if (Object.prototype.toString.call(rawBytes) !== "[object Uint8Array]" || !rawBytes.length ||
    rawBytes.length > QL248_MAX_PUBLIC_PROOF_BYTES)
    throw new Error("Public QL-246 proof must be a nonempty JSON file smaller than 128 KB.");
  if (!inspectQl248AuditDraft(typed).format_complete)
    throw new Error("QL-248 public S/P, CI, digest and SPKI pin formats are incomplete.");
  if (await sha256(rawBytes) !== typed.raw_proof_sha256)
    throw new Error("Raw public JSON bytes do not match the separately typed SHA-256 digest.");
  let envelope: unknown;
  try {
    envelope = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(rawBytes));
  } catch { throw new Error("Public proof is not valid UTF-8 JSON."); }
  if (!exactKeys(envelope, ["publicKeyPem", "payload", "signature"]) ||
    !exactKeys(envelope.payload, FIELDS))
    throw new Error("QL-246 public envelope/payload fields or canonical order invalid.");
  const payload = envelope.payload;
  if (payload.schema_version !== "rosevear.integration.v1" ||
    payload.source_system !== "rosevear-ai-hub" ||
    payload.repository !== "RosevearCreations/rosevear-ai-hub" ||
    payload.source_revision !== typed.source_sha || payload.ci_run_url !== typed.source_ci_url ||
    payload.business_id !== "rosevear-ai-hub" || payload.tenant_id !== null ||
    payload.environment !== "nonproduction" ||
    JSON.stringify(payload.allowed_methods) !== '["GET"]' ||
    JSON.stringify(payload.allowed_paths) !== JSON.stringify(paths) ||
    payload.owner_authorization !== "NOT_GIVEN" || payload.connection_state !== "DISCONNECTED" ||
    payload.external_gateway_get_verified !== false ||
    payload.durable_audit_verified !== false || payload.owner_identity_verified !== false)
    throw new Error("Public proof source identity or nonproduction HOLD scope differs from the typed source.");
  const negatives = payload.negative_tests;
  if (typeof payload.challenge_id !== "string" || !/^np-[A-Za-z0-9_-]+$/.test(payload.challenge_id) ||
    typeof payload.challenge_sha256 !== "string" || !digestPattern.test(payload.challenge_sha256) ||
    !exactKeys(negatives, NEGATIVES) ||
    NEGATIVES.some(key => negatives[key] !== true))
    throw new Error("Public challenge fields or seven claimed negative-test flags are malformed; claims are not witnessed evidence.");
  for (const key of ["gateway_audit_receipt_id", "health_receipt_id", "capabilities_receipt_id", "registered_key_id"]) {
    const value = payload[key];
    if (value !== null && (typeof value !== "string" || !/^np-[A-Za-z0-9_-]+$/.test(value)))
      throw new Error("Public receipt identifiers must be nonsecret np- values or null.");
  }
  if (!Number.isSafeInteger(payload.issued_at) || !Number.isSafeInteger(payload.expires_at) ||
    !Number.isSafeInteger(atMs) || (payload.issued_at as number) > atMs ||
    (payload.expires_at as number) <= atMs ||
    (payload.expires_at as number) - (payload.issued_at as number) > 3_600_000 ||
    (payload.expires_at as number) <= (payload.issued_at as number))
    throw new Error("Public one-hour challenge window is expired or malformed (operator challenge remains unverified).");
  if (typeof envelope.publicKeyPem !== "string" ||
    !/^-----BEGIN PUBLIC KEY-----\s+[A-Za-z0-9+/=\s]+-----END PUBLIC KEY-----\s*$/.test(envelope.publicKeyPem) ||
    typeof envelope.signature !== "string" || !/^[A-Za-z0-9_-]{86}$/.test(envelope.signature))
    throw new Error("Public Ed25519 SPKI PEM or detached signature encoding is invalid.");
  let publicDer: Uint8Array; let signature: Uint8Array;
  try {
    publicDer = base64Bytes(envelope.publicKeyPem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----/g, "").replaceAll(/\s+/g, ""));
    signature = base64Bytes(envelope.signature);
  } catch { throw new Error("Public SPKI or detached signature base64 decoding failed."); }
  const canonicalBase64Url = btoa(String.fromCharCode(...signature))
    .replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  if (signature.length !== 64 || canonicalBase64Url !== envelope.signature ||
    await sha256(publicDer) !== typed.public_spki_sha256)
    throw new Error("Public Ed25519 signature length or typed SPKI fingerprint mismatch.");
  let localVerified = false;
  try {
    const key = await crypto.subtle.importKey("spki", publicDer as BufferSource,
      { name: "Ed25519" }, false, ["verify"]);
    const canonical = FIELDS.map(field => JSON.stringify([field, payload[field]])).join("\n");
    localVerified = await crypto.subtle.verify("Ed25519", key, signature as BufferSource,
      new TextEncoder().encode(canonical) as BufferSource);
  } catch { throw new Error("Local Ed25519 public signature verification unavailable or invalid."); }
  if (!localVerified) throw new Error("Local Ed25519 detached signature invalid for the exact signed canonical payload.");
  return {
    review: "LOCAL_PUBLIC_BYTES_AND_SIGNATURE_ONLY", bytes_match_typed_digest: true,
    local_ed25519_signature_valid: true, signed_source_matches_typed_s: true,
    typed_public_key_matches_typed_pin: true,
    proof_commit_external_fetch_verified: false, source_ci_external_verified: false,
    pin_independently_authenticated: false,
    challenge_and_seven_denials_independently_verified: false,
    consumer_two_sha_agreement: "PENDING", authenticated_gateway_get: "NOT_PERFORMED",
    owner_pilot_approval: "NOT_GIVEN", connection_state: "DISCONNECTED",
    result: "LOCAL_CRYPTO_MATCH_UNTRUSTED_HOLD",
  };
}
