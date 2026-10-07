import { useEffect, useMemo, useState } from "react";

import {
  controlHomeAssistantEntity,
  getHomeAssistantBrowser,
  getHomeAssistantControlPolicy,
  getHomeAssistantStatus,
  saveHomeAssistantControlPolicy,
  type AuthUser,
  type HomeAssistantBrowserEntity,
  type HomeAssistantBrowserResponse,
  type HomeAssistantControlAction,
  type HomeAssistantControlPolicy,
  type HomeAssistantStatus,
} from "./api";

type LoadState =
  | { kind: "loading" }
  | {
      kind: "ready";
      status: HomeAssistantStatus;
      browser: HomeAssistantBrowserResponse | null;
      policy: HomeAssistantControlPolicy | null;
    }
  | { kind: "error"; message: string };

export function HomeAssistantView({ currentUser }: { currentUser: AuthUser }) {
  const [loadState, setLoadState] = useState<LoadState>({ kind: "loading" });
  const [search, setSearch] = useState("");
  const [areaId, setAreaId] = useState("");
  const [domain, setDomain] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [stateValue, setStateValue] = useState("");
  const [selectedAllowed, setSelectedAllowed] = useState<string[]>([]);
  const [policyBusy, setPolicyBusy] = useState(false);
  const [controlBusy, setControlBusy] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const canAdminister =
    currentUser.role === "owner" || currentUser.role === "administrator";
  const canControl = currentUser.role !== "read_only";

  async function refresh(signal?: AbortSignal) {
    setLoadState({ kind: "loading" });
    try {
      const status = await getHomeAssistantStatus(signal);
      if (!status.available) {
        setLoadState({ kind: "ready", status, browser: null, policy: null });
        return;
      }
      const [browser, policy] = await Promise.all([
        getHomeAssistantBrowser(signal),
        getHomeAssistantControlPolicy(signal),
      ]);
      setSelectedAllowed(policy.allowed_entity_ids);
      setLoadState({ kind: "ready", status, browser, policy });
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
  const policy = loadState.kind === "ready" ? loadState.policy : null;
  const allowedSet = useMemo(
    () => new Set(policy?.allowed_entity_ids ?? []),
    [policy],
  );

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

  function toggleAllowed(entityId: string) {
    setSelectedAllowed((current) =>
      current.includes(entityId)
        ? current.filter((value) => value !== entityId)
        : [...current, entityId].sort(),
    );
  }

  async function savePolicy() {
    setPolicyBusy(true);
    setActionMessage("");
    try {
      await saveHomeAssistantControlPolicy(selectedAllowed);
      setActionMessage("Safe-control allow list saved.");
      await refresh();
    } catch (caught: unknown) {
      setActionMessage(
        caught instanceof Error ? caught.message : "Unable to save safe-control allow list.",
      );
    } finally {
      setPolicyBusy(false);
    }
  }

  async function control(entityId: string, action: HomeAssistantControlAction) {
    setControlBusy(entityId);
    setActionMessage("");
    try {
      const result = await controlHomeAssistantEntity(entityId, action);
      setActionMessage(
        result.accepted
          ? `${entityId}: ${action} accepted by Home Assistant.`
          : `${entityId}: action was not accepted.`,
      );
      await refresh();
    } catch (caught: unknown) {
      setActionMessage(
        caught instanceof Error ? caught.message : "Home Assistant control failed.",
      );
    } finally {
      setControlBusy("");
    }
  }

  return (
    <section className="home-assistant-view">
      <header className="page-header">
        <div>
          <p className="eyebrow">Build 023</p>
          <h1>Safe Device Controls</h1>
          <p className="lede">
            Browse Home Assistant and operate only explicitly allow-listed low-risk lights,
            switches, and non-safety scenes. Every control is audited.
          </p>
        </div>
        <button type="button" onClick={() => void refresh()}>Refresh</button>
      </header>

      {actionMessage ? <p className="runtime-status" role="status">{actionMessage}</p> : null}

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
                <div><dt>Allow-listed controls</dt><dd>{policy?.allowed_entity_ids.length ?? 0}</dd></div>
              </dl>
            </article>
          </section>

          {browser && policy ? (
            <>
              <section className="ha-browser-summary" aria-label="Entity browser summary">
                <Summary label="Areas" value={browser.area_count} />
                <Summary label="Devices" value={browser.device_count} />
                <Summary label="Domains" value={browser.domain_count} />
                <Summary label="Entities" value={browser.entity_count} />
              </section>

              {canAdminister ? (
                <section className="panel ha-control-policy">
                  <div className="ha-section-heading">
                    <div>
                      <h2>Safe-control allow list</h2>
                      <p>
                        Owner/Admin only. Select only ordinary household lights, switches,
                        and scenes that cannot unlock, disable safety systems, or operate
                        hazardous equipment. This administration path is not exposed as an AI tool.
                      </p>
                    </div>
                    <strong>{selectedAllowed.length}</strong>
                  </div>
                  <div className="ha-policy-list">
                    {policy.candidates.map((candidate) => (
                      <label key={candidate.entity_id} className="ha-policy-row">
                        <input
                          type="checkbox"
                          checked={selectedAllowed.includes(candidate.entity_id)}
                          disabled={Boolean(candidate.blocked_reason) || policyBusy}
                          onChange={() => toggleAllowed(candidate.entity_id)}
                        />
                        <span>
                          <strong>{candidate.friendly_name ?? candidate.entity_id}</strong>
                          <code>{candidate.entity_id}</code>
                          {candidate.blocked_reason ? <small>{candidate.blocked_reason}</small> : null}
                        </span>
                      </label>
                    ))}
                  </div>
                  <button
                    className="primary-button"
                    type="button"
                    disabled={policyBusy}
                    onClick={() => void savePolicy()}
                  >
                    {policyBusy ? "Saving…" : "Save safe-control allow list"}
                  </button>
                </section>
              ) : (
                <section className="panel">
                  <h2>Safe controls</h2>
                  <p>
                    {canControl
                      ? "You may operate entities that an Owner/Admin has explicitly allow-listed."
                      : "This account is read-only and cannot operate Home Assistant entities."}
                  </p>
                </section>
              )}

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
                    <p>
                      Controls are rendered only for allow-listed Level-1 entities.
                      Other entities remain read-only.
                    </p>
                  </div>
                  <strong>{visibleEntities.length}</strong>
                </div>
                {visibleEntities.length === 0 ? (
                  <p>No entities match the current filters.</p>
                ) : (
                  <div className="ha-entity-list">
                    {visibleEntities.map((entity) => (
                      <EntityCard
                        entity={entity}
                        key={entity.entity_id}
                        allowed={allowedSet.has(entity.entity_id)}
                        canControl={canControl}
                        busy={controlBusy === entity.entity_id}
                        onControl={control}
                      />
                    ))}
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

function EntityCard({
  entity,
  allowed,
  canControl,
  busy,
  onControl,
}: {
  entity: HomeAssistantBrowserEntity;
  allowed: boolean;
  canControl: boolean;
  busy: boolean;
  onControl: (entityId: string, action: HomeAssistantControlAction) => Promise<void>;
}) {
  const attributeCount = Object.keys(entity.attributes).length;
  const supported = ["light", "switch", "scene"].includes(entity.domain);
  const showControls = supported && allowed && canControl;

  return (
    <article className="ha-entity-card">
      <div>
        <strong>{entity.friendly_name ?? entity.entity_id}</strong>
        <code>{entity.entity_id}</code>
      </div>
      <dl>
        <div><dt>Area</dt><dd>{entity.area_name ?? "Unassigned"}</dd></div>
        <div><dt>Device</dt><dd>{entity.device_name ?? "No device"}</dd></div>
        <div><dt>Domain</dt><dd>{entity.domain}</dd></div>
        <div><dt>State</dt><dd>{entity.state}{entity.unit_of_measurement ? " " + entity.unit_of_measurement : ""}</dd></div>
        <div><dt>Platform</dt><dd>{entity.platform ?? "—"}</dd></div>
        <div><dt>Device class</dt><dd>{entity.device_class ?? "—"}</dd></div>
        <div><dt>Last updated</dt><dd>{entity.last_updated ? new Date(entity.last_updated).toLocaleString() : "—"}</dd></div>
      </dl>
      {showControls ? (
        <div className="ha-control-buttons" aria-label={`Controls for ${entity.entity_id}`}>
          {entity.domain === "scene" ? (
            <button type="button" disabled={busy} onClick={() => void onControl(entity.entity_id, "activate")}>
              {busy ? "Working…" : "Activate scene"}
            </button>
          ) : (
            <>
              <button type="button" disabled={busy} onClick={() => void onControl(entity.entity_id, "on")}>
                Turn on
              </button>
              <button type="button" disabled={busy} onClick={() => void onControl(entity.entity_id, "off")}>
                Turn off
              </button>
            </>
          )}
        </div>
      ) : supported ? (
        <small className="ha-control-note">
          {allowed ? "Read-only account." : "Not on the safe-control allow list."}
        </small>
      ) : null}
      <details><summary>Attributes ({attributeCount})</summary><pre>{JSON.stringify(entity.attributes, null, 2)}</pre></details>
    </article>
  );
}
