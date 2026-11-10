import { useState } from "react";
import {
  applicableEscalations302, exportOperatorEscalations302,
  operatorIntakeReview302, recordOperatorEscalation302,
  type EscalationIssue302, type LocalEscalation302,
} from "./windowsProtectedOperator302";
import type { inspectReceiptCandidate301 } from "./windowsAuthorityReplay301";
import { WindowsSupervisedPilot303Panel } from "./WindowsSupervisedPilot303Panel";

/** Operator-side case preparation only, never original evidence intake or a Comms Hub message. */
export function WindowsProtectedOperator302Panel({ expectedMainSha, receiptReview }: {
  expectedMainSha: string;
  receiptReview: ReturnType<typeof inspectReceiptCandidate301>;
}) {
  const [selected, setSelected] = useState<EscalationIssue302>("ORIGINAL_HOST_UNVERIFIED");
  const [acknowledged, setAcknowledged] = useState(false);
  const [cases, setCases] = useState<LocalEscalation302[]>([]);
  const [showPilot303, setShowPilot303] = useState(false);
  const [message, setMessage] = useState("No independently authenticated receipt or Shell enrollment record received.");
  const review = operatorIntakeReview302(receiptReview);
  const routes = applicableEscalations302(receiptReview);
  const issue = routes.some(route => route.issue === selected) ? selected : routes[0].issue;
  function record() {
    const entry = recordOperatorEscalation302({ expectedMainSha, report: receiptReview,
      issue, previous: cases, acknowledged, nowMs: Date.now() });
    setAcknowledged(false);
    if (!entry) { setMessage("Exception not recorded: invalid case, duplicate, source drift or acknowledgement missing."); return; }
    setCases(current => [...current, entry]);
    setMessage("Local OPEN/HOLD exception recorded. No ticket, receiver, original host or other app was contacted.");
  }
  function download() {
    const output = exportOperatorEscalations302({ expectedMainSha,
      report: receiptReview, previous: cases, acknowledged, nowMs: Date.now() });
    setAcknowledged(false);
    if (!output) { setMessage("HOLD export refused; source revision or owner acknowledgement invalid."); return; }
    const url = URL.createObjectURL(new Blob([JSON.stringify(output, null, 2) + "\n"],
      { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "rosevear-ai-hub-operator-hold-302-" + new Date().toISOString().slice(0, 10) + ".json";
    anchor.click(); URL.revokeObjectURL(url);
    setMessage("Sanitized HOLD case summary saved locally. No Shell message or real evidence was published.");
  }
  function clear() {
    setCases([]); setSelected("ORIGINAL_HOST_UNVERIFIED"); setAcknowledged(false);
    setMessage("Build 302 local exception history cleared. External state unchanged.");
  }
  return <section aria-labelledby="windows-operator-302-title">
    <p className="eyebrow">Build 302 · Protected intake operator handoff and escalation</p>
    <h4 id="windows-operator-302-title">Source-signed receipt requirements (independent proof missing)</h4>
    <p>The original Windows issuer, signer, reviewer, owner consent, durable replay registry and
      receiving Shell must be authenticated through a protected system outside this browser.
      A digest, unsigned metadata candidate or locally prepared exception is never a signed receipt.</p>
    <ol aria-label="Build 302 required source-signed receipt checks">
      {review.signingRequirements.map(item => <li key={item.id}>
        <strong>{item.id.replaceAll("_", " ")}</strong>: {item.required} — HOLD
      </li>)}
    </ol>
    <h4>Operator exception routing (private, no-send)</h4>
    <p>Choose the precise missing authority or observed exception to prepare an owner-facing
      follow-up. These are local role labels only; no Comms Hub ticket is created.</p>
    <label htmlFor="windows-302-issue">Open enrollment or receipt exception</label>
    <select id="windows-302-issue" value={issue} onChange={event => {
      setSelected(event.target.value as EscalationIssue302); setAcknowledged(false);
    }}>
      {routes.map(route => <option key={route.issue} value={route.issue}>
        {route.issue.replaceAll("_", " ")} — {route.owner.replaceAll("_", " ")}
      </option>)}
    </select>
    <dl>
      <dt>Candidate</dt><dd>{review.candidateState.replaceAll("_", " ")}</dd>
      <dt>Outstanding evidence</dt><dd>{review.issueCodes.join(", ")}</dd>
      <dt>Escalation cases</dt><dd>{cases.length} local OPEN/HOLD</dd>
      <dt>Master Shell</dt><dd>HOLD / NOT CONFIGURED / 0 messages sent</dd>
    </dl>
    {cases.length > 0 && <ol aria-label="Build 302 local exception cases">
      {cases.map(entry => <li key={entry.sequence}>
        Case {entry.sequence}: {entry.issue} → {entry.ownerRole} — OPEN/HOLD.
        Next: {entry.nextStep}.
      </li>)}
    </ol>}
    <label className="installed-adoption-check">
      <input type="checkbox" checked={acknowledged}
        onChange={event => setAcknowledged(event.target.checked)} />
      I understand this prepares only a local unverified HOLD record; recording or downloading
      it cannot authenticate signatures, enroll keys, approve consent or send a Shell message.
    </label>
    <button type="button" disabled={!acknowledged} onClick={record}>
      Record local operator exception (OPEN/HOLD)</button>
    <button type="button" disabled={!acknowledged} onClick={download}>
      Download sanitized Build 302 exception handoff (HOLD)</button>
    <button type="button" onClick={clear}>Clear Build 302 local exceptions</button>
    <p role="status">{message}</p>
    <p><strong>Verified source-signed receipts: 0. Enrolled receivers: 0. Messages sent: 0.</strong></p>
    <button type="button" aria-expanded={showPilot303}
      onClick={() => setShowPilot303(value => !value)}>
      {showPilot303 ? "Close Build 303 supervised pilot" : "Open Build 303 supervised pilot"}
    </button>
    {showPilot303 && <WindowsSupervisedPilot303Panel expectedMainSha={expectedMainSha}
      receiptReview={receiptReview} cases={cases} />}
  </section>;
}
