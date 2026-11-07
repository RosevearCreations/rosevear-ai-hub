import {describe, expect, it} from "vitest";
import {LAUNCH_OBSERVATION_263, SIGNED_RUNTIME_263, parseLauncherObservation263,
  parseSignedRuntime263, canonicalSignedRuntime263, digestLauncher263,
  reviewLauncherAcceptance263, type LauncherObservation263, type SignedRuntime263,
  type Role263} from "./launcherAcceptance263";

const sha = "a".repeat(40);
const hex = (bytes: Uint8Array) => [...bytes].map(v => v.toString(16).padStart(2,"0")).join("");
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
function observation(stage: "before" | "after"): LauncherObservation263 {
  const later = stage === "after";
  const launch = (kind: "node" | "python") => ({
    listener: "observed" as const, kind, executable_readable: true, command_line_readable: true,
    template_match: true, checkout_reference_observed: true, stable_listener: true,
    process_started_utc: later ? "2026-11-07T03:05:00Z" : "2026-11-06T17:00:00Z",
    launch_binding_sha256: (later ? kind === "node" ? "c" : "d" : kind === "node" ? "e" : "f").repeat(64),
  });
  return {schema: LAUNCH_OBSERVATION_263, source: "on_device_read_only", stage,
    observed_at: later ? "2026-11-07T03:10:00Z" : "2026-11-07T03:00:00Z",
    release_sha_candidate: sha, recovery_mode: "Legacy", expected_recovery_action_matches: true,
    web: launch("node"), backend: launch("python"),
    original_launcher_custody_attested: false, supervised_restart_attested: false,
    independently_signed_runtime_accepted: false, test_authorized: false,
    challenge_executed: false, receiver_activated: false, comms_connected: false,
    changed_anything: false, remote_requests: 0};
}
async function key() {
  const pair = await crypto.subtle.generateKey("Ed25519", true, ["sign","verify"]);
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const pin = hex(new Uint8Array(await crypto.subtle.digest("SHA-256", raw)));
  return {pair, publicKey: b64(raw), pin};
}
async function fixture() {
  const before = observation("before"), after = observation("after");
  const keys = {issuer: await key(), owner: await key(), independent_witness: await key()};
  const receipt: SignedRuntime263 = {schema: SIGNED_RUNTIME_263, release_sha: sha,
    before_sha256: await digestLauncher263(before), after_sha256: await digestLauncher263(after),
    after_web_binding_sha256: after.web.launch_binding_sha256!,
    after_backend_binding_sha256: after.backend.launch_binding_sha256!,
    signed_at: "2026-11-07T03:12:00Z", expires_at: "2026-11-07T03:40:00Z",
    scope: "LOCAL_SUPERVISED_RESTART_REVIEW_ONLY", receiver_state: "OFF",
    issuer: {public_key_raw_base64: keys.issuer.publicKey, signature_base64: ""},
    owner: {public_key_raw_base64: keys.owner.publicKey, signature_base64: ""},
    independent_witness: {public_key_raw_base64: keys.independent_witness.publicKey, signature_base64: ""}};
  for (const role of ["issuer","owner","independent_witness"] as Role263[]) {
    const signed = await crypto.subtle.sign("Ed25519", keys[role].pair.privateKey,
      new TextEncoder().encode(canonicalSignedRuntime263(receipt, role)));
    receipt[role].signature_base64 = b64(new Uint8Array(signed));
  }
  const pins = {issuer: keys.issuer.pin, owner: keys.owner.pin,
    independent_witness: keys.independent_witness.pin};
  return {before,after,receipt,keys,pins};
}

describe("Build 263 signed post-restart acceptance", () => {
  it("recognizes exact three-party signature mathematics but never authorizes Comms", async () => {
    const x = await fixture();
    const before = parseLauncherObservation263(JSON.stringify(x.before));
    const after = parseLauncherObservation263(JSON.stringify(x.after));
    const receipt = parseSignedRuntime263(JSON.stringify(x.receipt));
    const result = await reviewLauncherAcceptance263(before,after,receipt,
      x.keys.issuer.publicKey,x.pins,sha,"2026-11-07T03:15:00Z");
    expect(result.signedCandidate).toBe(true);
    expect(result.state).toBe("SIGNED_POST_RESTART_RECEIPT_CANDIDATE_TEST_HOLD");
    expect(Object.values(result.signatures).every(Boolean)).toBe(true);
    expect(result.installed_runtime_authoritatively_attested).toBe(false);
    expect(result.independently_witnessed_restart_accepted).toBe(false);
    expect(result.test_authorized).toBe(false);
    expect(result.receiver_activated).toBe(false);
    expect(result.comms_connected).toBe(false);
    expect(result.remote_requests).toBe(0);
  });
  it("rejects tampering, expiry, role cloning, wrong original key, and unproven fresh runtime", async () => {
    const x = await fixture();
    const run = (after = x.after, receipt = x.receipt, original = x.keys.issuer.publicKey,
      now = "2026-11-07T03:15:00Z") => reviewLauncherAcceptance263(x.before,after,receipt,original,x.pins,sha,now);
    expect((await run(x.after,{...x.receipt, after_web_binding_sha256: "b".repeat(64)})).signedCandidate).toBe(false);
    expect((await run(x.after,x.receipt,x.keys.owner.publicKey)).signedCandidate).toBe(false);
    expect((await run(x.after,x.receipt,x.keys.issuer.publicKey,"2026-11-07T04:00:00Z")).signedCandidate).toBe(false);
    expect((await run({...x.after,web:{...x.after.web,checkout_reference_observed:false}})).signedCandidate).toBe(false);
    expect((await run({...x.after,web:{...x.after.web,process_started_utc:"2026-11-06T17:00:00Z"}})).signedCandidate).toBe(false);
    const duplicated = {...x.receipt, owner: {...x.receipt.issuer}};
    expect((await run(x.after,duplicated)).signedCandidate).toBe(false);
  });
  it("parses access-restricted observations without inventing launcher custody", async () => {
    const before = observation("before");
    const restricted = {...before, web:{...before.web, executable_readable:false,
      command_line_readable:false,template_match:false,process_started_utc:null,
      launch_binding_sha256:null}};
    expect(parseLauncherObservation263(JSON.stringify(restricted)).web.template_match).toBe(false);
    for (const field of ["original_launcher_custody_attested","supervised_restart_attested",
      "independently_signed_runtime_accepted","test_authorized","challenge_executed",
      "receiver_activated","comms_connected","changed_anything"])
      expect(() => parseLauncherObservation263(JSON.stringify({...before,[field]:true}))).toThrow();
    expect(() => parseLauncherObservation263(JSON.stringify({...before,remote_requests:1}))).toThrow();
    expect(() => parseLauncherObservation263(JSON.stringify({...before,
      web:{...before.web,template_match:true,command_line_readable:false}}))).toThrow();
    const x = await fixture();
    expect(() => parseSignedRuntime263(JSON.stringify({...x.receipt,receiver_state:"ON"}))).toThrow();
    expect(() => parseSignedRuntime263(JSON.stringify({...x.receipt,scope:"COMMS_TEST"}))).toThrow();
  });
});
