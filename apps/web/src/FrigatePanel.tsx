import { useEffect, useState } from "react";
import { CameraEventTimeline } from "./CameraEventTimeline";

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
      eventsOnline: boolean;
      observedAt: string | null;
      error: string | null;
    }
  | { kind: "error"; message: string };

function eventTime(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleString();
}

export function FrigatePanel({ canAdminister = false }: { canAdminister?: boolean }) {
  const [state, setState] = useState<FrigateState>({ kind: "loading" });
  const [busy, setBusy] = useState(false);

  async function refresh(signal?: AbortSignal) {
    setBusy(true);
    try {
      const [status, cameras, events] = await Promise.allSettled([
        getFrigateStatus(signal),
        getFrigateCameras(signal),
        getFrigateEvents(100, signal),
      ]);
      if (signal?.aborted) return;
      const verifiedStatus: FrigateStatus = status.status === "fulfilled" ? status.value : {
        configured: false, online: false, version: null, base_url: "",
        local_only: false, error: "Provider status unavailable",
      };
      const eventsOnline = events.status === "fulfilled" && events.value.online;
      setState({
        kind: "ready",
        status: verifiedStatus,
        cameras: cameras.status === "fulfilled" ? cameras.value.cameras : [],
        events: events.status === "fulfilled" ? events.value.events : [],
        eventsOnline,
        observedAt: eventsOnline ? new Date().toISOString() : null,
        error: status.status !== "fulfilled" || cameras.status !== "fulfilled" || events.status !== "fulfilled"
          || verifiedStatus.error || (events.status === "fulfilled" && events.value.error)
          ? "One or more Frigate sources are unavailable. Review local service diagnostics privately." : null,
      });
    } catch (caught: unknown) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setState({
        kind: "error",
        message: "Unable to load Frigate status. Verify local service and sign-in.",
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
          <p className="eyebrow">Build 142</p>
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
          <div><dt>Status</dt><dd>{state.status.online ? "Online" : "Offline — optional"}</dd></div>
          <div><dt>Version</dt><dd>{state.status.version ?? "Unavailable"}</dd></div>
          <div><dt>API</dt><dd>Private local service (address hidden)</dd></div>
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

          <CameraEventTimeline events={state.events} online={state.status.online && state.eventsOnline}
            canAdminister={canAdminister} observedAt={state.observedAt} />
        </>
      ) : (
        <>
        <section className="panel">
          <h3>Frigate is optional</h3>
          <p>
            Frigate is not responding at its configured local API. This is not a Hub
            camera failure: the camera registry and go2rtc can work without Frigate.
          </p>
          <p>
            If object-event detection is wanted, confirm Frigate is installed and
            running on the Hub host, check the configured local API address and port,
            then select Refresh Frigate. No Frigate service is started by this page.
          </p>
        </section>
        <CameraEventTimeline events={[]} online={false} canAdminister={canAdminister} observedAt={null} />
        </>
      )}
    </section>
  );
}
