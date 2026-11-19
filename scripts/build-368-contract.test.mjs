import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Build 368 owner-only source wiring and no active network probes", () => {
  const main = read("server/src/rosevear_ai_hub/main.py");
  const view = read("apps/web/src/HomeAssistantView.tsx");
  const api = read("server/src/rosevear_ai_hub/api/network_trust368.py");
  assert.ok(main.includes("application.include_router(network_trust368_router)"));
  assert.ok(view.includes("<NetworkTrust368 role={currentUser.role} />"));
  assert.ok(api.includes('require_roles("owner")'));
  for (const forbidden of ["subprocess.run(", "socket.socket(", "os.system(", "nmap", "scapy"]) {
    assert.equal(api.includes(forbidden), false);
  }
  assert.ok(api.includes('"networkProbesPerformed": 0'));
  assert.ok(api.includes("OWNER_ENTERED_UNVERIFIED"));
  assert.ok(api.includes("key.verify("));
});

test("Build 368 provisional metrics leave original-host field acceptance unchanged", () => {
  const newer = JSON.parse(read("docs/contracts/hub-feature-progress368.json"));
  const older = JSON.parse(read("docs/contracts/hub-feature-progress367.json"));
  assert.equal(newer.modules.length, 24);
  const metric = (data, id) =>
    data.modules.find((item) => item.id === id).estimatedSourceCoveragePercent;
  assert.equal(metric(newer, "security-roles-and-access") - metric(older, "security-roles-and-access"), 5);
  assert.equal(metric(newer, "network-discovery-and-topology") - metric(older, "network-discovery-and-topology"), 8);
  assert.equal(newer.fieldAcceptancePlanningEstimatePercent, older.fieldAcceptancePlanningEstimatePercent);
  assert.equal(newer.nextBuild, 369);
  assert.equal(newer.futureBuildCount, 19);
});
