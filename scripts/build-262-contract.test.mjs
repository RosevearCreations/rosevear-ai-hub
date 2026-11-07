import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync("apps/web/src/modern2026.css", "utf8");
const probe = readFileSync("apps/web/src/clientReadiness262.ts", "utf8");
const control = readFileSync("apps/web/src/ClientRestartControl.tsx", "utf8");
const windows = readFileSync("scripts/inspect-hub-closure-262.ps1", "utf8");
const docs = readFileSync("docs/BUILD_262_DARK_RUNTIME_CLIENT_VERIFICATION.md", "utf8");
for (const required of ['[data-theme="dark"]', '[data-theme="standard"]', '.content .home-operations-hub',
  '.home-ops-health-card', '.home-ops-observation', '.home-ops-route-grid button',
  '.home-ops-room-grid article', '.home-ops-contexts button[aria-pressed="true"]', ':focus-visible']) {
  assert.ok(css.includes(required), `Missing contrast correction ${required}`);
}
function contrast(a, b) {
  const luminance = (hex) => {
    const rgb = hex.match(/[\da-f]{2}/gi).map((part) => parseInt(part, 16) / 255);
    const linear = rgb.map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  };
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
for (const [foreground, background] of [['#eef5ff','#1e3149'],['#c1d3e7','#1e3149'],
  ['#eef5ff','#233a52'],['#eef5ff','#263e59'],['#b4e3f3','#121e31']]) {
  assert.ok(css.includes(foreground) && css.includes(background), 'Contrast palette source drift');
  assert.ok(contrast(foreground, background) >= 4.5, `Insufficient normal-text contrast ${foreground} / ${background}`);
}
assert.ok(!css.includes('data-theme="high-contrast"]) .content .home-operations-hub'), 'High-contrast palette must remain separate');
for (const required of ['CLIENT_SOURCE_262_MARKER', 'credentials: "same-origin"', 'redirect: "error"',
  'cache: "no-store"', 'UNVERIFIED_SOURCE_HOLD', 'text/javascript']) {
  assert.ok(probe.includes(required) || (required === 'text/javascript' && probe.includes('javascript')), `Missing source-probe guard ${required}`);
}
assert.match(control, /Verify served client code/);
assert.match(control, /does not verify the Windows process or installed release/);
for (const required of ['inspect-hub-installed-261.ps1', 'hub-recovery-mode.ps1', 'Get-HubRecoveryMode',
  'Get-ScheduledTask', 'Get-ScheduledTaskInfo', 'recovery_success_is_process_proof = $false',
  "runtime_identity_closure = 'HOLD_PENDING_ORIGINAL_PROCESS_COMMAND_AND_SIGNED_RELEASE_RECEIPT'",
  'test_authorized = $false', 'changed_anything = $false', 'remote_requests = 0']) {
  assert.ok(windows.includes(required), `Missing original runtime HOLD guard ${required}`);
}
for (const forbidden of ['Start-Process', 'Stop-Process', 'Start-ScheduledTask', 'Disable-ScheduledTask',
  'Enable-ScheduledTask', 'Set-ScheduledTask', 'Invoke-WebRequest', 'Invoke-RestMethod',
  'Set-Content', 'Out-File', 'New-Item']) {
  assert.ok(!windows.includes(forbidden), `Read-only script may not use ${forbidden}`);
}
assert.match(docs, /not proof of installed/i);
assert.match(docs, /recovery task/i);
assert.match(docs, /HOLD/);
console.log('Build 262 dark contrast, read-only Windows runtime closure and safe source verification contract passed.');
