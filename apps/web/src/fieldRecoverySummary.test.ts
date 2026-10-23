import { describe, expect, it } from "vitest";
import type { CameraDashboard, CameraRecord, Go2RTCStatus, HomeAssistantBrowserResponse, HomeAssistantStatus, MQTTStatus } from "./api";
import { closureKey, parseClosureLedger, parseRecoveryWorklist } from "./deviceRecoveryClosure";
import { buildFieldSnapshot, assessFieldRecovery, createFieldRecoverySummary, validateFieldWorklist, type FieldSnapshot } from "./fieldRecoverySummary";

const worklist = parseRecoveryWorklist(JSON.stringify({
  schema: "rosevear-device-camera-recovery-follow-up/v1", generated_at: "2026-10-22T10:01:00Z",
  source_registry_at: "2026-10-21T10:00:00Z", current_registry_at: "2026-10-22T10:00:00Z",
  follow_ups: [
    { source: "ha_device", id: "shop-plug", name: "Shop plug", stage: "ha_integration", integration_group_owner_supplied: "MQTT" },
    { source: "ha_entity", id: "sensor.kitchen", name: "Kitchen sensor", stage: "ha_owner_check", integration_group_owner_supplied: null },
    { source: "hub_camera", id: "camera-1", name: "Camera #1", stage: "camera_playback", integration_group_owner_supplied: null },
  ],
  summary: { ha_integration: 1, ha_owner_check: 1, camera_registration: 0, camera_stream: 0, camera_playback: 1, total_open: 3, status: "follow_up_required" },
}));
const ledger = parseClosureLedger(JSON.stringify({
  schema: "rosevear-device-camera-follow-up-closure-ledger/v1",
  source_worklist_at: "2026-10-22T10:01:00Z", source_registry_at: "2026-10-22T10:00:00Z", generated_at: "2026-10-22T13:01:00Z",
  entries: [{ registry_at: "2026-10-22T13:00:00Z", reviewed_at: "2026-10-22T13:01:00Z",
    decisions: [
      { source: "ha_device", id: "shop-plug", stage: "ha_integration", registry_present: false, private_stream_ready: null, owner_action: "pending", status: "open_hold", reopened_from_previous: false },
      { source: "ha_entity", id: "sensor.kitchen", stage: "ha_owner_check", registry_present: true, private_stream_ready: null, owner_action: "verified_function", status: "owner_attested_closed", reopened_from_previous: false },
      { source: "hub_camera", id: "camera-1", stage: "camera_playback", registry_present: true, private_stream_ready: true, owner_action: "verified_live_video", status: "owner_attested_closed", reopened_from_previous: false },
    ],
    summary: { open_holds: 1, owner_attested_closed: 2, reopened: 0 },
  }],
}), worklist);

const ok = <T,>(value: T): PromiseFulfilledResult<T> => ({ status: "fulfilled", value });
const fail = (): PromiseRejectedResult => ({ status: "rejected", reason: new Error("token=SECRET") });
const moment = new Date("2026-10-23T11:00:00Z");

function live(): FieldSnapshot {
  return buildFieldSnapshot({
    homeAssistant: ok({ configured: true, available: true, token_configured: true, base_url: "http://SECRET", message: "password SECRET" } as HomeAssistantStatus),
    mqtt: ok({ configured: true, available: true, host: "private", allowed_topics: ["SECRET/#"] } as MQTTStatus),
    browser: ok({ devices: [{ device_id: "shop-plug" }], entities: [
      { entity_id: "sensor.kitchen", device_id: "shop-plug", state: "on" },
    ] } as HomeAssistantBrowserResponse),
    cameras: ok([{ id: 1, endpoint_uuid: "camera-1", enabled: true, host: "SECRET-IP", service_url: "rtsp://SECRET",
      stream: { enabled: true, encrypted: true, stream_name: "cam", source_host: "private" } },
      { id: 2, endpoint_uuid: "untracked-camera", enabled: false, stream: null }] as CameraRecord[]),
    dashboard: ok({ cameras: [{ camera_id: 1, enabled: true, configured: true, health: "healthy", stream_name: "cam", source_host: "private", last_probe_at: "2026-10-23T10:59:00Z" }] } as CameraDashboard),
    go2rtc: ok({ configured: true, online: true, local_api_only: true, local_rtsp_only: true, api_base_url: "http://SECRET", error: "SECRET" } as Go2RTCStatus),
  }, moment);
}

describe("Build 118 owner recovery summary", () => {
  it("only collects sanitized exact IDs and availability, never private address or integration data", () => {
    const current = live();
    const json = JSON.stringify(current);
    expect(json).not.toContain("SECRET");
    expect(json).not.toContain("rtsp:");
    expect(current.devices).toEqual([{ id: "shop-plug", ready: true }]);
    expect(current.entities).toEqual([{ id: "sensor.kitchen", ready: true }]);
    expect(current.cameras).toEqual([{ id: "camera-1", ready: true }, { id: "untracked-camera", ready: false }]);
  });

  it("preserves old holds even after an owner observation, while exposing unsigned current evidence", () => {
    const current = live();
    const marks = {
      [closureKey("ha_device", "shop-plug")]: { owner: "workshop_operator" as const, verifiedNow: true },
      [closureKey("hub_camera", "camera-1")]: { owner: "camera_operator" as const, verifiedNow: true },
    };
    const report = assessFieldRecovery(worklist, ledger, current, marks, moment.getTime() + 1000);
    expect(report.readyForOwnerReview).toBe(true);
    expect(report.summary.historical_open).toBe(1);
    expect(report.summary.owner_observed_now).toBe(2);
    expect(report.summary.unresolved).toBe(2);
    expect(report.summary.untracked_cameras).toBe(1);
    expect(report.rows[0].unresolved).toBe(true); // needs a new formal closure ledger
    const receipt = createFieldRecoverySummary(worklist, ledger, report, current, new Date(moment.getTime() + 2000));
    expect(receipt.status).toBe("FIELD_ACCEPTANCE_HOLD");
    expect(receipt.installed_windows_verified).toBe(false);
    expect(receipt.independently_signed).toBe(false);
    expect(receipt.identities[2].owner_reported_function_or_moving_video_now).toBe(true);
    expect(JSON.stringify(receipt)).not.toMatch(/SECRET|password|rtsp:\/\/|token=|api_base_url|source_host/);
  });

  it("shows a historical closure reopened when a fresh exact camera identity or HA state disappears", () => {
    const current = live();
    const report = assessFieldRecovery(worklist, ledger, { ...current, cameras: [], entities: [{ id: "sensor.kitchen", ready: false }] }, {}, moment.getTime() + 1000);
    expect(report.summary.live_reopened).toBe(2);
    expect(report.rows[1].liveState).toBe("attention");
    expect(report.rows[2].liveState).toBe("absent");
    expect(report.rows[1].liveReopened).toBe(true);
    expect(report.rows[2].liveReopened).toBe(true);
    expect(report.rows[2].nextStep).toContain("registration");
  });

  it("fails closed when an integration read fails, a relay is externally available, or camera probe is stale", () => {
    const read = live();
    const noHA = assessFieldRecovery(worklist, ledger, { ...read, devices: null, entities: null, haOnline: false }, {}, moment.getTime());
    expect(noHA.rows[0].liveState).toBe("unverified");
    expect(noHA.rows[1].liveState).toBe("unverified");
    const errorSnapshot = buildFieldSnapshot({ homeAssistant: fail(), mqtt: fail(), browser: fail(), cameras: fail(), dashboard: fail(), go2rtc: fail() });
    expect(JSON.stringify(errorSnapshot)).not.toContain("SECRET");
    expect(errorSnapshot.cameras).toBeNull();
    const insecureRelay = { ...read, privateCameraRelay: false, cameras: [{ id: "camera-1", ready: false }] };
    expect(assessFieldRecovery(worklist, ledger, insecureRelay, {}, moment.getTime()).rows[2].liveState).toBe("attention");
  });

  it("rejects time-reversed or stale snapshots and wrong owner roles before export", () => {
    const current = live();
    const wrongRole = assessFieldRecovery(worklist, ledger, current, {
      [closureKey("hub_camera", "camera-1")]: { owner: "household_owner", verifiedNow: true },
    }, moment.getTime());
    expect(wrongRole.rows[2].functionObservedNow).toBe(false);
    const stale = assessFieldRecovery(worklist, ledger, current, {}, moment.getTime() + 1_000_000);
    expect(stale.readyForOwnerReview).toBe(false);
    expect(() => createFieldRecoverySummary(worklist, ledger, stale, current, new Date(moment.getTime() + 1_000_000))).toThrow(/fresh/);
    const tooOld = { ...current, capturedAt: "2026-10-22T12:00:00Z" };
    expect(assessFieldRecovery(worklist, ledger, tooOld, {}, moment.getTime()).later).toBe(false);
    expect(() => validateFieldWorklist({ ...worklist, follow_ups: [{ ...worklist.follow_ups[0], id: "token=PRIVATE" }] })).toThrow(/bounded exact registry IDs/);
  });
});
