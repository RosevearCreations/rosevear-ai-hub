import { useState } from "react";

import type { IntakeNote293 } from "./windowsEvidenceIntake293";
import type { SupervisedReview294 } from "./windowsSupervisedAcceptance294";
import {
  EVIDENCE_REGISTRY_GATES_295, evidenceRegistryInterface295, exportCustody295,
  recordCustodyReview295, runHandoffDryRun295,
  type CustodyNote295, type HandoffDestination295, type HandoffDryRun295,
} from "./windowsCustodyHandoff295";

/** Local review only. This component has no receiver, registry or network capability. */
export function WindowsCustody295Panel({ intakeNotes, supervisedReviews, expectedMainSha }: {
  intakeNotes: readonly IntakeNote293[];
  supervisedReviews: readonly SupervisedReview294[];
  expectedMainSha: string;
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [handoffAcknowledged, setHandoffAcknowledged] = useState(false);
  const [destination, setDestination] = useState<HandoffDestination295>("AI_DATA_PLATFORM_READ_ONLY_REVIEW");
  const [custody, setCustody] = useState<CustodyNote295[]>([]);
  const [dryRuns, setDryRuns] = useState<HandoffDryRun295[]>([]);
  const [status, setStatus] = useState("No original-Windows evidence registered or independently verified.");
  const lastNote = custody[custody.length - 1] ?? null;
  const registry = evidenceRegistryInterface295(lastNote);

  function record() {
    const result = recordCustodyReview295({
      intakeNotes, supervisedReviews, expectedMainSha, acknowledged, nowMs: Date.now(),
    });
    setAcknowledged(false);
    setHandoffAcknowledged(false);
    if (result.state === "REJECTED") {
      setStatus("Custody note rejected: " + result.reason + ". Independent verification stays HOLD.");
      return;
    }
    setCustody(previous => [...previous, result.note].slice(-10));
    setStatus("Local correlation note saved in this browser only. No authoritative custody or registry entry was created.");
  }
  function simulate() {
    const result = runHandoffDryRun295({
      note: lastNote, expectedMainSha, destination,
      acknowledged: handoffAcknowledged, nowMs: Date.now(),
    });
    setHandoffAcknowledged(false);
    if (!result) {
      setStatus("No handoff dry run recorded. Explicit operator acknowledgement and a valid local custody note are required.");
      return;
    }
    setDryRuns(previous => [...previous, result].slice(-10));
    setStatus("Handoff simulation blocked by missing independent evidence. Zero messages sent; no trusted receipt registered.");
  }
  function clear() {
    setCustody([]);
    setDryRuns([]);
    setAcknowledged(false);
    setHandoffAcknowledged(false);
    setStatus("Build 295 browser-session notes and simulations cleared; no external state changed.");
  }
  function download() {
    if (!custody.length && !dryRuns.length) return;
    const report = exportCustody295(custody, dryRuns);
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2) + "\n"],
      { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "rosevear-windows-custody-295-" + new Date().toISOString().slice(0, 10) + ".json";
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("Private unverified metadata downloaded; no verified receipt, registry record or publication.");
  }

  return <section className="panel" aria-labelledby="windows-custody-295-title">
    <p className="eyebrow">Build 295 · Original-Windows chain-of-custody and handoff dry run</p>
    <h4 id="windows-custody-295-title">Review the owner-reported custody sequence (HOLD)</h4>
    <p>Build 293 local intake notes: {intakeNotes.length}; Build 294 supervised notes: {supervisedReviews.length}.
      Only matching owner-reported source pointers and ordered timestamps can be correlated.
      These are not independent observations of the original Windows machine.</p>
    <label className="installed-adoption-check">
      <input type="checkbox" checked={acknowledged}
        onChange={event => setAcknowledged(event.target.checked)} />
      I acknowledge this records a local correlation note, not real chain-of-custody,
      host identity, signed consent, independent witness or authorization.
    </label>
    <button type="button" disabled={!acknowledged || !intakeNotes.length || !supervisedReviews.length}
      onClick={record}>Record local custody note (HOLD)</button>
    <p role="status">{status}</p>
    <p><strong>{custody.length} owner custody note(s); 0 independently verified evidence records.</strong></p>
    {custody.length > 0 && <ol aria-label="Local custody review sequence">
      {custody.map((entry, index) => <li key={index}>
        <time dateTime={entry.reviewedAtUtc}>{entry.reviewedAtUtc}</time> —
        local intake <time dateTime={entry.localIntakeAtUtc}>{entry.localIntakeAtUtc}</time>,
        supervised review <time dateTime={entry.supervisedReviewAtUtc}>{entry.supervisedReviewAtUtc}</time>;
        source {entry.sourceSha.slice(0, 8)}… (owner-reported), integrity digest {entry.unsignedDigest.slice(0, 8)}…;
        registry and independent verification: HOLD.
      </li>)}
    </ol>}
    <h4>Independently verified evidence registry interface (design only)</h4>
    <p><strong>Connection: {registry.connection.replaceAll("_", " ").toLowerCase()}.</strong>
      No registry reads or writes, zero independently verified entries.
      The requirements below are a contract preview, not evidence registration.</p>
    <ol aria-label="Build 295 independent evidence registry requirements">
      {EVIDENCE_REGISTRY_GATES_295.map(gate => <li key={gate.id}>
        <strong>{gate.authority}:</strong> {gate.requiredEvidence} — HOLD, independent original evidence required.
      </li>)}
    </ol>
    <h4>Operator-gated Master Shell handoff dry run</h4>
    <p>The simulated destination is a label only. No payload is delivered, queued or signed.</p>
    <label htmlFor="windows-handoff-destination-295">Choose review destination</label>
    <select id="windows-handoff-destination-295" value={destination}
      onChange={event => { setDestination(event.target.value as HandoffDestination295);
        setHandoffAcknowledged(false); }}>
      <option value="AI_DATA_PLATFORM_READ_ONLY_REVIEW">AI Data Platform — read-only source review</option>
      <option value="COMMS_HUB_OPERATOR_REVIEW">Rosevear Comms Hub — operator review</option>
    </select>
    <label className="installed-adoption-check">
      <input type="checkbox" checked={handoffAcknowledged}
        onChange={event => setHandoffAcknowledged(event.target.checked)} />
      I understand the simulated handoff is blocked on HOLD, sends no messages,
      and cannot authorize an evidence registry or Master Shell receiver.
    </label>
    <button type="button" disabled={!lastNote || !handoffAcknowledged}
      onClick={simulate}>Simulate operator handoff (no send)</button>
    <p><strong>{dryRuns.length} local handoff dry run(s); 0 messages sent; 0 signed receipts accepted.</strong></p>
    {dryRuns.length > 0 && <ol aria-label="Local handoff dry run results">
      {dryRuns.map((run, index) => <li key={index}>
        <time dateTime={run.simulatedAtUtc}>{run.simulatedAtUtc}</time> —
        {run.destination.replaceAll("_", " ").toLowerCase()}:
        {run.decision.replaceAll("_", " ").toLowerCase()}; transport disabled,
        {run.missingIndependentAuthorities} independent authority gates missing.
      </li>)}
    </ol>}
    <button type="button" disabled={!custody.length && !dryRuns.length} onClick={download}>
      Download private custody and dry-run metadata (JSON)
    </button>
    <button type="button" onClick={clear}>Clear Build 295 local review</button>
    <p><strong>Original Windows host, signer, witness, owner consent, cryptographic receipt
      and Master Shell publication remain HOLD.</strong> Source CI cannot verify them.</p>
  </section>;
}
