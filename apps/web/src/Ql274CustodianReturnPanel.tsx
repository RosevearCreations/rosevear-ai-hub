import { useState } from "react";
import { inspectQl274PublicReturn, makeQl274CustodianHoldReport } from "./ql274CustodianReturn";

type PriorQl272 = { status: string; proofB: string | null } | null;

/** A bounded public return-claim reconciliation, never a private witness or origin authority. */
export function Ql274CustodianReturnPanel({ priorQl272 }: { priorQl272: PriorQl272 }) {
  const [raw, setRaw] = useState("");
  const [status, setStatus] = useState("NOT_RECEIVED");
  const [report, setReport] = useState("");
  function inspect() {
    const claim = inspectQl274PublicReturn(raw);
    setStatus(claim.status);
    setReport(JSON.stringify(makeQl274CustodianHoldReport(claim, priorQl272), null, 2));
    setRaw("");
  }
  return <details className="hub-connection-evidence ql274-custodian" aria-label="QL-274 immutable original publication and public custodian return reconciliation">
    <summary><strong>QL-274 · Publication exception &amp; custodian return</strong> <span className="hub-guard-badge">ORIGINAL 404 · HELD</span></summary>
    <p><strong>Independent original source renewal:</strong> Build 198 immutable <code>main</code> <code>29e1fbe490c020efd34d598c080a7da72c9bffd5</code>, exact signed file <code>docs/integration/ql246-source-proof.json</code>: <strong>HTTP 404</strong>. All five matching main CI jobs passed. This was checked at that commit, not continuously.</p>
    <p><a href="https://github.com/RosevearCreations/rosevear-ai-hub/blob/29e1fbe490c020efd34d598c080a7da72c9bffd5/docs/integration/ql246-source-proof.json" target="_blank" rel="noreferrer">Inspect immutable original</a> · <a href="https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/41160623174" target="_blank" rel="noreferrer">Inspect exact-main CI</a>.</p>
    <p>Only paste the sanitized <em>public 14-field claim</em> from the QL-274 handoff. We compare the reported Proof-B identity with the QL-272 public claim in this session and flag reported HTTP 200 against the independently observed 404. A role or pin claim is not a real independent human witness. Keep actual signed originals, private pin challenges, person identifiers and credentials with the authorized custodian, never in this field.</p>
    <label htmlFor="ql274-public-custodian">Public QL-274 custodian-return claim JSON (session only)</label>
    <textarea id="ql274-public-custodian" rows={4} maxLength={4096} value={raw}
      placeholder="Public metadata only — no private receipts, signer secrets or personal identity"
      onChange={event => { setRaw(event.target.value); setStatus("NOT_RECEIVED"); setReport(""); }} />
    <div className="hub-connection-actions">
      <button type="button" onClick={inspect}>Reconcile public return &amp; prepare HOLD report (offline)</button>
      <button type="button" onClick={() => { setRaw(""); setStatus("NOT_RECEIVED"); setReport(""); }}>Clear QL-274 memory</button>
    </div>
    <p><strong>Return screening:</strong> <span aria-label="QL-274 return screening status">{status}</span>. No public claim authorizes a GET, private relay or TEST window.</p>
    <pre aria-label="QL-274 sanitized custodian exception disposition" style={{ maxHeight: 480 }}>{report || "No authentic original or verified custodian witness received. All security gates remain HELD."}</pre>
  </details>;
}
