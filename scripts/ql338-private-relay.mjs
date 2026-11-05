/** QL-338: library only. No listener, scheduler, socket, device driver or Windows installer. */
import {createCipheriv,createDecipheriv,createHash,createPublicKey,randomBytes,verify} from 'node:crypto';

export const HUB_RELAY_SCHEMA='rosevear.hub.relay.heartbeat.v1';
export const HUB_REQUEST_SCHEMA='rosevear.hub.relay.request.v1';
export const HUB_ALLOWED_PATHS=Object.freeze(['/health','/capabilities']);
const SHA=/^[a-f0-9]{64}$/;
const ID=/^[a-z0-9][a-z0-9._:-]{1,63}$/;
const NONCE=/^[A-Za-z0-9_-]{22,64}$/;
const SIG=/^[A-Za-z0-9_-]{86}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const keys=(o,expected)=>o&&typeof o==='object'&&!Array.isArray(o)&&
  Object.keys(o).length===expected.length&&Object.keys(o).every(k=>expected.includes(k));
const iso=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(s)&&
  Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s;
export function canonicalRelay(value){
  if(Array.isArray(value))return '['+value.map(canonicalRelay).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonicalRelay(value[k])).join(',')+'}';
  return JSON.stringify(value);
}
const sha=value=>createHash('sha256').update(value).digest('hex');
const decision=(status,more={})=>Object.freeze({status,connected:false,relayActive:false,
  deviceActions:0,homeAccess:0,customerBytes:0,...more});

/** Software preflight cannot supply an independent field witness or activate a service. */
export function inspectHubFieldReadiness(evidence={}){
  const required=['ownerDeviceWitness','sourceOwnerTestApproval','masterOwnerTestApproval',
    'originalSignerCustody','independentWitness','workloadIdentity','pinnedPrivateTls',
    'tailnetAclDenyProof','leastPrivilegeServiceAccount','osPatchRecovery',
    'killSwitchAndRevocationProof','encryptedStorageAcl','powerRestartRollbackProof'];
  const missing=required.filter(k=>evidence[k]!==true);
  return decision(missing.length?'HOLD_WINDOWS_FIELD_PROOF':'READY_FOR_SEPARATELY_APPROVED_TEST_ONLY',
    {missing,connectionState:'DISCONNECTED / HOLD',installationAuthorized:false});
}

const FIELDS=['schemaVersion','issuer','audience','deviceId','workloadId','environment','sequence',
  'nonce','sessionId','issuedAt','expiresAt','capabilities','queueDepth','relayMode'];
/** Exact, metadata-only heartbeat. Signing key never belongs in source or a browser. */
export function inspectHeartbeatEnvelope(e,now=Date.now()){
  if(!keys(e,FIELDS))return decision('DENY_HEARTBEAT_SCHEMA');
  if(e.schemaVersion!==HUB_RELAY_SCHEMA||e.issuer!=='rosevear-ai-hub'||
    e.audience!=='rosevear-comms-hub:nonproduction'||
    !ID.test(e.deviceId??'')||!ID.test(e.workloadId??'')||e.environment!=='TEST'||
    !Number.isSafeInteger(e.sequence)||e.sequence<1||
    !NONCE.test(e.nonce??'')||!UUID.test(e.sessionId??'')||
    !Number.isInteger(e.queueDepth)||e.queueDepth<0||e.queueDepth>100||
    e.relayMode!=='OUTBOUND_ONLY'||JSON.stringify(e.capabilities)!=='["health.read","capabilities.read"]')
    return decision('DENY_HEARTBEAT_SCOPE');
  if(!iso(e.issuedAt)||!iso(e.expiresAt)||!Number.isFinite(now)||
    Date.parse(e.issuedAt)>now+30_000||now>=Date.parse(e.expiresAt)||
    Date.parse(e.expiresAt)-Date.parse(e.issuedAt)>120_000)
    return decision('HOLD_EXPIRED_HEARTBEAT');
  return decision('SCHEMA_VALID_TEST_ONLY',{digest:sha(canonicalRelay(e))});
}

/** Only a separately pinned, signed broker request may target two read-only routes. */
export function verifyHubReadOnlyRequest(packet,trust={},now=Date.now()){
  if(!keys(packet,['request','signature','keyId']))return decision('DENY_REQUEST_SCHEMA');
  const r=packet.request;
  if(!keys(r,['schemaVersion','sourceId','audience','deviceId','method','path','nonce',
    'issuedAt','expiresAt'])||r.schemaVersion!==HUB_REQUEST_SCHEMA||
    r.sourceId!=='rosevear-comms-hub'||r.audience!=='rosevear-ai-hub:nonproduction'||
    !ID.test(r.deviceId??'')||r.method!=='GET'||!HUB_ALLOWED_PATHS.includes(r.path)||
    !NONCE.test(r.nonce??'')||!iso(r.issuedAt)||!iso(r.expiresAt)||
    Date.parse(r.issuedAt)>now+30_000||now>=Date.parse(r.expiresAt)||
    Date.parse(r.expiresAt)-Date.parse(r.issuedAt)>60_000)
    return decision('DENY_UNAPPROVED_DEVICE_REQUEST');
  if(trust.deviceId!==r.deviceId||trust.issuer!=='rosevear-comms-hub'||
    trust.ownerTestApproval!==true||trust.independentSignerCustody!==true||
    trust.workloadAuthenticated!==true||trust.privateTlsPinned!==true||
    trust.originalDeviceWitness!==true||trust.peerRedirected===true||
    trust.killSwitchArmed!==true||trust.replayNonceUnused!==true||
    !SHA.test(trust.pinnedSpkiSha256??'')||packet.keyId!==trust.pinnedKeyId||
    !SIG.test(packet.signature??''))return decision('HOLD_UNVERIFIED_REQUEST_AUTHORITY');
  try{
    const key=createPublicKey(trust.pinnedPublicKeyPem);
    if(key.asymmetricKeyType!=='ed25519'||
      sha(key.export({format:'der',type:'spki'}))!==trust.pinnedSpkiSha256||
      !verify(null,Buffer.from(canonicalRelay(r)),key,Buffer.from(packet.signature,'base64url')))
      return decision('DENY_INVALID_REQUEST_SIGNATURE');
  }catch{return decision('DENY_INVALID_REQUEST_SIGNATURE');}
  // Verification alone never starts a relay or makes a GET.
  return decision('VERIFIED_READ_ONLY_REQUEST_NOT_EXECUTED');
}

const QUEUE_SCHEMA='rosevear.hub.relay.encrypted-queue.v1';
/** Encrypted portable snapshot. Caller must persist under owner-approved Windows ACLs. */
export function sealOfflineQueue(entries,key,now=Date.now()){
  if(!Buffer.isBuffer(key)||key.length!==32)throw new Error('RESTRICTED_32_BYTE_KEY_REQUIRED');
  if(!Array.isArray(entries)||entries.length>100||entries.some(e=>
    !keys(e,['id','expiresAt','attempt','receiptSha256'])||!ID.test(e.id??'')||
    !iso(e.expiresAt)||Date.parse(e.expiresAt)<=now||
    Date.parse(e.expiresAt)>now+86_400_000||!SHA.test(e.receiptSha256??'')||
    !Number.isInteger(e.attempt)||e.attempt<0||e.attempt>5)||
    new Set(entries.map(e=>e.id)).size!==entries.length)
    throw new Error('DENY_QUEUE_METADATA_OR_EXPIRY');
  const iv=randomBytes(12);
  const cipher=createCipheriv('aes-256-gcm',key,iv);
  cipher.setAAD(Buffer.from(QUEUE_SCHEMA));
  const body=Buffer.concat([cipher.update(JSON.stringify({schema:QUEUE_SCHEMA,entries})),cipher.final()]);
  return {schema:QUEUE_SCHEMA,iv:iv.toString('base64url'),tag:cipher.getAuthTag().toString('base64url'),
    ciphertext:body.toString('base64url')};
}

export function openOfflineQueue(blob,key,now=Date.now()){
  if(!Buffer.isBuffer(key)||key.length!==32||!keys(blob,['schema','iv','tag','ciphertext'])||
    blob.schema!==QUEUE_SCHEMA)throw new Error('DENY_QUEUE_ENVELOPE');
  try{
    const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(blob.iv,'base64url'));
    decipher.setAAD(Buffer.from(QUEUE_SCHEMA));
    decipher.setAuthTag(Buffer.from(blob.tag,'base64url'));
    const decoded=JSON.parse(Buffer.concat([decipher.update(Buffer.from(blob.ciphertext,'base64url')),
      decipher.final()]).toString('utf8'));
    if(decoded.schema!==QUEUE_SCHEMA||!Array.isArray(decoded.entries)||decoded.entries.length>100)
      throw new Error('DENY_QUEUE_CONTENTS');
    // Crash recovery is a read-only audit; expired entries are dropped, never replayed.
    const valid=decoded.entries.filter(e=>keys(e,['id','expiresAt','attempt','receiptSha256'])&&
      ID.test(e.id??'')&&iso(e.expiresAt)&&Date.parse(e.expiresAt)>now&&
      Date.parse(e.expiresAt)<=now+86_400_000&&SHA.test(e.receiptSha256??'')&&
      Number.isInteger(e.attempt)&&e.attempt>=0&&e.attempt<=5);
    return {state:'RECOVERED_SEALED_METADATA_OFFLINE',entries:valid,
      expiredCount:decoded.entries.length-valid.length,relayActive:false};
  }catch{throw new Error('DENY_QUEUE_TAMPER_OR_WRONG_KEY');}
}

/** Produces only a proposed retry delay: no timers, network, or automatic dispatch. */
export function planOfflineRetry({attempt=0,consecutiveFailures=0,ageMs=0}={}){
  if(!Number.isInteger(attempt)||!Number.isInteger(consecutiveFailures)||
    !Number.isFinite(ageMs)||attempt<0||consecutiveFailures<0||ageMs<0)
    return decision('HOLD_INVALID_RETRY_INPUT');
  if(attempt>=5||ageMs>=86_400_000)return decision('HOLD_RETRY_EXPIRED');
  if(consecutiveFailures>=3)return decision('HOLD_CIRCUIT_OPEN_OWNER_REVIEW');
  return decision('RETRY_DELAY_PROPOSED_NOT_SCHEDULED',{delayMs:Math.min(600_000,15_000*2**attempt)});
}
