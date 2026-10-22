import { describe, expect, it } from "vitest";

import type { CameraDashboard, CameraRecord, Go2RTCStatus } from "./api";
import { RECOVERY_SNAPSHOT_SCHEMA, type DeviceCameraSnapshot } from "./deviceRecovery";
import {
  cameraPlaybackReadiness,
  createFieldReviewReport,
  missingFieldIdentities,
} from "./deviceFieldReconciliation";
import { compareRecoverySnapshots } from "./deviceRecovery";

const previous: DeviceCameraSnapshot = {
  schema: RECOVERY_SNAPSHOT_SCHEMA,
  captured_at: "2026-10-20T01:00:00.000Z",
  home_assistant: {
    devices: [{ id: "old-thermostat", name: "Thermostat" }],
    entities: [{ id: "sensor.old_temperature", name: "Temperature" }],
  },
  cameras: [{ id: "onvif-front", name: "Front Door" }],
};
const current: DeviceCameraSnapshot = {
  ...previous,
  captured_at: "2026-10-22T01:00:00.000Z",
  home_assistant: { devices: [], entities: [] },
  cameras: [{ id: "onvif-garage", name: "Garage" }],
};

const camera = {
  id: 9, endpoint_uuid: "onvif-garage", display_name: "Garage", enabled: true,
  stream: { enabled: true }, host: "192.168.68.99", service_url: "http://sensitive",
} as CameraRecord;
const transport = {
  online: true, local_api_only: true, local_rtsp_only: true,
} as Go2RTCStatus;
const at = "2026-10-22T08:00:00.000Z";
const dashboard = {
  generated_at: at, transport_online: true, stale_after_seconds: 300,
  cameras: [{
    camera_id: 9, health: "healthy", configured: true,
    last_probe_status: "online", last_probe_at: at,
    viewer_url: "http://127.0.0.1/secret-path",
  }],
} as CameraDashboard;

describe("Build 108 supervised device and camera field reconciliation", () => {
  it("classifies missing device, entity, and camera identities independently", () => {
    const missing = missingFieldIdentities(compareRecoverySnapshots(previous, current));
    expect(missing.map((item) => [item.source, item.id])).toEqual([
      ["ha_device", "old-thermostat"],
      ["ha_entity", "sensor.old_temperature"],
      ["hub_camera", "onvif-front"],
    ]);
    expect(new Set(missing.map((item) => item.key)).size).toBe(3);
  });

  it("blocks playback acknowledgement until transport, camera stream and fresh probe pass", () => {
    const now = Date.parse(at) + 20_000;
    const [ready] = cameraPlaybackReadiness([camera], dashboard, transport, now);
    expect(ready.ready).toBe(true);
    expect(cameraPlaybackReadiness([camera], dashboard, { ...transport, local_rtsp_only: false }, now)[0].ready).toBe(false);
    expect(cameraPlaybackReadiness([camera], { ...dashboard, generated_at: "2026-10-22T07:00:00Z" }, transport, now)[0].ready).toBe(false);
    expect(cameraPlaybackReadiness([camera], { ...dashboard, cameras: [{ ...dashboard.cameras[0], health: "stale" }] }, transport, now)[0].ready).toBe(false);
    expect(cameraPlaybackReadiness([{ ...camera, enabled: false }], dashboard, transport, now)[0].ready).toBe(false);
    expect(cameraPlaybackReadiness([camera], null, transport, now)[0].ready).toBe(false);
  });

  it("exports only operator dispositions, identity deltas and acknowledged manual playback", () => {
    const missing = missingFieldIdentities(compareRecoverySnapshots(previous, current));
    const decisions = { [missing[0].key]: "review_integration" as const, [missing[2].key]: "review_discovery" as const };
    const playback = cameraPlaybackReadiness([camera], dashboard, transport, Date.parse(at) + 10_000);
    const report = createFieldReviewReport(previous, current, decisions, playback, new Set(["onvif-garage"]), at);
    expect(report.summary).toEqual({
      missing_unreviewed: 1,
      missing_follow_up_or_unresolved: 3,
      registered_cameras_without_operator_playback: 0,
      field_acceptance: "requires_independent_owner_verification",
    });
    expect(report.new_identity_counts.hub_cameras).toBe(1);
    expect(report.camera_playback[0].observed_live_video_by_operator).toBe(true);
    expect(JSON.stringify(report)).not.toMatch(/192\.168|sensitive|secret-path|service_url|viewer_url/);

    const ineligible = createFieldReviewReport(
      previous, current, {}, [{ ...playback[0], ready: false }], new Set(["onvif-garage"]), at,
    );
    expect(ineligible.camera_playback[0].observed_live_video_by_operator).toBe(false);
    expect(ineligible.summary.registered_cameras_without_operator_playback).toBe(1);
  });
});
