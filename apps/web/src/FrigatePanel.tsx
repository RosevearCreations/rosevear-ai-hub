import { useEffect, useState } from "react";

import {
  getFrigateCameras,
  getFrigateEvents,
  getFrigateStatus,
  type FrigateCamera,
  type FrigateEvent,
  type FrigateStatus,
} from "./api";

type FrigateState =
  | { kind: "loading" }
  | {
      kind: "ready";
      status: FrigateStatus;
      cameras: FrigateCamera[];
      events: FrigateEvent[];
      error: string | null;
    }
  | { kind: "error"; message: string };

function eventTime(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleString();
}

export function FrigatePanel() {
  const [state, setState] = useState<FrigateState>({ kind: "loading" });
  const [busy, setBusy] = useState(false);

  async function refresh(signal?: AbortSignal) {
    setBusy(true);
    try {
      const [status, cameras, events] = await Promise.all([
        getFrigateStatus(signal),
        getFrigateCameras(signal),
        getFrigateEvents(20, signal),
      ]);
      setState({
        kind: "ready",
        status,
        cameras: cameras.cameras,
        events: events.events,
        error: status.error ?? cameras.error ?? events.error,
      });
    } catch (caught: unknown) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setState({
        kind: "error",
        message: caught instanceof Error ? caught.message : "Unable to load Frigate status.",
      });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, []);

  if (state.kind === "loading") {
    return <section className="panel" role="status">Checking Frigate…</section>;
  }

  if (state.kind === "error") {
    return (
      <section className="panel">
        <h2>Frigate</h2>
        <p className="auth-error">{state.message}</p>
        <button type="button" disabled={busy} onClick={() => void refresh()}>
          Retry Frigate
        </button>
      </section>
    );
  }

  const enabledCameras = state.cameras.filter((camera) => camera.enabled).length;
  const detectionCameras = state.cameras.filter((camera) => camera.detect_enabled).length;

  return (
    <section className="frigate-panel">
      <header className="panel frigate-status-card">
        <div>
          <p className="eyebrow">Build 034</p>
          <h2>Frigate adapter</h2>
          <p>
            Optional local object-event integration. The Hub reads Frigate through its loopback-only
            internal API and does not expose the Frigate service to the browser.
          </p>
        </div>
        <button type="button" disabled={busy} onClick={() => void refresh()}>
          Refresh Frigate
        </button>
        <dl className="ha-meta">
          <div><dt>Status</dt><dd>{state.status.online ? "Online" : "Offline"}</dd></div>
          <div><dt>Version</dt><dd>{state.status.version ?? "Unavailable"}</dd></div>
          <div><dt>API</dt><dd><code>{state.status.base_url}</code></dd></div>
          <div><dt>Local-only</dt><dd>{state.status.local_only ? "Yes" : "No"}</dd></div>
          <div><dt>Cameras</dt><dd>{enabledCameras}/{state.cameras.length} enabled</dd></div>
          <div><dt>Detection</dt><dd>{detectionCameras} enabled</dd></div>
        </dl>
        {state.error ? <p className="auth-error">{state.error}</p> : null}
      </header>

      {state.status.online ? (
        <>
          <section className="frigate-camera-grid" aria-label="Frigate cameras">
            {state.cameras.length === 0 ? (
              <article className="panel">
                <h3>No Frigate cameras reported</h3>
                <p>Frigate is online but its current configuration did not report camera entries.</p>
              </article>
            ) : state.cameras.map((camera) => (
              <article className="panel frigate-camera-card" key={camera.name}>
                <h3>{camera.name}</h3>
                <dl className="ha-meta">
                  <div><dt>Camera</dt><dd>{camera.enabled ? "Enabled" : "Disabled"}</dd></div>
                  <div><dt>Detection</dt><dd>{camera.detect_enabled ? "Enabled" : "Disabled"}</dd></div>
                  <div><dt>Recording</dt><dd>{camera.record_enabled ? "Enabled" : "Disabled"}</dd></div>
                  <div><dt>Snapshots</dt><dd>{camera.snapshots_enabled ? "Enabled" : "Disabled"}</dd></div>
                </dl>
              </article>
            ))}
          </section>

          <section className="panel">
            <h3>Recent Frigate events</h3>
            {state.events.length === 0 ? (
              <p>No recent object events were returned.</p>
            ) : (
              <div className="frigate-event-list">
                {state.events.map((event) => (
                  <article className="frigate-event-card" key={event.event_id}>
                    <header>
                      <div>
                        <strong>{event.label}</strong>
                        <small>{event.sub_label ? event.sub_label + " · " : ""}{event.camera}</small>
                      </div>
                      <time>{eventTime(event.start_time)}</time>
                    </header>
                    <dl className="ha-meta">
                      <div><dt>Zones</dt><dd>{event.zones.length ? event.zones.join(", ") : "None"}</dd></div>
                      <div><dt>Snapshot</dt><dd>{event.has_snapshot ? "Available" : "No"}</dd></div>
                      <div><dt>Clip</dt><dd>{event.has_clip ? "Available" : "No"}</dd></div>
                      <div><dt>Score</dt><dd>{event.score === null ? "Unavailable" : event.score.toFixed(2)}</dd></div>
                    </dl>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="panel">
          <h3>Frigate is optional</h3>
          <p>
            The camera dashboard and go2rtc continue working without Frigate. Install/configure
            Frigate later if object-event analytics are wanted.
          </p>
        </section>
      )}
    </section>
  );
}
