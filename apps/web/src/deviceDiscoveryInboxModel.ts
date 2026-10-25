import type {
  CameraPreviewResult, CameraRecord, DeviceDiscoveryReview, DeviceDiscoverySource,
  DeviceRegistryReviews, HomeAssistantBrowserResponse,
} from "./api";

export type DiscoveryCandidate = {
  key: string;
  source: DeviceDiscoverySource;
  source_id: string;
  name: string;
  room: string;
  state: "discovered" | "observed" | "approved" | "rejected" | "unsupported" | "investigate";
  confidence: "provider_reported" | "network_preview_unverified" | "owner_topic_reference";
  observedAt: string;
  duplicateWarnings: string[];
  canRegisterCamera: boolean;
  registered: boolean;
};

export function discoveryKey(source: DeviceDiscoverySource, id: string): string {
  return `${source}:${id}`;
}

export function isFreshDiscovery(observedAt: string, now = Date.now(), ttlSeconds = 300): boolean {
  const age = now - Date.parse(observedAt);
  return Number.isFinite(age) && age >= -30_000 && age < Math.min(300, ttlSeconds) * 1000;
}

function comparable(value: string): string {
  return value.toLowerCase().normalize("NFKC").replace(/[^a-z0-9]+/g, " ").trim();
}

function safeTitle(value: string | null | undefined, fallback: string): string {
  return value && !/(?:https?|rtsps?|mqtt):\/\/|(?:password|secret|token|api.key)\s*[:=]/i.test(value)
    ? value.slice(0, 100) : fallback;
}

/** Build 140 is a discovery *inbox*, not an aggregate hardware identity resolver. */
export function compileDiscoveryCandidates(input: {
  browser: HomeAssistantBrowserResponse | null;
  registry: DeviceRegistryReviews | null;
  cameras: CameraRecord[] | null;
  cameraPreview: CameraPreviewResult | null;
  reviews: DeviceDiscoveryReview[];
  haObservedAt: string | null;
  mqttObservedAt: string | null;
  cameraObservedAt: string | null;
}): DiscoveryCandidate[] {
  const rows: DiscoveryCandidate[] = [];
  const decisions = new Map(input.reviews.map((review) => [discoveryKey(review.source, review.source_id), review]));
  const push = (source: DeviceDiscoverySource, source_id: string, name: string, room: string,
    state: "discovered" | "observed", confidence: DiscoveryCandidate["confidence"],
    observedAt: string, registered = false, duplicateWarnings: string[] = []) => {
    const key = discoveryKey(source, source_id);
    const review = decisions.get(key);
    rows.push({ key, source, source_id, name: safeTitle(name, source_id), room: safeTitle(room, "Unassigned"),
      state: review?.decision === "approved_for_followup" ? "approved" : review?.decision ?? state,
      confidence, observedAt, duplicateWarnings, registered, canRegisterCamera: false });
  };
  if (input.browser && input.haObservedAt) {
    const areas = new Map(input.browser.areas.map((area) => [area.area_id, area.name]));
    input.browser.devices.slice(0, 400).forEach((device) => {
      if (device.device_id) push("ha_device", device.device_id, device.name || device.device_id,
        areas.get(device.area_id ?? "") ?? "Unassigned", "observed", "provider_reported", input.haObservedAt!);
    });
    input.browser.entities.slice(0, 1000).forEach((entity) => {
      if (entity.entity_id) push("ha_entity", entity.entity_id, entity.friendly_name ?? entity.entity_id,
        entity.area_name ?? areas.get(entity.area_id ?? "") ?? "Unassigned", "observed", "provider_reported", input.haObservedAt!);
    });
  }
  if (input.registry && input.mqttObservedAt) {
    input.registry.annotations.filter((note) => note.source === "mqtt").slice(0, 300).forEach((note) => {
      push("mqtt", note.source_id, note.alias || `MQTT topic ${note.source_id}`,
        note.room_label || "Unassigned", "observed", "owner_topic_reference", input.mqttObservedAt!);
    });
  }
  if (input.cameraPreview && input.cameras && input.cameraObservedAt) {
    const registered = new Set(input.cameras.map((camera) => camera.endpoint_uuid));
    const currentByEndpoint = new Map<string, Set<string>>();
    for (const camera of input.cameras) {
      const endpoint = `${camera.host.toLowerCase()}:${camera.port}`;
      const ids = currentByEndpoint.get(endpoint) ?? new Set<string>();
      ids.add(camera.endpoint_uuid);
      currentByEndpoint.set(endpoint, ids);
    }
    const previewByEndpoint = new Map<string, Set<string>>();
    for (const camera of input.cameraPreview.candidates) {
      const endpoint = `${camera.host.toLowerCase()}:${camera.port}`;
      const ids = previewByEndpoint.get(endpoint) ?? new Set<string>();
      ids.add(camera.endpoint_uuid);
      previewByEndpoint.set(endpoint, ids);
    }
    input.cameraPreview.candidates.slice(0, 100).forEach((camera) => {
      const endpoint = `${camera.host.toLowerCase()}:${camera.port}`;
      const prior = currentByEndpoint.get(endpoint);
      const warnings = [
        ...(camera.registered || registered.has(camera.endpoint_uuid) ? ["Exact camera UUID already registered"] : []),
        ...(prior && (prior.size !== 1 || !prior.has(camera.endpoint_uuid)) ? ["Camera endpoint conflicts with a registered UUID"] : []),
        ...((previewByEndpoint.get(endpoint)?.size ?? 0) > 1 ? ["Multiple preview UUIDs share one camera endpoint"] : []),
      ];
      push("camera_candidate", camera.endpoint_uuid, camera.display_name || "Unidentified camera",
        "Unassigned", camera.registered ? "observed" : "discovered", "network_preview_unverified",
        input.cameraObservedAt!, camera.registered || registered.has(camera.endpoint_uuid), warnings);
    });
  }
  const counts = new Map<string, Set<DeviceDiscoverySource>>();
  rows.forEach((candidate) => {
    const name = comparable(candidate.name);
    if (name.length < 5) return;
    const sources = counts.get(name) ?? new Set<DeviceDiscoverySource>();
    sources.add(candidate.source);
    counts.set(name, sources);
  });
  return rows.map((candidate) => {
    const name = comparable(candidate.name);
    const crossSourceCollision = (counts.get(name)?.size ?? 0) > 1;
    const duplicateWarnings = [...candidate.duplicateWarnings,
      ...(crossSourceCollision ? ["Same display name across sources; not proof of one physical device"] : [])];
    return { ...candidate, duplicateWarnings,
      canRegisterCamera: candidate.source === "camera_candidate" && !candidate.registered &&
        !candidate.duplicateWarnings.length && candidate.state !== "rejected" && candidate.state !== "unsupported" };
  }).sort((a, b) => a.name.localeCompare(b.name) || a.key.localeCompare(b.key));
}
