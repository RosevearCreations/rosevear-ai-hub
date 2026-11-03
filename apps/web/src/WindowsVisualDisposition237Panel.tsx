import { useState } from "react";
import { CardHelp, type ShellTheme } from "./CommandShell";
import { safeWindowsFieldReference } from "./windowsFieldAcceptance228";
import type { Appearance236Draft, Appearance236Scope, Appearance236Symptom,
  Appearance236Viewport } from "./windowsAppearanceAcceptance236";
import { defaultVisual237Entry, formatVisual237Packet, summarizeVisual237,
  visual237DecisionKey, visual237GateLabels, visual237RetestKey,
  type Visual237Disposition, type Visual237Draft, type Visual237Entry,
  type Visual237Outcome, type Visual237RepairArea } from "./windowsVisualDisposition237";

const canRecordRetest = new Set(["retest_stale", "owner_retest_pass", "retest_blocked",
  "different_symptom", "open_finding", "repair_scope_gap", "decision_evidence_gap",
  "decision_witness_gap", "decision_stale", "retest_requested", "owner_deferred", "review_ready"]);
const canRecordDecision = new Set(["decision_stale", "retest_requested", "owner_deferred", "review_ready"]);

/** Embedded in the owner-only Build 236 panel. Never communicates with Windows or any provider. */
export function WindowsVisualDisposition237Panel({ theme, scope, sourceDraft }: {
  theme: ShellTheme; scope: Appearance236Scope; sourceDraft: Appearance236Draft;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Visual237Draft>({});
  const [notice, setNotice] = useState("");
  const summary = summarizeVisual237(theme, scope, sourceDraft, draft);

  function updateRetest(id: string, change: Partial<Visual237Entry>) {
    setDraft(current => ({ ...current, [id]: { ...defaultVisual237Entry, ...current[id], ...change,
      retestAt: "", retestKey: "", disposition: "pending", repairArea: "unselected",
      decisionReference: "", decisionAttested: false, decisionAt: "", decisionKey: "",
    } }));
    setNotice("");
  }

  function updateDecision(id: string, change: Partial<Visual237Entry>) {
    setDraft(current => ({ ...current, [id]: { ...defaultVisual237Entry, ...current[id], ...change,
      decisionAt: "", decisionKey: "",
    } }));
    setNotice("");
  }

  function recordRetest(id: string) {
    const row = summary.rows.find(item => item.id === id);
    if (!row || !canRecordRetest.has(row.gate)) return;
    setDraft(current => {
      const entry = { ...defaultVisual237Entry, ...current[id] };
      return { ...current, [id]: { ...entry, retestAt: new Date().toISOString(),
        retestKey: visual237RetestKey(theme, scope, row.sourceRow, entry),
        disposition: "pending", repairArea: "unselected", decisionReference: "",
        decisionAttested: false, decisionAt: "", decisionKey: "",
      } };
    });
    setNotice("Owner-reported retest stored in this browser session. The original finding stays open; no independent verification occurred.");
  }

  function recordDecision(id: string) {
    const row = summary.rows.find(item => item.id === id);
    if (!row || !canRecordDecision.has(row.gate)) return;
    setDraft(current => {
      const entry = { ...defaultVisual237Entry, ...current[id] };
      return { ...current, [id]: { ...entry, decisionAt: new Date().toISOString(),
        decisionKey: visual237DecisionKey(entry) } };
    });
    setNotice("A separate owner disposition request was recorded. A UI review request is not authorization to change or repair anything.");
  }

  async function copyPacket() {
    try {
      await navigator.clipboard.writeText(formatVisual237Packet(theme, scope, sourceDraft, draft));
      setNotice("Code-only private owner packet copied. Nothing was sent to a provider or external reviewer.");
    } catch { setNotice("Clipboard unavailable; owner observations remain in the current browser session."); }
  }

  return <section className="windows-visual-237 panel" aria-labelledby="windows-237-title" id="hub-windows-visual-237">
    <header className="hub-search-header"><div>
      <p className="eyebrow">Build 237 · Owner visual finding disposition</p>
      <h2 id="windows-237-title">Windows retest evidence &amp; conditional UI review</h2>
    </div><CardHelp title="Does a ready finding approve a repair?">No. Only owner-reported, unchanged Build 236 findings can enter this worksheet. An eligible, scoped request is ready for separate outside review and explicit future repair approval; the application cannot authenticate a reviewer, accept Windows installation, edit UI code, install changes or operate devices.</CardHelp></header>
    <p>Follow up only on what we actually observed on the installed Windows Hub. Build 236 evidence feeds this queue directly. Changed or unverified evidence is never counted as repair readiness.</p>
    <div className="audit-summary" aria-label="Build 237 Windows retest and disposition totals">
      <div><span>Build 236 findings</span><strong>{summary.sourceFindings}</strong></div>
      <div><span>Owner-reported retest passes</span><strong>{summary.ownerRetestPasses}</strong></div>
      <div><span>UI review requests ready</span><strong>{summary.reviewReady}</strong></div>
      <div><span>Independent acceptance / repairs authorized</span><strong>0 / 0</strong></div>
    </div>
    <p role="status">{summary.sourceFindings === 0
      ? "No Build 236 owner-reported finding or blocker exists in this session. No repair scope can be proposed."
      : "All source findings stay open. Retest passes and ready review requests are owner-entered only."}</p>
    <button type="button" aria-expanded={open} aria-controls="windows-237-workbook"
      onClick={() => setOpen(current => !current)}>
      {open ? "Close Build 237 owner retest worksheet" : "Open Build 237 owner retest worksheet"}
    </button>
    {open && <div id="windows-237-workbook" className="windows-visual-237-workbook">
      {summary.rows.length === 0 && <p role="status">First open Build 236 above, record a real installed-Windows finding and its safe evidence code, then return here.</p>}
      <div className="windows-appearance-236-grid" aria-label="Build 237 owner retest finding cases">
        {summary.rows.map(row => <article key={row.id} className="windows-triage-229-card">
          <div className="windows-triage-229-card-head"><div>
            <h3>{row.title}</h3>
            <p>Original owner finding: {row.sourceEntry.symptom}; viewport {row.sourceEntry.viewport}; code {row.sourceEntry.reference}.</p>
            <p>Original observation: {row.sourceEntry.observedAt || "missing"}. Installed version: {scope.installedVersion || "missing"}.</p>
          </div><span className="windows-field-228-state">{visual237GateLabels[row.gate]}</span></div>
          <div className="windows-triage-229-fields">
            <label htmlFor={`windows-237-outcome-${row.id}`}>Actual owner-observed retest outcome
              <select id={`windows-237-outcome-${row.id}`} value={row.entry.retestOutcome}
                onChange={event => updateRetest(row.id, { retestOutcome: event.target.value as Visual237Outcome })}>
                <option value="not_tested">Not retested</option><option value="pass">Owner-reported pass (finding still open)</option>
                <option value="finding">Same visual finding remains</option><option value="blocked">Retest blocked</option>
              </select></label>
            <label htmlFor={`windows-237-viewport-${row.id}`}>Actual Windows retest viewport
              <select id={`windows-237-viewport-${row.id}`} value={row.entry.retestViewport}
                onChange={event => updateRetest(row.id, { retestViewport: event.target.value as Appearance236Viewport })}>
                <option value="unselected">Not selected</option><option value="windows_desktop">Windows desktop</option>
                <option value="windows_tablet">Windows tablet</option><option value="narrow_window">Narrow Windows browser window</option>
              </select></label>
            <label htmlFor={`windows-237-ref-${row.id}`}>Unique new retest evidence code
              <input id={`windows-237-ref-${row.id}`} maxLength={80} value={row.entry.retestReference}
                placeholder={`WIN-237-${row.id.toUpperCase()}`} onChange={event => updateRetest(row.id,
                  { retestReference: safeWindowsFieldReference(event.target.value) })} /></label>
            {row.entry.retestOutcome === "finding" || row.entry.retestOutcome === "blocked" ?
              <label htmlFor={`windows-237-symptom-${row.id}`}>Actual observed retest symptom
                <select id={`windows-237-symptom-${row.id}`} value={row.entry.retestSymptom}
                  onChange={event => updateRetest(row.id, { retestSymptom: event.target.value as Appearance236Symptom })}>
                  <option value="none">Not classified</option><option value="glare">Bright glare</option>
                  <option value="contrast">Contrast</option><option value="clipping">Clipping / navigation</option>
                  <option value="keyboard">Keyboard / focus</option><option value="persistence">Appearance persistence</option>
                  <option value="other">Different / other symptom</option>
                </select></label> : null}
          </div>
          <label className="windows-appearance-236-check"><input type="checkbox" checked={row.entry.retestWitnessed}
            onChange={event => updateRetest(row.id, { retestWitnessed: event.target.checked })} />
            We personally retested the installed Windows Hub at this viewport. This is not independent authentication.</label>
          <button type="button" disabled={!canRecordRetest.has(row.gate)} onClick={() => recordRetest(row.id)}>
            Record fresh Windows owner retest</button>
          <p><small>Retest time: {row.entry.retestAt || "not recorded"}. Evidence gate: {visual237GateLabels[row.gate]}.</small></p>
          {row.entry.retestOutcome === "finding" && row.gate !== "source_stale" && <div className="windows-appearance-236-followup">
            <h4>Owner disposition · no change authorization</h4>
            <label htmlFor={`windows-237-decision-${row.id}`}>Next owner request
              <select id={`windows-237-decision-${row.id}`} value={row.entry.disposition}
                onChange={event => updateDecision(row.id, { disposition: event.target.value as Visual237Disposition })}>
                <option value="pending">Keep open with no decision</option>
                <option value="request_retest">Request another owner retest</option>
                <option value="defer">Defer; remain open</option>
                <option value="request_ui_review">Request separate UI-only repair review (NOT approval)</option>
              </select></label>
            {row.entry.disposition === "request_ui_review" && <label htmlFor={`windows-237-area-${row.id}`}>
              Exact UI-only review area (must match Build 236 symptom)
              <select id={`windows-237-area-${row.id}`} value={row.entry.repairArea}
                onChange={event => updateDecision(row.id, { repairArea: event.target.value as Visual237RepairArea })}>
                <option value="unselected">Not selected</option><option value="theme_tokens">Dark Mode glare / theme tokens</option>
                <option value="navigation_layout">Responsive navigation / clipping</option>
                <option value="color_contrast">Text and status contrast</option>
                <option value="focus_control">Keyboard / focus visibility</option>
                <option value="preference_persistence">Theme persistence</option>
              </select></label>}
            <label htmlFor={`windows-237-decision-ref-${row.id}`}>New, distinct disposition evidence code
              <input id={`windows-237-decision-ref-${row.id}`} value={row.entry.decisionReference} maxLength={80}
                placeholder="WIN-237-DECISION" onChange={event => updateDecision(row.id,
                  { decisionReference: safeWindowsFieldReference(event.target.value) })} /></label>
            <label className="windows-appearance-236-check"><input type="checkbox" checked={row.entry.decisionAttested}
              onChange={event => updateDecision(row.id, { decisionAttested: event.target.checked })} />
              We authorize recording this disposition request only. No repair, installation, external review or device action is authorized.</label>
            <button type="button" disabled={!canRecordDecision.has(row.gate)} onClick={() => recordDecision(row.id)}>
              Record separate owner disposition</button>
            <p><small>Disposition time: {row.entry.decisionAt || "not recorded"}. Independently reviewed: NO. Repair approved: NO.</small></p>
          </div>}
        </article>)}
      </div>
      <button type="button" onClick={() => void copyPacket()}>Copy redacted Build 237 owner handoff</button>
      <p><small>All evidence is code-only and session-private. Six apps DISCONNECTED / HOLD, relay OFF, QL-275 Under Review, vault SECURITY HOLD. Do not enter names, addresses, IPs, private URLs, logs, device IDs or credentials.</small></p>
    </div>}
    {notice && <p role="status">{notice}</p>}
  </section>;
}
