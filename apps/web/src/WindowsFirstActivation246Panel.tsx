import { useState } from "react";
import { getHubUpdateControl, getHubVersion, type HubUpdateControl, type HubVersionResponse } from "./api";
import { browserBuild } from "./installedHubAdoption";
import { assessFirstActivation246, type FirstActivationChecks } from "./windowsFirstActivation246";
import { importActivation246Receipt, reconcileActivation247, type ActivationReceipt247 } from "./windowsActivation247";
import { WindowsProcess248Panel } from "./WindowsProcess248Panel";

const initialChecks: FirstActivationChecks = {
  backupRestored: false, migrationSucceeded: false, backendRestarted: false,
  clientReloaded: false, darkModeVisible: false, restartButtonVisible: false,
};

const labels: Array<[keyof FirstActivationChecks, string]> = [
  ["backupRestored", "We confirmed the encrypted backup could be restored separately"],
  ["migrationSucceeded", "We saw the database migration finish successfully"],
  ["backendRestarted", "We checked the installed Windows backend after restart"],
  ["clientReloaded", "We opened the actual installed client after restart"],
  ["darkModeVisible", "We can select Dark Mode and see the low-glare interface"],
  ["restartButtonVisible", "We can see the Restart Client button in the header"],
];

/** Owner observations are scoped to this screen, never automation authorization. */
export function WindowsFirstActivation246Panel() {
  const [target, setTarget] = useState("");
  const [release, setRelease] = useState<HubUpdateControl | null>(null);
  const [backend, setBackend] = useState<HubVersionResponse | null>(null);
  const [checks, setChecks] = useState<FirstActivationChecks>(initialChecks);
  const [loading, setLoading] = useState(false);
  const [observed, setObserved] = useState(false);
  const [imported247, setImported247] = useState<ActivationReceipt247 | null>(null);
  const [importError247, setImportError247] = useState("");
  const [process247, setProcess247] = useState<"not_checked" | "same_release_claimed" | "stale_or_different" | "unknown">("not_checked");
  const review = assessFirstActivation246(target, browserBuild.sha, release, backend, checks);
  const outcome247 = reconcileActivation247(target.trim().toLowerCase(), browserBuild.sha, release?.active_release ?? null, imported247, process247);

  async function importReceipt247(file?: File) {
    setImported247(null);
    setImportError247("");
    setProcess247("not_checked");
    if (!file) return;
    if (file.size > 32768) { setImportError247("Receipt exceeds the 32 KB import limit."); return; }
    try { setImported247(importActivation246Receipt(await file.text(), new Date().toISOString())); }
    catch (error) { setImportError247(error instanceof Error ? error.message : "Receipt could not be imported."); }
  }

  async function refresh() {
    setLoading(true);
    setObserved(false);
    setChecks(initialChecks);
    setProcess247("not_checked");
    const [releaseResult, backendResult] = await Promise.allSettled([
      getHubUpdateControl(), getHubVersion(),
    ]);
    setRelease(releaseResult.status === "fulfilled" ? releaseResult.value : null);
    setBackend(backendResult.status === "fulfilled" ? backendResult.value : null);
    setObserved(true);
    setLoading(false);
  }

  function download() {
    const report = {
      schema: "rosevear-windows-first-activation-246/v1", generated_at: new Date().toISOString(),
      approved_main_reference: /^[a-f0-9]{40}$/.test(target.trim().toLowerCase()) ? target.trim().toLowerCase() : null,
      browser_sha: browserBuild.sha, backend_package_version: backend?.version ?? null,
      locally_reported_active_release: release?.active_release ?? null,
      locally_reported_adoption_state: release?.adoption_state ?? "UNVERIFIED",
      owner_self_reported_checks: checks, ...review,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "rosevear-windows-first-activation-246.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return <section className="panel hub-first-activation" aria-label="Build 246 Windows first activation and visual acceptance">
    <div className="hub-first-heading">
      <div><p className="eyebrow">Windows release · field acceptance</p><h2>Build 246 — Installed client recovery</h2></div>
      <span className="hub-first-hold">{review.state.replaceAll("_", " ")}</span>
    </div>
    <p>The source release can be GREEN while Windows still runs old files. This screen checks the
      local API and managed release record, then lets us record what we actually saw on the PC.
      It never runs PowerShell, upgrades a database, restarts a service or certifies a camera.</p>
    <div className="hub-first-actions">
      <label>Approved main commit
        <input aria-label="Build 246 main commit" value={target} maxLength={40} spellCheck={false}
          placeholder="40-character commit SHA" onChange={event => { setTarget(event.target.value); setChecks(initialChecks); }} />
      </label>
      <button type="button" disabled={loading} onClick={() => void refresh()}>
        {loading ? "Checking local Hub…" : "Read installed release status"}
      </button>
    </div>
    <div className="hub-update-stats">
      <div><span>Browser source</span><strong>{browserBuild.sha?.slice(0, 12) ?? "Unknown / old client"}</strong></div>
      <div><span>Backend package</span><strong>{backend?.version ?? "Not observed"}</strong></div>
      <div><span>Managed release</span><strong>{release?.active_release?.slice(0, 12) ?? "Not enrolled / unknown"}</strong></div>
      <div><span>Source alignment</span><strong>{review.source_alignment.replaceAll("_", " ")}</strong></div>
    </div>
    <h3>Post-restart owner observations</h3>
    <p>Check only what we witnessed on the Windows computer. Refreshing local status clears these marks.</p>
    <div className="hub-first-checks">{labels.map(([key, label]) =>
      <label key={key}><input type="checkbox" disabled={!observed} checked={checks[key]}
        onChange={event => setChecks(previous => ({ ...previous, [key]: event.target.checked }))} />{label}</label>)}</div>
    <aside className="hub-update-next-step" aria-label="Recovery guidance">
      <strong>Recovery assistant — read only</strong>
      <ul>{review.holds.map(hold => <li key={hold}>{hold}</li>)}</ul>
      <p>For a stopped or failed upgrade, preserve the verified backup and original release. Use
        the supervised Windows release procedure; do not run a blind Git pull, force-stop an
        unknown listener, or apply a second migration. The original Home Assistant VM stays untouched.</p>
    </aside>
    <button type="button" onClick={download} disabled={!observed}>Download redacted owner field receipt</button>
    <p><small>This receipt is owner self-report only. It is not independent production installation proof.</small></p>
    <section className="hub-activation-247" aria-label="Build 247 Windows activation outcome import">
      <h3>Build 247 — Windows activation outcome &amp; process reconciliation</h3>
      <p>Import a Build 246 receipt from this computer. Only a small summary is retained in this screen; file contents are never uploaded. Compare it with a fresh local status read above.</p>
      <label>Import previous owner receipt (JSON, maximum 32 KB)
        <input type="file" accept="application/json,.json" onChange={event => void importReceipt247(event.target.files?.[0])} />
      </label>
      {importError247 && <p role="alert">{importError247}</p>}
      <p>Imported observations: {imported247 ? `${imported247.owner_checks_recorded} of 6; previous SHA ${imported247.approved_main_reference?.slice(0, 12) ?? "unknown"}` : "None"}</p>
      <label>Running Windows backend process (owner-observed, not independently verified)
        <select value={process247} onChange={event => setProcess247(event.target.value as typeof process247)}>
          <option value="not_checked">Not inspected</option>
          <option value="same_release_claimed">Owner inspected and reports same release</option>
          <option value="stale_or_different">Old or different process observed</option>
          <option value="unknown">Process identity uncertain</option>
        </select>
      </label>
      <p><strong>{outcome247.disposition.replaceAll("_", " ")}</strong> — Source: {outcome247.source_alignment.replaceAll("_", " ")}</p>
      <ul>{outcome247.exceptions.map(exception => <li key={exception}>{exception}</li>)}</ul>
      <p><small>No process is stopped, no recovery is executed, and no exception is automatically closed. Confirm the process executable, command line and startup task on the Windows host using the supervised recovery runbook.</small></p>
    </section>
    <WindowsProcess248Panel sourceAligned={outcome247.source_alignment === "REPORTED_MATCH"} />
  </section>;
}
