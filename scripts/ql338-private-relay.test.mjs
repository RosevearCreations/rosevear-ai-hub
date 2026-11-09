import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createHash,generateKeyPairSync,randomBytes,sign} from 'node:crypto';
import {canonicalRelay,HUB_RELAY_SCHEMA,inspectHeartbeatEnvelope,
  inspectHubFieldReadiness,verifyHubReadOnlyRequest,
  sealOfflineQueue,openOfflineQueue,planOfflineRetry} from './ql338-private-relay.mjs';

const now=Date.parse('2026-11-05T15:00:00.000Z');
const keyPair=generateKeyPairSync('ed25519');
const pin=createHash('sha256').update(keyPair.publicKey.export({format:'der',type:'spki'})).digest('hex');
const request={schemaVersion:'rosevear.hub.relay.request.v1',sourceId:'rosevear-comms-hub',
  audience:'rosevear-ai-hub:nonproduction',deviceId:'hub-windows-owner-1',method:'GET',path:'/health',
  nonce:'abcdefghijABCDEFGHIJ1234',issuedAt:'2026-11-05T15:00:00.000Z',
  expiresAt:'2026-11-05T15:00:45.000Z'};
const signed=r=>({request:r,keyId:'master-ql338',signature:sign(null,Buffer.from(canonicalRelay(r)),
  keyPair.privateKey).toString('base64url')});
const trust={deviceId:request.deviceId,issuer:'rosevear-comms-hub',ownerTestApproval:true,
  independentSignerCustody:true,workloadAuthenticated:true,privateTlsPinned:true,
  originalDeviceWitness:true,killSwitchArmed:true,replayNonceUnused:true,
  pinnedSpkiSha256:pin,pinnedKeyId:'master-ql338',pinnedPublicKeyPem:keyPair.publicKey.export({format:'pem',type:'spki'})};

test('QL-338 no approval means Windows relay remains OFF even with source software deployed',()=>{
  const r=inspectHubFieldReadiness();
  assert.equal(r.status,'HOLD_WINDOWS_FIELD_PROOF');
  assert.equal(r.missing.length,13);
  assert.equal(r.relayActive,false);
  assert.equal(inspectHubFieldReadiness(Object.fromEntries(r.missing.map(k=>[k,true]))).status,
    'READY_FOR_SEPARATELY_APPROVED_TEST_ONLY');
  assert.equal(inspectHubFieldReadiness(Object.fromEntries(r.missing.map(k=>[k,true]))).relayActive,false);
});

test('QL-338 exact metadata heartbeat has no personal payload or device command',()=>{
  const e={schemaVersion:HUB_RELAY_SCHEMA,issuer:'rosevear-ai-hub',
    audience:'rosevear-comms-hub:nonproduction',deviceId:'hub-windows-owner-1',
    workloadId:'hub-probe',environment:'TEST',sequence:1,nonce:request.nonce,
    sessionId:'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',issuedAt:request.issuedAt,
    expiresAt:'2026-11-05T15:01:30.000Z',capabilities:['health.read','capabilities.read'],
    queueDepth:0,relayMode:'OUTBOUND_ONLY'};
  assert.equal(inspectHeartbeatEnvelope(e,now).status,'SCHEMA_VALID_TEST_ONLY');
  assert.match(inspectHeartbeatEnvelope({...e,capabilities:['camera.read']},now).status,/DENY/);
  assert.match(inspectHeartbeatEnvelope({...e,audience:'some-other-consumer'},now).status,/DENY/);
  assert.match(inspectHeartbeatEnvelope({...e,liveDeviceCommand:'unlock'},now).status,/DENY/);
  assert.equal(inspectHeartbeatEnvelope({...e,expiresAt:'2026-11-05T14:59:00.000Z'},now).status,
    'HOLD_EXPIRED_HEARTBEAT');
});

test('QL-338 original private signer can verify narrow GET only; verification never executes',()=>{
  const r=verifyHubReadOnlyRequest(signed(request),trust,now);
  assert.equal(r.status,'VERIFIED_READ_ONLY_REQUEST_NOT_EXECUTED');
  assert.equal(r.relayActive,false);
  for(const p of ['/cameras','/api/v1/devices','/health?include=secrets','/home/automations']){
    assert.equal(verifyHubReadOnlyRequest(signed({...request,path:p}),trust,now).status,
      'DENY_UNAPPROVED_DEVICE_REQUEST');
  }
  for(const t of [{ownerTestApproval:false},{deviceId:'wrong-windows-machine'},
    {peerRedirected:true},{replayNonceUnused:false},{privateTlsPinned:false}]){
    assert.equal(verifyHubReadOnlyRequest(signed(request),{...trust,...t},now).status,
      'HOLD_UNVERIFIED_REQUEST_AUTHORITY');
  }
  assert.equal(verifyHubReadOnlyRequest(signed({...request,method:'POST'}),trust,now).status,
    'DENY_UNAPPROVED_DEVICE_REQUEST');
  assert.equal(verifyHubReadOnlyRequest(signed({...request,expiresAt:'2026-11-05T14:59:59.000Z'}),trust,now).status,
    'DENY_UNAPPROVED_DEVICE_REQUEST');
  assert.equal(verifyHubReadOnlyRequest({...signed(request),signature:'a'.repeat(86)},trust,now).status,
    'DENY_INVALID_REQUEST_SIGNATURE');
});

test('QL-338 encrypted offline snapshot recovers after process restart and drops expired work',()=>{
  const key=randomBytes(32);
  const entries=[{id:'receipt-001',expiresAt:'2026-11-05T15:20:00.000Z',attempt:1,
    receiptSha256:'a'.repeat(64)}];
  const diskBytes=JSON.stringify(sealOfflineQueue(entries,key,now));
  assert.doesNotMatch(diskBytes,/receipt-001|\ba{64}\b/);
  assert.deepEqual(openOfflineQueue(JSON.parse(diskBytes),key,now).entries,entries);
  assert.equal(openOfflineQueue(JSON.parse(diskBytes),key,now+1_800_000).expiredCount,1);
  const tampered=JSON.parse(diskBytes);
  tampered.ciphertext=(tampered.ciphertext.startsWith('A')?'B':'A')+tampered.ciphertext.slice(1);
  assert.throws(()=>openOfflineQueue(tampered,key,now),/DENY_QUEUE/);
  assert.throws(()=>openOfflineQueue(JSON.parse(diskBytes),randomBytes(32),now),/DENY_QUEUE/);
  assert.throws(()=>sealOfflineQueue([...entries,entries[0]],key,now),/DENY_QUEUE/);
  assert.throws(()=>sealOfflineQueue([{...entries[0],cameraData:'forbidden'}],key,now),/DENY_QUEUE/);
});

test('QL-338 bounded offline retry and circuit breaker never start network',()=>{
  assert.deepEqual(planOfflineRetry({attempt:0}).status,'RETRY_DELAY_PROPOSED_NOT_SCHEDULED');
  assert.equal(planOfflineRetry({attempt:2}).delayMs,60_000);
  assert.equal(planOfflineRetry({consecutiveFailures:3}).status,'HOLD_CIRCUIT_OPEN_OWNER_REVIEW');
  assert.equal(planOfflineRetry({attempt:5}).status,'HOLD_RETRY_EXPIRED');
  assert.equal(planOfflineRetry({ageMs:86_400_000}).status,'HOLD_RETRY_EXPIRED');
  assert.equal(planOfflineRetry({attempt:-1}).status,'HOLD_INVALID_RETRY_INPUT');
});
