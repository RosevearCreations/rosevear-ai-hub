import { useState } from "react";
import { inspectQl272PublicProvenance, makeQl272ProvenanceHoldReport } from "./ql272ReviewerProvenance";
import type { Ql272Provenance } from "./ql272ReviewerProvenance";
import { Ql273OriginGapPanel } from "./Ql273OriginGapPanel";

type PriorQl271 = { status: string; proofB: string | null } | null;

/** Public source provenance worksheet, never a signed/private reviewer intake. */
export function Ql272ReviewerProvenancePanel({ priorQl271 }: { priorQl271: PriorQl271 }) {
  const [raw, setRaw] = useState("");
  const [status, setStatus] = useState("NOT_RECEIVED");
  const [report, setReport] = useState("");
  const [review, setReview] = useState<Ql272Provenance | null>(null);
  function inspect() {
    const claim = inspectQl272PublicProvenance(raw);
    setStatus(claim.status);
    setReport(JSON.stringify(makeQl272ProvenanceHoldReport(claim, priorQl271), null, 2));
    setReview(claim);
    setRaw("");
  }
  return <details className="hub-connection-evidence ql272-provenance" aria-label="QL-272 reviewer evidence provenance and source recheck">
    <summary><strong>QL-272 · Independent publication recheck &amp; reviewer provenance</strong> <span className="hub-guard-badge">SOURCE 404 · HELD</span></summary>
    <p>Build 197 · original source rechecked at immutable Build 196 <code>main</code> <code>1ffb37c4eb750b4c8969b44f76692c74845179bb</code>. GitHub returned <strong>HTTP 404</strong> for <code>docs/integration/ql246-source-proof.json</code>, while the exact-main five-job workflow was GREEN. This is a historical observation—not an automatic ongoing source monitor.</p>
    <p><a href="https://github.com/RosevearCreations/rosevear-ai-hub/blob/1ffb37c4eb750b4c8969b44f76692c74845179bb/docs/integration/ql246-source-proof.json" target="_blank" rel="noreferrer">Inspect immutable original</a> · <a href="https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/41153883513" target="_blank" rel="noreferrer">Inspect matching production CI</a>.</p>
    <p>Enter only a <em>sanitized public provenance metadata claim</em>. We compare reported B with the screened QL-271 claim above and flag a reported HTTP 200 against our observed HTTP 404. Digest shape, matching SHAs and a reported independent role do not authenticate the genuine original, signer, reviewer or out-of-band pin. Private evidence stays in the authorized custody channel.</p>
    <label htmlFor="ql272-public-provenance">Public provenance claim JSON (temporary memory only)</label>
    <textarea id="ql272-public-provenance" rows={4} maxLength={4096} value={raw}
      onChange={event => { setRaw(event.target.value); setStatus("NOT_RECEIVED"); setReport(""); setReview(null); }}
      placeholder="No private receipts, names, keys, signatures, pin challenges, addresses or endpoints" />
    <div className="hub-connection-actions">
      <button type="button" onClick={inspect}>Screen public provenance &amp; prepare HOLD disposition (offline)</button>
      <button type="button" onClick={() => { setRaw(""); setStatus("NOT_RECEIVED"); setReport(""); setReview(null); }}>Clear QL-272 memory</button>
    </div>
    <p><strong>Provenance intake:</strong> <span aria-label="QL-272 provenance intake status">{status}</span>. This never authorizes a connection, owner TEST window or Windows relay.</p>
    <pre aria-label="QL-272 sanitized provenance exception disposition" style={{ maxHeight: 480 }}>
      {report || "Original Proof-B source and independent custody/pin gates remain HELD. No reviewer claim screened."}
    </pre>
    <Ql273OriginGapPanel priorQl272={review} />
  </details>;
}
