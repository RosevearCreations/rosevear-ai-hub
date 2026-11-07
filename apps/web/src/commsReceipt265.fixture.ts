import {LAUNCH_OBSERVATION_263,SIGNED_RUNTIME_263,canonicalSignedRuntime263,
  digestLauncher263,type LauncherObservation263,type SignedRuntime263} from "./launcherAcceptance263";
import {FIELD_DECISION_264,FIELD_OBSERVATION_264,PRIVATE_TEST_264,canonicalField264,
  canonicalFieldReceipt264,canonicalRuntimeReceipt264,canonicalTest264,digestFieldObservation264,
  type FieldDecision264,type TestRequest264,type WindowsField264} from "./runtimeAuthority264";

const release = "a".repeat(40),host = "b".repeat(64),action = "c".repeat(64);
const tls = "d".repeat(64),stop = "e".repeat(64);
const asHex = (v: Uint8Array) => Array.from(v).map(x=>x.toString(16).padStart(2,"0")).join("");
const asBase64 = (v:Uint8Array) => btoa(String.fromCharCode(...v));
const hash = async (v:string) => asHex(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v))));
async function makeKey() {
  const pair = await crypto.subtle.generateKey("Ed25519",true,["sign","verify"]);
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw",pair.publicKey));
  return {pair,publicKey:asBase64(raw),pin:asHex(new Uint8Array(await crypto.subtle.digest("SHA-256",raw)))};
}
const roles = ["issuer","owner","independent_witness"] as const;
const allRoles = [...roles,"receiver_operator"] as const;
function observed(stage:"before"|"after"):LauncherObservation263 {
  const after = stage === "after";
  const launch = (kind:"node"|"python") => ({listener:"observed" as const,kind,
    executable_readable:true,command_line_readable:true,template_match:true,
    checkout_reference_observed:true,stable_listener:true,
    process_started_utc:after ? "2026-11-07T03:05:00Z" : "2026-11-06T17:00:00Z",
    launch_binding_sha256:(after ? kind==="node" ? "f" : "1" : kind==="node" ? "2" : "3").repeat(64)});
  return {schema:LAUNCH_OBSERVATION_263,source:"on_device_read_only",stage,
    observed_at:after ? "2026-11-07T03:10:00Z" : "2026-11-07T03:00:00Z",
    release_sha_candidate:release,recovery_mode:"Legacy",expected_recovery_action_matches:true,
    web:launch("node"),backend:launch("python"),original_launcher_custody_attested:false,
    supervised_restart_attested:false,independently_signed_runtime_accepted:false,
    test_authorized:false,challenge_executed:false,receiver_activated:false,
    comms_connected:false,changed_anything:false,remote_requests:0};
}
export async function fixture() {
  const keys = {issuer:await makeKey(),owner:await makeKey(),independent_witness:await makeKey(),
    receiver_operator:await makeKey()};
  const before = observed("before"),after = observed("after");
  const runtime:SignedRuntime263 = {schema:SIGNED_RUNTIME_263,release_sha:release,
    before_sha256:await digestLauncher263(before),after_sha256:await digestLauncher263(after),
    after_web_binding_sha256:after.web.launch_binding_sha256!,
    after_backend_binding_sha256:after.backend.launch_binding_sha256!,
    signed_at:"2026-11-07T03:12:00Z",expires_at:"2026-11-07T03:40:00Z",
    scope:"LOCAL_SUPERVISED_RESTART_REVIEW_ONLY",receiver_state:"OFF",
    issuer:{public_key_raw_base64:keys.issuer.publicKey,signature_base64:""},
    owner:{public_key_raw_base64:keys.owner.publicKey,signature_base64:""},
    independent_witness:{public_key_raw_base64:keys.independent_witness.publicKey,signature_base64:""}};
  const sign = async (role:typeof allRoles[number],message:string) => asBase64(new Uint8Array(
    await crypto.subtle.sign("Ed25519",keys[role].pair.privateKey,new TextEncoder().encode(message))));
  for (const role of roles) runtime[role].signature_base64 = await sign(role,canonicalSignedRuntime263(runtime,role));
  const observation:WindowsField264 = {schema:FIELD_OBSERVATION_264,source:"on_device_read_only",
    stage:"after",observed_at:"2026-11-07T03:10:10Z",release_sha_candidate:release,
    launcher_263:after,host_binding_candidate_sha256:host,recovery_action_candidate_sha256:action,
    recovery_task_state:"enabled",recovery_last_result:"success",recovery_action_expected:true,
    original_host_authenticated:false,witnessed_restart_accepted:false,test_authorized:false,
    challenge_executed:false,receiver_activated:false,comms_connected:false,
    changed_anything:false,remote_requests:0};
  const field:FieldDecision264 = {schema:FIELD_DECISION_264,release_sha:release,
    runtime_receipt_sha256:await hash(canonicalRuntimeReceipt264(runtime)),
    after_observation_sha256:await digestFieldObservation264(observation),
    host_binding_sha256:host,recovery_action_sha256:action,
    signed_at:"2026-11-07T03:15:00Z",expires_at:"2026-11-07T03:38:00Z",
    decision:"ACCEPT_RESTART_EVIDENCE_FOR_LOCAL_REVIEW_ONLY",receiver_state:"OFF",
    issuer:{public_key_raw_base64:keys.issuer.publicKey,signature_base64:""},
    owner:{public_key_raw_base64:keys.owner.publicKey,signature_base64:""},
    independent_witness:{public_key_raw_base64:keys.independent_witness.publicKey,signature_base64:""}};
  for (const role of roles) field[role].signature_base64 = await sign(role,canonicalField264(field,role));
  const test:TestRequest264 = {schema:PRIVATE_TEST_264,release_sha:release,
    field_decision_sha256:await hash(canonicalFieldReceipt264(field)),challenge_nonce:"a".repeat(32),
    receiver_signer_pin_sha256:keys.receiver_operator.pin,receiver_tls_pin_sha256:tls,
    stop_plan_sha256:stop,signed_at:"2026-11-07T03:18:00Z",expires_at:"2026-11-07T03:27:00Z",
    method:"GET",path:"/api/integration/v1/health",target:"rosevear-comms-hub",
    scope:"PRIVATE_NONPRODUCTION_SINGLE_GET_ONLY",max_requests:1,receiver_state:"OFF",
    decision:"REQUEST_SEPARATE_SUPERVISED_TEST",
    issuer:{public_key_raw_base64:keys.issuer.publicKey,signature_base64:""},
    owner:{public_key_raw_base64:keys.owner.publicKey,signature_base64:""},
    independent_witness:{public_key_raw_base64:keys.independent_witness.publicKey,signature_base64:""},
    receiver_operator:{public_key_raw_base64:keys.receiver_operator.publicKey,signature_base64:""}};
  for (const role of allRoles) test[role].signature_base64 = await sign(role,canonicalTest264(test,role));
  const pins = {issuer:keys.issuer.pin,owner:keys.owner.pin,independent_witness:keys.independent_witness.pin};
  const args = {before,fieldObservation:observation,runtime,fieldDecision:field,testRequest:test,
    expectedRelease:release,trustedOriginalKey:keys.issuer.publicKey,signerPins:pins,
    receiverSignerPin:keys.receiver_operator.pin,receiverTlsPin:tls,stopPlanPin:stop,
    hostPin:host,now:"2026-11-07T03:20:00Z"};
  return {args,keys,field,test,observation};
}
