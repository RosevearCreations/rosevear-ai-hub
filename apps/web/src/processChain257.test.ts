import { describe, expect, it } from "vitest";
import {
  CHAIN_257_SCHEMA, ISSUER_257_SCHEMA, RECEIVER_OFF_257_SCHEMA,
  canonicalIssuer257, canonicalReceiverOff257, digestChain257,
  parseChain257, parseIssuer257, parseReceiverOff257, reviewChain257,
} from "./processChain257";

const release = "a".repeat(40);
const time = "2026-11-06T18:00:00Z";
const now = "2026-11-06T18:05:00Z";
const base64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
const hex = (b: Uint8Array) => Array.from(b).map(x => x.toString(16).padStart(2, "0")).join("");

const process = (hash: string) => ({listener: "observed", executable_kind: "generic_interpreter",
  executable_sha256: hash, source_hint: "checkout_path_in_listener_command",
  parent_hops_inspected: 2, listener_stable: true, checkout_source_sha256: "d".repeat(64)});
const host = {
  schema: CHAIN_257_SCHEMA, source: "on_device_read_only", observed_at: time, checkout_sha_candidate: release,
  web: process("b".repeat(64)), backend: process("c".repeat(64)),
  recovery_action: "expected_script_reported", recovery_task_state: "enabled",
  original_issuer_signature_verified: false, receiver_off_signature_verified: false,
  process_attested: false, receiver_activated: false, comms_connected: false,
  changed_anything: false, remote_requests: 0,
};

async function identity() {
  const pair = await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  return {pair, publicKey: base64(raw), pin: hex(new Uint8Array(await crypto.subtle.digest("SHA-256", raw)))};
}

async function issuerReceipt(id: Awaited<ReturnType<typeof identity>>, digest: string) {
  const draft = parseIssuer257(JSON.stringify({schema: ISSUER_257_SCHEMA, release_sha: release,
    observed_at: time, canonical_observation_sha256: digest,
    issuer_public_key_raw_base64: id.publicKey, signature_base64: base64(new Uint8Array(64))}));
  const signature = new Uint8Array(await crypto.subtle.sign("Ed25519", id.pair.privateKey,
    new TextEncoder().encode(canonicalIssuer257(draft))));
  return parseIssuer257(JSON.stringify({...draft, signature_base64: base64(signature)}));
}

async function receiverReceipt(id: Awaited<ReturnType<typeof identity>>, digest: string) {
  const draft = parseReceiverOff257(JSON.stringify({schema: RECEIVER_OFF_257_SCHEMA, release_sha: release,
    observed_at: time, canonical_observation_sha256: digest,
    receiver_port_listening: false, receiver_activated: false, owner_decision: "HOLD", network_requests: 0,
    independent_public_key_raw_base64: id.publicKey, signature_base64: base64(new Uint8Array(64))}));
  const signature = new Uint8Array(await crypto.subtle.sign("Ed25519", id.pair.privateKey,
    new TextEncoder().encode(canonicalReceiverOff257(draft))));
  return parseReceiverOff257(JSON.stringify({...draft, signature_base64: base64(signature)}));
}

describe("Build 257 original issuer and independent receiver-OFF signatures", () => {
  it("verifies both independent real signatures and exact on-host chain without authorizing activation", async () => {
    const signedHost = parseChain257(JSON.stringify(host));
    const digest = await digestChain257(signedHost);
    const original = await identity();
    const separate = await identity();
    const issuer = await issuerReceipt(original, digest);
    const receiver = await receiverReceipt(separate, digest);
    const state = await reviewChain257(signedHost, issuer, receiver, original.publicKey, separate.pin, release, now);
    expect(state.state).toBe("DUAL_SIGNED_WINDOWS_CHAIN_CANDIDATE_ONLY");
    expect(state.issuerSignature).toBe(true);
    expect(state.receiverSignature).toBe(true);
    expect(state.exactObservation).toBe(true);
    expect(state.process_attested).toBe(false);
    expect(state.installed_release_attested).toBe(false);
    expect(state.receiver_activated).toBe(false);
    expect(state.comms_connected).toBe(false);
    expect(state.remote_requests).toBe(0);
    expect(state.decision).toBe("INDEPENDENT_RECEIVER_OFF_OWNER_HOLD");
    expect(state.findings.join(" ")).toContain("do not prove which code an interpreter loaded");
  });

  it("fails closed on tampering, missing original custody, self-witness, expiry, wrong pin and source drift", async () => {
    const signedHost = parseChain257(JSON.stringify(host));
    const digest = await digestChain257(signedHost);
    const original = await identity();
    const separate = await identity();
    const issuer = await issuerReceipt(original, digest);
    const receiver = await receiverReceipt(separate, digest);
    const call = (h = signedHost, i = issuer, r = receiver, key: string | null = original.publicKey,
      pin = separate.pin, sha = release, at = now) => reviewChain257(h, i, r, key, pin, sha, at);
    expect((await call(signedHost, issuer, receiver, null)).state).toBe("WINDOWS_CHAIN_EVIDENCE_HOLD");
    expect((await call(signedHost, issuer, receiver, "malformed custody key")).state).toBe("WINDOWS_CHAIN_EVIDENCE_HOLD");
    expect((await call(signedHost, issuer, receiver, original.publicKey, "0".repeat(64))).receiverSignature).toBe(false);
    expect((await call(signedHost, issuer, receiver, original.publicKey, separate.pin, "b".repeat(40))).exactRelease).toBe(false);
    expect((await call(signedHost, issuer, receiver, original.publicKey, separate.pin, release,
      "2026-11-08T18:00:00Z")).freshness).toBe(false);
    const forged = parseChain257(JSON.stringify({...host, backend: {...host.backend, executable_sha256: "f".repeat(64)}}));
    expect((await call(forged)).exactObservation).toBe(false);
    const noLineage = parseChain257(JSON.stringify({...host, web: {...host.web,
      source_hint: "no_checkout_reference_observed"}}));
    expect((await call(noLineage)).sourceHints).toBe(false);
    const sameKeyReceiver = await receiverReceipt(original, digest);
    expect((await call(signedHost, issuer, sameKeyReceiver, original.publicKey, original.pin)).receiverSeparate).toBe(false);
    const tamperedIssuer = parseIssuer257(JSON.stringify({...issuer, observed_at: "2026-11-06T18:01:00Z"}));
    expect((await call(signedHost, tamperedIssuer)).issuerSignature).toBe(false);
  });

  it("rejects self-asserted trust, altered receiver state, extra command-line exports and malformed evidence", async () => {
    for (const flag of ["original_issuer_signature_verified", "receiver_off_signature_verified",
      "process_attested", "receiver_activated", "comms_connected", "changed_anything"])
      expect(() => parseChain257(JSON.stringify({...host, [flag]: true}))).toThrow();
    expect(() => parseChain257(JSON.stringify({...host, remote_requests: 1}))).toThrow();
    expect(() => parseChain257(JSON.stringify({...host, web: {...host.web, executable_kind: "invented"}}))).toThrow();
    expect(() => parseChain257("x".repeat(8193))).toThrow("8 KB");
    const safe = parseChain257(JSON.stringify({...host, command_line: "do-not-export"}));
    expect(JSON.stringify(safe)).not.toContain("do-not-export");
    const example = {schema: RECEIVER_OFF_257_SCHEMA, release_sha: release, observed_at: time,
      canonical_observation_sha256: "f".repeat(64), independent_public_key_raw_base64: base64(new Uint8Array(32)),
      signature_base64: base64(new Uint8Array(64)), receiver_port_listening: false,
      receiver_activated: false, network_requests: 0, owner_decision: "HOLD"};
    expect(() => parseReceiverOff257(JSON.stringify({...example, receiver_activated: true}))).toThrow();
    expect(() => parseReceiverOff257(JSON.stringify({...example, owner_decision: "APPROVED"}))).toThrow();
  });
});
