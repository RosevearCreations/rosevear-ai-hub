import { describe, expect, it } from "vitest";

import type { CameraRecord, HomeAssistantBrowserResponse } from "./api";
import {
  compareRecoverySnapshots,
  createRecoverySnapshot,
  parseRecoverySnapshot,
} from "./deviceRecovery";

const browser = {
  devices: [{ device_id: "ha-kitchen", name: "Kitchen Lamp" }],
  entities: [{ entity_id: "light.kitchen", friendly_name: "Kitchen Lamp" }],
} as HomeAssistantBrowserResponse;
const camera = { id: 8, endpoint_uuid: "onvif-front", display_name: "Front Door" } as CameraRecord;

describe("Build 107 device and camera inventory recovery", () => {
  it("exports only stable identities, without sensitive HA attributes or camera connection details", () => {
    const withPrivateInfo = {
      ...browser,
      entities: [{ ...browser.entities[0], attributes: { access_token: "PRIVATE" } }],
    };
    const withStream = { ...camera, host: "192.168.68.55", stream: { source_url: "rtsp://operator:secret@camera" } };
    const snapshot = createRecoverySnapshot(
      withPrivateInfo,
      [withStream as unknown as CameraRecord],
      "2026-10-22T03:00:00.000Z",
    );
    expect(snapshot.home_assistant.devices).toEqual([{ id: "ha-kitchen", name: "Kitchen Lamp" }]);
    expect(snapshot.cameras).toEqual([{ id: "onvif-front", name: "Front Door" }]);
    expect(JSON.stringify(snapshot)).not.toMatch(/PRIVATE|192\.168|secret|source_url/);
    expect(parseRecoverySnapshot(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it("distinguishes missing identities from new ones after a reboot", () => {
    const previous = createRecoverySnapshot(browser, [camera]);
    const changed = createRecoverySnapshot({
      ...browser,
      devices: [{ ...browser.devices[0], device_id: "ha-new", name: "New Sensor" }],
      entities: [],
    }, []);
    const comparison = compareRecoverySnapshots(previous, changed);
    expect(comparison.devices.missing.map((item) => item.id)).toEqual(["ha-kitchen"]);
    expect(comparison.devices.newItems.map((item) => item.id)).toEqual(["ha-new"]);
    expect(comparison.entities.missing.map((item) => item.id)).toEqual(["light.kitchen"]);
    expect(comparison.cameras.missing.map((item) => item.id)).toEqual(["onvif-front"]);
    expect(comparison.cameras.newItems).toEqual([]);
  });

  it("rejects malformed, oversized and duplicate inventory files", () => {
    const valid = createRecoverySnapshot(browser, [camera]);
    expect(() => parseRecoverySnapshot("not JSON")).toThrow("valid JSON");
    expect(() => parseRecoverySnapshot("x".repeat(1_000_001))).toThrow("too large");
    expect(() => parseRecoverySnapshot(JSON.stringify({ ...valid, schema: "unknown" }))).toThrow("not a supported");
    const duplicate = {
      ...valid,
      cameras: [valid.cameras[0], valid.cameras[0]],
    };
    expect(() => parseRecoverySnapshot(JSON.stringify(duplicate))).toThrow("duplicate identity");
    const extraSecrets = {
      ...valid,
      cameras: [{ ...valid.cameras[0], password: "PRIVATE" }],
    };
    expect(JSON.stringify(parseRecoverySnapshot(JSON.stringify(extraSecrets)))).not.toContain("PRIVATE");
  });
});
