import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Build 369 is mounted, owner-only and never scans or controls devices", () => {
  const main = read("server/src/rosevear_ai_hub/main.py");
  const api = read("server/src/rosevear_ai_hub/api/home_inventory369.py");
  const view = read("apps/web/src/HomeAssistantView.tsx");
  assert.ok(main.includes("application.include_router(home_inventory369_router)"));
  assert.ok(view.includes("<HomeInventory369 role={currentUser.role} />"));
  assert.ok(api.includes('require_roles("owner")'));
  for (const unsafe of ["set_light(", "set_switch(", "activate_scene(", "socket.socket(",
    "subprocess.run(", "nmap", "mqtt.publish(", "subscribe("]) {
    assert.equal(api.includes(unsafe), false, unsafe + " forbidden in snapshot path");
  }
  assert.ok(api.includes('"providerWritesPerformed": 0'));
  assert.ok(api.includes('"physicalDevicesVerified": False'));
  assert.ok(api.includes("missing_from_registry"));
  assert.ok(api.includes("unverified_reference"));
});

test("Build 369 source score does not promote physical home devices", () => {
  const old = JSON.parse(read("docs/contracts/hub-feature-progress368.json"));
  const next = JSON.parse(read("docs/contracts/hub-feature-progress369.json"));
  const metric = (data, id) =>
    data.modules.find((m) => m.id === id).estimatedSourceCoveragePercent;
  assert.equal(metric(next, "home-assistant-device-inventory") -
    metric(old, "home-assistant-device-inventory"), 9);
  assert.equal(metric(next, "network-discovery-and-topology") -
    metric(old, "network-discovery-and-topology"), 5);
  assert.equal(next.fieldAcceptancePlanningEstimatePercent, 18);
  assert.equal(next.modules.length, 24);
  assert.equal(next.nextBuild, 370);
  assert.equal(next.futureBuildCount, 18);
});
