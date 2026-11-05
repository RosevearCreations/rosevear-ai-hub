import { useState } from "react";
import { importArtifact251, mapArtifact251, type Artifact251 } from "./artifactCustody251";

export function ArtifactCustody251Panel({ expectedSha, signedArtifactSha256, signerCandidateVerified }: {
  expectedSha: string; signedArtifactSha256: string | null; signerCandidateVerified: boolean;
}) {
  const [artifact, setArtifact] = useState<Artifact251 | null>(null);
  const [error, setError] = useState("");
  const review = mapArtifact251(expectedSha, signedArtifactSha256, artifact, new Date().toISOString(), signerCandidateVerified, false);
  async function importFile(file?: File) {
    setArtifact(null); setError("");
    if (!file) return;
    if (file.size > 4096) { setError("Artifact evidence exceeds 4 KB."); return; }
    try { setArtifact(importArtifact251(await file.text())); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Invalid artifact evidence."); }
  }
  return <section aria-label="Build 251 signer enrollment and artifact custody">
    <h4>Build 251 — Windows artifact mapping and signer enrollment review</h4>
    <p>On the Windows server, run <code>scripts/inspect-hub-artifact-251.ps1</code> read-only, then import its JSON output here. The digest covers only <code>apps/web/dist/index.html</code>; the signed release receipt does not yet identify an artifact kind, so any matching hash remains a candidate mapping.</p>
    <label>Windows artifact digest JSON (max 4 KB)
      <input type="file" accept=".json,application/json" onChange={event => void importFile(event.target.files?.[0])} />
    </label>
    {error && <p role="alert">{error}</p>}
    <p><strong>Artifact digest comparison:</strong> {review.artifact_matches ? "Candidate match only" : "Not matched"}</p>
    <p><strong>Fresh observation:</strong> {review.fresh ? "Yes (within 24 hours)" : "No"}</p>
    <p><strong>Signer enrollment:</strong> HOLD — no separately authenticated signer custodian.</p>
    <p><strong>Supervised recovery receipt custody:</strong> HOLD — review only, no Windows changes.</p>
    <ul>{review.findings.map(finding => <li key={finding}>{finding}</li>)}</ul>
    <p><small>Importing evidence cannot enroll a key, execute a task, restart a process or close owner acceptance. The running Windows process and scheduled task must be independently witnessed.</small></p>
  </section>;
}
