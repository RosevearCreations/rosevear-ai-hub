import { describe, expect, it } from "vitest";
import {
  ARTIFACT_253_KIND, ARTIFACT_253_PATH, MANIFEST_253_SCHEMA, OBSERVATION_253_SCHEMA, WITNESS_253_SCHEMA,
  assessSupervisedProcessReview253, canonicalManifest253, canonicalWitness253,
  parseArtifactKindManifest253, parseIndependentWitness253, parseWindowsMappingObservation253,
  verifyArtifactKindManifest253, verifyIndependentWitness253,
} from "./artifactWitness253";

const releaseSha = "a".repeat(40);
const artifactSha = "b".repeat(64);
const time = "2026-11-05T04:00:00Z";
const now = "2026-11-05T04:05:00Z";
const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const digestHex = (bytes: Uint8Array) => Array.from(bytes).map(byte => byte.toString(16).padStart(2, "0")).join("");

const observation = {
  schema: OBSERVATION_253_SCHEMA, source: "on_device_read_only", observed_at: time,
  artifact_kind: ARTIFACT_253_KIND, relative_path: ARTIFACT_253_PATH, exists: true, sha256: artifactSha,
  web: {listener: "observed", source_path: "within_checkout", post_boot: "after_boot"},
  backend: {listener: "observed", source_path: "within_checkout", post_boot: "after_boot"},
  recovery_action: "expected_script_reported", witness_verified: false, process_attested: false, changes_made: false,
};

async function keys() {
  const pair = await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  return {pair, rawBase64: encode(raw),
    pin: digestHex(new Uint8Array(await crypto.subtle.digest("SHA-256", raw)))};
}

async function signedManifest(key: Awaited<ReturnType<typeof keys>>) {
  const draft = parseArtifactKindManifest253(JSON.stringify({
    schema: MANIFEST_253_SCHEMA, release_sha: releaseSha, artifact_kind: ARTIFACT_253_KIND,
    relative_path: ARTIFACT_253_PATH, artifact_sha256: artifactSha, observed_at: time,
    signer_public_key_raw_base64: key.rawBase64, signature_base64: encode(new Uint8Array(64)),
  }));
  const signature = await crypto.subtle.sign("Ed25519", key.pair.privateKey,
    new TextEncoder().encode(canonicalManifest253(draft)));
  return parseArtifactKindManifest253(JSON.stringify({...draft, signature_base64: encode(new Uint8Array(signature))}));
}

async function signedWitness(key: Awaited<ReturnType<typeof keys>>) {
  const draft = parseIndependentWitness253(JSON.stringify({
    schema: WITNESS_253_SCHEMA, release_sha: releaseSha, artifact_kind: ARTIFACT_253_KIND,
    relative_path: ARTIFACT_253_PATH, artifact_sha256: artifactSha, observed_at: time,
    web_listener: "observed", backend_listener: "observed", web_source_path: "within_checkout",
    backend_source_path: "within_checkout", web_post_boot: "after_boot", backend_post_boot: "after_boot",
    recovery_action: "expected_script_reported",
    witness_public_key_raw_base64: key.rawBase64, signature_base64: encode(new Uint8Array(64)),
  }));
  const signature = await crypto.subtle.sign("Ed25519", key.pair.privateKey,
    new TextEncoder().encode(canonicalWitness253(draft)));
  return parseIndependentWitness253(JSON.stringify({...draft, signature_base64: encode(new Uint8Array(signature))}));
}

describe("Build 253 independent Windows artifact mapping witness", () => {
  it("binds a signed artifact kind to the exact receipt key/digest but never authorizes installation", async () => {
    const signer = await keys();
    const manifest = await signedManifest(signer);
    const valid = await verifyArtifactKindManifest253(manifest, signer.pin, releaseSha, artifactSha, signer.rawBase64, time, true, now);
    expect(valid.state).toBe("SIGNED_ARTIFACT_KIND_CANDIDATE_ONLY");
    expect(valid.authorized).toBe(false);
    expect((await verifyArtifactKindManifest253(manifest, signer.pin, releaseSha, artifactSha,
      signer.rawBase64, time, false, now)).state).toBe("ARTIFACT_KIND_SIGNATURE_HOLD");
    expect((await verifyArtifactKindManifest253(manifest, signer.pin, releaseSha, "c".repeat(64),
      signer.rawBase64, time, true, now)).receiptContinuous).toBe(false);
    expect((await verifyArtifactKindManifest253(manifest, "0".repeat(64), releaseSha, artifactSha,
      signer.rawBase64, time, true, now)).state).toBe("ARTIFACT_KIND_SIGNATURE_HOLD");
    expect((await verifyArtifactKindManifest253(manifest, signer.pin, "f".repeat(40), artifactSha,
      signer.rawBase64, time, true, now)).state).toBe("ARTIFACT_KIND_SIGNATURE_HOLD");
    expect((await verifyArtifactKindManifest253(manifest, signer.pin, releaseSha, artifactSha,
      signer.rawBase64, time, true, "2026-11-07T04:00:00Z")).fresh).toBe(false);
    expect((await verifyArtifactKindManifest253(manifest, signer.pin, releaseSha, artifactSha,
      signer.rawBase64, "2026-11-02T04:00:00Z", true, now)).receiptContinuous).toBe(false);
    const tampered = parseArtifactKindManifest253(JSON.stringify({...manifest, artifact_sha256: "d".repeat(64)}));
    expect((await verifyArtifactKindManifest253(tampered, signer.pin, releaseSha, "d".repeat(64),
      signer.rawBase64, time, true, now)).signatureValid).toBe(false);
  });

  it("requires a different independently pinned witness signer and the exact classified on-host observation", async () => {
    const signer = await keys();
    const reviewer = await keys();
    const manifest = await signedManifest(signer);
    const witness = await signedWitness(reviewer);
    const parsedObservation = parseWindowsMappingObservation253(JSON.stringify(observation));
    const result = await verifyIndependentWitness253(witness, reviewer.pin, signer.rawBase64, now);
    expect(result.state).toBe("INDEPENDENT_SIGNATURE_CANDIDATE_ONLY");
    expect(result.separateKey).toBe(true);
    const review = assessSupervisedProcessReview253(releaseSha, artifactSha, parsedObservation,
      manifest, true, witness, true, now, "prepare_supervised_review");
    expect(review.evidence_candidate_complete).toBe(true);
    expect(review.digest_matches).toBe(true);
    expect(review.independent_witness_matches).toBe(true);
    expect(review.disposition).toBe("SUPERVISED_PROCESS_ATTESTATION_HOLD");
    expect(review.process_attested).toBe(false);
    expect(review.recovery_authorized).toBe(false);
    expect(review.restart_allowed).toBe(false);
    expect(review.task_modification_allowed).toBe(false);
    expect(review.rollback_allowed).toBe(false);
    expect(review.owner_closure_authorized).toBe(false);
    expect(review.production_installation_verified).toBe(false);

    const selfWitness = await signedWitness(signer);
    expect((await verifyIndependentWitness253(selfWitness, signer.pin, signer.rawBase64, now)).state)
      .toBe("INDEPENDENT_WITNESS_HOLD");
    expect((await verifyIndependentWitness253(witness, "f".repeat(64), signer.rawBase64, now)).state)
      .toBe("INDEPENDENT_WITNESS_HOLD");
    const mismatch = parseWindowsMappingObservation253(JSON.stringify({
      ...observation, recovery_action: "drift_or_unknown",
    }));
    expect(assessSupervisedProcessReview253(releaseSha, artifactSha, mismatch,
      manifest, true, witness, true, now, "hold").independent_witness_matches).toBe(false);
  });

  it("rejects malicious, stale, unbound or self-asserted evidence and discards extra fields", async () => {
    const signer = await keys();
    const manifest = await signedManifest(signer);
    const witness = await signedWitness(await keys());
    expect(() => parseArtifactKindManifest253(JSON.stringify({...manifest, relative_path: "../../escape"}))).toThrow();
    expect(() => parseArtifactKindManifest253(JSON.stringify({...manifest, artifact_kind: "backend_exe"}))).toThrow();
    expect(() => parseArtifactKindManifest253(JSON.stringify({...manifest, observed_at: "yesterday"}))).toThrow();
    expect(() => parseArtifactKindManifest253("x".repeat(8193))).toThrow("8 KB");
    expect(() => parseWindowsMappingObservation253(JSON.stringify({...observation, changes_made: true}))).toThrow();
    expect(() => parseWindowsMappingObservation253(JSON.stringify({...observation, process_attested: true}))).toThrow();
    expect(() => parseWindowsMappingObservation253(JSON.stringify({...observation, witness_verified: true}))).toThrow();
    expect(() => parseWindowsMappingObservation253(JSON.stringify({...observation, web: {...observation.web, listener: "invented"}}))).toThrow();
    expect(() => parseIndependentWitness253(JSON.stringify({...witness, relative_path: "C:\\Secrets"}))).toThrow();
    expect(() => parseIndependentWitness253(JSON.stringify({...witness, observed_at: "yesterday"}))).toThrow();
    const parsed = parseWindowsMappingObservation253(JSON.stringify({...observation, password: "must-not-be-retained"}));
    expect(JSON.stringify(parsed)).not.toContain("must-not-be-retained");
    const stale = assessSupervisedProcessReview253(releaseSha, artifactSha, parsed,
      manifest, true, witness, true, "2026-11-07T04:00:00Z", "inspect");
    expect(stale.observed_fresh).toBe(false);
    expect(stale.evidence_candidate_complete).toBe(false);
  });
});
