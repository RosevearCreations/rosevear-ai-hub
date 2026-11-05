import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {HUB_LOOPBACK_HEALTH,classifyLocalHealth,probeLocalHub,scheduledHold} from './ql339a-relay-agent.mjs';

test('local health probe trusts only the known loopback identity and redacts payload',()=>{
  const valid=classifyLocalHealth(200,'{"status":"ok","service":"Rosevear AI Hub","privateHost":"not-sent"}');
  assert.equal(valid.state,'LOCAL_HUB_HEALTH_VERIFIED_TEST_ONLY');
  assert.equal(valid.cloudRequests,0);assert.equal(valid.relayActivated,false);
  assert.equal(JSON.stringify(valid).includes('privateHost'),false);
  for(const [code,body,expected] of [[301,'{}','HOLD_LOCAL_HTTP_STATUS'],
    [401,'{}','HOLD_LOCAL_HTTP_STATUS'],[200,'not-json','HOLD_LOCAL_INVALID_JSON'],
    [200,'{"status":"ok","service":"other"}','HOLD_WRONG_LOCAL_PROCESS_OR_VERSION'],
    [200,'x'.repeat(4097),'HOLD_LOCAL_RESPONSE_SIZE']])
    assert.equal(classifyLocalHealth(code,body).state,expected);
  assert.equal(HUB_LOOPBACK_HEALTH,'http://127.0.0.1:8765/health');
});

test('loopback probe makes one bounded GET and never follows redirects',async()=>{
  const calls=[];
  const get=(url,opts,onResponse)=>{
    calls.push({url,opts});
    const request=new EventEmitter();request.destroy=()=>request.emit('error',new Error('aborted'));
    queueMicrotask(()=>{
      const response=new PassThrough();response.statusCode=200;
      onResponse(response);response.end('{"status":"ok","service":"Rosevear AI Hub"}');
    });
    return request;
  };
  const r=await probeLocalHub(get);
  assert.equal(r.state,'LOCAL_HUB_HEALTH_VERIFIED_TEST_ONLY');
  assert.equal(calls.length,1);
  assert.equal(calls[0].url,HUB_LOOPBACK_HEALTH);
  assert.equal(calls[0].opts.timeout,3000);
  assert.equal(calls[0].opts.headers.Accept,'application/json');
  assert.equal(r.commsConnection,'DISCONNECTED / HOLD');
});

test('disabled or unknown activation commands never call cloud or device APIs',()=>{
  assert.equal(scheduledHold().state,'HOLD_AGENT_NOT_AUTHORIZED_OR_PAIRED');
  const script=fileURLToPath(new URL('./ql339a-relay-agent.mjs',import.meta.url));
  const normal=spawnSync(process.execPath,[script,'--inspect'],{encoding:'utf8'});
  assert.equal(normal.status,0);
  assert.equal(JSON.parse(normal.stdout).relayActivated,false);
  const denied=spawnSync(process.execPath,[script,'--start'],{encoding:'utf8'});
  assert.equal(denied.status,2);
  assert.match(denied.stderr,/DENY_UNKNOWN_OR_ACTIVATION_MODE/);
  const scheduled=spawnSync(process.execPath,[script,'--scheduled-hold'],{encoding:'utf8'});
  assert.equal(scheduled.status,78);
  assert.equal(JSON.parse(scheduled.stdout).commsConnection,'DISCONNECTED / HOLD');
});
