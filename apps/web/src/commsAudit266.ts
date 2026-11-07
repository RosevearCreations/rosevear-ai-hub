import {verifyPinnedEd25519Signature258} from "./processIdentity258";
import {canonicalSignedRequest265,canonicalSignedGet265,canonicalSignedShutdown265,
  canonicalSignedAcceptance265,reviewCommsReceipt265,type PriorProof264,
  type PrivateGet265,type Shutdown265,type CrossDeviceAcceptance265} from "./commsReceipt265";
import type {SignedRole263} from "./launcherAcceptance263";

export const RECEIVER_AUDIT_266 = "rosevear-comms-original-receiver-audit-readback-266/v1";
export const NONCE_CLOSURE_266 = "rosevear-comms-independent-nonce-closure-266/v1";
export const OWNER_TRANSITION_266 = "rosevear-comms-owner-connection-candidate-266/v1";
const hash64=/^[a-f0-9]{64}$/;
const hash40=/^[a-f0-9]{40}$/;
const base64=/^[A-Za-z0-9+/]+={0,2}$/;
const timeValid=(s:unknown):s is string=>typeof s==="string"
  && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(s)
  && Number.isFinite(Date.parse(s)) && new Date(s).toISOString()===s.replace("Z",".000Z");
const keys=(x:Record<string,unknown>,list:string[])=>Object.keys(x).length===list.length
  && list.every(k=>Object.prototype.hasOwnProperty.call(x,k));
const hashes=(xs:unknown[])=>xs.every(x=>typeof x==="string"&&hash64.test(x));
function parse(text:string):Record<string,unknown> {
  if(text.length>9000) throw new Error("Independent original-host evidence exceeds 9 KB.");
  let x:unknown;
  try {x=JSON.parse(text);} catch {throw new Error("Original-host evidence must be JSON.");}
  if(!x||typeof x!=="object"||Array.isArray(x)) throw new Error("Evidence must be a JSON object.");
  return x as Record<string,unknown>;
}
function role(value:unknown):SignedRole263 {
  if(!value||typeof value!=="object"||Array.isArray(value)) throw new Error("Missing signer identity.");
  const x=value as Record<string,unknown>;
  if(!keys(x,["public_key_raw_base64","signature_base64"])
    || typeof x.public_key_raw_base64!=="string" || x.public_key_raw_base64.length!==44
    || !base64.test(x.public_key_raw_base64)
    || typeof x.signature_base64!=="string" || x.signature_base64.length!==88
    || !base64.test(x.signature_base64)) throw new Error("Invalid or extra signer fields.");
  return {public_key_raw_base64:x.public_key_raw_base64,signature_base64:x.signature_base64};
}
async function digest(value:string) {
  const bytes=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)));
  return Array.from(bytes).map(x=>x.toString(16).padStart(2,"0")).join("");
}

/** Signed record from the *original* private receiver. Uploading one is not independent proof of origin. */
export type ReceiverAudit266={
  schema:typeof RECEIVER_AUDIT_266; release_sha:string; signed_request_sha256:string;
  get_receipt_sha256:string; shutdown_receipt_sha256:string; acceptance_receipt_sha256:string;
  audit_record_sha256:string; nonce_ledger_sha256:string;
  receiver_signer_pin_sha256:string; receiver_tls_pin_sha256:string;
  source_enrollment_sha256:string; audit_snapshot_sha256:string;
  revocation_ledger_sha256:string; nonce_tombstone_sha256:string;
  accepted_get_count:1; accepted_nonce_count:1; receiver_state:"OFF";
  credential_state:"REVOKED"; nonce_state:"CONSUMED";
  observed_at:string; receiver_operator:SignedRole263;
};
const auditFields=(x:ReceiverAudit266)=>[x.schema,x.release_sha,x.signed_request_sha256,
  x.get_receipt_sha256,x.shutdown_receipt_sha256,x.acceptance_receipt_sha256,
  x.audit_record_sha256,x.nonce_ledger_sha256,x.receiver_signer_pin_sha256,
  x.receiver_tls_pin_sha256,x.source_enrollment_sha256,x.audit_snapshot_sha256,
  x.revocation_ledger_sha256,x.nonce_tombstone_sha256,String(x.accepted_get_count),
  String(x.accepted_nonce_count),x.receiver_state,x.credential_state,x.nonce_state,x.observed_at];
export const canonicalReceiverAudit266=(x:ReceiverAudit266)=>[...auditFields(x),"receiver_operator",""].join("\n");
export const canonicalSignedReceiverAudit266=(x:ReceiverAudit266)=>[...auditFields(x),
  "receiver_operator",x.receiver_operator.public_key_raw_base64,x.receiver_operator.signature_base64,""].join("\n");
export function parseReceiverAudit266(source:string):ReceiverAudit266 {
  const x=parse(source);
  if(!keys(x,["schema","release_sha","signed_request_sha256","get_receipt_sha256",
    "shutdown_receipt_sha256","acceptance_receipt_sha256","audit_record_sha256","nonce_ledger_sha256",
    "receiver_signer_pin_sha256","receiver_tls_pin_sha256","source_enrollment_sha256",
    "audit_snapshot_sha256","revocation_ledger_sha256","nonce_tombstone_sha256",
    "accepted_get_count","accepted_nonce_count","receiver_state","credential_state",
    "nonce_state","observed_at","receiver_operator"])
    || x.schema!==RECEIVER_AUDIT_266 || typeof x.release_sha!=="string"||!hash40.test(x.release_sha)
    || !hashes([x.signed_request_sha256,x.get_receipt_sha256,x.shutdown_receipt_sha256,
      x.acceptance_receipt_sha256,x.audit_record_sha256,x.nonce_ledger_sha256,
      x.receiver_signer_pin_sha256,x.receiver_tls_pin_sha256,x.source_enrollment_sha256,
      x.audit_snapshot_sha256,x.revocation_ledger_sha256,x.nonce_tombstone_sha256])
    || x.accepted_get_count!==1 || x.accepted_nonce_count!==1 || x.receiver_state!=="OFF"
    || x.credential_state!=="REVOKED" || x.nonce_state!=="CONSUMED"||!timeValid(x.observed_at))
    throw new Error("Untrusted original private receiver audit or invalid request counts.");
  return {...x,receiver_operator:role(x.receiver_operator)} as ReceiverAudit266;
}

/** Independent device's signed readback of the *same* immutable ledger snapshot. No replay GET is sent. */
export type NonceClosure266={
  schema:typeof NONCE_CLOSURE_266; audit_readback_sha256:string;
  signed_request_sha256:string; challenge_nonce:string;
  source_enrollment_sha256:string; audit_snapshot_sha256:string;
  revocation_ledger_sha256:string; nonce_tombstone_sha256:string;
  accepted_get_count:1; accepted_nonce_count:1; duplicate_get_count:0;
  replay_guard:"CONSUMED_NONCE_DENY_REUSE"; no_replay_get_sent:true;
  receiver_state:"OFF"; credential_state:"REVOKED";
  independently_observed_at:string; independent_witness:SignedRole263;
};
const closureFields=(x:NonceClosure266)=>[x.schema,x.audit_readback_sha256,
  x.signed_request_sha256,x.challenge_nonce,x.source_enrollment_sha256,
  x.audit_snapshot_sha256,x.revocation_ledger_sha256,x.nonce_tombstone_sha256,
  String(x.accepted_get_count),String(x.accepted_nonce_count),String(x.duplicate_get_count),
  x.replay_guard,String(x.no_replay_get_sent),x.receiver_state,x.credential_state,
  x.independently_observed_at];
export const canonicalNonceClosure266=(x:NonceClosure266)=>[...closureFields(x),"independent_witness",""].join("\n");
export const canonicalSignedNonceClosure266=(x:NonceClosure266)=>[...closureFields(x),
  "independent_witness",x.independent_witness.public_key_raw_base64,
  x.independent_witness.signature_base64,""].join("\n");
export function parseNonceClosure266(source:string):NonceClosure266 {
  const x=parse(source);
  if(!keys(x,["schema","audit_readback_sha256","signed_request_sha256","challenge_nonce",
    "source_enrollment_sha256","audit_snapshot_sha256","revocation_ledger_sha256",
    "nonce_tombstone_sha256","accepted_get_count","accepted_nonce_count","duplicate_get_count",
    "replay_guard","no_replay_get_sent","receiver_state","credential_state",
    "independently_observed_at","independent_witness"])
    || x.schema!==NONCE_CLOSURE_266
    || !hashes([x.audit_readback_sha256,x.signed_request_sha256,x.source_enrollment_sha256,
      x.audit_snapshot_sha256,x.revocation_ledger_sha256,x.nonce_tombstone_sha256])
    || typeof x.challenge_nonce!=="string" || !/^[a-f0-9]{32}$/.test(x.challenge_nonce)
    || x.accepted_get_count!==1 || x.accepted_nonce_count!==1 || x.duplicate_get_count!==0
    || x.replay_guard!=="CONSUMED_NONCE_DENY_REUSE" || x.no_replay_get_sent!==true
    || x.receiver_state!=="OFF"||x.credential_state!=="REVOKED"||!timeValid(x.independently_observed_at))
    throw new Error("Nonce replay closure is contradictory or permits a second GET.");
  return {...x,independent_witness:role(x.independent_witness)} as NonceClosure266;
}

/** A separately scoped *candidate*, never permission to activate a receiver or connect apps. */
export type OwnerTransition266={
  schema:typeof OWNER_TRANSITION_266; release_sha:string;
  audit_readback_sha256:string; nonce_closure_sha256:string;
  original_acceptance_sha256:string; nonce_tombstone_sha256:string;
  source_enrollment_sha256:string; signed_at:string; expires_at:string;
  decision:"REVIEW_READ_ONLY_CONNECTION_CANDIDATE_ONLY";
  connection_state:"DISCONNECTED / HOLD";
  owner:SignedRole263; independent_witness:SignedRole263;
};
const transitionFields=(x:OwnerTransition266)=>[x.schema,x.release_sha,x.audit_readback_sha256,
  x.nonce_closure_sha256,x.original_acceptance_sha256,x.nonce_tombstone_sha256,
  x.source_enrollment_sha256,x.signed_at,x.expires_at,x.decision,x.connection_state];
export const canonicalOwnerTransition266=(x:OwnerTransition266,signer:"owner"|"independent_witness")=>
  [...transitionFields(x),signer,""].join("\n");
export function parseOwnerTransition266(source:string):OwnerTransition266 {
  const x=parse(source);
  if(!keys(x,["schema","release_sha","audit_readback_sha256","nonce_closure_sha256",
    "original_acceptance_sha256","nonce_tombstone_sha256","source_enrollment_sha256",
    "signed_at","expires_at","decision","connection_state","owner","independent_witness"])
    || x.schema!==OWNER_TRANSITION_266 || typeof x.release_sha!=="string"||!hash40.test(x.release_sha)
    || !hashes([x.audit_readback_sha256,x.nonce_closure_sha256,x.original_acceptance_sha256,
      x.nonce_tombstone_sha256,x.source_enrollment_sha256])
    || !timeValid(x.signed_at)||!timeValid(x.expires_at)
    || x.decision!=="REVIEW_READ_ONLY_CONNECTION_CANDIDATE_ONLY"
    || x.connection_state!=="DISCONNECTED / HOLD")
    throw new Error("Owner decision cannot enable a Comms connection.");
  return {...x,owner:role(x.owner),independent_witness:role(x.independent_witness)} as OwnerTransition266;
}

export async function reviewOriginalAudit266(prior:PriorProof264|null,get:PrivateGet265|null,
  shutdown:Shutdown265|null,acceptance:CrossDeviceAcceptance265|null,
  audit:ReceiverAudit266|null,closure:NonceClosure266|null,decision:OwnerTransition266|null,now:string) {
  const hold={state:"ORIGINAL_RECEIVER_AUDIT_READBACK_HOLD" as string,
    auditCandidate:false,independentReadbackCandidate:false,nonceReplayClosureCandidate:false,
    ownerTransitionCandidate:false,original_receiver_audit_independently_verified:false as const,
    source_enrollment_independently_verified:false as const,
    nonce_ledger_independently_verified:false as const,
    owner_external_authorization_verified:false as const,
    connection_candidate_authorized:false as const,receiver_activated:false as const,
    comms_connected:false as const,connection_state:"DISCONNECTED / HOLD" as const,
    remote_requests:0 as const};
  if(!prior||!get||!shutdown||!acceptance||!audit||!closure||!decision||!timeValid(now)) return hold;
  // Revalidate the entire historical 263/264/265 signature chain against the *decision* instant.
  // This is archival verification only and cannot extend an expired GET or activate a receiver.
  const older=await reviewCommsReceipt265(prior,get,shutdown,acceptance,decision.signed_at);
  if(!older.crossDeviceCandidate) return hold;
  const requestHash=await digest(canonicalSignedRequest265(prior.testRequest));
  const getHash=await digest(canonicalSignedGet265(get));
  const shutdownHash=await digest(canonicalSignedShutdown265(shutdown));
  const acceptanceHash=await digest(canonicalSignedAcceptance265(acceptance));
  const auditAt=Date.parse(audit.observed_at),shutdownAt=Date.parse(shutdown.shutdown_at);
  const auditMatched=audit.schema===RECEIVER_AUDIT_266 && audit.release_sha===prior.expectedRelease
    && audit.signed_request_sha256===requestHash
    && audit.get_receipt_sha256===getHash && audit.shutdown_receipt_sha256===shutdownHash
    && audit.acceptance_receipt_sha256===acceptanceHash
    && audit.audit_record_sha256===get.audit_record_sha256
    && audit.nonce_ledger_sha256===shutdown.nonce_ledger_sha256
    && audit.receiver_signer_pin_sha256===prior.receiverSignerPin
    && audit.receiver_tls_pin_sha256===prior.receiverTlsPin
    && audit.receiver_operator.public_key_raw_base64===get.receiver_operator.public_key_raw_base64
    && auditAt>=Date.parse(acceptance.signed_at) && auditAt>=shutdownAt
    && auditAt-shutdownAt<=30*60000 && audit.accepted_get_count===1
    && audit.accepted_nonce_count===1 && audit.receiver_state==="OFF"
    && audit.credential_state==="REVOKED" && audit.nonce_state==="CONSUMED";
  const auditSigned=Boolean(auditMatched && await verifyPinnedEd25519Signature258(
    audit.receiver_operator.public_key_raw_base64,audit.receiver_operator.signature_base64,
    canonicalReceiverAudit266(audit),prior.receiverSignerPin));
  const auditHash=await digest(canonicalSignedReceiverAudit266(audit));
  const closureAt=Date.parse(closure.independently_observed_at);
  const closureMatched=Boolean(auditSigned && closure.schema===NONCE_CLOSURE_266
    && closure.audit_readback_sha256===auditHash
    && closure.signed_request_sha256===requestHash
    && closure.challenge_nonce===prior.testRequest.challenge_nonce
    && closure.source_enrollment_sha256===audit.source_enrollment_sha256
    && closure.audit_snapshot_sha256===audit.audit_snapshot_sha256
    && closure.revocation_ledger_sha256===audit.revocation_ledger_sha256
    && closure.nonce_tombstone_sha256===audit.nonce_tombstone_sha256
    && closure.accepted_get_count===1 && closure.accepted_nonce_count===1
    && closure.duplicate_get_count===0 && closure.no_replay_get_sent===true
    && closure.replay_guard==="CONSUMED_NONCE_DENY_REUSE"
    && closure.receiver_state==="OFF" && closure.credential_state==="REVOKED"
    && closureAt>=auditAt && closureAt-auditAt<=10*60000
    && closure.independent_witness.public_key_raw_base64===acceptance.independent_witness.public_key_raw_base64
    && closure.independent_witness.public_key_raw_base64!==audit.receiver_operator.public_key_raw_base64);
  const closureSigned=Boolean(closureMatched && await verifyPinnedEd25519Signature258(
    closure.independent_witness.public_key_raw_base64,closure.independent_witness.signature_base64,
    canonicalNonceClosure266(closure),prior.signerPins.independent_witness));
  const closureHash=await digest(canonicalSignedNonceClosure266(closure));
  const decisionAt=Date.parse(decision.signed_at),expiresAt=Date.parse(decision.expires_at),nowAt=Date.parse(now);
  const decisionMatched=Boolean(closureSigned && decision.schema===OWNER_TRANSITION_266
    && decision.decision==="REVIEW_READ_ONLY_CONNECTION_CANDIDATE_ONLY"
    && decision.connection_state==="DISCONNECTED / HOLD"
    && decision.release_sha===prior.expectedRelease
    && decision.audit_readback_sha256===auditHash && decision.nonce_closure_sha256===closureHash
    && decision.original_acceptance_sha256===acceptanceHash
    && decision.nonce_tombstone_sha256===audit.nonce_tombstone_sha256
    && decision.source_enrollment_sha256===audit.source_enrollment_sha256
    && decision.owner.public_key_raw_base64===acceptance.owner.public_key_raw_base64
    && decision.independent_witness.public_key_raw_base64===closure.independent_witness.public_key_raw_base64
    && decisionAt>=closureAt && decisionAt-closureAt<=30*60000
    && decisionAt<=Date.parse(acceptance.expires_at)
    && expiresAt>decisionAt && expiresAt-decisionAt<=24*3600000
    && nowAt>=decisionAt && nowAt<=expiresAt);
  const decisionSigned=Boolean(decisionMatched && (await Promise.all([
    verifyPinnedEd25519Signature258(decision.owner.public_key_raw_base64,
      decision.owner.signature_base64,canonicalOwnerTransition266(decision,"owner"),prior.signerPins.owner),
    verifyPinnedEd25519Signature258(decision.independent_witness.public_key_raw_base64,
      decision.independent_witness.signature_base64,
      canonicalOwnerTransition266(decision,"independent_witness"),prior.signerPins.independent_witness),
  ])).every(Boolean));
  return {...hold,state:decisionSigned?"SIGNED_AUDIT_NONCE_CLOSURE_AND_OWNER_CANDIDATE_EXTERNAL_HOLD"
    :closureSigned?"SIGNED_AUDIT_AND_NONCE_CANDIDATE_OWNER_HOLD"
      :auditSigned?"SIGNED_ORIGINAL_AUDIT_CANDIDATE_WITNESS_HOLD"
        :"ORIGINAL_RECEIVER_AUDIT_READBACK_HOLD",
    auditCandidate:Boolean(auditSigned),independentReadbackCandidate:Boolean(closureSigned),
    nonceReplayClosureCandidate:Boolean(closureSigned),ownerTransitionCandidate:Boolean(decisionSigned)};
}
