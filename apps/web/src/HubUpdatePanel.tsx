import { useCallback, useEffect, useState } from "react";
import { getHubUpdateControl, requestHubUpdate, type HubUpdateControl } from "./api";
import { browserBuild } from "./installedHubAdoption";
import { hubUpdateBlockerLabel, hubUpdateNextStep, HUB_UPDATE_RELOAD_KEY, shouldReloadHub } from "./hubUpdateModel";
import { CardHelp } from "./CommandShell";

function autoRefreshIfInstalled(status: HubUpdateControl) {
  const target = status.active_release;
  let previous: string | null = null;
  try { previous = window.sessionStorage.getItem(HUB_UPDATE_RELOAD_KEY); } catch { /* okay */ }
  if (!shouldReloadHub(browserBuild.sha, target, status.adoption_state, previous)) return false;
  try { window.sessionStorage.setItem(HUB_UPDATE_RELOAD_KEY, target!); } catch { /* okay */ }
  const url = new URL(window.location.href);
  url.searchParams.set("hub_release", target!.slice(0, 12));
  // The PWA handles navigation network-first/no-store. No hard refresh shortcut required.
  window.location.replace(url.toString());
  return true;
}

/** Owner-only scheduled-update request. A non-enrolled PC remains HOLD, not a pretend install. */
export function HubUpdatePanel() {
  const [status, setStatus] = useState<HubUpdateControl | null>(null);
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [follow, setFollow] = useState(false);
  const [consent, setConsent] = useState(false);
  const [notice, setNotice] = useState("");

  const check = useCallback(async () => {
    try {
      const result = await getHubUpdateControl();
      setStatus(result);
      if (follow && result.adoption_state === "FAILED") setFollow(false);
      autoRefreshIfInstalled(result);
    } catch {
      setStatus(null);
      setNotice("Update controller unavailable in this installed Hub. The older backend must be updated through the supervised Windows release setup first.");
    }
  }, [follow]);

  useEffect(() => {
    void check();
  }, [check]);

  useEffect(() => {
    if (!follow) return;
    const id = window.setInterval(() => void check(), 12000);
    return () => window.clearInterval(id);
  }, [follow, check]);

  async function request() {
    if (!consent || status?.state !== "ready_to_request") return;
    setRequesting(true);
    setNotice("");
    try {
      await requestHubUpdate();
      setFollow(true);
      setNotice("The existing Windows Release Adoption task was requested. Preparation, backup checks, restart and rollback run locally. Installation is NOT yet confirmed.");
      setConsent(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not request the local release task.");
    } finally {
      setRequesting(false);
    }
  }

  return <section className="panel hub-update-operator" id="hub-system-update"
    aria-labelledby="hub-update-heading">
    <div className="hub-update-heading">
      <div><p className="eyebrow">Windows client · owner control</p>
        <h2 id="hub-update-heading">Update Hub</h2></div>
      <CardHelp title="Will this restart my Windows PC?">
        No. This requests only an already-authorized local Windows release task. The
        task verifies the newest GREEN main, backups, schema, the original Windows
        listeners and rollback before changing Hub API/web services. It never reboots
        Windows, Home Assistant, MQTT, cameras, Ollama or the private relay.
      </CardHelp>
    </div>
    <p>We can update the client from here <strong>after</strong> the Windows release
      task has been enrolled and a recoverable baseline verified. This panel cannot
      appear in a browser still running the old frontend.</p>
    <p><strong>Need a client restart?</strong> Use <strong>Restart Client</strong> in the top bar.
      It checks the local web server and reloads this window without Ctrl+F5. A restart
      cannot replace the old 0.0.57 files or restart a Windows service; first install
      the approved release through the supervised workflow.</p>
    <div className="hub-update-stats">
      <div><span>Browser build</span><strong>{browserBuild.sha?.slice(0, 12) ?? "Unverified"}</strong></div>
      <div><span>Active managed release</span><strong>{status?.active_release?.slice(0, 12) ?? "Not installed / unknown"}</strong></div>
      <div><span>Release task</span><strong>{status?.adoption_task?.replaceAll("_", " ") ?? "Unknown"}</strong></div>
      <div><span>Update state</span><strong>{status?.adoption_state ?? "Not checked"}</strong></div>
    </div>
    {status && <p role="status">
      {status.state === "ready_to_request"
        ? "Enrolled task found; controller will still perform independent GREEN, backup and schema checks."
        : "Update held until the supervised Windows release setup or a recorded failure is resolved."}
    </p>}
    {!!status?.blockers.length && <ul className="hub-update-blockers">
      {status.blockers.map(blocker => <li key={blocker}>{hubUpdateBlockerLabel(blocker)}</li>)}
    </ul>}
    {status && <aside className="hub-update-next-step" aria-label="Recommended next action">
      <strong>Next safe step</strong>
      <p>{hubUpdateNextStep(status.blockers, status.adoption_state)}</p>
      <small>Read-only guidance · no Windows task or service is changed by viewing this panel.</small>
    </aside>}
    <div className="hub-update-actions">
      <button type="button" disabled={loading} onClick={() => {
        setLoading(true); void check().finally(() => setLoading(false));
      }}>{loading ? "Checking…" : "Check installed update status"}</button>
      <label className="hub-update-consent">
        <input type="checkbox" checked={consent} disabled={status?.state !== "ready_to_request"}
          onChange={event => setConsent(event.target.checked)} />
        We approve the existing enrolled Windows task to check and attempt the latest
        verified release. A change may briefly interrupt Hub access; rollback stays enabled.
      </label>
      <button type="button" className="hub-action-primary"
        disabled={!consent || requesting || status?.state !== "ready_to_request"}
        onClick={() => void request()}>
        {requesting ? "Requesting…" : "Install approved update"}
      </button>
    </div>
    {follow && <p role="status">Watching local release status. After the exact new managed
      release is recorded, the client will reload automatically. No Ctrl+F5 needed.</p>}
    {notice && <p role="status">{notice}</p>}
    <p><small>First-time Windows enrollment is separate, not bypassed from a web page.
      Use the documented <code>docs/WINDOWS_RELEASE_SLOTS.md</code> supervised
      bootstrap once. Only the owner/administrator on the Windows host may request
      installation; remote clients can inspect status but not trigger host changes.</small></p>
  </section>;
}

/** Check for an updated managed release periodically even when not on the System screen.
    Only a new committed, local active pointer can trigger a single network-first reload. */
export function HubUpdateRefreshObserver() {
  useEffect(() => {
    let live = true;
    async function tick() {
      try {
        const status = await getHubUpdateControl();
        if (live) autoRefreshIfInstalled(status);
      } catch { /* Older backend / offline PC: never reload in a loop. */ }
    }
    void tick();
    const id = window.setInterval(() => void tick(), 60000);
    return () => { live = false; window.clearInterval(id); };
  }, []);
  return null;
}
