import {verifyPinnedEd25519Signature258} from "./processIdentity258";
import {canonicalSignedOriginalSource267,canonicalSignedIndependentTrust267,
  canonicalSignedOwnerTrial267,reviewOriginalTruth267,type OriginalSourceTruth267,
  type IndependentTrust267,type OwnerTrial267} from "./commsTruth267";
import type {PriorProof264,PrivateGet265,Shutdown265,CrossDeviceAcceptance265} from "./commsReceipt265";
import type {ReceiverAudit266,NonceClosure266,OwnerTransition266} from "./commsAudit266";
import type {SignedRole263} from "./launcherAcceptance263";

export const AUTHENTICATED_READBACK_268="rosevear-comms-original-authenticated-readback-268/v1";
export const SEPARATE_OWNER_GRANT_268="rosevear-comms-separate-one-get-grant-268/v1";
const sha64=/^[a-f0-9]{64}$/,sha40=/^[a-f0-9]{40}$/,
  base64=/^[A-Za-z0-9+/]+={0,2}$/;
const isUtc=(v:unknown):v is string=>typeof v==="string"
  && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(v)
  && Number.isFinite(Date.parse(v)) && new Date(v).toISOString()===v.replace("Z",".000Z");
const exact=(o:Record<string,unknown>,list:string[])=>Object.keys(o).length===list.length
  && list.every(name=>Object.prototype.hasOwnProperty.call(o,name));
const hashFields=(o:Record<string,unknown>,list:string[])=>list.every(name=>typeof o[name]==="string"&&sha64.test(o[name] as string));
const digest=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",
  new TextEncoder().encode(s)))).map(b=>b.toString(16).padStart(2,"0")).join("");
function jsonObject(input:string) {
  if(input.length>13000) throw new Error("Original receiver evidence exceeds 13 KB.");
  let value:unknown;
  try {value=JSON.parse(input);} catch {throw new Error("Evidence must be strict JSON.");}
  if(!value||typeof value!=="object"||Array.isArray(value)) throw new Error("Expected signed JSON object.");
  return value as Record<string,unknown>;
}
function signedRole(value:unknown):SignedRole263 {
  if(!value||typeof value!=="object"||Array.isArray(value)) throw new Error("Missing signer.");
  const x=value as Record<string,unknown>;
  if(!exact(x,["public_key_raw_base64","signature_base64"])
    || typeof x.public_key_raw_base64!=="string"||x.public_key_raw_base64.length!==44||!base64.test(x.public_key_raw_base64)
    || typeof x.signature_base64!=="string"||x.signature_base64.length!==88||!base64.test(x.signature_base64))
    throw new Error("Untrusted signer identity or unexpected fields.");
  return x as SignedRole263;
}

/** Operator and Jack signatures over claimed original-host readback, not remote attestation. */
export type AuthenticatedReadback268={schema:typeof AUTHENTICATED_READBACK_268;
  release_sha:string;source_267_sha256:string;witness_267_sha256:string;owner_plan_267_sha256:string;
  original_host_binding_sha256:string;source_enrollment_sha256:string;
  source_registry_row_sha256:string;receiver_tls_pin_sha256:string;receiver_signer_pin_sha256:string;
  original_database_row_sha256:string;private_tls_observation_sha256:string;
  tailnet_acl_readback_sha256:string;private_get_handler_contract_sha256:string;
  readback_method:"AUTHENTICATED_ORIGINAL_HOST_READ_ONLY";
  proposed_method:"GET";proposed_path:"/api/integration/v1/health";
  receiver_state:"OFF";credential_state:"REVOKED";observed_at:string;
  receiver_operator:SignedRole263;independent_witness:SignedRole263};
const authFields=(x:AuthenticatedReadback268)=>[x.schema,x.release_sha,x.source_267_sha256,
  x.witness_267_sha256,x.owner_plan_267_sha256,x.original_host_binding_sha256,
  x.source_enrollment_sha256,x.source_registry_row_sha256,x.receiver_tls_pin_sha256,
  x.receiver_signer_pin_sha256,x.original_database_row_sha256,x.private_tls_observation_sha256,
  x.tailnet_acl_readback_sha256,x.private_get_handler_contract_sha256,x.readback_method,
  x.proposed_method,x.proposed_path,x.receiver_state,x.credential_state,x.observed_at];
export const canonicalAuthenticated268=(x:AuthenticatedReadback268,role:"receiver_operator"|"independent_witness")=>
  [...authFields(x),role,""].join("\n");
export const canonicalSignedAuthenticated268=(x:AuthenticatedReadback268)=>[...authFields(x),
  "receiver_operator",x.receiver_operator.public_key_raw_base64,x.receiver_operator.signature_base64,
  "independent_witness",x.independent_witness.public_key_raw_base64,
  x.independent_witness.signature_base64,""].join("\n");
export function parseAuthenticated268(source:string):AuthenticatedReadback268 {
  const x=jsonObject(source),hash=["source_267_sha256","witness_267_sha256","owner_plan_267_sha256",
    "original_host_binding_sha256","source_enrollment_sha256","source_registry_row_sha256",
    "receiver_tls_pin_sha256","receiver_signer_pin_sha256","original_database_row_sha256",
    "private_tls_observation_sha256","tailnet_acl_readback_sha256","private_get_handler_contract_sha256"];
  if(!exact(x,["schema","release_sha",...hash,"readback_method","proposed_method",
    "proposed_path","receiver_state","credential_state","observed_at","receiver_operator","independent_witness"])
    || x.schema!==AUTHENTICATED_READBACK_268||typeof x.release_sha!=="string"||!sha40.test(x.release_sha)
    || !hashFields(x,hash)||!isUtc(x.observed_at)
    || x.readback_method!=="AUTHENTICATED_ORIGINAL_HOST_READ_ONLY"
    || x.proposed_method!=="GET"||x.proposed_path!=="/api/integration/v1/health"
    || x.receiver_state!=="OFF"||x.credential_state!=="REVOKED")
    throw new Error("Original private receiver readback is incomplete or unsafe.");
  return {...x,receiver_operator:signedRole(x.receiver_operator),
    independent_witness:signedRole(x.independent_witness)} as AuthenticatedReadback268;
}

/** New nonce and two separately pinned owner signatures; no automatic network authority. */
export type SeparateOwnerGrant268={schema:typeof SEPARATE_OWNER_GRANT_268;release_sha:string;
  authenticated_readback_sha256:string;owner_plan_267_sha256:string;
  private_get_handler_contract_sha256:string;source_enrollment_sha256:string;
  challenge_nonce:string;signed_at:string;expires_at:string;
  decision:"OWNER_APPROVED_ONE_NONPRODUCTION_GET_PENDING_PRIVATE_OPERATOR_GATE";
  method:"GET";path:"/api/integration/v1/health";
  scope:"HEALTH_READ_ONLY_NONPRODUCTION";max_requests:1;nonce_state:"UNUSED";
  customer_communications_authorized:false;device_actions_authorized:false;
  database_writes_authorized:false;receiver_state:"OFF";
  connection_state:"DISCONNECTED / HOLD";
  owner:SignedRole263;independent_witness:SignedRole263};
const grantFields=(x:SeparateOwnerGrant268)=>[x.schema,x.release_sha,x.authenticated_readback_sha256,
  x.owner_plan_267_sha256,x.private_get_handler_contract_sha256,x.source_enrollment_sha256,
  x.challenge_nonce,x.signed_at,x.expires_at,x.decision,x.method,x.path,x.scope,
  String(x.max_requests),x.nonce_state,String(x.customer_communications_authorized),
  String(x.device_actions_authorized),String(x.database_writes_authorized),
  x.receiver_state,x.connection_state];
export const canonicalOwnerGrant268=(x:SeparateOwnerGrant268,role:"owner"|"independent_witness")=>
  [...grantFields(x),role,""].join("\n");
export function parseOwnerGrant268(source:string):SeparateOwnerGrant268 {
  const x=jsonObject(source),hash=["authenticated_readback_sha256","owner_plan_267_sha256",
    "private_get_handler_contract_sha256","source_enrollment_sha256"];
  if(!exact(x,["schema","release_sha",...hash,"challenge_nonce","signed_at","expires_at",
    "decision","method","path","scope","max_requests","nonce_state",
    "customer_communications_authorized","device_actions_authorized","database_writes_authorized",
    "receiver_state","connection_state","owner","independent_witness"])
    || x.schema!==SEPARATE_OWNER_GRANT_268||typeof x.release_sha!=="string"||!sha40.test(x.release_sha)
    || !hashFields(x,hash)||typeof x.challenge_nonce!=="string"||!/^[a-f0-9]{32}$/.test(x.challenge_nonce)
    || !isUtc(x.signed_at)||!isUtc(x.expires_at)
    || x.decision!=="OWNER_APPROVED_ONE_NONPRODUCTION_GET_PENDING_PRIVATE_OPERATOR_GATE"
    || x.method!=="GET"||x.path!=="/api/integration/v1/health"
    || x.scope!=="HEALTH_READ_ONLY_NONPRODUCTION"||x.max_requests!==1||x.nonce_state!=="UNUSED"
    || x.customer_communications_authorized!==false||x.device_actions_authorized!==false
    || x.database_writes_authorized!==false||x.receiver_state!=="OFF"
    || x.connection_state!=="DISCONNECTED / HOLD")
    throw new Error("Owner grant must be single-use and cannot authorize communications or writes.");
  return {...x,owner:signedRole(x.owner),
    independent_witness:signedRole(x.independent_witness)} as SeparateOwnerGrant268;
}

export async function reviewFirstGetSafety268(prior:PriorProof264|null,get:PrivateGet265|null,
  shutdown:Shutdown265|null,acceptance:CrossDeviceAcceptance265|null,audit:ReceiverAudit266|null,
  closure:NonceClosure266|null,decision:OwnerTransition266|null,source:OriginalSourceTruth267|null,
  witness:IndependentTrust267|null,trial:OwnerTrial267|null,auth:AuthenticatedReadback268|null,
  grant:SeparateOwnerGrant268|null,now:string) {
  const hold={state:"ORIGINAL_PRIVATE_RECEIVER_AND_ONE_GET_AUTHORIZATION_HOLD" as string,
    authenticatedSourceCandidate:false,independentOwnerGrantCandidate:false,
    authenticated_original_host_externally_verified:false as const,
    private_get_handler_deployed_verified:false as const,
    separate_test_authorization_externally_verified:false as const,
    single_use_nonce_ledger_externally_verified:false as const,
    first_get_authorized:false as const,first_get_executed:false as const,
    receiver_activated:false as const,comms_connected:false as const,
    connection_state:"DISCONNECTED / HOLD" as const,remote_requests:0 as const};
  if(!prior||!get||!shutdown||!acceptance||!audit||!closure||!decision||!source
    ||!witness||!trial||!auth||!grant||!isUtc(now)) return hold;
  const previous=await reviewOriginalTruth267(prior,get,shutdown,acceptance,audit,closure,
    decision,source,witness,trial,auth.observed_at);
  if(!previous.ownerTrialCandidate) return hold;
  const sourceHash=await digest(canonicalSignedOriginalSource267(source));
  const witnessHash=await digest(canonicalSignedIndependentTrust267(witness));
  const trialHash=await digest(canonicalSignedOwnerTrial267(trial));
  const authAt=Date.parse(auth.observed_at),trialAt=Date.parse(trial.signed_at);
  const sourceMatched=auth.schema===AUTHENTICATED_READBACK_268
    && auth.release_sha===prior.expectedRelease && auth.source_267_sha256===sourceHash
    && auth.witness_267_sha256===witnessHash && auth.owner_plan_267_sha256===trialHash
    && auth.original_host_binding_sha256===prior.hostPin
    && auth.source_enrollment_sha256===source.source_enrollment_sha256
    && auth.source_registry_row_sha256===source.source_registry_row_sha256
    && auth.receiver_tls_pin_sha256===prior.receiverTlsPin
    && auth.receiver_signer_pin_sha256===prior.receiverSignerPin
    && auth.readback_method==="AUTHENTICATED_ORIGINAL_HOST_READ_ONLY"
    && auth.proposed_method==="GET"&&auth.proposed_path==="/api/integration/v1/health"
    && auth.receiver_state==="OFF"&&auth.credential_state==="REVOKED"
    && auth.receiver_operator.public_key_raw_base64===source.receiver_operator.public_key_raw_base64
    && auth.independent_witness.public_key_raw_base64===witness.independent_witness.public_key_raw_base64
    && auth.receiver_operator.public_key_raw_base64!==auth.independent_witness.public_key_raw_base64
    && authAt>=trialAt&&authAt<=Date.parse(trial.expires_at);
  const sourceSigned=Boolean(sourceMatched && (await Promise.all([
    verifyPinnedEd25519Signature258(auth.receiver_operator.public_key_raw_base64,
      auth.receiver_operator.signature_base64,canonicalAuthenticated268(auth,"receiver_operator"),
      prior.receiverSignerPin),
    verifyPinnedEd25519Signature258(auth.independent_witness.public_key_raw_base64,
      auth.independent_witness.signature_base64,canonicalAuthenticated268(auth,"independent_witness"),
      prior.signerPins.independent_witness),
  ])).every(Boolean));
  const authHash=await digest(canonicalSignedAuthenticated268(auth));
  const signedAt=Date.parse(grant.signed_at),expiresAt=Date.parse(grant.expires_at),nowAt=Date.parse(now);
  const grantMatched=Boolean(sourceSigned&&grant.schema===SEPARATE_OWNER_GRANT_268
    && grant.release_sha===prior.expectedRelease&&grant.authenticated_readback_sha256===authHash
    && grant.owner_plan_267_sha256===trialHash
    && grant.private_get_handler_contract_sha256===auth.private_get_handler_contract_sha256
    && grant.source_enrollment_sha256===source.source_enrollment_sha256
    && grant.challenge_nonce!==prior.testRequest.challenge_nonce
    && grant.decision==="OWNER_APPROVED_ONE_NONPRODUCTION_GET_PENDING_PRIVATE_OPERATOR_GATE"
    && grant.method==="GET"&&grant.path==="/api/integration/v1/health"
    && grant.scope==="HEALTH_READ_ONLY_NONPRODUCTION"&&grant.max_requests===1
    && grant.nonce_state==="UNUSED"&&!grant.customer_communications_authorized
    && !grant.device_actions_authorized&&!grant.database_writes_authorized
    && grant.receiver_state==="OFF"&&grant.connection_state==="DISCONNECTED / HOLD"
    && grant.owner.public_key_raw_base64===trial.owner.public_key_raw_base64
    && grant.independent_witness.public_key_raw_base64===trial.independent_witness.public_key_raw_base64
    && signedAt>=authAt&&signedAt-authAt<=10*60000
    && signedAt<=Date.parse(trial.expires_at)&&expiresAt>signedAt&&expiresAt-signedAt<=10*60000
    && nowAt>=signedAt&&nowAt<=expiresAt);
  const grantSigned=Boolean(grantMatched&&(await Promise.all([
    verifyPinnedEd25519Signature258(grant.owner.public_key_raw_base64,grant.owner.signature_base64,
      canonicalOwnerGrant268(grant,"owner"),prior.signerPins.owner),
    verifyPinnedEd25519Signature258(grant.independent_witness.public_key_raw_base64,
      grant.independent_witness.signature_base64,canonicalOwnerGrant268(grant,"independent_witness"),
      prior.signerPins.independent_witness),
  ])).every(Boolean));
  return {...hold,state:grantSigned?"SIGNED_ONE_GET_OWNER_GRANT_CANDIDATE_PRIVATE_RECEIVER_HOLD"
    :sourceSigned?"SIGNED_ORIGINAL_RECEIVER_READBACK_CANDIDATE_OWNER_GRANT_HOLD":hold.state,
    authenticatedSourceCandidate:sourceSigned,independentOwnerGrantCandidate:grantSigned};
}
