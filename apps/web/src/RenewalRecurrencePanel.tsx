import { useEffect, useState } from "react";
import { CardHelp } from "./CommandShell";
import type { TrialEnvironment } from "./ownerFieldTrial";
import type { RenewalDispositionReceipt } from "./ownerRenewalDisposition";
import { compareRenewalRecurrence, recordRenewalRecurrence, RECURRENCE_ACTIONS,
  type RecurrenceAction, type RecurrenceNote } from "./ownerRenewalRecurrence";

export function RenewalRecurrencePanel({ prior, notes, environment,
  importedDispositions, importedRecurrences, onNotesChange, active = true }: {
  prior: RenewalDispositionReceipt;
  notes: RecurrenceNote[];
  environment: TrialEnvironment;
  importedDispositions: number;
  importedRecurrences: number;
  onNotesChange: (notes: RecurrenceNote[]) => void;
  active?: boolean;
}) {
  const [filter, setFilter] = useState<"all" | "overdue" | "source" | "historical">("all");
  const [chosen, setChosen] = useState<[number, number] | null>(null);
  const [action, setAction] = useState<RecurrenceAction>("CONTINUE_REVIEW_HOLD");
  const [fresh, setFresh] = useState(false);
  const [hold, setHold] = useState(false);
  const [feedback, setFeedback] = useState("");
  useEffect(() => { if (!active) { setFresh(false); setHold(false); } }, [active]);
  const comparisons = prior.renewal_disposition_notes.flatMap((later, index) => {
    if (!index) return [];
    const earlier = prior.renewal_disposition_notes.findIndex((candidate, i) =>
      i < index && candidate.case_id === later.case_id &&
      candidate.reassignment_watch_index === later.reassignment_watch_index &&
      candidate.later_renewal_index < later.later_renewal_index &&
      Date.parse(candidate.recorded_at) < Date.parse(later.recorded_at));
    if (earlier < 0) return [];
    try { return [compareRenewalRecurrence(prior, earlier, index)]; }
    catch { return []; }
  });
  const visible = comparisons.filter(c => filter === "all" ||
    filter === "overdue" && c.signals.includes("EARLIER_DISPOSITION_OVERDUE") ||
    filter === "source" && c.source_drift_or_gap_persisted ||
    filter === "historical" && c.later_disposition_index < importedDispositions);
  const selected = chosen ? comparisons.find(c => c.earlier_disposition_index === chosen[0] &&
    c.later_disposition_index === chosen[1]) : null;
  const matchingAction = !!selected && (action !== "REQUEST_NEW_ORIGINAL_OWNER_SOURCE_WITNESS" ||
    selected.source_drift_or_gap_persisted);
  const canRecord = !!selected && active && matchingAction &&
    selected.later_disposition_index >= importedDispositions &&
    environment.installed_windows_witnessed && !!environment.installed_version &&
    environment.access !== "unknown";
  function record() {
    if (!chosen) return;
    try {
      onNotesChange(recordRenewalRecurrence(prior, notes, environment,
        { dispositions: importedDispositions, recurrences: importedRecurrences },
        { earlier_disposition_index: chosen[0], later_disposition_index: chosen[1],
          action, fresh_private_recheck: fresh, independent_hold_acknowledged: hold }));
      setFresh(false); setHold(false);
      setFeedback("Build 181 private recurrence appended, NOT SENT. QL-253 provenance, owner TEST and relay remain HOLD.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not record recurrence."); }
  }
  return <section className="owner-handoff-reconciliation" aria-label="Build 181 renewal disposition recurrence and QL-253 trusted registry readiness">
    <header className="owner-trial-ledger-heading"><div>
      <h3>Independent disposition recurrence · QL-253 original proof and private relay</h3>
      <p>Compare chronologically later Build 180 private disposition notes. No connection, unsigned proof, trusted pin or background request is created.</p>
    </div><strong className="owner-trial-hold">QL-253: DISCONNECTED / HOLD</strong></header>
    <CardHelp title="Build 181 source-proof provenance and private Windows relay boundary">
      Source A must match GREEN CI head_sha. Genuine proof B must be a distinct descendant, with exact raw bytes, Ed25519 signature and original seven denial observations independently verified. QL-253 public-only snapshot of Build 180 main had HTTP 404. Independent custodian and separate witness must privately verify a trust registry and nonce challenge. Owner TEST-only authorization is NOT GIVEN. The Windows Hub is only a future candidate outbound/private relay: no daemon, router port forwarding, network exposure, cameras, devices, vault, remote shell or reused master credentials are authorized. Source CI success never clears integration HOLD.
    </CardHelp>
    <div className="owner-trial-reconcile-stats">
      <span>{comparisons.length} later recurrence pair(s)</span>
      <span>{comparisons.filter(c => c.source_drift_or_gap_persisted).length} repeated gap(s)</span>
      <span>{notes.length} private recurrence(s) · {importedRecurrences} imported</span>
      <span>Owner TEST NOT GIVEN · private runner NOT AUTHORIZED</span>
    </div>
    <fieldset className="owner-review-entry"><legend>QL-253 public-only provenance and 24/7 relay readiness (HELD)</legend>
      <p>Last verified Build 180 source main: <code>f81dc739b8af0bcd6c8ffae00aa5ecc9b9dd197d</code>. Its exact QL-246 proof path returned HTTP 404. A later source or proof must be independently checked at its new immutable SHA.</p>
      <p>Proof commit B, exact bytes digest, original signed source proof, out-of-band registry digest, custodian and distinct witness receipts: NOT AVAILABLE. Seven actual denial receipts: NOT VERIFIED. No owner TEST-only decision; gateway GETs NOT RUN; pilot NOT AUTHORIZED.</p>
      <p>Optional CLI only: <code>npm run integration:ql253:hub:check</code> is offline. Add <code>-- --public-get --main &lt;full-main-sha&gt;</code> to opt into allowlisted public GitHub-only checks. No public home gateway and no private trust registry fetch.</p>
    </fieldset>
    <label className="owner-decision-filter">Manual recurrence filter <select value={filter}
      onChange={event => setFilter(event.target.value as typeof filter)}>
      <option value="all">All held</option><option value="source">Repeated source gap</option>
      <option value="overdue">Overdue</option><option value="historical">Imported history</option>
    </select></label>
    {!comparisons.length && <p>Two chronologically later, same-watch Build 180 dispositions with increasing renewal references are required.</p>}
    {comparisons.length > 0 && !visible.length && <p>No recurrence matches this filter.</p>}
    <div className="owner-decision-cards">{visible.map(c => <article key={c.later_disposition_index}>
      <strong>{c.case_id} · watch #{c.reassignment_watch_index + 1} · dispositions #{c.earlier_disposition_index + 1} → #{c.later_disposition_index + 1}</strong>
      <small>{c.earlier_at} → {c.later_at}</small>
      <p>Renewals #{c.earlier_renewal_index + 1} → #{c.later_renewal_index + 1}; original source/owner still UNVERIFIED.</p>
      <p>{c.signals.join("; ").replaceAll("_", " ")}</p>
      {c.later_disposition_index < importedDispositions && <small>Historical only.</small>}
      <button type="button" onClick={() => { setChosen([c.earlier_disposition_index, c.later_disposition_index]);
        setAction("CONTINUE_REVIEW_HOLD"); setFresh(false); setHold(false); }}>Review recurrence</button>
    </article>)}</div>
    <fieldset className="owner-review-entry"><legend>Private independent recurrence disposition · NOT SENT</legend>
      <p>{selected ? `${selected.case_id}: ${selected.signals.join(", ")}` : "Choose a recurrence pair first."}</p>
      {!canRecord && selected && <p className="owner-trial-warning">Fresh non-imported later disposition, installed Windows witness and two HOLD attestations required.</p>}
      <label>HOLD-only action <select value={action} disabled={!selected || !active}
        onChange={event => { setAction(event.target.value as RecurrenceAction); setFresh(false); setHold(false); }}>
        {RECURRENCE_ACTIONS.map(x => <option key={x} value={x}>{x.replaceAll("_", " ")}</option>)}
      </select></label>
      <label className="owner-trial-check"><input type="checkbox" checked={fresh} disabled={!canRecord}
        onChange={event => { setFresh(event.target.checked); setHold(false); }} /> I privately rechecked this exact later Windows disposition.</label>
      <label className="owner-trial-check"><input type="checkbox" checked={hold} disabled={!canRecord}
        onChange={event => setHold(event.target.checked)} /> I separately acknowledge QL-253 source proof, registry and owner TEST HOLD, private relay disabled, independent field review and Vault 0/6 SECURITY HOLD.</label>
      <button type="button" disabled={!canRecord || !fresh || !hold} onClick={record}>Append private Build 181 recurrence (HOLD)</button>
    </fieldset>
    {notes.map((note, index) => <p key={index}>Recurrence #{index + 1}: dispositions #{note.earlier_disposition_index + 1} → #{note.later_disposition_index + 1} · {note.action.replaceAll("_", " ")} · {index < importedRecurrences ? "historical" : "local"} · HOLD.</p>)}
    {feedback && <p role="status">{feedback}</p>}
    <p className="owner-trial-privacy">No secrets, private challenge, real denial receipt, owner approval, outbound relay, installed service, gateway request or device/vault data was created. Build 181 is source-only. DISCONNECTED / HOLD.</p>
  </section>;
}
