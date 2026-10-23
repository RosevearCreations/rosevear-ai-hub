import type {
  CameraRecord, Go2RTCStatus, HealthResponse, HomeAssistantBrowserResponse,
  HomeAssistantStatus, HubVersionResponse, MQTTStatus, OllamaStatusResponse,
} from "./api";

export type ServiceKey = "hub" | "homeAssistant" | "mqtt" | "ollama" | "go2rtc";
export type ObservedState = "available" | "unavailable" | "not_configured" | "unverified";
export type RebootSnapshot = {
  schema: "rosevear-hub-reboot-v1";
  capturedAt: string;
  hubVersion: string | null;
  services: Record<ServiceKey, ObservedState>;
  haEntityIds: string[] | null;
  cameraIds: string[] | null;
};

const MAX_ITEMS = 2500;
const entityId = /^[a-z0-9_]+\.[a-z0-9_]+$/;
const cameraId = /^[a-zA-Z0-9:._-]{1,160}$/;
const serviceKeys: ServiceKey[] = ["hub", "homeAssistant", "mqtt", "ollama", "go2rtc"];
const serviceStates: ObservedState[] = ["available", "unavailable", "not_configured", "unverified"];

function identities(values: string[], valid: RegExp): string[] | null {
  if (values.length > MAX_ITEMS || values.some(value => !valid.test(value))) return null;
  return [...new Set(values)].sort();
}

function result<T>(value: PromiseSettledResult<T>): T | null {
  return value.status === "fulfilled" ? value.value : null;
}

/** Strictly allowlisted fields. Never serialize endpoint URLs, tokens, or raw API errors. */
export function buildRebootSnapshot(input: {
  health: PromiseSettledResult<HealthResponse>;
  version: PromiseSettledResult<HubVersionResponse>;
  homeAssistant: PromiseSettledResult<HomeAssistantStatus>;
  mqtt: PromiseSettledResult<MQTTStatus>;
  ollama: PromiseSettledResult<OllamaStatusResponse>;
  go2rtc: PromiseSettledResult<Go2RTCStatus>;
  haInventory: PromiseSettledResult<HomeAssistantBrowserResponse>;
  cameras: PromiseSettledResult<CameraRecord[]>;
}, now = new Date()): RebootSnapshot {
  const hub = result(input.health);
  const version = result(input.version);
  const ha = result(input.homeAssistant);
  const mqtt = result(input.mqtt);
  const ollama = result(input.ollama);
  const relay = result(input.go2rtc);
  const inventory = result(input.haInventory);
  const cameras = result(input.cameras);
  const state = (configured: boolean | undefined, available: boolean | undefined): ObservedState =>
    typeof configured !== "boolean" || typeof available !== "boolean" ? "unverified"
      : !configured ? "not_configured" : available ? "available" : "unavailable";
  return {
    schema: "rosevear-hub-reboot-v1",
    capturedAt: now.toISOString(),
    hubVersion: typeof version?.version === "string" && /^[a-zA-Z0-9.+_-]{1,80}$/.test(version.version)
      ? version.version : null,
    services: {
      hub: hub?.status === "ok" ? "available" : "unverified",
      homeAssistant: state(ha?.configured, ha?.available),
      mqtt: state(mqtt?.configured, mqtt?.available),
      ollama: ollama && typeof ollama.available === "boolean" ? (ollama.available ? "available" : "unavailable") : "unverified",
      go2rtc: relay && typeof relay.configured === "boolean" && typeof relay.online === "boolean"
        ? !relay.configured ? "not_configured"
          : relay.online && relay.local_api_only && relay.local_rtsp_only ? "available" : "unavailable"
        : "unverified",
    },
    haEntityIds: inventory ? identities(inventory.entities.map(entity => entity.entity_id), entityId) : null,
    cameraIds: cameras ? identities(cameras.map(camera => camera.endpoint_uuid), cameraId) : null,
  };
}

export function parseRebootBaseline(raw: string): RebootSnapshot {
  if (raw.length > 250_000) throw new Error("Baseline exceeds the private review size limit.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Baseline is not valid JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Baseline must be a JSON object.");
  const item = value as Record<string, unknown>;
  const keys = Object.keys(item).sort();
  if (JSON.stringify(keys) !== JSON.stringify(["cameraIds", "capturedAt", "haEntityIds", "hubVersion", "schema", "services"])) {
    throw new Error("Unexpected fields in baseline. Never import secrets or URLs.");
  }
  if (item.schema !== "rosevear-hub-reboot-v1" || typeof item.capturedAt !== "string" ||
      !Number.isFinite(Date.parse(item.capturedAt)) || typeof item.services !== "object" ||
      !item.services || Array.isArray(item.services)) throw new Error("Baseline schema or date is invalid.");
  const services = item.services as Record<string, unknown>;
  if (JSON.stringify(Object.keys(services).sort()) !== JSON.stringify([...serviceKeys].sort()) ||
      serviceKeys.some(key => !serviceStates.includes(services[key] as ObservedState))) {
    throw new Error("Baseline service fields are invalid.");
  }
  if (item.hubVersion !== null && (typeof item.hubVersion !== "string" || !/^[a-zA-Z0-9.+_-]{1,80}$/.test(item.hubVersion))) {
    throw new Error("Baseline version is invalid.");
  }
  for (const [field, pattern] of [["haEntityIds", entityId], ["cameraIds", cameraId]] as const) {
    const list = item[field];
    if (list !== null && (!Array.isArray(list) || list.length > MAX_ITEMS ||
      list.some(entry => typeof entry !== "string" || !pattern.test(entry)) ||
      new Set(list).size !== list.length)) throw new Error("Baseline identities are invalid.");
  }
  return item as RebootSnapshot;
}

export type InventoryDiff = { state: "unverified" | "matched" | "changed"; missing: string[]; added: string[] };

export function compareIds(before: string[] | null, after: string[] | null): InventoryDiff {
  if (!before || !after) return { state: "unverified", missing: [], added: [] };
  const previous = new Set(before);
  const current = new Set(after);
  const missing = before.filter(id => !current.has(id));
  const added = after.filter(id => !previous.has(id));
  return { state: missing.length || added.length ? "changed" : "matched", missing, added };
}

export function assessRebootContinuity(before: RebootSnapshot | null, after: RebootSnapshot | null) {
  const ha = compareIds(before?.haEntityIds ?? null, after?.haEntityIds ?? null);
  const cameras = compareIds(before?.cameraIds ?? null, after?.cameraIds ?? null);
  const services = serviceKeys.filter(key => before?.services[key] !== after?.services[key] || after?.services[key] !== "available");
  const orderVerified = Boolean(before && after && Date.parse(after.capturedAt) > Date.parse(before.capturedAt));
  const versionVerified = Boolean(before?.hubVersion && before.hubVersion === after?.hubVersion);
  const devicesObserved = Boolean(before?.haEntityIds?.length && before?.cameraIds?.length);
  const complete = Boolean(orderVerified && versionVerified && devicesObserved && ha.state === "matched" && cameras.state === "matched" && services.length === 0);
  return { ha, cameras, services, orderVerified, versionVerified, devicesObserved, complete };
}
