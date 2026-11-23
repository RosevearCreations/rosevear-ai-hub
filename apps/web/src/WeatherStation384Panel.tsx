import { useCallback, useEffect, useRef, useState } from "react";
import { getWeatherStation384 } from "./api";

type Weather384 = {
  schema: string;
  status: string;
  observedAtMs: number | null;
  ageSeconds: number | null;
  quality: string | null;
  values: Record<string, number | null> | null;
  callsUsedTodayByThisHub: number;
  dailyCallCapThisHub: number;
  recommendedRefreshMinutes: number;
  physicalWeatherStationIndependentlyVerified: false;
  apiKeyExposed: false;
  webCanTriggerRemoteFetch: false;
};

export function trustedWeather384(value: unknown): value is Weather384 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (v.schema !== "rosevear.hub.wu-pws-weather384.v1" ||
      typeof v.status !== "string" ||
      v.physicalWeatherStationIndependentlyVerified !== false ||
      v.apiKeyExposed !== false || v.webCanTriggerRemoteFetch !== false ||
      !Number.isInteger(v.callsUsedTodayByThisHub) ||
      Number(v.callsUsedTodayByThisHub) < 0 ||
      v.dailyCallCapThisHub !== 1000 ||
      v.recommendedRefreshMinutes !== 5 ||
      (v.observedAtMs !== null && typeof v.observedAtMs !== "number") ||
      (v.ageSeconds !== null && typeof v.ageSeconds !== "number") ||
      (v.values !== null && (typeof v.values !== "object" || Array.isArray(v.values))))
    return false;
  return true;
}

function reading(value: number | null | undefined, unit: string): string {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(1) + unit : "Unmeasured";
}

export function WeatherStation384Panel() {
  const [data, setData] = useState<Weather384 | null>(null);
  const [message, setMessage] = useState("Weather Underground PWS not yet enrolled.");
  const pending = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    try {
      const response: unknown = await getWeatherStation384(controller.signal);
      if (pending.current !== controller) return;
      if (!trustedWeather384(response)) {
        setData(null);
        setMessage("HOLD_UNTRUSTED_WEATHER_CACHE");
      } else {
        setData(response);
        setMessage(response.status);
      }
    } catch {
      if (pending.current === controller) {
        setData(null);
        setMessage("HOLD_WEATHER_CACHE_UNAVAILABLE");
      }
    }
  }, []);
  useEffect(() => {
    void refresh();
    return () => pending.current?.abort();
  }, [refresh]);

  const values = data?.values;
  return <section className="panel" aria-label="AcuRite home weather station">
    <div className="shell349-toolbar">
      <div>
        <h2>Home weather · AcuRite 5-in-1</h2>
        <p>Read-only Weather Underground cache, independently managed from the seven apps.</p>
      </div>
      <button type="button" onClick={() => void refresh()}>
        Review cached reading
      </button>
    </div>
    <p role="status">{message}</p>
    <div className="shell349-status-grid">
      <article className="shell349-status">
        <strong>Temperature</strong><p>{reading(values?.temperatureC, " °C")}</p>
      </article>
      <article className="shell349-status">
        <strong>Humidity</strong><p>{reading(values?.humidityPercent, "%")}</p>
      </article>
      <article className="shell349-status">
        <strong>Wind / gust</strong>
        <p>{reading(values?.windKmh, " km/h")} / {reading(values?.windGustKmh, " km/h")}</p>
      </article>
      <article className="shell349-status">
        <strong>Rain today</strong><p>{reading(values?.dailyRainMm, " mm")}</p>
      </article>
      <article className="shell349-status">
        <strong>Barometric pressure</strong><p>{reading(values?.pressureHpa, " hPa")}</p>
      </article>
    </div>
    <small>Last provider observation: {data?.observedAtMs
      ? new Date(data.observedAtMs).toLocaleString() : "Not yet observed"}
      {" · "}Calls by this Hub today: {data?.callsUsedTodayByThisHub ?? 0}/1000.
      Only the original-host supervised CLI can refresh the provider cache.
      Station data is provider-reported, not independent physical safety evidence.</small>
  </section>;
}
