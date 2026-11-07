import {describe, expect, it} from "vitest";
import {IDENTITY_258_SCHEMA} from "./processIdentity258";
import {
  LAUNCHER_259_SCHEMA, ISSUER_259_SCHEMA, CHALLENGE_259_SCHEMA,
  parseLauncher259, parseIssuer259, parseChallenge259,
  digestLauncher259, canonicalIssuer259, canonicalChallenge259, reviewLauncher259,
} from "./launcherCustody259";

const release = "7".repeat(40);
const when = "2026-11-07T00:08:12Z";
const now = "2026-11-07T00:12:00Z";
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const hex = (bytes: Uint8Array) => Array.from(bytes).map(v => v.toString(16).padStart(2, "0")).join("");
const p258 = (kind: "node" | "python", stamp: string) => ({listener: "observed", process_kind: kind,
  executable_path_status: "access_restricted_or_unavailable", executable_sha256: null,
  source_hint: "no_checkout_reference_observed", parent_hops_inspected: kind === "node" ? 3 : 1,
  listener_stable: true, process_started_utc: stamp, checkout_source_sha256: "a".repeat(64)});
const identity = {schema: IDENTITY_258_SCHEMA, source: "on_device_read_only",
  observed_at: "2026-11-07T00:08:02Z", checkout_sha_candidate: release,
  web: p258("node", "2026-11-04T15:30:12Z"), backend: p258("python", "2026-11-04T15:30:08Z"),
  recovery_action: "expected_script_reported", recovery_task_state: "enabled", startup_task_state: "disabled",
  original_issuer_signature_verified: false, receiver_off_signature_verified: false,
  installed_release_attested: false, process_attested: false, receiver_activated: false,
  comms_connected: false, changed_anything: false, remote_requests: 0};
const launcher = (kind: "node" | "python") => ({listener: "observed", ancestor_kinds: [kind, "powershell"],
  recovery_script_mentioned: false, chain_hops_inspected: 2, chain_status: "partial_or_complete",
  process_predates_checkout_commit: true, launch_source: "unknown"});
const snapshot = {schema: LAUNCHER_259_SCHEMA, source: "on_device_read_only", observed_at: when,
  checkout_sha_candidate: release, checkout_commit_utc: "2026-11-07T00:00:00Z", identity_258: identity,
  web_launcher: launcher("node"), backend_launcher: launcher("python"),
  recovery_task_state: "enabled", recovery_action: "expected_script_reported", startup_task_state: "disabled",
  supervised_restart_state: "HOLD_PENDING_ORIGINAL_LAUNCHER_CUSTODY",
  original_issuer_signature_verified: false, independent_challenge_signature_verified: false,
  installed_release_attested: false, process_attested: false, restart_authorized: false,
  challenge_executed: false, test_authorized: false, receiver_activated: false,
  comms_connected: false, changed_anything: false, remote_requests: 0};

async function signer() {
  const keys = await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
  const key = new Uint8Array(await crypto.subtle.exportKey("raw", keys.publicKey));
  return {keys, pub: b64(key), fingerprint: hex(new Uint8Array(await crypto.subtle.digest("SHA-256", key)))};
}
async function issue(id: Awaited<ReturnType<typeof signer>>, digest: string) {
  const draft = parseIssuer259(JSON.stringify({schema: ISSUER_259_SCHEMA, release_sha: release,
    observed_at: when, observation_sha256: digest, issuer_public_key_raw_base64: id.pub,
    signature_base64: b64(new Uint8Array(64))}));
  const sig = await crypto.subtle.sign("Ed25519", id.keys.privateKey,
    new TextEncoder().encode(canonicalIssuer259(draft)));
  return parseIssuer259(JSON.stringify({...draft, signature_base64: b64(new Uint8Array(sig))}));
}
async function witness(id: Awaited<ReturnType<typeof signer>>, digest: string) {
  const draft = parseChallenge259(JSON.stringify({schema: CHALLENGE_259_SCHEMA, release_sha: release,
    observed_at: when, observation_sha256: digest, challenge_nonce: "b".repeat(32),
    witness_mode: "OFFLINE_PREFLIGHT_ONLY", challenge_executed: false,
    receiver_port_listening: false, receiver_activated: false, owner_decision: "HOLD", network_requests: 0,
    independent_public_key_raw_base64: id.pub, signature_base64: b64(new Uint8Array(64))}));
  const sig = await crypto.subtle.sign("Ed25519", id.keys.privateKey,
    new TextEncoder().encode(canonicalChallenge259(draft)));
  return parseChallenge259(JSON.stringify({...draft, signature_base64: b64(new Uint8Array(sig))}));
}

describe("Build 259 Windows original launcher and independent offline challenge", () => {
  it("classifies November 4 processes as preceding the new checkout with restart and TEST on HOLD", async () => {
    const observed = parseLauncher259(JSON.stringify(snapshot));
    expect(observed.web_launcher.process_predates_checkout_commit).toBe(true);
    expect(observed.backend_launcher.process_predates_checkout_commit).toBe(true);
    expect(observed.startup_task_state).toBe("disabled");
    expect(observed.web_launcher.launch_source).toBe("unknown");
    const review = await reviewLauncher259(observed, null, null, null, "", release, now);
    expect(review.agedRuntime).toBe(true);
    expect(review.restart_authorized).toBe(false);
    expect(review.test_authorized).toBe(false);
    expect(review.challenge_executed).toBe(false);
    expect(review.state).toBe("LAUNCHER_CUSTODY_259_HOLD");
  });

  it("accepts separate real signatures as an offline candidate only, never a live connection", async () => {
    const observed = parseLauncher259(JSON.stringify(snapshot));
    const digest = await digestLauncher259(observed);
    const original = await signer(); const independent = await signer();
    const issuer = await issue(original, digest); const challenge = await witness(independent, digest);
    const checked = await reviewLauncher259(observed, issuer, challenge,
      original.pub, independent.fingerprint, release, now);
    expect(checked.state).toBe("SIGNED_OFFLINE_CHALLENGE_CANDIDATE_ONLY");
    expect(checked.issuerSignature).toBe(true);
    expect(checked.witnessSignature).toBe(true);
    expect(checked.installed_release_attested).toBe(false);
    expect(checked.restart_authorized).toBe(false);
    expect(checked.challenge_executed).toBe(false);
    expect(checked.comms_connected).toBe(false);
    expect((await reviewLauncher259(observed, issuer, challenge, original.pub,
      "f".repeat(64), release, now)).witnessSignature).toBe(false);
    expect((await reviewLauncher259(observed, issuer, challenge, original.pub,
      independent.fingerprint, release, "2026-11-09T00:08:12Z")).freshness).toBe(false);
    expect((await reviewLauncher259(observed, issuer, await witness(original, digest), original.pub,
      original.fingerprint, release, now)).independent).toBe(false);
    const tampered = parseLauncher259(JSON.stringify({...snapshot, startup_task_state: "disabled",
      web_launcher: {...snapshot.web_launcher, chain_hops_inspected: 1, ancestor_kinds: ["node"]}}));
    expect((await reviewLauncher259(tampered, issuer, challenge, original.pub,
      independent.fingerprint, release, now)).exactObservation).toBe(false);
  });

  it("rejects fabricated approvals, inconsistent process ages, raw arguments and forged live challenge", () => {
    for (const flag of ["original_issuer_signature_verified", "independent_challenge_signature_verified",
      "installed_release_attested", "process_attested", "restart_authorized", "challenge_executed",
      "test_authorized", "receiver_activated", "comms_connected", "changed_anything"])
      expect(() => parseLauncher259(JSON.stringify({...snapshot, [flag]: true}))).toThrow();
    expect(() => parseLauncher259(JSON.stringify({...snapshot, remote_requests: 1}))).toThrow();
    expect(() => parseLauncher259(JSON.stringify({...snapshot, web_launcher: {...snapshot.web_launcher,
      process_predates_checkout_commit: false}}))).toThrow("contradicts");
    expect(JSON.stringify(parseLauncher259(JSON.stringify({...snapshot, raw_arguments: "secret"}))))
      .not.toContain("secret");
    const c = {schema: CHALLENGE_259_SCHEMA, release_sha: release, observed_at: when,
      observation_sha256: "a".repeat(64), challenge_nonce: "b".repeat(32),
      witness_mode: "OFFLINE_PREFLIGHT_ONLY", challenge_executed: false,
      receiver_port_listening: false, receiver_activated: false, owner_decision: "HOLD", network_requests: 0,
      independent_public_key_raw_base64: b64(new Uint8Array(32)), signature_base64: b64(new Uint8Array(64))};
    expect(() => parseChallenge259(JSON.stringify({...c, challenge_executed: true}))).toThrow();
    expect(() => parseChallenge259(JSON.stringify({...c, owner_decision: "YES"}))).toThrow();
    expect(() => parseChallenge259(JSON.stringify({...c, network_requests: 1}))).toThrow();
  });
});
