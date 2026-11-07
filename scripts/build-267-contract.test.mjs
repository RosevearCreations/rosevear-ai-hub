import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const model=readFileSync("apps/web/src/commsTruth267.ts","utf8");
const panel=readFileSync("apps/web/src/CommsTruth267Panel.tsx","utf8");
const parent=readFileSync("apps/web/src/CommsAudit266Panel.tsx","utf8");
const test=readFileSync("apps/web/src/commsTruth267.test.ts","utf8");
const guide=readFileSync("docs/BUILD_267_ORIGINAL_RECEIVER_SOURCE_TRUTH_INDEPENDENT_OWNER_TRUST.md","utf8");
for(const term of ["reviewOriginalAudit266","canonicalSignedReceiverAudit266",
  "canonicalSignedNonceClosure266","canonicalSignedOwnerTransition266","verifyPinnedEd25519Signature258",
  "source_registry_row_sha256","source_enrollment_sha256","audit_snapshot_sha256",
  "revocation_ledger_sha256","nonce_tombstone_sha256","receiver_tls_pin_sha256",
  "original_host_binding_sha256","independent_channel_receipt_sha256","LOCAL_READ_ONLY",
  "INDEPENDENT_AUTHENTICATED_READ_ONLY","no_replay_get_sent","accepted_get_count!==1",
  "duplicate_get_count!==0","ACCEPT_EVIDENCE_FOR_SEPARATE_READ_ONLY_TRIAL_PLANNING_ONLY",
  "signedAt<=Date.parse(decision.expires_at)","test_authorized===false",
  "SIGNED_ORIGINAL_TRUTH_INDEPENDENT_TRUST_AND_OWNER_TRIAL_CANDIDATE_EXTERNAL_HOLD",
  "original_receiver_source_of_truth_externally_verified:false as const",
  "independent_owner_trust_externally_verified:false as const",
  "separate_test_authorization_verified:false as const","trial_authorized:false as const",
  "receiver_activated:false as const","comms_connected:false as const",
  'connection_state:"DISCONNECTED / HOLD" as const',"remote_requests:0 as const"])
  assert.ok(model.includes(term),`Build 267 original private trust HOLD missing: ${term}`);
for(const forbidden of ["fetch(","XMLHttpRequest(","navigator.sendBeacon(","Start-Process",
  "Start-ScheduledTask","Invoke-RestMethod","--activate","window.location.href="])
  assert.ok(!model.includes(forbidden),`Build 267 must not execute Comms: ${forbidden}`);
for(const term of ["ORIGINAL SOURCE HOLD","INDEPENDENT TRUST HOLD","TRIAL AUTHORIZATION HOLD",
  "DISCONNECTED / HOLD","type=\"file\"","Zero remote requests"])
  assert.ok(panel.includes(term),`Build 267 panel missing: ${term}`);
assert.match(parent,/<CommsTruth267Panel prior=\{prior\} get=\{get\} shutdown=\{shutdown\}/);
assert.match(test,/ownerTrialCandidate\)\.toBe\(true\)/);
assert.match(test,/comms_connected\)\.toBe\(false\)/);
assert.match(guide,/STOP \/ HOLD/);
assert.match(guide,/signed JSON claim alone/i);
assert.match(guide,/independent.*authenticated/i);
console.log("Build 267 original source, independent trust, owner trial planning and fail-closed Comms HOLD contract passed.");
