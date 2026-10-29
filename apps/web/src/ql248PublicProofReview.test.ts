import { afterAll, describe, expect, it, vi } from "vitest";
import { createHash, generateKeyPairSync, sign, webcrypto } from "node:crypto";
import { reviewQl248LocalPublicProof } from "./ql248PublicProofReview";
import type { Ql248AuditDraft } from "./ownerReviewerTriageContinuity";

vi.stubGlobal("crypto", webcrypto);
afterAll(() => vi.unstubAllGlobals());
const f = ["schema_version", "source_system", "repository", "source_revision", "challenge_id",
  "challenge_sha256", "business_id", "tenant_id", "environment", "ci_run_url",
  "allowed_methods", "allowed_paths", "negative_tests", "gateway_audit_receipt_id",
  "health_receipt_id", "capabilities_receipt_id", "registered_key_id", "owner_authorization",
  "connection_state", "external_gateway_get_verified", "durable_audit_verified",
  "owner_identity_verified", "issued_at", "expires_at"] as const;
const sourceSha = "a".repeat(40);
const proofSha = "b".repeat(40);
const sourceCi = "https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/40746072502";
const now = Date.parse("2026-11-26T12:00:00Z");
const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
const spki = publicKey.export({ type: "spki", format: "der" });
const payload = {
  schema_version: "rosevear.integration.v1", source_system: "rosevear-ai-hub",
  repository: "RosevearCreations/rosevear-ai-hub", source_revision: sourceSha,
  challenge_id: "np-fixture-not-a-real-operator", challenge_sha256: "c".repeat(64),
  business_id: "rosevear-ai-hub", tenant_id: null, environment: "nonproduction",
  ci_run_url: sourceCi, allowed_methods: ["GET"],
  allowed_paths: ["/api/integration/v1/health", "/api/integration/v1/capabilities"],
  negative_tests: {
    nonce_replay_denied: true, stale_request_denied: true, cross_business_denied: true,
    cross_tenant_denied: true, revoked_key_denied: true, write_denied: true,
    dispatch_denied: true,
  },
  gateway_audit_receipt_id: null, health_receipt_id: null,
  capabilities_receipt_id: null, registered_key_id: null,
  owner_authorization: "NOT_GIVEN", connection_state: "DISCONNECTED",
  external_gateway_get_verified: false, durable_audit_verified: false,
  owner_identity_verified: false, issued_at: now - 60_000, expires_at: now + 600_000,
};
const make = (value: Record<string, unknown>) => {
  const canonical = f.map(field => JSON.stringify([field, value[field]])).join("\n");
  const signature = sign(null, Buffer.from(canonical), privateKey).toString("base64url");
  const raw = new TextEncoder().encode(JSON.stringify({ publicKeyPem, payload: value, signature }));
  const digest = createHash("sha256").update(raw).digest("hex");
  const typed: Ql248AuditDraft = {
    repository: "RosevearCreations/rosevear-ai-hub", source_sha: sourceSha,
    source_ci_url: sourceCi, proof_commit_sha: proofSha,
    raw_proof_sha256: digest,
    public_spki_sha256: createHash("sha256").update(spki).digest("hex"),
  };
  return { raw, typed };
};

describe("Build 178 public QL-248 local proof provenance review", () => {
  it("checks synthetic public bytes/signature but remains explicitly UNTRUSTED HOLD", async () => {
    const { raw, typed } = make(payload);
    const review = await reviewQl248LocalPublicProof(raw, typed, now);
    expect(review).toMatchObject({ result: "LOCAL_CRYPTO_MATCH_UNTRUSTED_HOLD",
      bytes_match_typed_digest: true, local_ed25519_signature_valid: true,
      signed_source_matches_typed_s: true, typed_public_key_matches_typed_pin: true,
      proof_commit_external_fetch_verified: false, source_ci_external_verified: false,
      pin_independently_authenticated: false,
      challenge_and_seven_denials_independently_verified: false,
      consumer_two_sha_agreement: "PENDING", authenticated_gateway_get: "NOT_PERFORMED",
      owner_pilot_approval: "NOT_GIVEN", connection_state: "DISCONNECTED" });
  });
  it("rejects changed raw bytes, missing external hash formats and SHA S/P self-reference", async () => {
    const { raw, typed } = make(payload);
    await expect(reviewQl248LocalPublicProof(raw, { ...typed, raw_proof_sha256: "0".repeat(64) }, now))
      .rejects.toThrow(/Raw public JSON bytes/);
    await expect(reviewQl248LocalPublicProof(raw, { ...typed, proof_commit_sha: sourceSha }, now))
      .rejects.toThrow(/formats are incomplete/);
    await expect(reviewQl248LocalPublicProof(raw, { ...typed, public_spki_sha256: "1".repeat(64) }, now))
      .rejects.toThrow(/SPKI fingerprint mismatch/);
  });
  it("rejects expired signatures, wrong route/scope, reordered signed schema and bad detached signatures", async () => {
    const fixture = make(payload);
    await expect(reviewQl248LocalPublicProof(fixture.raw, fixture.typed, now + 700_000))
      .rejects.toThrow(/expired/);
    const alteredPaths = make({ ...payload, allowed_paths: ["/api/customer/records"] });
    await expect(reviewQl248LocalPublicProof(alteredPaths.raw, alteredPaths.typed, now))
      .rejects.toThrow(/nonproduction HOLD scope/);
    const { source_revision, ...rest } = payload;
    const wrongOrder = make({ source_revision, ...rest });
    await expect(reviewQl248LocalPublicProof(wrongOrder.raw, wrongOrder.typed, now))
      .rejects.toThrow(/canonical order/);
    const signed = JSON.parse(new TextDecoder().decode(fixture.raw));
    signed.signature = "A".repeat(86);
    const tampered = new TextEncoder().encode(JSON.stringify(signed));
    const tamperedTyped = { ...fixture.typed,
      raw_proof_sha256: createHash("sha256").update(tampered).digest("hex") };
    await expect(reviewQl248LocalPublicProof(tampered, tamperedTyped, now))
      .rejects.toThrow(/signature invalid/);
  });
});
