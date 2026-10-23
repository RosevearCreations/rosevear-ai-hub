import { describe, expect, it } from "vitest";
import type { CameraDiscoveryCandidate, CameraRecord } from "./api";
import { RECOVERY_SNAPSHOT_SCHEMA } from "./deviceRecovery";
import { RECOVERY_FOLLOW_UP_SCHEMA } from "./deviceRecoveryFollowUps";
import { assessCameraRestore, createCameraRestoreReceipt, importCameraPriorEvidence } from "./cameraBulkRestore";

const now = new Date(Date.now() - 60_000).toISOString();
const priorPayload = {
  schema: RECOVERY_SNAPSHOT_SCHEMA, captured_at: now,
  home_assistant: { devices: [], entities: [] },
  cameras: [{ id: "uuid-a", name: "Porch" }, { id: "uuid-b", name: "Garage" }],
};
const prior = importCameraPriorEvidence(JSON.stringify(priorPayload));
const candidate = (id: string, name: string, host: string, registered = false): CameraDiscoveryCandidate => ({
  endpoint_uuid: id, display_name: name, host, port: 80, registered,
});
const registry = (id: string, name: string, host: string): CameraRecord => ({
  id: 1, endpoint_uuid: id, display_name: name, host, port: 80,
  service_url: `http://${host}/onvif/device_service`, discovery_source: "onvif_operator_accepted",
  onvif_types: [], scopes: [], enabled: false, last_seen_at: now, created_at: now,
  updated_at: now, stream: null,
});

describe("Build 115 camera restore review", () => {
  it("imports bounded camera-only Build 107 evidence and rejects secret-bearing identities", () => {
    expect(prior.cameras).toEqual([{ id: "uuid-b", name: "Garage" }, { id: "uuid-a", name: "Porch" }]);
    expect(() => importCameraPriorEvidence(JSON.stringify({ ...priorPayload,
      cameras: [{ id: "uuid-a", name: "rtsp://admin:password@192.168.1.1/" }] }))).toThrow();
    expect(() => importCameraPriorEvidence(JSON.stringify({ ...priorPayload,
      cameras: [priorPayload.cameras[0], priorPayload.cameras[0]] }))).toThrow();
    expect(() => importCameraPriorEvidence(JSON.stringify({ ...priorPayload, schema: "unknown" }))).toThrow();
    expect(() => importCameraPriorEvidence(JSON.stringify({ ...priorPayload,
      captured_at: new Date(Date.now() + 300_000).toISOString() }))).toThrow();
  });

  it("accepts only camera source identities from an internally consistent Build 110 follow-up", () => {
    const evidence = {
      schema: RECOVERY_FOLLOW_UP_SCHEMA, generated_at: now,
      source_registry_at: "2026-10-01T00:00:00Z",
      current_registry_at: "2026-10-02T00:00:00Z",
      follow_ups: [{ source: "hub_camera", id: "uuid-a", name: "Porch", stage: "camera_registration", integration_group_owner_supplied: null }],
      summary: { ha_integration: 0, ha_owner_check: 0, camera_registration: 1, camera_stream: 0, camera_playback: 0, total_open: 1, status: "follow_up_required" },
    };
    expect(importCameraPriorEvidence(JSON.stringify(evidence)).cameras).toEqual([{ id: "uuid-a", name: "Porch" }]);
  });

  it("flags registration duplicates, address collisions, identity drift and uncertain model/name evidence", () => {
    const found = [
      candidate("uuid-a", "Porch", "192.168.68.55"),
      candidate("uuid-b", "New Garage Name", "192.168.68.56"),
      candidate("uuid-c", "Camera", "192.168.68.57"),
      candidate("uuid-d", "Old Living Room", "192.168.68.58"),
      candidate("uuid-e", "Unknown", "192.168.68.59"),
    ];
    const actual = [registry("uuid-d", "Previous Living Room", "192.168.68.60"), registry("old", "Other", "192.168.68.59")];
    expect(assessCameraRestore(prior, actual, found).map((row) => row.status)).toEqual([
      "restore_candidate", "prior_name_changed", "not_in_prior", "registry_drift", "endpoint_conflict",
    ]);
    expect(assessCameraRestore(prior, [], [
      candidate("uuid-a", "Porch", "192.168.68.55"),
      candidate("uuid-new", "Porch", "192.168.68.56"),
    ]).map((row) => row.status)).toEqual(["name_conflict", "name_conflict"]);
    expect(assessCameraRestore(prior, [], [
      candidate("uuid-a", "Porch", "192.168.68.55"),
      candidate("uuid-new", "Alternate", "192.168.68.55"),
    ]).map((row) => row.status)).toEqual(["endpoint_conflict", "endpoint_conflict"]);
  });

  it("exports only exact disabled registration IDs and immutable physical acceptance HOLD", () => {
    const received = [{ endpoint_uuid: "uuid-a", id: 33, enabled: false, stream: null }];
    const packet = createCameraRestoreReceipt(prior, new Date().toISOString(), new Date().toISOString(), ["uuid-a"], received);
    expect(packet.field_acceptance).toBe("CAMERA_PLAYBACK_AND_PRIVATE_STREAM_HOLD");
    expect(JSON.stringify(packet)).not.toMatch(/192\.168|stream_url|password/);
    expect(packet.selected).toEqual([{ endpoint_uuid: "uuid-a", registry_id: 33, registered_disabled: true }]);
    expect(() => createCameraRestoreReceipt(prior, new Date().toISOString(), new Date().toISOString(), ["uuid-a"], [
      { ...received[0], enabled: true },
    ])).toThrow();
    expect(() => createCameraRestoreReceipt(prior, now, now, ["uuid-a"], received)).toThrow();
  });
});
