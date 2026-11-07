import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const model=readFileSync("apps/web/src/commsAudit266.ts","utf8");
const panel=readFileSync("apps/web/src/CommsAudit266Panel.tsx","utf8");
const parent=readFileSync("apps/web/src/CommsReceipt265Panel.tsx","utf8");
const tests=readFileSync("apps/web/src/commsAudit266.test.ts","utf8");
const guide=readFileSync("docs/BUILD_266_ORIGINAL_PRIVATE_RECEIVER_AUDIT_NONCE_OWNER_CANDIDATE.md","utf8");

for(const term of ["reviewCommsReceipt265","canonicalSignedRequest265","canonicalSignedGet265",
  "canonicalSignedShutdown265","canonicalSignedAcceptance265","verifyPinnedEd25519Signature258",
  "canonicalReceiverAudit266","canonicalSignedReceiverAudit266","canonicalNonceClosure266",
  "canonicalSignedNonceClosure266","canonicalOwnerTransition266","audit_record_sha256",
  "nonce_ledger_sha256","source_enrollment_sha256","audit_snapshot_sha256",
  "revocation_ledger_sha256","nonce_tombstone_sha256","accepted_get_count!==1",
  "accepted_nonce_count!==1","duplicate_get_count!==0","CONSUMED_NONCE_DENY_REUSE",
  "no_replay_get_sent!==true","REVIEW_READ_ONLY_CONNECTION_CANDIDATE_ONLY",
  "SIGNED_AUDIT_NONCE_CLOSURE_AND_OWNER_CANDIDATE_EXTERNAL_HOLD",
  "original_receiver_audit_independently_verified:false as const",
  "source_enrollment_independently_verified:false as const",
  "nonce_ledger_independently_verified:false as const",
  "owner_external_authorization_verified:false as const",
  "connection_candidate_authorized:false as const","receiver_activated:false as const",
  "comms_connected:false as const","connection_state:\"DISCONNECTED / HOLD\" as const",
  "remote_requests:0 as const"])
  assert.ok(model.includes(term),`Build 266 must preserve original audit and nonce HOLD: ${term}`);
for(const forbidden of ["fetch(","XMLHttpRequest(","navigator.sendBeacon(","Start-Process",
  "Start-ScheduledTask","Invoke-RestMethod","--activate","window.location.href="])
  assert.ok(!model.includes(forbidden),`Build 266 cannot execute Comms: ${forbidden}`);
for(const term of ["ORIGINAL AUDIT HOLD","NONCE REPLAY HOLD","OWNER DECISION HOLD",
  "DISCONNECTED / HOLD","type=\"file\"","zero remote requests"])
  assert.ok(panel.includes(term),`Build 266 review panel missing: ${term}`);
assert.match(parent,/<CommsAudit266Panel prior=\{prior\} get=\{get\} shutdown=\{shutdown\} acceptance=\{owners\}/);
assert.match(tests,/nonceReplayClosureCandidate\)\.toBe\(true\)/);
assert.match(tests,/comms_connected\)\.toBe\(false\)/);
assert.match(guide,/STOP \/ HOLD/);
assert.match(guide,/live source-of-truth/i);
assert.match(guide,/second live GET/i);
console.log("Build 266 original receiver, independent nonce closure, owner candidate and DISCONNECTED/HOLD contract passed.");
