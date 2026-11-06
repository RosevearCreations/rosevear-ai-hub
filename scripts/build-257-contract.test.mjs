import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const source = readFileSync("scripts/inspect-hub-process-249.ps1", "utf8");
const chain = readFileSync("scripts/inspect-hub-chain-257.ps1", "utf8");
const model = readFileSync("apps/web/src/processChain257.ts", "utf8");
const panel = readFileSync("apps/web/src/ProcessChain257Panel.tsx", "utf8");
const docs = readFileSync("docs/BUILD_257_WINDOWS_CHAIN_ISSUER_RECEIVER_OFF.md", "utf8");

assert.match(source, /IndexOf\(\$expectedScript, \[StringComparison\]::OrdinalIgnoreCase\)/);
assert.ok(!source.includes("$args.Contains($expectedScript)"), "Case-sensitive task comparison must not return.");
for (const required of ["Get-NetTCPConnection", "Get-CimInstance", "Get-FileHash", "inspect-hub-process-249.ps1",
  "checkout_path_in_listener_command", "checkout_path_in_ancestor_command", "receiver_activated = $false",
  "process_attested = $false", "comms_connected = $false", "changed_anything = $false", "remote_requests = 0"])
  assert.ok(chain.includes(required), `Build 257 missing read-only source guard: ${required}`);
for (const forbidden of ["Start-Process", "Stop-Process", "Register-ScheduledTask", "Set-ScheduledTask",
  "Start-ScheduledTask", "Invoke-RestMethod", "Invoke-WebRequest", "Set-Content", "Out-File", "--send-once", "--enroll"])
  assert.ok(!chain.includes(forbidden), `Build 257 process observation must not mutate host: ${forbidden}`);
for (const literal of ["DUAL_SIGNED_WINDOWS_CHAIN_CANDIDATE_ONLY", "INDEPENDENT_RECEIVER_OFF_OWNER_HOLD",
  "process_attested: false as const", "receiver_activated: false as const", "remote_requests: 0 as const"])
  assert.ok(model.includes(literal), `Build 257 trust contract missing: ${literal}`);
assert.match(panel, /OFF \/ HOLD/);
assert.match(docs, /generic interpreters/);
assert.match(docs, /separately controlled laptop/);
console.log("Build 257 offline source-chain, original-issuer and receiver-OFF contract passed.");
