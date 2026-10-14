import { useEffect, useRef, useState } from "react";
import { getHomeAssistantEntities, getHomeAssistantStatus, getMQTTStatus } from "./api";

type ReadState = "connected" | "disconnected" | "unverified";
type Observation = {
  checkedAt: string;
  ha: ReadState;
  haEntities: number | null;
  mqtt: ReadState;
  mqttSubscriptions: number | null;
  mqttGeneration: number | null;
  mqttLastConnected: string | null;
};

function describeHA(value: Observation): string {
  if (value.ha !== "connected") return value.ha === "unverified"
    ? "API check unverified." : "Home Assistant API unavailable.";
  if (value.haEntities === null) return "API connected; entity read unverified.";
  if (value.haEntities === 0) return "API connected; zero entities visible.";
  return `API connected; ${value.haEntities} entities visible.`;
}

function describeMQTT(value: Observation): string {
  if (value.mqtt !== "connected") return value.mqtt === "unverified"
    ? "Broker check unverified." : "MQTT session disconnected.";
  return `Broker connected; ${value.mqttSubscriptions ?? 0} active subscription(s).`;
}

/** Evidence of a reconnect requires two manual samples. A status poll does not
 * trigger a reconnect, subscribe to a topic or publish any MQTT messages.
 */
export function reconnectConclusion(
  before: Observation, after: Observation,
): string {
  if (after.ha !== "connected" || after.mqtt !== "connected") {
    return "One or both integrations are not verified connected at recheck.";
  }
  if (before.ha !== "connected" || before.mqtt !== "connected") {
    return "At least one integration changed from unavailable/unverified to connected; manual recovery observed.";
  }
  if (
    before.mqttGeneration !== null &&
    after.mqttGeneration !== null &&
    after.mqttGeneration > before.mqttGeneration
  ) {
    return "MQTT callback generation increased between checks: a connection transition was observed.";
  }
  if (
    before.mqttGeneration !== null &&
    after.mqttGeneration !== null &&
    after.mqttGeneration < before.mqttGeneration
  ) {
    return "MQTT counter reset; backend session may have changed. Reconnect not verified.";
  }
  return "Both integrations remained connected at the two checks; no reconnect event verified.";
}

async function takeSnapshot(signal: AbortSignal): Promise<Observation> {
  const [haResult, mqttResult] = await Promise.allSettled([
    getHomeAssistantStatus(signal),
    getMQTTStatus(signal),
  ]);
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  const ha = haResult.status === "fulfilled" ? haResult.value : null;
  const mqtt = mqttResult.status === "fulfilled" ? mqttResult.value : null;
  let haEntities: number | null = null;
  if (ha?.available) {
    try {
      const response = await getHomeAssistantEntities(signal);
      // Counts only; never store or render entity IDs or private attributes.
      haEntities = Number.isSafeInteger(response.count) && response.count >= 0
        ? response.count : null;
    } catch (error) {
      if (signal.aborted) throw error;
    }
  }
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  return {
    checkedAt: new Date().toLocaleString(),
    ha: !ha ? "unverified" : ha.available ? "connected" : "disconnected",
    haEntities,
    mqtt: !mqtt ? "unverified" : mqtt.available ? "connected" : "disconnected",
    mqttSubscriptions: mqtt?.available ? mqtt.subscriptions.length : null,
    mqttGeneration: mqtt && typeof mqtt.connect_generation === "number" &&
      Number.isSafeInteger(mqtt.connect_generation) && mqtt.connect_generation >= 0
      ? mqtt.connect_generation : null,
    mqttLastConnected: mqtt?.last_connected_at ?? null,
  };
}

export function IntegrationAcceptancePanel() {
  const [baseline, setBaseline] = useState<Observation | null>(null);
  const [latest, setLatest] = useState<Observation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function capture(kind: "baseline" | "recheck") {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setError("");
    try {
      const sample = await takeSnapshot(request.signal);
      if (controller.current !== request) return;
      if (kind === "baseline") {
        setBaseline(sample);
        setLatest(null);
      } else {
        setLatest(sample);
      }
    } catch {
      if (controller.current === request && !request.signal.aborted) {
        setError("Check was interrupted. No saved Hub settings or external services were changed.");
      }
    } finally {
      if (controller.current === request) setBusy(false);
    }
  }

  return (
    <section className="panel" aria-label="Build 069 integration acceptance">
      <h2>Build 069 — Connection acceptance & reconnect evidence</h2>
      <p>Two operator-requested, read-only checks. Home Assistant uses authenticated
        API status plus entity count; MQTT uses its current broker session and in-memory
        connection generation. No restart, publish, subscribe, credential read, or timer.</p>
      <button type="button" disabled={busy} onClick={() => void capture("baseline")}>
        {busy ? "Checking…" : "Capture baseline"}
      </button>{" "}
      <button type="button" disabled={busy || !baseline} onClick={() => void capture("recheck")}>
        Recheck connections
      </button>
      {error ? <p role="alert">{error}</p> : null}
      {baseline ? (
        <div>
          <h3>Baseline — {baseline.checkedAt}</h3>
          <p>Home Assistant: {describeHA(baseline)}</p>
          <p>MQTT: {describeMQTT(baseline)}</p>
        </div>
      ) : <p>No baseline captured in this client session.</p>}
      {latest && baseline ? (
        <div role="status">
          <h3>Recheck — {latest.checkedAt}</h3>
          <p>Home Assistant: {describeHA(latest)}</p>
          <p>MQTT: {describeMQTT(latest)}</p>
          <p>{reconnectConclusion(baseline, latest)}</p>
          <p>Result is observational only. A healthy MQTT connection does not prove
            delivery of messages, and visible HA entities do not authorize device control.</p>
        </div>
      ) : null}
    </section>
  );
}
