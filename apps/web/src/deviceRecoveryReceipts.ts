import {
  FIELD_RECONCILIATION_SCHEMA,
  allowedDispositions,
  type CameraPlaybackReadiness,
  type MissingSource,
  type OwnerDisposition,
} from "./deviceFieldReconciliation";
import type { DeviceCameraSnapshot } from "./deviceRecovery";

export const OWNER_ACCEPTANCE_SCHEMA = "rosevear-device-camera-owner-acceptance/v1" as const;

export interface FieldReviewReceipt {
  schema: typeof FIELD_RECONCILIATION_SCHEMA;
  generated_at: string;
  baseline_captured_at: string;
  current_captured_at: string;
  missing: { source: MissingSource; id: string; name: string; disposition: OwnerDisposition }[];
  camera_playback: {
    id: string;
    name: string;
    transport_ready_at_review: boolean;
    observed_live_video_by_operator: boolean;
    last_probe_at: string | null;
  }[];
}

export interface ReceiptIdentityReview {
  key: string;
  source: MissingSource;
  id: string;
  name: string;
  previousDisposition: OwnerDisposition;
  presentNow: boolean;
  previouslyRetired: boolean;
}

export interface ReceiptCameraReview {
  id: string;
  name: string;
  previouslyObserved: boolean;
  currentRegistered: boolean;
  readyNow: boolean;
  reason: string;
  newSinceReceipt: boolean;
}

export interface ReceiptReconciliation {
  laterReading: boolean;
  freshReading: boolean;
  identities: ReceiptIdentityReview[];
  cameras: ReceiptCameraReview[];
}

const sourceOptions: MissingSource[] = ["ha_device", "ha_entity", "hub_camera"];

function boundedString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim() || value.length > 256) {
    throw new Error(`Invalid ${label} in field review receipt.`);
  }
  return value;
}

function timestamp(value: unknown, label: string): string {
  const result = boundedString(value, label);
  if (!Number.isFinite(Date.parse(result))) {
    throw new Error(`Invalid ${label} in field review receipt.`);
  }
  return result;
}

/** Accept only the owner-review evidence fields; never retain incidental keys or credentials. */
export function parseFieldReviewReceipt(raw: string): FieldReviewReceipt {
  if (raw.length > 1_000_000) throw new Error("Field review receipt exceeds 1 MB.");
  let document: unknown;
  try { document = JSON.parse(raw); } catch { throw new Error("Field review receipt must be valid JSON."); }
  if (!document || typeof document !== "object") throw new Error("Invalid field review receipt format.");
  const value = document as Record<string, unknown>;
  if (value.schema !== FIELD_RECONCILIATION_SCHEMA) {
    throw new Error("Not a supported Build 108 field review receipt.");
  }
  const generatedAt = timestamp(value.generated_at, "generated timestamp");
  const baselineAt = timestamp(value.baseline_captured_at, "baseline timestamp");
  const currentAt = timestamp(value.current_captured_at, "current timestamp");
  if (Date.parse(baselineAt) > Date.parse(currentAt) || Date.parse(currentAt) > Date.parse(generatedAt)) {
    throw new Error("Field review receipt timestamps are out of order.");
  }
  if (!Array.isArray(value.missing) || value.missing.length > 10_000 ||
    !Array.isArray(value.camera_playback) || value.camera_playback.length > 10_000) {
    throw new Error("Field review receipt has invalid or oversized identity lists.");
  }
  const knownIdentities = new Set<string>();
  const missing = value.missing.map((entry: unknown) => {
    if (!entry || typeof entry !== "object") throw new Error("Invalid missing identity in receipt.");
    const item = entry as Record<string, unknown>;
    const source = item.source;
    if (!sourceOptions.includes(source as MissingSource)) throw new Error("Unknown identity source in receipt.");
    const typedSource = source as MissingSource;
    const id = boundedString(item.id, "missing ID");
    const name = boundedString(item.name, "missing identity name");
    const disposition = item.disposition as OwnerDisposition;
    if (!allowedDispositions(typedSource).includes(disposition)) {
      throw new Error("Invalid owner disposition in receipt.");
    }
    const key = JSON.stringify([typedSource, id]);
    if (knownIdentities.has(key)) throw new Error("Duplicate missing identity in receipt.");
    knownIdentities.add(key);
    return { source: typedSource, id, name, disposition };
  });
  const knownCameras = new Set<string>();
  const cameraPlayback = value.camera_playback.map((entry: unknown) => {
    if (!entry || typeof entry !== "object") throw new Error("Invalid camera entry in receipt.");
    const item = entry as Record<string, unknown>;
    const id = boundedString(item.id, "camera ID");
    const name = boundedString(item.name, "camera name");
    if (knownCameras.has(id)) throw new Error("Duplicate camera identity in receipt.");
    knownCameras.add(id);
    if (typeof item.transport_ready_at_review !== "boolean" ||
      typeof item.observed_live_video_by_operator !== "boolean" ||
      (item.observed_live_video_by_operator && !item.transport_ready_at_review)) {
      throw new Error("Contradictory camera playback claim in receipt.");
    }
    const probeAt = item.last_probe_at === null ? null : timestamp(item.last_probe_at, "camera probe timestamp");
    return {
      id, name,
      transport_ready_at_review: item.transport_ready_at_review,
      observed_live_video_by_operator: item.observed_live_video_by_operator,
      last_probe_at: probeAt,
    };
  });
  return {
    schema: FIELD_RECONCILIATION_SCHEMA,
    generated_at: generatedAt,
    baseline_captured_at: baselineAt,
    current_captured_at: currentAt,
    missing,
    camera_playback: cameraPlayback,
  };
}

export function reconcileFieldReviewReceipt(
  receipt: FieldReviewReceipt,
  current: DeviceCameraSnapshot,
  playback: CameraPlaybackReadiness[],
  now = Date.now(),
): ReceiptReconciliation {
  const sampleAt = Date.parse(current.captured_at);
  const freshReading = Number.isFinite(sampleAt) && sampleAt <= now + 60_000 &&
    now - sampleAt <= 300_000;
  const deviceIds = new Set(current.home_assistant.devices.map((item) => item.id));
  const entityIds = new Set(current.home_assistant.entities.map((item) => item.id));
  const cameraIds = new Set(current.cameras.map((item) => item.id));
  const identities = receipt.missing.map((item) => ({
    key: JSON.stringify([item.source, item.id]),
    ...item,
    previousDisposition: item.disposition,
    presentNow: (item.source === "ha_device" ? deviceIds : item.source === "ha_entity" ? entityIds : cameraIds).has(item.id),
    previouslyRetired: item.disposition === "confirmed_retired",
  }));
  const playbackById = new Map(playback.map((item) => [item.id, item]));
  const earlierPlayback = new Map(receipt.camera_playback.map((item) => [item.id, item]));
  const cameraNames = new Map(current.cameras.map((item) => [item.id, item.name]));
  const cameraReviewIds = new Set([...earlierPlayback.keys(), ...cameraIds]);
  const cameras: ReceiptCameraReview[] = [...cameraReviewIds].map((id) => {
    const earlier = earlierPlayback.get(id);
    const streamNow = playbackById.get(id);
    return {
      id, name: streamNow?.name ?? earlier?.name ?? cameraNames.get(id) ?? id,
      previouslyObserved: earlier?.observed_live_video_by_operator ?? false,
      currentRegistered: cameraIds.has(id),
      readyNow: freshReading && Boolean(streamNow?.ready) && cameraIds.has(id),
      reason: streamNow?.reason ?? "No current stream readiness evidence.",
      newSinceReceipt: !earlier,
    };
  });
  return {
    laterReading: sampleAt > Date.parse(receipt.current_captured_at),
    freshReading,
    identities,
    cameras,
  };
}

export function createOwnerAcceptancePacket(
  receipt: FieldReviewReceipt,
  current: DeviceCameraSnapshot,
  reconciliation: ReceiptReconciliation,
  acceptedIdentities: ReadonlySet<string>,
  observedNow: ReadonlySet<string>,
  generatedAt = new Date().toISOString(),
) {
  const identities = reconciliation.identities.map((item) => ({
    source: item.source, id: item.id, name: item.name,
    prior_disposition: item.previousDisposition,
    present_in_new_registry: item.presentNow,
    operator_reviewed_current_state: reconciliation.laterReading && reconciliation.freshReading &&
      (item.presentNow || item.previouslyRetired) && acceptedIdentities.has(item.key),
    disposition: item.presentNow ? "reappeared_in_registry" : item.previouslyRetired ? "retired_exception" : "still_absent",
  }));
  const cameras = reconciliation.cameras.map((item) => ({
    id: item.id, name: item.name,
    observed_in_prior_receipt: item.previouslyObserved,
    registered_now: item.currentRegistered,
    healthy_private_stream_now: item.readyNow,
    operator_observed_moving_video_now: reconciliation.laterReading && reconciliation.freshReading &&
      item.readyNow && observedNow.has(item.id),
  }));
  const missingHolds = identities.filter((item) => !item.operator_reviewed_current_state).length;
  const cameraHolds = cameras.filter((item) => !item.operator_observed_moving_video_now).length;
  const allReviewed = reconciliation.laterReading && reconciliation.freshReading &&
    identities.length + cameras.length > 0 &&
    missingHolds === 0 && cameraHolds === 0;
  return {
    schema: OWNER_ACCEPTANCE_SCHEMA,
    generated_at: generatedAt,
    previous_review_at: receipt.generated_at,
    previous_snapshot_at: receipt.current_captured_at,
    new_snapshot_at: current.captured_at,
    evidence_scope: "Human observations only, not device restoration, video recording, independent audit or deployment verification.",
    identities,
    camera_playback: cameras,
    summary: {
      previous_missing_identities: identities.length,
      reappeared_in_registry: identities.filter((item) => item.present_in_new_registry).length,
      retired_exceptions: identities.filter((item) => item.disposition === "retired_exception").length,
      identity_acceptance_holds: missingHolds,
      camera_playback_holds: cameraHolds,
      status: allReviewed ? "owner_attested_only" as const : "follow_up_required" as const,
    },
  };
}
