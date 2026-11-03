import { useState } from "react";

import { CardHelp } from "./CommandShell";
import "./windowsField228.css";
import {
  formatWindowsFieldHandoff, safeWindowsFieldReference, safeWindowsInstalledVersion,
  summarizeWindowsFieldReview, windowsFieldCases, windowsFieldRoadmap,
  type WindowsFieldBasis, type WindowsFieldCaseId, type WindowsFieldDraft, type WindowsFieldObservation,
  type WindowsFieldOutcome,
} from "./windowsFieldAcceptance228";
import {
  defaultTriageEntry, formatWindowsFindingPlan229, parseWindowsFieldHandoff228,
  summarizeWindowsTriage, windowsFindingSourceKey, windowsTriageGateLabels,
  type WindowsTriageDecision, type WindowsTriageDraft, type WindowsTriageEntry,
  type WindowsTriagePriority, type WindowsTriageReproduction,
} from "./windowsFindingTriage229";
import {
  defaultWindowsRetest, formatWindowsRecoveryPacket230, parseWindowsTriageHandoff229,
  summarizeWindowsRecoveryRetests, windows230ChangeKey, windows230SourceKey, windowsRetestGateLabels,
  type WindowsRetestCaseId, type WindowsRetestDraft, type WindowsRetestOutcome, type WindowsRetestRecord,
} from "./windowsRecoveryRetest230";
import {
  defaultClosure231Entry, formatWindowsClosure231Packet, summarizeWindowsClosure231,
  windows231EvidenceKey, windows231SourceKey, windowsClosure231Labels,
  type WindowsClosure231Draft, type WindowsClosure231Entry, type WindowsClosure231Id,
  type WindowsClosure231Outcome,
} from "./windowsOwnerClosure231";

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
  const [triage, setTriage] = useState<WindowsTriageDraft>({});
  const [retests, setRetests] = useState<WindowsRetestDraft>({});
  const [closure231, setClosure231] = useState<WindowsClosure231Draft>({});
  const [handoffInput, setHandoffInput] = useState("");
  const [triageInput, setTriageInput] = useState("");
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [notice, setNotice] = useState("");
  const [triageNotice, setTriageNotice] = useState("");
  const [retestNotice, setRetestNotice] = useState("");
  const [closureNotice, setClosureNotice] = useState("");
  const scope = { installedVersion, physicallyWitnessed };
  const summary = summarizeWindowsFieldReview(draft, scope);
  const followups = windowsFieldRoadmap(draft, scope);
  const triageSummary = summarizeWindowsTriage(draft, scope, triage);
  const retestSummary = summarizeWindowsRecoveryRetests(draft, scope, triage, retests);
  const closureSummary = summarizeWindowsClosure231(draft, scope, triage, retests, closure231);
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

  function updateTriage(id: WindowsFieldCaseId, change: Partial<WindowsTriageEntry>) {
    const row = summary.rows.find(item => item.id === id);
    if (!row) return;
    setTriage(current => ({ ...current, [id]: {
      ...defaultTriageEntry, ...current[id], ...change,
      // Updating a plan is the owner's explicit re-review of this exact source revision.
      sourceKey: row.evidenceReady ? windowsFindingSourceKey(row, scope) : "",
    } }));
    setTriageNotice("");
  }

  function updateRetest(id: WindowsRetestCaseId, change: Partial<WindowsRetestRecord>) {
    const row = retestSummary.rows.find(item => item.id === id);
    if (!row) return;
    setRetests(current => {
      const previous = current[id] ?? defaultWindowsRetest;
      const next: WindowsRetestRecord = { ...previous, ...change,
        sourceKey: row.gate === "awaiting_229_scope" ? "" : windows230SourceKey(row, scope),
      };
      if (change.ownerChangeAttested !== undefined && change.ownerChangeAttested !== previous.ownerChangeAttested) {
        next.changeRecordedAt = change.ownerChangeAttested ? new Date().toISOString() : "";
        next.retestRecordedAt = "";
        next.testedChangeKey = "";
      }
      if (change.outcome !== undefined || change.basis !== undefined || change.reference !== undefined ||
          change.installedVersion !== undefined || change.retestWitnessed === false) {
        next.retestRecordedAt = "";
        next.testedChangeKey = "";
      }
      return { ...current, [id]: next };
    });
    setRetestNotice("");
  }

  function recordFreshRetest(id: WindowsRetestCaseId) {
    const row = retestSummary.rows.find(item => item.id === id);
    if (!row || row.gate === "awaiting_229_scope") return;
    setRetests(current => {
      const previous = current[id] ?? defaultWindowsRetest;
      const next = { ...previous, sourceKey: windows230SourceKey(row, scope),
        retestRecordedAt: new Date().toISOString() };
      return { ...current, [id]: { ...next, testedChangeKey: windows230ChangeKey(next) } };
    });
    setRetestNotice("A fresh owner-reported retest time was recorded locally. No equipment or service was operated by this screen.");
  }

  function updateClosure231(id: WindowsClosure231Id, change: Partial<WindowsClosure231Entry>) {
    const row = closureSummary.rows.find(item => item.id === id);
    if (!row) return;
    setClosure231(current => {
      const previous = current[id] ?? defaultClosure231Entry;
      const sourceKey = row.gate === "awaiting_229_scope" || row.gate === "awaiting_230_retest"
        ? "" : windows231SourceKey(row.original, scope, row.prior);
      const next: WindowsClosure231Entry = { ...previous, ...change, sourceKey };
      // Every altered outcome or proof must receive an explicit fresh field timestamp.
      if (previous.sourceKey !== sourceKey || ["installedVersion", "outcome", "basis", "firstReference", "secondReference",
        "ownerWitnessed", "safetyReviewed"].some(key => key in change)) {
        next.recordedAt = "";
        next.reviewedEvidenceKey = "";
      }
      return { ...current, [id]: next };
    });
    setClosureNotice("");
  }

  function recordClosure231(id: WindowsClosure231Id) {
    const row = closureSummary.rows.find(item => item.id === id);
    if (!row || row.gate === "awaiting_229_scope" || row.gate === "awaiting_230_retest") return;
    setClosure231(current => {
      const previous = current[id] ?? defaultClosure231Entry;
      const next = { ...previous, sourceKey: windows231SourceKey(row.original, scope, row.prior),
        recordedAt: new Date().toISOString() };
      return { ...current, [id]: { ...next, reviewedEvidenceKey: windows231EvidenceKey(next) } };
    });
    setClosureNotice("The Windows observation timestamp was recorded locally. This does not close any issue, change access or authorize a repair.");
  }

  function importHandoff() {
    const result = parseWindowsFieldHandoff228(handoffInput);
    if (!result.ok) { setTriageNotice(result.error); return; }
    setDraft(result.draft);
    setInstalledVersion(result.scope.installedVersion);
    setPhysicallyWitnessed(result.scope.physicallyWitnessed);
    setTriage({});
    setRetests({});
    setClosure231({});
    setHandoffInput("");
    setTriageNotice("Build 228 owner-reported handoff loaded and prior triage reset. Source records remain self-reported and unverified.");
  }

  function importTriagePlan() {
    const result = parseWindowsTriageHandoff229(triageInput, draft, scope);
    if (!result.ok) { setRetestNotice(result.error); return; }
    setTriage(result.plans);
    setRetests({});
    setClosure231({});
    setTriageInput("");
    setRetestNotice("Build 229 owner plan loaded. Prior retests were reset; no repair, on-device acceptance or closure was inferred.");
  }

  async function copyHandoff() {
    try {
      await navigator.clipboard.writeText(formatWindowsFieldHandoff(draft, scope));
      setNotice("Owner-reported handoff copied. Save it in a private local review record; this screen does not upload or retain it after reload.");
    } catch {
      setNotice("Clipboard unavailable. The field review remains only in this open browser session.");
    }
  }

  async function copyTriage() {
    try {
      await navigator.clipboard.writeText(formatWindowsFindingPlan229(draft, scope, triage));
      setTriageNotice("Build 229 proposed repair plan copied locally. No plan was uploaded, authorized or executed.");
    } catch {
      setTriageNotice("Clipboard unavailable. No private plan was uploaded or saved.");
    }
  }

  async function copyRetestPacket() {
    try {
      await navigator.clipboard.writeText(formatWindowsRecoveryPacket230(draft, scope, triage, retests));
      setRetestNotice("Build 230 owner-reported retest packet copied privately. No issue was independently closed or any device controlled.");
    } catch {
      setRetestNotice("Clipboard unavailable; the retest packet stays only in this browser session.");
    }
  }

  async function copyClosure231() {
    try {
      await navigator.clipboard.writeText(formatWindowsClosure231Packet(draft, scope, triage, retests, closure231));
      setClosureNotice("Owner-only Build 231 review packet copied. No independent issue closure, authorization or uploaded evidence is implied.");
    } catch {
      setClosureNotice("Clipboard unavailable. This private review is held only in the current browser session.");
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
    <section className="windows-triage-229" id="hub-system-triage-229" aria-labelledby="windows-triage-229-title">
      <header className="hub-search-header"><div>
        <p className="eyebrow">Build 229 · source-matched owner triage</p>
        <h2 id="windows-triage-229-title">Finding triage &amp; repair planning</h2>
      </div><CardHelp title="Source and authorization boundaries">This queue uses only Build 228 owner-reported findings or blockers, matched to their exact observation reference, time, version and case. No reported Windows findings means no repair candidates. Source records and proposed repairs are never treated as independent proof or owner authorization.</CardHelp></header>
      <p>Prioritize actual observed Windows findings before repairs. The plan is local to this browser session, requires a separate owner scoping decision, and cannot run an update, a device action or a service restart.</p>
      <div className="windows-triage-229-import">
        <label htmlFor="windows-229-import">Load a previously copied Build 228 private handoff (optional)</label>
        <textarea id="windows-229-import" rows={3} maxLength={16000} value={handoffInput}
          placeholder="Paste the complete, redacted Build 228 handoff here; never paste full logs, passwords or private URLs."
          onChange={event => setHandoffInput(event.target.value)} />
        <button type="button" onClick={importHandoff} disabled={!handoffInput.trim()}>Replace current session observations with this handoff</button>
        <small>Only the recognized Build 228 format is accepted. A successful import resets existing repair triage and clears the pasted text. Imported records are owner-reported, not independently verified.</small>
      </div>
      <div className="audit-summary" aria-label="Build 229 source-matched triage totals">
        <div><span>Reported findings / blockers</span><strong>{triageSummary.candidates}</strong></div>
        <div><span>Source-linked plans</span><strong>{triageSummary.sourceLinked}</strong></div>
        <div><span>Source gaps or changes</span><strong>{triageSummary.needsEvidence}</strong></div>
        <div><span>For owner scoping (not approved)</span><strong>{triageSummary.ownerScoping}</strong></div>
      </div>
      <p role="status">{triageSummary.candidates
        ? `${triageSummary.candidates} owner-reported findings or blockers need triage. No repairs are authorized.`
        : "No Build 228 Windows findings have been entered. Real owner field evidence is required before prioritizing repairs."}
        {triageSummary.outstandingPassEvidence ? ` ${triageSummary.outstandingPassEvidence} attempted passes also need evidence.` : ""}</p>
      {triageSummary.rows.length ? <div className="windows-triage-229-list" aria-label="Build 229 source-matched owner repair queue">
        {triageSummary.rows.map(row => <article className="windows-triage-229-card" key={row.id}>
          <div className="windows-triage-229-card-head"><div>
            <h3>{row.title}</h3>
            <p><strong>Build 228:</strong> {row.outcome} · source {row.reference || "MISSING"} · {row.recordedAt || "no observed time"}</p>
            <p><strong>Suggested investigation:</strong> {row.action}</p>
          </div><span className="windows-field-228-state">{windowsTriageGateLabels[row.gate]}</span></div>
          <div className="windows-triage-229-fields">
            <label htmlFor={`windows-229-priority-${row.id}`}>Owner priority
              <select id={`windows-229-priority-${row.id}`} value={row.plan.priority}
                onChange={event => updateTriage(row.id, { priority: event.target.value as WindowsTriagePriority })}>
                <option value="unassigned">Not assigned</option><option value="p0">P0 · Urgent safety/security</option>
                <option value="p1">P1 · High impact</option><option value="p2">P2 · Moderate</option><option value="p3">P3 · Low</option>
              </select>
            </label>
            <label htmlFor={`windows-229-reproduction-${row.id}`}>Reproduction
              <select id={`windows-229-reproduction-${row.id}`} value={row.plan.reproduction}
                onChange={event => updateTriage(row.id, { reproduction: event.target.value as WindowsTriageReproduction })}>
                <option value="not_attempted">Not attempted</option><option value="reproduced">Observed again on Windows</option>
                <option value="intermittent">Intermittent</option><option value="not_reproduced">Not reproduced</option>
              </select>
            </label>
            <label htmlFor={`windows-229-repro-ref-${row.id}`}>Separate reproduction reference (safe code)
              <input id={`windows-229-repro-ref-${row.id}`} value={row.plan.reproductionReference} maxLength={80}
                placeholder="WIN-229-RETEST" onChange={event => updateTriage(row.id, { reproductionReference: safeWindowsFieldReference(event.target.value) })} />
            </label>
            <label htmlFor={`windows-229-decision-${row.id}`}>Proposed disposition
              <select id={`windows-229-decision-${row.id}`} value={row.plan.decision}
                onChange={event => updateTriage(row.id, { decision: event.target.value as WindowsTriageDecision })}>
                <option value="unreviewed">Not reviewed</option><option value="investigate">Investigate source-matched issue</option>
                <option value="repair_proposal">Propose a repair for owner scoping</option>
                <option value="retest_only">Request another Windows retest</option><option value="defer">Defer; keep open</option>
              </select>
            </label>
          </div>
          <p><strong>Gate:</strong> {windowsTriageGateLabels[row.gate]}. {row.gate === "source_changed"
            ? "The Build 228 observation changed after planning. Recheck the source and update the owner triage fields."
            : "No repair, production deployment or installed-device acceptance is approved by this plan."}</p>
          <button type="button" onClick={() => onNavigate(row.section)}>Review {row.section} module</button>
        </article>)}
      </div> : <p className="windows-triage-229-empty">Complete the Build 228 on-device matrix above, or import a private owner handoff from that screen. There is no synthetic repair backlog.</p>}
      <button type="button" onClick={() => void copyTriage()}>Copy private Build 229 proposed repair plan</button>
      {triageNotice ? <p role="status">{triageNotice}</p> : null}
      <p><small>Owner-scoping candidate does not mean an authorized fix, source-independent verification or successful retest. Six-app integration remains DISCONNECTED / HOLD, private relay OFF, QL-275 Under Review and vault SECURITY HOLD.</small></p>
    </section>
    <section className="windows-retest-230" id="hub-system-retest-230" aria-labelledby="windows-retest-230-title">
      <header className="hub-search-header"><div>
        <p className="eyebrow">Build 230 · installed recovery &amp; device/camera retest</p>
        <h2 id="windows-retest-230-title">Retest comparison &amp; owner closure review</h2>
      </div><CardHelp title="What is and is not closed">Only real Build 228 recovery/device/camera findings with a source-matched Build 229 repair proposal can enter this review. Every fresh on-device retest needs a separate change record, new evidence and safety-boundary review. A reported pass is a candidate packet, not independently verified closure. This screen never operates the Windows host or devices.</CardHelp></header>
      <p>Compare an owner-observed Windows retest with the original issue before requesting closure. Startup, release, Home Assistant, cameras, MQTT, backup, rollback and resource cases are in scope; theme, keyboard and role reviews stay open for the proposed Build 231.</p>
      <div className="windows-triage-229-import">
        <label htmlFor="windows-230-import">Load a previously copied Build 229 private repair plan (optional)</label>
        <textarea id="windows-230-import" rows={3} maxLength={24000} value={triageInput}
          onChange={event => setTriageInput(event.target.value)}
          placeholder="First load the matching Build 228 handoff above, then paste its complete redacted Build 229 owner plan." />
        <button type="button" onClick={importTriagePlan} disabled={!triageInput.trim()}>Import matching Build 229 plan and reset retests</button>
        <small>The complete source and computed safety gates must match the active Build 228 observation. Pasted text stays local and is cleared after successful import.</small>
      </div>
      <div className="audit-summary" aria-label="Build 230 Windows retest totals">
        <div><span>Reported recovery/device findings</span><strong>{retestSummary.inScope}</strong></div>
        <div><span>Ready for owner retest planning</span><strong>{retestSummary.scopingReady}</strong></div>
        <div><span>Owner closure candidates (unverified)</span><strong>{retestSummary.ownerClosureCandidates}</strong></div>
        <div><span>Independently closed</span><strong>{retestSummary.issuesClosed}</strong></div>
      </div>
      <p role="status">{retestSummary.inScope
        ? `${retestSummary.inScope} reported Windows recovery or device/camera issues require actual field follow-up. No issue has independent closure.`
        : "No authentic Build 228/229 Windows recovery or device/camera repair scope is available. No retests or closures are claimed."}</p>
      {retestSummary.rows.length ? <div className="windows-triage-229-list" aria-label="Build 230 Windows owner retest cases">
        {retestSummary.rows.map(row => <article className="windows-triage-229-card" key={row.id}>
          <div className="windows-triage-229-card-head"><div>
            <h3>{row.title}</h3>
            <p><strong>Before:</strong> {row.outcome} · Build 228 ref {row.reference || "MISSING"} · Build 229 {row.plan.priority}/{row.plan.decision}</p>
            <p><strong>Follow-up:</strong> {row.action}</p>
          </div><span className="windows-field-228-state">{windowsRetestGateLabels[row.gate]}</span></div>
          <div className="windows-triage-229-fields">
            <label htmlFor={`windows-230-change-${row.id}`}>Owner-authorized change reference (safe code)
              <input id={`windows-230-change-${row.id}`} maxLength={80} value={row.retest.changeReference}
                placeholder="WIN-230-CHANGE" onChange={event => updateRetest(row.id, { changeReference: safeWindowsFieldReference(event.target.value) })} />
            </label>
            <label htmlFor={`windows-230-version-${row.id}`}>Installed version/configuration at retest
              <input id={`windows-230-version-${row.id}`} maxLength={60} value={row.retest.installedVersion}
                placeholder="Observed Windows release" onChange={event => updateRetest(row.id, { installedVersion: safeWindowsInstalledVersion(event.target.value) })} />
            </label>
            <label htmlFor={`windows-230-outcome-${row.id}`}>Fresh on-device outcome
              <select id={`windows-230-outcome-${row.id}`} value={row.retest.outcome}
                onChange={event => updateRetest(row.id, { outcome: event.target.value as WindowsRetestOutcome })}>
                <option value="not_run">Not run</option><option value="pass">Owner-observed pass</option>
                <option value="still_failing">Still failing</option><option value="blocked">Blocked</option>
              </select>
            </label>
            <label htmlFor={`windows-230-basis-${row.id}`}>Fresh retest evidence basis
              <select id={`windows-230-basis-${row.id}`} value={row.retest.basis}
                onChange={event => updateRetest(row.id, { basis: event.target.value as WindowsFieldBasis })}>
                <option value="none">No fresh evidence</option><option value="direct">Direct Windows observation</option>
                <option value="local_log">Redacted local log reference</option><option value="supervised_retest">Supervised retest</option>
              </select>
            </label>
            <label htmlFor={`windows-230-reference-${row.id}`}>Distinct fresh retest reference (safe code)
              <input id={`windows-230-reference-${row.id}`} maxLength={80} value={row.retest.reference}
                placeholder="WIN-230-RETEST" onChange={event => updateRetest(row.id, { reference: safeWindowsFieldReference(event.target.value) })} />
            </label>
          </div>
          <div className="windows-retest-230-confirmations">
            <label><input type="checkbox" checked={row.retest.ownerChangeAttested}
              onChange={event => updateRetest(row.id, { ownerChangeAttested: event.target.checked })} />
              I witnessed the owner-authorized repair/configuration change on the installed Windows Hub. This is not authorization to perform it.</label>
            <label><input type="checkbox" checked={row.retest.safetyReviewed}
              onChange={event => updateRetest(row.id, { safetyReviewed: event.target.checked })} />
              I reviewed safe stop/rollback and the relevant HA, MQTT, camera or private provider boundaries; no unapproved operation was run.</label>
            <label><input type="checkbox" checked={row.retest.retestWitnessed}
              onChange={event => updateRetest(row.id, { retestWitnessed: event.target.checked })} />
              I am observing this fresh retest on the actual installed Windows device, not in CI or a simulator.</label>
          </div>
          <p><small>Owner-reported change time: {row.retest.changeRecordedAt || "not recorded"} · Fresh retest time: {row.retest.retestRecordedAt || "not recorded"}</small></p>
          <button type="button" onClick={() => recordFreshRetest(row.id)} disabled={row.gate === "awaiting_229_scope"}>Record fresh Windows retest observation</button>
          <button type="button" onClick={() => onNavigate(row.section)}>Review {row.section} module</button>
          <p><strong>Gate:</strong> {windowsRetestGateLabels[row.gate]}. Independent acceptance and confirmed issue closure remain outstanding.</p>
        </article>)}
      </div> : <p className="windows-triage-229-empty">There is no evidence-based repair scope. Complete Build 228 field acceptance and Build 229 source-matched triage first; a GREEN GitHub build cannot supply Windows observations.</p>}
      <button type="button" onClick={() => void copyRetestPacket()}>Copy private Build 230 retest comparison packet</button>
      {retestNotice ? <p role="status">{retestNotice}</p> : null}
      <p><small>All recorded outcomes remain owner-reported. Zero issues are independently closed; no device is controlled, no restore or restart is executed, and six-app integration, relay, QL-275 and vault holds remain unchanged.</small></p>
    </section>
    <section className="windows-closure-231" id="hub-system-closure-231" aria-labelledby="windows-closure-231-title">
      <header className="hub-search-header"><div>
        <p className="eyebrow">Build 231 · owner-source closure review</p>
        <h2 id="windows-closure-231-title">Accessibility, roles, backup &amp; resource closure</h2>
      </div><CardHelp title="Separate authorization and proof requirements">Only actual failed/blocked Build 228 observations and a matching Build 229 owner-scoped plan enter this queue. Backup and resources also need a fresh, source-matched Build 230 candidate. Every check requires two distinct Windows evidence references and a fresh owner timestamp. Even a reported pass remains a private owner review packet: independent verification and a separately authorized repair/closure are still required.</CardHelp></header>
      <p>Review Standard theme, keyboard focus, owner/household role isolation, encrypted backups with isolated restore, and measurable CPU/memory/disk/local AI pressure on the installed Windows Hub. This screen is read-and-record only: no account changes, restore, device actions, service restarts or new integrations.</p>
      <div className="audit-summary" aria-label="Build 231 owner closure totals">
        <div><span>Authentic owner-reported findings</span><strong>{closureSummary.scopedFindings}</strong></div>
        <div><span>Prior source/retest gaps</span><strong>{closureSummary.needsEarlierSource}</strong></div>
        <div><span>Owner packets ready (unverified)</span><strong>{closureSummary.ownerPacketsReady}</strong></div>
        <div><span>Independently closed</span><strong>{closureSummary.independentClosures}</strong></div>
      </div>
      <p role="status">{closureSummary.scopedFindings
        ? `${closureSummary.scopedFindings} owner-reported findings have a Build 228 source. Their Build 229/230 gates and fresh Windows evidence must be reviewed before any separate closure request.`
        : "No authentic installed-Windows accessibility, role, backup or resource findings are in scope. No repair, closure or production field acceptance is claimed."}</p>
      {closureSummary.rows.length ? <div className="windows-triage-229-list" aria-label="Build 231 source-linked Windows closure reviews">
        {closureSummary.rows.map(row => <article className="windows-triage-229-card" key={row.id}>
          <div className="windows-triage-229-card-head"><div>
            <h3>{row.label}</h3>
            <p><strong>Original Windows finding:</strong> {row.original.outcome} · Build 228 {row.original.reference || "MISSING"} · Build 229 {row.original.plan.priority}/{row.original.plan.decision}</p>
            {(row.id === "backup" || row.id === "resources") ? <p><strong>Required Build 230 retest:</strong> {row.prior ? windowsRetestGateLabels[row.prior.gate] : "Not recorded"}</p> : null}
            <p>{row.guidance}</p>
          </div><span className="windows-field-228-state">{windowsClosure231Labels[row.gate]}</span></div>
          <div className="windows-triage-229-fields">
            <label htmlFor={`windows-231-version-${row.id}`}>Installed Windows version observed for this check
              <input id={`windows-231-version-${row.id}`} maxLength={60} value={row.entry.installedVersion}
                placeholder="Exact installed release identifier" onChange={event => updateClosure231(row.id, { installedVersion: safeWindowsInstalledVersion(event.target.value) })} />
            </label>
            <label htmlFor={`windows-231-outcome-${row.id}`}>Fresh owner outcome
              <select id={`windows-231-outcome-${row.id}`} value={row.entry.outcome}
                onChange={event => updateClosure231(row.id, { outcome: event.target.value as WindowsClosure231Outcome })}>
                <option value="not_run">Not run</option><option value="pass">Owner-observed pass (not independently closed)</option>
                <option value="still_failing">Still failing</option><option value="blocked">Blocked</option>
              </select>
            </label>
            <label htmlFor={`windows-231-basis-${row.id}`}>Observed evidence basis
              <select id={`windows-231-basis-${row.id}`} value={row.entry.basis}
                onChange={event => updateClosure231(row.id, { basis: event.target.value as WindowsFieldBasis })}>
                <option value="none">Not observed</option><option value="direct">Direct installed-Windows observation</option>
                <option value="local_log">Redacted local log reference</option><option value="supervised_retest">Supervised field retest</option>
              </select>
            </label>
            <label htmlFor={`windows-231-first-${row.id}`}>{row.first} (safe code)
              <input id={`windows-231-first-${row.id}`} maxLength={80} value={row.entry.firstReference}
                placeholder="WIN-231-A" onChange={event => updateClosure231(row.id, { firstReference: safeWindowsFieldReference(event.target.value) })} />
            </label>
            <label htmlFor={`windows-231-second-${row.id}`}>{row.second} (safe code)
              <input id={`windows-231-second-${row.id}`} maxLength={80} value={row.entry.secondReference}
                placeholder="WIN-231-B" onChange={event => updateClosure231(row.id, { secondReference: safeWindowsFieldReference(event.target.value) })} />
            </label>
            <label htmlFor={`windows-231-reviewer-${row.id}`}>Independent reviewer reference (optional; not verified)
              <input id={`windows-231-reviewer-${row.id}`} maxLength={80} value={row.entry.reviewerReference}
                placeholder="Only a safe tracking code" onChange={event => updateClosure231(row.id, { reviewerReference: safeWindowsFieldReference(event.target.value) })} />
            </label>
          </div>
          <div className="windows-closure-231-confirmations">
            <label><input type="checkbox" checked={row.entry.ownerWitnessed}
              onChange={event => updateClosure231(row.id, { ownerWitnessed: event.target.checked })} />
              I observed this exact check on our installed Windows Hub, not in a browser simulator or CI.</label>
            <label><input type="checkbox" checked={row.entry.safetyReviewed}
              onChange={event => updateClosure231(row.id, { safetyReviewed: event.target.checked })} />
              I reviewed the applicable safety, permission, backup isolation and provider boundaries; no unapproved action was run.</label>
          </div>
          <p><small>Build 231 fresh field observation: {row.entry.recordedAt || "not recorded"} · Gate: {windowsClosure231Labels[row.gate]}. Even a ready packet requires independent review and a separate owner closure decision.</small></p>
          <button type="button" disabled={row.gate === "awaiting_229_scope" || row.gate === "awaiting_230_retest"}
            onClick={() => recordClosure231(row.id)}>Record fresh Build 231 Windows check</button>
          <button type="button" onClick={() => onNavigate(row.original.section)}>Review {row.original.section} module</button>
        </article>)}
      </div> : <p className="windows-triage-229-empty">Start with authentic owner observations in Build 228 and source-linked Build 229 triage above. A GitHub GREEN check, missing measurements or prior owner pass cannot create a Build 231 closure.</p>}
      <button type="button" onClick={() => void copyClosure231()}>Copy private Build 231 owner review packet</button>
      {closureNotice ? <p role="status">{closureNotice}</p> : null}
      <p><small>Zero issues independently closed. No automatic remediation, production role change, private restore, vault activation, six-app connection or relay enablement. QL-275 stays Under Review.</small></p>
    </section>
  </section>;
}
