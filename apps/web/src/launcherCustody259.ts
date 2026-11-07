import {parseIdentity258, canonicalIdentity258, verifyPinnedEd25519Signature258,
  type InstalledIdentity258} from "./processIdentity258";

export const LAUNCHER_259_SCHEMA = "rosevear-windows-launcher-custody-259/v1";
export const ISSUER_259_SCHEMA = "rosevear-windows-original-launcher-receipt-259/v1";
export const CHALLENGE_259_SCHEMA = "rosevear-windows-independent-test-challenge-259/v1";

const sha40 = /^[a-f0-9]{40}$/;
const sha64 = /^[a-f0-9]{64}$/;
const hex32 = /^[a-f0-9]{32}$/;
const b64 = /^[A-Za-z0-9+/]+={0,2}$/;
const kinds = ["powershell", "cmd", "node", "python", "explorer", "other"] as const;
const states = ["unavailable", "listener_changed_or_ambiguous", "process_unavailable", "partial_or_complete", "probe_failed"] as const;
const launchSources = ["unknown", "recovery_script_mention_unverified"] as const;
type Kind = typeof kinds[number];
type ChainState = typeof states[number];
type LaunchSource = typeof launchSources[number];

export type LauncherObservation259 = {
  listener: InstalledIdentity258["web"]["listener"];
  ancestor_kinds: Kind[]; recovery_script_mentioned: boolean; chain_hops_inspected: number;
  chain_status: ChainState; process_predates_checkout_commit: boolean | null; launch_source: LaunchSource;
};
export type LauncherCustody259 = {
  schema: typeof LAUNCHER_259_SCHEMA; source: "on_device_read_only"; observed_at: string;
  checkout_sha_candidate: string | null; checkout_commit_utc: string | null;
  identity_258: InstalledIdentity258; web_launcher: LauncherObservation259; backend_launcher: LauncherObservation259;
  recovery_task_state: InstalledIdentity258["recovery_task_state"];
  recovery_action: InstalledIdentity258["recovery_action"];
  startup_task_state: InstalledIdentity258["startup_task_state"];
  supervised_restart_state: "HOLD_PENDING_ORIGINAL_LAUNCHER_CUSTODY";
  original_issuer_signature_verified: false; independent_challenge_signature_verified: false;
  installed_release_attested: false; process_attested: false; restart_authorized: false;
  challenge_executed: false; test_authorized: false; receiver_activated: false;
  comms_connected: false; changed_anything: false; remote_requests: 0;
};
export type IssuerLauncherReceipt259 = {
  schema: typeof ISSUER_259_SCHEMA; release_sha: string; observed_at: string;
  observation_sha256: string; issuer_public_key_raw_base64: string; signature_base64: string;
};
export type IndependentChallenge259 = {
  schema: typeof CHALLENGE_259_SCHEMA; release_sha: string; observed_at: string;
  observation_sha256: string; challenge_nonce: string;
  witness_mode: "OFFLINE_PREFLIGHT_ONLY"; challenge_executed: false;
  receiver_port_listening: false; receiver_activated: false;
  owner_decision: "HOLD"; network_requests: 0;
  independent_public_key_raw_base64: string; signature_base64: string;
};

function record(text: string): Record<string, unknown> {
  if (text.length > 12000) throw new Error("Build 259 evidence exceeds 12 KB.");
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error("Invalid Build 259 JSON."); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Build 259 evidence must be an object.");
  return parsed as Record<string, unknown>;
}
function time(x: unknown): x is string {
  return typeof x === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(x)
    && Number.isFinite(Date.parse(x)) && new Date(x).toISOString() === x.replace("Z", ".000Z");
}
function oneOf<T extends readonly string[]>(choices: T, value: unknown): value is T[number] {
  return typeof value === "string" && choices.includes(value);
}
function launcher(raw: unknown, expectedListener: LauncherObservation259["listener"]): LauncherObservation259 {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Missing launcher observation.");
  const x = raw as Record<string, unknown>;
  if (x.listener !== expectedListener || !Array.isArray(x.ancestor_kinds)
    || x.ancestor_kinds.length > 6 || !x.ancestor_kinds.every(k => oneOf(kinds, k))
    || typeof x.recovery_script_mentioned !== "boolean" || !Number.isInteger(x.chain_hops_inspected)
    || (x.chain_hops_inspected as number) < 0 || (x.chain_hops_inspected as number) > 6
    || x.chain_hops_inspected !== x.ancestor_kinds.length || !oneOf(states, x.chain_status)
    || (x.process_predates_checkout_commit !== null && typeof x.process_predates_checkout_commit !== "boolean")
    || !oneOf(launchSources, x.launch_source)
    || (x.recovery_script_mentioned !== (x.launch_source === "recovery_script_mention_unverified"))
    || (x.chain_status === "partial_or_complete" && x.ancestor_kinds.length === 0))
    throw new Error("Invalid or inconsistent launcher-chain observation.");
  return {listener: expectedListener, ancestor_kinds: [...x.ancestor_kinds] as Kind[],
    recovery_script_mentioned: x.recovery_script_mentioned, chain_hops_inspected: x.chain_hops_inspected as number,
    chain_status: x.chain_status, process_predates_checkout_commit: x.process_predates_checkout_commit as boolean | null,
    launch_source: x.launch_source};
}

export function parseLauncher259(text: string): LauncherCustody259 {
  const x = record(text);
  const identity = parseIdentity258(JSON.stringify(x.identity_258));
  if (x.schema !== LAUNCHER_259_SCHEMA || x.source !== "on_device_read_only" || !time(x.observed_at)
    || (x.checkout_sha_candidate !== null && !sha40.test(String(x.checkout_sha_candidate)))
    || (x.checkout_commit_utc !== null && !time(x.checkout_commit_utc))
    || x.checkout_sha_candidate !== identity.checkout_sha_candidate
    || x.recovery_task_state !== identity.recovery_task_state || x.recovery_action !== identity.recovery_action
    || x.startup_task_state !== identity.startup_task_state
    || Date.parse(x.observed_at as string) - Date.parse(identity.observed_at) < 0
    || Date.parse(x.observed_at as string) - Date.parse(identity.observed_at) > 120000
    || x.supervised_restart_state !== "HOLD_PENDING_ORIGINAL_LAUNCHER_CUSTODY"
    || x.original_issuer_signature_verified !== false || x.independent_challenge_signature_verified !== false
    || x.installed_release_attested !== false || x.process_attested !== false
    || x.restart_authorized !== false || x.challenge_executed !== false || x.test_authorized !== false
    || x.receiver_activated !== false || x.comms_connected !== false
    || x.changed_anything !== false || x.remote_requests !== 0)
    throw new Error("Build 259 source, timing or immutable HOLD flags invalid.");
  const web = launcher(x.web_launcher, identity.web.listener);
  const backend = launcher(x.backend_launcher, identity.backend.listener);
  for (const pair of [[web, identity.web], [backend, identity.backend]] as const) {
    const [current, older] = pair;
    if (x.checkout_commit_utc && older.process_started_utc
      && current.process_predates_checkout_commit !== (Date.parse(older.process_started_utc) < Date.parse(x.checkout_commit_utc)))
      throw new Error("Build 259 process age contradicts checkout commit time.");
  }
  return {schema: LAUNCHER_259_SCHEMA, source: "on_device_read_only", observed_at: x.observed_at,
    checkout_sha_candidate: x.checkout_sha_candidate as string | null,
    checkout_commit_utc: x.checkout_commit_utc as string | null, identity_258: identity,
    web_launcher: web, backend_launcher: backend, recovery_task_state: identity.recovery_task_state,
    recovery_action: identity.recovery_action, startup_task_state: identity.startup_task_state,
    supervised_restart_state: "HOLD_PENDING_ORIGINAL_LAUNCHER_CUSTODY",
    original_issuer_signature_verified: false, independent_challenge_signature_verified: false,
    installed_release_attested: false, process_attested: false, restart_authorized: false,
    challenge_executed: false, test_authorized: false, receiver_activated: false,
    comms_connected: false, changed_anything: false, remote_requests: 0};
}

function signedFields(x: Record<string, unknown>, key: string) {
  return typeof x[key] === "string" && (x[key] as string).length === 44 && b64.test(x[key] as string)
    && typeof x.signature_base64 === "string" && x.signature_base64.length === 88 && b64.test(x.signature_base64);
}
export function parseIssuer259(text: string): IssuerLauncherReceipt259 {
  const x = record(text);
  if (x.schema !== ISSUER_259_SCHEMA || !sha40.test(String(x.release_sha)) || !time(x.observed_at)
    || !sha64.test(String(x.observation_sha256)) || !signedFields(x, "issuer_public_key_raw_base64"))
    throw new Error("Invalid Build 259 original launcher issuer receipt.");
  return {schema: ISSUER_259_SCHEMA, release_sha: x.release_sha as string,
    observed_at: x.observed_at, observation_sha256: x.observation_sha256 as string,
    issuer_public_key_raw_base64: x.issuer_public_key_raw_base64 as string,
    signature_base64: x.signature_base64 as string};
}
export function parseChallenge259(text: string): IndependentChallenge259 {
  const x = record(text);
  if (x.schema !== CHALLENGE_259_SCHEMA || !sha40.test(String(x.release_sha)) || !time(x.observed_at)
    || !sha64.test(String(x.observation_sha256)) || !hex32.test(String(x.challenge_nonce))
    || x.witness_mode !== "OFFLINE_PREFLIGHT_ONLY" || x.challenge_executed !== false
    || x.receiver_port_listening !== false || x.receiver_activated !== false
    || x.owner_decision !== "HOLD" || x.network_requests !== 0
    || !signedFields(x, "independent_public_key_raw_base64"))
    throw new Error("Invalid independent Comms TEST preflight witness.");
  return {schema: CHALLENGE_259_SCHEMA, release_sha: x.release_sha as string,
    observed_at: x.observed_at, observation_sha256: x.observation_sha256 as string,
    challenge_nonce: x.challenge_nonce as string, witness_mode: "OFFLINE_PREFLIGHT_ONLY",
    challenge_executed: false, receiver_port_listening: false, receiver_activated: false,
    owner_decision: "HOLD", network_requests: 0,
    independent_public_key_raw_base64: x.independent_public_key_raw_base64 as string,
    signature_base64: x.signature_base64 as string};
}

export function canonicalLauncher259(x: LauncherCustody259) {
  const l = (p: LauncherObservation259) => [p.listener, p.ancestor_kinds.join(","),
    String(p.recovery_script_mentioned), String(p.chain_hops_inspected), p.chain_status,
    p.process_predates_checkout_commit === null ? "" : String(p.process_predates_checkout_commit), p.launch_source];
  return [x.schema, x.source, x.observed_at, x.checkout_sha_candidate ?? "", x.checkout_commit_utc ?? "",
    canonicalIdentity258(x.identity_258), ...l(x.web_launcher), ...l(x.backend_launcher),
    x.recovery_task_state, x.recovery_action, x.startup_task_state, x.supervised_restart_state,
    "false", "false", "false", "false", "false", "false", "false", "false", "false", "false", "0", ""].join("\n");
}
export const canonicalIssuer259 = (x: IssuerLauncherReceipt259) =>
  [x.schema, x.release_sha, x.observed_at, x.observation_sha256, ""].join("\n");
export const canonicalChallenge259 = (x: IndependentChallenge259) =>
  [x.schema, x.release_sha, x.observed_at, x.observation_sha256, x.challenge_nonce,
    "OFFLINE_PREFLIGHT_ONLY", "false", "false", "false", "HOLD", "0", ""].join("\n");
async function sha256(data: Uint8Array) {
  const owned = new Uint8Array(new ArrayBuffer(data.byteLength)); owned.set(data);
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", owned.buffer));
  return Array.from(bytes).map(v => v.toString(16).padStart(2, "0")).join("");
}
export const digestLauncher259 = (x: LauncherCustody259) => sha256(new TextEncoder().encode(canonicalLauncher259(x)));
const fresh = (time: string, now: string) => {
  const age = Date.parse(now) - Date.parse(time);
  return Number.isFinite(age) && age >= 0 && age <= 24 * 3600 * 1000;
};

export async function reviewLauncher259(observation: LauncherCustody259 | null,
  issuer: IssuerLauncherReceipt259 | null, witness: IndependentChallenge259 | null,
  trustedIssuerPublicKey: string | null, independentWitnessPin: string,
  expectedRelease: string, now: string) {
  const digest = observation ? await digestLauncher259(observation) : null;
  const exactRelease = Boolean(observation && issuer && witness && sha40.test(expectedRelease)
    && observation.checkout_sha_candidate === expectedRelease && issuer.release_sha === expectedRelease
    && witness.release_sha === expectedRelease);
  const exactObservation = Boolean(observation && issuer && witness && digest
    && issuer.observation_sha256 === digest && witness.observation_sha256 === digest
    && issuer.observed_at === observation.observed_at && witness.observed_at === observation.observed_at);
  const freshness = Boolean(observation && issuer && witness && fresh(observation.observed_at, now)
    && fresh(issuer.observed_at, now) && fresh(witness.observed_at, now));
  const originalKeyMatched = Boolean(issuer && trustedIssuerPublicKey
    && issuer.issuer_public_key_raw_base64 === trustedIssuerPublicKey);
  const independent = Boolean(witness && trustedIssuerPublicKey
    && witness.independent_public_key_raw_base64 !== trustedIssuerPublicKey);
  let issuerPin = "";
  if (originalKeyMatched && trustedIssuerPublicKey) try {
    issuerPin = await sha256(Uint8Array.from(atob(trustedIssuerPublicKey), c => c.charCodeAt(0)));
  } catch { /* No authenticated key. */ }
  const issuerSignature = Boolean(issuer && originalKeyMatched && await verifyPinnedEd25519Signature258(
    issuer.issuer_public_key_raw_base64, issuer.signature_base64, canonicalIssuer259(issuer), issuerPin));
  const witnessSignature = Boolean(witness && independent && await verifyPinnedEd25519Signature258(
    witness.independent_public_key_raw_base64, witness.signature_base64,
    canonicalChallenge259(witness), independentWitnessPin));
  const agedRuntime = Boolean(observation && (observation.web_launcher.process_predates_checkout_commit === true
    || observation.backend_launcher.process_predates_checkout_commit === true));
  const reviewedCandidate = exactRelease && exactObservation && freshness && issuerSignature && witnessSignature;
  return {state: reviewedCandidate ? "SIGNED_OFFLINE_CHALLENGE_CANDIDATE_ONLY" as const : "LAUNCHER_CUSTODY_259_HOLD" as const,
    exactRelease, exactObservation, freshness, issuerSignature, witnessSignature, independent,
    originalReceiptAccepted: reviewedCandidate, offlineWitnessAccepted: reviewedCandidate,
    agedRuntime, observationDigest: digest, launch_attested: false as const,
    installed_release_attested: false as const, restart_authorized: false as const,
    challenge_executed: false as const, test_authorized: false as const,
    receiver_activated: false as const, comms_connected: false as const, remote_requests: 0 as const,
    decision: "ORIGINAL_LAUNCHER_AND_TEST_OWNER_HOLD" as const,
    findings: ["An ancestor process name or recovery-script mention is not original launcher custody.",
      "Processes started before a release commit cannot attest that the new release is running.",
      "An offline signed challenge is not a private connection, a live response, or owner authorization.",
      "Ree's Windows restart and Jack's independent TEST challenge require separate supervised decisions."],
  };
}
