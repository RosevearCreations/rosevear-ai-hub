import type { CameraRecord, HomeAssistantBrowserResponse } from "./api";

export const RECOVERY_SNAPSHOT_SCHEMA = "rosevear-device-camera-inventory/v1" as const;

export interface InventoryIdentity {
  id: string;
  name: string;
}

export interface DeviceCameraSnapshot {
  schema: typeof RECOVERY_SNAPSHOT_SCHEMA;
  captured_at: string;
  home_assistant: {
    devices: InventoryIdentity[];
    entities: InventoryIdentity[];
  };
  cameras: InventoryIdentity[];
}

export interface InventoryDelta {
  missing: InventoryIdentity[];
  newItems: InventoryIdentity[];
}

export interface RecoveryComparison {
  devices: InventoryDelta;
  entities: InventoryDelta;
  cameras: InventoryDelta;
}

function sorted(items: InventoryIdentity[]): InventoryIdentity[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

export function createRecoverySnapshot(
  browser: HomeAssistantBrowserResponse,
  cameras: CameraRecord[],
  capturedAt = new Date().toISOString(),
): DeviceCameraSnapshot {
  return {
    schema: RECOVERY_SNAPSHOT_SCHEMA,
    captured_at: capturedAt,
    home_assistant: {
      devices: sorted(browser.devices.map((device) => ({
        id: device.device_id,
        name: device.name,
      }))),
      entities: sorted(browser.entities.map((entity) => ({
        id: entity.entity_id,
        name: entity.friendly_name || entity.entity_id,
      }))),
    },
    cameras: sorted(cameras.map((camera) => ({
      id: camera.endpoint_uuid || `hub-camera:${camera.id}`,
      name: camera.display_name,
    }))),
  };
}

function parseIdentities(value: unknown, label: string): InventoryIdentity[] {
  if (!Array.isArray(value) || value.length > 10000) {
    throw new Error(`${label} is not a bounded inventory list.`);
  }
  const seen = new Set<string>();
  return sorted(value.map((item) => {
    if (!item || typeof item !== "object") {
      throw new Error(`${label} has an invalid entry.`);
    }
    const { id, name } = item as Record<string, unknown>;
    if (typeof id !== "string" || !id || id.length > 256 ||
      typeof name !== "string" || !name || name.length > 256 || seen.has(id)) {
      throw new Error(`${label} has an invalid or duplicate identity.`);
    }
    seen.add(id);
    return { id, name };
  }));
}

export function parseRecoverySnapshot(raw: string): DeviceCameraSnapshot {
  if (raw.length > 1_000_000) throw new Error("Inventory file is too large (1 MB maximum).");
  let source: unknown;
  try {
    source = JSON.parse(raw);
  } catch {
    throw new Error("Inventory file must contain valid JSON.");
  }
  if (!source || typeof source !== "object") {
    throw new Error("Inventory file has an invalid format.");
  }
  const record = source as Record<string, unknown>;
  if (record.schema !== RECOVERY_SNAPSHOT_SCHEMA ||
    typeof record.captured_at !== "string" ||
    !Number.isFinite(Date.parse(record.captured_at)) ||
    !record.home_assistant || typeof record.home_assistant !== "object") {
    throw new Error("Inventory file is not a supported Rosevear recovery snapshot.");
  }
  const ha = record.home_assistant as Record<string, unknown>;
  // Only retain allowlisted identity fields. Never import credentials, URLs or attributes.
  return {
    schema: RECOVERY_SNAPSHOT_SCHEMA,
    captured_at: record.captured_at,
    home_assistant: {
      devices: parseIdentities(ha.devices, "Home Assistant devices"),
      entities: parseIdentities(ha.entities, "Home Assistant entities"),
    },
    cameras: parseIdentities(record.cameras, "Camera registry"),
  };
}

function delta(previous: InventoryIdentity[], current: InventoryIdentity[]): InventoryDelta {
  const previousIds = new Set(previous.map((item) => item.id));
  const currentIds = new Set(current.map((item) => item.id));
  return {
    missing: previous.filter((item) => !currentIds.has(item.id)),
    newItems: current.filter((item) => !previousIds.has(item.id)),
  };
}

export function compareRecoverySnapshots(
  previous: DeviceCameraSnapshot,
  current: DeviceCameraSnapshot,
): RecoveryComparison {
  return {
    devices: delta(previous.home_assistant.devices, current.home_assistant.devices),
    entities: delta(previous.home_assistant.entities, current.home_assistant.entities),
    cameras: delta(previous.cameras, current.cameras),
  };
}
