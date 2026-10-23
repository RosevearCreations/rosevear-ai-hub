import type { CameraDiscoveryCandidate, CameraRecord } from "./api";
import { parseRecoverySnapshot, type InventoryIdentity } from "./deviceRecovery";
import { parseRecoveryWorklist } from "./deviceRecoveryClosure";

export const CAMERA_RESTORE_RECEIPT_SCHEMA = "rosevear-camera-bulk-restore-review/v1" as const;

export interface CameraPriorEvidence {
  source: "build107_inventory" | "build110_follow_up";
  sourceAt: string;
  cameras: InventoryIdentity[];
}

export type CameraRestoreStatus =
  | "registered" | "registry_drift" | "endpoint_conflict" | "name_conflict"
  | "prior_name_changed" | "not_in_prior" | "restore_candidate";

export interface CameraRestoreRow {
  candidate: CameraDiscoveryCandidate;
  status: CameraRestoreStatus;
  priorName: string | null;
  reason: string;
}

const unsafe = /(?:\b(?:rtsp|rtsps|https?|mqtt):\/\/|(?:password|passwd|token|secret|api[_-]?key)\s*[:=])/i;
const safe = (value: string) => value.length > 0 && value.length <= 256 && !unsafe.test(value) &&
  !/[\u0000-\u001f\u007f]/.test(value);

/** Import only the allowlisted identity/timestamp fields. An exported approval is never imported. */
export function importCameraPriorEvidence(raw: string): CameraPriorEvidence {
  if (raw.length > 1_000_000) throw new Error("Camera evidence exceeds the 1 MB limit.");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("Camera evidence must be valid JSON."); }
  const schema = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>).schema : null;
  let evidence: CameraPriorEvidence;
  if (schema === "rosevear-device-camera-inventory/v1") {
    const snapshot = parseRecoverySnapshot(raw);
    evidence = { source: "build107_inventory", sourceAt: snapshot.captured_at, cameras: snapshot.cameras };
  } else if (schema === "rosevear-device-camera-recovery-follow-up/v1") {
    const worklist = parseRecoveryWorklist(raw);
    evidence = { source: "build110_follow_up", sourceAt: worklist.current_registry_at,
      cameras: worklist.follow_ups.filter((item) => item.source === "hub_camera").map(({ id, name }) => ({ id, name })) };
  } else {
    throw new Error("Import a Build 107 inventory or Build 110 follow-up worklist.");
  }
  if (!evidence.cameras.length) throw new Error("This receipt contains no camera identities.");
  if (evidence.cameras.length > 1000 || evidence.cameras.some(({ id, name }) => !safe(id) || !safe(name))) {
    throw new Error("Camera identity evidence includes an invalid, sensitive, or oversized value.");
  }
  if (new Set(evidence.cameras.map((item) => item.id)).size !== evidence.cameras.length) {
    throw new Error("Camera evidence contains duplicate identities.");
  }
  if (Date.parse(evidence.sourceAt) > Date.now() + 60_000) {
    throw new Error("Camera evidence timestamp is unexpectedly in the future.");
  }
  return evidence;
}

const normalized = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();
const address = (item: { host: string; port: number }) => `${item.host.toLowerCase()}:${item.port}`;

/** Fail closed on ambiguous stable identities, endpoint collisions and name/model evidence drift. */
export function assessCameraRestore(
  prior: CameraPriorEvidence,
  registry: CameraRecord[],
  discoveries: CameraDiscoveryCandidate[],
): CameraRestoreRow[] {
  const priorById = new Map(prior.cameras.map((item) => [item.id, item]));
  const registeredById = new Map(registry.map((item) => [item.endpoint_uuid, item]));
  const registeredAddresses = new Map<string, CameraRecord[]>();
  const discoveredAddresses = new Map<string, CameraDiscoveryCandidate[]>();
  for (const camera of registry) registeredAddresses.set(address(camera), [...(registeredAddresses.get(address(camera)) ?? []), camera]);
  for (const candidate of discoveries) discoveredAddresses.set(address(candidate), [...(discoveredAddresses.get(address(candidate)) ?? []), candidate]);

  return discoveries.map((candidate) => {
    const priorCamera = priorById.get(candidate.endpoint_uuid);
    const registered = registeredById.get(candidate.endpoint_uuid);
    const sameAddress = registeredAddresses.get(address(candidate)) ?? [];
    const sameDiscoveredAddress = discoveredAddresses.get(address(candidate)) ?? [];
    const sharedName = registry.some((item) => normalized(item.display_name) === normalized(candidate.display_name) && item.endpoint_uuid !== candidate.endpoint_uuid) ||
      discoveries.some((item) => item.endpoint_uuid !== candidate.endpoint_uuid && normalized(item.display_name) === normalized(candidate.display_name));
    let status: CameraRestoreStatus;
    let reason: string;
    if (registered || candidate.registered) {
      status = registered && address(registered) !== address(candidate) ? "registry_drift" : "registered";
      reason = status === "registry_drift" ? "Exact ID exists at a different address. Do not replace its feed." : "Exact ID already registered; no registration needed.";
    } else if (sameAddress.some((item) => item.endpoint_uuid !== candidate.endpoint_uuid) ||
      sameDiscoveredAddress.some((item) => item.endpoint_uuid !== candidate.endpoint_uuid)) {
      status = "endpoint_conflict";
      reason = "Another camera claims this network endpoint. Inspect identity changes manually.";
    } else if (sharedName) {
      status = "name_conflict";
      reason = "Another camera uses this name. Model/name evidence is ambiguous.";
    } else if (!priorCamera) {
      status = "not_in_prior";
      reason = "Not in imported evidence; use individual camera registration after owner verification.";
    } else if (normalized(priorCamera.name) !== normalized(candidate.display_name)) {
      status = "prior_name_changed";
      reason = "Exact ID matches, but the previous camera name differs. Confirm hardware/model manually.";
    } else {
      status = "restore_candidate";
      reason = "Stable endpoint ID and bounded prior name match; operator must still inspect the physical model.";
    }
    return { candidate, status, priorName: priorCamera?.name ?? null, reason };
  });
}

export function createCameraRestoreReceipt(
  prior: CameraPriorEvidence,
  scanAt: string,
  reviewedAt: string,
  selected: string[],
  created: { endpoint_uuid: string; id: number; enabled: boolean; stream: unknown }[],
) {
  if (!selected.length || new Set(selected).size !== selected.length ||
    Date.parse(scanAt) <= Date.parse(prior.sourceAt) || Date.parse(reviewedAt) < Date.parse(scanAt) ||
    created.length !== selected.length ||
    new Set(created.map((row) => row.endpoint_uuid)).size !== created.length ||
    created.some((row) => !selected.includes(row.endpoint_uuid) || row.enabled || row.stream !== null)) {
    throw new Error("Registration response is incomplete or unsafe. Keep field acceptance on HOLD.");
  }
  return {
    schema: CAMERA_RESTORE_RECEIPT_SCHEMA,
    source_type: prior.source,
    source_at: prior.sourceAt,
    discovery_at: scanAt,
    reviewed_at: reviewedAt,
    selected: created.map((row) => ({ endpoint_uuid: row.endpoint_uuid, registry_id: row.id, registered_disabled: true })),
    operator_review: "selected_and_confirmed_hardware_model_in_session",
    field_acceptance: "CAMERA_PLAYBACK_AND_PRIVATE_STREAM_HOLD",
    reversal_guidance: "Review these registry IDs manually; do not remove or switch streams automatically.",
  };
}
