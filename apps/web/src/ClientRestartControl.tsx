import { useState } from "react";
import { inspectSameOriginClient262, type ClientSource262 } from "./clientReadiness262";

/** A client-only restart; never starts Windows tasks or terminates Hub services. */
export function ClientRestartControl() {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sourceCheck, setSourceCheck] = useState<ClientSource262 | "">("");
  const [sourceChecking, setSourceChecking] = useState(false);

  async function verifyClientSource() {
    if (sourceChecking || busy) return;
    setSourceChecking(true);
    setSourceCheck("");
    try { setSourceCheck(await inspectSameOriginClient262()); }
    finally { setSourceChecking(false); }
  }

  async function restart() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      // Check network availability before leaving the current working page.
      const response = await fetch("/", { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) throw new Error("The client server did not respond successfully.");
      if ("serviceWorker" in navigator) {
        try { await (await navigator.serviceWorker.getRegistration())?.update(); }
        catch { /* A service worker is optional; the navigation remains network-first. */ }
      }
      const next = new URL(window.location.href);
      next.searchParams.set("client_restart", Date.now().toString());
      window.location.replace(next.toString());
    } catch {
      setError("The client server is not reachable. Nothing was restarted. Check the local Hub service and try again.");
      setBusy(false);
    }
  }

  return <div className="hub-client-restart">
    <button type="button" className="hub-restart-top-button" aria-expanded={confirming}
      onClick={() => { setConfirming(value => !value); setError(""); }}>
      Restart Client
    </button>
    {confirming && <div className="hub-restart-confirm" role="group" aria-label="Confirm client restart">
      <strong>Restart this client?</strong>
      <p>Reloads this browser/PWA from the local Hub server. It does not restart Windows, the backend, cameras or other devices, and cannot install an update that is not yet on this computer.</p>
      <div className="hub-restart-confirm-actions">
        <button type="button" disabled={busy} onClick={() => void restart()}>{busy ? "Checking server…" : "Restart this client now"}</button>
        <button type="button" disabled={busy} onClick={() => setConfirming(false)}>Cancel</button>
      </div>
      <div className="hub-source-probe-262">
        <button type="button" disabled={sourceChecking || busy} onClick={() => void verifyClientSource()}>
          {sourceChecking ? "Checking served client code…" : "Verify served client code"}
        </button>
        {sourceCheck && <p role="status">{sourceCheck === "SERVING_BUILD_262_MODULE_CANDIDATE"
          ? "Build 262 source module is being served by this local Vite client. This does not verify the Windows process or installed release."
          : "Client source cannot be verified here (or this is a bundled release). Installed runtime identity remains on HOLD."}</p>}
      </div>
      {error && <p role="alert">{error}</p>}
    </div>}
  </div>;
}
