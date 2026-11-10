import { useState } from "react";
import { WindowsCustody295Panel } from "./WindowsCustody295Panel";
import type { IntakeNote293 } from "./windowsEvidenceIntake293";
import {
  recordSupervisedReview294, runSyntheticReplayHarness294,
  type SupervisedAction294, type SupervisedReview294,
} from "./windowsSupervisedAcceptance294";
import { RECEIPT_VERIFICATION_GATES_293 } from "./windowsEvidenceIntake293";

/** An owner-only browser-session review; not a signer, verifier or trusted host. */
export function WindowsAcceptance294Panel({ notes, expectedMainSha }: {
  notes: readonly IntakeNote293[];
  expectedMainSha: string;
}) {
  const [action, setAction] = useState<SupervisedAction294>("REVIEW_ORIGINAL_HOST");
  const [acknowledged, setAcknowledged] = useState(false);
  const [history, setHistory] = useState<SupervisedReview294[]>([]);
  const [simulation, setSimulation] = useState<ReturnType<typeof runSyntheticReplayHarness294> | null>(null);
  const [status, setStatus] = useState("No independent original-Windows acceptance verified.");
  function record() {
    const entry = recordSupervisedReview294({
      notes, expectedMainSha, action, acknowledged, nowMs: Date.now(),
    });
    setAcknowledged(false);
    if (!entry) {
      setStatus("No owner decision recorded. Select a valid, locally reviewed Build 293 intake source and explicitly acknowledge HOLD.");
      return;
    }
    setHistory(previous => [...previous, entry].slice(-10));
    setStatus("Owner-supervised follow-up noted in this browser only. All seven independent authorities remain HOLD.");
  }
  return <section className="panel" aria-labelledby="windows-acceptance-294-title">
    <p className="eyebrow">Build 294 · Supervised Windows acceptance review &amp; replay-safety testing</p>
    <h4 id="windows-acceptance-294-title">Review original-host evidence without granting trust</h4>
    <p>The {notes.length} local Build 293 unsigned intake note(s) are only reported source references.
      The original Windows host, installed executable, issuer, witness, consent, signed receipt
      and Master Shell publisher must each be independently verified outside this panel.</p>
    <label htmlFor="windows-action-294">Select a non-executing supervised review plan</label>
    <select id="windows-action-294" value={action}
      onChange={event => { setAction(event.target.value as SupervisedAction294); setAcknowledged(false); }}>
      <option value="REVIEW_ORIGINAL_HOST">Review original Windows host and installed process</option>
      <option value="MAP_SIGNER_WITNESS">Map signer, witness and owner-consent authorities</option>
      <option value="REVIEW_REPLAY_SAFETY">Review synthetic signed-receipt replay safety</option>
    </select>
    <label className="installed-adoption-check">
      <input type="checkbox" checked={acknowledged}
        onChange={event => setAcknowledged(event.target.checked)} />
      I understand this records an unverified browser note only; it does not verify the machine,
      approve a signer or witness, create a signed receipt or authorize the Master Shell.
    </label>
    <button type="button" disabled={!acknowledged || notes.length === 0} onClick={record}>
      Record supervised review plan locally (HOLD)
    </button>
    <p role="status">{status}</p>
    <p><strong>{history.length} supervised owner note(s); 0 independently verified acceptances.</strong></p>
    {history.length > 0 && <ol aria-label="Build 294 supervised owner history">
      {history.map((entry, index) => <li key={index}>
        <time dateTime={entry.reviewedAtUtc}>{entry.reviewedAtUtc}</time> —
        {" "}{entry.action.replaceAll("_", " ").toLowerCase()} —
        {" "}{entry.linkedIntakeCount} locally reported source note(s); all trust: HOLD.
      </li>)}
    </ol>}
    <h4>Independent evidence authority mapping (all HOLD)</h4>
    <ol aria-label="Independent Build 294 authority mapping">
      {RECEIPT_VERIFICATION_GATES_293.map(gate => <li key={gate.id}>
        <strong>{gate.authority}:</strong> {gate.requirement} — INDEPENDENT REVIEW REQUIRED.
      </li>)}
    </ol>
    <h4>Offline synthetic replay-safety test harness</h4>
    <p>Run fixed, invented example envelopes to model how a future verifier should reject replays.
      No real receipt is loaded, authenticated, signed, transmitted or accepted.</p>
    <button type="button" onClick={() => setSimulation(runSyntheticReplayHarness294(Date.now()))}>
      Run synthetic replay test harness
    </button>
    {simulation && <div aria-label="Build 294 replay test outcomes">
      <p><strong>{simulation.results.length} synthetic scenarios; 0 verified signatures;
        0 production receipts accepted.</strong> Fresh-looking test data is still unverified.</p>
      <ol>{simulation.results.map(result => <li key={result.scenario}>
        {result.scenario}: {result.verdict.replaceAll("_", " ").toLowerCase()}
      </li>)}</ol>
    </div>}
    <WindowsCustody295Panel intakeNotes={notes} supervisedReviews={history} expectedMainSha={expectedMainSha} />
    <p><strong>Original host: HOLD. Issuer/witness: HOLD. Signed receipt: HOLD. Master Shell: HOLD.</strong>
      GitHub source checks cannot satisfy these field-acceptance requirements.</p>
  </section>;
}
