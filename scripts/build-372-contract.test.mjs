import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Build 372 owner-only HA Alexa settings, no Amazon writes or speech collection", () => {
  const server = read("server/src/rosevear_ai_hub/api/alexa_consent372.py");
  const ha = read("server/src/rosevear_ai_hub/integrations/home_assistant.py");
  const app = read("server/src/rosevear_ai_hub/main.py");
  const ui = read("apps/web/src/HomeAssistantView.tsx");
  assert.ok(server.includes('require_roles("owner")'));
  assert.ok(server.includes('providerWritesPerformed": 0'));
  assert.ok(server.includes('"alexaAccountLinked": None'));
  assert.ok(server.includes('"voiceInvocationVerified": False'));
  assert.ok(server.includes("owner_confirmed"));
  assert.ok(server.includes("EXPOSED_WITHOUT_CURRENT_APPROVAL"));
  assert.ok(ha.includes('"homeassistant/expose_entity/list"'));
  assert.ok(ha.includes('"homeassistant/expose_new_entities/get"'));
  assert.ok(!ha.includes('"homeassistant/expose_entity",'));
  assert.ok(app.includes("application.include_router(alexa_consent372_router)"));
  assert.ok(ui.includes("<AlexaConsent372 role={currentUser.role} />"));
  for (const forbidden of ["set_light(", "activate_scene(", "set_switch(", "mqtt.publish(", "socket.socket(", "alexa_voice_recording"]) {
    assert.ok(!server.includes(forbidden), forbidden);
  }
});

test("Build 372 score is source-only, respects original holds and queue", () => {
  const old = JSON.parse(read("docs/contracts/hub-feature-progress371.json"));
  const next = JSON.parse(read("docs/contracts/hub-feature-progress372.json"));
  assert.equal(next.build, 372);
  assert.equal(next.fieldAcceptancePlanningEstimatePercent, old.fieldAcceptancePlanningEstimatePercent);
  assert.ok(next.modules.find(x => x.id === "alexa-integration")
    .estimatedSourceCoveragePercent > old.modules.find(x => x.id === "alexa-integration")
    .estimatedSourceCoveragePercent);
  assert.equal(next.futureBuildCount, 15);
  assert.equal(next.nextBuild, 373);
  assert.ok(next.fieldHolds.some(x => /Alexa/i.test(x)));
});
