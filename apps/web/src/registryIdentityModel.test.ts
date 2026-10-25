import { describe, expect, it } from "vitest";

import type {
  CameraDashboard, CameraRecord, DeviceRegistryReviews,
  HomeAssistantBrowserResponse, HomeAssistantControlPolicy,
} from "./api";
import { compileRegistry, suggestRegistryMatches } from "./registryIdentityModel";

const browser: HomeAssistantBrowserResponse = {
  area_count: 1, device_count: 1, domain_count: 1, entity_count: 2,
  areas: [{ area_id: "living", name: "Living room", aliases: [], floor_id: null, icon: null }],
  devices: [{ device_id: "dev-a", name: "Hall Monitor", area_id: "living", manufacturer: null,
    model: null, sw_version: null, hw_version: null, parent_device_id: null }],
  domains: [{ domain: "sensor", count: 2 }],
  entities: [
    { entity_id: "sensor.hall", domain: "sensor", state: "22", friendly_name: "Hall Monitor",
      area_id: "living", area_name: "Living room", device_id: "dev-a", device_name: "Hall Monitor",
      platform: "demo", icon: null, unit_of_measurement: "°C", device_class: null,
      last_changed: null, last_updated: "2026-10-25T09:00:00Z", attributes: {} },
    { entity_id: "sensor.offline", domain: "sensor", state: "unavailable", friendly_name: "Offline sensor",
      area_id: null, area_name: null, device_id: null, device_name: null,
      platform: "demo", icon: null, unit_of_measurement: null, device_class: null,
      last_changed: null, last_updated: null, attributes: {} },
  ],
};

const camera = {
  id: 7, endpoint_uuid: "cam-id", display_name: "Hall Monitor",
  host: "PRIVATE_HOST", port: 554, service_url: "rtsp://PRIVATE_URL", discovery_source: "manual",
  onvif_types: [], scopes: [], enabled: true, last_seen_at: "2026-10-24T09:00:00Z",
  created_at: "2026-10-24T09:00:00Z", updated_at: "2026-10-24T09:00:00Z", stream: null,
} satisfies CameraRecord;

const cameraHealth = { cameras: [{ camera_id: 7, health: "healthy", last_probe_at: "2026-10-25T10:00:00Z",
  last_error: "PRIVATE_CREDENTIALS" }] } as CameraDashboard;
const policy = { candidates: [{ entity_id: "sensor.hall", allowed: true, blocked_reason: null }] } as HomeAssistantControlPolicy;
const emptyReviews: DeviceRegistryReviews = { annotations: [], matches: [] };

describe("Build 139 Device 360 source boundaries", () => {
  it("keeps HA device, HA entity and camera identities separate with source-linked timestamps", () => {
    const items = compileRegistry(browser, [camera], cameraHealth, policy, emptyReviews);
    expect(items.map((item) => item.key)).toEqual([
      "camera:7", "ha_device:dev-a", "ha_entity:sensor.hall", "ha_entity:sensor.offline",
    ]);
    expect(items.find((item) => item.key === "ha_device:dev-a")).toMatchObject({
      room: "Living room", capabilities: ["sensor"], lastObservedAt: "2026-10-25T09:00:00Z",
    });
    expect(items.find((item) => item.key === "ha_entity:sensor.offline")?.state).toBe("attention");
    expect(items.find((item) => item.key === "camera:7")?.lastObservedAt).toBe("2026-10-25T10:00:00Z");
    expect(items.find((item) => item.key === "ha_entity:sensor.hall")?.safeControlEligible).toBe(true);
    expect(items.find((item) => item.key === "camera:7")?.safeControlEligible).toBe(false);
    expect(JSON.stringify(items)).not.toMatch(/PRIVATE_HOST|PRIVATE_URL|PRIVATE_CREDENTIALS/);
  });

  it("stores owner room and unsupported markings as overlays without altering source provenance", () => {
    const reviews: DeviceRegistryReviews = { ...emptyReviews, annotations: [{
      source: "ha_device", source_id: "dev-a", alias: "My hallway monitor",
      room_label: "Workshop", disposition: "unsupported", revision: 2,
      reviewed_at: "2026-10-25T10:00:00Z",
    }] };
    const items = compileRegistry(browser, [camera], cameraHealth, policy, reviews);
    expect(items.find((item) => item.key === "ha_device:dev-a")).toMatchObject({
      name: "My hallway monitor", room: "Workshop", sourceRoom: "Living room", state: "unsupported",
      reviewedRevision: 2,
    });
    expect(browser.devices[0].name).toBe("Hall Monitor");
  });

  it("holds renamed provider IDs as a missing old identity while a changed ID remains separate", () => {
    const reviews: DeviceRegistryReviews = { ...emptyReviews, annotations: [{
      source: "ha_device", source_id: "old-provider-id", alias: "Prior Hall Monitor",
      room_label: "Living room", disposition: "needs_investigation", revision: 1,
      reviewed_at: "2026-10-25T10:00:00Z",
    }] };
    const items = compileRegistry(browser, null, null, null, reviews);
    expect(items.find((item) => item.key === "ha_device:old-provider-id")?.state).toBe("missing");
    expect(items.find((item) => item.key === "ha_device:dev-a")?.state).toBe("observed");
    const unavailable = compileRegistry(null, null, null, null, reviews);
    expect(unavailable[0].state).toBe("unknown");
  });

  it("lists MQTT only after manual review; exact-name candidates never auto-merge", () => {
    const reviews: DeviceRegistryReviews = { annotations: [{
      source: "mqtt", source_id: "home/hall/temperature", alias: "Hall Monitor",
      room_label: "Living room", disposition: "reviewed", revision: 1,
      reviewed_at: "2026-10-25T10:00:00Z",
    }], matches: [] };
    const items = compileRegistry(browser, [camera], cameraHealth, policy, reviews);
    expect(items.filter((item) => item.source === "mqtt")).toHaveLength(1);
    expect(compileRegistry(browser, [camera], cameraHealth, policy, emptyReviews).some((item) => item.source === "mqtt")).toBe(false);
    const candidates = suggestRegistryMatches(items, reviews);
    expect(candidates.some((match) => match.key === "camera:7|ha_device:dev-a")).toBe(true);
    expect(candidates.some((match) => match.key.includes("ha_device:dev-a|ha_entity:"))).toBe(false);
    const reviewed = { ...reviews, matches: [{ left: candidates[0].left, right: candidates[0].right,
      decision: "distinct" as const, revision: 1, reviewed_at: "2026-10-25T10:00:00Z" }] };
    expect(suggestRegistryMatches(items, reviewed)[0].decision).toBe("distinct");
    expect(items.map((item) => item.key)).toHaveLength(5);
  });
});
