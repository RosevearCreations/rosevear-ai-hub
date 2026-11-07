import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const model=readFileSync("apps/web/src/commsTrial268.ts","utf8");
const ui=readFileSync("apps/web/src/CommsTrial268Panel.tsx","utf8");
const parent=readFileSync("apps/web/src/CommsTruth267Panel.tsx","utf8");
const tests=readFileSync("apps/web/src/commsTrial268.test.ts","utf8");
const guide=readFileSync("docs/BUILD_268_ORIGINAL_RECEIVER_AUTHENTICATION_FIRST_GET_SAFETY_GATE.md","utf8");
for(const term of ["reviewOriginalTruth267","canonicalSignedOriginalSource267",
  "canonicalSignedIndependentTrust267","canonicalSignedOwnerTrial267",
  "verifyPinnedEd25519Signature258","original_host_binding_sha256","source_enrollment_sha256",
  "source_registry_row_sha256","receiver_tls_pin_sha256","receiver_signer_pin_sha256",
  "original_database_row_sha256","private_get_handler_contract_sha256",
  "tailnet_acl_readback_sha256","AUTHENTICATED_ORIGINAL_HOST_READ_ONLY",
  "OWNER_APPROVED_ONE_NONPRODUCTION_GET_PENDING_PRIVATE_OPERATOR_GATE",
  "challenge_nonce!==prior.testRequest.challenge_nonce","max_requests!==1",
  "expiresAt-signedAt<=10*60000","HEALTH_READ_ONLY_NONPRODUCTION",
  "signedAt<=Date.parse(trial.expires_at)","private_get_handler_deployed_verified:false as const",
  "authenticated_original_host_externally_verified:false as const",
  "separate_test_authorization_externally_verified:false as const",
  "first_get_authorized:false as const","first_get_executed:false as const",
  "receiver_activated:false as const","comms_connected:false as const",
  'connection_state:"DISCONNECTED / HOLD" as const',"remote_requests:0 as const"])
  assert.ok(model.includes(term),`Build 268 must preserve separately authorized original private trial HOLD: ${term}`);
for(const forbidden of ["fetch(","XMLHttpRequest(","navigator.sendBeacon(","Start-Process",
  "Start-ScheduledTask","Invoke-RestMethod","--activate","window.location.href="])
  assert.ok(!model.includes(forbidden),`Build 268 must not execute Comms: ${forbidden}`);
for(const term of ["ORIGINAL AUTHENTICATION HOLD","SEPARATE TRIAL GRANT HOLD",
  "EXTERNAL PROOF REQUIRED","DISCONNECTED / HOLD","zero remote requests",
  "type=\"file\"","The client never executes the GET"])
  assert.ok(ui.toLowerCase().includes(term.toLowerCase()),`Build 268 panel missing: ${term}`);
assert.match(parent,/<CommsTrial268Panel prior=\{prior\} get=\{get\} shutdown=\{shutdown\}/);
assert.match(tests,/first_get_executed\)\.toBe\(false\)/);
assert.match(tests,/independentOwnerGrantCandidate\)\.toBe\(true\)/);
assert.match(guide,/POST-only/);
assert.match(guide,/supabase/i);
assert.match(guide,/STOP \/ HOLD/);
console.log("Build 268 original receiver authentication, independent one-GET candidate and non-activation security contract passed.");
