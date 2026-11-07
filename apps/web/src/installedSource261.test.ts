import {describe, expect, it} from "vitest";
import {IDENTITY_258_SCHEMA} from "./processIdentity258";
import {LAUNCHER_259_SCHEMA} from "./launcherCustody259";
import {RUNTIME_260_SCHEMA, OWNER_260_SCHEMA, WITNESS_260_SCHEMA,
  parseOwner260, parseWitness260, digestRuntime260,
  canonicalOwner260, canonicalWitness260} from "./supervisedRuntime260";
import {SOURCE_261_SCHEMA, ISSUER_261_SCHEMA, parseInstalledSource261,
  parseOriginalIssuer261, canonicalOriginalIssuer261, digestInstalledSource261,
  reviewInstalledSource261} from "./installedSource261";

const release = "9".repeat(40);
const started = "2026-11-04T15:30:12Z", commit = "2026-11-06T23:00:00Z";
const b64 = (v: Uint8Array) => btoa(String.fromCharCode(...v));
const hex = (v: Uint8Array) => [...v].map(i => i.toString(16).padStart(2, "0")).join("");
function fixture(stage: "before" | "after", template: "matched_unattested" | "unavailable" = "matched_unattested") {
  const before = stage === "before";
  const identityTime = before ? "2026-11-07T00:00:00Z" : "2026-11-07T00:20:00Z";
  const launcherTime = before ? "2026-11-07T00:00:02Z" : "2026-11-07T00:20:02Z";
  const runtimeTime = before ? "2026-11-07T00:00:04Z" : "2026-11-07T00:20:04Z";
  const observed = before ? "2026-11-07T00:00:08Z" : "2026-11-07T00:20:08Z";
  const process = (kind: "node" | "python", start: string) => ({listener: "observed", process_kind: kind,
    executable_path_status: "access_restricted_or_unavailable", executable_sha256: null,
    source_hint: "no_checkout_reference_observed", parent_hops_inspected: 2, listener_stable: true,
    process_started_utc: start, checkout_source_sha256: kind === "node" ? "a".repeat(64) : "b".repeat(64)});
  const id = {schema: IDENTITY_258_SCHEMA, source: "on_device_read_only", observed_at: identityTime,
    checkout_sha_candidate: release,
    web: process("node", before ? started : "2026-11-07T00:12:00Z"),
    backend: process("python", before ? "2026-11-04T15:30:08Z" : "2026-11-07T00:12:30Z"),
    recovery_action: "expected_script_reported", recovery_task_state: "enabled", startup_task_state: "disabled",
    original_issuer_signature_verified: false, receiver_off_signature_verified: false,
    installed_release_attested: false, process_attested: false, receiver_activated: false,
    comms_connected: false, changed_anything: false, remote_requests: 0};
  const ancestor = (kind: "node" | "python") => ({listener: "observed", ancestor_kinds: [kind, "powershell"],
    recovery_script_mentioned: false, chain_hops_inspected: 2, chain_status: "partial_or_complete",
    launch_source: "unknown", process_predates_checkout_commit: before});
  const launcher = {schema: LAUNCHER_259_SCHEMA, source: "on_device_read_only", observed_at: launcherTime,
    checkout_sha_candidate: release, checkout_commit_utc: commit, identity_258: id,
    web_launcher: ancestor("node"), backend_launcher: ancestor("python"),
    recovery_task_state: "enabled", recovery_action: "expected_script_reported", startup_task_state: "disabled",
    supervised_restart_state: "HOLD_PENDING_ORIGINAL_LAUNCHER_CUSTODY",
    original_issuer_signature_verified: false, independent_challenge_signature_verified: false,
    installed_release_attested: false, process_attested: false, restart_authorized: false,
    challenge_executed: false, test_authorized: false, receiver_activated: false,
    comms_connected: false, changed_anything: false, remote_requests: 0};
  const runtime = {schema: RUNTIME_260_SCHEMA, source: "on_device_read_only", stage,
    observed_at: runtimeTime, release_sha_candidate: release, launcher_259: launcher,
    web_started_utc: id.web.process_started_utc, backend_started_utc: id.backend.process_started_utc,
    recovery_task_state: "enabled", startup_task_state: "disabled", operator_stage_is_not_proof: true,
    supervised_restart_authorized: false, supervised_restart_performed_attested: false,
    installed_release_attested: false, independent_runtime_verified: false, test_authorized: false,
    challenge_executed: false, receiver_activated: false, comms_connected: false,
    changed_anything: false, remote_requests: 0};
  const templateInfo = (kind: "node" | "python") => ({listener: "observed", process_kind: kind,
    executable_path_status: template === "matched_unattested" ? "readable" : "access_restricted_or_unavailable",
    command_line_status: template === "matched_unattested" ? "readable" : "access_restricted_or_unavailable",
    template_status: template, expected_launch_template: kind === "node" ? "hub_vite_loopback" : "hub_uvicorn_loopback",
    listener_stable: true});
  return {schema: SOURCE_261_SCHEMA, source: "on_device_read_only", stage,
    observed_at: observed, release_sha_candidate: release, runtime_260: runtime,
    web: templateInfo("node"), backend: templateInfo("python"),
    checkout_web_source_sha256: "a".repeat(64), checkout_backend_source_sha256: "b".repeat(64),
    artifact_mapping_status: "checkout_artifacts_only", original_installed_source_verified: false,
    supervised_restart_receipt_verified: false, independent_witness_verified: false,
    test_authorized: false, challenge_executed: false, receiver_activated: false,
    comms_connected: false, changed_anything: false, remote_requests: 0};
}
async function key() {
  const keys = await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
  const pub = new Uint8Array(await crypto.subtle.exportKey("raw", keys.publicKey));
  return {keys, base64: b64(pub), pin: hex(new Uint8Array(await crypto.subtle.digest("SHA-256", pub)))};
}
async function sign<T extends {signature_base64: string}>(draft: T,
  signer: Awaited<ReturnType<typeof key>>, canonical: (receipt: T) => string): Promise<T> {
  return {...draft, signature_base64: b64(new Uint8Array(await crypto.subtle.sign("Ed25519",
    signer.keys.privateKey, new TextEncoder().encode(canonical(draft)))))};
}

describe("Build 261 installed checkout and supervised Windows runtime evidence", () => {
  it("accepts three independently pinned real signatures as candidate only", async () => {
    const before = parseInstalledSource261(JSON.stringify(fixture("before")));
    const after = parseInstalledSource261(JSON.stringify(fixture("after")));
    const issuerKey = await key(), ownerKey = await key(), witnessKey = await key();
    const base = await digestRuntime260(before.runtime_260);
    const follow = await digestRuntime260(after.runtime_260);
    const owner = parseOwner260(JSON.stringify(await sign({schema: OWNER_260_SCHEMA, release_sha: release,
      before_sha256: base, decided_at: "2026-11-07T00:05:00Z", expires_at: "2026-11-07T00:35:00Z",
      action: "SUPERVISED_LOCAL_RELEASE_RESTART_ONLY", rollback_ready: true,
      owner_decision: "APPROVED_FOR_SUPERVISED_WINDOW", original_owner_public_key_raw_base64: ownerKey.base64,
      signature_base64: b64(new Uint8Array(64))}, ownerKey, canonicalOwner260)));
    const witness = parseWitness260(JSON.stringify(await sign({schema: WITNESS_260_SCHEMA, release_sha: release,
      before_sha256: base, after_sha256: follow, witnessed_at: "2026-11-07T00:21:00Z",
      challenge_nonce: "c".repeat(32), test_scope: "NONPRODUCTION_GET_ONLY", receiver_state: "OFF",
      owner_test_decision: "HOLD", challenge_executed: false, network_requests: 0,
      independent_public_key_raw_base64: witnessKey.base64, signature_base64: b64(new Uint8Array(64))},
    witnessKey, canonicalWitness260)));
    const issuer = parseOriginalIssuer261(JSON.stringify(await sign({schema: ISSUER_261_SCHEMA,
      release_sha: release, before_sha256: await digestInstalledSource261(before),
      after_sha256: await digestInstalledSource261(after), web_checkout_sha256: "a".repeat(64),
      backend_checkout_sha256: "b".repeat(64), mapped_at: "2026-11-07T00:22:00Z",
      expires_at: "2026-11-07T00:35:00Z",
      artifact_scope: "CHECKOUT_ARTIFACTS_AND_LAUNCH_TEMPLATE_CANDIDATE_ONLY", receiver_state: "OFF",
      installed_source_attested: false, original_issuer_public_key_raw_base64: issuerKey.base64,
      signature_base64: b64(new Uint8Array(64))}, issuerKey, canonicalOriginalIssuer261)));
    const args = [before, after, issuer, owner, witness, issuerKey.base64,
      issuerKey.pin, ownerKey.base64, ownerKey.pin, witnessKey.pin, release, "2026-11-07T00:23:00Z"] as const;
    const good = await reviewInstalledSource261(...args);
    expect(good.signedCandidate).toBe(true);
    expect(good.state).toBe("SIGNED_INSTALLED_RUNTIME_CANDIDATE_TEST_HOLD");
    expect(good.installed_release_attested).toBe(false);
    expect(good.process_attested).toBe(false);
    expect(good.comms_connected).toBe(false);
    expect((await reviewInstalledSource261(before, after, issuer, owner, witness, issuerKey.base64,
      "f".repeat(64), ownerKey.base64, ownerKey.pin, witnessKey.pin, release,
      "2026-11-07T00:23:00Z")).signedCandidate).toBe(false);
    expect((await reviewInstalledSource261(before, after, {...issuer, web_checkout_sha256: "f".repeat(64)},
      owner, witness, issuerKey.base64, issuerKey.pin, ownerKey.base64, ownerKey.pin,
      witnessKey.pin, release, "2026-11-07T00:23:00Z")).signedCandidate).toBe(false);
    expect((await reviewInstalledSource261(before, after, issuer, owner, witness, issuerKey.base64,
      issuerKey.pin, ownerKey.base64, ownerKey.pin, witnessKey.pin, release,
      "2026-11-07T02:23:00Z")).signedCandidate).toBe(false);
    const restricted = parseInstalledSource261(JSON.stringify(fixture("after", "unavailable")));
    expect((await reviewInstalledSource261(before, restricted, issuer, owner, witness, issuerKey.base64,
      issuerKey.pin, ownerKey.base64, ownerKey.pin, witnessKey.pin, release,
      "2026-11-07T00:23:00Z")).signedCandidate).toBe(false);
    expect((await reviewInstalledSource261(before, after, issuer, owner, witness, ownerKey.base64,
      ownerKey.pin, ownerKey.base64, ownerKey.pin, witnessKey.pin, release,
      "2026-11-07T00:23:00Z")).signedCandidate).toBe(false);
  });

  it("rejects fabricated source-to-process attestation, unsafe action and forged live Comms", () => {
    const sample = fixture("before");
    for (const field of ["original_installed_source_verified", "supervised_restart_receipt_verified",
      "independent_witness_verified", "test_authorized", "challenge_executed", "receiver_activated",
      "comms_connected", "changed_anything"])
      expect(() => parseInstalledSource261(JSON.stringify({...sample, [field]: true}))).toThrow();
    expect(() => parseInstalledSource261(JSON.stringify({...sample, remote_requests: 1}))).toThrow();
    expect(() => parseInstalledSource261(JSON.stringify({...sample,
      checkout_web_source_sha256: "c".repeat(64)}))).toThrow();
    expect(() => parseInstalledSource261(JSON.stringify({...sample,
      web: {...sample.web, template_status: "matched_unattested", executable_path_status: "unavailable"}}))).toThrow();
    expect(JSON.stringify(parseInstalledSource261(JSON.stringify({...sample,
      raw_command_line: "SENSITIVE"})))).not.toContain("SENSITIVE");
    const issuer = {schema: ISSUER_261_SCHEMA, release_sha: release,
      before_sha256: "a".repeat(64), after_sha256: "b".repeat(64), web_checkout_sha256: "c".repeat(64),
      backend_checkout_sha256: "d".repeat(64), mapped_at: "2026-11-07T00:22:00Z",
      expires_at: "2026-11-07T00:35:00Z",
      artifact_scope: "CHECKOUT_ARTIFACTS_AND_LAUNCH_TEMPLATE_CANDIDATE_ONLY", receiver_state: "OFF",
      installed_source_attested: false, original_issuer_public_key_raw_base64: b64(new Uint8Array(32)),
      signature_base64: b64(new Uint8Array(64))};
    expect(() => parseOriginalIssuer261(JSON.stringify({...issuer, receiver_state: "ON"}))).toThrow();
    expect(() => parseOriginalIssuer261(JSON.stringify({...issuer, installed_source_attested: true}))).toThrow();
  });
});
