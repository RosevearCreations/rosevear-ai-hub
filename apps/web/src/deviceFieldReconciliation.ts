import type { CameraDashboard, CameraRecord, Go2RTCStatus } from "./api";
import {
  compareRecoverySnapshots,
  type DeviceCameraSnapshot,
  type RecoveryComparison,
} from "./deviceRecovery";

export const FIELD_RECONCILIATION_SCHEMA = "rosevear-device-camera-field-review/v1" as const;

export type MissingSource = "ha_device" | "ha_entity" | "hub_camera";
export type OwnerDisposition =
  | "unreviewed"
  | "review_integration"
  | "review_discovery"
  | "check_offline"
  | "review_identity_change"
  | "confirmed_retired";

export interface MissingFieldIdentity {
  key: string;
  source: MissingSource;
  id: string;
  name: string;
}

export interface CameraPlaybackReadiness {
  id: string;
  cameraId: number;
  name: string;
  ready: boolean;
  reason: string;
  lastProbeAt: string | null;
}

export function missingFieldIdentities(comparison: RecoveryComparison): MissingFieldIdentity[] {
  return (
    [
      ["ha_device", comparison.devices.missing],
      ["ha_entity", comparison.entities.missing],
      ["hub_camera", comparison.cameras.missing],
    ] as const
  ).flatMap(([source, identities]) => identities.map(({ id, name }) => ({
    source,
    id,
    name,
    key: JSON.stringify([source, id]),
  })));
}

export function allowedDispositions(source: MissingSource): OwnerDisposition[] {
  return [
    "unreviewed",
    source === "hub_camera" ? "review_discovery" : "review_integration",
    "check_offline",
    "review_identity_change",
    "confirmed_retired",
  ];
}

export function cameraPlaybackReadiness(
  cameras: CameraRecord[],
  dashboard: CameraDashboard | null,
  transport: Go2RTCStatus | null,
  now = Date.now(),
): CameraPlaybackReadiness[] {
  const health = new Map((dashboard?.cameras ?? []).map((item) => [item.camera_id, item]));
  const generatedAt = dashboard ? Date.parse(dashboard.generated_at) : NaN;
  const dashboardFresh = dashboard !== null && Number.isFinite(generatedAt)
    && generatedAt <= now + 60_000
    && now - generatedAt <= Math.min(Math.max(dashboard.stale_after_seconds, 60), 300) * 1000;
  return cameras.map((camera) => {
    const cameraHealth = health.get(camera.id);
    let reason = "Ready for manual playback check (not yet viewed).";
    if (!transport?.online || !dashboard?.transport_online) {
      reason = "Video transport unavailable or unreadable.";
    } else if (!transport.local_api_only || !transport.local_rtsp_only) {
      reason = "Video transport must be loopback-only before playback acceptance.";
    } else if (!camera.enabled || !camera.stream?.enabled) {
      reason = "Camera or stream is disabled. Review it in Cameras.";
    } else if (!cameraHealth?.configured || !cameraHealth.viewer_url) {
      reason = "No configured live viewer. Review stream configuration in Cameras.";
    } else if (!dashboardFresh) {
      reason = "Camera health evidence is stale or unavailable. Refresh status.";
    } else if (cameraHealth.health !== "healthy" || cameraHealth.last_probe_status !== "online") {
      reason = "A recent successful camera stream probe is required.";
    }
    return {
      id: camera.endpoint_uuid || `hub-camera:${camera.id}`,
      cameraId: camera.id,
      name: camera.display_name,
      ready: reason.startsWith("Ready for manual"),
      reason,
      lastProbeAt: cameraHealth?.last_probe_at ?? null,
    };
  });
}

/** A local human-review handoff, not evidence that any Home Assistant or camera mutation occurred. */
export function createFieldReviewReport(
  previous: DeviceCameraSnapshot,
  current: DeviceCameraSnapshot,
  decisions: Readonly<Record<string, OwnerDisposition>>,
  playback: CameraPlaybackReadiness[],
  seenLive: ReadonlySet<string>,
  generatedAt = new Date().toISOString(),
) {
  const comparison = compareRecoverySnapshots(previous, current);
  const missing = missingFieldIdentities(comparison).map((item) => ({
    source: item.source,
    id: item.id,
    name: item.name,
    disposition: allowedDispositions(item.source).includes(decisions[item.key])
      ? decisions[item.key] : "unreviewed" as OwnerDisposition,
  }));
  const cameras = playback.map((item) => ({
    id: item.id,
    name: item.name,
    transport_ready_at_review: item.ready,
    observed_live_video_by_operator: item.ready && seenLive.has(item.id),
    last_probe_at: item.lastProbeAt,
  }));
  const unreviewed = missing.filter((item) => item.disposition === "unreviewed").length;
  const followUp = missing.filter((item) => item.disposition !== "confirmed_retired").length;
  const unverified = cameras.filter((item) => !item.observed_live_video_by_operator).length;
  return {
    schema: FIELD_RECONCILIATION_SCHEMA,
    generated_at: generatedAt,
    baseline_captured_at: previous.captured_at,
    current_captured_at: current.captured_at,
    review_scope: "Owner-entered, session-only observations. No live device action or independent video verification.",
    new_identity_counts: {
      ha_devices: comparison.devices.newItems.length,
      ha_entities: comparison.entities.newItems.length,
      hub_cameras: comparison.cameras.newItems.length,
    },
    missing,
    camera_playback: cameras,
    summary: {
      missing_unreviewed: unreviewed,
      missing_follow_up_or_unresolved: followUp,
      registered_cameras_without_operator_playback: unverified,
      field_acceptance: "requires_independent_owner_verification" as const,
    },
  };
}
