import { useEffect, useRef, useState } from "react";

import {
  getFrigateStatus, getGo2RTCStatus, getHealth, getHomeAssistantStatus,
  getMQTTStatus, getOllamaStatus, getReleaseObservability,
} from "./api";
import {
  assessStartup, buildStartupSnapshot, createStartupReceipt, parseWindowsStartupEvidence,
  runtimeLabels, runtimeOrder, taskLabels,
  type StartupSnapshot, type WindowsStartupEvidence, type WindowsTask,
} from "./startupRecoveryModel";

const manualChecks = [
  { key: "task", label: "I inspected original Windows task history and confirmed there is no duplicate Hub or VM instance." },
  { key: "vm", label: "I inspected the original VirtualBox Home Assistant VM, its identity and EFI boot configuration." },
  { key: "ha", label: "I checked the original Home Assistant web interface after Windows startup." },
  { key: "mqtt", label: "I checked broker authentication and the expected Home Assistant MQTT integration without publishing." },
  { key: "private", label: "I checked signed-in private HTTPS access from a separate authorized device." },
  { key: "camera", label: "I viewed moving video from required cameras and confirmed Frigate and go2rtc are local-only." },
] as const;

type CheckKey = typeof manualChecks[number]["key"];
const taskOrder: WindowsTask[] = ["server", "hub", "recovery"];
const nextAction: Record<string, string> = {
  home_assistant: "Inspect original VirtualBox VM state, then Home Assistant startup logs; do not create a second VM.",
  mqtt: "Check the existing broker and authenticated Home Assistant integration before attempting any reconnect.",
  ollama: "Verify the configured local Ollama process and installed model, without downloading anything.",
  hub: "Inspect the existing scheduled task, Hub log and private HTTPS listener on the Windows host.",
  go2rtc: "Review loopback-only relay settings and authorized moving-video evidence in Cameras.",
  frigate: "Inspect local Frigate integration status and camera event timestamps; don't scan the network.",
};

/** Read-only operations view. No start/stop, task install, retry, publish or automatic polling. */
export function StartupRecoveryConsole({ onNavigate }: { onNavigate: (section: string) => void }) {
  const [baseline, setBaseline] = useState<StartupSnapshot | null>(null);
  const [current, setCurrent] = useState<StartupSnapshot | null>(null);
  const [windows, setWindows] = useState<WindowsStartupEvidence | null>(null);
  const [importText, setImportText] = useState("");
  const [manual, setManual] = useState<CheckKey[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  const assessment = assessStartup(current, baseline, windows, manual);

  async function inspect(kind: "baseline" | "current") {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setNotice("");
    // Explicit GET only. Independent errors are fail-closed; never retain raw API bodies.
    try {
      const [health, ha, mqtt, ollama, go2rtc, frigate, release] = await Promise.allSettled([
        getHealth(request.signal), getHomeAssistantStatus(request.signal), getMQTTStatus(request.signal),
        getOllamaStatus(request.signal), getGo2RTCStatus(request.signal), getFrigateStatus(request.signal),
        getReleaseObservability(request.signal),
      ]);
      if (controller.current !== request || request.signal.aborted) return;
      const snapshot = buildStartupSnapshot({ health, ha, mqtt, ollama, go2rtc, frigate, release });
      if (kind === "baseline") {
        setBaseline(snapshot);
        setCurrent(null);
        setNotice("Before-recovery baseline captured in this browser session. Manually inspect or restart Windows only through your existing authorized procedure, then capture a new snapshot.");
      } else {
        setCurrent(snapshot);
        setNotice("Fresh, read-only API classifications captured. Service responses do not prove a successful Windows reboot or functional cameras.");
      }
      setManual([]);
    } finally {
      if (controller.current === request) setBusy(false);
    }
  }

  function importWindows() {
    try {
      setWindows(parseWindowsStartupEvidence(importText));
      setManual([]);
      setImportText("");
      setNotice("Classified task report imported. This is operator-supplied, not independently authenticated Windows evidence.");
    } catch (error) {
      setWindows(null);
      setManual([]);
      setImportText("");
      setNotice(error instanceof Error ? error.message : "Invalid Windows task report.");
    }
  }

  function clear() {
    controller.current?.abort();
    setBusy(false);
    setBaseline(null);
    setCurrent(null);
    setWindows(null);
    setManual([]);
    setImportText("");
    setNotice("Session-only startup/recovery review cleared.");
  }

  function download() {
    if (!current) return;
    const receipt = createStartupReceipt(current, baseline, windows, assessment, manual);
    const url = URL.createObjectURL(new Blob([`${JSON.stringify(receipt, null, 2)}\n`], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `rosevear-startup-operator-review-${current.capturedAt.slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Private, classification-only receipt downloaded. Installed Windows acceptance remains HOLD.");
  }

  return (
    <section className="panel startup-console" aria-label="Build 146 Windows startup and recovery operations console">
      <header className="startup-console-header">
        <div>
          <p className="eyebrow">Build 146 · Windows operations</p>
          <h2>Service startup &amp; recovery console</h2>
          <p>Review Windows task evidence alongside on-demand Hub, Home Assistant, MQTT, Ollama and camera services. Each check is observational; no process or equipment is controlled.</p>
        </div>
        <span className="camera-acceptance-pill">Windows field acceptance: HOLD</span>
      </header>

      <details className="camera-acceptance-help">
        <summary><span aria-hidden="true">i</span> Safe recovery order and interpretation</summary>
        <ol>
          <li>Inspect the existing <strong>Rosevear AI Server Startup</strong> scheduled task and managed Hub tasks locally. Do not install duplicates or assume task presence proves launch.</li>
          <li>Confirm the original VirtualBox Home Assistant VM is running before interpreting its API; never create a duplicate VM or change EFI settings from this screen.</li>
          <li>Review the original MQTT connection, Ollama service and Hub HTTPS reachability. Readonly checks cannot authenticate that a service started at boot.</li>
          <li>Check go2rtc/Frigate locally and manually confirm real camera moving video in the authorized private viewer.</li>
          <li>For a planned Windows reboot, capture a baseline, use the approved local procedure, capture a later snapshot, compare and complete actual manual checks. Preserve any failures as HOLD.</li>
        </ol>
      </details>

      <div className="startup-console-actions">
        <button type="button" disabled={busy} onClick={() => void inspect("baseline")}>1 · Capture before Windows maintenance</button>
        <button type="button" disabled={busy} onClick={() => void inspect("current")}>{busy ? "Reading services…" : "2 · Refresh read-only service status"}</button>
        <button type="button" onClick={clear}>Clear session</button>
        <button type="button" disabled={!current} onClick={download}>Download private review receipt</button>
      </div>

      <div className="startup-console-import">
        <label htmlFor="startup-console-task-report">3 · Paste sanitized Windows task report from <code>scripts/inspect-hub-startup-console.ps1</code></label>
        <textarea id="startup-console-task-report" rows={4} maxLength={10001} value={importText}
          onChange={event => setImportText(event.target.value)}
          placeholder="Paste only the locally generated classified JSON. Never paste task commands, paths, logs or credentials." />
        <button type="button" disabled={!importText.trim()} onClick={importWindows}>Validate and import task classifications</button>
      </div>
      {notice && <p role="status">{notice}</p>}

      <div className="startup-console-grid" aria-label="Windows startup task observations">
        {taskOrder.map(key => (
          <article key={key}>
            <strong>{taskLabels[key]}</strong>
            <p>Task: {windows?.tasks[key].state.replaceAll("_", " ") ?? "not independently observed"}</p>
            <p>Last task result: {windows?.tasks[key].lastRun.replaceAll("_", " ") ?? "unverified"}</p>
            <p>Current boot: {windows?.tasks[key].bootCorrelation.replaceAll("_", " ") ?? "unverified"}</p>
          </article>
        ))}
      </div>
      <p><small>Windows evidence: {windows?.observedAt ? new Date(windows.observedAt).toLocaleString() : "not imported"}. A task's recorded success is not proof of a running process, correct VM identity or full recovery.</small></p>

      <div className="startup-console-grid" aria-label="Runtime service observations">
        {runtimeOrder.map(key => (
          <article key={key}>
            <strong>{runtimeLabels[key]}</strong>
            <p>Before: {baseline?.runtime[key].replaceAll("_", " ") ?? "not captured"}</p>
            <p>Latest: {current?.runtime[key].replaceAll("_", " ") ?? "not checked"}</p>
            {current?.runtime[key] !== "available" && <small>{nextAction[key]}</small>}
          </article>
        ))}
      </div>
      <p>Before: {baseline ? new Date(baseline.capturedAt).toLocaleString() : "not captured"} · Latest: {current ? new Date(current.capturedAt).toLocaleString() : "not captured"}</p>
      <p className="camera-acceptance-hold">Comparison: {assessment.chronology.replaceAll("_", " ")}. {assessment.attention.length} unverified/unavailable runtime services; {assessment.taskAttention.length} startup task observations need investigation. Stable snapshots alone cannot establish a reboot occurred.</p>
      <p>Release controller (separate from the household startup task): adoption {current?.release?.adoption ?? "unverified"}, recovery task {current?.release?.recoveryTask ?? "unverified"}.</p>

      {current && <>
        <h3>Owner field review</h3>
        <p>These are session-only operator observations, not automated certificates. A fresh capture resets them.</p>
        <div className="startup-console-checks">
          {manualChecks.map(item => (
            <label key={item.key}>
              <input type="checkbox" checked={manual.includes(item.key)} onChange={event => setManual(previous =>
                event.target.checked ? [...previous, item.key] : previous.filter(key => key !== item.key))} />
              {item.label}
            </label>
          ))}
        </div>
        <p role="status"><strong>{assessment.ownerReviewReady ? "Owner review ready — physical acceptance still HOLD" : "HOLD — follow-up required"}.</strong>{" "}
          {assessment.ownerReviewReady ? "All source classifications and six self-checks agree, subject to independent installed-Windows acceptance." : "Review missing or stale task evidence, runtime states, chronology and each manual check."}</p>
      </>}

      <div className="startup-console-actions">
        <button type="button" onClick={() => onNavigate("Devices")}>Open Home Assistant devices</button>
        <button type="button" onClick={() => onNavigate("MQTT")}>Open MQTT</button>
        <button type="button" onClick={() => onNavigate("Cameras")}>Open camera review</button>
      </div>
      <p className="camera-acceptance-privacy">No automatic polling, task installation, process restart, VM boot, camera scan, MQTT publish, data migration, browser storage or server write is performed. Imported Windows JSON is operator-controlled and classification-only; exported receipts always retain the independent field acceptance HOLD.</p>
    </section>
  );
}
