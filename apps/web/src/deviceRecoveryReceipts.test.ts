import { describe, expect, it } from "vitest";

import { RECOVERY_SNAPSHOT_SCHEMA, type DeviceCameraSnapshot } from "./deviceRecovery";
import { createFieldReviewReport, type CameraPlaybackReadiness } from "./deviceFieldReconciliation";
import {
  OWNER_ACCEPTANCE_SCHEMA,
  createOwnerAcceptancePacket,
  parseFieldReviewReceipt,
  reconcileFieldReviewReceipt,
} from "./deviceRecoveryReceipts";

const before: DeviceCameraSnapshot = {
  schema: RECOVERY_SNAPSHOT_SCHEMA, captured_at: "2026-10-20T10:00:00Z",
  home_assistant: {
    devices: [{ id: "lamp-device", name: "Lamp" }, { id: "old-tv", name: "TV" }],
    entities: [{ id: "light.lamp", name: "Lamp" }],
  },
  cameras: [{ id: "front-camera", name: "Front camera" }],
};
const missing: DeviceCameraSnapshot = {
  ...before, captured_at: "2026-10-21T10:00:00Z",
  home_assistant: { devices: [], entities: [] }, cameras: [],
};
const later: DeviceCameraSnapshot = {
  ...before, captured_at: "2026-10-22T10:00:00Z",
  home_assistant: {
    devices: [{ id: "lamp-device", name: "Lamp" }],
    entities: [{ id: "light.lamp", name: "Lamp" }],
  },
  cameras: [{ id: "front-camera", name: "Front camera" }, { id: "back-camera", name: "Back camera" }],
};
const readiness: CameraPlaybackReadiness[] = [
  { id: "front-camera", cameraId: 1, name: "Front camera", ready: true, reason: "Ready", lastProbeAt: "2026-10-22T09:59:00Z" },
  { id: "back-camera", cameraId: 2, name: "Back camera", ready: false, reason: "No producer", lastProbeAt: null },
];
const review = createFieldReviewReport(before, missing, {}, [], new Set(), "2026-10-21T11:00:00Z");

describe("Build 109 owner review receipt reconciliation", () => {
  it("parses only bounded allowlisted receipt fields and rejects duplicates, contradictions and timestamps", () => {
    const extra = {
      ...review,
      private_token: "TOP-SECRET",
      missing: [{ ...review.missing[0], private_url: "rtsp://secret" }],
    };
    const parsed = parseFieldReviewReceipt(JSON.stringify(extra));
    expect(parsed.missing[0].id).toBe("lamp-device");
    expect(JSON.stringify(parsed)).not.toMatch(/TOP-SECRET|rtsp:\/\/secret|private_token|private_url/);
    expect(() => parseFieldReviewReceipt("garbage")).toThrow("valid JSON");
    expect(() => parseFieldReviewReceipt("x".repeat(1_000_001))).toThrow("1 MB");
    expect(() => parseFieldReviewReceipt(JSON.stringify({ ...review, missing: [review.missing[0], review.missing[0]] }))).toThrow("Duplicate");
    expect(() => parseFieldReviewReceipt(JSON.stringify({ ...review, generated_at: "2026-10-20T09:00:00Z" }))).toThrow("out of order");
    expect(() => parseFieldReviewReceipt(JSON.stringify({ ...review, camera_playback: [{
      id: "front-camera", name: "Front", transport_ready_at_review: false,
      observed_live_video_by_operator: true, last_probe_at: null,
    }] }))).toThrow("Contradictory");
  });

  it("reconciles returned identities without mistaking earlier missing devices or video for physical proof", () => {
    const receipt = parseFieldReviewReceipt(JSON.stringify(review));
    const reconciliation = reconcileFieldReviewReceipt(receipt, later, readiness, Date.parse(later.captured_at) + 30_000);
    expect(reconciliation.laterReading).toBe(true);
    expect(reconciliation.freshReading).toBe(true);
    expect(reconciliation.identities.filter((i) => i.presentNow).map((i) => i.id)).toEqual(["lamp-device", "light.lamp", "front-camera"]);
    expect(reconciliation.identities.find((i) => i.id === "old-tv")?.presentNow).toBe(false);
    expect(reconciliation.cameras.map((c) => [c.id, c.readyNow, c.newSinceReceipt])).toEqual([
      ["front-camera", true, true], ["back-camera", false, true],
    ]);
    const beforeReview = createOwnerAcceptancePacket(receipt, later, reconciliation, new Set(), new Set());
    expect(beforeReview.summary.status).toBe("follow_up_required");
    expect(beforeReview.summary.identity_acceptance_holds).toBe(4);
    expect(beforeReview.summary.camera_playback_holds).toBe(2);
    const attempts = createOwnerAcceptancePacket(receipt, later, reconciliation,
      new Set(reconciliation.identities.map((i) => i.key)), new Set(["front-camera", "back-camera"]));
    expect(attempts.schema).toBe(OWNER_ACCEPTANCE_SCHEMA);
    expect(attempts.summary.identity_acceptance_holds).toBe(1); // Missing TV cannot be accepted as restored.
    expect(attempts.summary.camera_playback_holds).toBe(1); // Ineligible back-camera claim is rejected.
    expect(attempts.camera_playback[1].operator_observed_moving_video_now).toBe(false);
  });

  it("holds out-of-order readings and permits an explicitly reviewed retired exception without restoring it", () => {
    const report = createFieldReviewReport(before, missing,
      { [JSON.stringify(["ha_device", "old-tv"])]: "confirmed_retired" }, [], new Set(), "2026-10-21T11:00:00Z");
    const receipt = parseFieldReviewReceipt(JSON.stringify(report));
    const wrongOrder = reconcileFieldReviewReceipt(receipt, missing, [], Date.parse(missing.captured_at) + 30_000);
    expect(wrongOrder.laterReading).toBe(false);
    const wrongPacket = createOwnerAcceptancePacket(receipt, missing, wrongOrder,
      new Set(wrongOrder.identities.map((i) => i.key)), new Set());
    expect(wrongPacket.summary.identity_acceptance_holds).toBe(4);

    const reconciliation = reconcileFieldReviewReceipt(receipt, later, readiness, Date.parse(later.captured_at) + 30_000);
    const packet = createOwnerAcceptancePacket(receipt, later, reconciliation,
      new Set(reconciliation.identities.map((i) => i.key)), new Set(["front-camera"]));
    expect(packet.summary.retired_exceptions).toBe(1);
    expect(packet.summary.identity_acceptance_holds).toBe(0);
    expect(packet.summary.status).toBe("follow_up_required"); // Back camera still not playing.
  });

  it("does not carry forward a previous camera playback acknowledgement after a new sample", () => {
    const report = createFieldReviewReport(before, {
      ...missing, cameras: [{ id: "front-camera", name: "Front camera" }],
    }, {}, [{ id: "front-camera", cameraId: 1, name: "Front camera", ready: true,
      reason: "Ready", lastProbeAt: "2026-10-21T10:00:00Z" }], new Set(["front-camera"]), "2026-10-21T11:00:00Z");
    const receipt = parseFieldReviewReceipt(JSON.stringify(report));
    const reconciliation = reconcileFieldReviewReceipt(receipt, later, readiness, Date.parse(later.captured_at) + 30_000);
    expect(reconciliation.cameras[0].previouslyObserved).toBe(true);
    const packet = createOwnerAcceptancePacket(receipt, later, reconciliation, new Set(), new Set());
    expect(packet.camera_playback[0].observed_in_prior_receipt).toBe(true);
    expect(packet.camera_playback[0].operator_observed_moving_video_now).toBe(false);
  });

  it("invalidates stale or future-dated inventory evidence even if video used to be healthy", () => {
    const receipt = parseFieldReviewReceipt(JSON.stringify(review));
    const stale = reconcileFieldReviewReceipt(receipt, later, readiness, Date.parse(later.captured_at) + 360_000);
    expect(stale.laterReading).toBe(true);
    expect(stale.freshReading).toBe(false);
    expect(stale.cameras[0].readyNow).toBe(false);
    const packet = createOwnerAcceptancePacket(receipt, later, stale,
      new Set(stale.identities.map((item) => item.key)), new Set(["front-camera"]));
    expect(packet.summary.status).toBe("follow_up_required");
    expect(packet.summary.identity_acceptance_holds).toBe(stale.identities.length);
    const future = reconcileFieldReviewReceipt(receipt, later, readiness, Date.parse(later.captured_at) - 120_000);
    expect(future.freshReading).toBe(false);
  });
});
