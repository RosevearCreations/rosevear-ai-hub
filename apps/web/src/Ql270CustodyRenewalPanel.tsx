import { useState } from "react";
import { inspectQl270PublicRenewal, makeQl270HoldRecheck } from "./ql270HubRenewal";
import { Ql271ProofReturnPanel } from "./Ql271ProofReturnPanel";
import type { Ql270Renewal } from "./ql270HubRenewal";

type PriorReadback = { status: string; proofB: string | null } | null;

/** In-memory public-only evidence worksheet. No live verification or connection code. */
export function Ql270CustodyRenewalPanel({ priorQl269 }: { priorQl269: PriorReadback }) {
  const [raw, setRaw] = useState("");
  const [status, setStatus] = useState("NOT_RECEIVED");
  const [report, setReport] = useState("");
  const [renewal, setRenewal] = useState<Ql270Renewal | null>(null);
  function screen() {
    const candidate = inspectQl270PublicRenewal(raw);
    setStatus(candidate.status);
    setReport(JSON.stringify(makeQl270HoldRecheck(candidate, priorQl269), null, 2));
    setRenewal(candidate);
    setRaw("");
  }
  function clear() {
    setRaw("");
    setStatus("NOT_RECEIVED");
    setReport("");
    setRenewal(null);
  }
  return <section className="hub-connection-evidence ql270-renewal" aria-label="QL-270 public custody and pin renewal audit">
    <div className="hub-evidence-title">
      <div><p className="eyebrow">Build 195 · independent source evidence</p><h3>QL-270 · Proof-B source recheck &amp; custody/pin renewal</h3></div>
      <span className="hub-guard-badge">NOT VERIFIED · HOLD</span>
    </div>
    <p>The last independently checked immutable <code>main</code> is <code>4db6746cbb862b5a4b972c918601ef5c6f3ee927</code>; its source CI was GREEN but <strong>the original signed-proof path returned HTTP 404</strong>. This dated observation cannot prove any future publication.</p>
    <p>Independent reviewers must retrieve the genuine descendant proof B, verify A→B ancestry, original signature and SPKI pin out of band, then return private custody decisions through an approved channel. This screen screens only a <em>nonsecret public renewal claim</em>; fresh or matching digests do not prove signer custody.</p>
    <p><a href="https://github.com/RosevearCreations/rosevear-ai-hub/blob/4db6746cbb862b5a4b972c918601ef5c6f3ee927/docs/integration/ql246-source-proof.json" target="_blank" rel="noreferrer">Inspect immutable public proof source</a> · <a href="https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/41116285506" target="_blank" rel="noreferrer">Inspect exact-source CI</a>. These links are manual; the app sends no request until a person opens one.</p>
    <label htmlFor="ql270-public-renewal">Sanitized public custody/pin renewal metadata (temporary memory only)</label>
    <textarea id="ql270-public-renewal" rows={4} maxLength={4096} value={raw}
      onChange={event => { setRaw(event.target.value); setStatus("NOT_RECEIVED"); setReport(""); setRenewal(null); }}
      placeholder="No private receipts, signatures, keys, challenges, addresses or home-network endpoints" />
    <div className="hub-connection-actions">
      <button type="button" onClick={screen}>Screen public renewal &amp; prepare sanitized HOLD report (offline)</button>
      <button type="button" onClick={clear}>Clear QL-270 memory</button>
    </div>
    <p><strong>Renewal intake:</strong> <span aria-label="QL-270 renewal intake status">{status}</span>. Integration, gateway GET slot, signer trust and private relay remain blocked.</p>
    <pre aria-label="QL-270 sanitized custody and source HOLD report" style={{ maxHeight: 490 }}>
      {report || "No public renewal inspected. Original source, custody, pin and owner TEST-only gates remain HELD."}
    </pre>
    <Ql271ProofReturnPanel priorQl270={renewal} />
  </section>;
}
