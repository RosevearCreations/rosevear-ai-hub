import { describe, expect, it } from "vitest";
import {
  IDENTITY_258_SCHEMA, ISSUER_258_SCHEMA, RECEIVER_OFF_258_SCHEMA,
  parseIdentity258, parseIssuer258, parseReceiverOff258, canonicalIssuer258,
  canonicalReceiverOff258, digestIdentity258, reviewIdentity258,
} from "./processIdentity258";

const release = "9".repeat(40);
const at = "2026-11-06T23:45:00Z";
const now = "2026-11-06T23:50:00Z";
const b64 = (data: Uint8Array) => btoa(String.fromCharCode(...data));
const hex = (data: Uint8Array) => Array.from(data).map(v => v.toString(16).padStart(2, "0")).join("");
const process = (kind: string) => ({listener: "observed", process_kind: kind,
  executable_path_status: "access_restricted_or_unavailable", executable_sha256: null,
  source_hint: "no_checkout_reference_observed", parent_hops_inspected: 2,
  listener_stable: true, process_started_utc: "2026-11-04T15:30:12Z",
  checkout_source_sha256: "a".repeat(64)});
const captured = {schema: IDENTITY_258_SCHEMA, source: "on_device_read_only", observed_at: at,
  checkout_sha_candidate: release, web: process("node"), backend: process("python"),
  recovery_action: "expected_script_reported", recovery_task_state: "enabled",
  startup_task_state: "disabled", original_issuer_signature_verified: false,
  receiver_off_signature_verified: false, installed_release_attested: false,
  process_attested: false, receiver_activated: false, comms_connected: false,
  changed_anything: false, remote_requests: 0};

async function authority() {
  const pair = await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
  const data = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  return {pair, publicKey: b64(data), pin: hex(new Uint8Array(await crypto.subtle.digest("SHA-256", data)))};
}

async function makeIssuer(id: Awaited<ReturnType<typeof authority>>, digest: string) {
  const empty = parseIssuer258(JSON.stringify({schema: ISSUER_258_SCHEMA, release_sha: release,
    observed_at: at, observation_sha256: digest, issuer_public_key_raw_base64: id.publicKey,
    signature_base64: b64(new Uint8Array(64))}));
  const signed = await crypto.subtle.sign("Ed25519", id.pair.privateKey,
    new TextEncoder().encode(canonicalIssuer258(empty)));
  return parseIssuer258(JSON.stringify({...empty, signature_base64: b64(new Uint8Array(signed))}));
}

async function makeReceiver(id: Awaited<ReturnType<typeof authority>>, digest: string) {
  const empty = parseReceiverOff258(JSON.stringify({schema: RECEIVER_OFF_258_SCHEMA,
    release_sha: release, observed_at: at, observation_sha256: digest,
    receiver_port_listening: false, receiver_activated: false, owner_decision: "HOLD", network_requests: 0,
    independent_public_key_raw_base64: id.publicKey, signature_base64: b64(new Uint8Array(64))}));
  const signed = await crypto.subtle.sign("Ed25519", id.pair.privateKey,
    new TextEncoder().encode(canonicalReceiverOff258(empty)));
  return parseReceiverOff258(JSON.stringify({...empty, signature_base64: b64(new Uint8Array(signed))}));
}

describe("Build 258 Windows identity and original issuer / receiver-OFF intake", () => {
  it("retains the real Node/Python listeners despite blank process paths", async () => {
    const observed = parseIdentity258(JSON.stringify(captured));
    expect(observed.web.listener).toBe("observed");
    expect(observed.backend.executable_path_status).toBe("access_restricted_or_unavailable");
    expect(observed.startup_task_state).toBe("disabled");
    expect(observed.process_attested).toBe(false);
    expect(observed.comms_connected).toBe(false);
    const decision = await reviewIdentity258(observed, null, null, null, "", release, now);
    expect(decision.listenerEvidence).toBe(true);
    expect(decision.executableEvidence).toBe(false);
    expect(decision.state).toBe("WINDOWS_IDENTITY_258_HOLD");
    expect(decision.can_request_test).toBe(false);
  });

  it("verifies two genuinely separate Ed25519 receipts without authorizing a TEST", async () => {
    const observed = parseIdentity258(JSON.stringify(captured));
    const digest = await digestIdentity258(observed);
    const original = await authority();
    const witness = await authority();
    const issuer = await makeIssuer(original, digest);
    const receiver = await makeReceiver(witness, digest);
    const review = await reviewIdentity258(observed, issuer, receiver, original.publicKey, witness.pin, release, now);
    expect(review.issuerReceiptAccepted).toBe(true);
    expect(review.receiverOffReceiptAccepted).toBe(true);
    expect(review.state).toBe("SIGNED_OBSERVATION_RECEIPTS_ACCEPTED_OWNER_REVIEW_ONLY");
    expect(review.process_attested).toBe(false);
    expect(review.can_request_test).toBe(false);
    expect(review.comms_connected).toBe(false);
    expect(review.receiver_activated).toBe(false);
    const changed = parseIdentity258(JSON.stringify({...captured, startup_task_state: "enabled"}));
    expect((await reviewIdentity258(changed, issuer, receiver, original.publicKey, witness.pin, release, now)).exactObservation).toBe(false);
    expect((await reviewIdentity258(observed, issuer, receiver, original.publicKey, "f".repeat(64), release, now)).receiverSignature).toBe(false);
    expect((await reviewIdentity258(observed, issuer, receiver, original.publicKey, witness.pin,
      release, "2026-11-08T23:45:00Z")).freshness).toBe(false);
    expect((await reviewIdentity258(observed, issuer, receiver, null, witness.pin, release, now)).state).toBe("WINDOWS_IDENTITY_258_HOLD");
    expect((await reviewIdentity258(observed, issuer, await makeReceiver(original, digest), original.publicKey,
      original.pin, release, now)).independent).toBe(false);
  });

  it("rejects forged status, invalid path proofs, changed receiver and leaked command-line fields", () => {
    for (const field of ["original_issuer_signature_verified", "receiver_off_signature_verified",
      "installed_release_attested", "process_attested", "receiver_activated", "comms_connected", "changed_anything"])
      expect(() => parseIdentity258(JSON.stringify({...captured, [field]: true}))).toThrow();
    expect(() => parseIdentity258(JSON.stringify({...captured, remote_requests: 1}))).toThrow();
    expect(() => parseIdentity258(JSON.stringify({...captured, web: {...captured.web, executable_path_status: "readable"}}))).toThrow();
    expect(() => parseIdentity258(JSON.stringify({...captured, web: {...captured.web, listener_stable: false}}))).toThrow();
    expect(() => parseIdentity258(JSON.stringify({...captured, web: {...captured.web, listener: "invented"}}))).toThrow();
    expect(() => parseIdentity258("x".repeat(8193))).toThrow("8 KB");
    expect(JSON.stringify(parseIdentity258(JSON.stringify({...captured, raw_commandline: "sensitive"}))))
      .not.toContain("sensitive");
    const receipt = {schema: RECEIVER_OFF_258_SCHEMA, release_sha: release, observed_at: at,
      observation_sha256: "b".repeat(64), receiver_port_listening: false,
      receiver_activated: false, owner_decision: "HOLD", network_requests: 0,
      independent_public_key_raw_base64: b64(new Uint8Array(32)), signature_base64: b64(new Uint8Array(64))};
    expect(() => parseReceiverOff258(JSON.stringify({...receipt, receiver_port_listening: true}))).toThrow();
    expect(() => parseReceiverOff258(JSON.stringify({...receipt, owner_decision: "APPROVE"}))).toThrow();
  });
});
