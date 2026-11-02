import { useState } from "react";

import { CardHelp } from "./CommandShell";
import "./windowsField228.css";
import {
  formatWindowsFieldHandoff, safeWindowsFieldReference, safeWindowsInstalledVersion,
  summarizeWindowsFieldReview, windowsFieldCases, windowsFieldRoadmap,
  type WindowsFieldBasis, type WindowsFieldCaseId, type WindowsFieldDraft, type WindowsFieldObservation,
  type WindowsFieldOutcome,
} from "./windowsFieldAcceptance228";

type ReviewFilter = "all" | "attention" | "passed";
const outcomeLabels: Record<WindowsFieldOutcome | "needs_evidence", string> = {
  not_tested: "Not tested", pass: "Owner-reported pass", finding: "Finding", blocked: "Blocked",
  needs_evidence: "Pass needs on-device evidence",
};

/** Owner-only, locally held field notes. Navigation keeps this mounted; no network calls or device operations. */
export function WindowsFieldAcceptance228Panel({ onNavigate }: { onNavigate: (section: string) => void }) {
  const [installedVersion, setInstalledVersion] = useState("");
  const [physicallyWitnessed, setPhysicallyWitnessed] = useState(false);
  const [draft, setDraft] = useState<WindowsFieldDraft>({});
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [notice, setNotice] = useState("");
  const scope = { installedVersion, physicallyWitnessed };
  const summary = summarizeWindowsFieldReview(draft, scope);
  const followups = windowsFieldRoadmap(draft, scope);
  const visible = summary.rows.filter(row => filter === "all" ||
    (filter === "passed" ? row.state === "pass" : row.state !== "pass"));

  function updateCase(id: WindowsFieldCaseId, change: Partial<WindowsFieldObservation>) {
    setDraft(current => ({ ...current, [id]: {
      outcome: current[id]?.outcome ?? "not_tested", basis: current[id]?.basis ?? "none",
      reference: current[id]?.reference ?? "",
      ...change, recordedAt: new Date().toISOString(),
    } }));
    setNotice("");
  }

  async function copyHandoff() {
    try {
      await navigator.clipboard.writeText(formatWindowsFieldHandoff(draft, scope));
      setNotice("Owner-reported handoff copied. Save it in a private local review record; this screen does not upload or retain it after reload.");
    } catch {
      setNotice("Clipboard unavailable. The field review remains only in this open browser session.");
    }
  }

  return <section className="panel windows-field-228" id="hub-system-field-228" aria-labelledby="windows-field-228-title">
    <header className="hub-search-header"><div>
      <p className="eyebrow">Build 228 · installed Windows owner review</p>
      <h2 id="windows-field-228-title">Windows field acceptance &amp; regression matrix</h2>
    </div><CardHelp title="What these results prove">GitHub source checks, a browser mark and a copied handoff cannot certify the installed Windows PC. Each pass requires an owner-witnessed on-device review, installed version and a local evidence reference. Even then it remains owner-reported, not independently verified.</CardHelp></header>
    <p>Work through the actual Windows Hub with our owner. No tests run automatically; this page never restarts services, controls devices, opens private streams or contacts other apps. Record only safe references, never credentials, IP addresses, private URLs or personal data.</p>
    <div className="windows-field-228-context">
      <label htmlFor="windows-228-version">Installed Windows Hub version (from local screen/log)
        <input id="windows-228-version" maxLength={60} value={installedVersion}
          onChange={event => { setInstalledVersion(safeWindowsInstalledVersion(event.target.value)); setNotice(""); }}
          placeholder="e.g. version or local release identifier" />
      </label>
      <label className="windows-field-228-witness">
        <input type="checkbox" checked={physicallyWitnessed}
          onChange={event => { setPhysicallyWitnessed(event.target.checked); setNotice(""); }} />
        I am observing the installed Windows Hub; these are not CI or simulated results.
      </label>
    </div>
    <div className="audit-summary" aria-label="Windows field acceptance totals">
      <div><span>Owner-reported passes</span><strong>{summary.ownerReportedPasses}/{windowsFieldCases.length}</strong></div>
      <div><span>Findings</span><strong>{summary.findings}</strong></div>
      <div><span>Blocked</span><strong>{summary.blocked}</strong></div>
      <div><span>Unverified or incomplete</span><strong>{summary.notTested + summary.needsEvidence}</strong></div>
    </div>
    <p role="status"><strong>Windows acceptance:</strong> {summary.fullyOwnerReported
      ? "All checks owner-reported; independent installed-device acceptance still not verified."
      : "Not complete — actual Windows evidence and owner sign-off remain outstanding."} Source CI is tracked separately on GitHub, not sampled here.</p>
    <label htmlFor="windows-228-filter">Filter regression matrix</label>
    <select id="windows-228-filter" value={filter} onChange={event => setFilter(event.target.value as ReviewFilter)}>
      <option value="all">All field checks</option><option value="attention">Attention / not tested</option><option value="passed">Owner-reported passes</option>
    </select>
    <div className="windows-field-228-scroll">
      <table aria-label="Build 228 Windows regression matrix">
        <thead><tr><th scope="col">Area &amp; repeatable check</th><th scope="col">Observed outcome</th><th scope="col">Local evidence reference</th><th scope="col">Open</th></tr></thead>
        <tbody>{visible.map(row => <tr key={row.id}>
          <th scope="row"><strong>{row.area}: {row.title}</strong><small>{row.check}</small><span className="windows-field-228-state">{outcomeLabels[row.state]}</span></th>
          <td><label htmlFor={`windows-228-outcome-${row.id}`}>Result for {row.title}</label>
            <select id={`windows-228-outcome-${row.id}`} value={row.outcome} onChange={event => updateCase(row.id, { outcome: event.target.value as WindowsFieldOutcome })}>
              <option value="not_tested">Not tested</option><option value="pass">Pass (observed)</option>
              <option value="finding">Finding</option><option value="blocked">Blocked</option>
            </select></td>
          <td><label htmlFor={`windows-228-basis-${row.id}`}>Evidence source for {row.title}</label>
            <select id={`windows-228-basis-${row.id}`} value={row.basis} onChange={event => updateCase(row.id, { basis: event.target.value as WindowsFieldBasis })}>
              <option value="none">Not recorded</option><option value="direct">Direct Windows observation</option>
              <option value="local_log">Local log reviewed</option><option value="supervised_retest">Supervised retest</option>
            </select>
            <label htmlFor={`windows-228-ref-${row.id}`}>Reference for {row.title} (no secrets)</label>
            <input id={`windows-228-ref-${row.id}`} maxLength={80} value={row.reference}
              placeholder="e.g. WIN-228-01" onChange={event => updateCase(row.id, { reference: safeWindowsFieldReference(event.target.value) })} />
          </td>
          <td><button type="button" onClick={() => onNavigate(row.section)}>Open {row.section}</button></td>
        </tr>)}</tbody>
      </table>
      {visible.length === 0 ? <p>No checks match this filter.</p> : null}
    </div>
    <div className="windows-field-228-roadmap" aria-label="Evidence-based next roadmap">
      <h3>Next roadmap — owner findings first</h3>
      <p>Candidate repairs below come from entered findings and blockers. They are not auto-approved future builds or claims of successful field testing.</p>
      <ol>{followups.map(item => <li key={item.id}><strong>{item.title}</strong> ({outcomeLabels[item.state]}): {item.action}</li>)}</ol>
      <p><strong>Separate safety gates:</strong> six-app integration DISCONNECTED / HOLD; private relay OFF; QL-275 Under Review / Deferred; first-party vault SECURITY HOLD. No owner field mark changes them.</p>
    </div>
    <button type="button" onClick={() => void copyHandoff()}>Copy private owner field handoff</button>
    {notice ? <p role="status">{notice}</p> : null}
    <p><small>Draft results live only in this open browser session. Copy the handoff before closing or reloading. Local source logs, photos, passwords and actual independent reviewer evidence are never uploaded by this panel.</small></p>
  </section>;
}
