import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const script = readFileSync("scripts/inspect-hub-process-256.ps1", "utf8");
const model = readFileSync("apps/web/src/processEvidence256.ts", "utf8");
const panel = readFileSync("apps/web/src/ProcessEvidence256Panel.tsx", "utf8");
const doc = readFileSync("docs/BUILD_256_WINDOWS_PROCESS_AND_TEST_DECISION.md", "utf8");
for (const source of [model, panel, doc]) {
  assert.match(source, /HOLD|hold/i, "All 256 surfaces must preserve the receiver hold.");
}
for (const fragment of ["Get-NetTCPConnection", "Get-CimInstance", "Get-FileHash", "inspect-hub-mapping-253.ps1",
  "installed_release_attested = $false", "process_attested = $false", "comms_connected = $false",
  "changed_anything = $false", "remote_requests = 0"]) {
  assert.ok(script.includes(fragment), `Missing Windows process inspector guard: ${fragment}`);
}
for (const token of ["Start-Process", "Stop-Process", "Start-ScheduledTask", "Register-ScheduledTask",
  "Invoke-WebRequest", "Invoke-RestMethod", "Set-Content", "Out-File", "--send-once", "--enroll"])
  assert.ok(!script.includes(token), `Inspector contains prohibited operation: ${token}`);
assert.match(model, /SIGNED_PROCESS_EXECUTABLE_CANDIDATE_ONLY/);
assert.match(model, /process_attested: false as const/);
assert.match(model, /receiver_activated: false as const/);
assert.match(model, /remote_requests: 0 as const/);
assert.match(panel, /DISCONNECTED \/ HOLD/);
assert.match(doc, /generic interpreter/);
console.log("Build 256 offline source, signed-witness review and receiver-HOLD contract passed.");
