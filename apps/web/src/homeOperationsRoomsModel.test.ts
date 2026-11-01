import { describe, expect, test } from "vitest";
import type { HomeAssistantBrowserResponse, HomeAssistantControlPolicy } from "./api";
import { summarizeHomeOperationsRooms } from "./homeOperationsRoomsModel";

const now = Date.parse("2026-11-01T13:00:00Z");
export const fixture: HomeAssistantBrowserResponse = {
  area_count: 2, device_count: 3, entity_count: 3, domain_count: 2, areas: [], devices: [], domains: [],
  entities: [
    { entity_id: "light.hall", domain: "light", state: "on", friendly_name: "Hall lamp", area_id: "hall",
      area_name: "Hall", device_id: null, device_name: null, platform: null, icon: null, unit_of_measurement: null,
      device_class: null, last_changed: null, last_updated: "2026-11-01T12:58:00Z", attributes: {} },
    { entity_id: "switch.kiln", domain: "switch", state: "off", friendly_name: "Kiln", area_id: "workshop",
      area_name: "Workshop", device_id: null, device_name: null, platform: null, icon: null, unit_of_measurement: null,
      device_class: null, last_changed: null, last_updated: "2026-10-25T00:00:00Z", attributes: {} },
    { entity_id: "light.unknown", domain: "light", state: "unavailable", friendly_name: "Unknown lamp", area_id: null,
      area_name: null, device_id: null, device_name: null, platform: null, icon: null, unit_of_measurement: null,
      device_class: null, last_changed: null, last_updated: null, attributes: {} },
  ],
};
export const policy: HomeAssistantControlPolicy = { allowed_entity_ids: ["light.hall", "switch.kiln"], candidates: [
  { entity_id: "light.hall", domain: "light", state: "on", friendly_name: "Hall lamp", allowed: true, blocked_reason: null },
  { entity_id: "switch.kiln", domain: "switch", state: "off", friendly_name: "Kiln", allowed: true, blocked_reason: null },
] };

describe("Build 216 room observations", () => {
  test("distinguishes missing registry, stale and unavailable states", () => {
    expect(summarizeHomeOperationsRooms(null, null).staleCount).toBeNull();
    const result = summarizeHomeOperationsRooms(fixture, policy, now);
    expect(result.rooms.map(room => room.name)).toEqual(["Hall", "Unassigned room", "Workshop"]);
    expect(result.staleCount).toBe(1);
    expect(result.unknownCount).toBe(1);
    expect(result.rooms[1].items[0].state).toBe("Not verified");
    expect(result.rooms[2].items[0].status).toBe("stale");
    expect(result.rooms[2].items[0].actionEligible).toBe(false); // A kiln never qualifies, even if upstream allowlisted.
  });
  test("a denied control candidate is never marked eligible", () => {
    const denied = { ...policy, candidates: [{ ...policy.candidates[0], allowed: false, blocked_reason: "Denied" }] };
    expect(summarizeHomeOperationsRooms(fixture, denied, now).rooms[0].items[0].actionEligible).toBe(false);
  });
});
