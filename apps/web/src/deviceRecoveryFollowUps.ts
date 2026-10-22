import type { CameraPlaybackReadiness, MissingSource, OwnerDisposition } from "./deviceFieldReconciliation";
import type { DeviceCameraSnapshot } from "./deviceRecovery";
import { OWNER_ACCEPTANCE_SCHEMA } from "./deviceRecoveryReceipts";

export const RECOVERY_FOLLOW_UP_SCHEMA = "rosevear-device-camera-recovery-follow-up/v1" as const;

export interface OwnerAcceptanceReceipt {
  schema: typeof OWNER_ACCEPTANCE_SCHEMA;
  generated_at: string;
  previous_review_at: string;
  previous_snapshot_at: string;
  new_snapshot_at: string;
  identities: {
    source: MissingSource;
    id: string;
    name: string;
    prior_disposition: OwnerDisposition;
    present_in_new_registry: boolean;
    operator_reviewed_current_state: boolean;
    disposition: "reappeared_in_registry" | "retired_exception" | "still_absent";
  }[];
  camera_playback: {
    id: string;
    name: string;
    observed_in_prior_receipt: boolean;
    registered_now: boolean;
    healthy_private_stream_now: boolean;
    operator_observed_moving_video_now: boolean;
  }[];
}

export type FollowUpStage = "ha_integration" | "ha_owner_check" | "camera_registration" | "camera_stream" | "camera_playback";
export interface RecoveryFollowUp {
  key: string;
  source: MissingSource;
  id: string;
  name: string;
  stage: FollowUpStage;
  group: string;
  evidence: string;
  next_step: string;
}

const dispositionOptions: OwnerDisposition[] = [
  "unreviewed", "review_integration", "review_discovery", "check_offline",
  "review_identity_change", "confirmed_retired",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

function requiredText(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim() || value.length > 256) {
    throw new Error(`Invalid ${field} in owner acceptance receipt.`);
  }
  return value;
}

function requiredTime(value: unknown, field: string): string {
  const time = requiredText(value, field);
  if (!Number.isFinite(Date.parse(time))) throw new Error(`Invalid ${field} in owner acceptance receipt.`);
  return time;
}

function boolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw new Error(`Invalid ${field} in owner acceptance receipt.`);
  return value;
}

function boundedList(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value) || value.length > 10_000) {
    throw new Error(`Invalid or oversized ${field} in owner acceptance receipt.`);
  }
  return value;
}

/** Strip non-allowlisted fields (URLs, tokens and other device metadata) at the import boundary. */
export function parseOwnerAcceptanceReceipt(raw: string): OwnerAcceptanceReceipt {
  if (raw.length > 1_000_000) throw new Error("Owner acceptance receipt exceeds 1 MB.");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("Owner acceptance receipt must be valid JSON."); }
  if (!isRecord(parsed) || parsed.schema !== OWNER_ACCEPTANCE_SCHEMA) {
    throw new Error("Not a supported Build 109 owner acceptance receipt.");
  }
  const generatedAt = requiredTime(parsed.generated_at, "generated timestamp");
  const previousReviewAt = requiredTime(parsed.previous_review_at, "previous review timestamp");
  const previousSnapshotAt = requiredTime(parsed.previous_snapshot_at, "previous snapshot timestamp");
  const newSnapshotAt = requiredTime(parsed.new_snapshot_at, "new snapshot timestamp");
  if (Date.parse(previousSnapshotAt) > Date.parse(previousReviewAt) ||
    Date.parse(previousReviewAt) > Date.parse(newSnapshotAt) ||
    Date.parse(newSnapshotAt) > Date.parse(generatedAt)) {
    throw new Error("Owner acceptance receipt timestamps are out of order.");
  }

  const seenIdentities = new Set<string>();
  const identities = boundedList(parsed.identities, "identity list").map((entry) => {
    if (!isRecord(entry)) throw new Error("Invalid identity entry in owner acceptance receipt.");
    const source = entry.source;
    if (source !== "ha_device" && source !== "ha_entity" && source !== "hub_camera") {
      throw new Error("Unknown identity source in owner acceptance receipt.");
    }
    const id = requiredText(entry.id, "identity ID");
    const key = JSON.stringify([source, id]);
    if (seenIdentities.has(key)) throw new Error("Duplicate identity in owner acceptance receipt.");
    seenIdentities.add(key);
    const name = requiredText(entry.name, "identity name");
    const priorDisposition = entry.prior_disposition as OwnerDisposition;
    if (!dispositionOptions.includes(priorDisposition)) throw new Error("Invalid prior identity disposition.");
    const present = boolean(entry.present_in_new_registry, "present flag");
    const reviewed = boolean(entry.operator_reviewed_current_state, "owner review flag");
    const expectedDisposition: OwnerAcceptanceReceipt["identities"][number]["disposition"] = present ? "reappeared_in_registry" :
      priorDisposition === "confirmed_retired" ? "retired_exception" : "still_absent";
    if (entry.disposition !== expectedDisposition || (reviewed && !present && expectedDisposition !== "retired_exception")) {
      throw new Error("Contradictory identity acceptance in owner receipt.");
    }
    return {
      source: source as MissingSource, id, name, prior_disposition: priorDisposition,
      present_in_new_registry: present, operator_reviewed_current_state: reviewed,
      disposition: expectedDisposition,
    };
  });

  const seenCameras = new Set<string>();
  const cameraPlayback = boundedList(parsed.camera_playback, "camera list").map((entry) => {
    if (!isRecord(entry)) throw new Error("Invalid camera entry in owner acceptance receipt.");
    const id = requiredText(entry.id, "camera ID");
    if (seenCameras.has(id)) throw new Error("Duplicate camera in owner acceptance receipt.");
    seenCameras.add(id);
    const name = requiredText(entry.name, "camera name");
    const observedBefore = boolean(entry.observed_in_prior_receipt, "prior video flag");
    const registered = boolean(entry.registered_now, "registered flag");
    const healthy = boolean(entry.healthy_private_stream_now, "stream health flag");
    const observed = boolean(entry.operator_observed_moving_video_now, "moving video flag");
    if ((healthy && !registered) || (observed && !healthy)) {
      throw new Error("Contradictory camera acceptance in owner receipt.");
    }
    return {
      id, name, observed_in_prior_receipt: observedBefore,
      registered_now: registered, healthy_private_stream_now: healthy,
      operator_observed_moving_video_now: observed,
    };
  });

  if (!isRecord(parsed.summary)) throw new Error("Missing owner receipt summary.");
  const summary = parsed.summary;
  const expected = {
    previous_missing_identities: identities.length,
    reappeared_in_registry: identities.filter((item) => item.present_in_new_registry).length,
    retired_exceptions: identities.filter((item) => item.disposition === "retired_exception").length,
    identity_acceptance_holds: identities.filter((item) => !item.operator_reviewed_current_state).length,
    camera_playback_holds: cameraPlayback.filter((item) => !item.operator_observed_moving_video_now).length,
  };
  if (Object.entries(expected).some(([field, count]) => summary[field] !== count)) {
    throw new Error("Owner receipt summary does not match its evidence rows.");
  }
  const accepted = identities.length + cameraPlayback.length > 0 &&
    expected.identity_acceptance_holds === 0 && expected.camera_playback_holds === 0;
  if (summary.status !== (accepted ? "owner_attested_only" : "follow_up_required")) {
    throw new Error("Contradictory owner receipt status.");
  }
  return {
    schema: OWNER_ACCEPTANCE_SCHEMA,
    generated_at: generatedAt,
    previous_review_at: previousReviewAt,
    previous_snapshot_at: previousSnapshotAt,
    new_snapshot_at: newSnapshotAt,
    identities,
    camera_playback: cameraPlayback,
  };
}

/** A name alone is never proof of HA integration ownership; only a supervised label is accepted. */
export function validateOwnerIntegrationName(value: string): string {
  const name = value.trim();
  if (!name || name.length > 64 || !/^[\p{L}\p{N} _.-]+$/u.test(name)) {
    throw new Error("Use a short integration name only (letters, numbers, spaces, dot, dash or underscore; no URLs or credentials).");
  }
  return name;
}

export function buildRecoveryFollowUpQueue(
  receipt: OwnerAcceptanceReceipt,
  current: DeviceCameraSnapshot,
  playback: CameraPlaybackReadiness[],
  integrationGroups: Readonly<Record<string, string>>,
  ownerChecked: ReadonlySet<string>,
  observedVideo: ReadonlySet<string>,
  now = Date.now(),
) {
  const sampleAt = Date.parse(current.captured_at);
  const laterReading = sampleAt > Date.parse(receipt.new_snapshot_at);
  const freshReading = Number.isFinite(sampleAt) && sampleAt <= now + 60_000 && now - sampleAt <= 300_000;
  const deviceIds = new Set(current.home_assistant.devices.map((item) => item.id));
  const entityIds = new Set(current.home_assistant.entities.map((item) => item.id));
  const cameraNames = new Map(current.cameras.map((item) => [item.id, item.name]));
  const currentCameras = new Set(cameraNames.keys());
  const playbackById = new Map(playback.map((item) => [item.id, item]));
  const followUps: RecoveryFollowUp[] = [];
  let retiredExceptions = 0;

  for (const item of receipt.identities) {
    if (item.source === "hub_camera") continue;
    const key = JSON.stringify([item.source, item.id]);
    const present = (item.source === "ha_device" ? deviceIds : entityIds).has(item.id);
    if (!present && item.disposition === "retired_exception" && item.operator_reviewed_current_state) {
      retiredExceptions++;
      continue;
    }
    if (present && item.present_in_new_registry && item.operator_reviewed_current_state) continue;
    if (present && ownerChecked.has(key) && laterReading && freshReading) continue;
    const suppliedGroup = integrationGroups[key];
    const group = suppliedGroup ? validateOwnerIntegrationName(suppliedGroup) : "Integration unassigned";
    followUps.push({
      key, source: item.source, id: item.id, name: item.name,
      stage: present ? "ha_owner_check" : "ha_integration",
      group,
      evidence: present ? "Exact identity reported by new HA registry; function not accepted in this session." :
        "Exact identity absent from the new HA registry; owner integration evidence required.",
      next_step: present ? "Owner tests this device/entity function in Home Assistant." :
        "Owner checks Settings → Devices & services, integration diagnostics and device power/network. Do not re-add automatically.",
    });
  }

  const priorCameras = new Map(receipt.camera_playback.map((item) => [item.id, item]));
  const absentCameraIdentities = receipt.identities.filter((item) => item.source === "hub_camera");
  const allCameraIds = new Set([
    ...priorCameras.keys(), ...absentCameraIdentities.map((item) => item.id), ...currentCameras,
  ]);
  for (const id of allCameraIds) {
    const currentRegistered = currentCameras.has(id);
    const ready = currentRegistered && freshReading && laterReading && Boolean(playbackById.get(id)?.ready);
    if (ready && observedVideo.has(id)) continue;
    const stage: FollowUpStage = !currentRegistered ? "camera_registration" : !ready ? "camera_stream" : "camera_playback";
    const reason = stage === "camera_registration"
      ? "Camera ID missing from current Hub registrations (not proof of deletion)."
      : stage === "camera_stream"
        ? playbackById.get(id)?.reason ?? "No fresh, safe private stream evidence."
        : "Stream is ready; fresh moving video has not been acknowledged by the owner.";
    followUps.push({
      key: JSON.stringify(["camera", id]), source: "hub_camera", id,
      name: cameraNames.get(id) ?? priorCameras.get(id)?.name ??
        absentCameraIdentities.find((item) => item.id === id)?.name ?? id,
      stage,
      group: stage === "camera_registration" ? "Camera registration" :
        stage === "camera_stream" ? "Camera transport / stream" : "Camera live playback",
      evidence: reason,
      next_step: stage === "camera_registration" ? "Review ONVIF discovery, then register only chosen cameras." :
        stage === "camera_stream" ? "Inspect loopback-only go2rtc, configured source and fresh health probe; do not export stream URLs." :
          "Owner views moving video in Cameras and acknowledges this session only.",
    });
  }

  const order: FollowUpStage[] = ["ha_integration", "ha_owner_check", "camera_registration", "camera_stream", "camera_playback"];
  followUps.sort((a, b) => order.indexOf(a.stage) - order.indexOf(b.stage) ||
    a.group.localeCompare(b.group) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const counts = {
    ha_integration: followUps.filter((item) => item.stage === "ha_integration").length,
    ha_owner_check: followUps.filter((item) => item.stage === "ha_owner_check").length,
    camera_registration: followUps.filter((item) => item.stage === "camera_registration").length,
    camera_stream: followUps.filter((item) => item.stage === "camera_stream").length,
    camera_playback: followUps.filter((item) => item.stage === "camera_playback").length,
  };
  return {
    laterReading, freshReading, followUps, retiredExceptions,
    summary: { ...counts, total_open: followUps.length,
      status: laterReading && freshReading && (receipt.identities.length + receipt.camera_playback.length > 0) &&
        followUps.length === 0 ? "owner_attested_queue_only" as const : "follow_up_required" as const },
  };
}

export function createRecoveryFollowUpReceipt(
  source: OwnerAcceptanceReceipt,
  current: DeviceCameraSnapshot,
  queue: ReturnType<typeof buildRecoveryFollowUpQueue>,
  generatedAt = new Date().toISOString(),
) {
  if (!queue.laterReading || !queue.freshReading) {
    throw new Error("A later, fresh registry reading is required before exporting the follow-up queue.");
  }
  return {
    schema: RECOVERY_FOLLOW_UP_SCHEMA,
    generated_at: generatedAt,
    source_owner_acceptance_at: source.generated_at,
    source_registry_at: source.new_snapshot_at,
    current_registry_at: current.captured_at,
    evidence_scope: "Private owner annotations and current registry status only. No automatic recovery, integration ownership proof, physical function certification, or independent video verification.",
    follow_ups: queue.followUps.map((item) => ({
      source: item.source, id: item.id, name: item.name, stage: item.stage,
      integration_group_owner_supplied: item.source === "hub_camera" || item.group === "Integration unassigned" ? null : item.group,
      evidence: item.evidence, next_step: item.next_step,
    })),
    retired_exceptions: queue.retiredExceptions,
    summary: queue.summary,
  };
}
