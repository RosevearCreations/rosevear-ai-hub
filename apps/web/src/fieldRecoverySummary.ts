import type {
  CameraDashboard, CameraRecord, Go2RTCStatus, HomeAssistantBrowserResponse,
  HomeAssistantStatus, MQTTStatus,
} from "./api";
import { closureKey, type ClosureLedger, type FollowUpWorklist } from "./deviceRecoveryClosure";
import { compareClosureHistory } from "./deviceRecoveryDrift";

export type NextOwner = "unassigned" | "household_owner" | "workshop_operator" | "camera_operator";
export type OwnerObservation = { owner: NextOwner; verifiedNow: boolean };
export type FieldSnapshot = {
  capturedAt: string;
  haOnline: boolean;
  mqttOnline: boolean;
  privateCameraRelay: boolean;
  devices: { id: string; ready: boolean }[] | null;
  entities: { id: string; ready: boolean }[] | null;
  cameras: { id: string; ready: boolean }[] | null;
};

export type FieldAssessment = ReturnType<typeof assessFieldRecovery>;
const safeId = /^[A-Za-z0-9:._-]{1,256}$/;
const owners: NextOwner[] = ["unassigned", "household_owner", "workshop_operator", "camera_operator"];
const states = ["unavailable", "unknown"];
const maxItems = 5000;

function allowlistIds<T extends { id: string }>(entries: T[]): T[] | null {
  if (entries.length > maxItems || entries.some(entry => typeof entry.id !== "string" || !safeId.test(entry.id))) return null;
  const seen = new Set<string>();
  for (const item of entries) {
    if (seen.has(item.id)) return null;
    seen.add(item.id);
  }
  return entries.sort((a, b) => a.id.localeCompare(b.id));
}

const result = <T,>(value: PromiseSettledResult<T>): T | null => value.status === "fulfilled" ? value.value : null;

/** No secrets, URLs, hostnames, browser attributes, logs, MQTT topics or stream configuration can enter this snapshot. */
export function buildFieldSnapshot(input: {
  homeAssistant: PromiseSettledResult<HomeAssistantStatus>;
  mqtt: PromiseSettledResult<MQTTStatus>;
  browser: PromiseSettledResult<HomeAssistantBrowserResponse>;
  cameras: PromiseSettledResult<CameraRecord[]>;
  dashboard: PromiseSettledResult<CameraDashboard>;
  go2rtc: PromiseSettledResult<Go2RTCStatus>;
}, now = new Date()): FieldSnapshot {
  const ha = result(input.homeAssistant);
  const mqtt = result(input.mqtt);
  const browser = result(input.browser);
  const registry = result(input.cameras);
  const dashboard = result(input.dashboard);
  const relay = result(input.go2rtc);
  const haOnline = ha?.configured === true && ha.available === true;
  const mqttOnline = mqtt?.configured === true && mqtt.available === true;
  const privateCameraRelay = relay?.configured === true && relay.online === true &&
    relay.local_api_only === true && relay.local_rtsp_only === true;

  let devices: FieldSnapshot["devices"] = null;
  let entities: FieldSnapshot["entities"] = null;
  if (haOnline && browser && Array.isArray(browser.devices) && Array.isArray(browser.entities)) {
    entities = allowlistIds(browser.entities.map(entity => ({
      id: entity.entity_id,
      ready: !states.includes(entity.state),
    })));
    devices = allowlistIds(browser.devices.map(device => {
      const linked = browser.entities.filter(entity => entity.device_id === device.device_id);
      return { id: device.device_id, ready: linked.length > 0 && linked.some(entity => !states.includes(entity.state)) };
    }));
  }

  let cameras: FieldSnapshot["cameras"] = null;
  if (registry && dashboard && Array.isArray(registry) && Array.isArray(dashboard.cameras)) {
    cameras = allowlistIds(registry.map(camera => {
      const health = dashboard.cameras.find(item => item.camera_id === camera.id);
      const probeAt = Date.parse(health?.last_probe_at ?? "");
      const fresh = Number.isFinite(probeAt) && probeAt <= now.getTime() + 30_000 && now.getTime() - probeAt <= 300_000;
      return {
        id: camera.endpoint_uuid,
        ready: Boolean(privateCameraRelay && camera.enabled && camera.stream?.enabled && camera.stream.encrypted &&
          health?.enabled && health.configured && health.health === "healthy" && fresh &&
          health.stream_name === camera.stream.stream_name && health.source_host === camera.stream.source_host),
      };
    }));
  }
  return { capturedAt: now.toISOString(), haOnline, mqttOnline, privateCameraRelay, devices, entities, cameras };
}

const nextSteps = {
  ha_integration: "Household owner: inspect the existing Home Assistant integration and device/network; do not enroll blindly.",
  ha_owner_check: "Household/workshop operator: use Devices and confirm the real device function; record fresh results.",
  camera_registration: "Camera operator: review exact ONVIF identity and registration candidate before any approved change.",
  camera_stream: "Camera operator: inspect private go2rtc and the bounded current stream probe; keep streams private.",
  camera_playback: "Camera operator: watch actual moving video in the Build 116 supervised private viewer.",
};

/** Reject secret-like or network-looking identity values before a private owner packet can be assembled. */
export function validateFieldWorklist(worklist: FollowUpWorklist): FollowUpWorklist {
  if (worklist.follow_ups.some(item => !safeId.test(item.id))) {
    throw new Error("Field summary identity IDs must be bounded exact registry IDs; URLs and credentials are not accepted.");
  }
  return worklist;
}

export function assessFieldRecovery(
  worklist: FollowUpWorklist,
  ledger: ClosureLedger,
  current: FieldSnapshot | null,
  observations: Readonly<Record<string, OwnerObservation>>,
  now = Date.now(),
) {
  const historical = compareClosureHistory(worklist, ledger);
  const time = Date.parse(current?.capturedAt ?? "");
  const later = Number.isFinite(time) && time > Date.parse(ledger.generated_at) && time > Date.parse(historical.latest_review_at);
  const fresh = Number.isFinite(time) && time <= now + 60_000 && now - time <= 300_000;
  const readingsReady = Boolean(later && fresh && current);
  const deviceMap = new Map(current?.devices?.map(item => [item.id, item]));
  const entityMap = new Map(current?.entities?.map(item => [item.id, item]));
  const cameraMap = new Map(current?.cameras?.map(item => [item.id, item]));
  const rows = historical.items.map(item => {
    const key = closureKey(item.source, item.id);
    const inventory = item.source === "ha_device" ? current?.devices : item.source === "ha_entity" ? current?.entities : current?.cameras;
    const matching = (item.source === "ha_device" ? deviceMap : item.source === "ha_entity" ? entityMap : cameraMap).get(item.id);
    const state: "unverified" | "absent" | "attention" | "reported" =
      !readingsReady || !inventory ? "unverified" : !matching ? "absent" : !matching.ready ? "attention" : "reported";
    const observed = observations[key];
    const owner = observed && owners.includes(observed.owner) ? observed.owner : "unassigned";
    const correctRole = item.source === "hub_camera" ? owner === "camera_operator" :
      owner === "household_owner" || owner === "workshop_operator";
    const functionObservedNow = Boolean(readingsReady && state === "reported" && correctRole && observed?.verifiedNow);
    const liveReopened = item.current_status === "owner_attested_closed" && (state === "absent" || state === "attention");
    const unresolved = !functionObservedNow || item.current_status === "open_hold";
    const nextStep = state === "unverified" ? "Assigned operator: recheck a later authenticated, fresh inventory without changing any devices." :
      state === "absent" ? item.source === "hub_camera"
        ? nextSteps.camera_registration : nextSteps.ha_integration :
      state === "attention" ? item.source === "hub_camera"
        ? nextSteps.camera_stream : "Assigned household/workshop operator: inspect the unavailable HA device, integration and network." : nextSteps[item.stage];
    return {
      ...item, key, liveState: state, owner, functionObservedNow, liveReopened,
      unresolved, nextStep,
    };
  });
  const previouslyTrackedCameras = new Set(worklist.follow_ups.filter(item => item.source === "hub_camera").map(item => item.id));
  const untrackedCameras = (current?.cameras ?? []).filter(item => !previouslyTrackedCameras.has(item.id)).map(item => item.id);
  const summary = {
    total: rows.length,
    unresolved: rows.filter(row => row.unresolved).length,
    historical_open: rows.filter(row => row.current_status === "open_hold").length,
    historical_reopened: rows.filter(row => row.drift === "reopened").length,
    live_reopened: rows.filter(row => row.liveReopened).length,
    owner_observed_now: rows.filter(row => row.functionObservedNow).length,
    needs_owner: rows.filter(row => row.unresolved && row.owner === "unassigned").length,
    untracked_cameras: untrackedCameras.length,
  };
  return { rows, summary, untrackedCameras, later, fresh, historical, readyForOwnerReview: readingsReady };
}

/** An exportable owner-authored review only: never an automatic/signed independent field acceptance. */
export function createFieldRecoverySummary(
  worklist: FollowUpWorklist,
  ledger: ClosureLedger,
  assessment: FieldAssessment,
  current: FieldSnapshot,
  now = new Date(),
) {
  if (!assessment.readyForOwnerReview || !assessment.fresh || !assessment.later ||
      !Number.isFinite(now.getTime()) || now.getTime() - Date.parse(current.capturedAt) > 300_000) {
    throw new Error("A later, fresh authenticated registry reading is required to export the private summary.");
  }
  const exact = new Set(worklist.follow_ups.map(item => closureKey(item.source, item.id)));
  if (assessment.rows.length !== exact.size || assessment.rows.some(row => !exact.has(row.key))) {
    throw new Error("The owner summary does not match the source worklist identities.");
  }
  return {
    schema: "rosevear-device-camera-field-summary/v1",
    generated_at: now.toISOString(),
    source_worklist_at: worklist.generated_at,
    source_ledger_at: ledger.generated_at,
    latest_historical_review_at: assessment.historical.latest_review_at,
    current_authenticated_reading_at: current.capturedAt,
    status: "FIELD_ACCEPTANCE_HOLD",
    installed_windows_verified: false,
    independently_signed: false,
    sources: { home_assistant_online: current.haOnline, mqtt_online: current.mqttOnline, private_camera_relay: current.privateCameraRelay },
    summary: assessment.summary,
    identities: assessment.rows.map(row => ({
      source: row.source, id: row.id, historical_status: row.current_status,
      historical_owner_action: row.owner_action, drift: row.drift,
      live_registry_state: row.liveState, newly_reopened_in_live_read: row.liveReopened,
      owner_role_for_next_action: row.owner, owner_reported_function_or_moving_video_now: row.functionObservedNow,
      remains_held_for_independent_field_acceptance: true, next_supervised_step: row.nextStep,
    })),
    untracked_camera_ids: assessment.untrackedCameras,
    notice: "Private owner-authored evidence only. No signed, installed-Windows, real HA function or moving-video acceptance is asserted. Recheck physical equipment independently.",
  };
}
