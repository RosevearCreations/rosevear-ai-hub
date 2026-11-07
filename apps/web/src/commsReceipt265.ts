import {verifyPinnedEd25519Signature258} from "./processIdentity258";
import {canonicalTest264,reviewRuntimeAuthority264,type TestRequest264} from "./runtimeAuthority264";
import type {SignedRole263} from "./launcherAcceptance263";

export const PRIVATE_GET_265 = "rosevear-comms-first-private-get-265/v1";
export const SHUTDOWN_265 = "rosevear-comms-private-receiver-shutdown-265/v1";
export const OWNER_ACCEPTANCE_265 = "rosevear-comms-cross-device-owner-acceptance-265/v1";
const sha64 = /^[a-f0-9]{64}$/;
const sha40 = /^[a-f0-9]{40}$/;
const b64 = /^[A-Za-z0-9+/]+={0,2}$/;
const validTime = (x:unknown):x is string => typeof x === "string"
  && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(x)
  && Number.isFinite(Date.parse(x)) && new Date(x).toISOString() === x.replace("Z",".000Z");
const exactKeys = (v:Record<string,unknown>,keys:string[]) => Object.keys(v).length === keys.length
  && keys.every(k => Object.prototype.hasOwnProperty.call(v,k));
function parse(source:string,limit=7000):Record<string,unknown> {
  if(source.length>limit) throw new Error("Private evidence exceeds its file limit.");
  let data:unknown;
  try {data=JSON.parse(source);} catch {throw new Error("Private evidence must be valid JSON.");}
  if(!data || typeof data!=="object" || Array.isArray(data)) throw new Error("Evidence must be a JSON object.");
  return data as Record<string,unknown>;
}
function signature(v:unknown):SignedRole263 {
  if(!v || typeof v!=="object" || Array.isArray(v)) throw new Error("Missing independent signed role.");
  const s=v as Record<string,unknown>;
  if(!exactKeys(s,["public_key_raw_base64","signature_base64"])
    || typeof s.public_key_raw_base64!=="string" || s.public_key_raw_base64.length!==44
    || !b64.test(s.public_key_raw_base64) || typeof s.signature_base64!=="string"
    || s.signature_base64.length!==88 || !b64.test(s.signature_base64))
    throw new Error("Malformed or extra signing fields.");
  return {public_key_raw_base64:s.public_key_raw_base64,signature_base64:s.signature_base64};
}
async function digest(text:string) {
  const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes)).map(c=>c.toString(16).padStart(2,"0")).join("");
}
export const canonicalSignedRequest265 = (request:TestRequest264) => [
  canonicalTest264(request,"issuer"),
  ...(["issuer","owner","independent_witness","receiver_operator"] as const)
    .flatMap(r=>[r,request[r].public_key_raw_base64,request[r].signature_base64]),"",
].join("\n");

export type PrivateGet265 = {
  schema:typeof PRIVATE_GET_265; source_system:"rosevear-ai-hub"; target:"rosevear-comms-hub";
  release_sha:string; signed_request_sha256:string; challenge_nonce:string;
  method:"GET"; path:"/api/integration/v1/health"|"/api/integration/v1/capabilities";
  http_status:200; response_body_sha256:string; audit_record_sha256:string;
  nonce_ledger_sha256:string; receiver_signer_pin_sha256:string; receiver_tls_pin_sha256:string;
  received_at:string; receiver_operator:SignedRole263;
};
const getFields=(x:PrivateGet265)=>[x.schema,x.source_system,x.target,x.release_sha,
  x.signed_request_sha256,x.challenge_nonce,x.method,x.path,String(x.http_status),
  x.response_body_sha256,x.audit_record_sha256,x.nonce_ledger_sha256,
  x.receiver_signer_pin_sha256,x.receiver_tls_pin_sha256,x.received_at];
export const canonicalPrivateGet265=(x:PrivateGet265)=>[...getFields(x),"receiver_operator",""].join("\n");
export const canonicalSignedGet265=(x:PrivateGet265)=>[...getFields(x),
  "receiver_operator",x.receiver_operator.public_key_raw_base64,x.receiver_operator.signature_base64,""].join("\n");
export function parsePrivateGet265(source:string):PrivateGet265 {
  const x=parse(source);
  if(!exactKeys(x,["schema","source_system","target","release_sha","signed_request_sha256",
    "challenge_nonce","method","path","http_status","response_body_sha256",
    "audit_record_sha256","nonce_ledger_sha256","receiver_signer_pin_sha256",
    "receiver_tls_pin_sha256","received_at","receiver_operator"])
    || x.schema!==PRIVATE_GET_265 || x.source_system!=="rosevear-ai-hub" || x.target!=="rosevear-comms-hub"
    || typeof x.release_sha!=="string" || !sha40.test(x.release_sha)
    || [x.signed_request_sha256,x.response_body_sha256,x.audit_record_sha256,
      x.nonce_ledger_sha256,x.receiver_signer_pin_sha256,x.receiver_tls_pin_sha256]
      .some(v=>typeof v!=="string" || !sha64.test(v))
    || typeof x.challenge_nonce!=="string" || !/^[a-f0-9]{32}$/.test(x.challenge_nonce)
    || x.method!=="GET" || !["/api/integration/v1/health","/api/integration/v1/capabilities"].includes(String(x.path))
    || x.http_status!==200 || !validTime(x.received_at))
    throw new Error("Untrusted private GET receipt, wrong scope or unauthorized response.");
  return {...x,receiver_operator:signature(x.receiver_operator)} as PrivateGet265;
}

export type Shutdown265 = {
  schema:typeof SHUTDOWN_265; signed_request_sha256:string; get_receipt_sha256:string;
  nonce_ledger_sha256:string; stop_plan_sha256:string; receiver_state_after:"OFF";
  credentials_state:"REVOKED"; nonce_state:"CONSUMED"; audit_state:"DURABLE";
  shutdown_at:string; independent_checked_at:string;
  receiver_operator:SignedRole263; independent_witness:SignedRole263;
};
const shutdownFields=(x:Shutdown265)=>[x.schema,x.signed_request_sha256,x.get_receipt_sha256,
  x.nonce_ledger_sha256,x.stop_plan_sha256,x.receiver_state_after,x.credentials_state,
  x.nonce_state,x.audit_state,x.shutdown_at,x.independent_checked_at];
export const canonicalShutdown265=(x:Shutdown265,role:"receiver_operator"|"independent_witness")=>
  [...shutdownFields(x),role,""].join("\n");
export const canonicalSignedShutdown265=(x:Shutdown265)=>[...shutdownFields(x),
  ...(["receiver_operator","independent_witness"] as const)
    .flatMap(r=>[r,x[r].public_key_raw_base64,x[r].signature_base64]),""].join("\n");
export function parseShutdown265(source:string):Shutdown265 {
  const x=parse(source);
  if(!exactKeys(x,["schema","signed_request_sha256","get_receipt_sha256",
    "nonce_ledger_sha256","stop_plan_sha256","receiver_state_after","credentials_state",
    "nonce_state","audit_state","shutdown_at","independent_checked_at","receiver_operator","independent_witness"])
    || x.schema!==SHUTDOWN_265
    || [x.signed_request_sha256,x.get_receipt_sha256,x.nonce_ledger_sha256,x.stop_plan_sha256]
      .some(v=>typeof v!=="string" || !sha64.test(v))
    || x.receiver_state_after!=="OFF" || x.credentials_state!=="REVOKED"
    || x.nonce_state!=="CONSUMED" || x.audit_state!=="DURABLE"
    || !validTime(x.shutdown_at) || !validTime(x.independent_checked_at))
    throw new Error("Receiver shutdown/revocation evidence is missing or contradictory.");
  return {...x,receiver_operator:signature(x.receiver_operator),
    independent_witness:signature(x.independent_witness)} as Shutdown265;
}

export type CrossDeviceAcceptance265={
  schema:typeof OWNER_ACCEPTANCE_265; release_sha:string; get_receipt_sha256:string;
  shutdown_receipt_sha256:string; original_host_candidate_sha256:string;
  signed_at:string; expires_at:string; decision:"ACCEPT_SIGNED_TEST_EVIDENCE_FOR_REVIEW_ONLY";
  connection_state:"DISCONNECTED / HOLD"; owner:SignedRole263; independent_witness:SignedRole263;
};
const acceptanceFields=(x:CrossDeviceAcceptance265)=>[x.schema,x.release_sha,x.get_receipt_sha256,
  x.shutdown_receipt_sha256,x.original_host_candidate_sha256,x.signed_at,x.expires_at,
  x.decision,x.connection_state];
export const canonicalAcceptance265=(x:CrossDeviceAcceptance265,role:"owner"|"independent_witness")=>
  [...acceptanceFields(x),role,""].join("\n");
export function parseAcceptance265(source:string):CrossDeviceAcceptance265 {
  const x=parse(source);
  if(!exactKeys(x,["schema","release_sha","get_receipt_sha256","shutdown_receipt_sha256",
    "original_host_candidate_sha256","signed_at","expires_at","decision","connection_state",
    "owner","independent_witness"])
    || x.schema!==OWNER_ACCEPTANCE_265 || typeof x.release_sha!=="string" || !sha40.test(x.release_sha)
    || [x.get_receipt_sha256,x.shutdown_receipt_sha256,x.original_host_candidate_sha256]
      .some(v=>typeof v!=="string" || !sha64.test(v))
    || !validTime(x.signed_at) || !validTime(x.expires_at)
    || x.decision!=="ACCEPT_SIGNED_TEST_EVIDENCE_FOR_REVIEW_ONLY"
    || x.connection_state!=="DISCONNECTED / HOLD")
    throw new Error("Untrusted or overbroad cross-device owner acceptance.");
  return {...x,owner:signature(x.owner),independent_witness:signature(x.independent_witness)} as CrossDeviceAcceptance265;
}

export type PriorProof264=Omit<Parameters<typeof reviewRuntimeAuthority264>[0],"now">;
export async function reviewCommsReceipt265(previous:PriorProof264|null,first:PrivateGet265|null,
  shutdown:Shutdown265|null,acceptance:CrossDeviceAcceptance265|null,now:string) {
  const missing={state:"FIRST_PRIVATE_GET_AND_SHUTDOWN_EVIDENCE_HOLD" as const,
    requestCandidate:false,verifiedGetCandidate:false,shutdownCandidate:false,
    crossDeviceCandidate:false,original_receiver_independently_authenticated:false as const,
    actual_get_independently_verified:false as const,shutdown_independently_verified:false as const,
    owner_external_acceptance_verified:false as const,test_authorized:false as const,
    challenge_executed:false as const,receiver_activated:false as const,
    comms_connected:false as const,connection_state:"DISCONNECTED / HOLD" as const,
    remote_requests:0 as const};
  if(!previous || !first || !shutdown || !acceptance) return missing;
  // Historical review time is the *claimed* GET instant: this checks that the request
  // signature would have been in scope then, never that we have authorized a fresh GET now.
  const prior=await reviewRuntimeAuthority264({...previous,now:first.received_at});
  if(!prior.testRequestCandidate) return missing;
  const request=previous.testRequest;
  const requestHash=await digest(canonicalSignedRequest265(request));
  const timeGet=Date.parse(first.received_at),timeRequest=Date.parse(request.signed_at);
  const getFieldsMatch=first.release_sha===previous.expectedRelease && first.signed_request_sha256===requestHash
    && first.challenge_nonce===request.challenge_nonce && first.method===request.method
    && first.path===request.path && first.receiver_signer_pin_sha256===previous.receiverSignerPin
    && first.receiver_tls_pin_sha256===previous.receiverTlsPin
    && first.receiver_operator.public_key_raw_base64===request.receiver_operator.public_key_raw_base64
    && timeGet>=timeRequest && timeGet<=Date.parse(request.expires_at);
  const getSigned=getFieldsMatch && await verifyPinnedEd25519Signature258(
    first.receiver_operator.public_key_raw_base64,first.receiver_operator.signature_base64,
    canonicalPrivateGet265(first),previous.receiverSignerPin);
  const getHash=await digest(canonicalSignedGet265(first));
  const timeShutdown=Date.parse(shutdown.shutdown_at),timeWitness=Date.parse(shutdown.independent_checked_at);
  const shutdownMatched=Boolean(getSigned && shutdown.signed_request_sha256===requestHash
    && shutdown.get_receipt_sha256===getHash
    && shutdown.nonce_ledger_sha256===first.nonce_ledger_sha256
    && shutdown.stop_plan_sha256===previous.stopPlanPin
    && timeShutdown>=timeGet && timeShutdown-timeGet<=5*60000
    && timeWitness>=timeShutdown && timeWitness-timeShutdown<=2*60000
    && shutdown.receiver_operator.public_key_raw_base64===request.receiver_operator.public_key_raw_base64
    && shutdown.independent_witness.public_key_raw_base64===request.independent_witness.public_key_raw_base64);
  const shutdownSigned=Boolean(shutdownMatched && (await Promise.all([
    verifyPinnedEd25519Signature258(shutdown.receiver_operator.public_key_raw_base64,
      shutdown.receiver_operator.signature_base64,canonicalShutdown265(shutdown,"receiver_operator"),
      previous.receiverSignerPin),
    verifyPinnedEd25519Signature258(shutdown.independent_witness.public_key_raw_base64,
      shutdown.independent_witness.signature_base64,canonicalShutdown265(shutdown,"independent_witness"),
      previous.signerPins.independent_witness),
  ])).every(Boolean));
  const shutdownHash=await digest(canonicalSignedShutdown265(shutdown));
  const acceptanceAt=Date.parse(acceptance.signed_at),expireAt=Date.parse(acceptance.expires_at),nowAt=Date.parse(now);
  const acceptedFields=Boolean(shutdownSigned && acceptance.release_sha===previous.expectedRelease
    && acceptance.get_receipt_sha256===getHash
    && acceptance.shutdown_receipt_sha256===shutdownHash
    && acceptance.original_host_candidate_sha256===previous.hostPin
    && acceptance.owner.public_key_raw_base64===request.owner.public_key_raw_base64
    && acceptance.independent_witness.public_key_raw_base64===request.independent_witness.public_key_raw_base64
    && acceptanceAt>=timeWitness && acceptanceAt-timeWitness<=30*60000
    && expireAt>acceptanceAt && expireAt-acceptanceAt<=24*3600000
    && nowAt>=acceptanceAt && nowAt<=expireAt);
  const acceptanceSigned=Boolean(acceptedFields && (await Promise.all([
    verifyPinnedEd25519Signature258(acceptance.owner.public_key_raw_base64,
      acceptance.owner.signature_base64,canonicalAcceptance265(acceptance,"owner"),previous.signerPins.owner),
    verifyPinnedEd25519Signature258(acceptance.independent_witness.public_key_raw_base64,
      acceptance.independent_witness.signature_base64,canonicalAcceptance265(acceptance,"independent_witness"),
      previous.signerPins.independent_witness),
  ])).every(Boolean));
  return {
    ...missing,
    state:acceptanceSigned ? "SIGNED_GET_SHUTDOWN_AND_OWNER_CANDIDATE_EXTERNAL_HOLD" as const
      : shutdownSigned ? "SIGNED_SHUTDOWN_CANDIDATE_OWNER_HOLD" as const
        : getSigned ? "SIGNED_PRIVATE_GET_CANDIDATE_SHUTDOWN_HOLD" as const
          : "FIRST_PRIVATE_GET_AND_SHUTDOWN_EVIDENCE_HOLD" as const,
    requestCandidate:prior.testRequestCandidate,verifiedGetCandidate:Boolean(getSigned),
    shutdownCandidate:Boolean(shutdownSigned),crossDeviceCandidate:Boolean(acceptanceSigned),
  };
}
