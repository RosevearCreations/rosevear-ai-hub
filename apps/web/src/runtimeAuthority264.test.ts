import {describe,expect,it} from "vitest";
import {LAUNCH_OBSERVATION_263,SIGNED_RUNTIME_263,canonicalSignedRuntime263,
  digestLauncher263,type LauncherObservation263,type SignedRuntime263} from "./launcherAcceptance263";
import {FIELD_DECISION_264,FIELD_OBSERVATION_264,PRIVATE_TEST_264,canonicalField264,
  canonicalFieldReceipt264,canonicalRuntimeReceipt264,canonicalTest264,digestFieldObservation264,
  parseFieldDecision264,parseTestRequest264,parseWindowsField264,reviewRuntimeAuthority264,
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
async function fixture() {
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

describe("Build 264 field authority and independent Comms TEST ceremony",()=>{
  it("verifies multiple genuine role signatures but does not assert activation or authorization",async()=>{
    const x=await fixture();
    const v=await reviewRuntimeAuthority264(x.args);
    expect(v.runtimeCandidate).toBe(true);
    expect(v.fieldCandidate).toBe(true);
    expect(v.testRequestCandidate).toBe(true);
    expect(v.state).toBe("SEPARATE_SINGLE_GET_SIGNED_REQUEST_CANDIDATE_HOLD");
    expect(Object.values(v.fieldSignatures).every(Boolean)).toBe(true);
    expect(Object.values(v.testSignatures).every(Boolean)).toBe(true);
    expect(v.original_host_authenticated).toBe(false);
    expect(v.signed_restart_independently_accepted).toBe(false);
    expect(v.private_receiver_authenticated).toBe(false);
    expect(v.test_authorized).toBe(false);
    expect(v.challenge_executed).toBe(false);
    expect(v.receiver_activated).toBe(false);
    expect(v.comms_connected).toBe(false);
    expect(v.remote_requests).toBe(0);
    expect(parseWindowsField264(JSON.stringify(x.observation)).recovery_task_state).toBe("enabled");
    expect(parseFieldDecision264(JSON.stringify(x.field)).receiver_state).toBe("OFF");
    expect(parseTestRequest264(JSON.stringify(x.test)).max_requests).toBe(1);
    expect(()=>parseTestRequest264(JSON.stringify({...x.test,test_authorized:true}))).toThrow();
    expect(()=>parseFieldDecision264(JSON.stringify({...x.field,witnessed_restart_accepted:true}))).toThrow();
  });
  it("fails closed on invalid host and recovery readback, forged signature and original key",async()=>{
    const x=await fixture();
    const review=(overrides:Partial<typeof x.args>)=>reviewRuntimeAuthority264({...x.args,...overrides});
    expect((await review({hostPin:"e".repeat(64)})).fieldCandidate).toBe(false);
    expect((await review({fieldObservation:{...x.observation,recovery_last_result:"nonzero"}})).fieldCandidate).toBe(false);
    expect((await review({fieldObservation:{...x.observation,recovery_action_expected:false}})).fieldCandidate).toBe(false);
    expect((await review({trustedOriginalKey:x.keys.owner.publicKey})).fieldCandidate).toBe(false);
    expect((await review({fieldDecision:{...x.field,recovery_action_sha256:"9".repeat(64)}})).fieldCandidate).toBe(false);
    expect((await review({fieldDecision:{...x.field,owner:{...x.field.issuer}}})).fieldCandidate).toBe(false);
    expect((await review({now:"2026-11-07T04:10:00Z"})).testRequestCandidate).toBe(false);
  });
  it("rejects expanded GET scopes and separate owner, receiver, or stop-plan tampering",async()=>{
    const x=await fixture();
    for(const changed of [{...x.test,method:"POST"},{...x.test,max_requests:2},
      {...x.test,receiver_state:"ON"},{...x.test,path:"/api/device/action"},
      {...x.test,scope:"PRODUCTION"},{...x.test,expires_at:"2026-11-07T04:00:00Z"}]) {
      if(changed.expires_at==="2026-11-07T04:00:00Z") {
        expect((await reviewRuntimeAuthority264({...x.args,testRequest:changed as TestRequest264})).testRequestCandidate).toBe(false);
      } else expect(()=>parseTestRequest264(JSON.stringify(changed))).toThrow();
    }
    expect((await reviewRuntimeAuthority264({...x.args,receiverTlsPin:"f".repeat(64)})).testRequestCandidate).toBe(false);
    expect((await reviewRuntimeAuthority264({...x.args,stopPlanPin:"f".repeat(64)})).testRequestCandidate).toBe(false);
    expect((await reviewRuntimeAuthority264({...x.args,testRequest:{...x.test,receiver_operator:{...x.test.owner}}})).testRequestCandidate).toBe(false);
    expect((await reviewRuntimeAuthority264({...x.args,testRequest:{...x.test,challenge_nonce:"b".repeat(32)}})).testRequestCandidate).toBe(false);
  });
  it("refuses forged Windows activation flags and inconsistent nested observations",async()=>{
    const x=await fixture();
    for(const key of ["original_host_authenticated","witnessed_restart_accepted","test_authorized",
      "challenge_executed","receiver_activated","comms_connected","changed_anything"]) {
      expect(()=>parseWindowsField264(JSON.stringify({...x.observation,[key]:true}))).toThrow();
    }
    expect(()=>parseWindowsField264(JSON.stringify({...x.observation,remote_requests:1}))).toThrow();
    expect(()=>parseWindowsField264(JSON.stringify({...x.observation,
      launcher_263:{...x.observation.launcher_263,stage:"before"}}))).toThrow();
  });
});
