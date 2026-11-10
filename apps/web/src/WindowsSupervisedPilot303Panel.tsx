import { useState } from "react";
import { getMasterShellLocalUptime303 } from "./api";
import { buildMasterShellHandoff303, inspectMasterShellUptime303, type Uptime303 } from "./masterShellUptime303";
import type { inspectReceiptCandidate301 } from "./windowsAuthorityReplay301";
import type { LocalEscalation302 } from "./windowsProtectedOperator302";

/** One-candidate owner review and sanitized report, never original evidence intake. */
export function WindowsSupervisedPilot303Panel({ expectedMainSha, receiptReview, cases }: {
  expectedMainSha: string;
  receiptReview: ReturnType<typeof inspectReceiptCandidate301>;
  cases: readonly LocalEscalation302[];
}) {
  const [uptime, setUptime] = useState<Uptime303 | null>(null);
  const [ack, setAck] = useState(false);
  const [status, setStatus] = useState("One original source-signed receipt has not been independently verified.");

  async function observe() {
    setAck(false);
    try {
      const value = inspectMasterShellUptime303(await getMasterShellLocalUptime303());
      setUptime(value);
      setStatus(value ? "Read Ree-host monitoring metadata; original receipt evidence still HOLD."
        : "Local monitoring metadata rejected; retain HOLD.");
    } catch {
      setUptime(null);
      setStatus("Ree-host monitoring unavailable; no fallback to another computer.");
    }
  }
  function exportSummary() {
    const handoff = buildMasterShellHandoff303({
      currentMainSha: expectedMainSha, uptime,
      receiptCandidateState: receiptReview.state,
      caseIssueCodes: cases.map(entry => entry.issue),
      nowMs: Date.now(), acknowledged: ack,
    });
    setAck(false);
    if (!handoff) { setStatus("Pilot report refused: revision, exceptions or acknowledgement invalid."); return; }
    const url = URL.createObjectURL(new Blob([JSON.stringify(handoff, null, 2) + "\n"],
      { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "rosevear-ai-hub-master-shell-pilot-hold-303.json";
    anchor.click(); URL.revokeObjectURL(url);
    setStatus("Sanitized HOLD pilot summary downloaded; neither Master application was contacted.");
  }
  return <section aria-labelledby="windows-pilot-303-title">
    <p className="eyebrow">Build 303 · Original-host one-receipt supervised pilot</p>
    <h4 id="windows-pilot-303-title">One source-signed receipt and independent review</h4>
    <p>The protected server verifier now checks exact QL-364 receipt bytes against an independently
      pinned Ed25519 public key. This browser cannot supply the trusted pin or accept a receipt.
      Even a valid signature component does not prove host custody, independent reviewer,
      owner consent, durable nonce acceptance or receiver enrollment.</p>
    <ol aria-label="Build 303 one-receipt pilot boundaries">
      <li>Ree's original Windows host must be independently matched to the installed revision.</li>
      <li>Original source issuer and signer must be enrolled; receipt verified server-side.</li>
      <li>Jack/independent reviewer and Master owner authorize one exact TEST separately.</li>
      <li>Receiver verifies consent, atomic nonce claim and independent signed ACK.</li>
      <li>AI Data receives only authorized monitoring; Comms handles authorized exceptions.</li>
    </ol>
    <dl>
      <dt>Unsigned local candidate</dt><dd>{receiptReview.state.replaceAll("_", " ")}</dd>
      <dt>Local exception cases</dt><dd>{cases.length} OPEN/HOLD</dd>
      <dt>Ree-server monitoring</dt><dd>{uptime?.collectionState ?? "NOT OBSERVED"}</dd>
      <dt>Receipts independently accepted</dt><dd>0</dd>
      <dt>Master Shell links</dt><dd>AI Data HOLD; Comms receiver OFF / HOLD</dd>
    </dl>
    <button type="button" onClick={() => void observe()}>Read Ree-host monitoring (owner only)</button>
    <label className="installed-adoption-check">
      <input type="checkbox" checked={ack} onChange={event => setAck(event.target.checked)} />
      I understand the export is an offline, unverified one-receipt pilot status only;
      it does not authorize TEST, enroll an owner, send an alert or activate a connection.
    </label>
    <button type="button" disabled={!ack} onClick={exportSummary}>
      Download Master Shell one-receipt reconciliation (HOLD)
    </button>
    <p role="status">{status}</p>
  </section>;
}
