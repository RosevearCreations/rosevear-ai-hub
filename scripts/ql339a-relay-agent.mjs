/** QL-339A Windows Hub relay: owner-safe local health probe; no cloud sender or device access. */
import {get as httpGet} from 'node:http';
import {fileURLToPath} from 'node:url';

export const HUB_LOOPBACK_HEALTH='http://127.0.0.1:8765/health';
const MAX_BYTES=4_096;
const result=(state,extra={})=>Object.freeze({schema:'rosevear.hub.ql339a.local-probe.v1',
  state,commsConnection:'DISCONNECTED / HOLD',cloudRequests:0,deviceActions:0,
  customerBytes:0,relayActivated:false,...extra});

export function classifyLocalHealth(status,body){
  if(status!==200)return result('HOLD_LOCAL_HTTP_STATUS',{httpStatus:status});
  if(typeof body!=='string'||Buffer.byteLength(body)>MAX_BYTES)
    return result('HOLD_LOCAL_RESPONSE_SIZE');
  let payload;
  try{payload=JSON.parse(body)}catch{return result('HOLD_LOCAL_INVALID_JSON');}
  if(!payload||typeof payload!=='object'||Array.isArray(payload)||
    payload.status!=='ok'||payload.service!=='Rosevear AI Hub')
    return result('HOLD_WRONG_LOCAL_PROCESS_OR_VERSION');
  return result('LOCAL_HUB_HEALTH_VERIFIED_TEST_ONLY',{localStatus:'ok',
    localService:'Rosevear AI Hub'});
}

/** Only loopback HTTP GET, with no redirect following, no body upload and no secrets. */
export async function probeLocalHub(get=httpGet){
  return new Promise(resolve=>{
    let resolved=false;
    const finish=value=>{if(!resolved){resolved=true;resolve(value);}};
    let request;
    try{
      request=get(HUB_LOOPBACK_HEALTH,{timeout:3000,
        headers:{Accept:'application/json','Cache-Control':'no-store'}},response=>{
        const chunks=[];let length=0;
        response.on('data',chunk=>{
          length+=chunk.length;
          if(length>MAX_BYTES){request.destroy();finish(result('HOLD_LOCAL_RESPONSE_SIZE'));return;}
          chunks.push(chunk);
        });
        response.on('end',()=>finish(classifyLocalHealth(response.statusCode,
          Buffer.concat(chunks).toString('utf8'))));
        response.on('error',()=>finish(result('HOLD_LOCAL_READ_FAILED')));
      });
      request.on('timeout',()=>request.destroy());
      request.on('error',()=>finish(result('HOLD_LOCAL_UNREACHABLE')));
    }catch{finish(result('HOLD_LOCAL_UNREACHABLE'));}
  });
}

export function scheduledHold(){
  return result('HOLD_AGENT_NOT_AUTHORIZED_OR_PAIRED',{backgroundTask:'INSTALLABLE_DISABLED',
    reason:'No authenticated original owner approvals, signer custody or Comms receiver'});
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  const mode=process.argv[2]??'--inspect';
  if(mode==='--help'){
    process.stdout.write('QL-339A: --inspect (offline), --probe-local (loopback GET only), --scheduled-hold (no connectivity).\n');
  }else if(mode==='--inspect'){
    process.stdout.write(JSON.stringify(scheduledHold())+'\n');
  }else if(mode==='--probe-local'){
    const state=await probeLocalHub();process.stdout.write(JSON.stringify(state)+'\n');
    if(state.state!=='LOCAL_HUB_HEALTH_VERIFIED_TEST_ONLY')process.exitCode=1;
  }else if(mode==='--scheduled-hold'){
    process.stdout.write(JSON.stringify(scheduledHold())+'\n');
    process.exitCode=78; // Never report scheduled execution as a connected service.
  }else{
    process.stderr.write('DENY_UNKNOWN_OR_ACTIVATION_MODE\n');process.exitCode=2;
  }
}
