import { describe, expect, it } from "vitest";

import { RECOVERY_SNAPSHOT_SCHEMA, type DeviceCameraSnapshot } from "./deviceRecovery";
import { RECOVERY_FOLLOW_UP_SCHEMA } from "./deviceRecoveryFollowUps";
import { buildClosureReview, closureKey, createClosureLedger, parseClosureLedger, parseRecoveryWorklist } from "./deviceRecoveryClosure";
import { RECOVERY_DRIFT_SCHEMA, compareClosureHistory, createDriftHandoff } from "./deviceRecoveryDrift";

const worklist = parseRecoveryWorklist(JSON.stringify({
  schema: RECOVERY_FOLLOW_UP_SCHEMA,
  generated_at: "2026-10-22T10:01:00Z",
  source_registry_at: "2026-10-21T10:00:00Z",
  current_registry_at: "2026-10-22T10:00:00Z",
  follow_ups: [
    { source: "ha_device", id: "workshop", name: "Workshop plug", stage: "ha_integration", integration_group_owner_supplied: "MQTT", secret: "NOPE" },
    { source: "ha_entity", id: "missing", name: "Old sensor", stage: "ha_integration", integration_group_owner_supplied: null },
    { source: "hub_camera", id: "front", name: "Front camera", stage: "camera_playback", integration_group_owner_supplied: null },
  ],
  summary: { ha_integration: 2, ha_owner_check: 0, camera_registration: 0, camera_stream: 0,
    camera_playback: 1, total_open: 3, status: "follow_up_required" },
}));

function snapshot(time: string): DeviceCameraSnapshot {
  return { schema: RECOVERY_SNAPSHOT_SCHEMA, captured_at: time,
    home_assistant: { devices: [{ id: "workshop", name: "Workshop plug" }], entities: [] },
    cameras: [{ id: "front", name: "Front camera" }] };
}
const playback = [{ id: "front", cameraId: 1, name: "Front camera", ready: true, reason: "Ready", lastProbeAt: "2026-10-22T12:00:00Z" }];
const firstAt = "2026-10-22T12:00:00Z";
const laterAt = "2026-10-22T13:00:00Z";
const first = snapshot(firstAt);
const firstReview = buildClosureReview(worklist, null, first, playback, {
  [closureKey("hub_camera", "front")]: "verified_live_video",
}, Date.parse(firstAt) + 1000);
const initial = createClosureLedger(worklist, null, first, firstReview, "2026-10-22T12:01:00Z");
const second = snapshot(laterAt);
const secondReview = buildClosureReview(worklist, initial, second, playback, {
  [closureKey("ha_device", "workshop")]: "verified_function",
}, Date.parse(laterAt) + 1000);
const ledger = parseClosureLedger(JSON.stringify(createClosureLedger(worklist, initial, second, secondReview, "2026-10-22T13:01:00Z")), worklist);

describe("Build 112 supervised drift and private evidence handoff", () => {
  it("classifies reopened video, still-open HA, newly verified HA and maintains chronological evidence lineage", () => {
    const drift = compareClosureHistory(worklist, ledger);
    expect(drift.summary).toEqual({ total: 3, unresolved: 2, owner_attested_closed: 1, reopened: 1,
      still_open: 1, newly_closed: 1, rechecked_closed: 0, stage_changed: 0, unresolved_ha: 1, unresolved_camera: 1 });
    expect(drift.items.map((item) => [item.id, item.drift, item.stage])).toEqual([
      ["workshop", "newly_closed", "ha_owner_check"], ["missing", "still_open", "ha_integration"], ["front", "reopened", "camera_playback"],
    ]);
    const exportPacket = createDriftHandoff(worklist, ledger, drift, new Set([closureKey("hub_camera", "front")]), "2026-10-22T13:02:00Z");
    expect(exportPacket.schema).toBe(RECOVERY_DRIFT_SCHEMA);
    expect(exportPacket.history).toHaveLength(2);
    expect(exportPacket.summary.handoff_reviewed).toBe(1);
    expect(exportPacket.summary.handoff_pending).toBe(1);
    expect(exportPacket.unresolved.map((item) => item.id)).toEqual(["missing", "front"]);
    expect(exportPacket.unresolved[1].owner_reviewed_handoff_now).toBe(true);
    expect(JSON.stringify(exportPacket)).not.toMatch(/NOPE|rtsp:\/\/|token|password|viewer_url/i);
  });

  it("recognizes first-review-only evidence and never calls it a prior comparison", () => {
    const drift = compareClosureHistory(worklist, initial);
    expect(drift.previous_review_at).toBeNull();
    expect(drift.summary.reopened).toBe(0);
    expect(drift.items[2].drift).toBe("first_review_closed");
    expect(drift.items[0].drift).toBe("first_review_open");
  });

  it("rejects mismatched provenance, stale generated time and review tampering", () => {
    const drift = compareClosureHistory(worklist, ledger);
    expect(() => compareClosureHistory({ ...worklist, generated_at: "2026-10-20T01:00:00Z" }, ledger)).toThrow("does not match");
    expect(() => createDriftHandoff(worklist, ledger, drift, new Set(), "2026-10-22T10:02:00Z")).toThrow("predates");
    const changed = { ...drift, items: [...drift.items].reverse() };
    expect(() => createDriftHandoff(worklist, ledger, changed, new Set(), "2026-10-22T13:02:00Z")).toThrow("no longer matches");
    expect(() => parseClosureLedger(JSON.stringify({ ...ledger, entries: [{ ...ledger.entries[0], decisions: [] }, ledger.entries[1]] }), worklist)).toThrow("missing worklist");
  });
});
