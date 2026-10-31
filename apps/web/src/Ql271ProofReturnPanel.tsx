import { useState } from "react";
import { inspectQl271Return, makeQl271HoldDisposition } from "./ql271ProofReturn";
import type { Ql271Return } from "./ql271ProofReturn";
import { Ql272ReviewerProvenancePanel } from "./Ql272ReviewerProvenancePanel";

type PriorQl270 = { status: string; proofB: string | null } | null;

/** Manual, memory-only public return screening. Does not import private custody data. */
export function Ql271ProofReturnPanel({ priorQl270 }: { priorQl270: PriorQl270 }) {
  const [raw, setRaw] = useState("");
  const [status, setStatus] = useState("NOT_RECEIVED");
  const [report, setReport] = useState("");
  const [review, setReview] = useState<Ql271Return | null>(null);
  function inspect() {
    const claim = inspectQl271Return(raw);
    setStatus(claim.status);
    setReport(JSON.stringify(makeQl271HoldDisposition(claim, priorQl270), null, 2));
    setReview(claim);
    setRaw("");
  }
  return <section className="hub-connection-evidence ql271-return" aria-label="QL-271 original proof return and independent reviewer disposition">
    <div className="hub-evidence-title">
      <div><p className="eyebrow">Build 196 · source truth &amp; reviewer disposition</p><h3>QL-271 · Original signed Proof-B return</h3></div>
      <span className="hub-guard-badge">ORIGINAL NOT FOUND · HOLD</span>
    </div>
    <p><strong>Independent source check:</strong> exact Build 195 <code>main</code> <code>3845613bb7b7af6bb4fa97fb10b72c2600ba0e84</code> was CI GREEN, but <strong>the required original proof file returned HTTP 404</strong>. The GitHub source check and the result of screening an uploaded claim are separate evidence.</p>
    <p><a target="_blank" rel="noreferrer" href="https://github.com/RosevearCreations/rosevear-ai-hub/blob/3845613bb7b7af6bb4fa97fb10b72c2600ba0e84/docs/integration/ql246-source-proof.json">Inspect exact original source</a> · <a target="_blank" rel="noreferrer" href="https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/41150092231">Inspect five-job production CI</a>. Opening either link is a manual browser action, not an authenticated gateway test.</p>
    <p>A reviewer may supply only the <em>public sanitized return metadata</em> defined in the QL-271 handoff. Its HOLD / REVIEW_PENDING disposition remains an unverified report until the original signed file, true ancestry, pinned identity and private reviewer custody are verified independently. No keys, signatures, personal names, addresses, challenges or relay secrets belong here.</p>
    <label htmlFor="ql271-return-input">Sanitized public review return JSON (temporary browser memory)</label>
    <textarea id="ql271-return-input" maxLength={4096} rows={4} value={raw}
      onChange={event => { setRaw(event.target.value); setReport(""); setStatus("NOT_RECEIVED"); setReview(null); }}
      placeholder="Public claim only; private signer/pin evidence must stay out of the application" />
    <div className="hub-connection-actions">
      <button type="button" onClick={inspect}>Screen public original-return claim (offline)</button>
      <button type="button" onClick={() => { setRaw(""); setReport(""); setStatus("NOT_RECEIVED"); setReview(null); }}>Clear QL-271 memory</button>
    </div>
    <p><strong>Reviewer intake:</strong> <span aria-label="QL-271 public reviewer intake status">{status}</span>. No connection, independent approval or conditional GET schedule is created.</p>
    <pre aria-label="QL-271 sanitized reviewer HOLD disposition" style={{ maxHeight: 480 }}>
      {report || "No reviewer public return inspected. Original signed source and private evidence gates remain HELD."}
    </pre>
    <Ql272ReviewerProvenancePanel priorQl271={review} />
  </section>;
}
