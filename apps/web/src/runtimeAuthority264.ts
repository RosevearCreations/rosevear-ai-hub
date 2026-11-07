import {verifyPinnedEd25519Signature258} from "./processIdentity258";
import {canonicalSignedRuntime263, digestLauncher263, parseLauncherObservation263,
  reviewLauncherAcceptance263, type LauncherObservation263, type SignedRole263,
  type SignedRuntime263} from "./launcherAcceptance263";

export const FIELD_OBSERVATION_264 = "rosevear-windows-authority-field-264/v1";
export const FIELD_DECISION_264 = "rosevear-windows-restart-field-decision-264/v1";
export const PRIVATE_TEST_264 = "rosevear-comms-separate-private-get-request-264/v1";
const hex40 = /^[a-f0-9]{40}$/;
const hex64 = /^[a-f0-9]{64}$/;
const hex32 = /^[a-f0-9]{32}$/;
const base64 = /^[A-Za-z0-9+/]+={0,2}$/;
const validTime = (x: unknown): x is string => typeof x === "string"
  && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(x)
  && Number.isFinite(Date.parse(x)) && new Date(x).toISOString() === x.replace("Z", ".000Z");

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected a JSON object.");
  return value as Record<string, unknown>;
}
function parse(source: string, max: number): Record<string, unknown> {
  if (source.length > max) throw new Error("Evidence exceeds the file-size limit.");
  let v: unknown;
  try {v = JSON.parse(source);} catch {throw new Error("Invalid evidence JSON.");}
  return object(v);
}
function keySignature(input: unknown): SignedRole263 {
  const v = object(input);
  if (typeof v.public_key_raw_base64 !== "string" || v.public_key_raw_base64.length !== 44
    || !base64.test(v.public_key_raw_base64) || typeof v.signature_base64 !== "string"
    || v.signature_base64.length !== 88 || !base64.test(v.signature_base64))
    throw new Error("Invalid Ed25519 signature or public key.");
  return {public_key_raw_base64: v.public_key_raw_base64, signature_base64: v.signature_base64};
}
function exactFields(value: Record<string,unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).length === allowed.length
    && allowed.every(key => Object.prototype.hasOwnProperty.call(value,key));
}
async function sha256(text: string) {
  const data = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(data)).map(c => c.toString(16).padStart(2, "0")).join("");
}
export const canonicalRuntimeReceipt264 = (x: SignedRuntime263) => [
  canonicalSignedRuntime263(x, "issuer"),
  ...(["issuer","owner","independent_witness"] as const)
    .flatMap(role => [role, x[role].public_key_raw_base64, x[role].signature_base64]), "",
].join("\n");

export type WindowsField264 = {
  schema: typeof FIELD_OBSERVATION_264; source: "on_device_read_only";
  stage: "after"; observed_at: string; release_sha_candidate: string;
  launcher_263: LauncherObservation263; host_binding_candidate_sha256: string;
  recovery_action_candidate_sha256: string | null;
  recovery_task_state: "enabled" | "disabled" | "unavailable";
  recovery_last_result: "success" | "nonzero" | "unavailable";
  recovery_action_expected: boolean;
  original_host_authenticated: false; witnessed_restart_accepted: false;
  test_authorized: false; challenge_executed: false; receiver_activated: false;
  comms_connected: false; changed_anything: false; remote_requests: 0;
};
export function parseWindowsField264(source: string): WindowsField264 {
  const v = parse(source, 24000);
  const launcher = parseLauncherObservation263(JSON.stringify(v.launcher_263));
  if (v.schema !== FIELD_OBSERVATION_264 || v.source !== "on_device_read_only" || v.stage !== "after"
    || launcher.stage !== "after" || !validTime(v.observed_at)
    || typeof v.release_sha_candidate !== "string" || !hex40.test(v.release_sha_candidate)
    || v.release_sha_candidate !== launcher.release_sha_candidate
    || Date.parse(v.observed_at) < Date.parse(launcher.observed_at)
    || Date.parse(v.observed_at) - Date.parse(launcher.observed_at) > 60_000
    || typeof v.host_binding_candidate_sha256 !== "string" || !hex64.test(v.host_binding_candidate_sha256)
    || (v.recovery_action_candidate_sha256 !== null && !(typeof v.recovery_action_candidate_sha256 === "string"
      && hex64.test(v.recovery_action_candidate_sha256)))
    || !["enabled","disabled","unavailable"].includes(String(v.recovery_task_state))
    || !["success","nonzero","unavailable"].includes(String(v.recovery_last_result))
    || typeof v.recovery_action_expected !== "boolean"
    || (v.recovery_action_expected && v.recovery_action_candidate_sha256 === null)
    || v.original_host_authenticated !== false || v.witnessed_restart_accepted !== false
    || v.test_authorized !== false || v.challenge_executed !== false || v.receiver_activated !== false
    || v.comms_connected !== false || v.changed_anything !== false || v.remote_requests !== 0)
    throw new Error("Invalid or contradictory read-only Windows field evidence.");
  return {...v, launcher_263: launcher} as WindowsField264;
}
export const canonicalFieldObservation264 = (observation: WindowsField264, launcherHash: string) => [
  observation.schema,observation.source,observation.stage,observation.observed_at,
  observation.release_sha_candidate,launcherHash,observation.host_binding_candidate_sha256,
  observation.recovery_action_candidate_sha256 ?? "",observation.recovery_task_state,
  observation.recovery_last_result,String(observation.recovery_action_expected),
  "false","false","false","false","false","false","false","0","",
].join("\n");
export async function digestFieldObservation264(observation: WindowsField264) {
  return sha256(canonicalFieldObservation264(observation,await digestLauncher263(observation.launcher_263)));
}

const fieldRoles = ["issuer", "owner", "independent_witness"] as const;
const testRoles = ["issuer", "owner", "independent_witness", "receiver_operator"] as const;
type FieldRole = typeof fieldRoles[number];
type TestRole = typeof testRoles[number];
export type FieldDecision264 = {
  schema: typeof FIELD_DECISION_264; release_sha: string; runtime_receipt_sha256: string;
  after_observation_sha256: string; host_binding_sha256: string; recovery_action_sha256: string;
  signed_at: string; expires_at: string; decision: "ACCEPT_RESTART_EVIDENCE_FOR_LOCAL_REVIEW_ONLY";
  receiver_state: "OFF";
} & Record<FieldRole, SignedRole263>;
export type TestRequest264 = {
  schema: typeof PRIVATE_TEST_264; release_sha: string; field_decision_sha256: string;
  challenge_nonce: string; receiver_signer_pin_sha256: string; receiver_tls_pin_sha256: string;
  stop_plan_sha256: string; signed_at: string; expires_at: string;
  method: "GET"; path: "/api/integration/v1/health" | "/api/integration/v1/capabilities";
  target: "rosevear-comms-hub"; scope: "PRIVATE_NONPRODUCTION_SINGLE_GET_ONLY";
  max_requests: 1; receiver_state: "OFF"; decision: "REQUEST_SEPARATE_SUPERVISED_TEST";
} & Record<TestRole, SignedRole263>;

export function parseFieldDecision264(source: string): FieldDecision264 {
  const v = parse(source, 7000);
  if (!exactFields(v,["schema","release_sha","runtime_receipt_sha256",
    "after_observation_sha256","host_binding_sha256","recovery_action_sha256",
    "signed_at","expires_at","decision","receiver_state",...fieldRoles])
    || v.schema !== FIELD_DECISION_264 || typeof v.release_sha !== "string" || !hex40.test(v.release_sha)
    || [v.runtime_receipt_sha256, v.after_observation_sha256, v.host_binding_sha256,
      v.recovery_action_sha256].some(s => typeof s !== "string" || !hex64.test(s))
    || !validTime(v.signed_at) || !validTime(v.expires_at)
    || v.decision !== "ACCEPT_RESTART_EVIDENCE_FOR_LOCAL_REVIEW_ONLY" || v.receiver_state !== "OFF")
    throw new Error("Invalid local restart field decision or scope.");
  return {...v, ...Object.fromEntries(fieldRoles.map(role => [role, keySignature(v[role])]))} as FieldDecision264;
}
export function parseTestRequest264(source: string): TestRequest264 {
  const v = parse(source, 8000);
  if (!exactFields(v,["schema","release_sha","field_decision_sha256","challenge_nonce",
    "receiver_signer_pin_sha256","receiver_tls_pin_sha256","stop_plan_sha256",
    "signed_at","expires_at","method","path","target","scope","max_requests",
    "receiver_state","decision",...testRoles])
    || v.schema !== PRIVATE_TEST_264 || typeof v.release_sha !== "string" || !hex40.test(v.release_sha)
    || [v.field_decision_sha256, v.receiver_signer_pin_sha256, v.receiver_tls_pin_sha256,
      v.stop_plan_sha256].some(s => typeof s !== "string" || !hex64.test(s))
    || typeof v.challenge_nonce !== "string" || !hex32.test(v.challenge_nonce)
    || !validTime(v.signed_at) || !validTime(v.expires_at)
    || v.method !== "GET" || !["/api/integration/v1/health","/api/integration/v1/capabilities"].includes(String(v.path))
    || v.target !== "rosevear-comms-hub" || v.scope !== "PRIVATE_NONPRODUCTION_SINGLE_GET_ONLY"
    || v.max_requests !== 1 || v.receiver_state !== "OFF"
    || v.decision !== "REQUEST_SEPARATE_SUPERVISED_TEST")
    throw new Error("Invalid private Comms TEST request or expanded scope.");
  return {...v, ...Object.fromEntries(testRoles.map(role => [role, keySignature(v[role])]))} as TestRequest264;
}
const fieldValues = (x: FieldDecision264) => [x.schema,x.release_sha,x.runtime_receipt_sha256,
  x.after_observation_sha256,x.host_binding_sha256,x.recovery_action_sha256,x.signed_at,x.expires_at,
  x.decision,x.receiver_state];
export const canonicalField264 = (x: FieldDecision264, role: FieldRole) => [...fieldValues(x),role,""].join("\n");
export const canonicalFieldReceipt264 = (x: FieldDecision264) => [
  ...fieldValues(x),...fieldRoles.flatMap(role => [role,x[role].public_key_raw_base64,x[role].signature_base64]),"",
].join("\n");
export const canonicalTest264 = (x: TestRequest264, role: TestRole) => [x.schema,x.release_sha,
  x.field_decision_sha256,x.challenge_nonce,x.receiver_signer_pin_sha256,x.receiver_tls_pin_sha256,
  x.stop_plan_sha256,x.signed_at,x.expires_at,x.method,x.path,x.target,x.scope,
  String(x.max_requests),x.receiver_state,x.decision,role,""].join("\n");

export async function reviewRuntimeAuthority264(inputs: {
  before: LauncherObservation263; fieldObservation: WindowsField264; runtime: SignedRuntime263;
  fieldDecision: FieldDecision264; testRequest: TestRequest264;
  expectedRelease: string; trustedOriginalKey: string | null;
  signerPins: Record<FieldRole, string>; receiverSignerPin: string;
  receiverTlsPin: string; stopPlanPin: string; hostPin: string; now: string;
}) {
  const {before,fieldObservation: observation,runtime,fieldDecision: field,testRequest: test,
    expectedRelease,trustedOriginalKey,signerPins,receiverSignerPin,receiverTlsPin,
    stopPlanPin,hostPin,now} = inputs;
  const restart = await reviewLauncherAcceptance263(before,observation.launcher_263,runtime,
    trustedOriginalKey,signerPins,expectedRelease,now);
  // The field decision signs the on-device 264 readback, not just a generic repo SHA.
  const observationHash = await digestFieldObservation264(observation);
  const actualRuntimeHash = await sha256(canonicalRuntimeReceipt264(runtime));
  const fieldMatch = Boolean(restart.signedCandidate && field.release_sha === expectedRelease
    && field.runtime_receipt_sha256 === actualRuntimeHash
    && field.after_observation_sha256 === observationHash
    && field.host_binding_sha256 === observation.host_binding_candidate_sha256
    && field.host_binding_sha256 === hostPin
    && field.recovery_action_sha256 === observation.recovery_action_candidate_sha256
    && observation.recovery_action_expected && observation.recovery_task_state === "enabled"
    && observation.recovery_last_result === "success"
    && Date.parse(field.signed_at) >= Date.parse(observation.observed_at)
    && Date.parse(field.signed_at) <= Date.parse(runtime.expires_at)
    && Date.parse(field.expires_at) > Date.parse(field.signed_at)
    && Date.parse(field.expires_at) - Date.parse(field.signed_at) <= 30 * 60000
    && Date.parse(now) >= Date.parse(field.signed_at) && Date.parse(now) <= Date.parse(field.expires_at));
  const distinctField = new Set(fieldRoles.map(role => field[role].public_key_raw_base64)).size === 3
    && fieldRoles.every(role => field[role].public_key_raw_base64 === runtime[role].public_key_raw_base64);
  const fieldSignatures = {issuer:false,owner:false,independent_witness:false};
  if (fieldMatch && distinctField) {
    for (const role of fieldRoles) fieldSignatures[role] = await verifyPinnedEd25519Signature258(
      field[role].public_key_raw_base64,field[role].signature_base64,
      canonicalField264(field,role),signerPins[role]);
  }
  const fieldCandidate = Boolean(fieldMatch && distinctField && Object.values(fieldSignatures).every(Boolean));

  const actualFieldHash = await sha256(canonicalFieldReceipt264(field));
  const expectedPins = [receiverSignerPin,receiverTlsPin,stopPlanPin,hostPin];
  const testMatch = Boolean(fieldCandidate && test.release_sha === expectedRelease
    && test.field_decision_sha256 === actualFieldHash
    && test.receiver_signer_pin_sha256 === receiverSignerPin
    && test.receiver_tls_pin_sha256 === receiverTlsPin
    && test.stop_plan_sha256 === stopPlanPin
    && expectedPins.every(s => hex64.test(s))
    && Date.parse(test.signed_at) >= Date.parse(field.signed_at)
    && Date.parse(test.signed_at) <= Date.parse(field.expires_at)
    && Date.parse(test.expires_at) > Date.parse(test.signed_at)
    && Date.parse(test.expires_at) - Date.parse(test.signed_at) <= 10 * 60000
    && Date.parse(now) >= Date.parse(test.signed_at) && Date.parse(now) <= Date.parse(test.expires_at));
  const distinctTest = new Set(testRoles.map(role => test[role].public_key_raw_base64)).size === 4
    && fieldRoles.every(role => test[role].public_key_raw_base64 === field[role].public_key_raw_base64);
  const testSignatures = {issuer:false,owner:false,independent_witness:false,receiver_operator:false};
  if (testMatch && distinctTest) {
    for (const role of testRoles) testSignatures[role] = await verifyPinnedEd25519Signature258(
      test[role].public_key_raw_base64,test[role].signature_base64,
      canonicalTest264(test,role),role === "receiver_operator" ? receiverSignerPin : signerPins[role]);
  }
  const testRequestCandidate = Boolean(testMatch && distinctTest && Object.values(testSignatures).every(Boolean));
  return {
    state: testRequestCandidate ? "SEPARATE_SINGLE_GET_SIGNED_REQUEST_CANDIDATE_HOLD" as const
      : fieldCandidate ? "WINDOWS_SIGNED_FIELD_DECISION_CANDIDATE_COMMS_HOLD" as const
        : "ORIGINAL_WINDOWS_FIELD_AUTHORITY_HOLD" as const,
    fieldCandidate,testRequestCandidate,fieldSignatures,testSignatures,
    runtimeCandidate:restart.signedCandidate,observationDigest:observationHash,
    fieldReceiptDigest:actualFieldHash,
    original_host_authenticated:false as const,
    signed_restart_independently_accepted:false as const,
    private_receiver_authenticated:false as const,
    test_authorized:false as const,challenge_executed:false as const,
    receiver_activated:false as const,comms_connected:false as const,
    remote_requests:0 as const,
    findings:[
      "Windows process and recovery fingerprints are local candidates, not independent original-host identity proof.",
      "A separate signed request is not an executed test, authenticated private receiver, or independent human authorization.",
      "Only the original owners and authenticated Comms private operator can complete the external TEST ceremony.",
      "Do not start a receiver, send a GET, change tasks, or control devices from this evidence review.",
    ],
  };
}
