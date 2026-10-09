import { useEffect, useMemo, useState } from "react";

import {
  configureCameraStream,
  deleteCameraStream,
  discoverCameras,
  getCameraDashboard,
  getCameras,
  getGo2RTCStatus,
  probeCameraStream,
  reconcileGo2RTC,
  refreshCameraHealth,
  updateCamera,
  type AuthUser,
  type CameraDashboard,
  type CameraRecord,
  type Go2RTCStatus,
} from "./api";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; cameras: CameraRecord[] }
  | { kind: "error"; message: string };

function healthLabel(value: string): string {
  const labels: Record<string, string> = {
    healthy: "Healthy",
    stale: "Stale",
    untested: "Not tested",
    unconfigured: "Not configured",
    disabled: "Disabled",
    unavailable: "Transport unavailable",
    failed: "Failed",
    no_producer: "No active producer",
  };
  return labels[value] ?? value.replaceAll("_", " ");
}

export function CameraView({ currentUser }: { currentUser: AuthUser }) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [transport, setTransport] = useState<Go2RTCStatus | null>(null);
  const [dashboard, setDashboard] = useState<CameraDashboard | null>(null);
  const [sourceUrls, setSourceUrls] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const canAdminister =
    currentUser.role === "owner" || currentUser.role === "administrator";

  async function refresh(signal?: AbortSignal) {
    try {
      const [cameras, go2rtc, cameraDashboard] = await Promise.all([
        getCameras(signal),
        getGo2RTCStatus(signal),
        getCameraDashboard(signal),
      ]);
      setState({ kind: "ready", cameras });
      setTransport(go2rtc);
      setDashboard(cameraDashboard);
    } catch (caught: unknown) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setState({
        kind: "error",
        message: caught instanceof Error ? caught.message : "Unable to load camera dashboard.",
      });
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void getCameraDashboard()
        .then(setDashboard)
        .catch(() => undefined);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (caught: unknown) {
      setMessage(caught instanceof Error ? caught.message : "Camera request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function scan() {
    await run(async () => {
      const result = await discoverCameras();
      setMessage(
        "Discovery found " + result.discovered + " ONVIF device" +
        (result.discovered === 1 ? "" : "s") + "; " + result.created +
        " added, " + result.updated + " refreshed.",
      );
      await refresh();
    });
  }

  async function reconcile() {
    await run(async () => {
      const result = await reconcileGo2RTC();
      setMessage(
        "go2rtc synchronized " + result.synchronized + "/" + result.configured +
        " configured stream" + (result.configured === 1 ? "" : "s") + "; " +
        result.failed + " failed, " + result.skipped + " skipped.",
      );
      await refresh();
    });
  }

  async function runHealthChecks() {
    await run(async () => {
      const result = await refreshCameraHealth();
      setMessage(
        "Camera health checked " + result.checked + " stream" +
        (result.checked === 1 ? "" : "s") + ": " + result.healthy +
        " healthy, " + result.failed + " failed, " + result.skipped + " skipped.",
      );
      await refresh();
    });
  }

  async function saveStream(camera: CameraRecord) {
    const sourceUrl = sourceUrls[camera.id]?.trim() ?? "";
    if (!sourceUrl) {
      setMessage("Enter the camera RTSP URL first.");
      return;
    }
    await run(async () => {
      const result = await configureCameraStream(camera.id, sourceUrl);
      setSourceUrls((current) => ({ ...current, [camera.id]: "" }));
      setMessage(result.message);
      await refresh();
    });
  }

  async function probe(camera: CameraRecord) {
    await run(async () => {
      const result = await probeCameraStream(camera.id);
      setMessage(
        camera.display_name + " transport probe: " + result.status + "; " +
        result.producer_count + " producer(s), " + result.consumer_count + " consumer(s).",
      );
      await refresh();
    });
  }

  async function removeStream(camera: CameraRecord) {
    await run(async () => {
      const result = await deleteCameraStream(camera.id);
      setMessage(
        result.deleted
          ? camera.display_name + " RTSP transport configuration removed."
          : camera.display_name + " had no RTSP transport configuration.",
      );
      await refresh();
    });
  }

  async function toggle(camera: CameraRecord) {
    await run(async () => {
      await updateCamera(camera.id, { enabled: !camera.enabled });
      setMessage(camera.display_name + " " + (camera.enabled ? "disabled" : "enabled") + ".");
      await refresh();
    });
  }

  const dashboardByCamera = useMemo(
    () => new Map((dashboard?.cameras ?? []).map((item) => [item.camera_id, item])),
    [dashboard],
  );

  return (
    <section className="camera-view">
      <header className="page-header">
        <div>
          <p className="eyebrow">Build 033</p>
          <h1>Camera dashboard</h1>
          <p className="lede">
            Local live views, transport health, freshness, and camera configuration without exposing camera credentials.
          </p>
        </div>
        <div className="camera-toolbar">
          <button type="button" onClick={() => void refresh()} disabled={busy}>
            Refresh
          </button>
          {canAdminister ? (
            <>
              <button type="button" onClick={() => void runHealthChecks()} disabled={busy}>
                Run health checks
              </button>
              <button type="button" onClick={() => void reconcile()} disabled={busy}>
                Sync go2rtc
              </button>
              <button className="primary-button" type="button" onClick={() => void scan()} disabled={busy}>
                Scan local network
              </button>
            </>
          ) : null}
        </div>
      </header>

      {dashboard ? (
        <section className="camera-summary" aria-label="Camera health summary">
          <div><span>Total</span><strong>{dashboard.total}</strong></div>
          <div><span>Enabled</span><strong>{dashboard.enabled}</strong></div>
          <div><span>Configured</span><strong>{dashboard.configured}</strong></div>
          <div><span>Healthy</span><strong>{dashboard.healthy}</strong></div>
          <div><span>Needs attention</span><strong>{dashboard.attention}</strong></div>
        </section>
      ) : null}

      <section className="panel camera-transport-card" aria-label="go2rtc transport status">
        <div>
          <h2>Local video transport</h2>
          <p>
            {transport?.online
              ? "go2rtc is online and available to the local dashboard."
              : "go2rtc is offline; camera inventory remains available but live tiles cannot load."}
          </p>
        </div>
        {transport ? (
          <dl className="ha-meta">
            <div><dt>Status</dt><dd>{transport.online ? "Online" : "Offline"}</dd></div>
            <div><dt>Version</dt><dd>{transport.version ?? "Unavailable"}</dd></div>
            <div><dt>API local-only</dt><dd>{transport.local_api_only ? "Yes" : "No"}</dd></div>
            <div><dt>RTSP local-only</dt><dd>{transport.local_rtsp_only ? "Yes" : "No"}</dd></div>
          </dl>
        ) : null}
        {transport?.error ? <p className="auth-error">{transport.error}</p> : null}
        {transport && (!transport.local_api_only || !transport.local_rtsp_only) ? (
          <p className="auth-error">
            Live viewing is not considered private until both go2rtc API and RTSP listeners are loopback-only.
          </p>
        ) : null}
      </section>

      {message ? <p className="runtime-status" role="status">{message}</p> : null}

      {state.kind === "loading" ? (
        <section className="panel" role="status">Loading camera dashboard…</section>
      ) : state.kind === "error" ? (
        <p className="auth-error" role="alert">{state.message}</p>
      ) : state.cameras.length === 0 ? (
        <section className="panel">
          <h2>No cameras discovered yet</h2>
          <p>Owner or Administrator can scan the trusted local network for compatible ONVIF cameras.</p>
        </section>
      ) : (
        <>
          <section className="camera-live-grid" aria-label="Live camera dashboard">
            {state.cameras.map((camera) => {
              const health = dashboardByCamera.get(camera.id);
              const canShowLive =
                Boolean(health?.viewer_url) &&
                Boolean(transport?.online) &&
                Boolean(transport?.local_api_only) &&
                Boolean(transport?.local_rtsp_only);
              return (
                <article className="camera-live-card" key={"live-" + camera.id}>
                  <header>
                    <div>
                      <strong>{camera.display_name}</strong>
                      <small>{camera.host}</small>
                    </div>
                    <span className={"camera-health camera-health-" + (health?.health ?? "untested")}>
                      {healthLabel(health?.health ?? "untested")}
                    </span>
                  </header>
                  {canShowLive && health?.viewer_url ? (
                    <iframe
                      className="camera-live-frame"
                      src={health.viewer_url}
                      title={camera.display_name + " live view"}
                      loading="lazy"
                      sandbox="allow-scripts allow-same-origin"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="camera-live-placeholder">
                      <strong>Live view unavailable</strong>
                      <small>
                        {!camera.stream
                          ? "Configure an RTSP source for this camera."
                          : !transport?.online
                            ? "Start the local go2rtc transport."
                            : "Run a health check and verify loopback-only transport."}
                      </small>
                    </div>
                  )}
                  <footer>
                    <span>Last camera discovery: {new Date(camera.last_seen_at).toLocaleString()}</span>
                    <span>
                      Last stream check: {health?.last_probe_at
                        ? new Date(health.last_probe_at).toLocaleString()
                        : "Not tested"}
                    </span>
                  </footer>
                </article>
              );
            })}
          </section>

          <section className="camera-config-section">
            <header>
              <h2>Camera configuration</h2>
              <p>Administrative transport details remain separate from the live dashboard.</p>
            </header>
            <div className="ha-entity-list" aria-label="Camera configuration">
              {state.cameras.map((camera) => {
                const health = dashboardByCamera.get(camera.id);
                return (
                  <article className="ha-entity-card" key={camera.id}>
                    <div>
                      <strong>{camera.display_name}</strong>
                      <small>
                        {camera.enabled ? "Enabled" : "Disabled"} · {healthLabel(health?.health ?? "untested")}
                      </small>
                    </div>
                    <dl className="ha-meta">
                      <div><dt>Address</dt><dd>{camera.host}:{camera.port}</dd></div>
                      <div><dt>Endpoint</dt><dd><code>{camera.endpoint_uuid}</code></dd></div>
                      <div><dt>Service</dt><dd><code>{camera.service_url}</code></dd></div>
                      <div><dt>Last seen</dt><dd>{new Date(camera.last_seen_at).toLocaleString()}</dd></div>
                    </dl>

                    {camera.stream ? (
                      <section className="panel camera-stream-panel">
                        <h3>RTSP transport</h3>
                        <dl className="ha-meta">
                          <div><dt>Source</dt><dd>{camera.stream.source_scheme}://{camera.stream.source_host}:{camera.stream.source_port}</dd></div>
                          <div><dt>Credentials</dt><dd>{camera.stream.credentials_present ? "Encrypted" : "Not present"}</dd></div>
                          <div><dt>go2rtc name</dt><dd><code>{camera.stream.stream_name}</code></dd></div>
                          <div><dt>Local relay</dt><dd><code>{camera.stream.relay_url}</code></dd></div>
                          <div><dt>Health</dt><dd>{healthLabel(health?.health ?? "untested")}</dd></div>
                        </dl>
                        {camera.stream.last_error ? <p className="auth-error">Transport status: {camera.stream.last_error}</p> : null}
                        {canAdminister ? (
                          <div className="camera-actions">
                            <button type="button" disabled={busy} onClick={() => void probe(camera)}>
                              Test RTSP stream
                            </button>
                            <button type="button" disabled={busy} onClick={() => void removeStream(camera)}>
                              Remove RTSP config
                            </button>
                          </div>
                        ) : null}
                      </section>
                    ) : canAdminister ? (
                      <section className="panel camera-stream-panel">
                        <h3>Configure RTSP transport</h3>
                        <label>
                          RTSP source URL
                          <input
                            type="password"
                            autoComplete="off"
                            placeholder="rtsp://user:password@192.168.x.x/path"
                            value={sourceUrls[camera.id] ?? ""}
                            onChange={(event) => setSourceUrls((current) => ({
                              ...current,
                              [camera.id]: event.target.value,
                            }))}
                          />
                        </label>
                        <p>
                          The credential-bearing source is encrypted in the Hub and never redisplayed.
                        </p>
                        <button type="button" disabled={busy} onClick={() => void saveStream(camera)}>
                          Save encrypted RTSP source
                        </button>
                      </section>
                    ) : null}

                    {camera.scopes.length > 0 ? (
                      <details>
                        <summary>ONVIF scopes</summary>
                        <ul>{camera.scopes.map((scope) => <li key={scope}><code>{scope}</code></li>)}</ul>
                      </details>
                    ) : null}
                    {canAdminister ? (
                      <button type="button" disabled={busy} onClick={() => void toggle(camera)}>
                        {camera.enabled ? "Disable registry entry" : "Enable registry entry"}
                      </button>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}

      <section className="panel">
        <h2>Build boundary</h2>
        <p>
          Build 033 adds a local multi-camera dashboard, browser-embedded local go2rtc views, health
          freshness, and fleet health checks. It does not add Frigate event detection, recording,
          PTZ, talkback, camera device writes, or public/remote camera exposure. Frigate integration
          begins in Build 034.
        </p>
      </section>
    </section>
  );
}
