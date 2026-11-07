import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const script = readFileSync("scripts/inspect-hub-runtime-260.ps1", "utf8");
const model = readFileSync("apps/web/src/supervisedRuntime260.ts", "utf8");
const panel = readFileSync("apps/web/src/SupervisedRuntime260Panel.tsx", "utf8");
const parent = readFileSync("apps/web/src/ProcessEvidence256Panel.tsx", "utf8");
const docs = readFileSync("docs/BUILD_260_SUPERVISED_WINDOWS_ACTIVATION_RUNTIME_TEST_HANDOFF.md", "utf8");
for (const required of ["inspect-hub-launcher-259.ps1", "ValidateSet('before', 'after')",
  "operator_stage_is_not_proof = $true", "supervised_restart_authorized = $false",
  "supervised_restart_performed_attested = $false", "installed_release_attested = $false",
  "independent_runtime_verified = $false", "test_authorized = $false",
  "challenge_executed = $false", "receiver_activated = $false", "comms_connected = $false",
  "changed_anything = $false", "remote_requests = 0"])
  assert.ok(script.includes(required), `Build 260 observer missing fail-closed guard: ${required}`);
for (const forbidden of ["Start-Process", "Stop-Process", "Stop-Service", "Start-Service",
  "Set-ScheduledTask", "Enable-ScheduledTask", "Disable-ScheduledTask", "Start-ScheduledTask",
  "Invoke-WebRequest", "Invoke-RestMethod", "Set-Content", "Out-File", "--activate", "--enroll"])
  assert.ok(!script.includes(forbidden), `Read-only Build 260 observation cannot use ${forbidden}`);
for (const required of ["parseLauncher259", "verifyPinnedEd25519Signature258",
  "SUPERVISED_LOCAL_RELEASE_RESTART_ONLY", "APPROVED_FOR_SUPERVISED_WINDOW",
  "NONPRODUCTION_GET_ONLY", "receiver_state", "owner_test_decision", "sequenceConsistent",
  "SIGNED_POST_RESTART_RUNTIME_CANDIDATE_TEST_HOLD", "installed_release_attested: false as const",
  "test_authorized: false as const", "challenge_executed: false as const",
  "comms_connected: false as const", "restart_executed_by_app: false as const"])
  assert.ok(model.includes(required), `Build 260 model missing independent signature / HOLD guard: ${required}`);
assert.match(panel, /SUPERVISED ONLY — NO APP ACTION/);
assert.match(panel, /OFF \/ NO CHALLENGE \/ HOLD/);
assert.match(parent, /<SupervisedRuntime260Panel/);
assert.match(docs, /separate.*authorization/i);
assert.match(docs, /not.*installed-source/i);
console.log("Build 260 supervised Windows release, independent runtime witness and Comms TEST HOLD contract passed.");
