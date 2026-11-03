import { useState } from "react";
import { CardHelp } from "./CommandShell";
import { WindowsDarkOwner233Panel } from "./WindowsDarkOwner233Panel";
import { type ShellTheme } from "./CommandShell";
import {
  safeWindowsFieldReference, type WindowsFieldDraft, type WindowsFieldScope,
} from "./windowsFieldAcceptance228";
import { type WindowsTriageDraft } from "./windowsFindingTriage229";
import { type WindowsRetestDraft } from "./windowsRecoveryRetest230";
import { type WindowsClosure231Draft, type WindowsClosure231Id } from "./windowsOwnerClosure231";
import {
  defaultIndependent232Entry, formatWindowsIndependentPacket232, summarizeWindowsIndependent232,
  windows232DecisionKey, windows232ReviewerKey, windows232SourceKey, windowsIndependent232GateLabels,
  type WindowsIndependent232Basis, type WindowsIndependent232Draft, type WindowsIndependent232Entry,
  type WindowsIndependent232Outcome, type WindowsOwner232Decision,
} from "./windowsIndependentClosure232";

export function WindowsIndependentClosure232Panel({ draft, scope, plans, retests, closure231, theme = "dark" }: {
  draft: WindowsFieldDraft; scope: WindowsFieldScope; plans: WindowsTriageDraft;
  retests: WindowsRetestDraft; closure231: WindowsClosure231Draft; theme?: ShellTheme;
}) {
  const [decisions, setDecisions] = useState<WindowsIndependent232Draft>({});
  // Mount the lengthy installed-Windows worksheet only when the owner opens it.
  // This keeps legacy 228–232 evidence entry and its keyboard interactions responsive.
  const [showBuild233, setShowBuild233] = useState(false);
  const [notice, setNotice] = useState("");
  const result = summarizeWindowsIndependent232(draft, scope, plans, retests, closure231, decisions);

  function update(id: WindowsClosure231Id, change: Partial<WindowsIndependent232Entry>) {
    const row = result.rows.find(item => item.id === id);
    if (!row) return;
    setDecisions(current => {
      const previous = current[id] ?? defaultIndependent232Entry;
      const sourceKey = row.gate === "awaiting_231_owner_packet" ? "" : windows232SourceKey(row.source);
      const next: WindowsIndependent232Entry = { ...previous, ...change, sourceKey };
      if (previous.sourceKey && previous.sourceKey !== sourceKey) {
        // A changed Build 228–231 source needs genuinely new external reviewer evidence,
        // not a fresh timestamp attached to an old receipt.
        next.reviewerCode = "";
        next.reviewerReference = "";
        next.reviewerBasis = "none";
        next.reviewerOutcome = "not_reviewed";
        next.separateReviewerAttested = false;
        next.ownerDecision = "pending";
        next.ownerDecisionReference = "";
        next.ownerSeparatelyAuthorized = false;
      }
      const reviewerKeys = ["reviewerCode", "reviewerReference", "reviewerBasis", "reviewerOutcome", "separateReviewerAttested"];
      if (sourceKey !== previous.sourceKey || reviewerKeys.some(key => key in change)) {
        next.reviewerRecordedAt = "";
        next.reviewedEvidenceKey = "";
        next.ownerRecordedAt = "";
        next.reviewedDecisionKey = "";
      } else if (["ownerDecision", "ownerDecisionReference", "ownerSeparatelyAuthorized"].some(key => key in change)) {
        next.ownerRecordedAt = "";
        next.reviewedDecisionKey = "";
      }
      return { ...current, [id]: next };
    });
    setNotice("");
  }

  function recordReviewer(id: WindowsClosure231Id) {
    const row = result.rows.find(item => item.id === id);
    if (!row || row.gate === "awaiting_231_owner_packet" || row.gate === "source_changed") return;
    setDecisions(current => {
      const next = { ...defaultIndependent232Entry, ...current[id],
        sourceKey: windows232SourceKey(row.source), reviewerRecordedAt: new Date().toISOString(),
        ownerRecordedAt: "", reviewedDecisionKey: "" };
      return { ...current, [id]: { ...next, reviewedEvidenceKey: windows232ReviewerKey(next) } };
    });
    setNotice("Reviewer reference and owner-entered time recorded in this browser only. The reviewer has NOT been authenticated by the Hub.");
  }

  function recordOwner(id: WindowsClosure231Id) {
    const row = result.rows.find(item => item.id === id);
    if (!row || !["reviewer_conflict", "reviewer_insufficient", "owner_decision_needed", "owner_authorization_gap", "owner_freshness_gap",
      "owner_retest_requested", "owner_deferred", "owner_closure_review_request"].includes(row.gate)) return;
    setDecisions(current => {
      const next = { ...defaultIndependent232Entry, ...current[id],
        sourceKey: windows232SourceKey(row.source), ownerRecordedAt: new Date().toISOString() };
      return { ...current, [id]: { ...next, reviewedDecisionKey: windows232DecisionKey(next) } };
    });
    setNotice("Separate owner decision time recorded locally. No field issue was independently verified or closed.");
  }

  async function copyPacket() {
    try {
      await navigator.clipboard.writeText(formatWindowsIndependentPacket232(draft, scope, plans, retests, closure231, decisions));
      setNotice("Redacted owner-entered Build 232 decision packet copied. Save privately for an actual external reviewer; no upload or closure occurred.");
    } catch { setNotice("Clipboard unavailable. These notes remain in this browser session only."); }
  }

  return <section className="windows-independent-232" id="hub-system-independent-232" aria-labelledby="windows-independent-232-title">
    <header className="hub-search-header"><div>
      <p className="eyebrow">Build 232 · independent evidence and owner disposition</p>
      <h2 id="windows-independent-232-title">Windows independent evidence reconciliation &amp; authorized closure decisions</h2>
    </div><CardHelp title="What is independent here?">The owner can enter safe tracking codes received from a separate reviewer and request a separately authorized closure review. The Hub cannot authenticate a reviewer from a typed code. Even a fully entered packet is not independent verification, permission for a live repair, or a confirmed Windows issue closure.</CardHelp></header>
    <p>Start with an actual Build 228 finding, source-matched Build 229 plan, required Build 230 retest, and a fresh Build 231 owner packet. Then compare distinct external reviewer evidence and make a separate owner disposition. Nothing on this screen contacts reviewers, probes Windows, restarts services, changes roles, restores backups, or opens cameras.</p>
    <div className="audit-summary" aria-label="Build 232 independent review totals">
      <div><span>Owner-reported original findings</span><strong>{result.reportedFindings}</strong></div>
      <div><span>Source gaps / changes</span><strong>{result.sourceGaps}</strong></div>
      <div><span>Owner closure review requests (unverified)</span><strong>{result.reviewRequests}</strong></div>
      <div><span>Verified Windows closures</span><strong>{result.verifiedClosures}</strong></div>
    </div>
    <p role="status">{result.rows.length
      ? "All reviewer and owner decisions below are local, self-reported metadata until independently authenticated elsewhere. No Windows issue has been verified closed."
      : "No authentic Build 228–231 Windows owner findings or review packets exist in this session. There are zero independent review requests and zero verified closures."}</p>
    {result.rows.length ? <div className="windows-triage-229-list" aria-label="Build 232 source-matched independent review cases">
      {result.rows.map(row => <article className="windows-triage-229-card" key={row.id}>
        <div className="windows-triage-229-card-head"><div>
          <h3>{row.label}</h3>
          <p><strong>Original:</strong> Build 228 {row.original.reference || "MISSING"} · Build 229 {row.original.plan.reproductionReference || "MISSING"} · Build 231 {row.source.gate === "owner_packet_ready" ? "owner packet ready (unverified)" : "not owner-ready"}</p>
          <p><strong>Owner evidence:</strong> {row.source.entry.firstReference || "MISSING"} / {row.source.entry.secondReference || "MISSING"}</p>
        </div><span className="windows-field-228-state">{windowsIndependent232GateLabels[row.gate]}</span></div>
        <div className="windows-triage-229-fields">
          <label htmlFor={`windows-232-reviewer-code-${row.id}`}>Separate reviewer tracking code (not identity verification)
            <input id={`windows-232-reviewer-code-${row.id}`} maxLength={80} value={row.entry.reviewerCode}
              placeholder="WIN-232-REVIEWER" onChange={event => update(row.id, { reviewerCode: safeWindowsFieldReference(event.target.value) })} />
          </label>
          <label htmlFor={`windows-232-reviewer-ref-${row.id}`}>Independent evidence receipt reference (new safe code)
            <input id={`windows-232-reviewer-ref-${row.id}`} maxLength={80} value={row.entry.reviewerReference}
              placeholder="WIN-232-EXTERNAL-REF" onChange={event => update(row.id, { reviewerReference: safeWindowsFieldReference(event.target.value) })} />
          </label>
          <label htmlFor={`windows-232-reviewer-basis-${row.id}`}>Independent evidence type (owner-entered)
            <select id={`windows-232-reviewer-basis-${row.id}`} value={row.entry.reviewerBasis}
              onChange={event => update(row.id, { reviewerBasis: event.target.value as WindowsIndependent232Basis })}>
              <option value="none">No independent source</option><option value="independent_observation">Independent installed-Windows observation</option>
              <option value="redacted_independent_log">Redacted independently obtained log</option>
              <option value="supervised_independent_retest">Separately supervised independent retest</option>
            </select>
          </label>
          <label htmlFor={`windows-232-reviewer-outcome-${row.id}`}>Reviewer outcome as independently supplied
            <select id={`windows-232-reviewer-outcome-${row.id}`} value={row.entry.reviewerOutcome}
              onChange={event => update(row.id, { reviewerOutcome: event.target.value as WindowsIndependent232Outcome })}>
              <option value="not_reviewed">Not reviewed</option><option value="corroborated">Corroborated (owner-reported)</option>
              <option value="conflict">Contradiction — keep open</option><option value="insufficient">Insufficient evidence — keep open</option>
            </select>
          </label>
          <label htmlFor={`windows-232-owner-decision-${row.id}`}>Separate owner decision (not closure itself)
            <select id={`windows-232-owner-decision-${row.id}`} value={row.entry.ownerDecision}
              onChange={event => update(row.id, { ownerDecision: event.target.value as WindowsOwner232Decision })}>
              <option value="pending">Pending decision</option><option value="request_retest">Request another Windows retest</option>
              <option value="defer">Defer, keep the issue open</option>
              <option value="request_closure_review">Authorize independent closure review request only</option>
            </select>
          </label>
          <label htmlFor={`windows-232-owner-ref-${row.id}`}>Distinct owner decision reference (safe code)
            <input id={`windows-232-owner-ref-${row.id}`} maxLength={80} value={row.entry.ownerDecisionReference}
              placeholder="WIN-232-OWNER-DECISION" onChange={event => update(row.id, { ownerDecisionReference: safeWindowsFieldReference(event.target.value) })} />
          </label>
        </div>
        <div className="windows-independent-232-confirmations">
          <label><input type="checkbox" checked={row.entry.separateReviewerAttested}
            onChange={event => update(row.id, { separateReviewerAttested: event.target.checked })} />
            We have a separate reviewer’s evidence reference; this checkbox does not independently authenticate their identity.</label>
          <label><input type="checkbox" checked={row.entry.ownerSeparatelyAuthorized}
            onChange={event => update(row.id, { ownerSeparatelyAuthorized: event.target.checked })} />
            We explicitly authorize submitting a closure *review request* only, after checking these evidence references. This does not authorize repairs or close an issue.</label>
        </div>
        <p><small>Reviewer record: {row.entry.reviewerRecordedAt || "not recorded"} · Owner decision: {row.entry.ownerRecordedAt || "not recorded"}</small></p>
        <button type="button" onClick={() => recordReviewer(row.id)} disabled={row.source.gate !== "owner_packet_ready" || row.gate === "source_changed"}>Record fresh external reviewer reference</button>
        <button type="button" onClick={() => recordOwner(row.id)} disabled={!["reviewer_conflict", "reviewer_insufficient", "owner_decision_needed", "owner_authorization_gap", "owner_freshness_gap", "owner_retest_requested", "owner_deferred", "owner_closure_review_request"].includes(row.gate)}>Record separate owner decision</button>
        <p><strong>Gate:</strong> {windowsIndependent232GateLabels[row.gate]}. Verified closures: 0.</p>
      </article>)}
    </div> : <p className="windows-triage-229-empty">Complete the real installed-Windows owner reviews above before opening independent reconciliation. A GREEN GitHub build cannot supply an independent reviewer’s identity or evidence.</p>}
    <button type="button" onClick={() => void copyPacket()}>Copy private Build 232 reconciliation &amp; owner decision packet</button>
    {notice ? <p role="status">{notice}</p> : null}
    <p><small>Reviewer identity is unverified; no independent field closure or physical Windows acceptance is claimed. Six-app integration DISCONNECTED / HOLD; private relay OFF; QL-275 Under Review; vault SECURITY HOLD.</small></p>
    {showBuild233 ? <WindowsDarkOwner233Panel theme={theme} field={draft} scope={scope} plans={plans}
      retests={retests} closure231={closure231} independent232={decisions} /> : <div className="windows-dark-233-entry">
      <h3>Build 233 · Dark Mode Windows owner acceptance</h3>
      <p>When we are ready to check the installed Windows Hub, open the Dark Mode visual checklist and source-matched exception follow-up. Nothing is tested or closed automatically.</p>
      <button type="button" aria-controls="hub-system-dark-233" aria-expanded={false}
        onClick={() => setShowBuild233(true)}>Open Build 233 owner acceptance &amp; exception review</button>
    </div>}
  </section>;
}
