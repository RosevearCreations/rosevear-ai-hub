import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Build 371 keeps physical control, source admission and camera feeds separated", () => {
  const collector = read("scripts/printer-pc-collector370.py");
  const camera = read("scripts/printer-pc-camera371.py");
  const gateway = read("server/src/rosevear_ai_hub/api/workshop_gateway370.py");
  const reconcile = read("server/src/rosevear_ai_hub/api/workshop_enrollment371.py");
  const source = read("server/src/rosevear_ai_hub/main.py");
  const view = read("apps/web/src/HomeAssistantView.tsx");
  const runbook = read("docs/BUILD_371_SUPERVISED_PRINTER_PC_CAMERA_SETUP.md");
  assert.ok(source.includes("application.include_router(workshop_enrollment371_router)"));
  assert.ok(view.includes("<WorkshopEnrollment371 role={currentUser.role} />"));
  assert.ok(collector.includes("--include-usb"));
  assert.ok(collector.includes("windows_usb_registry_devices()"));
  assert.ok(gateway.includes("HOLD_WORKSHOP371_BAD_PNP_PROVENANCE"));
  assert.ok(reconcile.includes('require_roles("owner")'));
  assert.ok(reconcile.includes('physicallyVerified": False'));
  assert.ok(reconcile.includes('"cameraFeedVerified": False'));
  assert.ok(camera.includes('("127.0.0.1", PORT)'));
  assert.ok(camera.includes("camera.release()"));
  assert.ok(camera.includes("No images are stored"));
  for (const value of ["serial.Serial(", "G0 ", "G1 ", "M104", "M109", "subprocess.run("]) {
    assert.equal(camera.includes(value), false, value + " is prohibited in preview");
    assert.equal(reconcile.includes(value), false, value + " is prohibited in gateway");
  }
  assert.ok(runbook.includes("No Raspberry Pi"));
  assert.ok(runbook.includes("original Windows printer PC"));
});

test("Build 371 preserves scope and refuses to award physical field proof from CI", () => {
  const previous = JSON.parse(read("docs/contracts/hub-feature-progress370.json"));
  const current = JSON.parse(read("docs/contracts/hub-feature-progress371.json"));
  assert.equal(previous.build, 370);
  assert.equal(current.build, 371);
  assert.equal(current.fieldAcceptancePlanningEstimatePercent,
    previous.fieldAcceptancePlanningEstimatePercent);
  assert.ok(current.activeHolds.some((hold) => hold.includes("printer-PC")));
  assert.equal(current.nextBuild, 372);
});
