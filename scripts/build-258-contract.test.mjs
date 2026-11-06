import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const script = readFileSync("scripts/inspect-hub-identity-258.ps1", "utf8");
const model = readFileSync("apps/web/src/processIdentity258.ts", "utf8");
const panel = readFileSync("apps/web/src/ProcessIdentity258Panel.tsx", "utf8");
const docs = readFileSync("docs/BUILD_258_WINDOWS_IDENTITY_ISSUER_TEST_PREFLIGHT.md", "utf8");
for (const needle of ["Get-NetTCPConnection", "Get-CimInstance", "Get-Process", "Get-FileHash",
  "access_restricted_or_unavailable", "started_utc", "startup_task_state", "Get-ScheduledTask",
  "process_attested = $false", "installed_release_attested = $false", "receiver_activated = $false",
  "comms_connected = $false", "changed_anything = $false", "remote_requests = 0"])
  assert.ok(script.includes(needle), `Build 258 inspector missing ${needle}`);
for (const forbidden of ["Start-Process", "Stop-Process", "Register-ScheduledTask", "Set-ScheduledTask",
  "Start-ScheduledTask", "Invoke-RestMethod", "Invoke-WebRequest", "Set-Content", "Out-File", "--enroll", "--send-once"])
  assert.ok(!script.includes(forbidden), `Build 258 must not modify Windows or connect a receiver: ${forbidden}`);
for (const needle of ["crypto.subtle.verify", "crypto.subtle.importKey", "Ed25519", "issuerReceiptAccepted",
  "receiverOffReceiptAccepted", "can_request_test: false as const", "process_attested: false as const",
  "receiver_activated: false as const", "remote_requests: 0 as const", "CONTROLLED_TEST_PREFLIGHT_HOLD"])
  assert.ok(model.includes(needle), `Build 258 evidence verification missing ${needle}`);
assert.match(panel, /OFF \/ HOLD — NOT AUTHORIZED/);
assert.match(docs, /separate owner decisions/i);
assert.match(docs, /Disabled/);
console.log("Build 258 Windows process identity and signed receipt TEST HOLD contract passed.");
