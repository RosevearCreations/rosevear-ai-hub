import { useState } from "react";
import { CardHelp } from "./CommandShell";
import { safeWindowsFieldReference } from "./windowsFieldAcceptance228";
import { importRestart240Handoff, summarizeRestart240, type Restart240Draft } from "./windowsRestart240";
import {
  decision241Key, emptyRestart241Entry, formatRestart241Packet,
  restart241GateLabels, source241Key, summarizeRestart241,
  type Restart241Decision, type Restart241Entries, type Restart241Entry,
  type Restart241Source,
} from "./windowsRestart241";
import type { Restart240DependencyId } from "./windowsRestart240";

const readySource = /^[A-Za-z0-9_-]{4,80}$/;

/** Browser-session-only owner intake. Does not inspect, restart or repair the actual Windows PC. */
export function WindowsRestart241Panel() {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [source, setSource] = useState<Restart240Draft | null>(null);
  const [entries, setEntries] = useState<Restart241Entries>({});
  const [notice, setNotice] = useState("");
  const summary = summarizeRestart241(source, entries);
  const cases = summary.rows.filter(row => row.eligible);

  function import240() {
    try {
      const data = importRestart240Handoff(raw);
      if (summarizeRestart240(data).rebootGate !== "reboot_recorded") {
        setNotice("Import HOLD: actual Build 240 witnessed restart/sign-in and five-minute wait are missing.");
        setRaw("");
        return;
      }
      setSource(data);
      setEntries({});
      setNotice("Code-only Build 240 self-report imported. Nothing is independently verified or repaired.");
    } catch {
      setNotice("Import rejected: invalid, oversized or incompatible Build 240 code-only handoff.");
    }
    setRaw("");
  }
  function changeSource(id: Restart240DependencyId, update: Partial<Restart241Entry>) {
    setEntries(current => ({
      ...current, [id]: {
        ...emptyRestart241Entry, ...current[id], ...update,
        sourceAt: "", sourceKey: "", decision: "pending", scope: "unselected",
        rollbackReference: "", decisionReference: "", decisionAcknowledged: false,
        decisionAt: "", decisionKey: "",
      },
    }));
    setNotice("");
  }
  function recordSource(id: Restart240DependencyId) {
    const row = summary.rows.find(r => r.id === id);
    if (!source || !row?.eligible) return;
    const entry = { ...emptyRestart241Entry, ...entries[id] };
    if (entry.source === "none" || !readySource.test(entry.sourceReference) || !entry.acknowledged) {
      setNotice("Source HOLD: personally inspect the original observation and enter a unique, safe receipt code.");
      return;
    }
    const now = new Date().toISOString();
    setEntries(current => ({
      ...current, [id]: {
        ...entry, sourceAt: now,
        sourceKey: source241Key(source, row, entry),
        decision: "pending", scope: "unselected", rollbackReference: "",
        decisionReference: "", decisionAcknowledged: false, decisionAt: "", decisionKey: "",
      },
    }));
    setNotice("Owner source report captured. Duplicate or stale codes remain HOLD; no proof was authenticated.");
  }
  function changeDecision(id: Restart240DependencyId, update: Partial<Restart241Entry>) {
    setEntries(current => ({
      ...current, [id]: { ...emptyRestart241Entry, ...current[id], ...update,
        decisionAt: "", decisionKey: "" },
    }));
    setNotice("");
  }
  function recordDecision(id: Restart240DependencyId) {
    const row = summary.rows.find(r => r.id === id);
    const entry = { ...emptyRestart241Entry, ...entries[id] };
    if (row?.sourceGate !== "source_reviewed" || entry.decision === "pending" ||
      !readySource.test(entry.decisionReference) || !entry.decisionAcknowledged ||
      (entry.decision === "request_repair_review" &&
        (!row.repairCandidate || entry.scope !== id || !readySource.test(entry.rollbackReference)))) {
      setNotice("Decision HOLD: valid source, distinct decision code and exact review-only scope are required.");
      return;
    }
    setEntries(current => ({
      ...current, [id]: { ...entry, decisionAt: new Date().toISOString(),
        decisionKey: decision241Key(entry) },
    }));
    setNotice("Owner decision REQUEST recorded locally. No repair approval or command has occurred.");
  }
  async function copyPacket() {
    try {
      await navigator.clipboard.writeText(formatRestart241Packet(source, entries));
      setNotice("Metadata-only owner packet copied locally. Keep it private; no server upload.");
    } catch {
      setNotice("Clipboard unavailable. No report was sent or saved automatically.");
    }
  }

  return <section className="windows-restart-241 panel" id="hub-windows-restart-241"
    aria-labelledby="windows-241-heading">
    <header className="hub-search-header">
      <div><p className="eyebrow">Build 241 · Windows restart follow-up</p>
        <h2 id="windows-241-heading">Owner evidence reconciliation &amp; repair review HOLD</h2></div>
      <CardHelp title="Does this approve or fix any Windows problem?">
        No. Import only a real Build 240 owner handoff, examine source-linked reports and request
        a safe next step. Source CI is not installed Windows proof. No restart, remote inspection,
        service change, external verification or repair authorization is performed here.
      </CardHelp>
    </header>
    <p>Reconcile actual owner-observed startup results before proposing a change. Missing or
      stale evidence stays Under Review. Do not recreate Home Assistant VMs or launch duplicate services.</p>
    <div className="audit-summary" aria-label="Build 241 field findings">
      <div><span>Owner-reported exception cases</span><strong>{summary.cases}</strong></div>
      <div><span>Owner source reports</span><strong>{summary.sourceReviewed}</strong></div>
      <div><span>Conditional review requests</span><strong>{summary.repairReviewRequests}</strong></div>
      <div><span>Independently verified / repairs</span><strong>0 / 0</strong></div>
    </div>
    <p role="status">Build 240 restart: {summary.restartGate}.
      Original unresolved checks: {summary.unresolved}. Independent acceptance: NO.
      Windows changes performed: 0.</p>
    {summary.firstUnresolved && <p>First unresolved dependency:
      <strong> {summary.firstUnresolved.title}</strong>. {summary.firstUnresolved.next}</p>}
    <button type="button" aria-expanded={open} aria-controls="windows-241-workbook"
      onClick={() => setOpen(v => !v)}>
      {open ? "Close Build 241 recovery worksheet" : "Open Build 241 recovery worksheet"}
    </button>
    {open && <div id="windows-241-workbook" className="windows-restart-241-workbook">
      <div className="windows-appearance-236-followup">
        <h3>1 · Import the real Build 240 after-restart handoff</h3>
        <label htmlFor="restart-241-import">Paste privately saved, code-only Build 240 JSON
          <textarea id="restart-241-import" rows={4} maxLength={15000} value={raw}
            onChange={e => setRaw(e.target.value)}
            placeholder="Build 240 handoff JSON only; no raw logs or credentials" />
        </label>
        <button type="button" disabled={!raw.trim()} onClick={import240}>
          Validate Build 240 owner restart source</button>
        <p><small>Importing erases previous Build 241 review drafts. The information is held
          in this browser session only. It does not authenticate a Windows boot.</small></p>
      </div>
      {source && cases.length === 0 && <p role="status">
        No eligible failed, partial or not-configured observation. A working self-report
        is not an acceptance certificate. Incomplete checks require real Build 240 retest first.
      </p>}
      <div className="windows-appearance-236-grid" aria-label="Build 241 dependency exception review">
        {cases.map(row => <article key={row.id} className="windows-triage-229-card">
          <div className="windows-triage-229-card-head">
            <div><h3>{row.title}</h3>
              <p>Original owner state: {row.originalGate}; original source code:
                {" "}{row.original.reference}. Actual on-device checks are still required.</p>
            </div><span className="windows-field-228-state">
              {restart241GateLabels[row.decisionGate]}</span>
          </div>
          <p>Safe first follow-up: {row.next}</p>
          <div className="windows-triage-229-fields">
            <label htmlFor={"restart-241-source-" + row.id}>Personally examined original source
              <select id={"restart-241-source-" + row.id} value={row.entry.source}
                onChange={e => changeSource(row.id, { source: e.target.value as Restart241Source })}>
                <option value="none">Not examined</option>
                <option value="direct_screen">Actual Windows / app screen</option>
                <option value="task_history">Existing Windows Task Scheduler history</option>
                <option value="local_log">Existing local sanitized log</option>
              </select>
            </label>
            <label htmlFor={"restart-241-source-ref-" + row.id}>New source receipt code
              <input id={"restart-241-source-ref-" + row.id} maxLength={80}
                placeholder="WIN241-SOURCE" value={row.entry.sourceReference}
                onChange={e => changeSource(row.id,
                  { sourceReference: safeWindowsFieldReference(e.target.value) })} />
            </label>
          </div>
          <label className="windows-appearance-236-check">
            <input type="checkbox" checked={row.entry.acknowledged}
              onChange={e => changeSource(row.id, { acknowledged: e.target.checked })} />
            We personally inspected this original result; this is not independent verification.
          </label>
          <button type="button" onClick={() => recordSource(row.id)}>Record owner-observed source</button>
          {row.sourceGate === "source_reviewed" && <div className="windows-appearance-236-followup">
            <h4>2 · Separate owner disposition — requests only</h4>
            <label htmlFor={"restart-241-decision-" + row.id}>Requested next action
              <select id={"restart-241-decision-" + row.id} value={row.entry.decision}
                onChange={e => changeDecision(row.id,
                  { decision: e.target.value as Restart241Decision })}>
                <option value="pending">Leave Under Review</option>
                <option value="defer">Defer; retain finding</option>
                <option value="request_retest">Request supervised real-device retest</option>
                <option value="request_independent_proof">Request independent evidence</option>
                {row.repairCandidate && <option value="request_repair_review">
                  Request conditional repair authorization REVIEW only</option>}
              </select>
            </label>
            {row.entry.decision === "request_repair_review" && <>
              <label htmlFor={"restart-241-scope-" + row.id}>Exact component to review
                <select id={"restart-241-scope-" + row.id} value={row.entry.scope}
                  onChange={e => changeDecision(row.id,
                    { scope: e.target.value as Restart240DependencyId | "unselected" })}>
                  <option value="unselected">No scope approved</option>
                  <option value={row.id}>{row.title} only</option>
                </select>
              </label>
              <label htmlFor={"restart-241-rollback-" + row.id}>Distinct rollback plan reference
                <input id={"restart-241-rollback-" + row.id} maxLength={80}
                  value={row.entry.rollbackReference} placeholder="WIN241-ROLLBACK"
                  onChange={e => changeDecision(row.id,
                    { rollbackReference: safeWindowsFieldReference(e.target.value) })} />
              </label>
            </>}
            <label htmlFor={"restart-241-decision-ref-" + row.id}>New decision receipt code
              <input id={"restart-241-decision-ref-" + row.id} maxLength={80}
                value={row.entry.decisionReference} placeholder="WIN241-DECISION"
                onChange={e => changeDecision(row.id,
                  { decisionReference: safeWindowsFieldReference(e.target.value) })} />
            </label>
            <label className="windows-appearance-236-check">
              <input type="checkbox" checked={row.entry.decisionAcknowledged}
                onChange={e => changeDecision(row.id,
                  { decisionAcknowledged: e.target.checked })} />
              We are requesting review only, not authorizing a repair or restart.
            </label>
            <button type="button" disabled={row.entry.decision === "pending"}
              onClick={() => recordDecision(row.id)}>Record separate owner decision request</button>
          </div>}
        </article>)}
      </div>
      <button type="button" onClick={() => void copyPacket()}>
        Copy redacted Build 241 review and first-failure packet</button>
      <p><small>Do not paste usernames, addresses, URLs, IPs, camera identifiers, raw logs,
        credentials or outside messages. Six-app connections DISCONNECTED/HOLD,
        private relay OFF, QL-275 Under Review, vault SECURITY HOLD.</small></p>
    </div>}
    {notice && <p role="status">{notice}</p>}
  </section>;
}
