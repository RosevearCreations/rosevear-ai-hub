import { useCallback, useEffect, useRef, useState } from "react";

import {
  getGo2RTCStatus,
  getHealth,
  getHomeAssistantStatus,
  getMQTTStatus,
  getOllamaStatus,
} from "./api";

export type DiagnosticState = "ready" | "attention" | "optional" | "unknown";
type DiagnosticFilter = "all" | DiagnosticState;
export type ServiceDiagnostic = {
  key: "hub" | "ollama" | "home-assistant" | "mqtt" | "go2rtc";
  name: string;
  state: DiagnosticState;
  detail: string;
  dependency: string;
  section: string | null;
  checks: string[];
};

const safeInstructions: Record<ServiceDiagnostic["key"], Pick<ServiceDiagnostic, "name" | "dependency" | "section" | "checks">> = {
  hub: {
    name: "Hub API",
    dependency: "The local API is required for authenticated Hub features.",
    section: null,
    checks: [
      "On the Windows Hub computer, open http://127.0.0.1:8765/health and verify status ok.",
      "In PowerShell from the repository folder, run .\\scripts\\hub-recovery.ps1 -CheckOnly. This writes an inspection log, but does not launch services.",
      "Read logs\\hub-recovery.log and the existing Rosevear AI Hub Recovery task history. Inspect the process occupying port 8765 before any manual start.",
    ],
  },
  ollama: {
    name: "Ollama",
    dependency: "Optional for Hub navigation; required for local AI chat and embeddings.",
    section: "Chat",
    checks: [
      "On the Windows Hub computer, run ollama list and verify at least one installed model.",
      "Check http://127.0.0.1:11434/api/version locally. If the port is already occupied, identify its owning process before attempting to start Ollama.",
      "Inspect the Ollama application's local logs/status. Keep its API bound to loopback; do not download a model automatically.",
    ],
  },
  "home-assistant": {
    name: "Home Assistant",
    dependency: "Optional for chat and knowledge; required for Home Assistant devices.",
    section: "Devices",
    checks: [
      "Confirm the existing Home Assistant VirtualBox VM is running and its own interface is reachable on the private LAN.",
      "Check HOME_ASSISTANT_URL and the token through the existing Hub settings/Secrets workflow; never paste tokens into diagnostics or logs.",
      "Review Home Assistant's own logs. Do not restart the VM or execute device controls from this panel.",
    ],
  },
  mqtt: {
    name: "MQTT",
    dependency: "Optional for Hub core; required for configured broker subscriptions and MQTT automations.",
    section: "MQTT",
    checks: [
      "Verify that the existing Mosquitto broker/add-on is running in Home Assistant.",
      "Review MQTT_HOST, MQTT_USERNAME, MQTT password and MQTT_ALLOWED_TOPICS in local configuration or protected Secrets.",
      "Inspect broker logs and connection status without publishing test commands, changing retained messages or creating another broker.",
    ],
  },
  go2rtc: {
    name: "go2rtc",
    dependency: "Optional for Hub core; needed for configured live RTSP camera views.",
    section: "Cameras",
    checks: [
      "On the Windows Hub computer, check http://127.0.0.1:1984/api and read logs\\hub-recovery.log.",
      "Check the listener on port 1984 before any manual launch. If it belongs to another or unhealthy process, investigate instead of starting a duplicate.",
      "Verify tools\\go2rtc\\go2rtc.exe and local data\\go2rtc\\go2rtc.yaml. Only after confirming port ownership, use scripts\\start-go2rtc.ps1 as described in the Build 041 runbook.",
      "Check real camera streams separately. An online go2rtc API does not prove a camera feed is configured or playing.",
    ],
  },
};

const descriptions: Record<DiagnosticState, string> = {
  ready: "Available",
  attention: "Needs attention",
  optional: "Not configured",
  unknown: "Not verified",
};

function diagnose(
  key: ServiceDiagnostic["key"],
  outcome: PromiseSettledResult<unknown> | undefined,
): ServiceDiagnostic {
  const base = safeInstructions[key];
  let state: DiagnosticState = "unknown";
  let detail = "The status check could not be verified. No service failure is assumed.";
  // Read ONLY known booleans/counts. Never return raw API messages, URL, host,
  // response bodies, exceptions, credentials or internal connection details.
  if (outcome?.status === "fulfilled" && outcome.value && typeof outcome.value === "object") {
    const value = outcome.value as Record<string, unknown>;
    if (key === "hub") {
      if (value.status === "ok") {
        state = "ready";
        detail = "Hub API health endpoint responded.";
      }
    } else if (key === "ollama") {
      if (typeof value.available === "boolean") {
        state = value.available ? "ready" : "attention";
        detail = value.available ? "Local AI runtime responded." : "Ollama is not responding.";
        if (value.available && value.model_count === 0) {
          state = "attention";
          detail = "Runtime responded, but no local models are installed.";
        }
      }
    } else if (key === "go2rtc") {
      if (typeof value.configured === "boolean" && typeof value.online === "boolean") {
        state = !value.configured ? "optional" : value.online ? "ready" : "attention";
        detail = !value.configured ? "Camera relay is optional and not configured."
          : value.online ? "Camera relay API responded; stream playback not verified."
            : "Configured camera relay is unavailable.";
        if (value.online && (value.local_api_only !== true || value.local_rtsp_only !== true)) {
          state = "attention";
          detail = "Review camera relay listener exposure before proceeding.";
        }
      }
    } else if (typeof value.configured === "boolean" && typeof value.available === "boolean") {
      state = !value.configured ? "optional" : value.available ? "ready" : "attention";
      detail = !value.configured ? "Optional integration has not been configured."
        : value.available ? "Configured integration is connected."
          : "Configured integration is not responding.";
    }
  }
  return { key, ...base, state, detail };
}

export function summarizeServiceDiagnostics(
  outcomes: PromiseSettledResult<unknown>[],
): ServiceDiagnostic[] {
  const keys: ServiceDiagnostic["key"][] = ["hub", "ollama", "home-assistant", "mqtt", "go2rtc"];
  return keys.map((key, index) => diagnose(key, outcomes[index]));
}

/** Compare only allowlisted classifications, never raw endpoint payloads or secrets. */
export function compareDiagnosticSnapshots(previous: ServiceDiagnostic[], current: ServiceDiagnostic[]) {
  return current.map(service => {
    const before = previous.find(item => item.key === service.key);
    return { key: service.key, name: service.name, before: before?.state ?? "unknown",
      after: service.state, change: !before ? "new" : before.state === service.state ? "unchanged" : "changed" };
  });
}

/** Read-only, on-demand status. No repair operation or background polling. */
export function LocalDiagnosticsPanel({
  onNavigate,
}: {
  onNavigate: (section: string) => void;
}) {
  const [snapshot, setSnapshot] = useState<ServiceDiagnostic[] | null>(null);
  const [previousSnapshot, setPreviousSnapshot] = useState<ServiceDiagnostic[] | null>(null);
  const [filter, setFilter] = useState<DiagnosticFilter>("all");
  const [sampledAt, setSampledAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const request = useRef<AbortController | null>(null);
  const latestSnapshot = useRef<ServiceDiagnostic[] | null>(null);

  const refresh = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    try {
      const outcomes = await Promise.allSettled([
        getHealth(controller.signal),
        getOllamaStatus(controller.signal),
        getHomeAssistantStatus(controller.signal),
        getMQTTStatus(controller.signal),
        getGo2RTCStatus(controller.signal),
      ]);
      if (!controller.signal.aborted) {
        setPreviousSnapshot(latestSnapshot.current);
        const nextSnapshot = summarizeServiceDiagnostics(outcomes);
        latestSnapshot.current = nextSnapshot;
        setSnapshot(nextSnapshot);
        setSampledAt(new Date());
      }
    } finally {
      if (request.current === controller) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => request.current?.abort();
  }, [refresh]);

  const visible = snapshot?.filter(service => filter === "all" || service.state === filter) ?? [];
  const attention = snapshot?.filter(service => service.state === "attention") ?? [];
  const unknown = snapshot?.filter(service => service.state === "unknown") ?? [];
  const firstFollowup = attention[0] ?? unknown[0] ?? null;
  const comparison = snapshot && previousSnapshot ? compareDiagnosticSnapshots(previousSnapshot, snapshot) : null;
  const changedServices = comparison?.filter(item => item.change === "changed") ?? [];
  const filterOptions: { id: DiagnosticFilter; label: string }[] = [
    { id: "all", label: "All readings" }, { id: "attention", label: "Needs attention" },
    { id: "unknown", label: "Not verified" }, { id: "ready", label: "Available" },
    { id: "optional", label: "Not configured" },
  ];

  return (
    <section className="panel local-diagnostics" aria-label="Local service diagnostics">
      <div className="operations-toolbar">
        <div>
          <h2>Local service diagnostics</h2>
          <p>Hub, Ollama, Home Assistant, MQTT and go2rtc. Status only — no automatic repairs.</p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading}>
          {loading ? "Checking…" : "Refresh diagnostics"}
        </button>
      </div>
      <p className="operations-timestamp" aria-live="polite">
        {sampledAt ? `Last checked ${sampledAt.toLocaleString()}` : "No completed check yet."}
        {loading ? " Checking services…" : ""}
      </p>
      <p>Checks read existing endpoints. Unavailable or permission-denied results are marked
        Not verified, not presumed offline. Status is not a camera playback or physical-device test.</p>
      {snapshot && (
        <>
          <section className="hub-diagnostics-guide" aria-label="Guided service diagnostics readback">
            <h3>What needs our attention?</h3>
            <p aria-live="polite"><strong>{attention.length} needs attention</strong> · {unknown.length} not verified · {snapshot.length} service readings from the most recent check.</p>
            <p>{firstFollowup
              ? <><strong>Start with {firstFollowup.name}:</strong> {firstFollowup.detail} Open its guided checks below; this is a suggested manual inspection, not an automatic diagnosis or repair.</>
              : "No service is currently classified as needing attention or unverified by this API sample. Devices, cameras and Windows services still require separate real checks."}</p>
            <div className="hub-diagnostics-filters" role="group" aria-label="Filter diagnostic service readings">
              {filterOptions.map(option => <button type="button" key={option.id}
                aria-pressed={filter === option.id} onClick={() => setFilter(option.id)}>
                {option.label} ({option.id === "all" ? snapshot.length : snapshot.filter(service => service.state === option.id).length})
              </button>)}
            </div>
          </section>
          <section className="hub-diagnostics-guide" aria-label="Diagnostic source snapshot comparison">
            <h3>Compare our last two checks</h3>
            <p>Only the two most recent readings in this open view are compared. Refresh to take another sample; reloading this page clears the comparison. A changed API reading is not proof of a Windows repair or physical device test.</p>
            {comparison ? <>
              <p aria-live="polite">{comparison.filter(item => item.change === "changed").length} changed · {comparison.filter(item => item.change === "unchanged").length} unchanged.</p>
              {changedServices.length > 0 && <p><strong>Manual follow-up:</strong> A changed API classification needs confirmation on the real Hub. Select a service below to review its safe manual checks; no repair is triggered.</p>}
              <ul>{comparison.map(item => <li key={item.key}>
                <a href={`#hub-diagnostic-${item.key}`} onClick={() => setFilter("all")}>Review {item.name} manual checks</a>: {descriptions[item.before]} → {descriptions[item.after]} ({item.change})
              </li>)}</ul>
            </> : <p>No earlier snapshot to compare. Choose Refresh diagnostics to take a second reading.</p>}
          </section>
          <div className="local-diagnostics-grid">
          {visible.map((service) => (
            <article id={`hub-diagnostic-${service.key}`} className="local-diagnostic-card" key={service.key}>
              <div className="operations-toolbar">
                <h3>{service.name}</h3>
                <strong className={`operations-state operations-${service.state}`}>
                  {descriptions[service.state]}
                </strong>
              </div>
              <p role="status">{service.detail}</p>
              <p><small>{service.dependency}</small></p>
              <details>
                <summary>Guided checks and log locations</summary>
                <ol>{service.checks.map((check) => <li key={check}>{check}</li>)}</ol>
                {service.section && (
                  <button type="button" onClick={() => onNavigate(service.section!)}>
                    Open {service.section}
                  </button>
                )}
              </details>
            </article>
          ))}
          {visible.length === 0 && <p role="status">No services in this category for the last sampled result. Choose All readings to return.</p>}
          </div>
        </>
      )}
      <small>Windows commands are instructions to run manually on the Hub computer, not
        buttons. Confirm a port's owner before starting any service. Never copy passwords,
        camera URLs or private logs into GitHub.</small>
    </section>
  );
}
