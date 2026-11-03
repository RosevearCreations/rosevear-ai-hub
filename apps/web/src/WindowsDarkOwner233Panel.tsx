import { useState } from "react";
import { CardHelp, type ShellTheme } from "./CommandShell";
import { safeWindowsFieldReference, safeWindowsInstalledVersion,
  type WindowsFieldDraft, type WindowsFieldScope } from "./windowsFieldAcceptance228";
import { type WindowsTriageDraft } from "./windowsFindingTriage229";
import { type WindowsRetestDraft } from "./windowsRecoveryRetest230";
import { type WindowsClosure231Draft, type WindowsClosure231Id } from "./windowsOwnerClosure231";
import { type WindowsIndependent232Draft } from "./windowsIndependentClosure232";
import {
  closure233DecisionKey, closure233GateLabels, dark233GateLabels,
  dark233Snapshot, defaultClosure233Followup, defaultDark233Observation,
  formatDarkOwnerPacket233, summarizeClosureExceptions233, summarizeDarkOwner233,
  type Closure233Disposition, type Closure233Draft, type Closure233Followup,
  type Dark233Basis, type Dark233CheckId, type Dark233Draft, type Dark233Observation, type Dark233Outcome,
} from "./windowsDarkOwner233";

/** Local-only worksheets, not an independent reviewer, installation probe or remote instruction. */
export function WindowsDarkOwner233Panel({ theme, field, scope, plans, retests, closure231, independent232 }: {
  theme: ShellTheme; field: WindowsFieldDraft; scope: WindowsFieldScope; plans: WindowsTriageDraft;
  retests: WindowsRetestDraft; closure231: WindowsClosure231Draft; independent232: WindowsIndependent232Draft;
}) {
  const [visual, setVisual] = useState<Dark233Draft>({});
  const [followups, setFollowups] = useState<Closure233Draft>({});
  const [notice, setNotice] = useState("");
  const appearance = summarizeDarkOwner233(theme, scope, visual);
  const exceptions = summarizeClosureExceptions233(field, scope, plans, retests, closure231, independent232, followups);

  function updateVisual(id: Dark233CheckId, change: Partial<Dark233Observation>) {
    setVisual(current => ({ ...current, [id]: {
      ...defaultDark233Observation, ...current[id], ...change, observedAt: "", checkedSnapshot: "",
    } }));
    setNotice("");
  }

  function recordVisual(id: Dark233CheckId) {
    if (theme !== "dark") { setNotice("Choose Dark Mode before recording an installed Windows appearance observation."); return; }
    const row = appearance.rows.find(item => item.id === id);
    if (!row || !["owner_record_needed", "source_changed", "owner_pass", "open_finding", "open_blocked"].includes(row.gate)) return;
    setVisual(current => {
      const next = { ...defaultDark233Observation, ...current[id], observedAt: new Date().toISOString() };
      return { ...current, [id]: { ...next, checkedSnapshot: dark233Snapshot(id, theme, scope, next) } };
    });
    setNotice("Owner-reported visual observation recorded for this exact Dark Mode and installed-version snapshot. No independent Windows acceptance was performed.");
  }

  function updateFollowup(id: WindowsClosure231Id, change: Partial<Closure233Followup>) {
    const row = exceptions.rows.find(item => item.id === id);
    if (!row) return;
    setFollowups(current => {
      const previous = current[id] ?? defaultClosure233Followup;
      const sourceKey = row.source.gate === "owner_packet_ready" ? row.sourceKey : "";
      const next = { ...previous, ...change, sourceKey, recordedAt: "", reviewedKey: "" };
      if (previous.sourceKey && previous.sourceKey !== sourceKey) {
        next.reference = "";
        next.disposition = "pending";
        next.ownerAuthorizedFollowup = false;
      }
      return { ...current, [id]: next };
    });
    setNotice("");
  }

  function recordFollowup(id: WindowsClosure231Id) {
    const row = exceptions.rows.find(item => item.id === id);
    if (!row || !["observation_stale", "source_proof_requested", "retest_requested", "owner_deferred", "external_validation_requested"].includes(row.gate)) return;
    setFollowups(current => {
      const next = { ...defaultClosure233Followup, ...current[id],
        sourceKey: row.sourceKey, recordedAt: new Date().toISOString() };
      return { ...current, [id]: { ...next, reviewedKey: closure233DecisionKey(next) } };
    });
    setNotice("A separately authorized owner follow-up reference was recorded. This did not authenticate external evidence, authorize a repair or close the exception.");
  }

  async function copyPacket() {
    try {
      await navigator.clipboard.writeText(formatDarkOwnerPacket233(theme, scope, visual,
        field, plans, retests, closure231, independent232, followups));
      setNotice("Private redacted Build 233 owner packet copied. Nothing was uploaded or approved for repair.");
    } catch { setNotice("Clipboard unavailable; the unexported notes remain in this browser session only."); }
  }

  return <section className="windows-dark-233" id="hub-system-dark-233" aria-labelledby="windows-dark-233-title">
    <header className="hub-search-header"><div>
      <p className="eyebrow">Build 233 · installed Windows Dark Mode acceptance</p>
      <h2 id="windows-dark-233-title">Dark Mode owner acceptance &amp; verified-closure exception follow-up</h2>
    </div><CardHelp title="Why do we still need owner evidence?">Dark Mode is implemented in the source, but a passing CI run cannot check our actual Windows monitor, tablet, readability, keyboard focus or saved appearance. This worksheet records owner observations only. It does not independently verify evidence, close source exceptions or authorize live repairs.</CardHelp></header>
    <p>Choose <strong>Dark Mode</strong> in the sidebar, then perform the checks on our installed Windows Hub. Every pass or finding needs the installed version, owner witness and a new safe evidence code. If another theme is active, results are held. The follow-up register below only uses the actual Build 228–232 source chain.</p>
    <div className="audit-summary" aria-label="Build 233 owner Dark Mode acceptance totals">
      <div><span>Active display theme</span><strong>{theme === "dark" ? "Dark Mode" : theme === "standard" ? "Standard" : "High contrast"}</strong></div>
      <div><span>Owner-reported visual passes</span><strong>{appearance.ownerPasses}/{appearance.rows.length}</strong></div>
      <div><span>Open owner visual findings</span><strong>{appearance.openFindings}</strong></div>
      <div><span>Verified Windows acceptance</span><strong>NO</strong></div>
    </div>
    <p role="status">{theme === "dark"
      ? "Dark Mode is active here. These local field observations still require an actual installed-Windows owner check."
      : "The current interface is not in Dark Mode. Select Dark Mode in the sidebar; previously entered results cannot be treated as a current Dark Mode acceptance."}</p>
    <div className="windows-triage-229-list" aria-label="Build 233 installed Windows visual acceptance checks">
      {appearance.rows.map(row => <article className="windows-triage-229-card" key={row.id}>
        <div className="windows-triage-229-card-head"><div><h3>{row.title}</h3><p>{row.instructions}</p></div>
          <span className="windows-field-228-state">{dark233GateLabels[row.gate]}</span></div>
        <div className="windows-triage-229-fields">
          <label htmlFor={`windows-233-visual-outcome-${row.id}`}>Actual owner-observed outcome
            <select id={`windows-233-visual-outcome-${row.id}`} value={row.entry.outcome}
              onChange={event => updateVisual(row.id, { outcome: event.target.value as Dark233Outcome })}>
              <option value="not_tested">Not tested</option><option value="pass">Pass (owner-reported)</option>
              <option value="finding">Dark Mode visual finding</option><option value="blocked">Blocked test</option>
            </select></label>
          <label htmlFor={`windows-233-visual-basis-${row.id}`}>On-device observation source
            <select id={`windows-233-visual-basis-${row.id}`} value={row.entry.basis}
              onChange={event => updateVisual(row.id, { basis: event.target.value as Dark233Basis })}>
              <option value="none">No source</option><option value="direct_windows">Direct installed Windows observation</option>
              <option value="supervised_windows">Owner-supervised Windows retest</option>
            </select></label>
          <label htmlFor={`windows-233-visual-version-${row.id}`}>Observed installed version (match Build 228)
            <input id={`windows-233-visual-version-${row.id}`} maxLength={60} value={row.entry.installedVersion}
              placeholder="Exact installed version above" onChange={event => updateVisual(row.id,
                { installedVersion: safeWindowsInstalledVersion(event.target.value) })} /></label>
          <label htmlFor={`windows-233-visual-ref-${row.id}`}>Safe local evidence reference (no images or secrets)
            <input id={`windows-233-visual-ref-${row.id}`} maxLength={80} value={row.entry.reference}
              placeholder={`WIN-233-${row.id.toUpperCase()}`} onChange={event => updateVisual(row.id,
                { reference: safeWindowsFieldReference(event.target.value) })} /></label>
        </div>
        <label className="windows-dark-233-confirmation"><input type="checkbox" checked={row.entry.ownerWitnessed}
          onChange={event => updateVisual(row.id, { ownerWitnessed: event.target.checked })} />
          We witnessed this check on the installed Windows Hub, not just the web preview or CI.</label>
        <button type="button" disabled={theme !== "dark" || !["owner_record_needed", "source_changed", "owner_pass", "open_finding", "open_blocked"].includes(row.gate)}
          onClick={() => recordVisual(row.id)}>Record fresh owner Dark Mode observation</button>
        <p><small>Owner timestamp: {row.entry.observedAt || "not recorded"}. Gate: {dark233GateLabels[row.gate]}.</small></p>
      </article>)}
    </div>
    <section className="windows-dark-233-exceptions" aria-labelledby="windows-233-exceptions-title">
      <h3 id="windows-233-exceptions-title">Source-matched closure exception follow-up</h3>
      <p>Only actual Build 228 findings can appear below. Each review follows its Build 229 triage, required Build 230 retest, Build 231 owner check and Build 232 independent-review metadata. A changed source invalidates a previous follow-up. An external validation request is not a verified closure.</p>
      <div className="audit-summary" aria-label="Build 233 closure exception totals">
        <div><span>Source-linked open exceptions</span><strong>{exceptions.openExceptions}</strong></div>
        <div><span>Recorded owner follow-ups</span><strong>{exceptions.recordedFollowups}</strong></div>
        <div><span>Independently verified closures</span><strong>{exceptions.verifiedClosures}</strong></div>
      </div>
      {exceptions.rows.length ? <div className="windows-triage-229-list" aria-label="Build 233 source-matched exception cases">
        {exceptions.rows.map(row => <article className="windows-triage-229-card" key={row.id}>
          <div className="windows-triage-229-card-head"><div><h4>{row.label}</h4>
            <p>Build 228: {row.original.reference || "MISSING"} · Build 232 gate: {row.upstreamGate} · prior owner decision: {row.independent.ownerDecision}</p>
          </div><span className="windows-field-228-state">{closure233GateLabels[row.gate]}</span></div>
          <div className="windows-triage-229-fields">
            <label htmlFor={`windows-233-followup-${row.id}`}>Separate owner disposition
              <select id={`windows-233-followup-${row.id}`} value={row.entry.disposition}
                onChange={event => updateFollowup(row.id, { disposition: event.target.value as Closure233Disposition })}>
                <option value="pending">Not decided</option>
                <option value="request_source_proof">Request authentic source evidence</option>
                <option value="request_retest">Request another installed Windows retest</option>
                <option value="defer">Keep exception open / defer</option>
                <option value="request_external_validation">Request outside closure validation (only if Build 232 requested review)</option>
              </select></label>
            <label htmlFor={`windows-233-followup-ref-${row.id}`}>New owner follow-up reference (safe code)
              <input id={`windows-233-followup-ref-${row.id}`} maxLength={80} value={row.entry.reference}
                placeholder="WIN-233-OWNER-REF" onChange={event => updateFollowup(row.id,
                  { reference: safeWindowsFieldReference(event.target.value) })} /></label>
          </div>
          <label className="windows-dark-233-confirmation"><input type="checkbox" checked={row.entry.ownerAuthorizedFollowup}
            onChange={event => updateFollowup(row.id, { ownerAuthorizedFollowup: event.target.checked })} />
            We separately authorize documenting this follow-up request only, not executing a repair or closing the case.</label>
          <button type="button" disabled={!row.sourceKey || !["observation_stale", "source_proof_requested", "retest_requested", "owner_deferred", "external_validation_requested"].includes(row.gate)}
            onClick={() => recordFollowup(row.id)}>Record source-linked owner follow-up</button>
          <p><small>Recorded: {row.entry.recordedAt || "not recorded"}. Verified closures: 0.</small></p>
        </article>)}
      </div> : <p className="windows-triage-229-empty">No genuine source-matched Windows owner exception is present. No repair, closure or independent reviewer acceptance can be inferred from a GREEN source build.</p>}
    </section>
    <button type="button" onClick={() => void copyPacket()}>Copy private Build 233 acceptance and exception packet</button>
    {notice ? <p role="status">{notice}</p> : null}
    <p><small>Local browser-session metadata only; do not paste credentials, IPs, camera content or full logs. Six-app DISCONNECTED / HOLD, private relay OFF, QL-275 Under Review, vault SECURITY HOLD. No device, backup, role or live repair operation occurs here.</small></p>
  </section>;
}
