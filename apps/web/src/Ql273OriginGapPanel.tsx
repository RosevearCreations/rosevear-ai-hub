import { useState } from "react";
import { EMPTY_QL273_GAPS, makeQl273OriginGapDisposition, QL273_GAPS } from "./ql273OriginGap";
import type { Ql273GapLedger, Ql273GapProgress } from "./ql273OriginGap";
import { Ql274CustodianReturnPanel } from "./Ql274CustodianReturnPanel";

/** An owner-safe public action checklist; not an upload for signed/private witness material. */
export function Ql273OriginGapPanel({ priorQl272 = null }: { priorQl272?: { status: string; proofB: string | null } | null }) {
  const [progress, setProgress] = useState<Ql273GapLedger>({ ...EMPTY_QL273_GAPS });
  const [handoff, setHandoff] = useState("");
  const requested = QL273_GAPS.filter(gap => progress[gap.id] !== "not_requested").length;
  return <details className="hub-connection-evidence ql273-origin" aria-label="QL-273 original proof origin and independent custody gap follow-up">
    <summary><strong>QL-273 · Original Proof-B origin &amp; custody gaps</strong> <span className="hub-guard-badge">0 VERIFIED · HELD</span></summary>
    <p><strong>Independently observed source:</strong> original <code>docs/integration/ql246-source-proof.json</code> at immutable Build 197 <code>main</code> <code>11861c13801b395d9be7f8a661fe7ebf8bc25fd5</code> returned <strong>HTTP 404</strong> despite all five matching CI jobs passing. This is a historical source observation and not a live monitor.</p>
    <p><a href="https://github.com/RosevearCreations/rosevear-ai-hub/blob/11861c13801b395d9be7f8a661fe7ebf8bc25fd5/docs/integration/ql246-source-proof.json" target="_blank" rel="noreferrer">Open exact original path</a> · <a href="https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/41158753305" target="_blank" rel="noreferrer">Open matching main CI</a>. Open these only through normal browser navigation; this screen does not perform any gateway GETs.</p>
    <p>Track whether we have <em>requested</em> genuine evidence over the approved private channel. These selections are owner-reported follow-up notes only. Do not enter names, receipts, signatures, signer keys, pin values, credentials, addresses or endpoints here. No selection is an independent verification or a grant of TEST authority.</p>
    <div className="ql273-gap-grid">
      {QL273_GAPS.map(gap => <div className="ql273-gap-item" key={gap.id}>
        <strong>{gap.label}</strong>
        <small>{gap.action}</small>
        <label htmlFor={`ql273-${gap.id}`}>Private-channel follow-up status</label>
        <select id={`ql273-${gap.id}`} value={progress[gap.id]} onChange={event => {
          setProgress(current => ({ ...current, [gap.id]: event.target.value as Ql273GapProgress })); setHandoff("");
        }}>
          <option value="not_requested">Not requested</option>
          <option value="requested_privately">Requested privately (owner report)</option>
          <option value="owner_reports_return_received">Return reported (not independently verified)</option>
        </select>
      </div>)}
    </div>
    <p><strong>Follow-up:</strong> <span aria-label="QL-273 evidence follow-up status">{requested}/5 owner-reported actions · 0/5 independently verified</span>. Publication, pin, ancestry, independent custody and authorization remain open until original evidence is independently checked.</p>
    <div className="hub-connection-actions">
      <button type="button" onClick={() => setHandoff(JSON.stringify(makeQl273OriginGapDisposition(progress), null, 2))}>Prepare sanitized gap follow-up (offline)</button>
      <button type="button" onClick={() => { setProgress({ ...EMPTY_QL273_GAPS }); setHandoff(""); }}>Clear QL-273 local notes</button>
    </div>
    <pre aria-label="QL-273 sanitized original proof gap HOLD disposition" style={{ maxHeight: 480 }}>{handoff || "No follow-up report prepared. Original signed Proof-B source, independent reviewer custody and TEST gates remain HELD."}</pre>
    <Ql274CustodianReturnPanel priorQl272={priorQl272} />
  </details>;
}
