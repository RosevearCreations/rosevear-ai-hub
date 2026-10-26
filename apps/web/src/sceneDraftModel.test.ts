import { describe, expect, test } from "vitest";

import type { HomeAssistantBrowserResponse, HomeAssistantControlPolicy } from "./api";
import { safeSceneTargets, validSceneDraft } from "./sceneDraftModel";

function makeBrowser(): HomeAssistantBrowserResponse {
  const names = [
    ["light.lounge", "Lounge lamp", "Living room", "off"],
    ["switch.fan", "Desk fan", "Study", "on"],
    ["switch.kiln", "Workshop kiln", "Workshop", "off"],
    ["scene.movie", "Movie night", "Living room", "scening"],
    ["light.unknown", "Unknown", "Living room", "unavailable"],
  ];
  return {
    area_count: 3, device_count: 0, domain_count: 3, entity_count: names.length,
    areas: [], devices: [], domains: [],
    entities: names.map(([entity_id, friendly_name, area_name, state]) => ({
      entity_id, friendly_name, area_name, state,
      domain: entity_id.split(".")[0], area_id: null, device_id: null,
      device_name: null, platform: null, icon: null, unit_of_measurement: null,
      device_class: null, last_changed: null, last_updated: null, attributes: {},
    })),
  };
}

function makePolicy(): HomeAssistantControlPolicy {
  return {
    allowed_entity_ids: ["light.lounge", "switch.fan", "switch.kiln", "scene.movie", "light.unknown"],
    candidates: makeBrowser().entities.map((item) => ({
      entity_id: item.entity_id, domain: item.domain as "light" | "switch" | "scene", state: item.state,
      friendly_name: item.friendly_name, allowed: true, blocked_reason: null,
    })),
  };
}

describe("safe scene draft shortlist", () => {
  test("excludes hazardous, opaque and unavailable entities even when allowlisted", () => {
    const options = safeSceneTargets(makeBrowser(), makePolicy());
    expect(options.map((item) => item.entity_id)).toEqual(["light.lounge", "switch.fan"]);
    expect(options[0].area).toBe("Living room");
  });

  test("requires unique, eligible steps and a limit of four", () => {
    const options = safeSceneTargets(makeBrowser(), makePolicy());
    const valid = [{ entity_id: "light.lounge", action: "on" as const }];
    expect(validSceneDraft(valid, options)).toBe(true);
    expect(validSceneDraft([], options)).toBe(false);
    expect(validSceneDraft([...valid, ...valid], options)).toBe(false);
    expect(validSceneDraft([{ entity_id: "switch.kiln", action: "on" }], options)).toBe(false);
    expect(validSceneDraft(Array.from({ length: 5 }, (_, i) => ({
      entity_id: `light.lounge${i}`, action: "off" as const,
    })), options)).toBe(false);
  });

  test("respects revoked allowlist and candidate safety reasons", () => {
    const policy = makePolicy();
    policy.allowed_entity_ids = ["switch.fan"];
    policy.candidates[1].blocked_reason = "not safe";
    expect(safeSceneTargets(makeBrowser(), policy)).toEqual([]);
  });
});
