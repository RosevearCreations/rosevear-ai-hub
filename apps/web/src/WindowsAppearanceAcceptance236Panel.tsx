import { useState } from "react";
import { CardHelp, type ShellTheme } from "./CommandShell";
import { safeWindowsFieldReference, safeWindowsInstalledVersion } from "./windowsFieldAcceptance228";
import {
  appearance236Cases, appearance236FollowupKey, appearance236GateLabels,
  appearance236ObservationKey, defaultAppearance236Entry, formatAppearance236Packet,
  summarizeAppearance236, type Appearance236Draft, type Appearance236Entry,
  type Appearance236Followup, type Appearance236Id, type Appearance236Outcome,
  type Appearance236Symptom, type Appearance236Viewport,
} from "./windowsAppearanceAcceptance236";

/** Owner-only at the App boundary. No API, Windows probe, credential storage or repair execution. */
export function WindowsAppearanceAcceptance236Panel({ theme, onNavigate }: {
  theme: ShellTheme; onNavigate: (section: "Home" | "System") => void;
}) {
  const [open, setOpen] = useState(false);
  const [installedVersion, setInstalledVersion] = useState("");
  const [ownerWitnessed, setOwnerWitnessed] = useState(false);
  const [draft, setDraft] = useState<Appearance236Draft>({});
  const [notice, setNotice] = useState("");
  const scope = { installedVersion, ownerWitnessed };
  const summary = summarizeAppearance236(theme, scope, draft);

  function update(id: Appearance236Id, change: Partial<Appearance236Entry>) {
    setDraft(current => ({ ...current, [id]: {
      ...defaultAppearance236Entry, ...current[id], ...change,
      observedAt: "", observedKey: "", followup: "pending", followupReference: "",
      followupAttested: false, followupAt: "", followupKey: "",
    } }));
    setNotice("");
  }

  function updateFollowup(id: Appearance236Id, change: Partial<Appearance236Entry>) {
    setDraft(current => ({ ...current, [id]: {
      ...defaultAppearance236Entry, ...current[id], ...change, followupAt: "", followupKey: "",
    } }));
    setNotice("");
  }

  function recordObservation(id: Appearance236Id) {
    const row = summary.rows.find(item => item.id === id);
    if (!row || !["observation_stale", "owner_pass", "open_finding", "followup_gap",
      "followup_consent_gap", "followup_stale", "retest_requested", "owner_deferred", "review_requested"].includes(row.gate)) return;
    setDraft(current => {
      const entry = { ...defaultAppearance236Entry, ...current[id] };
      const next = { ...entry, observedAt: new Date().toISOString(),
        observedKey: appearance236ObservationKey(id, theme, scope, entry),
        followup: "pending" as const, followupReference: "", followupAttested: false,
        followupAt: "", followupKey: "" };
      return { ...current, [id]: next };
    });
    setNotice("Owner-reported observation recorded locally for the current installed-version and viewport snapshot. No outside verification or device action occurred.");
  }

  function recordFollowup(id: Appearance236Id) {
    const row = summary.rows.find(item => item.id === id);
    if (!row || row.entry.followup === "pending" || !row.entry.followupAttested ||
      row.entry.followupReference.length < 4 ||
      !["followup_stale", "retest_requested", "owner_deferred", "review_requested"].includes(row.gate)) return;
    setDraft(current => {
      const entry = { ...defaultAppearance236Entry, ...current[id] };
      const next = { ...entry, followupAt: new Date().toISOString(),
        followupKey: appearance236FollowupKey(entry) };
      return { ...current, [id]: next };
    });
    setNotice("A separate owner follow-up was recorded. The finding remains open; nothing was repaired, independently accepted or automatically escalated.");
  }

  async function copyPacket() {
    try {
      await navigator.clipboard.writeText(formatAppearance236Packet(theme, scope, draft));
      setNotice("Private redacted owner handoff copied locally. Nothing was uploaded or independently authenticated.");
    } catch { setNotice("Clipboard unavailable. The observations remain in this open browser session only."); }
  }

  return <section id="hub-system-appearance-236" className="windows-appearance-236 panel" aria-labelledby="windows-236-title">
    <header className="hub-search-header"><div>
      <p className="eyebrow">Build 236 · Windows owner field acceptance</p>
      <h2 id="windows-236-title">Dark Mode &amp; responsive navigation acceptance</h2>
    </div><CardHelp title="What does this review verify?">We must personally check the installed Windows Hub and enter safe reference codes before any pass can be owner-reported. This form cannot verify a Windows installation, authenticate an outside reviewer, approve a repair or operate a connected device. All entries are private to this browser session.</CardHelp></header>
    <p>Build 235 passed source tests, but we still need real Windows observations. Check the actual screen and viewport, record what happened, and keep findings open for a separate owner decision. The workflow starts with zero passes.</p>
    <div className="audit-summary" aria-label="Build 236 Windows appearance acceptance totals">
      <div><span>Owner-reported passes</span><strong>{summary.ownerPasses}/{appearance236Cases.length}</strong></div>
      <div><span>Open findings / blocked checks</span><strong>{summary.openFindings}</strong></div>
      <div><span>Separate follow-ups</span><strong>{summary.followupsRecorded}</strong></div>
      <div><span>Verified Windows acceptance / repairs</span><strong>0 / 0</strong></div>
    </div>
    <p role="status">{summary.ownerPasses === 0 && summary.openFindings === 0
      ? "No installed-Windows owner results have been supplied in this session. Source CI is not device acceptance."
      : "These are owner-entered observations only. Independent Windows acceptance and actual repair authorization remain unverified."}</p>
    <button type="button" aria-expanded={open} aria-controls="windows-236-workbook"
      onClick={() => setOpen(value => !value)}>{open ? "Close Build 236 owner worksheet" : "Open Build 236 Windows visual acceptance worksheet"}</button>
    {open && <div id="windows-236-workbook">
      <div className="windows-appearance-236-scope" role="group" aria-label="Installed Windows review context">
        <label htmlFor="windows-236-version">Exact owner-observed installed Windows Hub version (safe text)
          <input id="windows-236-version" maxLength={60} value={installedVersion}
            placeholder="e.g. 236-local-install" onChange={event => { setInstalledVersion(safeWindowsInstalledVersion(event.target.value)); setNotice(""); }} />
        </label>
        <label className="windows-appearance-236-check"><input type="checkbox" checked={ownerWitnessed}
          onChange={event => { setOwnerWitnessed(event.target.checked); setNotice(""); }} />
          We personally observed this installed Windows Hub. This is not independent confirmation.</label>
        <p><strong>Active theme:</strong> {theme === "dark" ? "Dark Mode" : theme === "standard" ? "Standard" : "High contrast"}. {theme !== "dark" ? "Switch back to Dark Mode before recording checks." : "Use the actual installed Windows screen; do not infer an observation from this web preview."}</p>
      </div>
      <div className="windows-appearance-236-grid" aria-label="Build 236 installed Windows visual review cases">
        {summary.rows.map(row => <article className="windows-triage-229-card" key={row.id}>
          <div className="windows-triage-229-card-head"><div><h3>{row.title}</h3><p>{row.check}</p></div>
            <span className="windows-field-228-state">{appearance236GateLabels[row.gate]}</span></div>
          <button type="button" className="windows-appearance-236-link"
            onClick={() => onNavigate(row.section)}>Open {row.section} workspace for manual review</button>
          <div className="windows-triage-229-fields">
            <label htmlFor={`windows-236-outcome-${row.id}`}>Actual observed result
              <select id={`windows-236-outcome-${row.id}`} value={row.entry.outcome}
                onChange={event => update(row.id, { outcome: event.target.value as Appearance236Outcome })}>
                <option value="not_tested">Not tested</option><option value="pass">Pass (owner-reported only)</option>
                <option value="finding">Visual or navigation finding</option><option value="blocked">Unable to complete check</option>
              </select></label>
            <label htmlFor={`windows-236-viewport-${row.id}`}>Actual tested Windows viewport
              <select id={`windows-236-viewport-${row.id}`} value={row.entry.viewport}
                onChange={event => update(row.id, { viewport: event.target.value as Appearance236Viewport })}>
                <option value="unselected">Not selected</option><option value="windows_desktop">Windows desktop</option>
                <option value="windows_tablet">Windows tablet layout</option><option value="narrow_window">Narrow Windows browser window</option>
              </select></label>
            <label htmlFor={`windows-236-ref-${row.id}`}>Unique safe evidence code (no logs, images or secrets)
              <input id={`windows-236-ref-${row.id}`} value={row.entry.reference} maxLength={80}
                placeholder={`WIN-236-${row.id.toUpperCase()}`} onChange={event => update(row.id,
                  { reference: safeWindowsFieldReference(event.target.value) })} /></label>
            {row.entry.outcome === "finding" || row.entry.outcome === "blocked" ?
              <label htmlFor={`windows-236-symptom-${row.id}`}>Observed issue category
                <select id={`windows-236-symptom-${row.id}`} value={row.entry.symptom}
                  onChange={event => update(row.id, { symptom: event.target.value as Appearance236Symptom })}>
                  <option value="none">Not classified</option><option value="glare">Unexpected bright glare</option>
                  <option value="contrast">Text/status contrast</option><option value="clipping">Layout clipping / overflow</option>
                  <option value="keyboard">Keyboard / focus issue</option><option value="persistence">Saved theme / reload issue</option>
                  <option value="other">Other visual blocker (safe code only)</option>
                </select></label> : null}
          </div>
          <button type="button" onClick={() => recordObservation(row.id)}
            disabled={!["observation_stale", "owner_pass", "open_finding", "followup_gap", "followup_consent_gap", "followup_stale", "retest_requested", "owner_deferred", "review_requested"].includes(row.gate)}>
            Record fresh owner observation</button>
          <p><small>Observed: {row.entry.observedAt || "not recorded"}. Gate: {appearance236GateLabels[row.gate]}.</small></p>
          {(row.entry.outcome === "finding" || row.entry.outcome === "blocked") && <div className="windows-appearance-236-followup">
            <h4>Evidence-based follow-up · issue stays open</h4>
            <label htmlFor={`windows-236-decision-${row.id}`}>Owner choice
              <select id={`windows-236-decision-${row.id}`} value={row.entry.followup}
                onChange={event => updateFollowup(row.id, { followup: event.target.value as Appearance236Followup })}>
                <option value="pending">Not decided</option><option value="request_retest">Request new installed-Windows retest</option>
                <option value="defer">Defer and keep open</option><option value="request_review">Request independent review only (no repair grant)</option>
              </select></label>
            <label htmlFor={`windows-236-followup-ref-${row.id}`}>New distinct owner follow-up reference
              <input id={`windows-236-followup-ref-${row.id}`} maxLength={80} value={row.entry.followupReference}
                placeholder="WIN-236-FOLLOWUP" onChange={event => updateFollowup(row.id,
                  { followupReference: safeWindowsFieldReference(event.target.value) })} /></label>
            <label className="windows-appearance-236-check"><input type="checkbox" checked={row.entry.followupAttested}
              onChange={event => updateFollowup(row.id, { followupAttested: event.target.checked })} />
              We authorize recording this follow-up request only, not an actual repair, device action or closure.</label>
            <button type="button" onClick={() => recordFollowup(row.id)}
              disabled={!["followup_stale", "retest_requested", "owner_deferred", "review_requested"].includes(row.gate)}>
              Record separate owner follow-up</button>
            <p><small>Follow-up time: {row.entry.followupAt || "not recorded"}; independent reviewer authenticated: NO.</small></p>
          </div>}
        </article>)}
      </div>
      <button type="button" onClick={() => void copyPacket()}>Copy private Build 236 Windows owner handoff</button>
      <p><small>Sanitized code-only observations stay in this browser session. Six-app DISCONNECTED / HOLD; private relay OFF; QL-275 Under Review; vault SECURITY HOLD; authenticated gateway GETs zero. Do not put private device IDs, addresses, photos, credentials or full logs in references.</small></p>
    </div>}
    {notice && <p role="status">{notice}</p>}
  </section>;
}
