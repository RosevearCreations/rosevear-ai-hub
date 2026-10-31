import { useState } from "react";
import { inspectQl269PublicReadback, makeQl269PreflightReport, type Ql269PublicReadback } from "./ql269HubReview";
import { Ql270CustodyRenewalPanel } from "./Ql270CustodyRenewalPanel";

type PriorQl268 = { status: string; sourceA: string | null; proofB: string | null } | null;

/** Public-only evidence return comparison; deliberately NO fetch or activation handler. */
export function Ql269ConnectionReview({ priorQl268 }: { priorQl268: PriorQl268 }) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("NOT_RECEIVED");
  const [report, setReport] = useState("");
  const [readback, setReadback] = useState<Ql269PublicReadback | null>(null);
  function inspect() {
    const readback = inspectQl269PublicReadback(input);
    setStatus(readback.status);
    setReport(JSON.stringify(makeQl269PreflightReport(readback, priorQl268), null, 2));
    setReadback(readback);
    setInput("");
  }
  function clear() {
    setInput("");
    setStatus("NOT_RECEIVED");
    setReport("");
    setReadback(null);
  }
  return <section className="hub-connection-evidence ql269-inspection" aria-label="QL-269 independent source and GET preflight review">
    <div className="hub-evidence-title">
      <div><p className="eyebrow">Build 194 · I.T. evidence</p><h3>QL-269 · Original proof-B return &amp; isolated GET preflight</h3></div>
      <span className="hub-guard-badge">OFFLINE · HOLD</span>
    </div>
    <p>Independently observed Build 193 <code>main</code> <code>2dbdce5b3db71842e38d5146fd6b7b6a49ed33a5</code>: <strong>source proof HTTP 404</strong> despite successful exact-main CI. This is a historical source check, not a continuously monitored feed.</p>
    <p>Enter only a sanitized public, immutable-A/B readback <em>claim</em>. Compare it with the screened QL-268 claim above. A matching pair still does not authenticate the original signature, out-of-band pin, human reviewers, tenant isolation or source CI. Never enter credentials, private witnesses, signatures or home-server URLs.</p>
    <label htmlFor="ql269-public-readback">QL-269 public original-proof readback metadata (in memory only)</label>
    <textarea id="ql269-public-readback" value={input} maxLength={4096} rows={4}
      onChange={event => { setInput(event.target.value); setReport(""); setStatus("NOT_RECEIVED"); setReadback(null); }}
      placeholder="Sanitized public source readback metadata JSON only" />
    <div className="hub-connection-actions">
      <button type="button" onClick={inspect}>Compare original-proof readback &amp; prepare GET preflight (offline)</button>
      <button type="button" onClick={clear}>Clear QL-269 memory</button>
    </div>
    <p><strong>Public readback intake:</strong> <span aria-label="QL-269 readback intake status">{status}</span>. No live GETs, route creation, tenant selection, credentials or Windows relay install occurs here.</p>
    <pre aria-label="QL-269 sanitized independent GET preflight report" style={{ maxHeight: 490 }}>
      {report || "No source return inspected. Conditional TEST-only GET slot remains HELD / UNSCHEDULED."}
    </pre>
    <Ql270CustodyRenewalPanel priorQl269={readback} />
  </section>;
}
