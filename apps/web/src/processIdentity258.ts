export const IDENTITY_258_SCHEMA = "rosevear-windows-installed-identity-258/v1";
export const ISSUER_258_SCHEMA = "rosevear-windows-original-issuer-receipt-258/v1";
export const RECEIVER_OFF_258_SCHEMA = "rosevear-windows-independent-receiver-off-258/v1";

const sha40 = /^[a-f0-9]{40}$/;
const sha64 = /^[a-f0-9]{64}$/;
const b64 = /^[A-Za-z0-9+/]+={0,2}$/;
const listenerStates = ["observed", "missing", "ambiguous", "process_unavailable", "probe_failed", "changed_during_observation"] as const;
const processKinds = ["node", "python", "other", "unavailable"] as const;
const pathStates = ["not_checked", "access_restricted_or_unavailable", "readable", "hash_unavailable"] as const;
const hints = ["unavailable", "no_checkout_reference_observed", "checkout_path_in_listener_command", "checkout_path_in_ancestor_command"] as const;
const taskStates = ["enabled", "disabled", "missing", "missing_or_unavailable", "unknown"] as const;
const actions = ["expected_script_reported", "drift_or_unknown", "unverified"] as const;

type Listener = typeof listenerStates[number];
type Kind = typeof processKinds[number];
type PathState = typeof pathStates[number];
type Hint = typeof hints[number];
type TaskState = typeof taskStates[number];
type Action = typeof actions[number];

export type ProcessIdentity258 = {
  listener: Listener; process_kind: Kind; executable_path_status: PathState;
  executable_sha256: string | null; source_hint: Hint; parent_hops_inspected: number;
  listener_stable: boolean; process_started_utc: string | null; checkout_source_sha256: string | null;
};

export type InstalledIdentity258 = {
  schema: typeof IDENTITY_258_SCHEMA; source: "on_device_read_only"; observed_at: string;
  checkout_sha_candidate: string | null; web: ProcessIdentity258; backend: ProcessIdentity258;
  recovery_action: Action; recovery_task_state: TaskState; startup_task_state: TaskState;
  original_issuer_signature_verified: false; receiver_off_signature_verified: false;
  installed_release_attested: false; process_attested: false; receiver_activated: false;
  comms_connected: false; changed_anything: false; remote_requests: 0;
};

export type IssuerReceipt258 = {
  schema: typeof ISSUER_258_SCHEMA; release_sha: string; observed_at: string;
  observation_sha256: string; issuer_public_key_raw_base64: string; signature_base64: string;
};

export type ReceiverOff258 = {
  schema: typeof RECEIVER_OFF_258_SCHEMA; release_sha: string; observed_at: string;
  observation_sha256: string; receiver_port_listening: false; receiver_activated: false;
  owner_decision: "HOLD"; network_requests: 0;
  independent_public_key_raw_base64: string; signature_base64: string;
};

function record(text: string): Record<string, unknown> {
  if (text.length > 8192) throw new Error("Build 258 evidence exceeds 8 KB.");
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error("Invalid Build 258 JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Build 258 evidence must be an object.");
  return value as Record<string, unknown>;
}

function time(t: unknown): t is string {
  return typeof t === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(t)
    && Number.isFinite(Date.parse(t)) && new Date(t).toISOString() === t.replace("Z", ".000Z");
}

function oneOf<T extends readonly string[]>(choices: T, value: unknown): value is T[number] {
  return typeof value === "string" && choices.includes(value);
}

function process(p: unknown): ProcessIdentity258 {
  if (!p || typeof p !== "object" || Array.isArray(p)) throw new Error("Missing process identity.");
  const x = p as Record<string, unknown>;
  if (!oneOf(listenerStates, x.listener) || !oneOf(processKinds, x.process_kind)
    || !oneOf(pathStates, x.executable_path_status) || !oneOf(hints, x.source_hint)
    || !Number.isInteger(x.parent_hops_inspected) || (x.parent_hops_inspected as number) < 0
    || (x.parent_hops_inspected as number) > 4 || typeof x.listener_stable !== "boolean"
    || (x.process_started_utc !== null && !time(x.process_started_utc))
    || (x.checkout_source_sha256 !== null && !sha64.test(String(x.checkout_source_sha256)))
    || (x.executable_sha256 !== null && !sha64.test(String(x.executable_sha256)))
    || (x.executable_path_status === "readable") !== Boolean(x.executable_sha256)
    || (x.listener_stable !== (x.listener === "observed"))
    || (x.listener === "observed" && x.process_kind === "unavailable"))
    throw new Error("Contradictory or invalid Windows process identity.");
  return {listener: x.listener, process_kind: x.process_kind, executable_path_status: x.executable_path_status,
    executable_sha256: x.executable_sha256 as string | null, source_hint: x.source_hint,
    parent_hops_inspected: x.parent_hops_inspected as number, listener_stable: x.listener_stable,
    process_started_utc: x.process_started_utc as string | null,
    checkout_source_sha256: x.checkout_source_sha256 as string | null};
}

export function parseIdentity258(text: string): InstalledIdentity258 {
  const x = record(text);
  if (x.schema !== IDENTITY_258_SCHEMA || x.source !== "on_device_read_only" || !time(x.observed_at)
    || (x.checkout_sha_candidate !== null && !sha40.test(String(x.checkout_sha_candidate)))
    || !oneOf(actions, x.recovery_action) || !oneOf(taskStates, x.recovery_task_state)
    || !oneOf(taskStates, x.startup_task_state)
    || x.original_issuer_signature_verified !== false || x.receiver_off_signature_verified !== false
    || x.installed_release_attested !== false || x.process_attested !== false
    || x.receiver_activated !== false || x.comms_connected !== false
    || x.changed_anything !== false || x.remote_requests !== 0)
    throw new Error("Build 258 observation or immutable HOLD flags are invalid.");
  return {schema: IDENTITY_258_SCHEMA, source: "on_device_read_only", observed_at: x.observed_at,
    checkout_sha_candidate: x.checkout_sha_candidate as string | null,
    web: process(x.web), backend: process(x.backend), recovery_action: x.recovery_action,
    recovery_task_state: x.recovery_task_state, startup_task_state: x.startup_task_state,
    original_issuer_signature_verified: false, receiver_off_signature_verified: false,
    installed_release_attested: false, process_attested: false,
    receiver_activated: false, comms_connected: false, changed_anything: false, remote_requests: 0};
}

function signedFields(x: Record<string, unknown>, key: string) {
  return typeof x[key] === "string" && (x[key] as string).length === 44 && b64.test(x[key] as string)
    && typeof x.signature_base64 === "string" && x.signature_base64.length === 88 && b64.test(x.signature_base64);
}

export function parseIssuer258(text: string): IssuerReceipt258 {
  const x = record(text);
  if (x.schema !== ISSUER_258_SCHEMA || !sha40.test(String(x.release_sha))
    || !time(x.observed_at) || !sha64.test(String(x.observation_sha256))
    || !signedFields(x, "issuer_public_key_raw_base64")) throw new Error("Invalid original-issuer Build 258 receipt.");
  return {schema: ISSUER_258_SCHEMA, release_sha: x.release_sha as string,
    observed_at: x.observed_at, observation_sha256: x.observation_sha256 as string,
    issuer_public_key_raw_base64: x.issuer_public_key_raw_base64 as string, signature_base64: x.signature_base64 as string};
}

export function parseReceiverOff258(text: string): ReceiverOff258 {
  const x = record(text);
  if (x.schema !== RECEIVER_OFF_258_SCHEMA || !sha40.test(String(x.release_sha))
    || !time(x.observed_at) || !sha64.test(String(x.observation_sha256))
    || x.receiver_port_listening !== false || x.receiver_activated !== false
    || x.owner_decision !== "HOLD" || x.network_requests !== 0
    || !signedFields(x, "independent_public_key_raw_base64"))
    throw new Error("Invalid independent receiver-OFF Build 258 receipt.");
  return {schema: RECEIVER_OFF_258_SCHEMA, release_sha: x.release_sha as string,
    observed_at: x.observed_at, observation_sha256: x.observation_sha256 as string,
    receiver_port_listening: false, receiver_activated: false, owner_decision: "HOLD", network_requests: 0,
    independent_public_key_raw_base64: x.independent_public_key_raw_base64 as string,
    signature_base64: x.signature_base64 as string};
}

export function canonicalIdentity258(x: InstalledIdentity258) {
  const p = (v: ProcessIdentity258) => [v.listener, v.process_kind, v.executable_path_status,
    v.executable_sha256 ?? "", v.source_hint, String(v.parent_hops_inspected),
    String(v.listener_stable), v.process_started_utc ?? "", v.checkout_source_sha256 ?? ""];
  return [x.schema, x.source, x.observed_at, x.checkout_sha_candidate ?? "", ...p(x.web), ...p(x.backend),
    x.recovery_action, x.recovery_task_state, x.startup_task_state, "false", "false", "false", "false",
    "false", "false", "false", "0", ""].join("\n");
}

export const canonicalIssuer258 = (x: IssuerReceipt258) =>
  [x.schema, x.release_sha, x.observed_at, x.observation_sha256, ""].join("\n");
export const canonicalReceiverOff258 = (x: ReceiverOff258) =>
  [x.schema, x.release_sha, x.observed_at, x.observation_sha256, "false", "false", "HOLD", "0", ""].join("\n");

async function sha256(data: Uint8Array) {
  const owned = new Uint8Array(new ArrayBuffer(data.byteLength));
  owned.set(data);
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", owned.buffer));
  return Array.from(bytes).map(c => c.toString(16).padStart(2, "0")).join("");
}
export const digestIdentity258 = (x: InstalledIdentity258) =>
  sha256(new TextEncoder().encode(canonicalIdentity258(x)));

async function verifySignature(key64: string, signature64: string, canonical: string, pinnedHash: string) {
  try {
    const keyData = Uint8Array.from(atob(key64), c => c.charCodeAt(0));
    const signature = Uint8Array.from(atob(signature64), c => c.charCodeAt(0));
    if (keyData.length !== 32 || signature.length !== 64 || !sha64.test(pinnedHash)
      || await sha256(keyData) !== pinnedHash) return false;
    const key = await crypto.subtle.importKey("raw", keyData, "Ed25519", false, ["verify"]);
    return crypto.subtle.verify("Ed25519", key, signature, new TextEncoder().encode(canonical));
  } catch { return false; }
}

const fresh = (stamp: string, now: string) => {
  const age = Date.parse(now) - Date.parse(stamp);
  return Number.isFinite(age) && age >= 0 && age <= 24 * 60 * 60 * 1000;
};

export async function reviewIdentity258(observation: InstalledIdentity258 | null,
  issuer: IssuerReceipt258 | null, receiver: ReceiverOff258 | null,
  trustedOriginalPublicKey: string | null, independentReceiverPin: string,
  expectedRelease: string, now: string) {
  const digest = observation ? await digestIdentity258(observation) : null;
  const exactRelease = Boolean(observation && issuer && receiver && sha40.test(expectedRelease)
    && observation.checkout_sha_candidate === expectedRelease && issuer.release_sha === expectedRelease
    && receiver.release_sha === expectedRelease);
  const exactObservation = Boolean(observation && issuer && receiver && digest
    && issuer.observation_sha256 === digest && receiver.observation_sha256 === digest
    && issuer.observed_at === observation.observed_at);
  const freshness = Boolean(observation && issuer && receiver && fresh(observation.observed_at, now)
    && fresh(issuer.observed_at, now) && fresh(receiver.observed_at, now));
  const issuerKeyMatched = Boolean(issuer && trustedOriginalPublicKey
    && issuer.issuer_public_key_raw_base64 === trustedOriginalPublicKey);
  const independent = Boolean(receiver && trustedOriginalPublicKey
    && receiver.independent_public_key_raw_base64 !== trustedOriginalPublicKey);
  let issuerPin = "";
  if (issuerKeyMatched && trustedOriginalPublicKey) try {
    issuerPin = await sha256(Uint8Array.from(atob(trustedOriginalPublicKey), c => c.charCodeAt(0)));
  } catch { /* No authenticated key. */ }
  const issuerSignature = Boolean(issuer && issuerKeyMatched && await verifySignature(
    issuer.issuer_public_key_raw_base64, issuer.signature_base64, canonicalIssuer258(issuer), issuerPin));
  const receiverSignature = Boolean(receiver && independent && await verifySignature(
    receiver.independent_public_key_raw_base64, receiver.signature_base64,
    canonicalReceiverOff258(receiver), independentReceiverPin));
  const issuerReceiptAccepted = exactRelease && exactObservation && freshness && issuerSignature;
  const receiverOffReceiptAccepted = exactRelease && exactObservation && freshness && receiverSignature;
  const listenerEvidence = Boolean(observation && observation.web.listener === "observed"
    && observation.backend.listener === "observed" && observation.web.listener_stable && observation.backend.listener_stable);
  const executableEvidence = Boolean(observation && observation.web.executable_path_status === "readable"
    && observation.backend.executable_path_status === "readable");
  return {
    state: issuerReceiptAccepted && receiverOffReceiptAccepted
      ? "SIGNED_OBSERVATION_RECEIPTS_ACCEPTED_OWNER_REVIEW_ONLY" as const : "WINDOWS_IDENTITY_258_HOLD" as const,
    exactRelease, exactObservation, freshness, issuerSignature, receiverSignature,
    issuerReceiptAccepted, receiverOffReceiptAccepted, independent, listenerEvidence, executableEvidence,
    observationDigest: digest, process_attested: false as const, installed_release_attested: false as const,
    receiver_activated: false as const, comms_connected: false as const, can_request_test: false as const,
    remote_requests: 0 as const, decision: "CONTROLLED_TEST_PREFLIGHT_HOLD" as const,
    findings: ["An authenticated signature attests an observation, not the loaded source of a generic interpreter.",
      "A missing executable path is an access limitation, not proof that a listener is stopped.",
      "An enabled recovery task does not override a disabled startup task; neither task is changed.",
      "TEST requires independently authenticated owner decisions, approved enrollment and a separately witnessed challenge."],
  };
}
