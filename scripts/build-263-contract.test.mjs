import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const script = readFileSync("scripts/inspect-hub-launcher-263.ps1", "utf8");
const model = readFileSync("apps/web/src/launcherAcceptance263.ts", "utf8");
const panel = readFileSync("apps/web/src/LauncherAcceptance263Panel.tsx", "utf8");
const parent = readFileSync("apps/web/src/ProcessEvidence256Panel.tsx", "utf8");
const tests = readFileSync("apps/web/src/launcherAcceptance263.test.ts", "utf8");
const docs = readFileSync("docs/BUILD_263_ORIGINAL_WINDOWS_LAUNCHER_SIGNED_RESTART_COMMS_HOLD.md", "utf8");

for (const term of ["inspect-hub-closure-262.ps1", "hub-release-policy.ps1",
  "Get-NetTCPConnection", "Get-CimInstance", "Test-HubWebProcessIdentity", "Get-LaunchBindingDigest",
  "checkout_reference_observed", "process_started_utc", "launch_binding_sha256",
  "original_launcher_custody_attested = $false", "supervised_restart_attested = $false",
  "independently_signed_runtime_accepted = $false", "test_authorized = $false",
  "challenge_executed = $false", "receiver_activated = $false", "comms_connected = $false",
  "changed_anything = $false", "remote_requests = 0"])
  assert.ok(script.includes(term), `Missing read-only Windows launcher guard: ${term}`);
for (const forbidden of ["Stop-Process", "Start-Process", "Start-ScheduledTask", "Set-ScheduledTask",
  "Disable-ScheduledTask", "Enable-ScheduledTask", "Stop-Service", "Start-Service",
  "Invoke-WebRequest", "Invoke-RestMethod", "Set-Content", "Out-File", "New-Item", "--activate"])
  assert.ok(!script.includes(forbidden), `Windows observer may not mutate systems: ${forbidden}`);
for (const term of ["parseLauncherObservation263", "parseSignedRuntime263", "canonicalLauncher263",
  "canonicalSignedRuntime263", "verifyPinnedEd25519Signature258", "distinct",
  "afterStarted", "expiresMs", "SIGNED_POST_RESTART_RECEIPT_CANDIDATE_TEST_HOLD",
  "original_issuer_independently_authenticated: false as const",
  "installed_runtime_authoritatively_attested: false as const",
  "test_authorized: false as const", "receiver_activated: false as const",
  "comms_connected: false as const", "remote_requests: 0 as const"])
  assert.ok(model.includes(term), `Missing role-bound runtime receipt gate: ${term}`);
for (const term of ["Verify signed local restart receipt without activating Comms",
  "OFF / NOT AUTHORIZED / HOLD", "NOT INDEPENDENTLY ATTESTED", "type=\"file\"", "role=\"status\""])
  assert.ok(panel.includes(term), `Missing owner-visible TEST HOLD: ${term}`);
assert.match(parent, /<LauncherAcceptance263Panel/);
assert.match(tests, /signedCandidate\)\.toBe\(true\)/);
assert.match(tests, /comms_connected\)\.toBe\(false\)/);
assert.match(docs, /not.*automatically.*update/i);
assert.match(docs, /not.*generate.*signature/i);
assert.match(docs, /original.*operator/i);
assert.match(docs, /## Independent Comms TEST authorization/);
console.log("Build 263 Windows launcher custody, three distinct signed local restart candidates and independent Comms TEST HOLD contract passed.");
