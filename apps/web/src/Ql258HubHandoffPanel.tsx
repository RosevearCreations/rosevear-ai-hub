import { useState } from "react";
import { CardHelp } from "./CommandShell";
import { inspectQl258HubHandoff, QL258_HUB_STEPS, QL258_HUB_SNAPSHOT,
  type Ql258HubReview } from "./ql258HubHandoff";

/** No API, storage, key material, status mutation or owner authorization. */
export function Ql258HubHandoffPanel({ active = true }: { active?: boolean }) {
  const [input, setInput] = useState("");
  const [review, setReview] = useState<Ql258HubReview | null>(null);
  const [feedback, setFeedback] = useState("");
  function inspect() {
    try {
      setReview(inspectQl258HubHandoff(input));
      setFeedback("Sanitized owner self-report accepted for local display only. No private evidence verified.");
    } catch {
      setReview(null);
      setFeedback("Handoff rejected: paste only the original nonsecret Rosevear AI Hub QL-258 JSON packet.");
    }
  }
  return <section className="owner-handoff-reconciliation" aria-label="Build 186 QL-258 owner action handoff review">
    <header className="owner-trial-ledger-heading"><div>
      <h3>Build 186 · QL-258 Comms Hub owner checklist return (HOLD)</h3>
      <p>Paste the sanitized Rosevear AI Hub packet copied from Comms Hub. Only fixed progress labels are accepted. This review is temporary and stays on this screen.</p>
    </div><strong className="owner-trial-hold">DISCONNECTED / HOLD</strong></header>
    <CardHelp title="What the QL-258 worksheet proves—and does not prove">
      Choose Rosevear AI Hub in Comms Hub's Six-app evidence &amp; activation HOLD worksheet. Mark only what we actually attempted, then copy its sanitized JSON here. Even DONE is an unverified owner report—not signer possession, authenticated roles, proof B, an approved TEST or permission to start the Windows relay. Never paste private names, keys, passwords, HMAC values, secrets, home IP addresses or original private challenge text.
    </CardHelp>
    <p>QL-258's observed source snapshot <code>{QL258_HUB_SNAPSHOT.slice(0, 12)}</code> is historical; newer main builds must be checked at their own exact SHA. A previously reported HTTP 404 is not a current proof B verification.</p>
    <label className="owner-trial-check" htmlFor="ql258-hub-packet">Sanitized JSON returned by Comms Hub</label>
    <textarea id="ql258-hub-packet" rows={8} maxLength={8192} disabled={!active}
      value={input} onChange={event => { setInput(event.target.value); setReview(null); setFeedback(""); }}
      placeholder="Paste only the fixed seven-progress-label Rosevear AI Hub handoff" />
    <div className="owner-decision-summary">
      <button type="button" disabled={!active || !input.trim()} onClick={inspect}>Review QL-258 status-only packet</button>
      <button type="button" disabled={!active || (!input && !review)} onClick={() => {
        setInput(""); setReview(null); setFeedback("Temporary packet cleared; no external data was changed.");
      }}>Clear temporary packet</button>
    </div>
    {feedback && <p role="status">{feedback}</p>}
    {review && <fieldset className="owner-review-entry"><legend>Operator-reported progress — not independently authenticated</legend>
      <p>{review.reported_done_not_verified} of 6 applicable steps marked owner-reported DONE, all still unverified.</p>
      <ul>{QL258_HUB_STEPS.map(([key, label]) => <li key={key}>{label}: <strong>{review.steps[key]}</strong></li>)}</ul>
      <p>Signed proof B: NOT AVAILABLE. Owner TEST: NOT GIVEN. Gateway GETs: 0. Live pilot holds: 12. Windows relay: OFF.</p>
      <label htmlFor="ql258-hub-review">Safe local review result (copy manually if needed)</label>
      <textarea id="ql258-hub-review" rows={9} readOnly value={JSON.stringify(review, null, 2)} />
    </fieldset>}
    <p className="owner-trial-privacy">This panel makes no network requests, persists nothing and never changes the Hub's private signer, existing Windows startup configuration, devices, vault, Home Assistant or business connectors. Integration remains DISCONNECTED / HOLD.</p>
  </section>;
}
