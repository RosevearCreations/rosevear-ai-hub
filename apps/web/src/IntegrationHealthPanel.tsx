import { useEffect, useRef, useState } from "react";
import {
  getCameraDashboard,
  getFrigateStatus,
  getGo2RTCStatus,
  getHomeAssistantStatus,
  getMQTTStatus,
  getOllamaStatus,
} from "./api";

type IntegrationState = "online" | "offline" | "not_configured" | "unavailable";
type Observation = {
  name: string;
  state: IntegrationState;
  detail: string;
  nextStep: string;
};
const guidance: Record<string, string> = {
  "Home Assistant": "Check VM power and the saved Hub URL/token on the Devices page.",
  MQTT: "Check broker/add-on, network port and credentials on the MQTT page.",
  Ollama: "Check the local Ollama process and installed model on the AI page.",
  Frigate: "Check the Frigate service and its camera/event configuration.",
  go2rtc: "Check local transport and register expected cameras before reconciling streams.",
};
const NAMES = ["Home Assistant", "MQTT", "Ollama", "Frigate", "go2rtc"];

// Build 068: only allow known recovery codes and fixed human-readable guidance.
// Never display backend error messages, private URLs, tokens, broker hosts,
// topic names, or unknown exception strings in this cross-service snapshot.
const haRecovery: Record<string, string> = {
  connected: "Authenticated Home Assistant REST health succeeded. Check entity visibility separately.",
  not_configured: "Check whether the Hub URL and access token are configured in the protected setup.",
  invalid_configuration: "The saved Home Assistant URL format needs correction.",
  timeout: "The Home Assistant request timed out. Check the VirtualBox VM and its responsiveness.",
  authentication_rejected: "Home Assistant rejected the token. Check its validity privately in Secrets.",
  unreachable: "Hub cannot reach the Home Assistant service. Check the VM network and listening port.",
  unexpected_response: "Home Assistant replied unexpectedly. Review its local logs and REST service state.",
  unknown: "The service status needs a separate operator review.",
};
const mqttRecovery: Record<string, string> = {
  connected: "Broker authenticated. Confirm expected subscriptions and messages separately.",
  not_configured: "Review broker host, TLS, account and allowed topic configuration privately.",
  starting_or_reconnecting: "MQTT is connecting or reconnecting. Check the broker/add-on and allow the backoff to proceed.",
  broker_rejected_credentials: "The MQTT broker rejected credentials. Review broker account and password privately.",
  broker_rejected_connection: "The MQTT broker rejected the connection. Check protocol, client ID and broker policy.",
  disconnected_reconnecting: "The MQTT session disconnected; automatic reconnect is active. Check broker stability.",
  unknown: "MQTT is unavailable. Inspect the broker/add-on status and saved connection configuration.",
};
function recoveryDetail(
  reason: string | undefined,
  known: Record<string, string>,
  fallback: string,
): string {
  return reason && Object.prototype.hasOwnProperty.call(known, reason)
    ? known[reason] : fallback;
}
function observation(name: string, state: IntegrationState, detail: string): Observation {
  return { name, state, detail, nextStep: guidance[name] };
}

/** Explicit user refresh; reads existing status APIs only. No writes or hidden retry loop. */
export function IntegrationHealthPanel() {
  const [items, setItems] = useState<Observation[] | null>(null);
  const [checked, setChecked] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function refresh() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    const tasks = [
      getHomeAssistantStatus(controller.signal).then((s) =>
        observation("Home Assistant", !s.configured ? "not_configured" : s.available ? "online" : "offline",
          recoveryDetail(s.recovery_reason, haRecovery,
            s.available ? "Service status endpoint responded." : "Review on Devices."))),
      getMQTTStatus(controller.signal).then((s) =>
        observation("MQTT", !s.configured ? "not_configured" : s.available ? "online" : "offline",
          recoveryDetail(s.recovery_reason, mqttRecovery,
            s.available ? "Broker connection reported active." : "No active broker connection reported."))),
      getOllamaStatus(controller.signal).then((s) =>
        observation("Ollama", s.available ? "online" : "offline",
          s.available ? `${s.model_count} model(s) reported.` : "Local runtime not available.")),
      getFrigateStatus(controller.signal).then((s) =>
        observation("Frigate", !s.configured ? "not_configured" : s.online ? "online" : "offline",
          s.online ? "Service responded." : "Frigate status not online.")),
      Promise.all([getGo2RTCStatus(controller.signal), getCameraDashboard(controller.signal)])
        .then(([s, dashboard]) =>
          observation("go2rtc", !s.configured ? "not_configured" : s.online ? "online" : "offline",
            `${dashboard.total} Hub camera record(s), ${dashboard.healthy} healthy stream(s); ` +
            (s.online ? "transport online." : "transport offline."))),
    ];
    const settled = await Promise.allSettled(tasks);
    if (request.current !== controller) return;
    const entries = settled.map((value, index) =>
      value.status === "fulfilled"
        ? value.value
        : observation(NAMES[index], "unavailable", "Status request did not complete."));
    setItems(entries);
    setChecked(new Date().toLocaleString());
    setBusy(false);
  }
  return (
    <section className="panel" aria-label="Integration health evidence">
      <h2>Build 068 — Integration health & safe recovery readiness</h2>
      <p>Manual, read-only status requests. Online means the service's status API
        responded; it does not prove every entity, MQTT message, camera stream or
        model operation works. HA and MQTT reasons are sanitized and operator-directed.
        These results are not a remote server repair. No restarts or database changes.</p>
      <button type="button" disabled={busy} onClick={() => void refresh()}>
        {busy ? "Checking local integrations…" : "Check integration health"}
      </button>
      {items ? (
        <>
          <p role="status">Checked from this client: {checked}. No changes made.</p>
          <ul aria-label="Live integration status">
            {items.map((item) => (
              <li key={item.name}>
                <strong>{item.name}: {item.state.replaceAll("_", " ")}</strong>
                {" "}{item.detail}{" "}{item.nextStep}
              </li>
            ))}
          </ul>
        </>
      ) : <p>No status requests made in this session.</p>}
    </section>
  );
}
