import { useEffect, useRef, useState } from "react";

import { getBackupInventory, type BackupInventoryResponse } from "./api";
import { CardHelp } from "./CommandShell";

export const recoverySteps = [
  "Confirm an encrypted archive exists and its private key is escrowed separately; never enter the passphrase in the Hub or chat.",
  "Confirm a separate off-machine encrypted copy and retention expectation with the owner; directory presence alone does not prove this.",
  "Choose a NEW empty scratch directory with available capacity, separate from the installed Windows Hub and live database.",
  "Run the existing synthetic disaster-recovery rehearsal first; it creates disposable test data only.",
  "For a real encrypted archive, use the existing operator archive drill from a private local terminal and independently review its integrity report.",
  "Record the archive hash, timestamp, SQLite integrity, file count and cleanup result outside this display; verify before any live rollback decision.",
  "If recovery is required, stop relevant services, preserve the live installation for rollback, and separately authorize a controlled cutover. This screen never performs it.",
] as const;

const dateOrUnknown = (date: string | null) => date ? new Date(date).toLocaleString() : "Not reported";

/** Local readback and owner checklist only; no restore, deletion or passphrase entry. */
export function BackupRecoveryWorkbench() {
  const [sample, setSample] = useState<BackupInventoryResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState<number[]>([]);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function refresh() {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError("");
    try {
      const result = await getBackupInventory(controller.signal);
      if (request.current === controller) setSample(result);
    } catch (reason) {
      if (controller.signal.aborted) return;
      setSample(null);
      setError(reason instanceof Error ? reason.message : "Backup inventory could not be sampled.");
    } finally {
      if (request.current === controller) setLoading(false);
    }
  }

  return <section className="panel hub-backup-recovery" aria-labelledby="hub-backup-recovery-title">
    <header className="hub-search-header"><div>
      <p className="eyebrow">Build 224 · read-only recovery readiness</p>
      <h2 id="hub-backup-recovery-title">Backup inventory &amp; safe restore rehearsal</h2>
    </div><CardHelp title="Recovery evidence">The inventory only examines expected local filenames and timestamps when requested. A file or report's existence does not prove integrity, retention, an off-machine copy or a successful restore. No key, archive content or secret is read here.</CardHelp></header>
    <p>Owner-only readback of the expected private backup directory. This screen will not create a backup, open an archive, use a passphrase, restart a service or overwrite live data.</p>
    <button type="button" disabled={loading} onClick={() => void refresh()}>{loading ? "Checking directory…" : "Check local backup inventory"}</button>
    {error && <p role="alert">Backup inventory unavailable: {error}. Confirm local Hub access and retry manually.</p>}
    {!sample && !loading && !error && <p>No backup directory sample has been requested yet.</p>}
    {sample && <div className="hub-backup-inventory" role="status" aria-live="polite">
      <p>Sampled {dateOrUnknown(sample.sampled_at_utc)} · source: local filesystem names only</p>
      <dl>
        <dt>Expected recovery location</dt><dd>{sample.expected_directory}</dd>
        <dt>Directory state</dt><dd>{sample.directory_state === "present" ? "Present; content not verified" : sample.directory_state === "not_found" ? "Not found / installation path not confirmed" : sample.directory_state === "unsafe_symlink" ? "Unsafe link; inspection refused" : "Unavailable"}</dd>
        <dt>Encrypted archive files observed</dt><dd>{sample.archive_count ?? "Unknown"}</dd>
        <dt>Latest archive file modified</dt><dd>{dateOrUnknown(sample.latest_archive_modified_utc)}</dd>
        <dt>Verification report files observed</dt><dd>{sample.evidence_file_count ?? "Unknown"}</dd>
        <dt>Latest report file modified</dt><dd>{dateOrUnknown(sample.latest_evidence_modified_utc)}</dd>
        <dt>Integrity / last verified restore</dt><dd>Not checked / no independently verified result</dd>
        <dt>Off-machine copy / retention</dt><dd>Not verified / not configured by this workbench</dd>
      </dl>
      <p>Expected archive inputs: {sample.included_source_families.join(", ")}. Excluded: {sample.excluded.join(", ")}. Actual Windows source paths, archive decryptability and recovery success need independent owner verification.</p>
    </div>}
    <h3>Owner-supervised, non-destructive rehearsal checklist</h3>
    <p>Mark steps only as a personal planning aid in this session. Checkmarks are not a signed restore receipt and are never sent to the backend.</p>
    <ol className="hub-backup-checklist">{recoverySteps.map((step, index) => <li key={step}>
      <label><input type="checkbox" checked={checked.includes(index)} onChange={event =>
        setChecked(current => event.target.checked ? [...current, index] : current.filter(value => value !== index))} />{step}</label>
    </li>)}</ol>
    <p role="status">{checked.length} of {recoverySteps.length} planning steps reviewed locally; no restore acceptance recorded.</p>
    <button type="button" onClick={() => setChecked([])}>Reset local checklist</button>
    <details><summary>Existing safe operator commands and rollback boundaries</summary>
      <p>In a private Windows terminal, create an empty scratch directory and run:</p>
      <code>python -m rosevear_ai_hub.disaster_recovery synthetic --work-dir &lt;new-existing-scratch-dir&gt;</code>
      <p>For an actual encrypted archive, use the documented <code>archive</code> drill with explicit local archive, scratch and private passphrase-file arguments. Do not run any live restore or change startup tasks from this screen. Preserve the old installation until a separate owner-authorized cutover and rollback test are complete.</p>
    </details>
  </section>;
}
