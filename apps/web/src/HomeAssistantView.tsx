import { useEffect, useState } from "react";

import {
  getHomeAssistantEntities,
  getHomeAssistantStatus,
  type HomeAssistantEntity,
  type HomeAssistantStatus,
} from "./api";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; status: HomeAssistantStatus; entities: HomeAssistantEntity[] }
  | { kind: "error"; message: string };

export function HomeAssistantView() {
  const [loadState, setLoadState] = useState<LoadState>({ kind: "loading" });

  async function refresh(signal?: AbortSignal) {
    setLoadState({ kind: "loading" });
    try {
      const status = await getHomeAssistantStatus(signal);
      if (!status.available) {
        setLoadState({ kind: "ready", status, entities: [] });
        return;
      }
      const inventory = await getHomeAssistantEntities(signal);
      setLoadState({ kind: "ready", status, entities: inventory.entities });
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

  return (
    <section className="home-assistant-view">
      <header className="page-header">
        <div>
          <p className="eyebrow">Build 021</p>
          <h1>Devices</h1>
          <p className="lede">
            Read-only Home Assistant connectivity, health, and basic entity inventory.
            Device controls remain disabled until the later safe-control builds.
          </p>
        </div>
        <button type="button" onClick={() => void refresh()}>
          Refresh
        </button>
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
                <div>
                  <dt>URL</dt>
                  <dd>{loadState.status.base_url ?? "Not configured"}</dd>
                </div>
                <div>
                  <dt>Access token</dt>
                  <dd>{loadState.status.token_configured ? "Configured" : "Not configured"}</dd>
                </div>
                <div>
                  <dt>Entities</dt>
                  <dd>{loadState.entities.length}</dd>
                </div>
              </dl>
              {!loadState.status.configured ? (
                <p>
                  Configure <code>HOME_ASSISTANT_URL</code> and save the Home Assistant token in
                  <strong> Secrets</strong> or <code>HOME_ASSISTANT_TOKEN</code>.
                </p>
              ) : null}
            </article>
          </section>

          <section className="panel ha-inventory">
            <div className="ha-section-heading">
              <div>
                <h2>Entity inventory</h2>
                <p>
                  Build 021 exposes only basic read-only identity and state fields. Areas,
                  devices, and full attributes arrive in Build 022.
                </p>
              </div>
              <strong>{loadState.entities.length}</strong>
            </div>

            {loadState.entities.length === 0 ? (
              <p>No entities are available from the current connection.</p>
            ) : (
              <div className="ha-entity-list">
                {loadState.entities.map((entity) => (
                  <article className="ha-entity-card" key={entity.entity_id}>
                    <div>
                      <strong>{entity.friendly_name ?? entity.entity_id}</strong>
                      <code>{entity.entity_id}</code>
                    </div>
                    <dl>
                      <div>
                        <dt>Domain</dt>
                        <dd>{entity.domain}</dd>
                      </div>
                      <div>
                        <dt>State</dt>
                        <dd>
                          {entity.state}
                          {entity.unit_of_measurement ? " " + entity.unit_of_measurement : ""}
                        </dd>
                      </div>
                      <div>
                        <dt>Device class</dt>
                        <dd>{entity.device_class ?? "—"}</dd>
                      </div>
                      <div>
                        <dt>Last updated</dt>
                        <dd>
                          {entity.last_updated
                            ? new Date(entity.last_updated).toLocaleString()
                            : "—"}
                        </dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
