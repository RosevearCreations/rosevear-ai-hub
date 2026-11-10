import { useState } from "react";
import { inspectFieldPacket298, recordOwnerTriage298, type ReviewIssue298 } from "./windowsReceiptReview298";

/** No persistent state, uploads, network requests, signer or trust acceptance. */
export function WindowsReceiptReview298Panel({ expectedMainSha }: { expectedMainSha: string }) {
  const [raw, setRaw] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [selected, setSelected] = useState<ReviewIssue298>("INDEPENDENT_PROOF_MISSING");
  const [notes, setNotes] = useState<NonNullable<ReturnType<typeof recordOwnerTriage298>>[]>([]);
  const [status, setStatus] = useState("No independent receipt accepted. Packet not inspected.");
  const review = inspectFieldPacket298(raw, expectedMainSha, Date.now());
  const issue = review.issues.includes(selected) ? selected : review.issues[0];

  function record() {
    const note = recordOwnerTriage298({ issue, observedIssues: review.issues,
      expectedMainSha, acknowledged, nowMs: Date.now() });
    setAcknowledged(false);
    if (!note) { setStatus("Triage not recorded; current issue and explicit acknowledgement required."); return; }
    setNotes(previous => [...previous, note].slice(-10));
    setStatus("OPEN/HOLD triage recorded locally; no evidence was verified or sent.");
  }
  function clear() {
    setRaw(""); setAcknowledged(false); setNotes([]);
    setStatus("Build 298 input and local triage notes cleared.");
  }
  return <section aria-labelledby="windows-receipt-298-title">
    <p className="eyebrow">Build 298 · Independent packet schema, source identity and triage</p>
    <h4 id="windows-receipt-298-title">Inspect private Build 297 field-review packet (offline)</h4>
    <p>Paste only the private, metadata-only Build 297 JSON that we already exported.
      It is inspected in this browser session, never uploaded or trusted as original Windows proof.
      Do not paste passwords, signatures, credentials, addresses or device information.</p>
    <label htmlFor="windows-receipt-298-json">Unverified private review JSON (24 KiB maximum)</label>
    <textarea id="windows-receipt-298-json" rows={5} maxLength={24576} value={raw}
      onChange={event => { setRaw(event.target.value); setAcknowledged(false);
        setStatus("Packet changed; any prior acknowledgement was cleared."); }} />
    <dl>
      <dt>Schema review</dt><dd>{review.state.replaceAll("_", " ")}</dd>
      <dt>Expected source identity</dt><dd>{review.sourceIdentity} (not authenticated)</dd>
      <dt>Claimed source revision</dt><dd>{review.sourceSha ?? "Not accepted"}</dd>
      <dt>Outstanding issues</dt><dd>{review.issues.join(", ")}</dd>
      <dt>Independently verified receipts / Shell messages</dt><dd>0 / 0</dd>
    </dl>
    <h4>Owner exception triage (OPEN / HOLD)</h4>
    <label htmlFor="windows-issue-298">Current review issue</label>
    <select id="windows-issue-298" value={issue} onChange={event => {
      setSelected(event.target.value as ReviewIssue298); setAcknowledged(false);
    }}>
      {review.issues.map(code => <option key={code} value={code}>{code.replaceAll("_", " ")}</option>)}
    </select>
    <label className="installed-adoption-check">
      <input type="checkbox" checked={acknowledged}
        onChange={event => setAcknowledged(event.target.checked)} />
      I understand this is an open, unverified owner triage note only, not independent
      source identity, signed receipt, original-host acceptance, or permission to connect.
    </label>
    <button type="button" disabled={!acknowledged} onClick={record}>Record Build 298 open triage (HOLD)</button>
    <button type="button" onClick={clear}>Clear Build 298 private review</button>
    <p role="status">{status}</p>
    <p><strong>{notes.length} local triage note(s); 0 verified closures.</strong></p>
    {notes.length > 0 && <ol aria-label="Build 298 local triage history">
      {notes.map((note, index) => <li key={index}>{note.recordedAtUtc}: {note.issue} — OPEN/HOLD</li>)}
    </ol>}
    <p><strong>AI Data Platform and Comms Hub source connections: HOLD.</strong>
      A valid packet schema only proves that local JSON matches the expected review format.</p>
  </section>;
}

