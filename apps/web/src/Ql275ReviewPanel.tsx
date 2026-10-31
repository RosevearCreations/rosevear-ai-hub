import { QL275_REVIEW } from "./ql275DeferredReview";

/** Owner-deferred work queue, visible in the real System I.T. workspace. */
export function Ql275ReviewPanel() {
  return <section className="hub-ql275-review" aria-label="QL-275 deferred review status">
    <div className="hub-evidence-title">
      <div>
        <p className="eyebrow">Build 200 · QL-275</p>
        <h3>Original Proof-B &amp; independent witness review</h3>
      </div>
      <span className="hub-ql275-badge" aria-label="QL-275 tracking status">Under Review</span>
    </div>
    <p><strong>Paused at our request.</strong> QL-275 is set aside until we explicitly ask to resume. There is no active evidence intake, private custodian challenge or scheduled nonproduction GET trial in this review queue.</p>
    <details className="hub-ql275-detail">
      <summary>What was verified before pausing?</summary>
      <p>At immutable Build 199 <code>main</code> <code>{QL275_REVIEW.sourceMainSha}</code>, the original signed file <code>{QL275_REVIEW.sourcePath}</code> returned <strong>HTTP 404</strong>; the matching five-job source workflow passed. This is an exact historical source observation, not ongoing monitoring or a signature verification.</p>
      <p><a href={`https://github.com/RosevearCreations/rosevear-ai-hub/blob/${QL275_REVIEW.sourceMainSha}/${QL275_REVIEW.sourcePath}`} target="_blank" rel="noreferrer">Inspect immutable original path</a> · <a href={`https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/${QL275_REVIEW.sourceCiRun}`} target="_blank" rel="noreferrer">Inspect source CI</a>.</p>
      <p>To reopen later: ask us to resume QL-275, then obtain the real signed original and independent custody/pin witness through the approved private process. Never paste secrets or human identity evidence here.</p>
    </details>
    <p className="hub-ql275-safety"><strong>Connection safety is separate:</strong> integrations remain <span aria-label="QL-275 connection safety status">DISCONNECTED / HOLD</span>, the private relay is OFF and authenticated gateway GETs remain zero. Changing the review label never authorizes activation.</p>
  </section>;
}
