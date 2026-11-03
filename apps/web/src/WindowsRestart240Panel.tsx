import { useState } from "react";
import { CardHelp } from "./CommandShell";
import { safeWindowsFieldReference, safeWindowsInstalledVersion } from "./windowsFieldAcceptance228";
import { defaultRestart240Draft, defaultRestart240Observation, defaultRestart240Reboot,
  exportRestart240Handoff, formatRestart240Packet, importRestart240Handoff,
  observation240Key, preflight240Key, reboot240Key, restart240Dependencies,
  summarizeRestart240, type Restart240DependencyId, type Restart240Observation,
  type Restart240Preflight, type Restart240Reboot, type Restart240Source,
  type Restart240Status } from "./windowsRestart240";

const gateLabels: Record<string, string> = {
  scope_missing: "Record the installed Windows Hub version", backup_missing: "Check separate restore-ready backup codes",
  preflight_duplicate: "Use unique preflight backup/baseline codes",
  preflight_checks_missing: "Pause work, inspect startup tasks and original HA VM",
  baseline_missing: "Record a distinct baseline receipt code",
  baseline_stale: "Capture the complete owner preflight baseline",
  preflight_ready: "Owner preflight code recorded; actual reboot still separate",
  preflight_hold: "Preflight HOLD — no restart outcome inferred",
  await_supervised_restart: "Await an actual owner-supervised Windows restart",
  restart_witness_missing: "Owner restart and sign-in witness missing",
  restart_reference_missing: "New reboot receipt code required",
  restart_reference_duplicate: "Reboot receipt duplicates preflight evidence",
  restart_time_invalid: "Restart observation must be after preflight",
  restart_snapshot_stale: "Re-record changed restart observation",
  recovery_wait_missing: "Observe at least one full five-minute recovery cycle",
  reboot_recorded: "Owner reboot and recovery wait recorded; verify each dependency",
  await_restart: "Restart evidence required before this check",
  not_checked: "Not checked — unresolved",
  failed: "Owner-reported failure — HOLD",
  partial: "Owner-reported partial recovery — HOLD",
  not_configured: "Not configured / unverified — HOLD",
  evidence_missing: "Source and distinct safe evidence code required",
  duplicate_reference: "Evidence code already used",
  evidence_stale: "Re-record source-bound observation after the restart",
  owner_observed_working: "Working — owner observed only",
};

/** Owner-only, session-state restart worksheet. It has no PC restart or network capability. */
export function WindowsRestart240Panel() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(defaultRestart240Draft);
  const [importText, setImportText] = useState("");
  const [notice, setNotice] = useState("");
  const summary = summarizeRestart240(draft);
  const preflightReady = summary.preflightGate === "preflight_ready";
  const rebootReady = summary.rebootGate === "reboot_recorded";

  function updatePreflight(change: Partial<Restart240Preflight>) {
    setDraft(current => ({ preflight: { ...current.preflight, ...change,
      recordedAt: "", snapshotKey: "" }, reboot: defaultRestart240Reboot, observations: {} }));
    setNotice("");
  }
  function recordPreflight() {
    const p = draft.preflight;
    if (!p.workPaused || !p.tasksInspected || !p.originalVmReviewed ||
      safeWindowsInstalledVersion(p.installedVersion).trim().length < 3 ||
      [p.hubBackupReference, p.haBackupReference, p.baselineReference].some(x => x.length < 4) ||
      new Set([p.hubBackupReference, p.haBackupReference, p.baselineReference]).size !== 3) {
      setNotice("Preflight HOLD: complete the real backup, startup-task and VM checks first.");
      return;
    }
    setDraft(current => ({ ...current, preflight: { ...current.preflight,
      recordedAt: new Date().toISOString(), snapshotKey: preflight240Key(current.preflight) },
      reboot: defaultRestart240Reboot, observations: {} }));
    setNotice("Owner preflight stamped. Copy its code-only JSON handoff and save privately BEFORE restarting Windows.");
  }
  function updateReboot(change: Partial<Restart240Reboot>) {
    setDraft(current => ({ ...current, reboot: { ...current.reboot, ...change,
      recordedAt: "", snapshotKey: "" }, observations: {} }));
    setNotice("");
  }
  function recordReboot() {
    const q = draft.reboot;
    if (!preflightReady || !q.witnessed || !q.signInObserved || q.reference.length < 4 ||
      [draft.preflight.hubBackupReference, draft.preflight.haBackupReference,
        draft.preflight.baselineReference].includes(q.reference) ||
      !Number.isFinite(q.waitedMinutes) || q.waitedMinutes < 5) {
      setNotice("Reboot HOLD: this button records a past, witnessed restart only, after sign-in and five minutes.");
      return;
    }
    setDraft(current => ({ ...current, reboot: { ...current.reboot,
      recordedAt: new Date().toISOString(), snapshotKey: reboot240Key(current.preflight, current.reboot) },
      observations: {} }));
    setNotice("Owner reported a supervised reboot. No Windows action was performed here; check each live dependency.");
  }
  function updateObservation(id: Restart240DependencyId, change: Partial<Restart240Observation>) {
    setDraft(current => ({ ...current, observations: {
      ...current.observations,
      [id]: { ...defaultRestart240Observation, ...current.observations[id], ...change,
        recordedAt: "", snapshotKey: "" },
    } }));
    setNotice("");
  }
  function recordObservation(id: Restart240DependencyId) {
    if (!rebootReady) return;
    const entry = draft.observations[id] ?? defaultRestart240Observation;
    if (entry.status === "not_checked" || entry.source === "none" || entry.reference.length < 4) {
      setNotice("Record a real dependency result, observed source and distinct safe evidence code first.");
      return;
    }
    setDraft(current => {
      const observation = { ...defaultRestart240Observation, ...current.observations[id] };
      return { ...current, observations: { ...current.observations,
        [id]: { ...observation, recordedAt: new Date().toISOString(),
          snapshotKey: observation240Key(current.reboot, id, observation) },
      } };
    });
    setNotice("Owner field observation recorded. Failures remain HOLD; no service was started or repaired.");
  }
  async function copy(text: string, kind: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(`${kind} copied. Keep the code-only record privately; nothing was transmitted.`);
    } catch {
      setNotice("Clipboard unavailable. The local worksheet has not been transmitted or saved elsewhere.");
    }
  }
  function importHandoff() {
    try {
      const next = importRestart240Handoff(importText);
      if (summarizeRestart240(next).preflightGate !== "preflight_ready") {
        setNotice("Import rejected: no current, matching Build 240 preflight baseline.");
        setImportText("");
        return;
      }
      setDraft(next);
      setNotice("Code-only handoff imported. Verify the installed version and restart facts; this is NOT authenticated evidence.");
    } catch {
      setNotice("Import rejected: invalid, oversized or incompatible Build 240 handoff.");
    }
    setImportText("");
  }

  return <section className="windows-restart-240 panel" id="hub-windows-restart-240"
    aria-labelledby="windows-restart-240-title">
    <header className="hub-search-header"><div>
      <p className="eyebrow">Build 240 · Supervised Windows restart</p>
      <h2 id="windows-restart-240-title">Startup evidence, dependency order &amp; recovery HOLD</h2>
    </div><CardHelp title="Does this restart our server or prove recovery?">
      No. This browser-session worksheet records what we personally observed on the installed Windows PC.
      It cannot reboot Windows, start a VM, query devices, restore backups, approve repairs or independently verify a service.
      Use the supervised Windows restart runbook and keep a separate code-only handoff before reboot.
    </CardHelp></header>
    <p>Before reboot: verify both off-machine Hub and separate HA backups, existing tasks, original VM,
      and paused workshop jobs. After Windows sign-in, wait through a five-minute recovery cycle,
      then observe each service and camera. No automatic repairs.</p>
    <div className="audit-summary" aria-label="Build 240 restart field evidence totals">
      <div><span>Owner-reported working</span><strong>{summary.working} / {summary.rows.length}</strong></div>
      <div><span>Failures / partial</span><strong>{summary.findings}</strong></div>
      <div><span>Unresolved checks</span><strong>{summary.outstanding}</strong></div>
      <div><span>Independent proof / actions</span><strong>0 / 0</strong></div>
    </div>
    <p role="status">Preflight: {gateLabels[summary.preflightGate]}. Restart: {gateLabels[summary.rebootGate]}.</p>
    <p><small>Owner-reported all services working: {summary.ownerReportedRecovery ? "YES — SELF-REPORT ONLY" : "NO / INCOMPLETE"}.
      Independent Windows acceptance: NO. Remote restart, repair, installation: NO.</small></p>
    {summary.firstBlocker && <p>First unresolved dependency: <strong>{summary.firstBlocker.title}</strong>.
      {" "}{summary.firstBlocker.next}</p>}
    <button type="button" aria-expanded={open} aria-controls="windows-restart-240-workbook"
      onClick={() => setOpen(value => !value)}>
      {open ? "Close Build 240 restart worksheet" : "Open Build 240 restart worksheet"}
    </button>
    {open && <div id="windows-restart-240-workbook" className="windows-restart-240-workbook">
      <h3>1 · Preflight on the real Windows host</h3>
      <div className="windows-triage-229-fields">
        <label htmlFor="restart-240-version">Actually installed Hub version (not GitHub main)
          <input id="restart-240-version" maxLength={60} value={draft.preflight.installedVersion}
            onChange={e => updatePreflight({ installedVersion: safeWindowsInstalledVersion(e.target.value) })}
            placeholder="Installed version or local build code" /></label>
        <label htmlFor="restart-240-hub-backup">Off-machine Hub backup / isolated restore receipt
          <input id="restart-240-hub-backup" maxLength={80} value={draft.preflight.hubBackupReference}
            onChange={e => updatePreflight({ hubBackupReference: safeWindowsFieldReference(e.target.value) })}
            placeholder="WIN240-HUB-BACKUP" /></label>
        <label htmlFor="restart-240-ha-backup">Separate HA VM/HA backup / restore receipt
          <input id="restart-240-ha-backup" maxLength={80} value={draft.preflight.haBackupReference}
            onChange={e => updatePreflight({ haBackupReference: safeWindowsFieldReference(e.target.value) })}
            placeholder="WIN240-HA-BACKUP" /></label>
        <label htmlFor="restart-240-baseline">Distinct before-reboot baseline code
          <input id="restart-240-baseline" maxLength={80} value={draft.preflight.baselineReference}
            onChange={e => updatePreflight({ baselineReference: safeWindowsFieldReference(e.target.value) })}
            placeholder="WIN240-BASELINE" /></label>
      </div>
      <label className="windows-appearance-236-check"><input type="checkbox" checked={draft.preflight.workPaused}
        onChange={e => updatePreflight({ workPaused: e.target.checked })} />
        We paused or safely finished jobs that cannot survive a power interruption.</label>
      <label className="windows-appearance-236-check"><input type="checkbox" checked={draft.preflight.tasksInspected}
        onChange={e => updatePreflight({ tasksInspected: e.target.checked })} />
        We inspected existing server / Hub Startup / Recovery / LAN Gateway task history without installing duplicates.</label>
      <label className="windows-appearance-236-check"><input type="checkbox" checked={draft.preflight.originalVmReviewed}
        onChange={e => updatePreflight({ originalVmReviewed: e.target.checked })} />
        We identified the original Home Assistant VirtualBox guest and its expected EFI settings.</label>
      <button type="button" onClick={recordPreflight}>Record owner preflight baseline</button>
      <p><small>Preflight recorded: {draft.preflight.recordedAt || "not recorded"}.
        Save the code-only JSON below *outside this browser session* before restarting Windows.</small></p>
      <div className="windows-appearance-236-followup">
        <h3>Safe handoff across the actual restart</h3>
        <button type="button" disabled={!preflightReady}
          onClick={() => void copy(exportRestart240Handoff(draft), "Build 240 JSON handoff")}>
          Copy preflight / progress JSON for private storage</button>
        <label htmlFor="restart-240-import">Paste previously saved Build 240 code-only JSON after Windows sign-in
          <textarea id="restart-240-import" rows={4} maxLength={15000} value={importText}
            onChange={e => setImportText(e.target.value)}
            placeholder="Paste the private Build 240 JSON handoff; never raw logs or credentials" /></label>
        <button type="button" disabled={!importText.trim()} onClick={importHandoff}>
          Import and validate saved preflight</button>
      </div>
      <h3>2 · Record actual supervised restart after sign-in</h3>
      <p>The original HA VM may not auto-start. Observe it separately; never create a duplicate.
        Wait at least five minutes for the existing recovery task before investigating.</p>
      <label className="windows-appearance-236-check"><input type="checkbox" disabled={!preflightReady}
        checked={draft.reboot.witnessed} onChange={e => updateReboot({ witnessed: e.target.checked })} />
        We actually supervised a normal Windows restart. This checkbox does not restart the machine.</label>
      <label className="windows-appearance-236-check"><input type="checkbox" disabled={!preflightReady}
        checked={draft.reboot.signInObserved} onChange={e => updateReboot({ signInObserved: e.target.checked })} />
        We observed a Windows sign-in and existing task startup afterward.</label>
      <div className="windows-triage-229-fields">
        <label htmlFor="restart-240-reboot-ref">New distinct owner restart evidence code
          <input id="restart-240-reboot-ref" maxLength={80} disabled={!preflightReady}
            value={draft.reboot.reference}
            onChange={e => updateReboot({ reference: safeWindowsFieldReference(e.target.value) })}
            placeholder="WIN240-REBOOT" /></label>
        <label htmlFor="restart-240-wait">Recovery cycle observed (minutes, minimum 5)
          <input id="restart-240-wait" type="number" min="0" max="1440" step="1"
            disabled={!preflightReady} value={draft.reboot.waitedMinutes}
            onChange={e => updateReboot({ waitedMinutes: Math.min(1440, Math.max(0,
              Number(e.target.value) || 0)) })} /></label>
      </div>
      <button type="button" disabled={!preflightReady} onClick={recordReboot}>
        Record witnessed restart AFTER the recovery wait</button>
      <p><small>Owner restart report time: {draft.reboot.recordedAt || "not recorded"}.</small></p>
      <h3>3 · Check each dependency in recovery order</h3>
      <div className="windows-appearance-236-grid" aria-label="Build 240 startup dependency reconciliation">
        {summary.rows.map(row => <article key={row.id} className="windows-triage-229-card">
          <div className="windows-triage-229-card-head"><h4>{row.title}</h4>
            <span className="windows-field-228-state">{gateLabels[row.gate]}</span></div>
          <p>{row.next}</p>
          <div className="windows-triage-229-fields">
            <label htmlFor={`restart-240-status-${row.id}`}>Actually observed state
              <select id={`restart-240-status-${row.id}`} disabled={!rebootReady}
                value={row.entry.status} onChange={e => updateObservation(row.id,
                  { status: e.target.value as Restart240Status })}>
                <option value="not_checked">Not checked</option><option value="working">Working (owner observed)</option>
                <option value="partial">Partially recovered</option><option value="failed">Failed / missing</option>
                <option value="not_configured">Not configured / cannot verify</option>
              </select></label>
            <label htmlFor={`restart-240-source-${row.id}`}>Observation basis
              <select id={`restart-240-source-${row.id}`} disabled={!rebootReady}
                value={row.entry.source} onChange={e => updateObservation(row.id,
                  { source: e.target.value as Restart240Source })}>
                <option value="none">Not witnessed</option><option value="direct_screen">Owner inspected actual screen</option>
                <option value="task_history">Task history inspected</option><option value="local_log">Existing local log inspected</option>
              </select></label>
            <label htmlFor={`restart-240-ref-${row.id}`}>Distinct safe local evidence code
              <input id={`restart-240-ref-${row.id}`} maxLength={80} disabled={!rebootReady}
                value={row.entry.reference}
                onChange={e => updateObservation(row.id,
                  { reference: safeWindowsFieldReference(e.target.value) })}
                placeholder={`WIN240-${row.id.toUpperCase()}`} /></label>
          </div>
          <button type="button" disabled={!rebootReady || row.entry.status === "not_checked"}
            onClick={() => recordObservation(row.id)}>Record observed {row.id} status</button>
          <p><small>Observed at (owner entry): {row.entry.recordedAt || "not recorded"}.
            Status does not authenticate hardware, cameras or provider services.</small></p>
        </article>)}
      </div>
      <button type="button" onClick={() => void copy(formatRestart240Packet(draft), "Redacted restart report")}>
        Copy redacted Build 240 recovery / first-failure report</button>
      <p><small>Do not enter IPs, URLs, file paths, serials, camera IDs, raw logs, names or credentials.
        An owner-reported recovery does not close external Windows acceptance or authorize future repairs.
        Six apps DISCONNECTED/HOLD; relay OFF; vault SECURITY HOLD.</small></p>
    </div>}
    {notice && <p role="status">{notice}</p>}
  </section>;
}
