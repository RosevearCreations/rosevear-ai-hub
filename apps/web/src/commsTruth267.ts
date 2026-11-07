import {verifyPinnedEd25519Signature258} from "./processIdentity258";
import {reviewOriginalAudit266,canonicalSignedReceiverAudit266,canonicalSignedNonceClosure266,
  canonicalSignedOwnerTransition266,type ReceiverAudit266,type NonceClosure266,
  type OwnerTransition266} from "./commsAudit266";
import type {PriorProof264,PrivateGet265,Shutdown265,CrossDeviceAcceptance265} from "./commsReceipt265";
import type {SignedRole263} from "./launcherAcceptance263";

export const ORIGINAL_SOURCE_TRUTH_267="rosevear-comms-original-source-of-truth-267/v1";
export const INDEPENDENT_TRUST_267="rosevear-comms-independent-trust-readback-267/v1";
export const READ_ONLY_TRIAL_267="rosevear-comms-owner-readonly-trial-candidate-267/v1";
const hash64=/^[a-f0-9]{64}$/,hash40=/^[a-f0-9]{40}$/,base64=/^[A-Za-z0-9+/]+={0,2}$/;
const utc=(v:unknown):v is string=>typeof v==="string"
  && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(v)
  && Number.isFinite(Date.parse(v)) && new Date(v).toISOString()===v.replace("Z",".000Z");
const exact=(x:Record<string,unknown>,fields:string[])=>Object.keys(x).length===fields.length
  && fields.every(field=>Object.prototype.hasOwnProperty.call(x,field));
const hashes=(x:Record<string,unknown>,fields:string[])=>fields.every(field=>typeof x[field]==="string"&&hash64.test(x[field] as string));
const sha=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",
  new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,"0")).join("");
function record(source:string) {
  if(source.length>12000) throw new Error("Build 267 evidence is limited to 12 KB.");
  let value:unknown;
  try {value=JSON.parse(source);} catch {throw new Error("Build 267 evidence must be JSON.");}
  if(!value||typeof value!=="object"||Array.isArray(value)) throw new Error("Expected signed JSON object.");
  return value as Record<string,unknown>;
}
function signer(value:unknown):SignedRole263 {
  if(!value||typeof value!=="object"||Array.isArray(value)) throw new Error("Signer missing.");
  const x=value as Record<string,unknown>;
  if(!exact(x,["public_key_raw_base64","signature_base64"])
    || typeof x.public_key_raw_base64!=="string"||x.public_key_raw_base64.length!==44||!base64.test(x.public_key_raw_base64)
    || typeof x.signature_base64!=="string"||x.signature_base64.length!==88||!base64.test(x.signature_base64))
    throw new Error("Invalid signer or unexpected signer fields.");
  return x as SignedRole263;
}

/** Original-host *claimed* row snapshots. JSON by itself cannot authenticate the private database. */
export type OriginalSourceTruth267={schema:typeof ORIGINAL_SOURCE_TRUTH_267;release_sha:string;
  original_host_binding_sha256:string;receiver_audit_266_sha256:string;
  nonce_closure_266_sha256:string;owner_transition_266_sha256:string;
  source_system:"rosevear-ai-hub";target:"rosevear-comms-hub";
  source_enrollment_sha256:string;source_registry_row_sha256:string;
  audit_snapshot_sha256:string;revocation_ledger_sha256:string;nonce_tombstone_sha256:string;
  receiver_signer_pin_sha256:string;receiver_tls_pin_sha256:string;
  readback_query_sha256:string;query_mode:"LOCAL_READ_ONLY";
  accepted_get_count:1;duplicate_get_count:0;nonce_state:"CONSUMED";
  credential_state:"REVOKED";receiver_state:"OFF";observed_at:string;receiver_operator:SignedRole263};
const sourceFields=(x:OriginalSourceTruth267)=>[x.schema,x.release_sha,x.original_host_binding_sha256,
  x.receiver_audit_266_sha256,x.nonce_closure_266_sha256,x.owner_transition_266_sha256,
  x.source_system,x.target,x.source_enrollment_sha256,x.source_registry_row_sha256,
  x.audit_snapshot_sha256,x.revocation_ledger_sha256,x.nonce_tombstone_sha256,
  x.receiver_signer_pin_sha256,x.receiver_tls_pin_sha256,x.readback_query_sha256,x.query_mode,
  String(x.accepted_get_count),String(x.duplicate_get_count),x.nonce_state,x.credential_state,
  x.receiver_state,x.observed_at];
export const canonicalOriginalSource267=(x:OriginalSourceTruth267)=>[...sourceFields(x),"receiver_operator",""].join("\n");
export const canonicalSignedOriginalSource267=(x:OriginalSourceTruth267)=>[...sourceFields(x),
  "receiver_operator",x.receiver_operator.public_key_raw_base64,x.receiver_operator.signature_base64,""].join("\n");
export function parseOriginalSource267(source:string):OriginalSourceTruth267 {
  const x=record(source),hash=["original_host_binding_sha256","receiver_audit_266_sha256",
    "nonce_closure_266_sha256","owner_transition_266_sha256","source_enrollment_sha256",
    "source_registry_row_sha256","audit_snapshot_sha256","revocation_ledger_sha256",
    "nonce_tombstone_sha256","receiver_signer_pin_sha256","receiver_tls_pin_sha256","readback_query_sha256"];
  if(!exact(x,["schema","release_sha",...hash,"source_system","target","query_mode",
    "accepted_get_count","duplicate_get_count","nonce_state","credential_state","receiver_state",
    "observed_at","receiver_operator"])||x.schema!==ORIGINAL_SOURCE_TRUTH_267
    || typeof x.release_sha!=="string"||!hash40.test(x.release_sha)||!hashes(x,hash)
    || x.source_system!=="rosevear-ai-hub"||x.target!=="rosevear-comms-hub"
    || x.query_mode!=="LOCAL_READ_ONLY"||x.accepted_get_count!==1||x.duplicate_get_count!==0
    || x.nonce_state!=="CONSUMED"||x.credential_state!=="REVOKED"||x.receiver_state!=="OFF"||!utc(x.observed_at))
    throw new Error("Original source-of-truth evidence is missing, unsafe or over-scoped.");
  return {...x,receiver_operator:signer(x.receiver_operator)} as OriginalSourceTruth267;
}

/** Independently *signed* witness comparison, not an automatically verified remote readback. */
export type IndependentTrust267={schema:typeof INDEPENDENT_TRUST_267;
  source_readback_sha256:string;original_host_binding_sha256:string;
  source_enrollment_sha256:string;source_registry_row_sha256:string;
  audit_snapshot_sha256:string;revocation_ledger_sha256:string;nonce_tombstone_sha256:string;
  receiver_signer_pin_sha256:string;receiver_tls_pin_sha256:string;
  independent_channel_receipt_sha256:string;readback_method:"INDEPENDENT_AUTHENTICATED_READ_ONLY";
  source_state:"ENROLLED_READ_ONLY_CANDIDATE";nonce_state:"CONSUMED";
  duplicate_get_count:0;no_replay_get_sent:true;receiver_state:"OFF";
  observed_at:string;independent_witness:SignedRole263};
const witnessFields=(x:IndependentTrust267)=>[x.schema,x.source_readback_sha256,
  x.original_host_binding_sha256,x.source_enrollment_sha256,x.source_registry_row_sha256,
  x.audit_snapshot_sha256,x.revocation_ledger_sha256,x.nonce_tombstone_sha256,
  x.receiver_signer_pin_sha256,x.receiver_tls_pin_sha256,x.independent_channel_receipt_sha256,
  x.readback_method,x.source_state,x.nonce_state,String(x.duplicate_get_count),
  String(x.no_replay_get_sent),x.receiver_state,x.observed_at];
export const canonicalIndependentTrust267=(x:IndependentTrust267)=>[...witnessFields(x),"independent_witness",""].join("\n");
export const canonicalSignedIndependentTrust267=(x:IndependentTrust267)=>[...witnessFields(x),
  "independent_witness",x.independent_witness.public_key_raw_base64,
  x.independent_witness.signature_base64,""].join("\n");
export function parseIndependentTrust267(source:string):IndependentTrust267 {
  const x=record(source),hash=["source_readback_sha256","original_host_binding_sha256",
    "source_enrollment_sha256","source_registry_row_sha256","audit_snapshot_sha256",
    "revocation_ledger_sha256","nonce_tombstone_sha256","receiver_signer_pin_sha256",
    "receiver_tls_pin_sha256","independent_channel_receipt_sha256"];
  if(!exact(x,["schema",...hash,"readback_method","source_state","nonce_state",
    "duplicate_get_count","no_replay_get_sent","receiver_state","observed_at","independent_witness"])
    || x.schema!==INDEPENDENT_TRUST_267||!hashes(x,hash)
    || x.readback_method!=="INDEPENDENT_AUTHENTICATED_READ_ONLY"
    || x.source_state!=="ENROLLED_READ_ONLY_CANDIDATE"||x.nonce_state!=="CONSUMED"
    || x.duplicate_get_count!==0||x.no_replay_get_sent!==true||x.receiver_state!=="OFF"
    || !utc(x.observed_at)) throw new Error("Independent source readback cannot prove replay or activation.");
  return {...x,independent_witness:signer(x.independent_witness)} as IndependentTrust267;
}

/** Owner acceptance of offline evidence only; actual nonproduction TEST needs fresh separate authority. */
export type OwnerTrial267={schema:typeof READ_ONLY_TRIAL_267;release_sha:string;
  source_readback_sha256:string;independent_readback_sha256:string;owner_transition_266_sha256:string;
  source_enrollment_sha256:string;nonce_tombstone_sha256:string;signed_at:string;expires_at:string;
  decision:"ACCEPT_EVIDENCE_FOR_SEPARATE_READ_ONLY_TRIAL_PLANNING_ONLY";
  method:"GET";path:"/api/integration/v1/health";max_requests:1;
  test_authorized:false;receiver_state:"OFF";connection_state:"DISCONNECTED / HOLD";
  owner:SignedRole263;independent_witness:SignedRole263};
const trialFields=(x:OwnerTrial267)=>[x.schema,x.release_sha,x.source_readback_sha256,
  x.independent_readback_sha256,x.owner_transition_266_sha256,x.source_enrollment_sha256,
  x.nonce_tombstone_sha256,x.signed_at,x.expires_at,x.decision,x.method,x.path,
  String(x.max_requests),String(x.test_authorized),x.receiver_state,x.connection_state];
export const canonicalOwnerTrial267=(x:OwnerTrial267,role:"owner"|"independent_witness")=>
  [...trialFields(x),role,""].join("\n");
export function parseOwnerTrial267(source:string):OwnerTrial267 {
  const x=record(source),hash=["source_readback_sha256","independent_readback_sha256",
    "owner_transition_266_sha256","source_enrollment_sha256","nonce_tombstone_sha256"];
  if(!exact(x,["schema","release_sha",...hash,"signed_at","expires_at","decision","method",
    "path","max_requests","test_authorized","receiver_state","connection_state","owner","independent_witness"])
    || x.schema!==READ_ONLY_TRIAL_267||typeof x.release_sha!=="string"||!hash40.test(x.release_sha)
    || !hashes(x,hash)||!utc(x.signed_at)||!utc(x.expires_at)
    || x.decision!=="ACCEPT_EVIDENCE_FOR_SEPARATE_READ_ONLY_TRIAL_PLANNING_ONLY"
    || x.method!=="GET"||x.path!=="/api/integration/v1/health"||x.max_requests!==1
    || x.test_authorized!==false||x.receiver_state!=="OFF"||x.connection_state!=="DISCONNECTED / HOLD")
    throw new Error("Owner planning receipt is not separate live TEST authorization.");
  return {...x,owner:signer(x.owner),independent_witness:signer(x.independent_witness)} as OwnerTrial267;
}

export async function reviewOriginalTruth267(prior:PriorProof264|null,get:PrivateGet265|null,
  shutdown:Shutdown265|null,acceptance:CrossDeviceAcceptance265|null,audit:ReceiverAudit266|null,
  closure:NonceClosure266|null,decision:OwnerTransition266|null,source:OriginalSourceTruth267|null,
  witness:IndependentTrust267|null,trial:OwnerTrial267|null,now:string) {
  const hold={state:"ORIGINAL_SOURCE_OF_TRUTH_AND_SEPARATE_OWNER_TRUST_HOLD" as string,
    originalSourceCandidate:false,independentTrustCandidate:false,ownerTrialCandidate:false,
    original_receiver_source_of_truth_externally_verified:false as const,
    independent_owner_trust_externally_verified:false as const,
    separate_test_authorization_verified:false as const,
    trial_authorized:false as const,receiver_activated:false as const,comms_connected:false as const,
    connection_state:"DISCONNECTED / HOLD" as const,remote_requests:0 as const};
  if(!prior||!get||!shutdown||!acceptance||!audit||!closure||!decision||!source||!witness||!trial||!utc(now)) return hold;
  // Reverify all 263–266 signed custody against the time of this evidence handoff.
  const older=await reviewOriginalAudit266(prior,get,shutdown,acceptance,audit,closure,decision,source.observed_at);
  if(!older.ownerTransitionCandidate) return hold;
  const auditHash=await sha(canonicalSignedReceiverAudit266(audit));
  const nonceHash=await sha(canonicalSignedNonceClosure266(closure));
  const ownerHash=await sha(canonicalSignedOwnerTransition266(decision));
  const sourceAt=Date.parse(source.observed_at),decisionAt=Date.parse(decision.signed_at);
  const sourceMatched=source.schema===ORIGINAL_SOURCE_TRUTH_267
    && source.release_sha===prior.expectedRelease && source.original_host_binding_sha256===prior.hostPin
    && source.receiver_audit_266_sha256===auditHash && source.nonce_closure_266_sha256===nonceHash
    && source.owner_transition_266_sha256===ownerHash && source.source_system==="rosevear-ai-hub"
    && source.target==="rosevear-comms-hub" && source.source_enrollment_sha256===audit.source_enrollment_sha256
    && source.audit_snapshot_sha256===audit.audit_snapshot_sha256
    && source.revocation_ledger_sha256===audit.revocation_ledger_sha256
    && source.nonce_tombstone_sha256===audit.nonce_tombstone_sha256
    && source.receiver_signer_pin_sha256===prior.receiverSignerPin && source.receiver_tls_pin_sha256===prior.receiverTlsPin
    && source.receiver_operator.public_key_raw_base64===audit.receiver_operator.public_key_raw_base64
    && source.query_mode==="LOCAL_READ_ONLY"&&source.accepted_get_count===1&&source.duplicate_get_count===0
    && source.nonce_state==="CONSUMED"&&source.credential_state==="REVOKED"&&source.receiver_state==="OFF"
    && sourceAt>=decisionAt && sourceAt-decisionAt<=30*60000;
  const signedSource=Boolean(sourceMatched && await verifyPinnedEd25519Signature258(
    source.receiver_operator.public_key_raw_base64,source.receiver_operator.signature_base64,
    canonicalOriginalSource267(source),prior.receiverSignerPin));
  const sourceHash=await sha(canonicalSignedOriginalSource267(source));
  const witnessAt=Date.parse(witness.observed_at);
  const signedWitness=Boolean(signedSource && witness.schema===INDEPENDENT_TRUST_267
    && witness.source_readback_sha256===sourceHash
    && witness.original_host_binding_sha256===source.original_host_binding_sha256
    && witness.source_enrollment_sha256===source.source_enrollment_sha256
    && witness.source_registry_row_sha256===source.source_registry_row_sha256
    && witness.audit_snapshot_sha256===source.audit_snapshot_sha256
    && witness.revocation_ledger_sha256===source.revocation_ledger_sha256
    && witness.nonce_tombstone_sha256===source.nonce_tombstone_sha256
    && witness.receiver_signer_pin_sha256===source.receiver_signer_pin_sha256
    && witness.receiver_tls_pin_sha256===source.receiver_tls_pin_sha256
    && witness.readback_method==="INDEPENDENT_AUTHENTICATED_READ_ONLY"
    && witness.source_state==="ENROLLED_READ_ONLY_CANDIDATE"&&witness.nonce_state==="CONSUMED"
    && witness.duplicate_get_count===0&&witness.no_replay_get_sent===true&&witness.receiver_state==="OFF"
    && witness.independent_witness.public_key_raw_base64===closure.independent_witness.public_key_raw_base64
    && witness.independent_witness.public_key_raw_base64!==source.receiver_operator.public_key_raw_base64
    && witnessAt>=sourceAt && witnessAt-sourceAt<=15*60000
    && await verifyPinnedEd25519Signature258(witness.independent_witness.public_key_raw_base64,
      witness.independent_witness.signature_base64,canonicalIndependentTrust267(witness),prior.signerPins.independent_witness));
  const witnessHash=await sha(canonicalSignedIndependentTrust267(witness));
  const nowAt=Date.parse(now),signedAt=Date.parse(trial.signed_at),expiry=Date.parse(trial.expires_at);
  const trialMatched=Boolean(signedWitness && trial.schema===READ_ONLY_TRIAL_267
    && trial.release_sha===prior.expectedRelease && trial.source_readback_sha256===sourceHash
    && trial.independent_readback_sha256===witnessHash && trial.owner_transition_266_sha256===ownerHash
    && trial.source_enrollment_sha256===source.source_enrollment_sha256
    && trial.nonce_tombstone_sha256===source.nonce_tombstone_sha256
    && trial.decision==="ACCEPT_EVIDENCE_FOR_SEPARATE_READ_ONLY_TRIAL_PLANNING_ONLY"
    && trial.method==="GET"&&trial.path==="/api/integration/v1/health"&&trial.max_requests===1
    && trial.test_authorized===false&&trial.receiver_state==="OFF"&&trial.connection_state==="DISCONNECTED / HOLD"
    && trial.owner.public_key_raw_base64===decision.owner.public_key_raw_base64
    && trial.independent_witness.public_key_raw_base64===witness.independent_witness.public_key_raw_base64
    && signedAt>=witnessAt && signedAt-witnessAt<=30*60000
    && signedAt<=Date.parse(decision.expires_at)&&expiry>signedAt&&expiry-signedAt<=30*60000
    && nowAt>=signedAt&&nowAt<=expiry);
  const signedTrial=Boolean(trialMatched && (await Promise.all([
    verifyPinnedEd25519Signature258(trial.owner.public_key_raw_base64,trial.owner.signature_base64,
      canonicalOwnerTrial267(trial,"owner"),prior.signerPins.owner),
    verifyPinnedEd25519Signature258(trial.independent_witness.public_key_raw_base64,
      trial.independent_witness.signature_base64,canonicalOwnerTrial267(trial,"independent_witness"),
      prior.signerPins.independent_witness),
  ])).every(Boolean));
  return {...hold,state:signedTrial?"SIGNED_ORIGINAL_TRUTH_INDEPENDENT_TRUST_AND_OWNER_TRIAL_CANDIDATE_EXTERNAL_HOLD"
    :signedWitness?"SIGNED_SOURCE_AND_WITNESS_OWNER_TRIAL_HOLD"
      :signedSource?"SIGNED_ORIGINAL_SOURCE_INDEPENDENT_TRUST_HOLD":hold.state,
    originalSourceCandidate:signedSource,independentTrustCandidate:signedWitness,ownerTrialCandidate:signedTrial};
}
