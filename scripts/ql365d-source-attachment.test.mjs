/** QL-365D AI Hub public source attachment: HELD discovery cannot grant a private GET. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const manifestPath=new URL('../apps/web/public/.well-known/rosevear-integration-manifest.json',import.meta.url);
const handlerPath=new URL('../server/src/rosevear_ai_hub/api/ql364_source_health.py',import.meta.url);
const routerPath=new URL('../server/src/rosevear_ai_hub/api/integration_v1.py',import.meta.url);
const immutableAuditedSource='be99d882d6b75310b948911a81b2dcb5f3a3629e';

test('QL-365D source discovery names the original local support shell and an immutable audited source',()=>{
  const m=JSON.parse(readFileSync(manifestPath,'utf8'));
  const keys=['schema','manifest_version','source_id','source_app_id','source_role','repository',
    'source_revision','issuer','audience','tenant_boundary','legacy_integration_v1','transport',
    'requested_scope','failure_behavior','signature','connection_state'];
  assert.deepEqual(Object.keys(m).sort(),keys.sort());
  assert.equal(m.schema,'rosevear.integration.discovery.v1');
  assert.equal(m.source_id,'rosevear-ai-hub');
  assert.equal(m.source_app_id,'rosevear-ai-hub');
  assert.equal(m.source_role,'local_support');
  assert.equal(m.repository,'RosevearCreations/rosevear-ai-hub');
  assert.equal(m.tenant_boundary,'no_customer_tenant');
  assert.equal(m.issuer,'rosevear-ai-hub');
  assert.equal(m.audience,'rosevear-master');
  assert.match(m.source_revision,/^[a-f0-9]{40}$/);
  assert.equal(m.source_revision,immutableAuditedSource);
  assert.deepEqual(m.legacy_integration_v1.allowed_paths,
    ['/api/integration/v1/health','/api/integration/v1/capabilities']);
  assert.equal(m.transport.origin,null);
  assert.equal(m.transport.redirects,'DENY');
  assert.equal(m.requested_scope,'public_nonsecret_discovery_only');
  assert.equal(m.failure_behavior,'HOLD_AND_QUARANTINE');
  assert.deepEqual(m.signature,{algorithm:'Ed25519',key_id:null,value:null,
    state:'AWAITING_INDEPENDENT_SOURCE_SIGNER'});
  assert.equal(m.connection_state,'DISCONNECTED / HOLD');
});

test('QL-365D original source GET is private, exact, and retains fail-closed callbacks',()=>{
  const handler=readFileSync(handlerPath,'utf8');
  const router=readFileSync(routerPath,'utf8');
  assert.match(handler,/PATH = "\/api\/integration\/v1\/shell\/health"/);
  assert.match(handler,/SOURCE_ID = "rosevear-ai-hub"/);
  for(const callback of ['approve_original_get','claim_operation','sign_source_receipt']){
    assert.ok(handler.includes(callback),`missing ${callback} gate`);
  }
  assert.match(handler,/"DENY_NONCE_REPLAY_OR_DURABLE_STORAGE_UNAVAILABLE"/);
  assert.match(handler,/"HOLD_INDEPENDENT_ORIGINAL_AUTHORIZATION_MISSING"/);
  assert.match(router,/"\/shell\/health"/);
  assert.match(router,/return await source_health\(request\)/);
  assert.doesNotMatch(router,/return await source_health\(request,\s*approve_original_get=/);
});
