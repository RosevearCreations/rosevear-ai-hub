import {useEffect, useState} from "react";

import {
  bootContract381, classifyBoot381,
  type BootClassification381, type BootProbe381,
} from "./api";
import "./BootRecovery381.css";

const COMMAND_BEFORE = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\inspect-boot-sequence381.ps1 -Phase Before";
const COMMAND_AFTER = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\inspect-boot-sequence381.ps1 -Phase After";

export function parseBootProbe381(text: string, phase: "before" | "after"): BootProbe381 {
  if (text.length > 16000) throw new Error("Only a bounded, sanitized report under 16 KB is accepted.");
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("Paste the single complete JSON report produced by the local inspector.");
  }
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new Error("The report must be one JSON object.");
  }
  const probe = value as Record<string, unknown>;
  if (probe.schema !== "rosevear.hub.boot-sequence381.report.v1" ||
    probe.phase !== phase ||
    probe.source !== "UNSIGNED_LOCAL_WINDOWS_READ_ONLY" ||
    probe.operations_performed !== false ||
    probe.reboot_independently_verified !== false ||
    probe.external_witness_verified !== false) {
    throw new Error("Unsupported source/phase or report claims actions or independent witness.");
  }
  return probe as unknown as BootProbe381;
}

export function BootRecovery381() {
  const [before, setBefore] = useState("");
  const [after, setAfter] = useState("");
  const [contract, setContract] = useState<Awaited<ReturnType<typeof bootContract381>> | null>(null);
  const [result, setResult] = useState<BootClassification381 | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    bootContract381(controller.signal).then(data => {
      if (!controller.signal.aborted) setContract(data);
    }).catch(() => {
      if (!controller.signal.aborted) setError(
        "Could not load the private boot-sequencing API. Verify the installed Hub version.",
      );
    });
    return () => controller.abort();
  }, []);

  async function inspect() {
    if (busy) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const current = parseBootProbe381(after, "after");
      const baseline = before.trim() ? parseBootProbe381(before, "before") : null;
      const result = await classifyBoot381(baseline, current);
      setResult(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to classify bounded boot evidence.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="boot381">
    <header className="page-header">
      <div>
        <p className="eyebrow">Build 381 · Original Windows Hub</p>
        <h1>Boot Sequencing &amp; Local Recovery</h1>
        <p className="lede">Compare fixed, read-only Windows dependency observations before
          and after a supervised reboot. <strong>No computer reboot, service start,
          firewall/router modification or scheduled-task enrollment is performed here.</strong></p>
      </div>
    </header>

    <section className="panel">
      <h2>Existing unattended boot must remain under owner supervision</h2>
      <p>The existing Build 356/357 Task Scheduler registrations, original pinned
        VirtualBox Home Assistant VM and guarded Hub recovery are reused.
        Unknown task identity, a login-only task, or a successful exit code
        cannot certify pre-login recovery.</p>
      <p>Before any real reboot, independently verify a restorable Hub database backup,
        separate VirtualBox/Home Assistant backup, current schema, exact task
        identities and available rollback. Never run a duplicate task installer.</p>
      <h3>On the original Windows PC, in the existing Hub repository</h3>
      <p><strong>Before</strong> an owner-supervised reboot, run:</p>
      <pre>{COMMAND_BEFORE}</pre>
      <p>After a genuine Windows restart, run:</p>
      <pre>{COMMAND_AFTER}</pre>
      <p>Each returns one secret-free JSON observation. Keep full raw logs and
        any local task action/account/path private. The script reads only existing
        status and fixed loopback HTTP endpoints.</p>
    </section>

    <section className="panel">
      <h2>Import local read-only observations</h2>
      <p>All inputs are session-only. Pasting them here cannot authorize
        a task, VM, router or service change. Windows reports are unsigned;
        an independent device witness remains necessary.</p>
      <div className="boot381-inputs">
        <label>Before-reboot report (optional; needed to detect a new boot time)
          <textarea rows={5} value={before} maxLength={16000}
            onChange={event => {setBefore(event.target.value);setResult(null);}}
            placeholder='{"schema":"rosevear.hub.boot-sequence381.report.v1","phase":"before",...}' />
        </label>
        <label>After-reboot report (required)
          <textarea rows={5} value={after} maxLength={16000}
            onChange={event => {setAfter(event.target.value);setResult(null);}}
            placeholder='{"schema":"rosevear.hub.boot-sequence381.report.v1","phase":"after",...}' />
        </label>
      </div>
      <div className="boot381-actions">
        <button type="button" className="primary-button" disabled={busy || !after.trim()}
          onClick={() => void inspect()}>{busy ? "Classifying…" : "Compare boot dependencies"}</button>
        <button type="button" disabled={busy} onClick={() => {
          setBefore("");setAfter("");setResult(null);setError("");
        }}>Clear local review</button>
      </div>
      {error && <p role="alert">{error}</p>}
    </section>

    {result ? <section className="panel">
      <h2>Dependency recovery findings</h2>
      <p role="status"><strong>FIELD HOLD</strong> — neither a self-observation nor
        a changed Windows boot timestamp proves unattended recovery.
        Independent signed owner and off-device pre-login acceptance are still required.</p>
      <p>New OS boot time observed in imported reports:
        <strong> {result.newBootTimeObserved ? "yes (local only)" : "no / unknown"}</strong>.
        Reboot independently certified: <strong>no</strong>.</p>
      <p>After sample: {new Date(result.capturedAtUtc).toLocaleString()}.</p>
      <div className="boot381-grid" aria-label="Ordered Windows startup stages">
        {result.stages.map((stage, i) => <article key={stage.id}>
          <h3>{i + 1}. {stage.label}</h3>
          <p>Observation: {stage.reportedObservation.replaceAll("_", " ")}</p>
          <p>Status: <strong>{stage.state.replaceAll("_", " ")}</strong></p>
          {stage.dependsOn.length > 0 && <p>Prerequisites: {stage.dependsOn.join(", ")}</p>}
          {stage.blockedBy.length > 0 && <p>Blocked by: {stage.blockedBy.join(", ")}</p>}
          <small>{stage.safeManualAction}</small>
        </article>)}
      </div>
      <h3>Required follow-ups / hold reasons</h3>
      <ul>{result.holdReasons.map(reason =>
        <li key={reason}>{reason.replaceAll("_", " ").toLowerCase()}</li>)}</ul>
      <p>Even a healthy-looking local 8443 listener does not prove TLS, Caddy
        identity, a correct DHCP reservation, authenticated Home Assistant MQTT
        or availability from another trusted device at Windows login.</p>
    </section> : <section className="panel">
      <h2>Dependency stages</h2>
      <p>Source-defined ordering only. No real original-host observations are loaded.</p>
      <ol>{contract?.stages.map(stage => <li key={stage.id}>
        <strong>{stage.label}</strong> — {stage.safeManualAction}
      </li>)}</ol>
    </section>}
    <section className="panel">
      <h2>Independent final field acceptance</h2>
      <p>To move original Windows production from HOLD, verify exact authorized
        task identities, password-backed startup triggers, restore-ready off-device
        backups, original VM continuity, authenticated HA/MQTT and live camera
        streams, correct LAN IP reservation, and HTTPS from a trusted second device
        <strong> before anyone signs in to Windows</strong>. Then compare task
        history with the OS boot time and verify a safe rollback route.</p>
      <p>Build 381 does not install or enable tasks and does not claim that
        our original Windows PC or private-LAN gateway has passed that ceremony.</p>
    </section>
  </div>;
}
