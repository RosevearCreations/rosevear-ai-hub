import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const script = readFileSync("scripts/inspect-hub-installed-261.ps1", "utf8");
const model = readFileSync("apps/web/src/installedSource261.ts", "utf8");
const panel = readFileSync("apps/web/src/InstalledSource261Panel.tsx", "utf8");
const parent = readFileSync("apps/web/src/ProcessEvidence256Panel.tsx", "utf8");
const docs = readFileSync("docs/BUILD_261_SIGNED_INSTALLED_SOURCE_SUPERVISED_RESTART_TEST_HOLD.md", "utf8");
for (const required of ["inspect-hub-runtime-260.ps1", "hub-release-policy.ps1",
  "Test-HubWebProcessIdentity", "Get-NetTCPConnection", "Get-CimInstance",
  "Get-FileHash", "checkout_artifacts_only", "original_installed_source_verified = $false",
  "supervised_restart_receipt_verified = $false", "independent_witness_verified = $false",
  "test_authorized = $false", "challenge_executed = $false", "receiver_activated = $false",
  "comms_connected = $false", "changed_anything = $false", "remote_requests = 0"])
  assert.ok(script.includes(required), `Build 261 missing read-only guard: ${required}`);
for (const forbidden of ["Start-Process", "Stop-Process", "Stop-Service", "Start-Service",
  "Set-ScheduledTask", "Enable-ScheduledTask", "Disable-ScheduledTask", "Start-ScheduledTask",
  "Invoke-WebRequest", "Invoke-RestMethod", "Set-Content", "Out-File", "New-Item", "--activate"])
  assert.ok(!script.includes(forbidden), `Build 261 read-only inspector cannot invoke ${forbidden}`);
for (const required of ["parseRuntime260", "reviewRuntime260", "verifyPinnedEd25519Signature258",
  "CHECKOUT_ARTIFACTS_AND_LAUNCH_TEMPLATE_CANDIDATE_ONLY", "matched_unattested",
  "SIGNED_INSTALLED_RUNTIME_CANDIDATE_TEST_HOLD", "sourceHash", "recovery_task_state",
  "installed_release_attested: false as const", "process_attested: false as const",
  "restart_executed_by_app: false as const", "test_authorized: false as const",
  "challenge_executed: false as const", "comms_connected: false as const"])
  assert.ok(model.includes(required), `Build 261 model missing issuer/owner/witness gate: ${required}`);
assert.match(panel, /OFF \/ NOT AUTHORIZED \/ HOLD/);
assert.match(panel, /NOT ATTESTED/);
assert.match(parent, /<InstalledSource261Panel/);
assert.match(docs, /actual.*launch/i);
assert.match(docs, /not.*proof/i);
assert.match(docs, /do not.*kill/i);
assert.match(docs, /separately.*authenticated/i);
console.log("Build 261 Windows installed-source mapping, signed supervised receipt and TEST HOLD contract passed.");
