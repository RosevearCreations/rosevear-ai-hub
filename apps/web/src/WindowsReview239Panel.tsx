import { useState } from "react";
import { CardHelp, type ShellTheme } from "./CommandShell";
import { safeWindowsFieldReference } from "./windowsFieldAcceptance228";
import type { Appearance236Draft, Appearance236Scope } from "./windowsAppearanceAcceptance236";
import type { Visual237Draft, Visual237RepairArea } from "./windowsVisualDisposition237";
import type { Review238Draft } from "./windowsReview238";
import { defaultReview239Entry, decision239Key, formatReview239Packet,
  provenance239Key, review239GateLabels, summarizeReview239, type Decision239Choice,
  type Provenance239Source, type Review239Draft, type Review239Entry } from "./windowsReview239";

const sourceGates = new Set([
  "response_not_eligible", "source_not_recorded", "source_reference_gap",
  "source_duplicate", "source_witness_gap", "source_stale",
]);

/** Owner-only, browser-session evidence. This component cannot authenticate or execute repairs. */
export function WindowsReview239Panel({ theme, scope, sourceDraft, visualDraft, reviewDraft }: {
  theme: ShellTheme; scope: Appearance236Scope; sourceDraft: Appearance236Draft;
  visualDraft: Visual237Draft; reviewDraft: Review238Draft;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Review239Draft>({});
  const [notice, setNotice] = useState("");
  const summary = summarizeReview239(theme, scope, sourceDraft, visualDraft, reviewDraft, draft);
  const visibleRows = summary.rows.filter(row => row.eligible || !!draft[row.id]?.provenanceAt);

  function updateSource(id: string, change: Partial<Review239Entry>) {
    setDraft(current => ({ ...current, [id]: { ...defaultReview239Entry, ...current[id],
      ...change, provenanceAt: "", provenanceKey: "", decision: "pending",
      repairArea: "unselected", rollbackReference: "", decisionReference: "",
      decisionAcknowledged: false, decisionAt: "", decisionKey: "",
    } }));
    setNotice("");
  }
  function updateDecision(id: string, change: Partial<Review239Entry>) {
    setDraft(current => ({ ...current, [id]: { ...defaultReview239Entry,
      ...current[id], ...change, decisionAt: "", decisionKey: "",
    } }));
    setNotice("");
  }
  function recordSource(id: string) {
    const row = summary.rows.find(item => item.id === id);
    if (!row?.eligible || row.entry.source === "not_recorded") return;
    setDraft(current => {
      const entry = { ...defaultReview239Entry, ...current[id] };
      return { ...current, [id]: { ...entry, provenanceAt: new Date().toISOString(),
        provenanceKey: provenance239Key(row.responseRow, entry),
        decision: "pending", repairArea: "unselected", rollbackReference: "",
        decisionReference: "", decisionAcknowledged: false, decisionAt: "", decisionKey: "",
      } };
    });
    setNotice("Owner-observed source code recorded locally. This does NOT authenticate the sender.");
  }
  function recordDecision(id: string) {
    const row = summary.rows.find(item => item.id === id);
    if (!row?.eligible || sourceGates.has(row.gate) || row.entry.decision === "pending") return;
    setDraft(current => {
      const entry = { ...defaultReview239Entry, ...current[id] };
      return { ...current, [id]: { ...entry, decisionAt: new Date().toISOString(),
        decisionKey: decision239Key(entry) } };
    });
    setNotice("Separate owner decision REQUEST recorded. No approval, source patch or installation occurred.");
  }
  async function copyPacket() {
    try {
      await navigator.clipboard.writeText(formatReview239Packet(
        theme, scope, sourceDraft, visualDraft, reviewDraft, draft));
      setNotice("Redacted private owner packet copied; nothing was transmitted.");
    } catch {
      setNotice("Clipboard unavailable. Session-only entries have not been transmitted.");
    }
  }

  return <section className="windows-review-239 panel" id="hub-windows-review-239"
    aria-labelledby="windows-239-title">
    <header className="hub-search-header"><div>
      <p className="eyebrow">Build 239 · Evidence provenance &amp; owner decision</p>
      <h2 id="windows-239-title">Conditional repair authorization review gate</h2>
    </div><CardHelp title="Is a review-ready request approval to repair?">
      No. Record only the source and response we actually saw. A typed code cannot authenticate
      an outside reviewer. Even a completed conditional review request requires separate
      source verification and explicit future owner authorization before any repair or installation.
    </CardHelp></header>
    <p>Review an unchanged Build 238 reply, then record a separate owner decision with safe,
      distinct references. All original findings remain open.</p>
    <div className="audit-summary" aria-label="Build 239 provenance and owner decisions">
      <div><span>Eligible replies</span><strong>{summary.responseCandidates}</strong></div>
      <div><span>Owner provenance reports</span><strong>{summary.ownerProvenanceRecorded}</strong></div>
      <div><span>Conditional review requests</span><strong>{summary.conditionalReviewRequests}</strong></div>
      <div><span>Authenticated / repairs authorized</span><strong>0 / 0</strong></div>
    </div>
    <p role="status">{summary.responseCandidates === 0
      ? "No eligible current Build 238 reply. Independent verification and repair approval remain unavailable."
      : "Owner-only source and decision intake is available; no external authentication or repair approval."}</p>
    <button type="button" aria-expanded={open} aria-controls="windows-239-workbook"
      onClick={() => setOpen(value => !value)}>
      {open ? "Close Build 239 owner decision worksheet" : "Open Build 239 owner decision worksheet"}
    </button>
    {open && <div className="windows-review-239-workbook" id="windows-239-workbook">
      {visibleRows.length === 0 && <p role="status">Record a genuine Build 238 review reply first.</p>}
      <div className="windows-appearance-236-grid" aria-label="Build 239 source-linked UI decision cases">
        {visibleRows.map(row => <article key={row.id} className="windows-triage-229-card">
          <div className="windows-triage-229-card-head"><div>
            <h3>{row.title}</h3>
            <p>Original code: {row.sourceEntry.reference || "missing"};
              UI area: {row.visualRow.entry.repairArea};
              received reply code: {row.responseRow.entry.reference || "missing"}.</p>
          </div><span className="windows-field-228-state">{review239GateLabels[row.gate]}</span></div>
          <h4>1 · Identify the actual source without including personal details</h4>
          <div className="windows-triage-229-fields">
            <label htmlFor={"windows-239-source-" + row.id}>Owner-observed response source
              <select id={"windows-239-source-" + row.id} disabled={!row.eligible}
                value={row.entry.source}
                onChange={event => updateSource(row.id, { source: event.target.value as Provenance239Source })}>
                <option value="not_recorded">No original source inspected</option>
                <option value="private_correspondence">Private correspondence observed</option>
                <option value="local_review_record">Existing local review record inspected</option>
                <option value="supervised_conversation">Supervised conversation reported</option>
              </select>
            </label>
            <label htmlFor={"windows-239-source-ref-" + row.id}>New distinct source receipt code
              <input id={"windows-239-source-ref-" + row.id} maxLength={80}
                placeholder="WIN-239-SOURCE" disabled={!row.eligible}
                value={row.entry.sourceReference}
                onChange={event => updateSource(row.id,
                  { sourceReference: safeWindowsFieldReference(event.target.value) })} />
            </label>
          </div>
          <label className="windows-appearance-236-check"><input type="checkbox"
            disabled={!row.eligible} checked={row.entry.sourceAcknowledged}
            onChange={event => updateSource(row.id, { sourceAcknowledged: event.target.checked })} />
            We personally examined the source of this report. Its sender has NOT been independently authenticated.</label>
          <button type="button" disabled={!row.eligible || row.entry.source === "not_recorded"}
            onClick={() => recordSource(row.id)}>Record owner-observed source</button>
          <p><small>Owner source timestamp: {row.entry.provenanceAt || "not recorded"}.
            Provenance is self-reported, never external proof.</small></p>
          {!sourceGates.has(row.gate) && <div className="windows-appearance-236-followup">
            <h4>2 · Record a separate owner decision request</h4>
            <label htmlFor={"windows-239-decision-" + row.id}>Next owner decision
              <select id={"windows-239-decision-" + row.id} value={row.entry.decision}
                onChange={event => updateDecision(row.id,
                  { decision: event.target.value as Decision239Choice })}>
                <option value="pending">Leave open without a decision</option>
                <option value="defer">Defer and keep finding open</option>
                <option value="request_retest">Request another owner retest</option>
                <option value="request_independent_proof">Request real independent verification</option>
                <option value="request_repair_authorization_review">Request conditional UI-only repair authorization REVIEW</option>
              </select>
            </label>
            {row.entry.decision === "request_repair_authorization_review" && <>
              <label htmlFor={"windows-239-area-" + row.id}>Exact UI-only scope (must match original)
                <select id={"windows-239-area-" + row.id} value={row.entry.repairArea}
                  onChange={event => updateDecision(row.id,
                    { repairArea: event.target.value as Visual237RepairArea })}>
                  <option value="unselected">Not selected</option>
                  <option value="theme_tokens">Dark Mode / glare</option>
                  <option value="navigation_layout">Responsive navigation / clipping</option>
                  <option value="color_contrast">Contrast</option>
                  <option value="focus_control">Keyboard / focus</option>
                  <option value="preference_persistence">Appearance persistence</option>
                </select>
              </label>
              <label htmlFor={"windows-239-rollback-" + row.id}>Distinct rollback plan reference code
                <input id={"windows-239-rollback-" + row.id} maxLength={80}
                  placeholder="WIN-239-ROLLBACK" value={row.entry.rollbackReference}
                  onChange={event => updateDecision(row.id,
                    { rollbackReference: safeWindowsFieldReference(event.target.value) })} />
              </label>
            </>}
            <label htmlFor={"windows-239-decision-ref-" + row.id}>New separate owner decision code
              <input id={"windows-239-decision-ref-" + row.id} maxLength={80}
                placeholder="WIN-239-DECISION" value={row.entry.decisionReference}
                onChange={event => updateDecision(row.id,
                  { decisionReference: safeWindowsFieldReference(event.target.value) })} />
            </label>
            <label className="windows-appearance-236-check"><input type="checkbox"
              checked={row.entry.decisionAcknowledged}
              onChange={event => updateDecision(row.id,
                { decisionAcknowledged: event.target.checked })} />
              We authorize recording this request ONLY, not an actual UI change, outside approval,
              local Windows installation, restart or device action.</label>
            <button type="button" disabled={row.entry.decision === "pending"}
              onClick={() => recordDecision(row.id)}>Record separate owner decision request</button>
            <p><small>Decision time: {row.entry.decisionAt || "not recorded"}.
              Authenticated outside review: NO. Repairs authorized: NO.</small></p>
          </div>}
        </article>)}
      </div>
      <button type="button" onClick={() => void copyPacket()}>Copy redacted Build 239 owner packet</button>
      <p><small>Only metadata codes. Do not paste private messages, names, IPs, URLs, photos or logs.
        Six apps DISCONNECTED / HOLD; relay OFF; QL-275 Under Review; vault SECURITY HOLD.</small></p>
    </div>}
    {notice && <p role="status">{notice}</p>}
  </section>;
}
