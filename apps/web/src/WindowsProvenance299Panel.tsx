import { useState } from "react";
import { exportShellStatus299, reconcileOriginalProvenance299 } from "./windowsProvenance299";
import { WindowsReviewerDecision300Panel } from "./WindowsReviewerDecision300Panel";

/** Metadata-only local reviewer intake. It cannot authenticate a person or a receipt. */
export function WindowsProvenance299Panel({ expectedMainSha }: { expectedMainSha: string }) {
  const [packetRaw, setPacketRaw] = useState("");
  const [reviewerRaw, setReviewerRaw] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [showDecision300, setShowDecision300] = useState(false);
  const [message, setMessage] = useState("No original-host receipt or independent reviewer evidence verified.");
  const report = reconcileOriginalProvenance299({ packetRaw, reviewerRaw,
    expectedMainSha, nowMs: Date.now() });
  function exportStatus() {
    const safe = exportShellStatus299({ report, expectedMainSha,
      acknowledged, nowMs: Date.now() });
    setAcknowledged(false);
    if (!safe) { setMessage("Export refused; review acknowledgement or source revision invalid."); return; }
    const url = URL.createObjectURL(new Blob([JSON.stringify(safe, null, 2) + "\n"],
      { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "rosevear-ai-hub-shell-status-299-" +
      new Date().toISOString().slice(0, 10) + ".json";
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("Sanitized HOLD status exported locally. No application, receiver or Windows host was contacted.");
  }
  function clear() {
    setPacketRaw(""); setReviewerRaw(""); setAcknowledged(false);
    setShowDecision300(false);
    setMessage("Private Build 299 review inputs cleared from this browser session.");
  }
  return <section aria-labelledby="windows-provenance-299-title">
    <p className="eyebrow">Build 299 · Original-host provenance and reviewer exception intake</p>
    <h4 id="windows-provenance-299-title">Reconcile separate metadata candidates (offline)</h4>
    <p>This compares source revision, claimed custody digest and chronology only. Even matching
      metadata is not independently authenticated original Windows evidence, verified reviewer
      identity, signed owner consent or a cryptographic receipt.</p>
    <label htmlFor="windows-299-packet">Private Build 297 metadata-only packet (24 KiB maximum)</label>
    <textarea id="windows-299-packet" rows={4} maxLength={24576} value={packetRaw}
      onChange={event => { setPacketRaw(event.target.value); setAcknowledged(false); }} />
    <label htmlFor="windows-299-reviewer">Separate sanitized reviewer-candidate JSON (4 KiB maximum)</label>
    <textarea id="windows-299-reviewer" rows={4} maxLength={4096} value={reviewerRaw}
      onChange={event => { setReviewerRaw(event.target.value); setAcknowledged(false); }} />
    <p>Use only the bounded metadata format described in the Build 299 runbook. Do not paste
      signatures, private keys, passwords, personal names, network origins, household or device data.
      The original independent reviewer must still be authenticated through a protected channel.</p>
    <dl>
      <dt>Source</dt><dd>rosevear-ai-hub (claimed, not authenticated)</dd>
      <dt>Provenance review</dt><dd>{report.state.replaceAll("_", " ")}</dd>
      <dt>Packet</dt><dd>{report.packetState.replaceAll("_", " ")}</dd>
      <dt>Reviewer reference</dt><dd>{report.reviewerReference ?? "Not accepted"}</dd>
      <dt>Exceptions</dt><dd>{report.issues.join(", ")}</dd>
      <dt>Original host / independent reviewer / signed receipt</dt><dd>HOLD / HOLD / HOLD</dd>
      <dt>AI Data Platform / Comms Hub</dt><dd>HOLD / HOLD</dd>
    </dl>
    <label className="installed-adoption-check">
      <input type="checkbox" checked={acknowledged}
        onChange={event => setAcknowledged(event.target.checked)} />
      I understand the Shell JSON is a private, unverified HOLD status for future review only;
      exporting it does not accept evidence or publish any connection state.
    </label>
    <button type="button" disabled={!acknowledged} onClick={exportStatus}>
      Download sanitized Build 299 Shell HOLD status</button>
    <button type="button" onClick={clear}>Clear Build 299 private inputs</button>
    <p role="status">{message}</p>
    <p><strong>Verified receipt count: 0. Published messages: 0. Master Shell authorization: HOLD.</strong></p>
    <button type="button" aria-expanded={showDecision300}
      onClick={() => setShowDecision300(value => !value)}>
      {showDecision300 ? "Close Build 300 private decision review" : "Open Build 300 private decision review"}
    </button>
    {showDecision300 && <WindowsReviewerDecision300Panel key={expectedMainSha}
      expectedMainSha={expectedMainSha} />}
  </section>;
}

