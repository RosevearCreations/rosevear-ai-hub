import {verifyPinnedEd25519Signature258} from "./processIdentity258";

export const LAUNCH_OBSERVATION_263 = "rosevear-windows-original-launcher-custody-263/v1";
export const SIGNED_RUNTIME_263 = "rosevear-windows-signed-post-restart-263/v1";
const sha40 = /^[a-f0-9]{40}$/;
const sha64 = /^[a-f0-9]{64}$/;
const b64 = /^[A-Za-z0-9+/]+={0,2}$/;
const validTime = (value: unknown): value is string => typeof value === "string"
  && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)
  && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString() === value.replace("Z", ".000Z");

function record(source: string, limit = 16000): Record<string, unknown> {
  if (source.length > limit) throw new Error("Evidence exceeds its size limit.");
  let data: unknown;
  try {data = JSON.parse(source);} catch {throw new Error("Evidence must be valid JSON.");}
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Evidence must be an object.");
  return data as Record<string, unknown>;
}

export type Launcher263 = {
  listener: "observed" | "missing" | "ambiguous_or_exposed" | "unverified";
  kind: "node" | "python"; executable_readable: boolean; command_line_readable: boolean;
  template_match: boolean; checkout_reference_observed: boolean; stable_listener: boolean;
  process_started_utc: string | null; launch_binding_sha256: string | null;
};
export type LauncherObservation263 = {
  schema: typeof LAUNCH_OBSERVATION_263; source: "on_device_read_only";
  stage: "before" | "after"; observed_at: string; release_sha_candidate: string;
  recovery_mode: "Legacy" | "Managed" | "Hold"; expected_recovery_action_matches: boolean;
  web: Launcher263; backend: Launcher263;
  original_launcher_custody_attested: false; supervised_restart_attested: false;
  independently_signed_runtime_accepted: false; test_authorized: false;
  challenge_executed: false; receiver_activated: false; comms_connected: false;
  changed_anything: false; remote_requests: 0;
};

function parseLauncher(value: unknown, kind: "node" | "python"): Launcher263 {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Missing local launcher.");
  const x = value as Record<string,unknown>;
  if (!["observed","missing","ambiguous_or_exposed","unverified"].includes(String(x.listener))
    || x.kind !== kind || typeof x.executable_readable !== "boolean"
    || typeof x.command_line_readable !== "boolean" || typeof x.template_match !== "boolean"
    || typeof x.checkout_reference_observed !== "boolean" || typeof x.stable_listener !== "boolean"
    || (x.process_started_utc !== null && !validTime(x.process_started_utc))
    || (x.launch_binding_sha256 !== null && !(typeof x.launch_binding_sha256 === "string" && sha64.test(x.launch_binding_sha256)))
    || (x.template_match && (!x.executable_readable || !x.command_line_readable || !x.stable_listener
      || x.listener !== "observed" || x.launch_binding_sha256 === null))
    || (x.launch_binding_sha256 !== null && (!x.template_match || x.process_started_utc === null)))
    throw new Error("Contradictory local launch command observation.");
  return {listener: x.listener as Launcher263["listener"], kind,
    executable_readable: x.executable_readable as boolean, command_line_readable: x.command_line_readable as boolean,
    template_match: x.template_match as boolean,
    checkout_reference_observed: x.checkout_reference_observed as boolean,
    stable_listener: x.stable_listener as boolean,
    process_started_utc: x.process_started_utc as string | null,
    launch_binding_sha256: x.launch_binding_sha256 as string | null};
}

export function parseLauncherObservation263(source: string): LauncherObservation263 {
  const x = record(source);
  if (x.schema !== LAUNCH_OBSERVATION_263 || x.source !== "on_device_read_only"
    || !["before","after"].includes(String(x.stage)) || !validTime(x.observed_at)
    || typeof x.release_sha_candidate !== "string" || !sha40.test(x.release_sha_candidate)
    || !["Legacy","Managed","Hold"].includes(String(x.recovery_mode))
    || typeof x.expected_recovery_action_matches !== "boolean"
    || x.original_launcher_custody_attested !== false || x.supervised_restart_attested !== false
    || x.independently_signed_runtime_accepted !== false || x.test_authorized !== false
    || x.challenge_executed !== false || x.receiver_activated !== false || x.comms_connected !== false
    || x.changed_anything !== false || x.remote_requests !== 0)
    throw new Error("Invalid local Windows custody report or a claim of unauthorized activation.");
  return {schema: LAUNCH_OBSERVATION_263, source: "on_device_read_only",
    stage: x.stage as "before" | "after", observed_at: x.observed_at,
    release_sha_candidate: x.release_sha_candidate,
    recovery_mode: x.recovery_mode as LauncherObservation263["recovery_mode"],
    expected_recovery_action_matches: x.expected_recovery_action_matches,
    web: parseLauncher(x.web, "node"), backend: parseLauncher(x.backend, "python"),
    original_launcher_custody_attested: false, supervised_restart_attested: false,
    independently_signed_runtime_accepted: false, test_authorized: false,
    challenge_executed: false, receiver_activated: false, comms_connected: false,
    changed_anything: false, remote_requests: 0};
}

const launcherFields = (x: Launcher263) => [x.listener, x.kind, String(x.executable_readable),
  String(x.command_line_readable), String(x.template_match), String(x.checkout_reference_observed),
  String(x.stable_listener), x.process_started_utc ?? "", x.launch_binding_sha256 ?? ""].join("|");
export const canonicalLauncher263 = (x: LauncherObservation263) => [x.schema, x.source, x.stage,
  x.observed_at, x.release_sha_candidate, x.recovery_mode,
  String(x.expected_recovery_action_matches), launcherFields(x.web), launcherFields(x.backend),
  "false", "false", "false", "false", "false", "false", "false", "false", "0", ""].join("\n");
export async function digestLauncher263(x: LauncherObservation263) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalLauncher263(x)));
  return Array.from(new Uint8Array(hash)).map(c => c.toString(16).padStart(2,"0")).join("");
}

export type SignedRole263 = {public_key_raw_base64: string; signature_base64: string};
export type SignedRuntime263 = {
  schema: typeof SIGNED_RUNTIME_263; release_sha: string; before_sha256: string; after_sha256: string;
  after_web_binding_sha256: string; after_backend_binding_sha256: string;
  signed_at: string; expires_at: string;
  scope: "LOCAL_SUPERVISED_RESTART_REVIEW_ONLY"; receiver_state: "OFF";
  issuer: SignedRole263; owner: SignedRole263; independent_witness: SignedRole263;
};
function role(v: unknown): SignedRole263 {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("Missing signed role.");
  const x = v as Record<string,unknown>;
  if (typeof x.public_key_raw_base64 !== "string" || x.public_key_raw_base64.length !== 44
    || !b64.test(x.public_key_raw_base64) || typeof x.signature_base64 !== "string"
    || x.signature_base64.length !== 88 || !b64.test(x.signature_base64))
    throw new Error("Invalid detached Ed25519 signature fields.");
  return {public_key_raw_base64: x.public_key_raw_base64, signature_base64: x.signature_base64};
}
export function parseSignedRuntime263(source: string): SignedRuntime263 {
  const x = record(source, 6000);
  if (x.schema !== SIGNED_RUNTIME_263 || typeof x.release_sha !== "string" || !sha40.test(x.release_sha)
    || [x.before_sha256,x.after_sha256,x.after_web_binding_sha256,x.after_backend_binding_sha256]
      .some(v => typeof v !== "string" || !sha64.test(v))
    || !validTime(x.signed_at) || !validTime(x.expires_at)
    || x.scope !== "LOCAL_SUPERVISED_RESTART_REVIEW_ONLY" || x.receiver_state !== "OFF")
    throw new Error("Invalid signed local restart receipt scope or hashes.");
  return {schema: SIGNED_RUNTIME_263, release_sha: x.release_sha,
    before_sha256: x.before_sha256 as string, after_sha256: x.after_sha256 as string,
    after_web_binding_sha256: x.after_web_binding_sha256 as string,
    after_backend_binding_sha256: x.after_backend_binding_sha256 as string,
    signed_at: x.signed_at, expires_at: x.expires_at,
    scope: "LOCAL_SUPERVISED_RESTART_REVIEW_ONLY", receiver_state: "OFF",
    issuer: role(x.issuer), owner: role(x.owner), independent_witness: role(x.independent_witness)};
}
export type Role263 = "issuer" | "owner" | "independent_witness";
export const canonicalSignedRuntime263 = (x: SignedRuntime263, signer: Role263) => [x.schema,
  x.release_sha, x.before_sha256, x.after_sha256,
  x.after_web_binding_sha256, x.after_backend_binding_sha256,
  x.signed_at, x.expires_at, x.scope, x.receiver_state, signer, ""].join("\n");

export async function reviewLauncherAcceptance263(before: LauncherObservation263 | null,
  after: LauncherObservation263 | null, signed: SignedRuntime263 | null,
  trustedIssuerKey: string | null, pins: {issuer: string; owner: string; independent_witness: string},
  expectedRelease: string, now: string) {
  const oldHash = before ? await digestLauncher263(before) : null;
  const newHash = after ? await digestLauncher263(after) : null;
  const exactRelease = Boolean(sha40.test(expectedRelease) && before && after && signed
    && before.release_sha_candidate === expectedRelease && after.release_sha_candidate === expectedRelease
    && signed.release_sha === expectedRelease && signed.before_sha256 === oldHash
    && signed.after_sha256 === newHash);
  const afterStarted = Boolean(before && after && Date.parse(after.observed_at) > Date.parse(before.observed_at)
    && [after.web,after.backend].every(p => p.template_match && p.checkout_reference_observed
      && p.stable_listener && p.launch_binding_sha256 && p.process_started_utc
      && Date.parse(p.process_started_utc) > Date.parse(before.observed_at)
      && Date.parse(p.process_started_utc) <= Date.parse(after.observed_at))
    && [before.web,before.backend].every(p => !p.process_started_utc
      || Date.parse(p.process_started_utc) <= Date.parse(before.observed_at))
    && before.web.launch_binding_sha256 !== after.web.launch_binding_sha256
    && before.backend.launch_binding_sha256 !== after.backend.launch_binding_sha256
    && before.recovery_mode === after.recovery_mode && before.recovery_mode !== "Hold"
    && before.expected_recovery_action_matches && after.expected_recovery_action_matches);
  const binds = Boolean(signed && after && signed.after_web_binding_sha256 === after.web.launch_binding_sha256
    && signed.after_backend_binding_sha256 === after.backend.launch_binding_sha256);
  const timeMs = Date.parse(now), signedMs = Date.parse(signed?.signed_at ?? ""),
    expiresMs = Date.parse(signed?.expires_at ?? "");
  const fresh = Boolean(signed && after && Number.isFinite(timeMs) && signedMs >= Date.parse(after.observed_at)
    && signedMs - Date.parse(after.observed_at) <= 15 * 60000 && timeMs >= signedMs
    && expiresMs > signedMs && expiresMs - signedMs <= 60 * 60000 && timeMs <= expiresMs);
  const distinct = Boolean(signed && trustedIssuerKey && signed.issuer.public_key_raw_base64 === trustedIssuerKey
    && new Set([signed.issuer.public_key_raw_base64, signed.owner.public_key_raw_base64,
      signed.independent_witness.public_key_raw_base64]).size === 3
    && Object.values(pins).every(x => sha64.test(x))
    && new Set(Object.values(pins)).size === 3);
  const signatures = {issuer: false, owner: false, independent_witness: false};
  if (signed && distinct && fresh && exactRelease && binds && afterStarted) {
    for (const signer of ["issuer","owner","independent_witness"] as const) {
      signatures[signer] = await verifyPinnedEd25519Signature258(
        signed[signer].public_key_raw_base64, signed[signer].signature_base64,
        canonicalSignedRuntime263(signed, signer), pins[signer]);
    }
  }
  const signedCandidate = Boolean(exactRelease && afterStarted && binds && fresh && distinct
    && Object.values(signatures).every(Boolean));
  return {
    state: signedCandidate ? "SIGNED_POST_RESTART_RECEIPT_CANDIDATE_TEST_HOLD" as const
      : "ORIGINAL_WINDOWS_LAUNCHER_OR_SIGNED_RUNTIME_HOLD" as const,
    exactRelease, afterStarted, binds, fresh, distinct, signatures, signedCandidate,
    beforeDigest: oldHash, afterDigest: newHash,
    original_issuer_independently_authenticated: false as const,
    installed_runtime_authoritatively_attested: false as const,
    independently_witnessed_restart_accepted: false as const,
    test_authorized: false as const, challenge_executed: false as const,
    receiver_activated: false as const, comms_connected: false as const,
    remote_requests: 0 as const,
    findings: [
      "Matching local launch commands and distinct signed fingerprints are candidates, not proof of original custody or device identity.",
      "Issuer, owner and witness fingerprints require independent out-of-band authentication; a form entry alone cannot establish identity.",
      "Restart/installed-release acceptance requires original operator and independent witness review outside this browser.",
      "Comms TEST requires a separate scoped original-owner authorization and authenticated private receiver; receiver remains OFF.",
    ],
  };
}
