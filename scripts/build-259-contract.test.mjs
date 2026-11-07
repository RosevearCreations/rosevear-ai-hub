import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const script = readFileSync("scripts/inspect-hub-launcher-259.ps1", "utf8");
const model = readFileSync("apps/web/src/launcherCustody259.ts", "utf8");
const panel = readFileSync("apps/web/src/LauncherCustody259Panel.tsx", "utf8");
const docs = readFileSync("docs/BUILD_259_WINDOWS_LAUNCHER_CUSTODY_RESTART_TEST_WITNESS.md", "utf8");
for (const required of ["inspect-hub-identity-258.ps1", "Get-NetTCPConnection", "Get-CimInstance",
  "process_predates_checkout_commit", "recovery_script_mentioned", "ancestor_kinds", "startup_task_state",
  "HOLD_PENDING_ORIGINAL_LAUNCHER_CUSTODY", "restart_authorized = $false", "challenge_executed = $false",
  "test_authorized = $false", "receiver_activated = $false", "comms_connected = $false",
  "changed_anything = $false", "remote_requests = 0"])
  assert.ok(script.includes(required), `Missing Build 259 read-only custody guard: ${required}`);
for (const forbidden of ["Start-Process", "Stop-Process", "Register-ScheduledTask", "Set-ScheduledTask",
  "Start-ScheduledTask", "Invoke-RestMethod", "Invoke-WebRequest", "Set-Content", "Out-File",
  "--send-once", "--enroll", "--activate"])
  assert.ok(!script.includes(forbidden), `Build 259 observer must not mutate host: ${forbidden}`);
for (const required of ["verifyPinnedEd25519Signature258", "OFFLINE_PREFLIGHT_ONLY", "originalReceiptAccepted",
  "offlineWitnessAccepted", "test_authorized: false as const", "challenge_executed: false as const",
  "receiver_activated: false as const", "comms_connected: false as const",
  "restart_authorized: false as const", "ORIGINAL_LAUNCHER_AND_TEST_OWNER_HOLD"])
  assert.ok(model.includes(required), `Missing Build 259 signed review guard: ${required}`);
assert.match(panel, /NOT EXECUTED \/ OFF \/ HOLD/);
assert.match(docs, /separate.*decisions/i);
assert.match(docs, /not.*genuine private network challenge/i);
console.log("Build 259 launcher custody and independent offline TEST witness HOLD contract passed.");
