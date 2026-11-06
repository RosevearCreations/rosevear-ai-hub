export const PROCESS_OBSERVATION_256 = "rosevear-windows-process-observation-256/v1";
export const PROCESS_WITNESS_256 = "rosevear-windows-process-witness-256/v1";

const sha40 = /^[a-f0-9]{40}$/;
const sha64 = /^[a-f0-9]{64}$/;
const b64 = /^[A-Za-z0-9+/]+={0,2}$/;
const listeners = ["observed", "missing", "ambiguous", "process_unavailable"] as const;
const sources = ["within_checkout", "outside_checkout", "unverified"] as const;
const boots = ["after_boot", "before_boot", "unverified"] as const;
const kinds = ["generic_interpreter", "other_executable", "unverified"] as const;
const recovery = ["expected_script_reported", "drift_or_unknown", "unverified"] as const;
type Listener = typeof listeners[number];
type Source = typeof sources[number];
type Boot = typeof boots[number];
type Kind = typeof kinds[number];
type Recovery = typeof recovery[number];

type ObservedProcess = {
  listener: Listener; source_path: Source; post_boot: Boot;
  executable_sha256: string | null; executable_kind: Kind; listener_stable: boolean;
};

export type WindowsProcessObservation256 = {
  schema: typeof PROCESS_OBSERVATION_256;
  source: "on_device_read_only";
  observed_at: string;
  checkout_sha_candidate: string | null;
  web: ObservedProcess;
  backend: ObservedProcess;
  recovery_action: Recovery;
  signed_by_original_issuer: false;
  independent_witness_verified: false;
  installed_release_attested: false;
  process_attested: false;
  comms_connected: false;
  changed_anything: false;
  remote_requests: 0;
};

export type SignedProcessWitness256 = {
  schema: typeof PROCESS_WITNESS_256;
  release_sha: string;
  observed_at: string;
  web_executable_sha256: string;
  backend_executable_sha256: string;
  web_executable_kind: Kind;
  backend_executable_kind: Kind;
  web_listener: Listener;
  backend_listener: Listener;
  web_source_path: Source;
  backend_source_path: Source;
  web_post_boot: Boot;
  backend_post_boot: Boot;
  recovery_action: Recovery;
  witness_public_key_raw_base64: string;
  signature_base64: string;
};

function obj(json: string): Record<string, unknown> {
  if (json.length > 8192) throw new Error("Process evidence exceeds 8 KB.");
  let data: unknown;
  try { data = JSON.parse(json); } catch { throw new Error("Process evidence is not valid JSON."); }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Process evidence must be an object.");
  return data as Record<string, unknown>;
}

function timestamp(input: unknown): input is string {
  if (typeof input !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(input)) return false;
  return Number.isFinite(Date.parse(input)) && new Date(input).toISOString().replace(".000", "") === input;
}

function member<T extends readonly string[]>(values: T, input: unknown): input is T[number] {
  return typeof input === "string" && values.includes(input);
}

function parseProcess(input: unknown): ObservedProcess {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Missing process observation.");
  const x = input as Record<string, unknown>;
  if (!member(listeners, x.listener) || !member(sources, x.source_path) || !member(boots, x.post_boot)
    || !member(kinds, x.executable_kind) || typeof x.listener_stable !== "boolean"
    || (x.executable_sha256 !== null && (typeof x.executable_sha256 !== "string" || !sha64.test(x.executable_sha256)))
    || (x.listener_stable && (x.executable_sha256 === null || x.executable_kind === "unverified"))
    || (!x.listener_stable && (x.executable_sha256 !== null || x.executable_kind !== "unverified")))
    throw new Error("Executable observation is invalid or self-contradictory.");
  return {listener: x.listener, source_path: x.source_path, post_boot: x.post_boot,
    executable_sha256: x.executable_sha256 as string | null, executable_kind: x.executable_kind,
    listener_stable: x.listener_stable};
}

export function parseProcessObservation256(json: string): WindowsProcessObservation256 {
  const x = obj(json);
  if (x.schema !== PROCESS_OBSERVATION_256 || x.source !== "on_device_read_only"
    || !timestamp(x.observed_at) || (x.checkout_sha_candidate !== null && !sha40.test(String(x.checkout_sha_candidate)))
    || !member(recovery, x.recovery_action) || x.signed_by_original_issuer !== false
    || x.independent_witness_verified !== false || x.installed_release_attested !== false
    || x.process_attested !== false || x.comms_connected !== false || x.changed_anything !== false
    || x.remote_requests !== 0) throw new Error("Read-only Windows evidence or HOLD flags are invalid.");
  return {schema: PROCESS_OBSERVATION_256, source: "on_device_read_only",
    observed_at: x.observed_at, checkout_sha_candidate: x.checkout_sha_candidate as string | null,
    web: parseProcess(x.web), backend: parseProcess(x.backend), recovery_action: x.recovery_action,
    signed_by_original_issuer: false, independent_witness_verified: false, installed_release_attested: false,
    process_attested: false, comms_connected: false, changed_anything: false, remote_requests: 0};
}

export function parseProcessWitness256(json: string): SignedProcessWitness256 {
  const x = obj(json);
  if (x.schema !== PROCESS_WITNESS_256 || !sha40.test(String(x.release_sha)) || !timestamp(x.observed_at)
    || !sha64.test(String(x.web_executable_sha256)) || !sha64.test(String(x.backend_executable_sha256))
    || !member(kinds, x.web_executable_kind) || x.web_executable_kind === "unverified"
    || !member(kinds, x.backend_executable_kind) || x.backend_executable_kind === "unverified"
    || !member(listeners, x.web_listener) || !member(listeners, x.backend_listener)
    || !member(sources, x.web_source_path) || !member(sources, x.backend_source_path)
    || !member(boots, x.web_post_boot) || !member(boots, x.backend_post_boot)
    || !member(recovery, x.recovery_action)
    || typeof x.witness_public_key_raw_base64 !== "string" || x.witness_public_key_raw_base64.length !== 44
    || !b64.test(x.witness_public_key_raw_base64)
    || typeof x.signature_base64 !== "string" || x.signature_base64.length !== 88 || !b64.test(x.signature_base64))
    throw new Error("Independent process witness schema or signature is invalid.");
  return {schema: PROCESS_WITNESS_256, release_sha: x.release_sha as string, observed_at: x.observed_at,
    web_executable_sha256: x.web_executable_sha256 as string,
    backend_executable_sha256: x.backend_executable_sha256 as string,
    web_executable_kind: x.web_executable_kind, backend_executable_kind: x.backend_executable_kind,
    web_listener: x.web_listener, backend_listener: x.backend_listener,
    web_source_path: x.web_source_path, backend_source_path: x.backend_source_path,
    web_post_boot: x.web_post_boot, backend_post_boot: x.backend_post_boot,
    recovery_action: x.recovery_action, witness_public_key_raw_base64: x.witness_public_key_raw_base64,
    signature_base64: x.signature_base64};
}

export function canonicalProcessWitness256(x: SignedProcessWitness256): string {
  return [x.schema, x.release_sha, x.observed_at, x.web_executable_sha256, x.backend_executable_sha256,
    x.web_executable_kind, x.backend_executable_kind, x.web_listener, x.backend_listener,
    x.web_source_path, x.backend_source_path, x.web_post_boot, x.backend_post_boot, x.recovery_action, ""].join("\n");
}

function fresh(x: string, now: string): boolean {
  const age = Date.parse(now) - Date.parse(x);
  return Number.isFinite(age) && age >= 0 && age <= 24 * 3600 * 1000;
}

export async function reviewSignedProcess256(observed: WindowsProcessObservation256 | null,
  witness: SignedProcessWitness256 | null, pin: string, originalSignerKey: string | null,
  expectedReleaseSha: string, now: string) {
  let signature_valid = false;
  let pin_matches = false;
  if (witness) try {
    const keyBytes = Uint8Array.from(atob(witness.witness_public_key_raw_base64), ch => ch.charCodeAt(0));
    const signatureBytes = Uint8Array.from(atob(witness.signature_base64), ch => ch.charCodeAt(0));
    if (keyBytes.length === 32 && signatureBytes.length === 64) {
      const fingerprint = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", keyBytes)))
        .map(b => b.toString(16).padStart(2, "0")).join("");
      pin_matches = sha64.test(pin) && fingerprint === pin;
      const key = await crypto.subtle.importKey("raw", keyBytes, "Ed25519", false, ["verify"]);
      signature_valid = await crypto.subtle.verify("Ed25519", key, signatureBytes,
        new TextEncoder().encode(canonicalProcessWitness256(witness)));
    }
  } catch { /* Untrusted key material always fails closed. */ }
  const separate_key = Boolean(witness && originalSignerKey
    && witness.witness_public_key_raw_base64 !== originalSignerKey);
  const release_matches = Boolean(observed && witness && sha40.test(expectedReleaseSha)
    && observed.checkout_sha_candidate === expectedReleaseSha && witness.release_sha === expectedReleaseSha);
  const fresh_evidence = Boolean(observed && witness && fresh(observed.observed_at, now)
    && fresh(witness.observed_at, now));
  const process_matched = Boolean(observed && witness
    && observed.observed_at === witness.observed_at
    && observed.web.executable_sha256 === witness.web_executable_sha256
    && observed.backend.executable_sha256 === witness.backend_executable_sha256
    && observed.web.executable_kind === witness.web_executable_kind
    && observed.backend.executable_kind === witness.backend_executable_kind
    && observed.web.listener === witness.web_listener && observed.backend.listener === witness.backend_listener
    && observed.web.source_path === witness.web_source_path && observed.backend.source_path === witness.backend_source_path
    && observed.web.post_boot === witness.web_post_boot && observed.backend.post_boot === witness.backend_post_boot
    && observed.recovery_action === witness.recovery_action && observed.web.listener_stable
    && observed.backend.listener_stable && observed.web.listener === "observed"
    && observed.backend.listener === "observed" && observed.web.source_path === "within_checkout"
    && observed.backend.source_path === "within_checkout" && observed.web.post_boot === "after_boot"
    && observed.backend.post_boot === "after_boot" && observed.recovery_action === "expected_script_reported");
  const candidate = signature_valid && pin_matches && separate_key && release_matches && fresh_evidence && process_matched;
  return {state: candidate ? "SIGNED_PROCESS_EXECUTABLE_CANDIDATE_ONLY" as const : "PROCESS_EVIDENCE_HOLD" as const,
    signature_valid, pin_matches, separate_key, release_matches, fresh_evidence, process_matched,
    installed_release_attested: false as const, process_attested: false as const,
    receiver_activated: false as const, comms_connected: false as const, remote_requests: 0 as const,
    decision: "COMMS_TEST_RECEIVER_HOLD" as const,
    findings: [
      "Executable hashes of Node/Python or another host process do not attest loaded Hub source or installed release.",
      "Independent original-issuer custody and owner-observed process-to-release attestation are still required.",
      "Comms TEST remains disconnected until a separately signed receiver-OFF attestation, both owner decisions, pinned TLS identity, scoped enrollment and witnessed bounded TEST approval exist.",
    ]};
}
