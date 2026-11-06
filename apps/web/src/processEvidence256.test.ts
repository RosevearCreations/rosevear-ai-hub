import { describe, expect, it } from "vitest";
import {
  PROCESS_OBSERVATION_256, PROCESS_WITNESS_256, canonicalProcessWitness256,
  parseProcessObservation256, parseProcessWitness256, reviewSignedProcess256,
} from "./processEvidence256";

const release = "a".repeat(40);
const webDigest = "b".repeat(64);
const backendDigest = "c".repeat(64);
const time = "2026-11-06T12:00:00Z";
const now = "2026-11-06T12:05:00Z";
const base64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const hex = (bytes: Uint8Array) => Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");

const observed = {
  schema: PROCESS_OBSERVATION_256, source: "on_device_read_only", observed_at: time,
  checkout_sha_candidate: release,
  web: {listener: "observed", source_path: "within_checkout", post_boot: "after_boot",
    executable_sha256: webDigest, executable_kind: "generic_interpreter", listener_stable: true},
  backend: {listener: "observed", source_path: "within_checkout", post_boot: "after_boot",
    executable_sha256: backendDigest, executable_kind: "generic_interpreter", listener_stable: true},
  recovery_action: "expected_script_reported", signed_by_original_issuer: false,
  independent_witness_verified: false, installed_release_attested: false,
  process_attested: false, comms_connected: false, changed_anything: false, remote_requests: 0,
};

async function identity() {
  const pair = await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  return {pair, publicKey: base64(raw), pin: hex(new Uint8Array(await crypto.subtle.digest("SHA-256", raw)))};
}

async function signed(key: Awaited<ReturnType<typeof identity>>) {
  const draft = parseProcessWitness256(JSON.stringify({
    schema: PROCESS_WITNESS_256, release_sha: release, observed_at: time,
    web_executable_sha256: webDigest, backend_executable_sha256: backendDigest,
    web_executable_kind: "generic_interpreter", backend_executable_kind: "generic_interpreter",
    web_listener: "observed", backend_listener: "observed",
    web_source_path: "within_checkout", backend_source_path: "within_checkout",
    web_post_boot: "after_boot", backend_post_boot: "after_boot",
    recovery_action: "expected_script_reported", witness_public_key_raw_base64: key.publicKey,
    signature_base64: base64(new Uint8Array(64)),
  }));
  const detached = new Uint8Array(await crypto.subtle.sign("Ed25519", key.pair.privateKey,
    new TextEncoder().encode(canonicalProcessWitness256(draft))));
  return parseProcessWitness256(JSON.stringify({...draft, signature_base64: base64(detached)}));
}

describe("Build 256 independent signed process candidate", () => {
  it("checks a real independent Ed25519 signature and exact observation while preserving Comms HOLD", async () => {
    const original = await identity();
    const independent = await identity();
    const host = parseProcessObservation256(JSON.stringify(observed));
    const witness = await signed(independent);
    const review = await reviewSignedProcess256(host, witness, independent.pin, original.publicKey, release, now);
    expect(review.state).toBe("SIGNED_PROCESS_EXECUTABLE_CANDIDATE_ONLY");
    expect(review.signature_valid).toBe(true);
    expect(review.pin_matches).toBe(true);
    expect(review.process_matched).toBe(true);
    expect(review.process_attested).toBe(false);
    expect(review.installed_release_attested).toBe(false);
    expect(review.receiver_activated).toBe(false);
    expect(review.comms_connected).toBe(false);
    expect(review.remote_requests).toBe(0);
    expect(review.decision).toBe("COMMS_TEST_RECEIVER_HOLD");
    expect(review.findings.join(" ")).toContain("Node/Python");
  });

  it("rejects tampering, wrong pins, stale files, mismatched release and signer-reused self witness", async () => {
    const original = await identity();
    const independent = await identity();
    const host = parseProcessObservation256(JSON.stringify(observed));
    const witness = await signed(independent);
    const call = (o = host, w = witness, pin = independent.pin, signer: string | null = original.publicKey,
      expected = release, date = now) => reviewSignedProcess256(o, w, pin, signer, expected, date);
    expect((await call(host, witness, "0".repeat(64))).state).toBe("PROCESS_EVIDENCE_HOLD");
    expect((await call(host, witness, independent.pin, independent.publicKey)).separate_key).toBe(false);
    expect((await call(host, witness, independent.pin, original.publicKey, "f".repeat(40))).release_matches).toBe(false);
    expect((await call(host, witness, independent.pin, original.publicKey, release, "2026-11-08T12:00:00Z")).fresh_evidence).toBe(false);
    expect((await call(parseProcessObservation256(JSON.stringify({...observed, web: {...observed.web,
      executable_sha256: "d".repeat(64)}})))).process_matched).toBe(false);
    const tampered = parseProcessWitness256(JSON.stringify({...witness, backend_executable_sha256: "d".repeat(64)}));
    expect((await call(host, tampered)).signature_valid).toBe(false);
    expect((await call(host, witness, independent.pin, null)).state).toBe("PROCESS_EVIDENCE_HOLD");
  });

  it("rejects all claimed attestation, fabricated host observations and oversized data", () => {
    expect(() => parseProcessObservation256(JSON.stringify({...observed, process_attested: true}))).toThrow();
    expect(() => parseProcessObservation256(JSON.stringify({...observed, installed_release_attested: true}))).toThrow();
    expect(() => parseProcessObservation256(JSON.stringify({...observed, independent_witness_verified: true}))).toThrow();
    expect(() => parseProcessObservation256(JSON.stringify({...observed, comms_connected: true}))).toThrow();
    expect(() => parseProcessObservation256(JSON.stringify({...observed, remote_requests: 1}))).toThrow();
    expect(() => parseProcessObservation256(JSON.stringify({...observed, changed_anything: true}))).toThrow();
    expect(() => parseProcessObservation256(JSON.stringify({...observed, checkout_sha_candidate: "../../escape"}))).toThrow();
    expect(() => parseProcessObservation256(JSON.stringify({...observed, web: {...observed.web,
      executable_sha256: null}}))).toThrow();
    expect(() => parseProcessObservation256(JSON.stringify({...observed, web: {...observed.web,
      executable_kind: "invented"}}))).toThrow();
    expect(() => parseProcessObservation256("x".repeat(8193))).toThrow("8 KB");
    const parsed = parseProcessObservation256(JSON.stringify({...observed, secret: "must-not-persist"}));
    expect(JSON.stringify(parsed)).not.toContain("must-not-persist");
  });
});
