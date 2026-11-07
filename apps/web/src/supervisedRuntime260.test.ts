import {describe, expect, it} from "vitest";
import {IDENTITY_258_SCHEMA} from "./processIdentity258";
import {LAUNCHER_259_SCHEMA} from "./launcherCustody259";
import {RUNTIME_260_SCHEMA, OWNER_260_SCHEMA, WITNESS_260_SCHEMA,
  parseRuntime260, parseOwner260, parseWitness260, digestRuntime260,
  canonicalOwner260, canonicalWitness260, reviewRuntime260} from "./supervisedRuntime260";

const release = "9".repeat(40);
const commit = "2026-11-06T23:00:00Z";
const earlier = "2026-11-04T15:30:12Z";
const afterWeb = "2026-11-07T00:12:00Z";
const afterBackend = "2026-11-07T00:12:30Z";
const b64 = (v: Uint8Array) => btoa(String.fromCharCode(...v));
const hex = (v: Uint8Array) => [...v].map(i => i.toString(16).padStart(2, "0")).join("");

function observation(stage: "before" | "after") {
  const before = stage === "before";
  const idTime = before ? "2026-11-07T00:00:00Z" : "2026-11-07T00:20:00Z";
  const launchTime = before ? "2026-11-07T00:00:02Z" : "2026-11-07T00:20:02Z";
  const observed = before ? "2026-11-07T00:00:04Z" : "2026-11-07T00:20:04Z";
  const process = (kind: "node" | "python", stamp: string) => ({listener: "observed", process_kind: kind,
    executable_path_status: "access_restricted_or_unavailable", executable_sha256: null,
    source_hint: "no_checkout_reference_observed", parent_hops_inspected: 2,
    listener_stable: true, process_started_utc: stamp, checkout_source_sha256: "a".repeat(64)});
  const id = {schema: IDENTITY_258_SCHEMA, source: "on_device_read_only", observed_at: idTime,
    checkout_sha_candidate: release,
    web: process("node", before ? earlier : afterWeb),
    backend: process("python", before ? "2026-11-04T15:30:08Z" : afterBackend),
    recovery_action: "expected_script_reported", recovery_task_state: "enabled", startup_task_state: "disabled",
    original_issuer_signature_verified: false, receiver_off_signature_verified: false,
    installed_release_attested: false, process_attested: false, receiver_activated: false,
    comms_connected: false, changed_anything: false, remote_requests: 0};
  const launcherPart = (kind: "node" | "python") => ({listener: "observed",
    ancestor_kinds: [kind, "powershell"], recovery_script_mentioned: false,
    chain_hops_inspected: 2, chain_status: "partial_or_complete", launch_source: "unknown",
    process_predates_checkout_commit: before});
  const launcher = {schema: LAUNCHER_259_SCHEMA, source: "on_device_read_only", observed_at: launchTime,
    checkout_sha_candidate: release, checkout_commit_utc: commit, identity_258: id,
    web_launcher: launcherPart("node"), backend_launcher: launcherPart("python"),
    recovery_task_state: "enabled", recovery_action: "expected_script_reported", startup_task_state: "disabled",
    supervised_restart_state: "HOLD_PENDING_ORIGINAL_LAUNCHER_CUSTODY",
    original_issuer_signature_verified: false, independent_challenge_signature_verified: false,
    installed_release_attested: false, process_attested: false, restart_authorized: false,
    challenge_executed: false, test_authorized: false, receiver_activated: false,
    comms_connected: false, changed_anything: false, remote_requests: 0};
  return {schema: RUNTIME_260_SCHEMA, source: "on_device_read_only", stage, observed_at: observed,
    release_sha_candidate: release, launcher_259: launcher,
    web_started_utc: id.web.process_started_utc, backend_started_utc: id.backend.process_started_utc,
    recovery_task_state: "enabled", startup_task_state: "disabled", operator_stage_is_not_proof: true,
    supervised_restart_authorized: false, supervised_restart_performed_attested: false,
    installed_release_attested: false, independent_runtime_verified: false,
    test_authorized: false, challenge_executed: false, receiver_activated: false,
    comms_connected: false, changed_anything: false, remote_requests: 0};
}
async function signer() {
  const keys = await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
  const publicBytes = new Uint8Array(await crypto.subtle.exportKey("raw", keys.publicKey));
  return {keys, publicKey: b64(publicBytes), fingerprint: hex(new Uint8Array(await crypto.subtle.digest("SHA-256", publicBytes)))};
}
async function signedOwner(s: Awaited<ReturnType<typeof signer>>, beforeDigest: string) {
  const draft = parseOwner260(JSON.stringify({schema: OWNER_260_SCHEMA, release_sha: release,
    before_sha256: beforeDigest, decided_at: "2026-11-07T00:05:00Z", expires_at: "2026-11-07T00:35:00Z",
    action: "SUPERVISED_LOCAL_RELEASE_RESTART_ONLY", rollback_ready: true,
    owner_decision: "APPROVED_FOR_SUPERVISED_WINDOW",
    original_owner_public_key_raw_base64: s.publicKey,
    signature_base64: b64(new Uint8Array(64))}));
  const signature = await crypto.subtle.sign("Ed25519", s.keys.privateKey,
    new TextEncoder().encode(canonicalOwner260(draft)));
  return parseOwner260(JSON.stringify({...draft, signature_base64: b64(new Uint8Array(signature))}));
}
async function signedWitness(s: Awaited<ReturnType<typeof signer>>, beforeDigest: string, afterDigest: string) {
  const draft = parseWitness260(JSON.stringify({schema: WITNESS_260_SCHEMA, release_sha: release,
    before_sha256: beforeDigest, after_sha256: afterDigest, witnessed_at: "2026-11-07T00:21:00Z",
    challenge_nonce: "c".repeat(32), test_scope: "NONPRODUCTION_GET_ONLY", receiver_state: "OFF",
    owner_test_decision: "HOLD", challenge_executed: false, network_requests: 0,
    independent_public_key_raw_base64: s.publicKey, signature_base64: b64(new Uint8Array(64))}));
  const signature = await crypto.subtle.sign("Ed25519", s.keys.privateKey,
    new TextEncoder().encode(canonicalWitness260(draft)));
  return parseWitness260(JSON.stringify({...draft, signature_base64: b64(new Uint8Array(signature))}));
}

describe("Build 260 supervised release / independent runtime candidate", () => {
  it("accepts distinct real pinned signatures and a changed listener timeline as candidate only", async () => {
    const before = parseRuntime260(JSON.stringify(observation("before")));
    const after = parseRuntime260(JSON.stringify(observation("after")));
    const a = await signer(), b = await signer();
    const beforeDigest = await digestRuntime260(before), afterDigest = await digestRuntime260(after);
    const owner = await signedOwner(a, beforeDigest), witness = await signedWitness(b, beforeDigest, afterDigest);
    const review = await reviewRuntime260(before, after, owner, witness,
      a.publicKey, a.fingerprint, b.fingerprint, release, "2026-11-07T00:22:00Z");
    expect(review.state).toBe("SIGNED_POST_RESTART_RUNTIME_CANDIDATE_TEST_HOLD");
    expect(review.sequenceConsistent).toBe(true);
    expect(review.ownerSignature).toBe(true);
    expect(review.witnessSignature).toBe(true);
    expect(review.installed_release_attested).toBe(false);
    expect(review.restart_executed_by_app).toBe(false);
    expect(review.challenge_executed).toBe(false);
    expect(review.comms_connected).toBe(false);
    expect((await reviewRuntime260(before, after, owner, witness,
      a.publicKey, a.fingerprint, "f".repeat(64), release, "2026-11-07T00:22:00Z")).signedCandidate).toBe(false);
    expect((await reviewRuntime260(before, after, owner, witness,
      a.publicKey, "f".repeat(64), b.fingerprint, release, "2026-11-07T00:22:00Z")).signedCandidate).toBe(false);
  });

  it("fails closed on legacy running process, unsigned approval, stale witness and wrong release", async () => {
    const before = parseRuntime260(JSON.stringify(observation("before")));
    const after = parseRuntime260(JSON.stringify(observation("after")));
    const a = await signer(), b = await signer();
    const first = await digestRuntime260(before), second = await digestRuntime260(after);
    const owner = await signedOwner(a, first), witness = await signedWitness(b, first, second);
    const legacy = parseRuntime260(JSON.stringify({...observation("after"),
      web_started_utc: earlier, launcher_259: {...observation("after").launcher_259,
        identity_258: {...observation("after").launcher_259.identity_258,
          web: {...observation("after").launcher_259.identity_258.web, process_started_utc: earlier}},
        web_launcher: {...observation("after").launcher_259.web_launcher,
          process_predates_checkout_commit: true}}}));
    expect((await reviewRuntime260(before, legacy, owner, witness,
      a.publicKey, a.fingerprint, b.fingerprint, release, "2026-11-07T00:22:00Z")).sequenceConsistent).toBe(false);
    expect((await reviewRuntime260(before, after, owner, witness,
      a.publicKey, a.fingerprint, b.fingerprint, "f".repeat(40), "2026-11-07T00:22:00Z")).releaseMatched).toBe(false);
    expect((await reviewRuntime260(before, after, owner, witness,
      a.publicKey, a.fingerprint, b.fingerprint, release, "2026-11-09T00:22:00Z")).withinWindow).toBe(false);
    expect((await reviewRuntime260(before, after, {...owner, before_sha256: "f".repeat(64)}, witness,
      a.publicKey, a.fingerprint, b.fingerprint, release, "2026-11-07T00:22:00Z")).signedCandidate).toBe(false);
    expect((await reviewRuntime260(before, after, owner, await signedWitness(a, first, second),
      a.publicKey, a.fingerprint, a.fingerprint, release, "2026-11-07T00:22:00Z")).signedCandidate).toBe(false);
  });

  it("rejects fabricated actions, tampered nested data, and forged live TEST", () => {
    for (const field of ["supervised_restart_authorized", "supervised_restart_performed_attested",
      "installed_release_attested", "independent_runtime_verified", "test_authorized", "challenge_executed",
      "receiver_activated", "comms_connected", "changed_anything"])
      expect(() => parseRuntime260(JSON.stringify({...observation("after"), [field]: true}))).toThrow();
    expect(() => parseRuntime260(JSON.stringify({...observation("after"), remote_requests: 1}))).toThrow();
    expect(() => parseRuntime260(JSON.stringify({...observation("after"),
      web_started_utc: earlier}))).toThrow();
    expect(() => parseRuntime260(JSON.stringify({...observation("after"),
      launcher_259: {...observation("after").launcher_259,
        identity_258: {...observation("after").launcher_259.identity_258,
          startup_task_state: "enabled"}}}))).toThrow();
    expect(JSON.stringify(parseRuntime260(JSON.stringify({...observation("after"), raw_command: "secret"}))))
      .not.toContain("secret");
    const pub = b64(new Uint8Array(32)), sig = b64(new Uint8Array(64));
    const sample = {schema: WITNESS_260_SCHEMA, release_sha: release, before_sha256: "a".repeat(64),
      after_sha256: "b".repeat(64), witnessed_at: "2026-11-07T00:21:00Z", challenge_nonce: "c".repeat(32),
      test_scope: "NONPRODUCTION_GET_ONLY", receiver_state: "OFF", owner_test_decision: "HOLD",
      challenge_executed: false, network_requests: 0, independent_public_key_raw_base64: pub,
      signature_base64: sig};
    expect(() => parseWitness260(JSON.stringify({...sample, challenge_executed: true}))).toThrow();
    expect(() => parseWitness260(JSON.stringify({...sample, receiver_state: "ON"}))).toThrow();
    expect(() => parseWitness260(JSON.stringify({...sample, owner_test_decision: "APPROVED"}))).toThrow();
  });
});
