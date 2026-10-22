import { describe, expect, it } from "vitest";

import { RECOVERY_SNAPSHOT_SCHEMA, type DeviceCameraSnapshot } from "./deviceRecovery";
import { OWNER_ACCEPTANCE_SCHEMA } from "./deviceRecoveryReceipts";
import type { CameraPlaybackReadiness } from "./deviceFieldReconciliation";
import {
  RECOVERY_FOLLOW_UP_SCHEMA,
  buildRecoveryFollowUpQueue,
  createRecoveryFollowUpReceipt,
  parseOwnerAcceptanceReceipt,
  validateOwnerIntegrationName,
} from "./deviceRecoveryFollowUps";

const original = {
  schema: OWNER_ACCEPTANCE_SCHEMA,
  generated_at: "2026-10-21T11:00:00Z",
  previous_review_at: "2026-10-20T11:00:00Z",
  previous_snapshot_at: "2026-10-20T10:00:00Z",
  new_snapshot_at: "2026-10-21T10:00:00Z",
  identities: [
    { source: "ha_device", id: "plug-a", name: "Workshop plug", prior_disposition: "review_integration",
      present_in_new_registry: false, operator_reviewed_current_state: false, disposition: "still_absent" },
    { source: "ha_device", id: "old-device", name: "Retired sensor", prior_disposition: "confirmed_retired",
      present_in_new_registry: false, operator_reviewed_current_state: true, disposition: "retired_exception" },
    { source: "ha_entity", id: "light.kitchen", name: "Kitchen light", prior_disposition: "review_integration",
      present_in_new_registry: true, operator_reviewed_current_state: false, disposition: "reappeared_in_registry" },
    { source: "hub_camera", id: "garage", name: "Garage camera", prior_disposition: "review_discovery",
      present_in_new_registry: false, operator_reviewed_current_state: false, disposition: "still_absent" },
  ],
  camera_playback: [
    { id: "front", name: "Front camera", observed_in_prior_receipt: true,
      registered_now: true, healthy_private_stream_now: true, operator_observed_moving_video_now: true },
    { id: "back", name: "Back camera", observed_in_prior_receipt: false,
      registered_now: false, healthy_private_stream_now: false, operator_observed_moving_video_now: false },
  ],
  summary: {
    previous_missing_identities: 4,
    reappeared_in_registry: 1,
    retired_exceptions: 1,
    identity_acceptance_holds: 3,
    camera_playback_holds: 1,
    status: "follow_up_required",
  },
};

const later: DeviceCameraSnapshot = {
  schema: RECOVERY_SNAPSHOT_SCHEMA, captured_at: "2026-10-22T10:00:00Z",
  home_assistant: {
    devices: [], entities: [{ id: "light.kitchen", name: "Kitchen light" }],
  },
  cameras: [{ id: "front", name: "Front camera" }, { id: "back", name: "Back camera" }],
};

const readiness: CameraPlaybackReadiness[] = [
  { id: "front", cameraId: 1, name: "Front camera", ready: true, reason: "Ready", lastProbeAt: "2026-10-22T09:59:00Z" },
  { id: "back", cameraId: 2, name: "Back camera", ready: false, reason: "No safe stream", lastProbeAt: null },
];
const now = Date.parse(later.captured_at) + 30_000;

describe("Build 110 owner-supervised device and camera follow-up queue", () => {
  it("parses only bounded allowlisted Build 109 evidence and rejects invalid or contradictory receipts", () => {
    const parsed = parseOwnerAcceptanceReceipt(JSON.stringify({
      ...original, secret: "TOP-SECRET", identities: original.identities.map((identity) => ({ ...identity, rtsp_url: "rtsp://private" })),
    }));
    expect(JSON.stringify(parsed)).not.toMatch(/TOP-SECRET|rtsp:\/\/private/);
    expect(parsed.identities).toHaveLength(4);
    expect(() => parseOwnerAcceptanceReceipt("garbage")).toThrow("valid JSON");
    expect(() => parseOwnerAcceptanceReceipt("x".repeat(1_000_001))).toThrow("1 MB");
    expect(() => parseOwnerAcceptanceReceipt(JSON.stringify({ ...original, schema: "unknown" }))).toThrow("Not a supported");
    expect(() => parseOwnerAcceptanceReceipt(JSON.stringify({
      ...original, identities: [original.identities[0], original.identities[0]],
    }))).toThrow("Duplicate identity");
    expect(() => parseOwnerAcceptanceReceipt(JSON.stringify({
      ...original, identities: [{ ...original.identities[0], present_in_new_registry: true }, ...original.identities.slice(1)],
    }))).toThrow("Contradictory");
    expect(() => parseOwnerAcceptanceReceipt(JSON.stringify({
      ...original, camera_playback: [{ ...original.camera_playback[0], registered_now: false }, original.camera_playback[1]],
    }))).toThrow("Contradictory");
    expect(() => parseOwnerAcceptanceReceipt(JSON.stringify({
      ...original, summary: { ...original.summary, identity_acceptance_holds: 0 },
    }))).toThrow("summary does not match");
    expect(() => parseOwnerAcceptanceReceipt(JSON.stringify({
      ...original, generated_at: "2026-10-19T10:00:00Z",
    }))).toThrow("out of order");
  });

  it("groups absent HA identities and camera registration/stream/playback without inheriting prior video", () => {
    const receipt = parseOwnerAcceptanceReceipt(JSON.stringify(original));
    const queue = buildRecoveryFollowUpQueue(receipt, later, readiness, {}, new Set(), new Set(), now);
    expect(queue.laterReading).toBe(true);
    expect(queue.freshReading).toBe(true);
    expect(queue.retiredExceptions).toBe(1);
    expect(queue.followUps.map(({ id, stage }) => [id, stage])).toEqual([
      ["plug-a", "ha_integration"], ["light.kitchen", "ha_owner_check"],
      ["garage", "camera_registration"], ["back", "camera_stream"], ["front", "camera_playback"],
    ]);
    expect(queue.summary.total_open).toBe(5);
    expect(queue.summary.status).toBe("follow_up_required");
    expect(queue.followUps.find((item) => item.id === "plug-a")?.group).toBe("Integration unassigned");
    expect(queue.followUps.find((item) => item.id === "front")?.stage).toBe("camera_playback");
  });

  it("requires explicit owner labels and current-session function/video observations", () => {
    const receipt = parseOwnerAcceptanceReceipt(JSON.stringify(original));
    const groups = { [JSON.stringify(["ha_device", "plug-a"])]: validateOwnerIntegrationName(" MQTT ") };
    const checked = new Set([JSON.stringify(["ha_entity", "light.kitchen"])]);
    const observed = new Set(["front", "back"]);
    const queue = buildRecoveryFollowUpQueue(receipt, later, readiness, groups, checked, observed, now);
    expect(queue.summary.ha_owner_check).toBe(0);
    expect(queue.summary.camera_playback).toBe(0);
    expect(queue.summary.camera_stream).toBe(1); // A manual mark cannot mask an unhealthy stream.
    expect(queue.followUps.find((item) => item.id === "plug-a")?.group).toBe("MQTT");
    const exported = createRecoveryFollowUpReceipt(receipt, later, queue, "2026-10-22T10:01:00Z");
    expect(exported.schema).toBe(RECOVERY_FOLLOW_UP_SCHEMA);
    expect(exported.follow_ups.find((item) => item.id === "plug-a")?.integration_group_owner_supplied).toBe("MQTT");
    expect(JSON.stringify(exported)).not.toMatch(/rtsp:\/\/|token|viewer_url|password/i);
    expect(() => validateOwnerIntegrationName("rtsp://user:pass@camera")).toThrow("no URLs");
    expect(() => validateOwnerIntegrationName(" ")).toThrow("integration name");
  });

  it("does not suppress a previously retired identity that reappears unexpectedly", () => {
    const receipt = parseOwnerAcceptanceReceipt(JSON.stringify(original));
    const returned = { ...later, home_assistant: { ...later.home_assistant, devices: [{ id: "old-device", name: "Retired sensor" }] } };
    const queue = buildRecoveryFollowUpQueue(receipt, returned, readiness, {}, new Set(), new Set(), now);
    expect(queue.followUps.find((item) => item.id === "old-device")?.stage).toBe("ha_owner_check");
    expect(queue.retiredExceptions).toBe(0);
  });

  it("holds stale, repeated and future-dated registry evidence from export and owner checking", () => {
    const receipt = parseOwnerAcceptanceReceipt(JSON.stringify(original));
    const stale = buildRecoveryFollowUpQueue(receipt, later, readiness, {}, new Set(), new Set(["front"]), now + 360_000);
    expect(stale.freshReading).toBe(false);
    expect(stale.summary.status).toBe("follow_up_required");
    expect(() => createRecoveryFollowUpReceipt(receipt, later, stale)).toThrow("later, fresh");
    const repeated = { ...later, captured_at: original.new_snapshot_at };
    const same = buildRecoveryFollowUpQueue(receipt, repeated, readiness, {}, new Set(), new Set(), now);
    expect(same.laterReading).toBe(false);
    expect(() => createRecoveryFollowUpReceipt(receipt, repeated, same)).toThrow("later, fresh");
    const future = buildRecoveryFollowUpQueue(receipt, later, readiness, {}, new Set(), new Set(), Date.parse(later.captured_at) - 120_000);
    expect(future.freshReading).toBe(false);
  });
});
