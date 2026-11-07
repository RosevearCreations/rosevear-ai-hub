import {parseRuntime260, digestRuntime260, reviewRuntime260, type Runtime260,
  type OwnerDecision260, type RuntimeWitness260} from "./supervisedRuntime260";
import {verifyPinnedEd25519Signature258} from "./processIdentity258";

export const SOURCE_261_SCHEMA = "rosevear-windows-installed-source-map-261/v1";
export const ISSUER_261_SCHEMA = "rosevear-windows-original-issuer-artifact-map-261/v1";
const sha40 = /^[a-f0-9]{40}$/;
const sha64 = /^[a-f0-9]{64}$/;
const b64 = /^[A-Za-z0-9+/]+={0,2}$/;
const time = (value: unknown): value is string => typeof value === "string"
  && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)
  && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString() === value.replace("Z", ".000Z");

function record(text: string, max = 50000): Record<string, unknown> {
  if (text.length > max) throw new Error("Build 261 evidence exceeds its size limit.");
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error("Invalid Build 261 JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Build 261 evidence must be an object.");
  return value as Record<string, unknown>;
}

type MappedListener261 = {
  listener: "observed" | "missing" | "ambiguous_or_exposed" | "unverified";
  process_kind: "node" | "python";
  executable_path_status: "readable" | "access_restricted_or_unavailable" | "unavailable";
  command_line_status: "readable" | "access_restricted_or_unavailable" | "unavailable";
  template_status: "matched_unattested" | "mismatch" | "unavailable";
  expected_launch_template: "hub_vite_loopback" | "hub_uvicorn_loopback";
  listener_stable: boolean;
};
export type InstalledSource261 = {
  schema: typeof SOURCE_261_SCHEMA; source: "on_device_read_only"; observed_at: string;
  stage: "before" | "after"; release_sha_candidate: string | null; runtime_260: Runtime260;
  web: MappedListener261; backend: MappedListener261;
  checkout_web_source_sha256: string | null; checkout_backend_source_sha256: string | null;
  artifact_mapping_status: "checkout_artifacts_only"; original_installed_source_verified: false;
  supervised_restart_receipt_verified: false; independent_witness_verified: false;
  test_authorized: false; challenge_executed: false; receiver_activated: false;
  comms_connected: false; changed_anything: false; remote_requests: 0;
};
export type OriginalIssuerMap261 = {
  schema: typeof ISSUER_261_SCHEMA; release_sha: string; before_sha256: string; after_sha256: string;
  web_checkout_sha256: string; backend_checkout_sha256: string;
  mapped_at: string; expires_at: string;
  artifact_scope: "CHECKOUT_ARTIFACTS_AND_LAUNCH_TEMPLATE_CANDIDATE_ONLY";
  receiver_state: "OFF"; installed_source_attested: false;
  original_issuer_public_key_raw_base64: string; signature_base64: string;
};

function parseListener(value: unknown, kind: "node" | "python"): MappedListener261 {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Missing Windows launch template observation.");
  const x = value as Record<string, unknown>;
  const listener = ["observed", "missing", "ambiguous_or_exposed", "unverified"] as const;
  const path = ["readable", "access_restricted_or_unavailable", "unavailable"] as const;
  const template = ["matched_unattested", "mismatch", "unavailable"] as const;
  if (!listener.some(v => x.listener === v) || x.process_kind !== kind
    || !path.some(v => x.executable_path_status === v)
    || !path.some(v => x.command_line_status === v)
    || !template.some(v => x.template_status === v)
    || x.expected_launch_template !== (kind === "node" ? "hub_vite_loopback" : "hub_uvicorn_loopback")
    || typeof x.listener_stable !== "boolean"
    || (x.listener_stable && x.listener !== "observed")
    || (x.template_status === "matched_unattested" && (x.listener_stable !== true
      || x.executable_path_status !== "readable" || x.command_line_status !== "readable")))
    throw new Error("Invalid or contradictory Windows launch template report.");
  return {listener: x.listener as MappedListener261["listener"], process_kind: kind,
    executable_path_status: x.executable_path_status as MappedListener261["executable_path_status"],
    command_line_status: x.command_line_status as MappedListener261["command_line_status"],
    template_status: x.template_status as MappedListener261["template_status"],
    expected_launch_template: kind === "node" ? "hub_vite_loopback" : "hub_uvicorn_loopback",
    listener_stable: x.listener_stable as boolean};
}

export function parseInstalledSource261(text: string): InstalledSource261 {
  const x = record(text);
  const runtime = parseRuntime260(JSON.stringify(x.runtime_260));
  const web = parseListener(x.web, "node"), backend = parseListener(x.backend, "python");
  const sourceHash = (v: unknown) => v === null || (typeof v === "string" && sha64.test(v));
  if (x.schema !== SOURCE_261_SCHEMA || x.source !== "on_device_read_only"
    || !time(x.observed_at) || x.stage !== runtime.stage
    || x.release_sha_candidate !== runtime.release_sha_candidate
    || x.checkout_web_source_sha256 !== runtime.launcher_259.identity_258.web.checkout_source_sha256
    || x.checkout_backend_source_sha256 !== runtime.launcher_259.identity_258.backend.checkout_source_sha256
    || !sourceHash(x.checkout_web_source_sha256) || !sourceHash(x.checkout_backend_source_sha256)
    || x.artifact_mapping_status !== "checkout_artifacts_only"
    || x.original_installed_source_verified !== false || x.supervised_restart_receipt_verified !== false
    || x.independent_witness_verified !== false || x.test_authorized !== false
    || x.challenge_executed !== false || x.receiver_activated !== false || x.comms_connected !== false
    || x.changed_anything !== false || x.remote_requests !== 0
    || Date.parse(x.observed_at as string) < Date.parse(runtime.observed_at)
    || Date.parse(x.observed_at as string) - Date.parse(runtime.observed_at) > 120000)
    throw new Error("Build 261 observation, source digest or receiver-OFF invariant invalid.");
  return {schema: SOURCE_261_SCHEMA, source: "on_device_read_only", observed_at: x.observed_at as string,
    stage: runtime.stage, release_sha_candidate: runtime.release_sha_candidate, runtime_260: runtime,
    web, backend, checkout_web_source_sha256: x.checkout_web_source_sha256 as string | null,
    checkout_backend_source_sha256: x.checkout_backend_source_sha256 as string | null,
    artifact_mapping_status: "checkout_artifacts_only", original_installed_source_verified: false,
    supervised_restart_receipt_verified: false, independent_witness_verified: false,
    test_authorized: false, challenge_executed: false, receiver_activated: false,
    comms_connected: false, changed_anything: false, remote_requests: 0};
}

export function parseOriginalIssuer261(text: string): OriginalIssuerMap261 {
  const x = record(text, 5000);
  if (x.schema !== ISSUER_261_SCHEMA || !sha40.test(String(x.release_sha))
    || !sha64.test(String(x.before_sha256)) || !sha64.test(String(x.after_sha256))
    || !sha64.test(String(x.web_checkout_sha256)) || !sha64.test(String(x.backend_checkout_sha256))
    || !time(x.mapped_at) || !time(x.expires_at)
    || x.artifact_scope !== "CHECKOUT_ARTIFACTS_AND_LAUNCH_TEMPLATE_CANDIDATE_ONLY"
    || x.receiver_state !== "OFF" || x.installed_source_attested !== false
    || typeof x.original_issuer_public_key_raw_base64 !== "string"
    || x.original_issuer_public_key_raw_base64.length !== 44 || !b64.test(x.original_issuer_public_key_raw_base64)
    || typeof x.signature_base64 !== "string" || x.signature_base64.length !== 88 || !b64.test(x.signature_base64))
    throw new Error("Invalid original-issuer artifact candidate receipt.");
  return {schema: ISSUER_261_SCHEMA, release_sha: x.release_sha as string,
    before_sha256: x.before_sha256 as string, after_sha256: x.after_sha256 as string,
    web_checkout_sha256: x.web_checkout_sha256 as string,
    backend_checkout_sha256: x.backend_checkout_sha256 as string,
    mapped_at: x.mapped_at as string, expires_at: x.expires_at as string,
    artifact_scope: "CHECKOUT_ARTIFACTS_AND_LAUNCH_TEMPLATE_CANDIDATE_ONLY",
    receiver_state: "OFF", installed_source_attested: false,
    original_issuer_public_key_raw_base64: x.original_issuer_public_key_raw_base64 as string,
    signature_base64: x.signature_base64 as string};
}

const listenerCanonical = (x: MappedListener261) => [x.listener, x.process_kind,
  x.executable_path_status, x.command_line_status, x.template_status,
  x.expected_launch_template, String(x.listener_stable)].join("|");
export const canonicalInstalledSource261 = (x: InstalledSource261) => [x.schema, x.source,
  x.stage, x.observed_at, x.release_sha_candidate ?? "",
  x.runtime_260.observed_at, listenerCanonical(x.web), listenerCanonical(x.backend),
  x.checkout_web_source_sha256 ?? "", x.checkout_backend_source_sha256 ?? "",
  x.artifact_mapping_status, "false", "false", "false", "false", "false", "false", "false", "false", "0", ""].join("\n");
export const canonicalOriginalIssuer261 = (x: OriginalIssuerMap261) => [x.schema,
  x.release_sha, x.before_sha256, x.after_sha256, x.web_checkout_sha256,
  x.backend_checkout_sha256, x.mapped_at, x.expires_at, x.artifact_scope, x.receiver_state,
  "false", ""].join("\n");
async function digest(text: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(hash)].map(v => v.toString(16).padStart(2, "0")).join("");
}
export const digestInstalledSource261 = (x: InstalledSource261) => digest(canonicalInstalledSource261(x));

export async function reviewInstalledSource261(before: InstalledSource261 | null,
  after: InstalledSource261 | null, issuer: OriginalIssuerMap261 | null,
  owner: OwnerDecision260 | null, witness: RuntimeWitness260 | null,
  trustedIssuerKey: string | null, issuerPin: string,
  trustedOwnerKey: string, ownerPin: string, witnessPin: string,
  expectedRelease: string, now: string) {
  const old = before ? await digestInstalledSource261(before) : null;
  const next = after ? await digestInstalledSource261(after) : null;
  const legacy = await reviewRuntime260(before?.runtime_260 ?? null, after?.runtime_260 ?? null,
    owner, witness, trustedOwnerKey, ownerPin, witnessPin, expectedRelease, now);
  const matching = Boolean(before && after && issuer && before.stage === "before" && after.stage === "after"
    && issuer.release_sha === expectedRelease && before.release_sha_candidate === expectedRelease
    && after.release_sha_candidate === expectedRelease && issuer.before_sha256 === old
    && issuer.after_sha256 === next
    && issuer.web_checkout_sha256 === before.checkout_web_source_sha256
    && issuer.web_checkout_sha256 === after.checkout_web_source_sha256
    && issuer.backend_checkout_sha256 === before.checkout_backend_source_sha256
    && issuer.backend_checkout_sha256 === after.checkout_backend_source_sha256
    && after.web.listener_stable && after.backend.listener_stable
    && after.web.template_status === "matched_unattested"
    && after.backend.template_status === "matched_unattested"
    && after.runtime_260.recovery_task_state === before.runtime_260.recovery_task_state
    && after.runtime_260.startup_task_state === before.runtime_260.startup_task_state);
  const nowMs = Date.parse(now), mappedAt = Date.parse(issuer?.mapped_at ?? ""),
    expiry = Date.parse(issuer?.expires_at ?? ""), followup = Date.parse(after?.observed_at ?? "");
  const fresh = Boolean(issuer && before && after && Number.isFinite(nowMs)
    && mappedAt >= followup && mappedAt - followup <= 15 * 60000
    && expiry > mappedAt && expiry - mappedAt <= 60 * 60000
    && nowMs >= mappedAt && nowMs <= expiry
    && Date.parse(after.observed_at) > Date.parse(before.observed_at));
  const independent = Boolean(issuer && witness && trustedIssuerKey && trustedOwnerKey
    && issuer.original_issuer_public_key_raw_base64 === trustedIssuerKey
    && trustedOwnerKey !== trustedIssuerKey
    && witness.independent_public_key_raw_base64 !== trustedIssuerKey
    && witness.independent_public_key_raw_base64 !== trustedOwnerKey
    && sha64.test(issuerPin));
  const issuerSignature = Boolean(issuer && independent && await verifyPinnedEd25519Signature258(
    issuer.original_issuer_public_key_raw_base64, issuer.signature_base64,
    canonicalOriginalIssuer261(issuer), issuerPin));
  const signedCandidate = Boolean(matching && fresh && issuerSignature && legacy.signedCandidate);
  return {state: signedCandidate ? "SIGNED_INSTALLED_RUNTIME_CANDIDATE_TEST_HOLD" as const
    : "ORIGINAL_ISSUER_LAUNCHER_AND_COMMS_TEST_HOLD" as const,
    releaseMatched: matching, fresh, independent, issuerSignature,
    ownerSignature: legacy.ownerSignature, witnessSignature: legacy.witnessSignature,
    runtimeTimelineVerified: legacy.sequenceConsistent, signedCandidate,
    beforeDigest: old, afterDigest: next,
    installed_release_attested: false as const, process_attested: false as const,
    restart_executed_by_app: false as const, test_authorized: false as const,
    challenge_executed: false as const, receiver_activated: false as const,
    comms_connected: false as const, network_requests: 0 as const,
    findings: ["Source file hashes represent the checkout, not bytes proven loaded by the running processes.",
      "A matched launch template and signed issuer mapping remain candidates, not installed process attestation.",
      "A supervised restart receipt is not a command to restart or authorization for a private Comms challenge.",
      "Receiver OFF / GET-only TEST HOLD until independently authorized, enrolled and proven on both devices."]};
}
