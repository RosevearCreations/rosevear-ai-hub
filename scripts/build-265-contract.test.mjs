import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const model=readFileSync("apps/web/src/commsReceipt265.ts","utf8");
const panel=readFileSync("apps/web/src/CommsReceipt265Panel.tsx","utf8");
const parent=readFileSync("apps/web/src/RuntimeAuthority264Panel.tsx","utf8");
const tests=readFileSync("apps/web/src/commsReceipt265.test.ts","utf8");
const docs=readFileSync("docs/BUILD_265_PRIVATE_COMMS_GET_SHUTDOWN_OWNER_ACCEPTANCE.md","utf8");

for(const term of ["reviewRuntimeAuthority264","verifyPinnedEd25519Signature258",
  "canonicalSignedRequest265","canonicalPrivateGet265","canonicalSignedGet265",
  "canonicalShutdown265","canonicalSignedShutdown265","canonicalAcceptance265",
  "nonce_ledger_sha256","receiver_signer_pin_sha256","receiver_tls_pin_sha256",
  "http_status!==200","receiver_state_after!==\"OFF\"","credentials_state!==\"REVOKED\"",
  "nonce_state!==\"CONSUMED\"","audit_state!==\"DURABLE\"",
  "ACCEPT_SIGNED_TEST_EVIDENCE_FOR_REVIEW_ONLY","DISCONNECTED / HOLD",
  "SIGNED_GET_SHUTDOWN_AND_OWNER_CANDIDATE_EXTERNAL_HOLD",
  "original_receiver_independently_authenticated:false as const",
  "actual_get_independently_verified:false as const","shutdown_independently_verified:false as const",
  "owner_external_acceptance_verified:false as const","test_authorized:false as const",
  "challenge_executed:false as const","receiver_activated:false as const",
  "comms_connected:false as const","remote_requests:0 as const"])
  assert.ok(model.includes(term),`Missing original private TEST evidence gate: ${term}`);
for(const forbidden of ["fetch(","XMLHttpRequest(","navigator.sendBeacon(","Start-Process",
  "Start-ScheduledTask","Invoke-RestMethod","--activate", "window.location.href="])
  assert.ok(!model.includes(forbidden),`Build 265 must never execute or activate Comms: ${forbidden}`);
for(const term of ["Verify signed private GET, shutdown and owners offline",
  "type=\"file\"","DISCONNECTED / HOLD","OFF PROOF HOLD","prior?"])
  assert.ok(panel.includes(term),`Missing original evidence intake or HOLD status: ${term}`);
assert.match(parent,/<CommsReceipt265Panel prior=\{previousEvidence\}/);
assert.match(tests,/crossDeviceCandidate\)\.toBe\(true\)/);
assert.match(tests,/comms_connected\)\.toBe\(false\)/);
assert.match(docs,/not by itself proof that a claimed event really happened/i);
assert.match(docs,/actual privately authorized GET/i);
assert.match(docs,/STOP \/ HOLD/);
console.log("Build 265 signed private GET, receiver shutdown, cross-device review and DISCONNECTED/HOLD contract passed.");
