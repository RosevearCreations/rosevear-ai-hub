import { useState } from "react";
import { assessWindowsRelease249, parseWindowsRelease249, type WindowsRelease249 } from "./windowsRelease249";

export function WindowsRelease249Panel({ sourceAligned }: {sourceAligned: boolean}) {
  const [evidence, setEvidence] = useState<WindowsRelease249 | null>(null);
  const [error, setError] = useState("");
  const [ownerReboot, setOwnerReboot] = useState(false);
  const result = assessWindowsRelease249(evidence, new Date().toISOString(), sourceAligned, ownerReboot);
  async function load(file?: File) {
    setEvidence(null); setError(""); setOwnerReboot(false);
    if (!file) return;
    if (file.size > 8192) { setError("Evidence exceeds 8 KB."); return; }
    try { setEvidence(parseWindowsRelease249(await file.text())); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not read the evidence."); }
  }
  return <section className="hub-process-248" aria-label="Build 249 source-to-process proof and recovery drift">
    <h3>Build 249 — Release-to-process and recovery drift</h3>
    <p>On the Windows Hub, run this read-only script and save the JSON to a local file:</p>
    <code>powershell.exe -NoProfile -File .\scripts\inspect-hub-process-249.ps1</code>
    <label>Import Windows readback (max 8 KB)
      <input type="file" accept=".json,application/json" onChange={event => void load(event.target.files?.[0])} />
    </label>
    {error && <p role="alert">{error}</p>}
    <div className="hub-update-stats">
      <div><span>Web executable</span><strong>{evidence?.web.source_path ?? "Unknown"}</strong></div>
      <div><span>Backend executable</span><strong>{evidence?.backend.source_path ?? "Unknown"}</strong></div>
      <div><span>Recovery action</span><strong>{evidence?.recovery_task.action ?? "Unknown"}</strong></div>
      <div><span>Reboot correlation</span><strong>{evidence?.backend.post_boot ?? "Unknown"}</strong></div>
    </div>
    <label><input type="checkbox" disabled={!evidence} checked={ownerReboot} onChange={event => setOwnerReboot(event.target.checked)} />We opened the actual Windows client after the reboot and reviewed this readback.</label>
    <p><strong>{result.state.replaceAll("_", " ")}</strong></p>
    <ul>{result.findings.map(finding => <li key={finding}>{finding}</li>)}</ul>
    <p><small>Classification only. No automatic task repair, process termination, updater, migration or final acceptance occurs.</small></p>
  </section>;
}
