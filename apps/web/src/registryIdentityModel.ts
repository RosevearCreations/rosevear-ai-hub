import type {
  CameraDashboard, CameraRecord, DeviceRegistryIdentity, DeviceRegistryReviews,
  DeviceRegistrySource, HomeAssistantBrowserResponse, HomeAssistantControlPolicy,
} from "./api";

export type RegistryItem = DeviceRegistryIdentity & {
  key: string;
  name: string;
  room: string;
  sourceRoom: string;
  capabilities: string[];
  state: "observed" | "attention" | "unknown" | "missing" | "unsupported";
  lastObservedAt: string | null;
  safeControlEligible: boolean;
  reviewedRevision: number;
  disposition: "unreviewed" | "reviewed" | "needs_investigation" | "unsupported";
  parentId: string | null;
};

export const registryKey = ({ source, source_id }: DeviceRegistryIdentity): string => `${source}:${source_id}`;

const identity = (source: DeviceRegistrySource, source_id: string): DeviceRegistryIdentity => ({ source, source_id });

function validTimestamp(value: string | null | undefined): string | null {
  return value && !Number.isNaN(Date.parse(value)) ? value : null;
}

function newest(values: (string | null | undefined)[]): string | null {
  return values.map(validTimestamp).filter((value): value is string => !!value)
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;
}

export function compileRegistry(
  browser: HomeAssistantBrowserResponse | null,
  cameras: CameraRecord[] | null,
  cameraHealth: CameraDashboard | null,
  policy: HomeAssistantControlPolicy | null,
  reviews: DeviceRegistryReviews,
): RegistryItem[] {
  const items: RegistryItem[] = [];
  const annotations = new Map(reviews.annotations.map((a) => [registryKey(a), a]));
  const areaNames = new Map(browser?.areas.map((a) => [a.area_id, a.name]) ?? []);
  const permitted = new Set(policy?.candidates.filter((item) => item.allowed && !item.blocked_reason).map((item) => item.entity_id) ?? []);
  const add = (ref: DeviceRegistryIdentity, name: string, sourceRoom: string, capabilities: string[], state: RegistryItem["state"],
    lastObservedAt: string | null, safeControlEligible = false, parentId: string | null = null) => {
    const annotation = annotations.get(registryKey(ref));
    items.push({ ...ref, key: registryKey(ref),
      name: annotation?.alias || name, room: annotation?.room_label || sourceRoom,
      sourceRoom, capabilities, state: annotation?.disposition === "unsupported" ? "unsupported" : state,
      lastObservedAt, safeControlEligible, reviewedRevision: annotation?.revision ?? 0,
      disposition: annotation?.disposition ?? "unreviewed", parentId,
    });
  };

  if (browser) {
    for (const device of browser.devices.slice(0, 400)) {
      if (!device.device_id) continue;
      const entities = browser.entities.filter((entity) => entity.device_id === device.device_id);
      const knownStates = entities.map((e) => e.state);
      add(identity("ha_device", device.device_id), device.name || "Unnamed HA device",
        areaNames.get(device.area_id ?? "") ?? "Unassigned",
        Array.from(new Set(entities.map((e) => e.domain))).slice(0, 10),
        knownStates.length === 0 ? "unknown"
          : knownStates.every((state) => state === "unavailable" || state === "unknown") ? "attention" : "observed",
        newest(entities.map((e) => e.last_updated)), false);
    }
    for (const entity of browser.entities.slice(0, 1000)) {
      if (!entity.entity_id) continue;
      const areaName = entity.area_name || areaNames.get(entity.area_id ?? "") || "Unassigned";
      add(identity("ha_entity", entity.entity_id), entity.friendly_name || entity.entity_id, areaName,
        [entity.domain || "unknown"],
        entity.state === "unavailable" || entity.state === "unknown" ? "attention" : "observed",
        validTimestamp(entity.last_updated), permitted.has(entity.entity_id), entity.device_id);
    }
  }
  if (cameras) {
    for (const camera of cameras.slice(0, 400)) {
      const health = cameraHealth?.cameras?.find((item) => item.camera_id === camera.id);
      const state: RegistryItem["state"] = !camera.enabled ? "attention"
        : !health ? "unknown" : health.health === "healthy" ? "observed" : "attention";
      add(identity("camera", String(camera.id)), camera.display_name || `Camera ${camera.id}`, "Unassigned",
        ["Camera registry", ...(camera.stream?.enabled ? ["Stream configured"] : [])],
        state, validTimestamp(health?.last_probe_at) ?? validTimestamp(camera.last_seen_at));
    }
  }
  // MQTT is deliberately *not* inferred from raw buffered messages, topic subscriptions,
  // or wildcard filters. Only manually reviewed concrete topic references are listed.
  for (const annotation of reviews.annotations.filter((item) => item.source === "mqtt")) {
    add(identity("mqtt", annotation.source_id), `MQTT topic ${annotation.source_id}`, "Unassigned",
      ["Manually reviewed topic reference"], "unknown", null);
  }
  const keys = new Set(items.map((item) => item.key));
  for (const note of reviews.annotations) {
    if (keys.has(registryKey(note))) continue;
    // Missing/unreachable source inventory is a review hold, never deletion.
    const verifiedInventory = note.source.startsWith("ha_") ? !!browser
      : note.source === "camera" ? !!cameras : false;
    add(identity(note.source, note.source_id), note.source_id, "Unassigned", [],
      verifiedInventory ? "missing" : "unknown", null);
  }
  return items.sort((a, b) => a.name.localeCompare(b.name) || a.key.localeCompare(b.key));
}

function comparableName(value: string): string {
  return value.toLowerCase().normalize("NFKC").replace(/[^a-z0-9]+/g, " ").trim();
}

export type RegistrySuggestion = {
  left: DeviceRegistryIdentity;
  right: DeviceRegistryIdentity;
  key: string;
  leftName: string;
  rightName: string;
  decision: "unreviewed" | "possible_match" | "distinct" | "investigate";
  revision: number;
};

export function suggestRegistryMatches(items: RegistryItem[], reviews: DeviceRegistryReviews): RegistrySuggestion[] {
  const suggestions: RegistrySuggestion[] = [];
  const reviewMap = new Map<string, DeviceRegistryReviews["matches"][number]>(reviews.matches.map((review) => {
    const [a, b] = [review.left, review.right].sort((left, right) => registryKey(left).localeCompare(registryKey(right)));
    return [`${registryKey(a)}|${registryKey(b)}`, review] as const;
  }));
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j];
      if (a.source === b.source || (a.source.startsWith("ha_") && b.source.startsWith("ha_"))) continue;
      if (a.state === "missing" || b.state === "missing") continue;
      const name = comparableName(a.name);
      if (name.length < 5 || name !== comparableName(b.name)) continue;
      const [left, right] = [a, b].sort((x, y) => x.key.localeCompare(y.key));
      const key = `${left.key}|${right.key}`;
      const review = reviewMap.get(key);
      suggestions.push({ left: identity(left.source, left.source_id), right: identity(right.source, right.source_id),
        key, leftName: a.name, rightName: b.name,
        decision: review?.decision ?? "unreviewed", revision: review?.revision ?? 0 });
      if (suggestions.length >= 30) return suggestions;
    }
  }
  return suggestions;
}
