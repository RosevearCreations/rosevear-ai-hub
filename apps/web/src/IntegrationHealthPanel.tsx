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
          s.available ? "Service status endpoint responded." : "Review on Devices.")),
      getMQTTStatus(controller.signal).then((s) =>
        observation("MQTT", !s.configured ? "not_configured" : s.available ? "online" : "offline",
          s.available ? "Broker connection reported active." : "No active broker connection reported.")),
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
      <h2>Build 067 — Integration health evidence</h2>
      <p>Manual, read-only status requests. Online means the service's status API
        responded; it does not prove every entity, MQTT message, camera stream or
        model operation works. These results are not a remote server repair.</p>
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
