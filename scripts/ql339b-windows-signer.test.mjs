import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash,createPublicKey,verify} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {EventEmitter} from 'node:events';
import {fileURLToPath} from 'node:url';
import {canonicalRelay} from './ql338-private-relay.mjs';
import {createEncryptedCandidate,signedTestHeartbeat,sendPinnedTestHeartbeat} from './ql339b-windows-signer.mjs';

test('owner-only signer creates encrypted Ed25519 key, nonsecret candidate and short-lived signature',()=>{
  const generated=createEncryptedCandidate({deviceId:'rosevear-windows-hub',
    workloadId:'hub-probe',keyId:'hub-ql339b',passphrase:'long owner-only passphrase'});
  assert.match(generated.encryptedPrivateKeyPem,/BEGIN ENCRYPTED PRIVATE KEY/);
  assert.doesNotMatch(generated.candidate.devicePublicKeyPem,/PRIVATE/);
  assert.equal(generated.candidate.enrollmentState,'HELD_ORIGINAL_OWNER_SIGNATURES_REQUIRED');
  const now=Date.parse('2026-11-05T19:00:00.000Z');
  const packet=signedTestHeartbeat({...generated,passphrase:'long owner-only passphrase',now});
  assert.equal(packet.envelope.environment,'TEST');
  assert.deepEqual(packet.envelope.capabilities,['health.read','capabilities.read']);
  assert.equal(Date.parse(packet.envelope.expiresAt)-Date.parse(packet.envelope.issuedAt),90_000);
  const key=createPublicKey(generated.candidate.devicePublicKeyPem);
  assert.equal(createHash('sha256').update(key.export({format:'der',type:'spki'})).digest('hex'),
    generated.candidate.deviceSpkiSha256);
  assert.equal(verify(null,Buffer.from(canonicalRelay(packet.envelope)),key,
    Buffer.from(packet.signature,'base64url')),true);
  assert.throws(()=>signedTestHeartbeat({...generated,passphrase:'wrong'}));
  assert.throws(()=>signedTestHeartbeat({...generated,
    candidate:{...generated.candidate,deviceId:'wrong device'},
    passphrase:'long owner-only passphrase'}),/DENY_CANDIDATE/);
  assert.throws(()=>createEncryptedCandidate({deviceId:'owner',workloadId:'work',keyId:'id',passphrase:'short'}),
    /DENY_OWNER/);
});

test('no noninteractive key-generation, unsupported activation or OS policy change',()=>{
  const file=fileURLToPath(new URL('./ql339b-windows-signer.mjs',import.meta.url));
  const bad=spawnSync(process.execPath,[file,'--enroll','hub-device','hub-probe','key-id'],
    {encoding:'utf8'});
  assert.equal(bad.status,1);
  assert.match(bad.stderr,/WINDOWS_OWNER_DEVICE_REQUIRED|OWNER_INTERACTIVE_TERMINAL_REQUIRED/);
  const unknown=spawnSync(process.execPath,[file,'--start'],{encoding:'utf8'});
  assert.equal(unknown.status,1);
  assert.doesNotMatch(unknown.stderr,/ExecutionPolicy Bypass|private key:/i);
});

test('outbound TEST sender requires private HTTPS SPKI and never redirects or starts a daemon',async()=>{
  const generated=createEncryptedCandidate({deviceId:'rosevear-windows-hub',
    workloadId:'hub-probe',keyId:'hub-ql339b',passphrase:'owner-test-passphrase-2026'});
  const packet=signedTestHeartbeat({...generated,passphrase:'owner-test-passphrase-2026'});
  let called=0;
  const fake=(url,options,callback)=>{
    called++;assert.equal(url.hostname,'private.test.ts.net');
    assert.equal(options.method,'POST');assert.equal(options.rejectUnauthorized,true);
    assert.equal(typeof options.checkServerIdentity,'function');
    const req=new EventEmitter();req.end=()=>queueMicrotask(()=>{
      const res=new EventEmitter();res.statusCode=202;callback(res);
      res.emit('data',Buffer.from(JSON.stringify({state:'SAVED_ONE_HELD_DEVICE_RECEIPT',
        privateConnection:'DISCONNECTED / HOLD'})));res.emit('end');
    });return req;
  };
  const endpoint='https://private.test.ts.net/private/ql339b/hub/heartbeat';
  const answer=await sendPinnedTestHeartbeat(packet,endpoint,'a'.repeat(64),fake);
  assert.equal(answer.connected,false);assert.equal(called,1);
  for(const invalid of ['http://private.test.ts.net/private/ql339b/hub/heartbeat',
    'https://public.example.com/private/ql339b/hub/heartbeat',
    'https://private.test.ts.net/public',
    'https://private.test.ts.net/private/ql339b/hub/heartbeat?token=x']){
    assert.throws(()=>sendPinnedTestHeartbeat(packet,invalid,'a'.repeat(64),fake),/DENY_PRIVATE/);
  }
  assert.equal(called,1);
});
