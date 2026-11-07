import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const script=readFileSync("scripts/inspect-hub-authority-264.ps1","utf8");
const model=readFileSync("apps/web/src/runtimeAuthority264.ts","utf8");
const panel=readFileSync("apps/web/src/RuntimeAuthority264Panel.tsx","utf8");
const parent=readFileSync("apps/web/src/ProcessEvidence256Panel.tsx","utf8");
const tests=readFileSync("apps/web/src/runtimeAuthority264.test.ts","utf8");
const docs=readFileSync("docs/BUILD_264_WINDOWS_AUTHORITY_WITNESSED_RESTART_SEPARATE_TEST.md","utf8");

for(const term of ["inspect-hub-launcher-263.ps1","Get-ScheduledTask","Get-ScheduledTaskInfo",
  "Get-AuthorityDigest","host_binding_candidate_sha256","recovery_action_candidate_sha256",
  "recovery_last_result","original_host_authenticated = $false","witnessed_restart_accepted = $false",
  "test_authorized = $false","challenge_executed = $false","receiver_activated = $false",
  "comms_connected = $false","changed_anything = $false","remote_requests = 0"])
  assert.ok(script.includes(term),`Missing Build 264 Windows field readback: ${term}`);
for(const forbidden of ["Stop-Process","Start-Process","Start-ScheduledTask","Set-ScheduledTask",
  "Disable-ScheduledTask","Enable-ScheduledTask","Stop-Service","Start-Service",
  "Invoke-WebRequest","Invoke-RestMethod","Set-Content","Out-File","New-Item","--activate"])
  assert.ok(!script.includes(forbidden),`Read-only authority observer cannot perform ${forbidden}`);
for(const term of ["reviewLauncherAcceptance263","canonicalFieldObservation264","digestFieldObservation264",
  "canonicalRuntimeReceipt264","canonicalFieldReceipt264","verifyPinnedEd25519Signature258",
  "PRIVATE_NONPRODUCTION_SINGLE_GET_ONLY","/api/integration/v1/health",
  "max_requests !== 1","receiver_state !== \"OFF\"","receiver_operator",
  "SEPARATE_SINGLE_GET_SIGNED_REQUEST_CANDIDATE_HOLD","original_host_authenticated:false as const",
  "test_authorized:false as const","challenge_executed:false as const",
  "receiver_activated:false as const","comms_connected:false as const","remote_requests:0 as const"])
  assert.ok(model.includes(term),`Missing signed field/TEST gate: ${term}`);
for(const term of ["Build 264 — Witnessed restart decisions", "type=\"file\"",
  "OFF / NOT AUTHORIZED","ORIGINAL FIELD HOLD"])
  assert.ok(panel.includes(term),`Missing owner field HOLD: ${term}`);
assert.match(parent,/<RuntimeAuthority264Panel/);
assert.match(tests,/testRequestCandidate\)\.toBe\(true\)/);
assert.match(tests,/test_authorized\)\.toBe\(false\)/);
assert.match(docs,/actual.*signed server-side response/i);
assert.match(docs,/synthetic.*not genuine/i);
assert.match(docs,/does not execute the request/i);
console.log("Build 264 original Windows field authority, independent signed TEST-only request and receiver-OFF contract passed.");
