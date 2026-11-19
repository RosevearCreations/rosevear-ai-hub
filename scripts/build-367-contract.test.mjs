import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(path, "utf8");
const src = read("server/src/rosevear_ai_hub/live_sources367.py");
const api = read("server/src/rosevear_ai_hub/api/live_sources367.py");
const app = read("server/src/rosevear_ai_hub/main.py");
const cli = read("scripts/collect-signed-sysop367.py");
const ui = read("apps/web/src/SysopLive367.tsx");
const host = read("apps/web/src/SevenAppSysop365Panel.tsx");
const sourceTruth = read("docs/SOURCE_OF_TRUTH.md");
const queue = read("docs/BUILD_QUEUE_368_387_HOME_NETWORK_MASTERS.md");
const score = JSON.parse(read("docs/contracts/hub-feature-progress367.json"));

test("Build 367 TLS, signed source, exact one-pass command and owner-only GET", () => {
  for (const token of [
    "safe_peer_url367", "ipaddress.IPv4Address", "ssl.create_default_context",
    "check_hostname = True", "verify_mode = ssl.CERT_REQUIRED",
    "trust_env=False", "follow_redirects=False",
    '"GET"', "verify_peer365", "append_verified366",
    "UNIQUE(app_id,event_id)", "HOLD_SYSOP367_TLS_NOT_AUTHENTICATED",
  ]) assert.ok(src.includes(token), "Missing secured source step: " + token);
  for (const token of [
    'parser.add_argument("--once", action="store_true")',
    "HOLD_SYSOP367_EXPLICIT_ONCE_REQUIRED",
    "collect_once367",
  ]) assert.ok(cli.includes(token), "Missing explicit one-pass guard: " + token);
  assert.match(api, /require_roles\("owner"\)/);
  assert.match(api, /@router.get\(""/);
  assert.ok(app.includes("application.include_router(live_sources367_router)"));
  assert.ok(ui.includes("threeMasterRuntimeGreen"));
  assert.ok(ui.includes("HOLD"));
  assert.ok(host.includes("<SysopLive367 />"));
});

test("Canonical Source of Truth covers new real-home network, workshop and grocery scope", () => {
  for (const term of [
    "Alexa", "SmartThings", "HomeKit", "Matter", "Creality",
    "Home Assistant", "MQTT", "grocery board", "network sequencing",
    "privacy", "security", "date/time pickers",
  ]) assert.ok(sourceTruth.toLowerCase().includes(term.toLowerCase()), term);
});

test("Exactly 20 numbered actionable builds remain, 368 to 387", () => {
  const headings = [...queue.matchAll(/^### Build (\d+) — (.+)$/gm)];
  assert.equal(headings.length, 20);
  for (let i = 0; i < 20; i++) {
    assert.equal(Number(headings[i][1]), 368 + i);
    assert.ok(headings[i][2].length > 10);
  }
  assert.match(queue, /5–10/);
  assert.match(queue, /Grocery ordering board/);
  assert.match(queue, /text input widths/);
  assert.match(queue, /private receiver QL-340C/i);
});

test("Expanded baseline uses real denominator and does not invent signed field GREEN", () => {
  assert.equal(score.build, 367);
  assert.equal(score.sourceModuleCount, 24);
  assert.equal(score.modules.length, 24);
  const avg = score.modules.reduce((sum, x) => sum + x.estimatedSourceCoveragePercent, 0) / 24;
  assert.equal(Number(avg.toFixed(1)), score.estimatedExpandedScopeSourcePercent);
  assert.equal(score.fieldAcceptancePlanningEstimatePercent, 18);
  assert.equal(Number((0.65 * avg + 0.35 * 18).toFixed(1)), score.estimatedExpandedOverallPercent);
  assert.equal(score.futureBuildCount, 20);
  assert.equal(score.nextBuild, 368);
  assert.ok(score.activeHolds.some(x => x.includes("three-Master")));
});
