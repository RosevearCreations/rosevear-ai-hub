import type {
  FrigateStatus, Go2RTCStatus, HealthResponse, HomeAssistantStatus, MQTTStatus,
  OllamaStatusResponse, ReleaseObservabilityResponse,
} from "./api";

export type RuntimeKey = "hub" | "home_assistant" | "mqtt" | "ollama" | "go2rtc" | "frigate";
export type RuntimeState = "available" | "unavailable" | "not_configured" | "unverified";
export type WindowsTask = "server" | "hub" | "recovery";
export type WindowsTaskState = "enabled" | "disabled" | "missing" | "unverified";
export type WindowsRunState = "success_recorded" | "failure_recorded" | "never_recorded" | "unverified";
export type BootCorrelation = "after_boot" | "before_boot" | "unverified";

export type WindowsStartupEvidence = {
  schema: "rosevear-hub-windows-startup-v1";
  observedAt: string;
  tasks: Record<WindowsTask, { state: WindowsTaskState; lastRun: WindowsRunState; bootCorrelation: BootCorrelation }>;
};

export type StartupSnapshot = {
  schema: "rosevear-hub-startup-console-v1";
  capturedAt: string;
  runtime: Record<RuntimeKey, RuntimeState>;
  release: { adoption: string; recoveryTask: string } | null;
};

export const runtimeOrder: RuntimeKey[] = ["home_assistant", "mqtt", "ollama", "hub", "go2rtc", "frigate"];
export const runtimeLabels: Record<RuntimeKey, string> = {
  home_assistant: "Home Assistant API / VM-dependent service",
  mqtt: "MQTT broker connection",
  ollama: "Ollama model service",
  hub: "Hub API",
  go2rtc: "Private go2rtc relay",
  frigate: "Private Frigate integration",
};
export const taskLabels: Record<WindowsTask, string> = {
  server: "Rosevear AI Server Startup (original household task)",
  hub: "Rosevear AI Hub Startup (managed task)",
  recovery: "Rosevear AI Hub Recovery (managed task)",
};

export type StartupDependency = {
  id: string; name: string; dependsOn: string; state: RuntimeState;
  source: string; manualCheck: string;
};

/** Dependencies and safely observed API classifications, never Windows process assertions. */
export function startupDependencyReadback(snapshot: StartupSnapshot | null): StartupDependency[] {
  const observed = (key: RuntimeKey): RuntimeState => snapshot?.runtime[key] ?? "unverified";
  return [
    { id: "windows", name: "Windows startup tasks", dependsOn: "Windows sign-in / configured tasks", state: "unverified", source: "Local task report only", manualCheck: "Inspect the existing Rosevear AI Server Startup task and task history; check for duplicate processes. Do not add a second scheduled task." },
    { id: "ha", name: "Home Assistant VM", dependsOn: "Existing VirtualBox VM", state: observed("home_assistant"), source: "Home Assistant API through Hub, not a VM probe", manualCheck: "Check the original VM identity, power state and Home Assistant UI locally; never create a replacement VM from this screen." },
    { id: "mqtt", name: "Mosquitto / MQTT", dependsOn: "Broker and permitted network path (often Home Assistant)", state: observed("mqtt"), source: "Hub MQTT connection response", manualCheck: "Inspect the existing broker and HA MQTT integration logs without publishing, resetting retained topics or exposing credentials." },
    { id: "ollama", name: "Ollama", dependsOn: "Windows local AI runtime", state: observed("ollama"), source: "Hub Ollama API response", manualCheck: "Check the installed Ollama process and model list locally; do not download models or start duplicates automatically." },
    { id: "backend", name: "Hub backend", dependsOn: "Windows process and local API listener", state: observed("hub"), source: "Hub health endpoint", manualCheck: "Inspect the existing Hub task, logs and port 8765 owner; use scripts/hub-recovery.ps1 -CheckOnly for inspection only." },
    { id: "web", name: "Hub web client", dependsOn: "Hub backend and existing web/desktop listener", state: "unverified", source: "Not independently tested by the API snapshot", manualCheck: "On the Windows host, verify the configured web or desktop client and private URL; a visible page does not prove backend startup." },
    { id: "caddy", name: "Caddy private HTTPS", dependsOn: "Existing Caddy configuration and Hub listener", state: "unverified", source: "No direct Caddy process or certificate check", manualCheck: "Inspect Caddy's configured listener, certificate and local service logs; test HTTPS only from an authorized client." },
    { id: "tailscale", name: "Tailscale access", dependsOn: "Existing tailnet identity and private HTTPS route", state: "unverified", source: "No direct Tailscale or remote-client check", manualCheck: "Inspect the already-authorized Tailscale client and signed-in private HTTPS access; do not expose LAN ports or modify access rules." },
  ];
}

const keys: WindowsTask[] = ["server", "hub", "recovery"];
const states: WindowsTaskState[] = ["enabled", "disabled", "missing", "unverified"];
const runs: WindowsRunState[] = ["success_recorded", "failure_recorded", "never_recorded", "unverified"];
const correlations: BootCorrelation[] = ["after_boot", "before_boot", "unverified"];
const requiredChecks = ["task", "vm", "ha", "mqtt", "private", "camera"];

/** An imported, operator-provided report is not authenticated or machine-attested. */
export function parseWindowsStartupEvidence(raw: string, now = new Date()): WindowsStartupEvidence {
  if (raw.length > 10_000) throw new Error("Windows evidence exceeds the 10 KB limit.");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("Windows evidence is not valid JSON."); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Expected a Windows evidence object.");
  const value = parsed as Record<string, unknown>;
  if (!exactKeys(value, ["schema", "observedAt", "tasks"]) || value.schema !== "rosevear-hub-windows-startup-v1" ||
      typeof value.observedAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(value.observedAt)) {
    throw new Error("Windows evidence schema, fields or timestamp is invalid. Do not paste paths or credentials.");
  }
  const observedTime = Date.parse(value.observedAt);
  if (!Number.isFinite(observedTime) || observedTime > now.getTime() + 5 * 60_000 ||
      now.getTime() - observedTime > 24 * 60 * 60_000) {
    throw new Error("Windows evidence is stale or future-dated (maximum age: 24 hours).");
  }
  if (!value.tasks || typeof value.tasks !== "object" || Array.isArray(value.tasks) ||
      !exactKeys(value.tasks as Record<string, unknown>, keys)) throw new Error("Expected exactly three classified Windows tasks.");
  for (const key of keys) {
    const item = (value.tasks as Record<string, unknown>)[key];
    if (!item || typeof item !== "object" || Array.isArray(item) ||
        !exactKeys(item as Record<string, unknown>, ["state", "lastRun", "bootCorrelation"])) throw new Error("Unexpected Windows task fields; secrets and paths are forbidden.");
    const task = item as Record<string, unknown>;
    if (!states.includes(task.state as WindowsTaskState) || !runs.includes(task.lastRun as WindowsRunState) ||
        !correlations.includes(task.bootCorrelation as BootCorrelation) ||
        (task.state === "missing" && (task.lastRun !== "never_recorded" || task.bootCorrelation !== "unverified")) ||
        (task.lastRun !== "success_recorded" && task.bootCorrelation === "after_boot")) throw new Error("Windows task state is invalid.");
  }
  return parsed as WindowsStartupEvidence;
}

function exactKeys(value: Record<string, unknown>, expected: string[]) {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function fulfilled<T>(value: PromiseSettledResult<T>): T | null {
  return value.status === "fulfilled" ? value.value : null;
}

function connection(configured: boolean | undefined, online: boolean | undefined): RuntimeState {
  if (typeof configured !== "boolean" || typeof online !== "boolean") return "unverified";
  return !configured ? "not_configured" : online ? "available" : "unavailable";
}

/** Fixed classifications only: raw network endpoints, errors and credentials are discarded. */
export function buildStartupSnapshot(input: {
  health: PromiseSettledResult<HealthResponse>;
  ha: PromiseSettledResult<HomeAssistantStatus>;
  mqtt: PromiseSettledResult<MQTTStatus>;
  ollama: PromiseSettledResult<OllamaStatusResponse>;
  go2rtc: PromiseSettledResult<Go2RTCStatus>;
  frigate: PromiseSettledResult<FrigateStatus>;
  release: PromiseSettledResult<ReleaseObservabilityResponse>;
}, now = new Date()): StartupSnapshot {
  const hub = fulfilled(input.health);
  const ha = fulfilled(input.ha);
  const mqtt = fulfilled(input.mqtt);
  const ollama = fulfilled(input.ollama);
  const go2rtc = fulfilled(input.go2rtc);
  const frigate = fulfilled(input.frigate);
  const release = fulfilled(input.release);
  return {
    schema: "rosevear-hub-startup-console-v1",
    capturedAt: now.toISOString(),
    runtime: {
      hub: hub?.status === "ok" ? "available" : "unverified",
      home_assistant: connection(ha?.configured, ha?.available),
      mqtt: connection(mqtt?.configured, mqtt?.available),
      ollama: ollama ? (ollama.available ? "available" : "unavailable") : "unverified",
      go2rtc: connection(go2rtc?.configured, go2rtc?.online && go2rtc.local_api_only && go2rtc.local_rtsp_only),
      frigate: connection(frigate?.configured, frigate?.online && frigate.local_only),
    },
    release: release ? { adoption: release.adoption_state, recoveryTask: release.recovery_task } : null,
  };
}

export type StartupAssessment = {
  attention: RuntimeKey[];
  taskAttention: WindowsTask[];
  chronology: "not_compared" | "changed" | "stable" | "invalid";
  ownerReviewReady: boolean;
};

/** Never assert physical or post-reboot acceptance based on API/task self-report. */
export function assessStartup(
  current: StartupSnapshot | null, baseline: StartupSnapshot | null,
  windows: WindowsStartupEvidence | null, checks: string[], now = new Date(),
): StartupAssessment {
  const attention = runtimeOrder.filter(key => !current || current.runtime[key] !== "available");
  const taskAttention = keys.filter(key => !windows || windows.tasks[key].state !== "enabled" ||
    windows.tasks[key].lastRun !== "success_recorded" || windows.tasks[key].bootCorrelation !== "after_boot");
  const chronology = !baseline || !current ? "not_compared"
    : Date.parse(current.capturedAt) <= Date.parse(baseline.capturedAt) ? "invalid"
      : runtimeOrder.some(key => baseline.runtime[key] !== current.runtime[key]) ? "changed" : "stable";
  const fresh = current && (now.getTime() - Date.parse(current.capturedAt) <= 15 * 60_000) &&
    Date.parse(current.capturedAt) <= now.getTime() + 60_000;
  const windowsFresh = windows && (now.getTime() - Date.parse(windows.observedAt) <= 24 * 60 * 60_000) &&
    Date.parse(windows.observedAt) <= now.getTime() + 5 * 60_000;
  return {
    attention, taskAttention, chronology,
    ownerReviewReady: Boolean(fresh && windowsFresh && !attention.length && !taskAttention.length &&
      requiredChecks.every(key => checks.includes(key)) && checks.length === requiredChecks.length &&
      new Set(checks).size === requiredChecks.length && chronology === "stable"),
  };
}

/** Export only allowlisted classifications, never operator text, task paths, hostnames or addresses. */
export function createStartupReceipt(current: StartupSnapshot, baseline: StartupSnapshot | null,
  windows: WindowsStartupEvidence | null, assessment: StartupAssessment, checks: string[]) {
  return {
    schema: "rosevear-hub-startup-operator-review-v1",
    scope: "operator_session_only",
    capturedAt: current.capturedAt,
    baselineCapturedAt: baseline?.capturedAt ?? null,
    runtime: current.runtime,
    taskStates: windows ? Object.fromEntries(keys.map(key => [key, windows.tasks[key]])) : null,
    taskObservedAt: windows?.observedAt ?? null,
    chronology: assessment.chronology,
    manualChecksReported: checks.length,
    ownerReviewReady: assessment.ownerReviewReady,
    installedWindowsAcceptance: "HOLD",
    physicalRecoveryVerified: false,
  };
}
