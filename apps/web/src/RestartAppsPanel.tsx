import { useState } from "react";

type NativeBridge = {
  core?: { invoke: <T>(command: string, args?: Record<string, string>) => Promise<T> };
};

const BACKEND_WORDS = "RESTART HUB BACKEND";
const CLIENT_WORDS = "RESTART HUB CLIENT";

function desktopBridge(): NativeBridge["core"] | null {
  const value = window as Window & { __TAURI__?: NativeBridge };
  return value.__TAURI__?.core ?? null;
}

/** No browser endpoint can invoke machine process controls. */
export function RestartAppsPanel() {
  const [target, setTarget] = useState<"backend" | "client" | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  if (!desktopBridge()) return null;
  const required = target === "backend" ? BACKEND_WORDS : CLIENT_WORDS;

  async function restart() {
    const bridge = desktopBridge();
    if (!bridge || !target || confirmation !== required || busy) return;
    setBusy(true);
    setResult("");
    try {
      if (target === "backend") {
        const started = await bridge.invoke<string>("restart_hub_backend", {
          confirmation,
        });
        setResult(
          started === "started"
            ? "Backend restart launched. Check the result below; reconnect may be interrupted."
            : "Backend restart was not started.",
        );
      } else {
        await bridge.invoke<void>("restart_hub_client", { confirmation });
        setResult("Client relaunch requested.");
      }
    } catch {
      setResult(
        "Restart was not accepted. Check the local maintenance log and repository location.",
      );
    } finally {
      setBusy(false);
      setConfirmation("");
      setTarget(null);
    }
  }

  async function checkBackend() {
    const bridge = desktopBridge();
    if (!bridge || busy) return;
    setBusy(true);
    try {
      const state = await bridge.invoke<string>("hub_backend_restart_state");
      setResult(
        state === "completed"
          ? "Maintenance script completed. Confirm backend health after reconnecting."
          : state === "running"
            ? "Backend maintenance is still running; do not launch another copy."
            : state === "failed"
              ? "Backend maintenance failed. Inspect the local backend maintenance log."
              : "No backend maintenance process is currently tracked by this desktop session.",
      );
    } catch {
      setResult("Unable to read local backend restart status.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel" aria-label="Restart Hub applications">
      <h2>Restart Hub applications</h2>
      <p>Windows desktop only. These actions restart the Hub apps, never Windows,
        Home Assistant, MQTT, cameras, or another process. Save work first.</p>
      <p>Backend restart uses the existing process-identity-verified local
        maintenance script; it may be blocked if a recovery task races the restart.
        No database migration or update is performed.</p>
      <button type="button" disabled={busy} onClick={() => {
        setTarget("backend"); setConfirmation(""); setResult("");
      }}>Restart backend app</button>{" "}
      <button type="button" disabled={busy} onClick={() => {
        setTarget("client"); setConfirmation(""); setResult("");
      }}>Restart desktop client</button>{" "}
      <button type="button" disabled={busy} onClick={() => void checkBackend()}>
        {busy ? "Checking…" : "Check backend restart status"}
      </button>
      {target && (
        <div>
          <p>Confirm {target === "backend" ? "backend" : "client"} restart by typing
            <strong> {required}</strong>.</p>
          <label htmlFor="restart-confirmation">Restart confirmation</label>
          <input id="restart-confirmation" value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off" spellCheck={false} />
          <button type="button" disabled={busy || confirmation !== required}
            onClick={() => void restart()}>
            {busy ? "Working…" : "Confirm restart"}
          </button>{" "}
          <button type="button" disabled={busy} onClick={() => {
            setTarget(null); setConfirmation("");
          }}>Cancel</button>
        </div>
      )}
      {result && <p role="status">{result}</p>}
      <p><small>If restarting the backend fails, use the local
        <code> scripts/restart-hub-backend.ps1</code> and inspect
        <code> logs/hub-backend-maintenance.log</code>.
        For a standalone desktop executable, set ROSEVEAR_AI_HUB_ROOT
        to the trusted project directory on this PC.</small></p>
    </section>
  );
}
