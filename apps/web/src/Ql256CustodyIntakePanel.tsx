import { useState } from "react";
import { CardHelp } from "./CommandShell";
import { createCustodyCandidateReceipt, recordCustodyCandidate, SIGNER_DECISIONS,
  type CustodyCandidate, type CustodyCandidateInput } from "./ql256CustodyCandidate";

const blank: CustodyCandidateInput = { signer_decision: "SIGNER_STATUS_UNKNOWN",
  signer_key_id: "", public_spki_sha256: "", registry_snapshot_sha256: "",
  custodian_receipt_id: "", witness_receipt_id: "", reviewer_receipt_id: "" };

export function Ql256CustodyIntakePanel({ active = true }: { active?: boolean }) {
  const [input, setInput] = useState<CustodyCandidateInput>({ ...blank });
  const [notes, setNotes] = useState<CustodyCandidate[]>([]);
  const [operatorAcknowledged, setOperatorAcknowledged] = useState(false);
  const [holdAcknowledged, setHoldAcknowledged] = useState(false);
  const [feedback, setFeedback] = useState("");
  const change = (key: keyof CustodyCandidateInput, value: string) => {
    setInput(current => ({ ...current, [key]: value }));
    setOperatorAcknowledged(false); setHoldAcknowledged(false); setFeedback("");
  };
  function record() {
    try {
      const next = recordCustodyCandidate(notes, input, operatorAcknowledged, holdAcknowledged);
      setNotes(next);
      setOperatorAcknowledged(false); setHoldAcknowledged(false);
      setFeedback("Nonsecret local candidate recorded; no real custodian/witness or key provenance authenticated.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not record QL-256 candidate."); }
  }
  function download() {
    try {
      const receipt = createCustodyCandidateReceipt(notes);
      const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a"); anchor.href = url;
      anchor.download = `rosevear-ql256-private-custody-candidates-${receipt.exported_at.slice(0, 10)}.json`;
      anchor.click(); URL.revokeObjectURL(url);
      setFeedback("Only candidate public metadata exported. Human out-of-band custody and witness checks remain required.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not export safe candidate."); }
  }
  return <section className="owner-handoff-reconciliation" aria-label="Build 184 private signer custody metadata intake">
    <header className="owner-trial-ledger-heading"><div>
      <h3>Build 184 · Private signer custody decision intake (candidate only)</h3>
      <p>Only nonsecret opaque receipt references and public digests. This local browser form cannot authenticate a person, inspect a secret manager or publish a signed proof.</p>
    </div><strong className="owner-trial-hold">TRUST NOT VERIFIED</strong></header>
    <CardHelp title="QL-256 original private signer and independent witness evidence">
      Ask the approved private operator to decide whether a genuine Ed25519 signer exists. A different independent witness and reviewer must authenticate key custody through a private channel. Enter no names, contacts, passwords, HMAC values, private keys, LAN addresses, personal records or original signed private challenge. IDs and public SPKI digests recorded here are unverified candidates until a different human checks the trusted registry outside GitHub.
    </CardHelp>
    <fieldset className="owner-review-entry"><legend>Nonsecret source signer / custody candidate</legend>
      <label>Private operator signer decision <select value={input.signer_decision} disabled={!active}
        onChange={event => change("signer_decision", event.target.value)}>
        {SIGNER_DECISIONS.map(decision => <option key={decision} value={decision}>{decision}</option>)}
      </select></label>
      {([
        ["signer_key_id", "Opaque signer key ID (not the key)"],
        ["public_spki_sha256", "Candidate public Ed25519 SPKI SHA-256 (64 lowercase hex)"],
        ["registry_snapshot_sha256", "Candidate private registry snapshot digest (64 lowercase hex)"],
        ["custodian_receipt_id", "Opaque private custodian receipt reference"],
        ["witness_receipt_id", "Different witness receipt reference"],
        ["reviewer_receipt_id", "Different reviewer receipt reference"],
      ] as const).map(([key, label]) => <label key={key}>{label}
        <input value={input[key]} disabled={!active} maxLength={80} autoComplete="off"
          onChange={event => change(key, event.target.value)} placeholder="Optional safe nonsecret reference only" />
      </label>)}
      <label className="owner-trial-check"><input type="checkbox" checked={operatorAcknowledged}
        disabled={!active} onChange={event => { setOperatorAcknowledged(event.target.checked); setHoldAcknowledged(false); }} />
        I am recording only an operator-supplied candidate, not asserting independently verified identity, signer possession or a trusted pin.</label>
      <label className="owner-trial-check"><input type="checkbox" checked={holdAcknowledged}
        disabled={!active || !operatorAcknowledged} onChange={event => setHoldAcknowledged(event.target.checked)} />
        I acknowledge owner TEST approval NOT GIVEN, authentic gateway receipts NOT RUN, proof B NOT AVAILABLE and private relay NOT INSTALLED.</label>
      <button type="button" disabled={!active || !operatorAcknowledged || !holdAcknowledged}
        onClick={record}>Record nonsecret candidate only (HOLD)</button>
    </fieldset>
    <div className="owner-decision-summary">
      <span>{notes.length} local candidate(s), none independently authenticated</span>
      <span>Signer decision: {notes.at(-1)?.signer_decision ?? "SIGNER_STATUS_UNKNOWN"}</span>
      <span>Public signed proof B: NOT AVAILABLE</span>
      <span>Owner TEST: NOT GIVEN · relay OFF</span>
    </div>
    <button type="button" disabled={!active || !notes.length} onClick={download}>
      Download sanitized QL-256 candidate packet (NOT VERIFIED)
    </button>
    {feedback && <p role="status">{feedback}</p>}
    <p className="owner-trial-privacy">No data is sent to an API; input is session-local and expires on reload. A candidate packet never grants independent source trust or authenticated owner permission. Final QL-246 proof requires genuinely witnessed nonproduction GET and seven denials, durable audit, and out-of-band signer pin verification. All integration remains DISCONNECTED / HOLD.</p>
  </section>;
}
