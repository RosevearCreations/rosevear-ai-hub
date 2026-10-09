import { useEffect, useState } from "react";

import {
  configureCameraStream,
  deleteCameraStream,
  discoverCameras,
  getCameras,
  getGo2RTCStatus,
  probeCameraStream,
  reconcileGo2RTC,
  updateCamera,
  type AuthUser,
  type CameraRecord,
  type Go2RTCStatus,
} from "./api";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; cameras: CameraRecord[] }
  | { kind: "error"; message: string };

export function CameraView({ currentUser }: { currentUser: AuthUser }) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [transport, setTransport] = useState<Go2RTCStatus | null>(null);
  const [sourceUrls, setSourceUrls] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const canAdminister =
    currentUser.role === "owner" || currentUser.role === "administrator";

  async function refresh(signal?: AbortSignal) {
    try {
      const [cameras, go2rtc] = await Promise.all([
        getCameras(signal),
        getGo2RTCStatus(signal),
      ]);
      setState({ kind: "ready", cameras });
      setTransport(go2rtc);
    } catch (caught: unknown) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setState({
        kind: "error",
        message: caught instanceof Error ? caught.message : "Unable to load camera registry.",
      });
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, []);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (caught: unknown) {
      setMessage(caught instanceof Error ? caught.message : "Camera transport request failed.");
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

  return (
    <section>
      <header className="page-header">
        <div>
          <p className="eyebrow">Build 032</p>
          <h1>Cameras</h1>
          <p className="lede">
            ONVIF registry plus encrypted RTSP source configuration through a local-only go2rtc transport.
          </p>
        </div>
        <div>
          <button type="button" onClick={() => void refresh()} disabled={busy}>
            Refresh
          </button>
          {canAdminister ? (
            <>
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

      <section className="panel" aria-label="go2rtc transport status">
        <h2>go2rtc transport</h2>
        {transport ? (
          <dl className="ha-meta">
            <div><dt>Status</dt><dd>{transport.online ? "Online" : "Offline"}</dd></div>
            <div><dt>Version</dt><dd>{transport.version ?? "Unavailable"}</dd></div>
            <div><dt>API</dt><dd><code>{transport.api_base_url}</code></dd></div>
            <div><dt>RTSP listener</dt><dd><code>{transport.rtsp_listen ?? "Unavailable"}</code></dd></div>
            <div><dt>API local-only</dt><dd>{transport.local_api_only ? "Yes" : "No"}</dd></div>
            <div><dt>RTSP local-only</dt><dd>{transport.local_rtsp_only ? "Yes" : "No"}</dd></div>
          </dl>
        ) : <p>Checking local go2rtc transport…</p>}
        {transport?.error ? <p className="auth-error">{transport.error}</p> : null}
        {transport && !transport.local_rtsp_only ? (
          <p className="auth-error">
            go2rtc RTSP is not confirmed as loopback-only. Use the Build 032 local config before treating this transport as private.
          </p>
        ) : null}
      </section>

      {message ? <p className="runtime-status" role="status">{message}</p> : null}

      {state.kind === "loading" ? (
        <section className="panel" role="status">Loading camera registry…</section>
      ) : state.kind === "error" ? (
        <p className="auth-error" role="alert">{state.message}</p>
      ) : state.cameras.length === 0 ? (
        <section className="panel">
          <h2>No cameras discovered yet</h2>
          <p>Owner or Administrator can run ONVIF discovery on the trusted local network.</p>
        </section>
      ) : (
        <section className="ha-entity-list" aria-label="Camera registry">
          {state.cameras.map((camera) => (
            <article className="ha-entity-card" key={camera.id}>
              <div>
                <strong>{camera.display_name}</strong>
                <small>{camera.enabled ? "Enabled" : "Disabled"} · ONVIF discovered</small>
              </div>
              <dl className="ha-meta">
                <div><dt>Address</dt><dd>{camera.host}:{camera.port}</dd></div>
                <div><dt>Endpoint</dt><dd><code>{camera.endpoint_uuid}</code></dd></div>
                <div><dt>Service</dt><dd><code>{camera.service_url}</code></dd></div>
                <div><dt>Last seen</dt><dd>{new Date(camera.last_seen_at).toLocaleString()}</dd></div>
              </dl>

              {camera.stream ? (
                <section className="panel">
                  <h3>RTSP transport</h3>
                  <dl className="ha-meta">
                    <div><dt>Source</dt><dd>{camera.stream.source_scheme}://{camera.stream.source_host}:{camera.stream.source_port}</dd></div>
                    <div><dt>Credentials</dt><dd>{camera.stream.credentials_present ? "Encrypted" : "Not present"}</dd></div>
                    <div><dt>go2rtc name</dt><dd><code>{camera.stream.stream_name}</code></dd></div>
                    <div><dt>Local relay</dt><dd><code>{camera.stream.relay_url}</code></dd></div>
                    <div><dt>Last probe</dt><dd>{camera.stream.last_probe_status ?? "Not tested"}</dd></div>
                  </dl>
                  {camera.stream.last_error ? <p className="auth-error">Transport status: {camera.stream.last_error}</p> : null}
                  {canAdminister ? (
                    <div>
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
                <section className="panel">
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
                    The source URL is encrypted in the Hub and is never redisplayed. go2rtc receives it only in runtime memory.
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
          ))}
        </section>
      )}

      <section className="panel">
        <h2>Build boundary</h2>
        <p>
          Build 032 adds encrypted RTSP source handling and a local go2rtc relay. It does not add the
          multi-camera dashboard, browser live-view experience, Frigate events, PTZ, talkback, or
          public camera exposure. Camera dashboard and health work begins in Build 033.
        </p>
      </section>
    </section>
  );
}
