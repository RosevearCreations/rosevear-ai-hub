import { useEffect, useMemo, useState } from "react";

import {
  getHomeAssistantBrowser,
  getHomeAssistantStatus,
  type HomeAssistantBrowserEntity,
  type HomeAssistantBrowserResponse,
  type HomeAssistantStatus,
} from "./api";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; status: HomeAssistantStatus; browser: HomeAssistantBrowserResponse | null }
  | { kind: "error"; message: string };

export function HomeAssistantView() {
  const [loadState, setLoadState] = useState<LoadState>({ kind: "loading" });
  const [search, setSearch] = useState("");
  const [areaId, setAreaId] = useState("");
  const [domain, setDomain] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [stateValue, setStateValue] = useState("");

  async function refresh(signal?: AbortSignal) {
    setLoadState({ kind: "loading" });
    try {
      const status = await getHomeAssistantStatus(signal);
      if (!status.available) {
        setLoadState({ kind: "ready", status, browser: null });
        return;
      }
      const browser = await getHomeAssistantBrowser(signal);
      setLoadState({ kind: "ready", status, browser });
    } catch (caught: unknown) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setLoadState({
        kind: "error",
        message: caught instanceof Error ? caught.message : "Unable to load Home Assistant.",
      });
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, []);

  const browser = loadState.kind === "ready" ? loadState.browser : null;
  const stateOptions = useMemo(
    () =>
      browser
        ? Array.from(new Set(browser.entities.map((entity) => entity.state))).sort((a, b) =>
            a.localeCompare(b),
          )
        : [],
    [browser],
  );

  const visibleEntities = useMemo(() => {
    if (!browser) return [];
    const needle = search.trim().toLowerCase();
    return browser.entities.filter((entity) => {
      if (areaId && entity.area_id !== areaId) return false;
      if (domain && entity.domain !== domain) return false;
      if (deviceId && entity.device_id !== deviceId) return false;
      if (stateValue && entity.state !== stateValue) return false;
      if (!needle) return true;
      return [
        entity.entity_id,
        entity.friendly_name,
        entity.area_name,
        entity.device_name,
        entity.platform,
        entity.state,
      ]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(needle));
    });
  }, [areaId, browser, deviceId, domain, search, stateValue]);

  function clearFilters() {
    setSearch("");
    setAreaId("");
    setDomain("");
    setDeviceId("");
    setStateValue("");
  }

  return (
    <section className="home-assistant-view">
      <header className="page-header">
        <div>
          <p className="eyebrow">Build 022</p>
          <h1>Entity Browser</h1>
          <p className="lede">
            Browse Home Assistant by area, domain, device, state, and safe attributes.
            Device controls remain disabled until Build 023.
          </p>
        </div>
        <button type="button" onClick={() => void refresh()}>Refresh</button>
      </header>

      {loadState.kind === "loading" ? (
        <section className="panel" role="status">Checking Home Assistant…</section>
      ) : loadState.kind === "error" ? (
        <p className="auth-error" role="alert">{loadState.message}</p>
      ) : (
        <>
          <section className="dashboard-grid" aria-label="Home Assistant status">
            <article className="panel">
              <h2>Connection</h2>
              <div className="runtime-status" role="status">
                <strong>
                  {loadState.status.available
                    ? "Home Assistant online"
                    : loadState.status.configured
                      ? "Home Assistant unavailable"
                      : "Home Assistant not configured"}
                </strong>
                <span>{loadState.status.message}</span>
              </div>
            </article>
            <article className="panel">
              <h2>Configuration</h2>
              <dl className="ha-meta">
                <div><dt>URL</dt><dd>{loadState.status.base_url ?? "Not configured"}</dd></div>
                <div><dt>Access token</dt><dd>{loadState.status.token_configured ? "Configured" : "Not configured"}</dd></div>
                <div><dt>Entities</dt><dd>{browser?.entity_count ?? 0}</dd></div>
              </dl>
            </article>
          </section>

          {browser ? (
            <>
              <section className="ha-browser-summary" aria-label="Entity browser summary">
                <Summary label="Areas" value={browser.area_count} />
                <Summary label="Devices" value={browser.device_count} />
                <Summary label="Domains" value={browser.domain_count} />
                <Summary label="Entities" value={browser.entity_count} />
              </section>

              <section className="panel ha-filters" aria-label="Entity filters">
                <label>
                  <span>Search</span>
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, entity, area, device, platform…" />
                </label>
                <label>
                  <span>Area</span>
                  <select value={areaId} onChange={(event) => setAreaId(event.target.value)}>
                    <option value="">All areas</option>
                    {browser.areas.map((area) => <option key={area.area_id} value={area.area_id}>{area.name}</option>)}
                  </select>
                </label>
                <label>
                  <span>Domain</span>
                  <select value={domain} onChange={(event) => setDomain(event.target.value)}>
                    <option value="">All domains</option>
                    {browser.domains.map((item) => <option key={item.domain} value={item.domain}>{item.domain} ({item.count})</option>)}
                  </select>
                </label>
                <label>
                  <span>Device</span>
                  <select value={deviceId} onChange={(event) => setDeviceId(event.target.value)}>
                    <option value="">All devices</option>
                    {browser.devices.map((device) => <option key={device.device_id} value={device.device_id}>{device.name}</option>)}
                  </select>
                </label>
                <label>
                  <span>State</span>
                  <select value={stateValue} onChange={(event) => setStateValue(event.target.value)}>
                    <option value="">All states</option>
                    {stateOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </label>
                <button type="button" onClick={clearFilters}>Clear filters</button>
              </section>

              <section className="panel ha-inventory">
                <div className="ha-section-heading">
                  <div>
                    <h2>Entity inventory</h2>
                    <p>Registry relationships come from Home Assistant; attributes are bounded and secret-like values are redacted before reaching the browser.</p>
                  </div>
                  <strong>{visibleEntities.length}</strong>
                </div>
                {visibleEntities.length === 0 ? (
                  <p>No entities match the current filters.</p>
                ) : (
                  <div className="ha-entity-list">
                    {visibleEntities.map((entity) => <EntityCard entity={entity} key={entity.entity_id} />)}
                  </div>
                )}
              </section>
            </>
          ) : (
            <section className="panel"><p>{loadState.status.message}</p></section>
          )}
        </>
      )}
    </section>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function EntityCard({ entity }: { entity: HomeAssistantBrowserEntity }) {
  const attributeCount = Object.keys(entity.attributes).length;
  return (
    <article className="ha-entity-card">
      <div><strong>{entity.friendly_name ?? entity.entity_id}</strong><code>{entity.entity_id}</code></div>
      <dl>
        <div><dt>Area</dt><dd>{entity.area_name ?? "Unassigned"}</dd></div>
        <div><dt>Device</dt><dd>{entity.device_name ?? "No device"}</dd></div>
        <div><dt>Domain</dt><dd>{entity.domain}</dd></div>
        <div><dt>State</dt><dd>{entity.state}{entity.unit_of_measurement ? " " + entity.unit_of_measurement : ""}</dd></div>
        <div><dt>Platform</dt><dd>{entity.platform ?? "—"}</dd></div>
        <div><dt>Device class</dt><dd>{entity.device_class ?? "—"}</dd></div>
        <div><dt>Last updated</dt><dd>{entity.last_updated ? new Date(entity.last_updated).toLocaleString() : "—"}</dd></div>
      </dl>
      <details><summary>Attributes ({attributeCount})</summary><pre>{JSON.stringify(entity.attributes, null, 2)}</pre></details>
    </article>
  );
}
