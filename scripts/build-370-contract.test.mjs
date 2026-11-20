import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Build370 source accepts only pinned signed reports, never controls devices", () => {
  const main = read("server/src/rosevear_ai_hub/main.py");
  const api = read("server/src/rosevear_ai_hub/api/workshop_gateway370.py");
  const agent = read("scripts/printer-pc-collector370.py");
  const view = read("apps/web/src/HomeAssistantView.tsx");
  assert.ok(main.includes("application.include_router(workshop_gateway370_router)"));
  assert.ok(view.includes("<WorkshopGateway370 role={currentUser.role} />"));
  assert.ok(api.includes("Ed25519PublicKey"));
  assert.ok(api.includes("HOLD_WORKSHOP370_REPLAY"));
  assert.ok(api.includes('require_roles("owner")'));
  assert.ok(agent.includes("winreg.OpenKey"));
  assert.ok(agent.includes("127.0.0.1:5000/api/"));
  assert.ok(agent.includes('parsed.scheme != "https"'));
  for(const forbidden of ["serial.Serial(", "subprocess.run(", "socket.socket(",
    "M105", "M112", "M114", "laser_on(", "start_print("]) {
    assert.equal(api.includes(forbidden), false);
    assert.equal(agent.includes(forbidden), false);
  }
});

test("Build370 score does not imply real printer process proof", () => {
  const score = JSON.parse(read("docs/contracts/hub-feature-progress370.json"));
  assert.equal(score.build, 370);
  assert.equal(score.fieldAcceptancePlanningEstimatePercent, 18);
  assert.equal(score.nextBuild, 371);
  assert.equal(score.futureBuildCount, 17);
  assert.ok(score.modules.find(x=>x.id==="maker-process-monitoring").estimatedSourceCoveragePercent > 18);
  assert.ok(score.activeHolds.some(x => x.includes("printer-PC")));
});
