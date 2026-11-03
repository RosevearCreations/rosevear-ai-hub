import { useState } from "react";
import { CardHelp, type ShellTheme } from "./CommandShell";
import { safeWindowsFieldReference, type WindowsFieldScope } from "./windowsFieldAcceptance228";
import { type Dark233CheckId, type Dark233Draft } from "./windowsDarkOwner233";
import {
  dark234DecisionKey, dark234GateLabels, defaultDark234Entry, formatDarkFinding234Packet,
  summarizeDarkFinding234, type Dark234Action, type Dark234Decision, type Dark234Draft,
  type Dark234Entry, type Dark234Impact, type Dark234Priority, type Dark234Reproduction,
} from "./windowsDarkFinding234";

/** No external evidence service, privileged action or actual Windows repair is exposed here. */
export function WindowsDarkFinding234Panel({ theme, scope, visual }: {
  theme: ShellTheme; scope: WindowsFieldScope; visual: Dark233Draft;
}) {
  const [triage, setTriage] = useState<Dark234Draft>({});
  const [notice, setNotice] = useState("");
  const summary = summarizeDarkFinding234(theme, scope, visual, triage);

  function update(id: Dark233CheckId, change: Partial<Dark234Entry>) {
    const row = summary.rows.find(item => item.id === id);
    if (!row) return;
    setTriage(current => {
      const previous = current[id] ?? defaultDark234Entry;
      const next = previous.sourceKey && previous.sourceKey !== row.sourceKey
        ? { ...defaultDark234Entry, ...change, sourceKey: row.sourceKey }
        : { ...previous, ...change, sourceKey: row.sourceKey };
      return { ...current, [id]: { ...next, recordedAt: "", reviewedKey: "" } };
    });
    setNotice("");
  }

  function recordDecision(id: Dark233CheckId) {
    const row = summary.rows.find(item => item.id === id);
    if (!row || !["fresh_owner_record_missing", "conditional_review_ready", "retest_requested", "owner_deferred"].includes(row.gate)) return;
    setTriage(current => {
      const next = { ...defaultDark234Entry, ...current[id], sourceKey: row.sourceKey,
        recordedAt: new Date().toISOString() };
      return { ...current, [id]: { ...next, reviewedKey: dark234DecisionKey(next) } };
    });
    setNotice("Owner follow-up timestamp recorded for this exact finding. No independent reviewer was authenticated, and no repair was authorized or executed.");
  }

  async function copyPacket() {
    try {
      await navigator.clipboard.writeText(formatDarkFinding234Packet(theme, scope, visual, triage));
      setNotice("Redacted Build 234 owner triage packet copied privately. No proposal was automatically approved or uploaded.");
    } catch { setNotice("Clipboard unavailable. These notes remain only in this open browser session."); }
  }

  return <section className="windows-dark-finding-234" id="hub-system-dark-234" aria-labelledby="windows-dark-234-title">
    <header className="hub-search-header"><div>
      <p className="eyebrow">Build 234 · owner finding triage / conditional review</p>
      <h2 id="windows-dark-234-title">Dark Mode finding triage &amp; conditional repair authorization review</h2>
    </div><CardHelp title="What may be authorized here?">An owner may request a review of a proposed UI fix only after a source-matched installed-Windows Dark Mode finding. A typed reviewer reference is not independent authentication. Even a complete conditional packet does not authorize installation, editing files on Windows, role changes, a restore, device control or an external integration.</CardHelp></header>
    <p>Start with an actual owner-witnessed <strong>finding or blocked test in Build 233</strong>. Then prioritize its impact. Requesting an additional retest or deferring a finding needs a separate owner reference; a conditional repair review request additionally needs distinct reproduction, rollback and outside-review references, a presentation-only safety assessment and explicit owner consent. Actual execution remains unauthorized.</p>
    <div className="audit-summary" aria-label="Build 234 Dark Mode finding triage totals">
      <div><span>Source-matched owner findings</span><strong>{summary.ownerFindings}</strong></div>
      <div><span>Stale or out-of-scope drafts</span><strong>{summary.staleDrafts}</strong></div>
      <div><span>Conditional review packets (unverified)</span><strong>{summary.conditionalReviewPackets}</strong></div>
      <div><span>Repairs authorized / executed</span><strong>{summary.repairsAuthorized} / {summary.repairsExecuted}</strong></div>
    </div>
    <p role="status">{summary.ownerFindings
      ? "All proposals are owner-entered and tied to the current Build 233 source snapshot. No conditional review packet grants live repair permission."
      : "No authentic Build 233 Windows Dark Mode findings or blocked checks are ready in this session. No repair candidates, permissions or independent closures exist."}</p>
    {summary.staleDrafts ? <p role="status">At least one earlier draft no longer matches a current owner finding. It cannot be silently reused or treated as repaired.</p> : null}
    {summary.rows.length ? <div className="windows-triage-229-list" aria-label="Build 234 source-matched visual repair proposal cases">
      {summary.rows.map(row => <article className="windows-triage-229-card" key={row.id}>
        <div className="windows-triage-229-card-head"><div>
          <h3>{row.title}</h3>
          <p><strong>Original Build 233 finding:</strong> {row.findingReference} · observed {row.observedAt} · {row.findingGate}</p>
          <p>{row.instructions}</p>
        </div><span className="windows-field-228-state">{dark234GateLabels[row.gate]}</span></div>
        <div className="windows-triage-229-fields">
          <label htmlFor={`windows-234-priority-${row.id}`}>Owner priority based on actual impact
            <select id={`windows-234-priority-${row.id}`} value={row.entry.priority}
              onChange={event => update(row.id, { priority: event.target.value as Dark234Priority })}>
              <option value="unassigned">Not prioritized</option><option value="p1">P1 — prevents use / accessibility</option>
              <option value="p2">P2 — significant readability issue</option><option value="p3">P3 — cosmetic / low impact</option>
            </select></label>
          <label htmlFor={`windows-234-decision-${row.id}`}>Separate owner disposition (no repair execution)
            <select id={`windows-234-decision-${row.id}`} value={row.entry.ownerDecision}
              onChange={event => update(row.id, { ownerDecision: event.target.value as Dark234Decision })}>
              <option value="pending">Not decided</option><option value="request_retest">Request a fresh installed-Windows retest</option>
              <option value="defer">Defer — keep the finding open</option>
              <option value="request_conditional_review">Request conditional UI repair authorization REVIEW only</option>
            </select></label>
          <label htmlFor={`windows-234-repro-${row.id}`}>Reproduction method (required for conditional review)
            <select id={`windows-234-repro-${row.id}`} value={row.entry.reproduction}
              onChange={event => update(row.id, { reproduction: event.target.value as Dark234Reproduction })}>
              <option value="none">Not reproduced</option><option value="direct_windows">Direct installed-Windows reproduction</option>
              <option value="supervised_windows">Owner-supervised Windows retest</option>
            </select></label>
          <label htmlFor={`windows-234-repro-ref-${row.id}`}>New reproduction reference (safe code)
            <input id={`windows-234-repro-ref-${row.id}`} maxLength={80} value={row.entry.reproductionReference}
              placeholder="WIN-234-REPRO" onChange={event => update(row.id,
                { reproductionReference: safeWindowsFieldReference(event.target.value) })} /></label>
          <label htmlFor={`windows-234-action-${row.id}`}>Proposed UI-only change
            <select id={`windows-234-action-${row.id}`} value={row.entry.proposedAction}
              onChange={event => update(row.id, { proposedAction: event.target.value as Dark234Action })}>
              <option value="not_scoped">No action scoped</option><option value="css_contrast">Review low-glare CSS / contrast</option>
              <option value="keyboard_focus">Review keyboard or focus recovery</option>
              <option value="responsive_layout">Review responsive card / layout repair</option>
              <option value="defer">No repair proposal — defer</option>
            </select></label>
          <label htmlFor={`windows-234-impact-${row.id}`}>Safety and permissions assessment
            <select id={`windows-234-impact-${row.id}`} value={row.entry.impact}
              onChange={event => update(row.id, { impact: event.target.value as Dark234Impact })}>
              <option value="unreviewed">Not reviewed</option><option value="presentation_only">Owner-reported presentation-only impact</option>
              <option value="requires_security_review">Possible security / privileged impact — no conditional visual approval</option>
            </select></label>
          <label htmlFor={`windows-234-rollback-${row.id}`}>Rollback plan reference (safe code)
            <input id={`windows-234-rollback-${row.id}`} maxLength={80} value={row.entry.rollbackReference}
              placeholder="WIN-234-ROLLBACK" onChange={event => update(row.id,
                { rollbackReference: safeWindowsFieldReference(event.target.value) })} /></label>
          <label htmlFor={`windows-234-independent-${row.id}`}>Outside reviewer evidence reference (not identity authentication)
            <input id={`windows-234-independent-${row.id}`} maxLength={80} value={row.entry.independentReference}
              placeholder="WIN-234-EXTERNAL" onChange={event => update(row.id,
                { independentReference: safeWindowsFieldReference(event.target.value) })} /></label>
          <label htmlFor={`windows-234-owner-ref-${row.id}`}>New owner decision reference (safe code)
            <input id={`windows-234-owner-ref-${row.id}`} maxLength={80} value={row.entry.ownerDecisionReference}
              placeholder="WIN-234-OWNER" onChange={event => update(row.id,
                { ownerDecisionReference: safeWindowsFieldReference(event.target.value) })} /></label>
        </div>
        <div className="windows-dark-234-confirmations">
          <label><input type="checkbox" checked={row.entry.reviewerAttested}
            onChange={event => update(row.id, { reviewerAttested: event.target.checked })} />
            A separate reviewer supplied this reference. The Hub has NOT authenticated their identity or evidence.</label>
          <label><input type="checkbox" checked={row.entry.ownerReviewAttested}
            onChange={event => update(row.id, { ownerReviewAttested: event.target.checked })} />
            We separately authorize recording this follow-up or submitting a conditional *review request* only. We do not authorize any actual repair, backup restore, device action, role change or independent closure.</label>
        </div>
        <button type="button" onClick={() => recordDecision(row.id)}
          disabled={!["fresh_owner_record_missing", "conditional_review_ready", "retest_requested", "owner_deferred"].includes(row.gate)}>
          Record fresh owner triage decision</button>
        <p><small>Owner time: {row.entry.recordedAt || "not recorded"} · Gate: {dark234GateLabels[row.gate]} · Actual repairs authorized: 0.</small></p>
      </article>)}
    </div> : <p className="windows-triage-229-empty">No Build 234 repair proposal can start from GitHub GREEN, a theme preference alone, or an untested Windows screen. Record a genuine Build 233 installed-Windows finding first.</p>}
    <button type="button" onClick={() => void copyPacket()}>Copy private Build 234 owner triage and conditional review packet</button>
    {notice ? <p role="status">{notice}</p> : null}
    <p><small>All entries are local to this browser session and not independently authenticated. Six-app DISCONNECTED / HOLD; relay OFF; QL-275 Under Review; vault SECURITY HOLD.</small></p>
  </section>;
}
