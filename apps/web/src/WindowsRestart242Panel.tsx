import { useState } from "react";
import { CardHelp } from "./CommandShell";
import { safeWindowsFieldReference } from "./windowsFieldAcceptance228";
import { importRestart241Handoff } from "./windowsRestart241";
import {
  decision242Key, emptyRestart242Entry, formatRestart242Packet,
  restart242Labels, retest242Key, summarizeRestart242,
  type Restart242Basis, type Restart242Disposition, type Restart242Entries,
  type Restart242Entry, type Restart242Handoff, type Restart242Status,
} from "./windowsRestart242";
import type { Restart240DependencyId } from "./windowsRestart240";

const safeCode = /^[A-Za-z0-9_-]{4,80}$/;
const passedRetest = ["owner_recovered_unverified", "owner_still_failed",
  "owner_partially_recovered", "not_configured", "owner_retest_recorded"];

/** Owner-only browser worksheet. No Windows service, device or provider action. */
export function WindowsRestart242Panel() {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [source, setSource] = useState<Restart242Handoff | null>(null);
  const [entries, setEntries] = useState<Restart242Entries>({});
  const [notice, setNotice] = useState("");
  const summary = summarizeRestart242(source, entries);

  function import241() {
    try {
      const data = importRestart241Handoff(raw);
      setSource(data);
      setEntries({});
      setNotice("Private Build 241 owner handoff imported; no Windows recovery or independent proof was inferred.");
    } catch {
      setNotice("Import rejected: an authentic-format, code-only Build 241 handoff is required.");
    }
    setRaw("");
  }
  function changeRetest(id: Restart240DependencyId, update: Partial<Restart242Entry>) {
    setEntries(current => ({
      ...current, [id]: { ...emptyRestart242Entry, ...current[id], ...update,
        retestAt: "", retestKey: "", disposition: "pending",
        repairScope: "unselected", rollbackReference: "", ownerDecisionReference: "",
        requestOnlyAcknowledged: false, decisionAt: "", decisionKey: "" },
    }));
    setNotice("");
  }
  function recordRetest(id: Restart240DependencyId) {
    const row = summary.rows.find(x => x.id === id);
    if (!source || !row?.eligible || !row.firstInOrder) {
      setNotice("First-dependency HOLD: inspect earlier unfinished startup checks before this retest.");
      return;
    }
    const value = { ...emptyRestart242Entry, ...entries[id] };
    if (value.status === "not_observed" || value.basis === "none" ||
      !safeCode.test(value.retestReference) || !value.ownerWitnessed) {
      setNotice("Retest HOLD: record only an actual on-device result, source, unique code and owner witness.");
      return;
    }
    setEntries(current => {
      const next = { ...emptyRestart242Entry, ...current[id] };
      return { ...current, [id]: { ...next, retestAt: new Date().toISOString(),
        retestKey: retest242Key(source, row, next),
        disposition: "pending", repairScope: "unselected", rollbackReference: "",
        ownerDecisionReference: "", requestOnlyAcknowledged: false,
        decisionAt: "", decisionKey: "" } };
    });
    setNotice("Owner-observed retest captured locally. Source and freshness gates remain in force.");
  }
  function changeDecision(id: Restart240DependencyId, update: Partial<Restart242Entry>) {
    setEntries(current => ({
      ...current, [id]: { ...emptyRestart242Entry, ...current[id], ...update,
        decisionAt: "", decisionKey: "" },
    }));
    setNotice("");
  }
  function recordDecision(id: Restart240DependencyId) {
    const row = summary.rows.find(x => x.id === id);
    const value = { ...emptyRestart242Entry, ...entries[id] };
    if (!row || !passedRetest.includes(row.retestGate) ||
      value.disposition === "pending" || !safeCode.test(value.ownerDecisionReference) ||
      !value.requestOnlyAcknowledged ||
      (value.disposition === "request_repair_review" && (
        !(value.status === "failed" || value.status === "partial") ||
        value.repairScope !== id || !safeCode.test(value.rollbackReference)))) {
      setNotice("Owner decision HOLD: a current retest and separate safe decision/rollback references are required.");
      return;
    }
    setEntries(current => ({
      ...current, [id]: { ...value, decisionAt: new Date().toISOString(),
        decisionKey: decision242Key(value) },
    }));
    setNotice("Owner request-only decision recorded. Repairs authorized: 0. Actions performed: 0.");
  }
  async function copyPacket() {
    try {
      await navigator.clipboard.writeText(formatRestart242Packet(source, entries));
      setNotice("Redacted owner packet copied. Nothing was uploaded or sent to a device.");
    } catch {
      setNotice("Clipboard is unavailable. Nothing was sent or saved automatically.");
    }
  }
  const available = summary.rows.filter(x => x.eligible);

  return <section id="hub-windows-restart-242" className="windows-restart-242 panel"
    aria-labelledby="hub-restart-242-title">
    <header className="hub-search-header">
      <div><p className="eyebrow">Build 242 · Supervised Windows follow-up</p>
        <h2 id="hub-restart-242-title">First-failure retest &amp; owner repair decision handoff</h2>
      </div>
      <CardHelp title="Does this fix or independently verify the server?">
        No. This worksheet accepts our privately saved Build 241 owner report and records a fresh,
        real-device retest. It cannot restart Windows, query Task Scheduler, launch Home Assistant,
        access cameras, approve repairs or independently authenticate the observations.
      </CardHelp>
    </header>
    <p>Inspect the first unresolved startup dependency before anything downstream.
      We must personally observe the result; a green GitHub release never proves this PC recovered.</p>
    <div className="audit-summary" aria-label="Build 242 supervised restart follow-up">
      <div><span>Eligible owner cases</span><strong>{summary.cases}</strong></div>
      <div><span>First-failure retest ready</span><strong>{summary.readyToRetest}</strong></div>
      <div><span>Owner reports recovered</span><strong>{summary.ownerReportedRecovered}</strong></div>
      <div><span>Independent proof / actual repairs</span><strong>0 / 0</strong></div>
    </div>
    <p role="status">Build 240 restart: {summary.restartGate}.
      Conditional repair REVIEW requests: {summary.repairReviewRequests}.
      Service actions: 0. Windows installed acceptance: NO.</p>
    {summary.firstUnresolved && <p>First unresolved dependency:
      <strong> {summary.firstUnresolved.title}</strong>. {summary.firstUnresolved.next}</p>}
    <button type="button" aria-expanded={open} aria-controls="hub-restart-242-workbook"
      className="hub-action-outline" onClick={() => setOpen(x => !x)}>
      {open ? "Close Build 242 retest worksheet" : "Open Build 242 retest worksheet"}
    </button>
    {open && <div id="hub-restart-242-workbook" className="windows-restart-242-workbook">
      <div className="hub-modern-form-surface">
        <h3>1 · Bring forward the original Build 241 report</h3>
        <p>In Build 241, copy its <strong>code-only handoff</strong> and keep it private.
          Paste that exact handoff below. Import resets the local Build 242 draft.</p>
        <label htmlFor="restart-242-import">Saved Build 241 JSON handoff
          <textarea id="restart-242-import" rows={4} maxLength={40000} value={raw}
            onChange={e => setRaw(e.target.value)}
            placeholder="Code-only Build 241 handoff; never credentials, URLs or raw logs" />
        </label>
        <button type="button" disabled={!raw.trim()} onClick={import241}
          className="hub-action-primary">Validate owner source and reload cases</button>
      </div>
      {source && available.length === 0 && <p role="status">
        No source-linked Build 241 retest or repair-review request is eligible.
        Record a genuine Windows observation and owner request in Build 241 first.
      </p>}
      <div className="windows-appearance-236-grid" aria-label="Build 242 owner first-dependency cases">
        {available.map(row => <article key={row.id} className="windows-triage-229-card">
          <div className="windows-triage-229-card-head">
            <div><h3>{row.title}</h3>
              <p>Original: {row.originalGate}; Build 241: {row.decisionGate}.
                Original receipt: {row.original.reference || "missing"}.</p>
            </div><span className="windows-field-228-state">{restart242Labels[row.gate]}</span>
          </div>
          {!row.firstInOrder && <p role="status">
            Earlier dependency still unresolved. Do not claim recovery or authorize downstream repair.
          </p>}
          <p>Next safe read-only check: {row.next}</p>
          <div className="windows-triage-229-fields">
            <label htmlFor={"restart-242-status-" + row.id}>Fresh result seen on the real Windows PC
              <select id={"restart-242-status-" + row.id} disabled={!row.firstInOrder}
                value={row.retest.status}
                onChange={e => changeRetest(row.id, { status: e.target.value as Restart242Status })}>
                <option value="not_observed">Not observed</option>
                <option value="working">Working on device (owner report only)</option>
                <option value="failed">Still failed / unavailable</option>
                <option value="partial">Partially recovered</option>
                <option value="not_configured">Not configured / cannot verify</option>
              </select>
            </label>
            <label htmlFor={"restart-242-basis-" + row.id}>What did we inspect?
              <select id={"restart-242-basis-" + row.id} disabled={!row.firstInOrder}
                value={row.retest.basis}
                onChange={e => changeRetest(row.id, { basis: e.target.value as Restart242Basis })}>
                <option value="none">Nothing yet</option>
                <option value="direct_screen">Real Windows / app screen</option>
                <option value="task_history">Original Task Scheduler history</option>
                <option value="local_log">Existing sanitized local recovery log</option>
              </select>
            </label>
            <label htmlFor={"restart-242-ref-" + row.id}>New distinct retest evidence code
              <input id={"restart-242-ref-" + row.id} maxLength={80}
                disabled={!row.firstInOrder} placeholder="WIN242-RETEST"
                value={row.retest.retestReference}
                onChange={e => changeRetest(row.id,
                  { retestReference: safeWindowsFieldReference(e.target.value) })} />
            </label>
          </div>
          <label className="windows-appearance-236-check">
            <input type="checkbox" disabled={!row.firstInOrder}
              checked={row.retest.ownerWitnessed}
              onChange={e => changeRetest(row.id, { ownerWitnessed: e.target.checked })} />
            We personally checked this dependency after the original Build 241 decision.
          </label>
          <button type="button" disabled={!row.firstInOrder} onClick={() => recordRetest(row.id)}>
            Record fresh owner retest (no device commands)</button>
          <p><small>Retest owner timestamp: {row.retest.retestAt || "not recorded"}.
            {" "}{restart242Labels[row.retestGate]}</small></p>
          {passedRetest.includes(row.retestGate) && <div className="windows-appearance-236-followup">
            <h4>2 · Separate owner decision — request only</h4>
            <label htmlFor={"restart-242-decision-" + row.id}>Next step after this retest
              <select id={"restart-242-decision-" + row.id} value={row.retest.disposition}
                onChange={e => changeDecision(row.id,
                  { disposition: e.target.value as Restart242Disposition })}>
                <option value="pending">Keep Under Review</option>
                <option value="defer">Defer without closure</option>
                <option value="request_retest">Request another supervised retest</option>
                <option value="request_independent_proof">Request independent witness/verification</option>
                {(row.retest.status === "failed" || row.retest.status === "partial") &&
                  <option value="request_repair_review">Request conditional repair authorization REVIEW only</option>}
              </select>
            </label>
            {row.retest.disposition === "request_repair_review" && <>
              <label htmlFor={"restart-242-scope-" + row.id}>Exactly affected dependency
                <select id={"restart-242-scope-" + row.id} value={row.retest.repairScope}
                  onChange={e => changeDecision(row.id,
                    { repairScope: e.target.value as Restart240DependencyId | "unselected" })}>
                  <option value="unselected">Not selected</option>
                  <option value={row.id}>{row.title} only</option>
                </select>
              </label>
              <label htmlFor={"restart-242-rollback-" + row.id}>Separate rollback plan receipt
                <input id={"restart-242-rollback-" + row.id} maxLength={80}
                  placeholder="WIN242-ROLLBACK" value={row.retest.rollbackReference}
                  onChange={e => changeDecision(row.id,
                    { rollbackReference: safeWindowsFieldReference(e.target.value) })} />
              </label>
            </>}
            <label htmlFor={"restart-242-owner-ref-" + row.id}>New owner decision receipt
              <input id={"restart-242-owner-ref-" + row.id} maxLength={80}
                placeholder="WIN242-OWNER" value={row.retest.ownerDecisionReference}
                onChange={e => changeDecision(row.id,
                  { ownerDecisionReference: safeWindowsFieldReference(e.target.value) })} />
            </label>
            <label className="windows-appearance-236-check">
              <input type="checkbox" checked={row.retest.requestOnlyAcknowledged}
                onChange={e => changeDecision(row.id,
                  { requestOnlyAcknowledged: e.target.checked })} />
              We authorize documenting this request ONLY, not repairing or restarting the host.
            </label>
            <button type="button" disabled={row.retest.disposition === "pending"}
              onClick={() => recordDecision(row.id)}>Record separate owner request</button>
            <p><small>Request status: {restart242Labels[row.gate]}.
              No actual Windows change or independently witnessed recovery is asserted.</small></p>
          </div>}
        </article>)}
      </div>
      <button type="button" onClick={() => void copyPacket()}>Copy redacted Build 242 owner handoff</button>
      <p><small>Leave stale, missing and disputed observations Under Review.
        Never enter IPs, camera IDs, raw logs, private messages or credentials.
        Six-app links DISCONNECTED/HOLD; relay OFF; vault SECURITY HOLD; QL-275 Under Review.</small></p>
    </div>}
    {notice && <p role="status">{notice}</p>}
  </section>;
}
