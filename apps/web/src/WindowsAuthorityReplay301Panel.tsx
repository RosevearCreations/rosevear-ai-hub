import { useState } from "react";
import {
  authorityEnrollmentChecklist301, exportProtectedIntakeStatus301,
  inspectReceiptCandidate301, recordLocalReplaySimulation301,
  type ReplaySimulation301,
} from "./windowsAuthorityReplay301";
import type { reviewDecisionEvidence300 } from "./windowsReviewerDecision300";
import { WindowsProtectedOperator302Panel } from "./WindowsProtectedOperator302Panel";

/** Protected-intake boundary preview; never stores or transmits real receipts or credentials. */
export function WindowsAuthorityReplay301Panel({ expectedMainSha, decisionReport }: {
  expectedMainSha: string;
  decisionReport: ReturnType<typeof reviewDecisionEvidence300>;
}) {
  const [candidateRaw, setCandidateRaw] = useState("");
  const [history, setHistory] = useState<ReplaySimulation301[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [showOperator302, setShowOperator302] = useState(false);
  const [status, setStatus] = useState("No protected receipt received, verified, or recorded.");
  const checklist = authorityEnrollmentChecklist301(decisionReport);
  const review = inspectReceiptCandidate301({ candidateRaw, expectedMainSha,
    decision: decisionReport, prior: history, nowMs: Date.now() });
  function simulate() {
    const observation = recordLocalReplaySimulation301({ review, prior: history,
      acknowledged, nowMs: Date.now() });
    setAcknowledged(false);
    if (!observation) {
      setStatus("Simulation blocked: candidate invalid, duplicate, uncorrelated or not acknowledged.");
      return;
    }
    setHistory(current => [...current, observation].slice(-50));
    setStatus("One unverified candidate fingerprint observed locally. This is NOT a real replay ledger or accepted receipt.");
  }
  function download() {
    const data = exportProtectedIntakeStatus301({ expectedMainSha, decision: decisionReport,
      simulatedCandidates: history.length, acknowledged, nowMs: Date.now() });
    setAcknowledged(false);
    if (!data) { setStatus("HOLD export refused: source revision or owner acknowledgement invalid."); return; }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2) + "\n"],
      { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "rosevear-ai-hub-protected-intake-301-" + new Date().toISOString().slice(0, 10) + ".json";
    link.click(); URL.revokeObjectURL(url);
    setStatus("Sanitized HOLD checklist exported locally. No evidence, receipt or Shell message was sent.");
  }
  function clear() {
    setCandidateRaw(""); setHistory([]); setAcknowledged(false);
    setShowOperator302(false);
    setStatus("Build 301 local receipt candidates and simulated replay history cleared.");
  }
  return <section aria-labelledby="windows-authority-301-title">
    <p className="eyebrow">Build 301 · Protected evidence authority and replay guard</p>
    <h4 id="windows-authority-301-title">Authority enrollment prerequisites (not yet enrolled)</h4>
    <p>This is a checklist for independent verification on the original Windows host and
      a separate protected channel. It cannot enroll source signers, reviewers, witnesses,
      owner consent, or the Master Shell receiver.</p>
    <ol aria-label="Build 301 enrollment requirements">
      {checklist.gateStates.map(gate => <li key={gate.id}>
        <strong>{gate.id.replaceAll("_", " ")}</strong>: {gate.required} — HOLD
      </li>)}
    </ol>
    <p><strong>Enrolled authorities: 0/{checklist.gateStates.length}.</strong>
      Protected intake: NOT CONFIGURED. Persistent replay ledger: NOT CONNECTED.</p>
    <h4>Local receipt replay simulation (metadata only)</h4>
    <p>A fresh matching candidate can be recorded in a temporary browser-session replay list.
      Repeated receipt references, nonces, sequence numbers or digest claims are blocked.
      This is <strong>not</strong> cryptographic validation, a real nonce registry, or authorized intake.
      Do not paste original receipt bytes, signatures, passwords, keys, names, addresses or device data.</p>
    <label htmlFor="windows-301-candidate">Sanitized unsigned receipt candidate JSON (4 KiB maximum)</label>
    <textarea id="windows-301-candidate" rows={4} maxLength={4096}
      value={candidateRaw} onChange={event => { setCandidateRaw(event.target.value);
        setAcknowledged(false); }} />
    <dl>
      <dt>Build 300 decision</dt><dd>{decisionReport.state.replaceAll("_", " ")}</dd>
      <dt>Local receipt candidate</dt><dd>{review.state.replaceAll("_", " ")}</dd>
      <dt>Review exceptions</dt><dd>{review.issues.join(", ")}</dd>
      <dt>Simulated session observations</dt><dd>{history.length}</dd>
      <dt>Master Shell</dt><dd>HOLD / TRANSPORT DISABLED</dd>
    </dl>
    <label className="installed-adoption-check">
      <input type="checkbox" checked={acknowledged}
        onChange={event => setAcknowledged(event.target.checked)} />
      I understand the local simulation and status export cannot enroll authority,
      accept a real receipt, prove replay safety across devices or publish to the Shell.
    </label>
    <button type="button" disabled={!acknowledged} onClick={simulate}>
      Simulate unsigned candidate (never send)</button>
    <button type="button" disabled={!acknowledged} onClick={download}>
      Download sanitized Build 301 Shell HOLD checklist</button>
    <button type="button" onClick={clear}>Clear Build 301 private inputs</button>
    <p role="status">{status}</p>
    <p><strong>Accepted receipts: 0. Verified signatures: 0. Shell messages: 0.</strong></p>
    <button type="button" aria-expanded={showOperator302}
      onClick={() => setShowOperator302(open => !open)}>
      {showOperator302 ? "Close Build 302 protected operator review" : "Open Build 302 protected operator review"}
    </button>
    {showOperator302 && <WindowsProtectedOperator302Panel key={expectedMainSha}
      expectedMainSha={expectedMainSha} receiptReview={review} />}
  </section>;
}
