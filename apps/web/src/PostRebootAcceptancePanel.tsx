import { useState } from "react";

import {
  getCameras, getGo2RTCStatus, getHealth, getHomeAssistantBrowser,
  getHomeAssistantStatus, getHubVersion, getMQTTStatus, getOllamaStatus,
} from "./api";
import {
  assessRebootContinuity, buildRebootSnapshot, parseRebootBaseline,
  type RebootSnapshot,
} from "./postRebootAcceptance";

const manualChecks = [
  { key: "task", label: "We inspected the existing Windows 'Rosevear AI Server Startup' task and its latest task history; no duplicate task or service instance was launched." },
  { key: "vm", label: "We observed the original Home Assistant VirtualBox VM running with its existing EFI configuration, then waited for Home Assistant readiness." },
  { key: "broker", label: "We confirmed Home Assistant and MQTT with their existing authenticated integration screens; no test device command or MQTT publish was sent." },
  { key: "ollama", label: "We checked Ollama and a local installed model without exposing or downloading a provider credential." },
  { key: "client", label: "We independently loaded the Hub over the existing private HTTPS route from an authorized LAN/Tailscale client, with TLS verified and normal login." },
  { key: "camera", label: "We reviewed our registered cameras and, for each required feed, manually confirmed moving video using the Build 116 supervised private viewer." },
] as const;

type CheckKey = typeof manualChecks[number]["key"];
const orderedServices = ["hub", "homeAssistant", "mqtt", "ollama", "go2rtc"] as const;
const serviceLabels = { hub: "Hub API", homeAssistant: "Home Assistant", mqtt: "MQTT", ollama: "Ollama", go2rtc: "Private go2rtc" };

export function PostRebootAcceptancePanel({ onNavigate }: { onNavigate: (section: string) => void }) {
  const [before, setBefore] = useState<RebootSnapshot | null>(null);
  const [after, setAfter] = useState<RebootSnapshot | null>(null);
  const [manual, setManual] = useState<CheckKey[]>([]);
  const [importText, setImportText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [expanded, setExpanded] = useState(false);

  const comparison = assessRebootContinuity(before, after);
  const reviewReady = comparison.complete && manualChecks.every(check => manual.includes(check.key));

  async function capture(which: "before" | "after") {
    setBusy(true);
    setMessage("");
    try {
      // No requests are issued automatically on page load or after a reboot.
      const [health, version, homeAssistant, mqtt, ollama, go2rtc, haInventory, cameras] = await Promise.allSettled([
        getHealth(), getHubVersion(), getHomeAssistantStatus(), getMQTTStatus(),
        getOllamaStatus(), getGo2RTCStatus(), getHomeAssistantBrowser(), getCameras(),
      ]);
      const snapshot = buildRebootSnapshot({ health, version, homeAssistant, mqtt, ollama, go2rtc, haInventory, cameras });
      if (which === "before") {
        setBefore(snapshot);
        setAfter(null);
      } else {
        setAfter(snapshot);
      }
      setManual([]);
      setMessage(which === "before" ? "Private baseline captured. Save its JSON locally before any owner-supervised reboot."
        : "Fresh post-reboot snapshot captured. Compare differences and complete real Windows/client/camera checks.");
    } catch {
      setMessage("Snapshot could not be assembled. No startup or integration state was modified.");
    } finally {
      setBusy(false);
    }
  }

  function importBaseline() {
    try {
      const parsed = parseRebootBaseline(importText);
      setBefore(parsed);
      setAfter(null);
      setManual([]);
      setImportText("");
      setMessage("Private baseline imported for comparison. Take a new post-reboot snapshot only after manual verification.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Invalid baseline.");
    }
  }

  function clear() {
    setBefore(null);
    setAfter(null);
    setImportText("");
    setManual([]);
    setMessage("Session-only reboot review cleared.");
  }

  return (
    <section className="panel reboot-review" aria-label="Build 117 supervised post-reboot acceptance">
      <header className="reboot-review-header">
        <div>
          <p className="eyebrow">Build 117 · owner-supervised</p>
          <h2>Post-reboot acceptance runbook</h2>
          <p>Compare exact Home Assistant and Hub camera identities before and after an owner-supervised Windows reboot. This page never reboots, starts, stops, repairs, or reconfigures services.</p>
        </div>
        <span className={reviewReady ? "camera-acceptance-pill is-reviewed" : "camera-acceptance-pill"}>
          {reviewReady ? "Session review ready" : "Field acceptance on hold"}
        </span>
      </header>

      <details className="camera-acceptance-help">
        <summary><span aria-hidden="true">i</span> Runbook help and safe startup order</summary>
        <ol>
          <li>Inspect an existing restorable backup, database schema, startup task and VM ownership. Use repository inspectors in ordinary PowerShell; do not run any install/reset commands.</li>
          <li>Capture the <strong>before</strong> snapshot and privately retain its JSON. Do not share device IDs publicly.</li>
          <li>If we choose to reboot Windows ourselves, allow the <strong>original Home Assistant VM → Home Assistant/MQTT → Ollama → Hub API/HTTPS gateway → private camera relay</strong> to become ready in that order. Never launch duplicates.</li>
          <li>After restart and authentication, import the baseline and capture the <strong>after</strong> snapshot. Check exact identity differences instead of relying on counts alone.</li>
          <li>Confirm existing scheduled task history, actual private HTTPS client access, and real camera moving video separately. Any uncertainty stays on hold.</li>
        </ol>
      </details>

      <div className="reboot-review-actions">
        <button type="button" disabled={busy} onClick={() => void capture("before")}>1 · Capture before reboot</button>
        <button type="button" disabled={busy || !before} onClick={() => void capture("after")}>2 · Capture after manual reboot</button>
        <button type="button" disabled={busy} onClick={clear}>Clear session</button>
        <button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
          {expanded ? "Hide private baseline" : "Show private baseline / import"}
        </button>
      </div>

      {expanded ? (
        <div className="reboot-review-import">
          <label>Before-reboot JSON — private, identity-only evidence (never passwords, URLs or logs)
            <textarea readOnly rows={7} value={before ? JSON.stringify(before, null, 2) : "No baseline yet."} />
          </label>
          <label>Paste a previously saved baseline after Windows restart
            <textarea rows={5} value={importText} onChange={event => setImportText(event.target.value)}
              placeholder="Paste only a Build 117 private baseline JSON" />
          </label>
          <button type="button" disabled={busy || !importText.trim()} onClick={importBaseline}>Validate and import baseline</button>
        </div>
      ) : null}

      <div className="reboot-review-snapshots">
        <article>
          <h3>Before</h3>
          <p>{before ? `Captured ${new Date(before.capturedAt).toLocaleString()}` : "Not captured"}</p>
          <p>Hub version: {before?.hubVersion ?? "Not verified"}</p>
          <p>HA identities: {before?.haEntityIds?.length ?? "Not verified"} · Camera identities: {before?.cameraIds?.length ?? "Not verified"}</p>
        </article>
        <article>
          <h3>After</h3>
          <p>{after ? `Captured ${new Date(after.capturedAt).toLocaleString()}` : "Not captured"}</p>
          <p>Hub version: {after?.hubVersion ?? "Not verified"}</p>
          <p>HA identities: {after?.haEntityIds?.length ?? "Not verified"} · Camera identities: {after?.cameraIds?.length ?? "Not verified"}</p>
        </article>
      </div>
      {after && before ? (
        <>
          <div className="reboot-review-service-grid" aria-label="Service comparison">
            {orderedServices.map(key => (
              <div key={key}>
                <strong>{serviceLabels[key]}</strong>
                <span>Before: {before.services[key]}</span>
                <span>After: {after.services[key]}</span>
              </div>
            ))}
          </div>
          <p className={comparison.complete ? "camera-acceptance-note" : "camera-acceptance-hold"}>
            Device identities: {comparison.ha.state}; camera identities: {comparison.cameras.state}.
            {comparison.services.length ? ` Service holds: ${comparison.services.map(key => serviceLabels[key]).join(", ")}.` : " Service states stable and available."}
            {!comparison.orderVerified ? " A later post-reboot capture is required." : ""}
            {!comparison.versionVerified ? " Hub version was not verified unchanged." : ""}
            {!comparison.devicesObserved ? " At least one HA entity and one registered camera must be present in the baseline for this acceptance." : ""}
          </p>
          {(["ha", "cameras"] as const).map(kind => {
            const delta = comparison[kind];
            return delta.state === "changed" ? (
              <details key={kind}>
                <summary>{kind === "ha" ? "Home Assistant" : "Camera"} identity differences — {delta.missing.length} missing, {delta.added.length} added</summary>
                <p>Missing: {delta.missing.slice(0, 30).join(", ") || "None"}</p>
                <p>Added: {delta.added.slice(0, 30).join(", ") || "None"}</p>
                <p>Only the first 30 of each category appear. Diagnose without automatically creating or removing entries.</p>
              </details>
            ) : null;
          })}
          <h3>Manual field confirmations</h3>
          <p>Check only steps we personally observed on the installed Windows Hub. A matching API inventory cannot prove unattended startup, private HTTPS or actual moving camera video.</p>
          <div className="reboot-review-checks">
            {manualChecks.map(check => (
              <label key={check.key}>
                <input type="checkbox" checked={manual.includes(check.key)}
                  onChange={event => setManual(current => event.target.checked
                    ? [...current, check.key] : current.filter(key => key !== check.key))} />
                {check.label}
              </label>
            ))}
          </div>
          <p role="status">{reviewReady
            ? "Session evidence reviewed. A separate approved installed-Windows handoff remains required; no automatic acceptance receipt was persisted."
            : "HOLD: chronological captures, stable Hub version, nonempty exact before/after inventories, service states and all six physical/manual checks must agree."}</p>
          <div className="camera-actions">
            <button type="button" onClick={() => onNavigate("Devices")}>Review Devices</button>
            <button type="button" onClick={() => onNavigate("MQTT")}>Review MQTT</button>
            <button type="button" onClick={() => onNavigate("Cameras")}>Review Cameras</button>
          </div>
        </>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
      <p className="camera-acceptance-privacy">No service start/stop/reboot buttons, localStorage, cookies, server writes, automatic polling, camera probes or device controls are used here. The baseline must be kept private; it contains exact identity IDs. Windows installation and field acceptance remain separate from GitHub CI.</p>
    </section>
  );
}
