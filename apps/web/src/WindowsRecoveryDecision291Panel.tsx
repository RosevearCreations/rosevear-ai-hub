import { useMemo, useState } from "react";

import type { WindowsAdoptionReview290 } from "./windowsFieldAdoption290";
import {
  exportRecoveryHistory291, guideWindowsRecovery291, recordRecoveryDecision291,
  RECOVERY_DECISION_LABELS_291, type RecoveryDecision291, type RecoveryHistoryEntry291,
} from "./windowsRecoveryDecision291";

/** Owner-visible, in-memory notes. No Windows action, network send or trust enrollment. */
export function WindowsRecoveryDecision291Panel({ review, getCurrentReview, expectedMainSha }: {
  review: WindowsAdoptionReview290;
  getCurrentReview: () => WindowsAdoptionReview290;
  expectedMainSha: string;
}) {
  const guidance = useMemo(() => guideWindowsRecovery291(review), [review]);
  const [decision, setDecision] = useState<RecoveryDecision291>("DEFER_ON_HOLD");
  const [acknowledged, setAcknowledged] = useState(false);
  const [history, setHistory] = useState<RecoveryHistoryEntry291[]>([]);
  const [notice, setNotice] = useState("No owner recovery decisions recorded in this browser session.");

  function recordDecision() {
    // Recalculate age at the instant of the explicit decision: a sleeping tab
    // cannot preserve an earlier fresh observation as an active recovery basis.
    const current = getCurrentReview();
    const entry = recordRecoveryDecision291(
      current, decision, acknowledged, expectedMainSha, Date.now(),
    );
    if (!entry) {
      setNotice("Decision was not recorded. Acknowledge the HOLD notice; supervised recovery review also requires current, valid reported drift.");
      return;
    }
    setHistory(previous => [...previous, entry].slice(-20));
    setAcknowledged(false);
    setDecision("DEFER_ON_HOLD");
    setNotice("Local owner follow-up noted. No Windows action, original-host acceptance or Master Shell authorization occurred.");
  }

  function downloadHistory() {
    if (history.length === 0) return;
    const report = exportRecoveryHistory291(history);
    const url = URL.createObjectURL(new Blob(
      [JSON.stringify(report, null, 2) + "\n"], { type: "application/json" },
    ));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "rosevear-windows-recovery-291-" + new Date().toISOString().slice(0, 10) + ".json";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Private owner-decision history downloaded; it is not signed field evidence or a trusted acceptance receipt.");
  }

  return <section className="panel" aria-labelledby="windows-recovery-291-title">
    <p className="eyebrow">Build 291 · Windows recovery decisions &amp; original-host history</p>
    <h3 id="windows-recovery-291-title">What should we review next on the original Windows Hub?</h3>
    <p>This guide uses the Build 290 read-only comparison. It suggests follow-up checks
      and records our own decisions for this browser session. It never restarts a service,
      repairs an installation, signs evidence or approves Master Shell reporting.</p>
    <p><strong>Follow-up priority: {guidance.priority.replaceAll("_", " ").toLowerCase()}.</strong>
      {" "}{guidance.summary}</p>
    <p><strong>Version drift:</strong> {guidance.versionFollowUp}</p>
    <ol aria-label="Guided Windows recovery follow-up">
      {guidance.steps.map(step => <li key={step}>{step}</li>)}
    </ol>
    <fieldset>
      <legend>Choose one owner follow-up decision (no action is executed)</legend>
      {(Object.keys(RECOVERY_DECISION_LABELS_291) as RecoveryDecision291[]).map(choice =>
        <label key={choice} className="installed-adoption-check">
          <input type="radio" name="recovery-decision-291" value={choice}
            checked={decision === choice}
            disabled={choice === "REVIEW_SUPERVISED_RECOVERY" &&
              !guidance.supervisedRecoveryReviewAvailable}
            onChange={() => { setDecision(choice); setAcknowledged(false); }} />
          {RECOVERY_DECISION_LABELS_291[choice]}
        </label>,
      )}
    </fieldset>
    <label className="installed-adoption-check">
      <input type="checkbox" checked={acknowledged}
        onChange={event => setAcknowledged(event.target.checked)} />
      I understand this saves only an unverified owner note, not permission to
      change the Windows computer or accept a signed receipt.
    </label>
    <button type="button" disabled={!acknowledged} onClick={recordDecision}>
      Record owner follow-up decision locally
    </button>
    <p role="status">{notice}</p>
    <h4>Original Windows host acceptance history (owner notes only)</h4>
    <p><strong>{history.length} session decision(s) recorded; 0 independently verified acceptances.</strong>
      No machine name, executable identity, signer, witness or consent is inferred.
      History is limited to the most recent 20 notes, stays only in this browser
      session and clears if the release reference or Build 113 snapshot changes.</p>
    {history.length > 0 && <ol aria-label="Owner recovery decision history">
      {history.map((entry, index) => <li key={index}>
        <time dateTime={entry.recordedAtUtc}>{entry.recordedAtUtc}</time>
        {" — "}{RECOVERY_DECISION_LABELS_291[entry.decision]}.
        {" "}{entry.reportedDisposition.replaceAll("_", " ").toLowerCase()};
        {" "}version: {entry.reportedBackendVersionState.replaceAll("_", " ").toLowerCase()};
        {" "}{entry.reportedCandidateMatches}/5 reported SHA matches;
        {" "}original host acceptance: HOLD.
      </li>)}
    </ol>}
    <button type="button" disabled={history.length === 0} onClick={downloadHistory}>
      Download private owner-decision history (JSON)
    </button>
    <p><strong>Original Windows identity, signed receipt, independent witness,
      signed owner consent and Master Shell: HOLD.</strong> Downloaded browser notes
      are not a cryptographically signed receipt or field acceptance. Any actual
      recovery uses the separate, owner-supervised Windows procedure.</p>
  </section>;
}
