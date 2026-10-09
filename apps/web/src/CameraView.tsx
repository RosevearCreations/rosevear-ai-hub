import { useEffect, useState } from "react";

import {
  discoverCameras,
  getCameras,
  updateCamera,
  type AuthUser,
  type CameraRecord,
} from "./api";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; cameras: CameraRecord[] }
  | { kind: "error"; message: string };

export function CameraView({ currentUser }: { currentUser: AuthUser }) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const canAdminister =
    currentUser.role === "owner" || currentUser.role === "administrator";

  async function refresh(signal?: AbortSignal) {
    try {
      const cameras = await getCameras(signal);
      setState({ kind: "ready", cameras });
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

  async function scan() {
    setBusy(true);
    setMessage("");
    try {
      const result = await discoverCameras();
      setMessage(
        `Discovery found ${result.discovered} ONVIF device${result.discovered === 1 ? "" : "s"}; ${result.created} added, ${result.updated} refreshed.`,
      );
      await refresh();
    } catch (caught: unknown) {
      setMessage(caught instanceof Error ? caught.message : "ONVIF discovery failed.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(camera: CameraRecord) {
    setBusy(true);
    setMessage("");
    try {
      await updateCamera(camera.id, { enabled: !camera.enabled });
      setMessage(`${camera.display_name} ${camera.enabled ? "disabled" : "enabled"}.`);
      await refresh();
    } catch (caught: unknown) {
      setMessage(caught instanceof Error ? caught.message : "Camera update failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <p className="eyebrow">Build 031</p>
          <h1>Cameras</h1>
          <p className="lede">
            Local camera registry with bounded ONVIF WS-Discovery. Streaming is deferred to Build 032.
          </p>
        </div>
        <div>
          <button type="button" onClick={() => void refresh()} disabled={busy}>
            Refresh
          </button>
          {canAdminister ? (
            <button className="primary-button" type="button" onClick={() => void scan()} disabled={busy}>
              Scan local network
            </button>
          ) : null}
        </div>
      </header>

      {message ? <p className="runtime-status" role="status">{message}</p> : null}

      {state.kind === "loading" ? (
        <section className="panel" role="status">Loading camera registry…</section>
      ) : state.kind === "error" ? (
        <p className="auth-error" role="alert">{state.message}</p>
      ) : state.cameras.length === 0 ? (
        <section className="panel">
          <h2>No cameras discovered yet</h2>
          <p>
            Owner or Administrator can run ONVIF discovery on the trusted local network. The scan
            records only local ONVIF device-service endpoints and discovery metadata.
          </p>
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
          Build 031 discovers and inventories compatible local ONVIF devices. It does not request
          RTSP credentials, open streams, expose cameras publicly, or perform PTZ/device-control
          actions. RTSP/go2rtc transport begins in Build 032.
        </p>
      </section>
    </section>
  );
}
