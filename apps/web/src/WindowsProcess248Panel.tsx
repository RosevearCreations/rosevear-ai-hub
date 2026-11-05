import { useState } from "react";
import { assessWindowsProcess248, parseWindowsProcess248, type WindowsProcess248 } from "./windowsProcess248";
import { WindowsRelease249Panel } from "./WindowsRelease249Panel";

export function WindowsProcess248Panel({ sourceAligned, expectedSha }: { sourceAligned: boolean; expectedSha: string }) {
  const [evidence, setEvidence] = useState<WindowsProcess248 | null>(null);
  const [importError, setImportError] = useState("");
  const assessment = assessWindowsProcess248(evidence, new Date().toISOString(), sourceAligned);

  async function importReadback(file?: File) {
    setEvidence(null);
    setImportError("");
    if (!file) return;
    if (file.size > 8192) { setImportError("Windows evidence exceeds 8 KB."); return; }
    try { setEvidence(parseWindowsProcess248(await file.text())); }
    catch (error) { setImportError(error instanceof Error ? error.message : "Could not import Windows evidence."); }
  }

  return <section className="hub-process-248" aria-label="Build 248 Windows process and startup task handoff">
    <h3>Build 248 — Process identity &amp; post-restart closure</h3>
    <p>On the Windows Hub, run this read-only command in PowerShell from the repository folder, then save its JSON output locally:</p>
    <code>powershell.exe -NoProfile -File .\scripts\inspect-hub-process-248.ps1</code>
    <p>It reads loopback listener process IDs and scheduled task classifications. It never changes a service, task, release or database, and it omits command lines, usernames and paths.</p>
    <label>Import Windows process/task JSON (max 8 KB)
      <input type="file" accept=".json,application/json" onChange={event => void importReadback(event.target.files?.[0])} />
    </label>
    {importError && <p role="alert">{importError}</p>}
    <div className="hub-update-stats">
      <div><span>Observed</span><strong>{evidence?.observed_at ?? "Not imported"}</strong></div>
      <div><span>Web listener</span><strong>{evidence?.listeners.web.status ?? "Unknown"}</strong></div>
      <div><span>Backend listener</span><strong>{evidence?.listeners.backend.status ?? "Unknown"}</strong></div>
      <div><span>Server startup task</span><strong>{evidence?.tasks.server.state ?? "Unknown"}</strong></div>
    </div>
    <p><strong>{assessment.disposition.replaceAll("_", " ")}</strong></p>
    <ul>{assessment.findings.map(finding => <li key={finding}>{finding}</li>)}</ul>
    <p><small>Owner-imported evidence cannot authorize closure or prove the running process uses the promoted main commit. No host action occurs here.</small></p>
    <WindowsRelease249Panel sourceAligned={sourceAligned} expectedSha={expectedSha} />
  </section>;
}
