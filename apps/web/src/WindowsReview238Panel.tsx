import { useState } from "react";
import { CardHelp, type ShellTheme } from "./CommandShell";
import { safeWindowsFieldReference } from "./windowsFieldAcceptance228";
import type { Appearance236Draft, Appearance236Scope } from "./windowsAppearanceAcceptance236";
import type { Visual237Draft } from "./windowsVisualDisposition237";
import { defaultReview238Entry, formatReview238Packet, review238GateLabels,
  review238SnapshotKey, summarizeReview238, type Review238Draft,
  type Review238Entry, type Review238Outcome } from "./windowsReview238";

/** Manual owner intake only. Does not contact reviewers, the Windows host or any provider. */
export function WindowsReview238Panel({ theme, scope, sourceDraft, visualDraft }: {
  theme: ShellTheme; scope: Appearance236Scope;
  sourceDraft: Appearance236Draft; visualDraft: Visual237Draft;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Review238Draft>({});
  const [notice, setNotice] = useState("");
  const summary = summarizeReview238(theme, scope, sourceDraft, visualDraft, draft);
  const visibleRows = summary.rows.filter(row => row.eligible || !!draft[row.id]?.recordedAt);

  function update(id: string, change: Partial<Review238Entry>) {
    setDraft(current => ({
      ...current, [id]: { ...defaultReview238Entry, ...current[id], ...change,
        recordedAt: "", snapshotKey: "" },
    }));
    setNotice("");
  }

  function record(id: string) {
    const row = summary.rows.find(item => item.id === id);
    if (!row?.eligible || row.entry.outcome === "not_received") return;
    setDraft(current => {
      const entry = { ...defaultReview238Entry, ...current[id] };
      return { ...current, [id]: { ...entry, recordedAt: new Date().toISOString(),
        snapshotKey: review238SnapshotKey(row.visualRow, entry) } };
    });
    setNotice("Owner-entered response recorded in this browser session. No outside identity was authenticated and no repair was approved.");
  }

  async function copyPacket() {
    try {
      await navigator.clipboard.writeText(formatReview238Packet(theme, scope,
        sourceDraft, visualDraft, draft));
      setNotice("Sanitized owner-only reconciliation copied. Nothing was transmitted.");
    } catch {
      setNotice("Clipboard unavailable; session-only entries remain private.");
    }
  }

  return <section className="windows-review-238 panel" aria-labelledby="windows-238-title" id="hub-windows-review-238">
    <header className="hub-search-header"><div>
      <p className="eyebrow">Build 238 · UI review evidence reconciliation</p>
      <h2 id="windows-238-title">Owner-reported reviewer responses &amp; repair decision HOLD</h2>
    </div><CardHelp title="Can a recorded reply approve repairs?">
      No. This worksheet is for recording what we actually received after a valid Build 237 UI review request.
      A typed receipt cannot authenticate an independent reviewer. Future repairs and Windows installation require
      separate evidence, decision and explicit approval.
    </CardHelp></header>
    <p>Track replies to the exact unchanged Build 237 request, identify missing evidence and keep the original
      finding open. No response, acceptance or outside review is invented by the Hub.</p>
    <div className="audit-summary" aria-label="Build 238 UI review response totals">
      <div><span>Current review requests</span><strong>{summary.reviewRequests}</strong></div>
      <div><span>Owner-reported replies</span><strong>{summary.ownerRecordedReplies}</strong></div>
      <div><span>More evidence / declined</span><strong>{summary.evidenceRequests} / {summary.declinedReports}</strong></div>
      <div><span>Authenticated / repairs approved</span><strong>0 / 0</strong></div>
    </div>
    <p role="status">{summary.reviewRequests === 0
      ? "No current Build 237 eligible review request. Await actual installed-Windows findings and separate owner decisions."
      : "Ready for owner-only response intake. Review responses remain unauthenticated and all source findings stay open."}</p>
    <button type="button" aria-expanded={open} aria-controls="windows-238-workbook"
      onClick={() => setOpen(current => !current)}>
      {open ? "Close Build 238 response worksheet" : "Open Build 238 response worksheet"}
    </button>
    {open && <div id="windows-238-workbook" className="windows-review-238-workbook">
      {visibleRows.length === 0 && <p role="status">First record a matching, fresh Build 237 UI-only review request.</p>}
      <div className="windows-appearance-236-grid" aria-label="Build 238 owner review reply cases">
        {visibleRows.map(row => <article key={row.id} className="windows-triage-229-card">
          <div className="windows-triage-229-card-head"><div>
            <h3>{row.title}</h3>
            <p>Review area: {row.visualRow.entry.repairArea}. Source code: {row.sourceEntry.reference || "missing"}.
              Request code: {row.visualRow.entry.decisionReference || "missing"}.</p>
            <p>Request timestamp: {row.visualRow.entry.decisionAt || "missing"}.</p>
          </div><span className="windows-field-228-state">{review238GateLabels[row.gate]}</span></div>
          <div className="windows-triage-229-fields">
            <label htmlFor={"windows-238-outcome-" + row.id}>Actual owner-reported reply
              <select id={"windows-238-outcome-" + row.id} disabled={!row.eligible}
                value={row.entry.outcome}
                onChange={event => update(row.id, { outcome: event.target.value as Review238Outcome })}>
                <option value="not_received">No response received</option>
                <option value="reply_received">A reply was received (NOT verified)</option>
                <option value="more_evidence">More evidence requested</option>
                <option value="declined">Review declined</option>
              </select>
            </label>
            <label htmlFor={"windows-238-ref-" + row.id}>New distinct safe reply receipt code
              <input id={"windows-238-ref-" + row.id} disabled={!row.eligible} maxLength={80}
                placeholder="WIN-238-REPLY" value={row.entry.reference}
                onChange={event => update(row.id, { reference: safeWindowsFieldReference(event.target.value) })} />
            </label>
          </div>
          <label className="windows-appearance-236-check"><input type="checkbox"
            disabled={!row.eligible} checked={row.entry.ownerAcknowledged}
            onChange={event => update(row.id, { ownerAcknowledged: event.target.checked })} />
            We actually received this response or request for more information. This is our own report;
            it does not authenticate the sender or authorize changes.</label>
          <button type="button" disabled={!row.eligible || row.entry.outcome === "not_received"}
            onClick={() => record(row.id)}>Record owner-reported response</button>
          <p><small>Owner record time: {row.entry.recordedAt || "not recorded"}.
            Original finding: OPEN. Outside review: UNVERIFIED. Repairs / installation: NOT AUTHORIZED.</small></p>
        </article>)}
      </div>
      <button type="button" onClick={() => void copyPacket()}>Copy redacted Build 238 reconciliation</button>
      <p><small>Browser-session-only codes. No contact names, URLs, IPs, images, logs or device IDs.
        Six apps DISCONNECTED / HOLD; private relay OFF; QL-275 Under Review; vault SECURITY HOLD.</small></p>
    </div>}
    {notice && <p role="status">{notice}</p>}
  </section>;
}
