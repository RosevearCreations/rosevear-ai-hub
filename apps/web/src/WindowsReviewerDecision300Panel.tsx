import { useState } from "react";
import { exportShellIntake300, reviewDecisionEvidence300 } from "./windowsReviewerDecision300";
import { WindowsAuthorityReplay301Panel } from "./WindowsAuthorityReplay301Panel";

/** Offline decision-candidate review: does not connect to the Windows host or Master Shell. */
export function WindowsReviewerDecision300Panel({ expectedMainSha }: { expectedMainSha: string }) {
  const [packetRaw, setPacketRaw] = useState("");
  const [reviewerRaw, setReviewerRaw] = useState("");
  const [decisionRaw, setDecisionRaw] = useState("");
  const [observedMainSha, setObservedMainSha] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [showAuthority301, setShowAuthority301] = useState(false);
  const [message, setMessage] = useState("No independent reviewer decision or original-host authority verified.");
  const report = reviewDecisionEvidence300({ packetRaw, reviewerRaw, decisionRaw,
    observedMainSha, expectedMainSha, nowMs: Date.now() });
  function download() {
    const output = exportShellIntake300({ report, expectedMainSha,
      acknowledged, nowMs: Date.now() });
    setAcknowledged(false);
    if (!output) { setMessage("Export refused: owner acknowledgement or source revision invalid."); return; }
    const url = URL.createObjectURL(new Blob([JSON.stringify(output, null, 2) + "\n"],
      { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "rosevear-ai-hub-intake-300-" + new Date().toISOString().slice(0, 10) + ".json";
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Sanitized local HOLD handoff preview downloaded. No receiver was contacted.");
  }
  function clear() {
    setPacketRaw(""); setReviewerRaw(""); setDecisionRaw(""); setObservedMainSha("");
    setAcknowledged(false);
    setShowAuthority301(false);
    setMessage("Build 300 private review inputs cleared from the browser session.");
  }
  return <section aria-labelledby="windows-decision-300-title">
    <p className="eyebrow">Build 300 · Reviewer decision contract and Shell intake readiness</p>
    <h4 id="windows-decision-300-title">Inspect a decision candidate, not an authenticated approval</h4>
    <p>All four inputs are evaluated locally. A GitHub source revision typed here is an
      <strong> owner-reported recheck</strong>, not a trusted GitHub API response.
      Original Windows identity, independent signer, signed consent and Shell receiver authority
      must be established through a separately approved protected workflow.</p>
    <label htmlFor="windows-300-observed-sha">Latest source `main` revision (40 lowercase hexadecimal characters)</label>
    <input id="windows-300-observed-sha" maxLength={40} spellCheck={false}
      value={observedMainSha} onChange={event => { setObservedMainSha(event.target.value);
        setAcknowledged(false); }} />
    <label htmlFor="windows-300-packet">Private Build 297 metadata packet (24 KiB maximum)</label>
    <textarea id="windows-300-packet" rows={3} maxLength={24576} value={packetRaw}
      onChange={event => { setPacketRaw(event.target.value); setAcknowledged(false); }} />
    <label htmlFor="windows-300-reviewer">Build 299 reviewer-candidate JSON (4 KiB maximum)</label>
    <textarea id="windows-300-reviewer" rows={3} maxLength={4096} value={reviewerRaw}
      onChange={event => { setReviewerRaw(event.target.value); setAcknowledged(false); }} />
    <label htmlFor="windows-300-decision">Separate Build 300 decision-candidate JSON (4 KiB maximum)</label>
    <textarea id="windows-300-decision" rows={3} maxLength={4096} value={decisionRaw}
      onChange={event => { setDecisionRaw(event.target.value); setAcknowledged(false); }} />
    <p>Do not include names, credentials, private keys, signed receipt bytes, IP addresses,
      device identifiers or tenant information. Only the exact bounded metadata format in
      the Build 300 runbook is accepted.</p>
    <dl>
      <dt>Source revision recheck</dt><dd>{report.sourceRecheck.replaceAll("_", " ")}</dd>
      <dt>Reviewer decision</dt><dd>{report.state.replaceAll("_", " ")}</dd>
      <dt>Shell intake readiness</dt><dd>{report.shellIntakeReadiness.replaceAll("_", " ")}</dd>
      <dt>Outstanding exceptions</dt><dd>{report.issues.join(", ")}</dd>
      <dt>Trusted original-host receipt / Shell connection</dt><dd>HOLD / HOLD</dd>
    </dl>
    <label className="installed-adoption-check">
      <input type="checkbox" checked={acknowledged}
        onChange={event => setAcknowledged(event.target.checked)} />
      I understand this is an unverified, local-only HOLD preview. No approval, identity
      verification, evidence acceptance or permission to publish is granted by download.
    </label>
    <button type="button" disabled={!acknowledged} onClick={download}>
      Download Build 300 read-only Shell intake HOLD preview</button>
    <button type="button" onClick={clear}>Clear Build 300 private inputs</button>
    <p role="status">{message}</p>
    <p><strong>Independently verified decisions: 0. Messages sent: 0. Shell authorization: HOLD.</strong></p>
    <button type="button" aria-expanded={showAuthority301}
      onClick={() => setShowAuthority301(show => !show)}>
      {showAuthority301 ? "Close Build 301 protected-intake review" : "Open Build 301 protected-intake review"}
    </button>
    {showAuthority301 && <WindowsAuthorityReplay301Panel key={expectedMainSha}
      expectedMainSha={expectedMainSha} decisionReport={report} />}
  </section>;
}
