import { describe, expect, it } from "vitest";

import { RECOVERY_SNAPSHOT_SCHEMA, type DeviceCameraSnapshot } from "./deviceRecovery";
import { RECOVERY_FOLLOW_UP_SCHEMA } from "./deviceRecoveryFollowUps";
import type { CameraPlaybackReadiness } from "./deviceFieldReconciliation";
import {
  RECOVERY_CLOSURE_SCHEMA, buildClosureReview, closureKey, createClosureLedger,
  parseClosureLedger, parseRecoveryWorklist,
} from "./deviceRecoveryClosure";

const t0 = "2026-10-22T10:00:00Z";
const t1 = "2026-10-22T11:00:00Z";
const t2 = "2026-10-22T12:00:00Z";
const t3 = "2026-10-22T13:00:00Z";
const worklistRaw = {
  schema: RECOVERY_FOLLOW_UP_SCHEMA,
  generated_at: t1,
  source_registry_at: "2026-10-22T09:00:00Z",
  current_registry_at: t0,
  follow_ups: [
    { source: "ha_device", id: "workshop-plug", name: "Workshop plug", stage: "ha_integration", integration_group_owner_supplied: "MQTT", evidence: "Owner note", next_step: "Check integration", token: "SECRET" },
    { source: "ha_entity", id: "sensor.old", name: "Old sensor", stage: "ha_integration", integration_group_owner_supplied: null },
    { source: "hub_camera", id: "front-camera", name: "Front camera", stage: "camera_playback", integration_group_owner_supplied: null, viewer_url: "rtsp://secret" },
    { source: "hub_camera", id: "garage-camera", name: "Garage camera", stage: "camera_registration", integration_group_owner_supplied: null },
  ],
  summary: { ha_integration: 2, ha_owner_check: 0, camera_registration: 1,
    camera_stream: 0, camera_playback: 1, total_open: 4, status: "follow_up_required" },
};
const parsed = parseRecoveryWorklist(JSON.stringify(worklistRaw));

function current(at: string): DeviceCameraSnapshot {
  return { schema: RECOVERY_SNAPSHOT_SCHEMA, captured_at: at,
    home_assistant: { devices: [{ id: "workshop-plug", name: "Workshop plug" }], entities: [] },
    cameras: [{ id: "front-camera", name: "Front camera" }, { id: "garage-camera", name: "Garage camera" }] };
}
const playback: CameraPlaybackReadiness[] = [
  { id: "front-camera", cameraId: 1, name: "Front camera", ready: true, reason: "Ready", lastProbeAt: t2 },
  { id: "garage-camera", cameraId: 2, name: "Garage camera", ready: false, reason: "Offline", lastProbeAt: null },
];

describe("Build 111 owner closure ledger", () => {
  it("imports only bounded Build 110 identity fields and rejects corrupt source evidence", () => {
    expect(parsed.follow_ups).toHaveLength(4);
    expect(JSON.stringify(parsed)).not.toMatch(/SECRET|Owner note|rtsp:\/\/secret|next_step|viewer_url/);
    expect(() => parseRecoveryWorklist("invalid")).toThrow("valid JSON");
    expect(() => parseRecoveryWorklist("x".repeat(1_000_001))).toThrow("1 MB");
    expect(() => parseRecoveryWorklist(JSON.stringify({ ...worklistRaw, schema: "unknown" }))).toThrow("Not a Build 110");
    expect(() => parseRecoveryWorklist(JSON.stringify({ ...worklistRaw, follow_ups: [...worklistRaw.follow_ups, worklistRaw.follow_ups[0]] }))).toThrow("Duplicate exact identity");
    expect(() => parseRecoveryWorklist(JSON.stringify({ ...worklistRaw, summary: { ...worklistRaw.summary, camera_stream: 5 } }))).toThrow("summary counts");
    expect(() => parseRecoveryWorklist(JSON.stringify({ ...worklistRaw, generated_at: "2026-10-20T10:00:00Z" }))).toThrow("out of order");
    expect(() => parseRecoveryWorklist(JSON.stringify({ ...worklistRaw, follow_ups: [{ ...worklistRaw.follow_ups[0], source: "hub_camera" }, ...worklistRaw.follow_ups.slice(1)] }))).toThrow("pairing");
  });

  it("requires explicit HA functional/retirement and moving-video observations; unhealthy cameras remain open", () => {
    const snapshot = current(t2);
    const hold = buildClosureReview(parsed, null, snapshot, playback, {}, Date.parse(t2) + 1000);
    expect(hold.summary).toEqual({ open_holds: 4, owner_attested_closed: 0, reopened: 0 });
    expect(hold.decisions.map((row) => row.stage)).toEqual(["ha_owner_check", "ha_integration", "camera_playback", "camera_stream"]);
    const marks = {
      [closureKey("ha_device", "workshop-plug")]: "verified_function" as const,
      [closureKey("ha_entity", "sensor.old")]: "confirmed_retired" as const,
      [closureKey("hub_camera", "front-camera")]: "verified_live_video" as const,
      [closureKey("hub_camera", "garage-camera")]: "verified_live_video" as const,
    };
    const review = buildClosureReview(parsed, null, snapshot, playback, marks, Date.parse(t2) + 1000);
    expect(review.summary).toEqual({ open_holds: 1, owner_attested_closed: 3, reopened: 0 });
    expect(review.decisions[3].owner_action).toBe("pending");
    expect(review.decisions[2].owner_action).toBe("verified_live_video");
    const ledger = createClosureLedger(parsed, null, snapshot, review, "2026-10-22T12:01:00Z");
    expect(ledger.schema).toBe(RECOVERY_CLOSURE_SCHEMA);
    expect(JSON.stringify(ledger)).not.toMatch(/SECRET|rtsp:\/\/|password|viewer_url/i);
    expect(parseClosureLedger(JSON.stringify(ledger), parsed)).toEqual(ledger);
  });

  it("reopens previously closed evidence on each later inventory and appends the bounded history", () => {
    const first = current(t2);
    const firstReview = buildClosureReview(parsed, null, first, playback, {
      [closureKey("hub_camera", "front-camera")]: "verified_live_video",
    }, Date.parse(t2) + 1000);
    const initial = createClosureLedger(parsed, null, first, firstReview, "2026-10-22T12:01:00Z");
    const next = current(t3);
    const review = buildClosureReview(parsed, initial, next, playback, {}, Date.parse(t3) + 1000);
    expect(review.laterReading).toBe(true);
    expect(review.summary.reopened).toBe(1);
    expect(review.decisions[2].status).toBe("open_hold");
    const extended = createClosureLedger(parsed, initial, next, review, "2026-10-22T13:01:00Z");
    expect(extended.entries).toHaveLength(2);
    expect(parseClosureLedger(JSON.stringify(extended), parsed)).toEqual(extended);
    const tampered = structuredClone(extended);
    tampered.entries[1].decisions[2].reopened_from_previous = false;
    expect(() => parseClosureLedger(JSON.stringify(tampered), parsed)).toThrow("reopen");
    expect(() => parseClosureLedger(JSON.stringify({ ...extended, source_worklist_at: t0 }), parsed)).toThrow("different Build 110");
    expect(() => parseClosureLedger(JSON.stringify({ ...extended, entries: [extended.entries[0], extended.entries[0]] }), parsed)).toThrow("reading order");
    expect(() => parseClosureLedger(JSON.stringify({ ...extended, entries: [{ ...extended.entries[0], decisions: [] }] }), parsed)).toThrow("missing worklist");
  });

  it("holds stale/repeated/future inventory and cannot auto-close on an earlier camera receipt", () => {
    expect(buildClosureReview(parsed, null, current(t0), playback, {}, Date.parse(t0)).laterReading).toBe(false);
    const stale = buildClosureReview(parsed, null, current(t2), playback, {}, Date.parse(t3));
    expect(stale.freshReading).toBe(false);
    expect(stale.decisions.every((item) => item.status === "open_hold")).toBe(true);
    const future = buildClosureReview(parsed, null, current(t3), playback, {}, Date.parse(t2));
    expect(future.freshReading).toBe(false);
    expect(() => createClosureLedger(parsed, null, current(t3), future)).toThrow("later, fresh");
  });
});
