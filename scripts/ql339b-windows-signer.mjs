/** QL-339B: explicitly supervised Windows TEST signer. No daemon or automatic dispatch. */
import {generateKeyPairSync,createHash,createPrivateKey,createPublicKey,randomBytes,randomUUID,
  sign,X509Certificate} from 'node:crypto';
import {request as httpsRequest} from 'node:https';
import {checkServerIdentity} from 'node:tls';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join,resolve} from 'node:path';
import {userInfo} from 'node:os';
import {fileURLToPath} from 'node:url';
import {inspectHeartbeatEnvelope,canonicalRelay,HUB_RELAY_SCHEMA} from './ql338-private-relay.mjs';

const ID=/^[a-z0-9][a-z0-9._:-]{1,63}$/;
const KEYFILE='ql339b-hub.private.pem';
const CANDIDATEFILE='ql339b-hub.public-candidate.json';
const SHA=/^[a-f0-9]{64}$/;
export function ownerKeyDirectory(env=process.env){
  if(process.platform!=='win32'||!env.LOCALAPPDATA)throw Error('WINDOWS_OWNER_DEVICE_REQUIRED');
  return join(env.LOCALAPPDATA,'RosevearAIHub','CommsRelay');
}
export function createEncryptedCandidate({deviceId,workloadId,keyId,passphrase}={}){
  if(![deviceId,workloadId,keyId].every(v=>ID.test(v??''))||
    typeof passphrase!=='string'||passphrase.length<16)throw Error('DENY_OWNER_SIGNER_PARAMETERS');
  const keys=generateKeyPairSync('ed25519');
  const devicePublicKeyPem=keys.publicKey.export({format:'pem',type:'spki'});
  const encryptedPrivateKeyPem=keys.privateKey.export({format:'pem',type:'pkcs8',
    cipher:'aes-256-cbc',passphrase});
  const deviceSpkiSha256=createHash('sha256').update(keys.publicKey.export({
    format:'der',type:'spki'})).digest('hex');
  return {encryptedPrivateKeyPem,candidate:{schema:'rosevear.hub.ql339b.public-candidate.v1',
    deviceId,workloadId,keyId,devicePublicKeyPem,deviceSpkiSha256,
    enrollmentState:'HELD_ORIGINAL_OWNER_SIGNATURES_REQUIRED'}};
}

export function signedTestHeartbeat({candidate,encryptedPrivateKeyPem,passphrase,
  now=Date.now()}={}){
  if(candidate?.schema!=='rosevear.hub.ql339b.public-candidate.v1'||
    ![candidate.deviceId,candidate.workloadId,candidate.keyId].every(v=>ID.test(v??''))||
    !SHA.test(candidate.deviceSpkiSha256??''))throw Error('DENY_CANDIDATE');
  const privateKey=createPrivateKey({key:encryptedPrivateKeyPem,format:'pem',passphrase});
  const publicKey=createPublicKey(privateKey);
  const pinned=createHash('sha256').update(publicKey.export({format:'der',type:'spki'})).digest('hex');
  if(pinned!==candidate.deviceSpkiSha256||
    publicKey.export({format:'pem',type:'spki'})!==candidate.devicePublicKeyPem)
    throw Error('DENY_SIGNER_KEY_MISMATCH');
  const issuedAt=new Date(now).toISOString(),expiresAt=new Date(now+90_000).toISOString();
  const envelope={schemaVersion:HUB_RELAY_SCHEMA,issuer:'rosevear-ai-hub',
    audience:'rosevear-comms-hub:nonproduction',deviceId:candidate.deviceId,
    workloadId:candidate.workloadId,environment:'TEST',sequence:1,
    nonce:randomBytes(20).toString('base64url'),sessionId:randomUUID(),issuedAt,expiresAt,
    capabilities:['health.read','capabilities.read'],queueDepth:0,relayMode:'OUTBOUND_ONLY'};
  if(inspectHeartbeatEnvelope(envelope,now).status!=='SCHEMA_VALID_TEST_ONLY')
    throw Error('DENY_HEARTBEAT_ENVELOPE');
  return {envelope,keyId:candidate.keyId,signature:sign(null,
    Buffer.from(canonicalRelay(envelope)),privateKey).toString('base64url')};
}

/** One bounded outbound HTTPS POST with exact SPKI pin. No redirects or public tunnel. */
export function sendPinnedTestHeartbeat(packet,endpoint,spkiSha256,request=httpsRequest){
  const url=new URL(endpoint);
  if(url.protocol!=='https:'||!url.hostname.endsWith('.ts.net')||
    url.pathname!=='/private/ql339b/hub/heartbeat'||url.username||url.password||
    url.search||url.hash||!SHA.test(spkiSha256??''))throw Error('DENY_PRIVATE_TLS_ROUTE_OR_PIN');
  const bytes=Buffer.from(JSON.stringify(packet));
  if(bytes.length>4096)throw Error('DENY_HEARTBEAT_SIZE');
  return new Promise((resolve,reject)=>{
    const req=request(url,{method:'POST',timeout:5000,rejectUnauthorized:true,
      headers:{'Content-Type':'application/json','Content-Length':bytes.length},
      checkServerIdentity:(host,cert)=>{
        const prior=checkServerIdentity(host,cert);if(prior)return prior;
        try{
          const key=new X509Certificate(cert.raw).publicKey;
          const found=createHash('sha256').update(key.export({format:'der',type:'spki'})).digest('hex');
          if(found!==spkiSha256)return Error('DENY_UNPINNED_PRIVATE_TLS_ORIGIN');
        }catch{return Error('DENY_TLS_CERTIFICATE_PROOF');}
        return undefined;
      }},res=>{
        let output='',length=0;
        res.on('data',chunk=>{length+=chunk.length;
          if(length>4096){req.destroy();reject(Error('DENY_RECEIVER_RESPONSE_SIZE'));return;}
          output+=chunk.toString('utf8');});
        res.on('end',()=>{
          if(res.statusCode!==202)return reject(Error('HOLD_NO_SIGNED_TEST_RECEIPT'));
          try{const receipt=JSON.parse(output);
            if(receipt.state!=='SAVED_ONE_HELD_DEVICE_RECEIPT'||
              receipt.privateConnection!=='DISCONNECTED / HOLD')
              return reject(Error('DENY_RECEIVER_RECEIPT'));
            resolve({state:'SIGNED_TEST_RECEIPT_RECORDED_FIELD_WITNESS_PENDING',
              connected:false,relayActivated:false});
          }catch{return reject(Error('DENY_RECEIVER_RECEIPT'));}
        });
      });
    req.on('timeout',()=>req.destroy(Error('HOLD_PRIVATE_TLS_TIMEOUT')));
    req.on('error',reject);req.end(bytes);
  });
}

/** Windows ACL is applied before writing any encrypted private-key bytes. */
function lockOwnerDirectory(directory){
  const domain=process.env.USERDOMAIN,username=userInfo().username;
  if(!domain||!username)throw Error('DENY_WINDOWS_OWNER_IDENTITY');
  mkdirSync(directory,{recursive:true,mode:0o700});
  const account=`${domain}\\${username}`;
  const command=spawnSync('icacls.exe',[directory,'/inheritance:r','/grant:r',
    `${account}:(OI)(CI)F`,'/remove:g','*S-1-1-0','*S-1-5-32-545'],
  {windowsHide:true,encoding:'utf8',timeout:15000});
  if(command.status!==0)throw Error('HOLD_WINDOWS_DIRECTORY_ACL_NOT_VERIFIED');
}

async function readSecret(prompt){
  if(!process.stdin.isTTY||typeof process.stdin.setRawMode!=='function')
    throw Error('OWNER_INTERACTIVE_TERMINAL_REQUIRED');
  return new Promise((resolve,reject)=>{
    let value='';const wasRaw=process.stdin.isRaw;
    const finish=(error)=>{process.stdin.off('data',onData);
      process.stdin.setRawMode(Boolean(wasRaw));process.stdin.pause();
      process.stderr.write('\n');error?reject(error):resolve(value);};
    const onData=data=>{
      for(const byte of data){
        if(byte===3){finish(Error('OWNER_CANCELLED'));return;}
        if(byte===13||byte===10){finish();return;}
        if(byte===8||byte===127){value=value.slice(0,-1);continue;}
        if(byte>=32&&byte<=126&&value.length<256)value+=String.fromCharCode(byte);
      }
    };
    process.stderr.write(prompt);process.stdin.setRawMode(true);process.stdin.resume();
    process.stdin.on('data',onData);
  });
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const mode=process.argv[2]??'--inspect';
  try{
    if(mode==='--inspect'){
      const directory=ownerKeyDirectory();
      process.stdout.write(JSON.stringify({schema:'rosevear.hub.ql339b.signer.v1',
        encryptedSignerPresent:existsSync(join(directory,KEYFILE)),
        publicCandidatePresent:existsSync(join(directory,CANDIDATEFILE)),
        connected:false,relayActivated:false})+'\n');
    }else if(mode==='--enroll'&&process.argv.length===6){
      const directory=ownerKeyDirectory();
      if(existsSync(join(directory,KEYFILE))||existsSync(join(directory,CANDIDATEFILE)))
        throw Error('DENY_EXISTING_SIGNER_NO_OVERWRITE');
      const passphrase=await readSecret('Create signer passphrase (16+ characters; hidden): ');
      if(passphrase.length<16)throw Error('DENY_WEAK_PASSPHRASE');
      const confirm=await readSecret('Repeat signer passphrase (hidden): ');
      if(passphrase!==confirm)throw Error('DENY_PASSPHRASE_MISMATCH');
      const generated=createEncryptedCandidate({deviceId:process.argv[3],
        workloadId:process.argv[4],keyId:process.argv[5],passphrase});
      lockOwnerDirectory(directory);
      writeFileSync(join(directory,KEYFILE),generated.encryptedPrivateKeyPem,
        {flag:'wx',mode:0o600});
      writeFileSync(join(directory,CANDIDATEFILE),JSON.stringify(generated.candidate,null,2)+'\n',
        {flag:'wx',mode:0o600});
      process.stdout.write(JSON.stringify({state:'HELD_PUBLIC_DEVICE_CANDIDATE_CREATED',
        publicCandidatePath:join(directory,CANDIDATEFILE),privateKeyEncrypted:true,
        privateKeyPrinted:false,connected:false})+'\n');
    }else if((mode==='--sign-once'&&process.argv.length===3)||
      (mode==='--send-once'&&process.argv.length===5)){
      const directory=ownerKeyDirectory();
      const passphrase=await readSecret('Unlock owner TEST signer (hidden): ');
      const packet=signedTestHeartbeat({candidate:JSON.parse(readFileSync(join(directory,CANDIDATEFILE))),
        encryptedPrivateKeyPem:readFileSync(join(directory,KEYFILE),'utf8'),passphrase});
      if(mode==='--sign-once')process.stdout.write(JSON.stringify(packet)+'\n');
      else process.stdout.write(JSON.stringify(await sendPinnedTestHeartbeat(packet,
        process.argv[3],process.argv[4]))+'\n');
    }else throw Error('DENY_UNKNOWN_OR_UNAPPROVED_ACTION');
  }catch(error){process.stderr.write(`${error.message}\n`);process.exitCode=1;}
}
