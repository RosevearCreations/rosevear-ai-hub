import {parseLauncher259, canonicalLauncher259, type LauncherCustody259} from "./launcherCustody259";
import {verifyPinnedEd25519Signature258} from "./processIdentity258";

export const RUNTIME_260_SCHEMA = "rosevear-windows-supervised-runtime-260/v1";
export const OWNER_260_SCHEMA = "rosevear-windows-supervised-owner-decision-260/v1";
export const WITNESS_260_SCHEMA = "rosevear-windows-independent-runtime-test-handoff-260/v1";
const sha40 = /^[a-f0-9]{40}$/;
const sha64 = /^[a-f0-9]{64}$/;
const nonce32 = /^[a-f0-9]{32}$/;
const b64 = /^[A-Za-z0-9+/]+={0,2}$/;
const immutableHold = ["supervised_restart_authorized", "supervised_restart_performed_attested",
  "installed_release_attested", "independent_runtime_verified", "test_authorized",
  "challenge_executed", "receiver_activated", "comms_connected", "changed_anything"] as const;

export type Runtime260 = {
  schema: typeof RUNTIME_260_SCHEMA; source: "on_device_read_only"; stage: "before" | "after";
  observed_at: string; release_sha_candidate: string | null; launcher_259: LauncherCustody259;
  web_started_utc: string | null; backend_started_utc: string | null;
  recovery_task_state: LauncherCustody259["recovery_task_state"];
  startup_task_state: LauncherCustody259["startup_task_state"];
  operator_stage_is_not_proof: true; supervised_restart_authorized: false;
  supervised_restart_performed_attested: false; installed_release_attested: false;
  independent_runtime_verified: false; test_authorized: false; challenge_executed: false;
  receiver_activated: false; comms_connected: false; changed_anything: false; remote_requests: 0;
};
export type OwnerDecision260 = {
  schema: typeof OWNER_260_SCHEMA; release_sha: string; before_sha256: string;
  decided_at: string; expires_at: string; action: "SUPERVISED_LOCAL_RELEASE_RESTART_ONLY";
  rollback_ready: true; owner_decision: "APPROVED_FOR_SUPERVISED_WINDOW";
  original_owner_public_key_raw_base64: string; signature_base64: string;
};
export type RuntimeWitness260 = {
  schema: typeof WITNESS_260_SCHEMA; release_sha: string; before_sha256: string;
  after_sha256: string; witnessed_at: string; challenge_nonce: string;
  test_scope: "NONPRODUCTION_GET_ONLY"; receiver_state: "OFF";
  owner_test_decision: "HOLD"; challenge_executed: false; network_requests: 0;
  independent_public_key_raw_base64: string; signature_base64: string;
};

function parseObject(text: string, limit: number) {
  if (text.length > limit) throw new Error("Build 260 evidence exceeds its size limit.");
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error("Invalid Build 260 JSON."); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("Build 260 evidence must be an object.");
  return parsed as Record<string, unknown>;
}
function utc(x: unknown): x is string {
  return typeof x === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(x)
    && Number.isFinite(Date.parse(x)) && new Date(x).toISOString() === x.replace("Z", ".000Z");
}
function signature(x: Record<string, unknown>, publicField: string) {
  return typeof x[publicField] === "string" && (x[publicField] as string).length === 44
    && b64.test(x[publicField] as string) && typeof x.signature_base64 === "string"
    && x.signature_base64.length === 88 && b64.test(x.signature_base64);
}

export function parseRuntime260(text: string): Runtime260 {
  const x = parseObject(text, 20000);
  const launcher = parseLauncher259(JSON.stringify(x.launcher_259));
  if (x.schema !== RUNTIME_260_SCHEMA || x.source !== "on_device_read_only"
    || (x.stage !== "before" && x.stage !== "after") || !utc(x.observed_at)
    || x.release_sha_candidate !== launcher.checkout_sha_candidate
    || x.web_started_utc !== launcher.identity_258.web.process_started_utc
    || x.backend_started_utc !== launcher.identity_258.backend.process_started_utc
    || x.recovery_task_state !== launcher.recovery_task_state
    || x.startup_task_state !== launcher.startup_task_state
    || x.operator_stage_is_not_proof !== true || x.remote_requests !== 0
    || immutableHold.some(flag => x[flag] !== false)
    || Date.parse(x.observed_at as string) < Date.parse(launcher.observed_at)
    || Date.parse(x.observed_at as string) - Date.parse(launcher.observed_at) > 120000)
    throw new Error("Build 260 runtime or immutable no-action flags invalid.");
  return {schema: RUNTIME_260_SCHEMA, source: "on_device_read_only", stage: x.stage,
    observed_at: x.observed_at, release_sha_candidate: launcher.checkout_sha_candidate, launcher_259: launcher,
    web_started_utc: x.web_started_utc as string | null,
    backend_started_utc: x.backend_started_utc as string | null,
    recovery_task_state: launcher.recovery_task_state, startup_task_state: launcher.startup_task_state,
    operator_stage_is_not_proof: true, supervised_restart_authorized: false,
    supervised_restart_performed_attested: false, installed_release_attested: false,
    independent_runtime_verified: false, test_authorized: false, challenge_executed: false,
    receiver_activated: false, comms_connected: false, changed_anything: false, remote_requests: 0};
}

export function parseOwner260(text: string): OwnerDecision260 {
  const x = parseObject(text, 5000);
  if (x.schema !== OWNER_260_SCHEMA || !sha40.test(String(x.release_sha))
    || !sha64.test(String(x.before_sha256)) || !utc(x.decided_at) || !utc(x.expires_at)
    || x.action !== "SUPERVISED_LOCAL_RELEASE_RESTART_ONLY" || x.rollback_ready !== true
    || x.owner_decision !== "APPROVED_FOR_SUPERVISED_WINDOW"
    || !signature(x, "original_owner_public_key_raw_base64"))
    throw new Error("Invalid original-owner supervised decision.");
  return {schema: OWNER_260_SCHEMA, release_sha: x.release_sha as string,
    before_sha256: x.before_sha256 as string, decided_at: x.decided_at,
    expires_at: x.expires_at, action: "SUPERVISED_LOCAL_RELEASE_RESTART_ONLY", rollback_ready: true,
    owner_decision: "APPROVED_FOR_SUPERVISED_WINDOW",
    original_owner_public_key_raw_base64: x.original_owner_public_key_raw_base64 as string,
    signature_base64: x.signature_base64 as string};
}

export function parseWitness260(text: string): RuntimeWitness260 {
  const x = parseObject(text, 5000);
  if (x.schema !== WITNESS_260_SCHEMA || !sha40.test(String(x.release_sha))
    || !sha64.test(String(x.before_sha256)) || !sha64.test(String(x.after_sha256))
    || !utc(x.witnessed_at) || !nonce32.test(String(x.challenge_nonce))
    || x.test_scope !== "NONPRODUCTION_GET_ONLY" || x.receiver_state !== "OFF"
    || x.owner_test_decision !== "HOLD" || x.challenge_executed !== false
    || x.network_requests !== 0 || !signature(x, "independent_public_key_raw_base64"))
    throw new Error("Invalid independent post-restart TEST handoff witness.");
  return {schema: WITNESS_260_SCHEMA, release_sha: x.release_sha as string,
    before_sha256: x.before_sha256 as string, after_sha256: x.after_sha256 as string,
    witnessed_at: x.witnessed_at, challenge_nonce: x.challenge_nonce as string,
    test_scope: "NONPRODUCTION_GET_ONLY", receiver_state: "OFF", owner_test_decision: "HOLD",
    challenge_executed: false, network_requests: 0,
    independent_public_key_raw_base64: x.independent_public_key_raw_base64 as string,
    signature_base64: x.signature_base64 as string};
}

export function canonicalRuntime260(x: Runtime260) {
  return [x.schema, x.source, x.stage, x.observed_at, x.release_sha_candidate ?? "",
    canonicalLauncher259(x.launcher_259), x.web_started_utc ?? "", x.backend_started_utc ?? "",
    x.recovery_task_state, x.startup_task_state, "true", ...immutableHold.map(() => "false"), "0", ""].join("\n");
}
export function canonicalOwner260(x: OwnerDecision260) {
  return [x.schema, x.release_sha, x.before_sha256, x.decided_at, x.expires_at,
    x.action, "true", x.owner_decision, ""].join("\n");
}
export function canonicalWitness260(x: RuntimeWitness260) {
  return [x.schema, x.release_sha, x.before_sha256, x.after_sha256, x.witnessed_at,
    x.challenge_nonce, x.test_scope, x.receiver_state, x.owner_test_decision, "false", "0", ""].join("\n");
}
async function digest(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength); copy.set(bytes);
  const result = new Uint8Array(await crypto.subtle.digest("SHA-256", copy.buffer));
  return Array.from(result).map(v => v.toString(16).padStart(2, "0")).join("");
}
export const digestRuntime260 = (x: Runtime260) => digest(new TextEncoder().encode(canonicalRuntime260(x)));
async function keyHash(base64: string) {
  try { return await digest(Uint8Array.from(atob(base64), c => c.charCodeAt(0))); }
  catch { return ""; }
}

export async function reviewRuntime260(before: Runtime260 | null, after: Runtime260 | null,
  owner: OwnerDecision260 | null, witness: RuntimeWitness260 | null,
  trustedOriginalOwnerKey: string | null, independentlyTrustedOwnerPin: string,
  independentlyTrustedWitnessPin: string,
  expectedRelease: string, now: string) {
  const beforeDigest = before ? await digestRuntime260(before) : null;
  const afterDigest = after ? await digestRuntime260(after) : null;
  const releaseMatched = Boolean(sha40.test(expectedRelease) && before && after && owner && witness
    && before.release_sha_candidate === expectedRelease && after.release_sha_candidate === expectedRelease
    && owner.release_sha === expectedRelease && witness.release_sha === expectedRelease);
  const exactDigests = Boolean(owner && witness && beforeDigest && afterDigest
    && owner.before_sha256 === beforeDigest && witness.before_sha256 === beforeDigest
    && witness.after_sha256 === afterDigest);
  const beforeTime = Date.parse(before?.observed_at ?? "");
  const afterTime = Date.parse(after?.observed_at ?? "");
  const verifiedAge = (stamp: string | null | undefined) => Number.isFinite(Date.parse(stamp ?? ""))
    && Date.parse(stamp!) > beforeTime && Date.parse(stamp!) <= afterTime;
  const ageCommit = (stamp: string | null | undefined) => Number.isFinite(Date.parse(stamp ?? ""))
    && Date.parse(stamp!) >= Date.parse(after?.launcher_259.checkout_commit_utc ?? "");
  const sequenceConsistent = Boolean(before && after && before.stage === "before" && after.stage === "after"
    && afterTime > beforeTime && afterTime - beforeTime <= 24 * 3600 * 1000
    && before.launcher_259.identity_258.web.listener_stable && before.launcher_259.identity_258.backend.listener_stable
    && after.launcher_259.identity_258.web.listener_stable && after.launcher_259.identity_258.backend.listener_stable
    && before.launcher_259.identity_258.web.process_kind === "node"
    && before.launcher_259.identity_258.backend.process_kind === "python"
    && after.launcher_259.identity_258.web.process_kind === "node"
    && after.launcher_259.identity_258.backend.process_kind === "python"
    && verifiedAge(after.web_started_utc) && verifiedAge(after.backend_started_utc)
    && ageCommit(after.web_started_utc) && ageCommit(after.backend_started_utc)
    && after.launcher_259.checkout_commit_utc && before.launcher_259.checkout_commit_utc === after.launcher_259.checkout_commit_utc
    && before.recovery_task_state === after.recovery_task_state
    && before.startup_task_state === after.startup_task_state
    && before.launcher_259.recovery_action === after.launcher_259.recovery_action
    && after.launcher_259.web_launcher.chain_status === "partial_or_complete"
    && after.launcher_259.backend_launcher.chain_status === "partial_or_complete");
  const decisionTime = Date.parse(owner?.decided_at ?? "");
  const expiry = Date.parse(owner?.expires_at ?? "");
  const witnessed = Date.parse(witness?.witnessed_at ?? "");
  const nowMs = Date.parse(now);
  const withinWindow = Boolean(owner && witness && before && after && Number.isFinite(nowMs)
    && decisionTime >= beforeTime && decisionTime <= Date.parse(after.web_started_utc ?? "")
    && decisionTime <= Date.parse(after.backend_started_utc ?? "") && expiry > afterTime
    && expiry - decisionTime <= 60 * 60 * 1000 && witnessed >= afterTime
    && witnessed - afterTime <= 15 * 60 * 1000 && nowMs >= witnessed
    && nowMs - witnessed <= 24 * 3600 * 1000 && nowMs <= expiry);
  const originalKey = Boolean(owner && trustedOriginalOwnerKey
    && owner.original_owner_public_key_raw_base64 === trustedOriginalOwnerKey
    && sha64.test(independentlyTrustedOwnerPin)
    && await keyHash(trustedOriginalOwnerKey) === independentlyTrustedOwnerPin);
  const independentKey = Boolean(witness && trustedOriginalOwnerKey
    && witness.independent_public_key_raw_base64 !== trustedOriginalOwnerKey);
  const ownerSignature = Boolean(owner && originalKey && trustedOriginalOwnerKey
    && await verifyPinnedEd25519Signature258(owner.original_owner_public_key_raw_base64,
      owner.signature_base64, canonicalOwner260(owner), await keyHash(trustedOriginalOwnerKey)));
  const witnessSignature = Boolean(witness && independentKey && await verifyPinnedEd25519Signature258(
    witness.independent_public_key_raw_base64, witness.signature_base64,
    canonicalWitness260(witness), independentlyTrustedWitnessPin));
  const candidate = Boolean(releaseMatched && exactDigests && sequenceConsistent && withinWindow
    && ownerSignature && witnessSignature);
  return {state: candidate ? "SIGNED_POST_RESTART_RUNTIME_CANDIDATE_TEST_HOLD" as const
    : "SUPERVISED_RELEASE_260_HOLD" as const, releaseMatched, exactDigests,
    sequenceConsistent, withinWindow, ownerSignature, witnessSignature,
    signedCandidate: candidate, beforeDigest, afterDigest,
    installed_release_attested: false as const, process_attested: false as const,
    restart_executed_by_app: false as const, test_authorized: false as const,
    challenge_executed: false as const, receiver_activated: false as const,
    comms_connected: false as const, network_requests: 0 as const,
    decision: "ORIGINAL_OWNER_SUPERVISED_AND_COMMS_TEST_HOLD" as const,
    findings: ["A stage label and later process start dates are not proof of original installed-source custody.",
      "A signed owner decision is scoped to supervised local restart readiness, not remote control.",
      "Independent post-restart witness is not a live authenticated Comms challenge.",
      "Private TEST remains OFF until separately enrolled owners and a genuine signed receiver challenge."],
  };
}
