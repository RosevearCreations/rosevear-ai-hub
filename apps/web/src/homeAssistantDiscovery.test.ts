import { describe, expect, it } from "vitest";
import type { HomeAssistantBrowserResponse } from "./api";
import { RECOVERY_SNAPSHOT_SCHEMA } from "./deviceRecovery";
import {
  assessHADiscovery, createHADiscoveryReceipt, importHAPriorEvidence,
} from "./homeAssistantDiscovery";

const time = new Date(Date.now() - 1000).toISOString();
const before = new Date(Date.now() - 90_000).toISOString();
const browser = {
  devices: [{ device_id: "d1" }],
  entities: [{ entity_id: "light.lamp", device_id: "d1", state: "on", platform: "mqtt" },
    { entity_id: "sensor.broken", device_id: "d1", state: "unavailable", platform: "mqtt" }],
} as HomeAssistantBrowserResponse;

const snapshot = JSON.stringify({
  schema: RECOVERY_SNAPSHOT_SCHEMA, captured_at: before,
  home_assistant: { devices: [{ id: "d1", name: "Lamp" }, { id: "d2", name: "Missing device" }],
    entities: [{ id: "light.lamp", name: "Lamp light" }, { id: "sensor.broken", name: "Sensor" }] },
  cameras: [{ id: "cam1", name: "Private camera" }],
});

describe("Build 114 Home Assistant missing-device discovery", () => {
  it("imports only HA identities and groups exact missing, unavailable and present readings", () => {
    const prior = importHAPriorEvidence(snapshot);
    expect(prior.identities).toHaveLength(4);
    expect(JSON.stringify(prior)).not.toContain("cam1");
    const check = assessHADiscovery(prior, browser, time, {}, {});
    expect(check.later && check.fresh).toBe(true);
    expect(check.counts).toMatchObject({ absent: 1, unavailable: 1, reported: 2, ownerObserved: 0, openHolds: 4 });
    expect(check.platforms).toEqual([{ platform: "mqtt", entities: 2, unavailable: 1 }]);
    expect(check.rows.find((row) => row.id === "d2")?.platformHint).toBe(null);
    expect(check.rows.find((row) => row.id === "sensor.broken")?.state).toBe("unavailable");
  });

  it("does not allow a registry flag, platform hint or old review to certify physical function", () => {
    const prior = importHAPriorEvidence(snapshot);
    const key = JSON.stringify(["ha_entity", "light.lamp"]);
    const marks = { [key]: { group: "MQTT", verifiedFunction: true } };
    const none = assessHADiscovery(prior, browser, time, marks, {});
    expect(none.rows.find((row) => row.id === "light.lamp")?.ownerObservedFunction).toBe(false);
    const visible = assessHADiscovery(prior, browser, time, marks, { MQTT: "visible" });
    expect(visible.rows.find((row) => row.id === "light.lamp")?.ownerObservedFunction).toBe(true);
    expect(visible.counts.openHolds).toBe(3);
    const receipt = createHADiscoveryReceipt(prior, visible, time);
    expect(receipt.status).toBe("FIELD_DEVICE_ACCEPTANCE_HOLD");
    const serialized = JSON.stringify(receipt);
    expect(serialized).not.toContain("Private camera");
    expect(serialized).not.toContain("platform");
  });

  it("fails closed on stale, out-of-order and unavailable HA inventory", () => {
    const prior = importHAPriorEvidence(snapshot);
    const sameTime = assessHADiscovery(prior, browser, before, {}, {});
    expect(sameTime.later).toBe(false);
    expect(() => createHADiscoveryReceipt(prior, sameTime, before)).toThrow(/later, fresh/);
    const stale = assessHADiscovery(prior, browser, new Date(Date.now() - 600_000).toISOString(), {}, {});
    expect(stale.fresh).toBe(false);
    expect(stale.counts.openHolds).toBe(4);
  });

  it("rejects malformed/oversized or URL-bearing private evidence without persisting secrets", () => {
    expect(() => importHAPriorEvidence("not-json")).toThrow(/valid JSON/);
    expect(() => importHAPriorEvidence("a".repeat(1_000_001))).toThrow(/1 MB/);
    expect(() => importHAPriorEvidence(snapshot.replace("Missing device", "https://secret.local/token=abc"))).toThrow(/URL or credential/);
    expect(() => importHAPriorEvidence(JSON.stringify({ schema: "unknown" }))).toThrow(/Choose a Build/);
  });

  it("accepts a validated Build 110 queue and does not mistake owner grouping for HA proof", () => {
    const earlier = new Date(Date.now() - 120_000).toISOString();
    const worklist = JSON.stringify({
      schema: "rosevear-device-camera-recovery-follow-up/v1",
      source_registry_at: new Date(Date.now() - 180_000).toISOString(),
      current_registry_at: earlier,
      generated_at: new Date(Date.now() - 100_000).toISOString(),
      follow_ups: [
        { source: "ha_device", id: "d1", name: "Lamp", stage: "ha_integration", integration_group_owner_supplied: "MQTT" },
        { source: "hub_camera", id: "cam1", name: "Camera", stage: "camera_stream", integration_group_owner_supplied: null },
      ],
      summary: { ha_integration: 1, ha_owner_check: 0, camera_registration: 0,
        camera_stream: 1, camera_playback: 0, total_open: 2, status: "follow_up_required" },
    });
    const imported = importHAPriorEvidence(worklist);
    expect(imported.identities).toEqual([{ source: "ha_device", id: "d1", name: "Lamp", ownerGroup: "MQTT" }]);
    const assessment = assessHADiscovery(imported, browser, time, {}, {});
    expect(assessment.rows[0].integrationGroup).toBe("MQTT");
    expect(assessment.rows[0].integrationObservation).toBe("unchecked");
    expect(assessment.counts.openHolds).toBe(1);
    expect(JSON.stringify(assessment)).not.toContain("cam1");
  });
});
