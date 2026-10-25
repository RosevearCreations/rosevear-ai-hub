import { describe, expect, it } from "vitest";

import type {
  CameraPreviewResult, CameraRecord, DeviceDiscoveryReview, DeviceRegistryReviews,
  HomeAssistantBrowserResponse,
} from "./api";
import { compileDiscoveryCandidates, isFreshDiscovery } from "./deviceDiscoveryInboxModel";

const observed = "2026-10-25T12:00:00.000Z";
const home = {
  areas: [{ area_id: "hall", name: "Hallway" }],
  devices: [{ device_id: "ha-1", name: "Hall Camera", area_id: "hall" }],
  entities: [{ entity_id: "sensor.hall", friendly_name: "Hall Camera", area_id: "hall" }],
} as HomeAssistantBrowserResponse;
const notes = { annotations: [
  { source: "mqtt", source_id: "house/hall/temperature", alias: "Hall Camera", room_label: "Hallway",
    disposition: "reviewed", revision: 1, reviewed_at: observed },
  { source: "ha_device", source_id: "ha-1", alias: "Ignored", room_label: "Hallway",
    disposition: "reviewed", revision: 1, reviewed_at: observed },
], matches: [] } as DeviceRegistryReviews;
const camera = { endpoint_uuid: "uuid-new", display_name: "Hall Camera", host: "PRIVATE_CAMERA_HOST",
  port: 80, registered: false };
const preview = { preview_token: "PRIVATE_SINGLE_USE_TICKET", expires_in_seconds: 300,
  truncated: false, candidates: [camera] } as CameraPreviewResult;

function compile(changes: Partial<Parameters<typeof compileDiscoveryCandidates>[0]> = {}) {
  return compileDiscoveryCandidates({ browser: null, registry: null, cameras: null, cameraPreview: null,
    reviews: [], haObservedAt: null, mqttObservedAt: null, cameraObservedAt: null, ...changes });
}

describe("Build 140 discovery inbox identity model", () => {
  it("holds HA devices and entities separately and only lists already reviewed MQTT references", () => {
    const result = compile({ browser: home, registry: notes, haObservedAt: observed, mqttObservedAt: observed });
    expect(result.map((item) => item.key).sort()).toEqual([
      "ha_device:ha-1", "ha_entity:sensor.hall", "mqtt:house/hall/temperature",
    ]);
    expect(result.map((item) => item.confidence)).toContain("owner_topic_reference");
    expect(result.every((item) => item.duplicateWarnings.some((warning) => warning.includes("not proof")))).toBe(true);
    expect(result.every((item) => item.canRegisterCamera === false)).toBe(true);
  });

  it("never suggests passive camera registration; exact UUID or endpoint conflicts block it", () => {
    expect(compile({ cameras: [], cameraPreview: null, cameraObservedAt: observed })).toEqual([]);
    const fresh = compile({ cameras: [], cameraPreview: preview, cameraObservedAt: observed });
    expect(fresh).toHaveLength(1);
    expect(fresh[0].canRegisterCamera).toBe(true);
    expect(JSON.stringify(fresh)).not.toContain("PRIVATE_CAMERA_HOST");
    expect(JSON.stringify(fresh)).not.toContain("PRIVATE_SINGLE_USE_TICKET");
    const existing = [{ endpoint_uuid: "uuid-new", host: "private_camera_host", port: 80 }] as CameraRecord[];
    expect(compile({ cameras: existing, cameraPreview: preview, cameraObservedAt: observed })[0].canRegisterCamera).toBe(false);
    const conflicting = [{ endpoint_uuid: "other-uuid", host: "private_camera_host", port: 80 }] as CameraRecord[];
    const row = compile({ cameras: conflicting, cameraPreview: preview, cameraObservedAt: observed })[0];
    expect(row.canRegisterCamera).toBe(false);
    expect(row.duplicateWarnings.join(" ")).toMatch(/conflicts/);
  });

  it("keeps owner decisions distinct, blocks rejected previews and checks freshness", () => {
    const reviews = [
      { source: "camera_candidate", source_id: "uuid-new", decision: "rejected", revision: 2,
        observed_at: observed, reviewed_at: observed },
    ] as DeviceDiscoveryReview[];
    const row = compile({ cameras: [], cameraPreview: preview, cameraObservedAt: observed, reviews })[0];
    expect(row.state).toBe("rejected");
    expect(row.canRegisterCamera).toBe(false);
    expect(isFreshDiscovery(observed, Date.parse(observed) + 299_000, 300)).toBe(true);
    expect(isFreshDiscovery(observed, Date.parse(observed) + 300_000, 300)).toBe(false);
    expect(isFreshDiscovery(observed, Date.parse(observed) - 31_000, 300)).toBe(false);
    expect(isFreshDiscovery("invalid")).toBe(false);
  });
});
