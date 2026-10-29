import { useEffect, useState } from "react";
import { CardHelp } from "./CommandShell";
import type { TrialEnvironment } from "./ownerFieldTrial";
import type { RecurrenceReceipt } from "./ownerRenewalRecurrence";
import { compareRecurrenceReassessment, recordRecurrenceReassessment,
  REASSESSMENT_ACTIONS, type ReassessmentAction, type ReassessmentNote } from "./ownerRecurrenceReassessment";

export function RecurrenceReassessmentPanel({ prior, notes, environment,
  importedRecurrences, importedReassessments, onNotesChange, active = true }: {
  prior: RecurrenceReceipt; notes: ReassessmentNote[];
  environment: TrialEnvironment; importedRecurrences: number; importedReassessments: number;
  onNotesChange: (notes: ReassessmentNote[]) => void; active?: boolean;
}) {
  const [filter, setFilter] = useState<"all" | "source" | "overdue" | "historical">("all");
  const [chosen, setChosen] = useState<[number, number] | null>(null);
  const [action, setAction] = useState<ReassessmentAction>("CONTINUE_INDEPENDENT_HOLD");
  const [fresh, setFresh] = useState(false);
  const [hold, setHold] = useState(false);
  const [feedback, setFeedback] = useState("");
  useEffect(() => { if (!active) { setFresh(false); setHold(false); } }, [active]);
  const comparisons = prior.recurrence_notes.flatMap((later, index) => {
    if (!index) return [];
    const earlier = prior.recurrence_notes.findIndex((candidate, i) =>
      i < index && candidate.case_id === later.case_id &&
      candidate.reassignment_watch_index === later.reassignment_watch_index &&
      candidate.later_disposition_index < later.later_disposition_index &&
      Date.parse(candidate.recorded_at) < Date.parse(later.recorded_at));
    if (earlier < 0) return [];
    try { return [compareRecurrenceReassessment(prior, earlier, index)]; }
    catch { return []; }
  });
  const visible = comparisons.filter(c => filter === "all" ||
    filter === "source" && c.persistent_original_gap ||
    filter === "overdue" && c.signals.includes("OLDER_RECURRENCE_OVERDUE") ||
    filter === "historical" && c.later_recurrence_index < importedRecurrences);
  const selected = chosen ? comparisons.find(c => c.earlier_recurrence_index === chosen[0] &&
    c.later_recurrence_index === chosen[1]) : null;
  const matchingAction = !!selected && (action !== "REQUEST_NEW_OWNER_SOURCE_ORIGINALS" ||
    selected.persistent_original_gap);
  const canRecord = !!selected && active && matchingAction &&
    selected.later_recurrence_index >= importedRecurrences &&
    environment.installed_windows_witnessed && !!environment.installed_version &&
    environment.access !== "unknown";
  function record() {
    if (!chosen) return;
    try {
      onNotesChange(recordRecurrenceReassessment(prior, notes, environment,
        { recurrences: importedRecurrences, reassessments: importedReassessments },
        { earlier_recurrence_index: chosen[0], later_recurrence_index: chosen[1],
          action, fresh_installed_windows_review: fresh, separate_hold_attestation: hold }));
      setFresh(false); setHold(false);
      setFeedback("Build 182 private reassessment added (NOT SENT); QL-254 registry, owner TEST and private mini-server remain HOLD.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not record private reassessment."); }
  }
  return <section className="owner-handoff-reconciliation" aria-label="Build 182 private recurrence reassessment and QL-254 trusted registry source proof">
    <header className="owner-trial-ledger-heading"><div>
      <h3>Private recurrence reassessment · QL-254 original proof and trusted registry</h3>
      <p>Review later private Build 181 recurrence notes without upgrading unverified source or owner claims.</p>
    </div><strong className="owner-trial-hold">ORIGINAL PROOF: HOLD</strong></header>
    <CardHelp title="Build 182 QL-254 out-of-band trusted registry and reversible mini-server simulation">
      Only a genuinely tested source A plus its matching completed CI and distinct descendant proof B may qualify as public provenance. A genuine private custodian and different witness must independently verify the Ed25519 pin registry outside GitHub; a self-reported receipt is not proof. QL-254 observed six public proof HTTP 404 responses on 28 October 2026. A separate authenticated owner TEST-only decision is NOT GIVEN. The proposed Windows 24/7 mini-server's 30–300 second checks, kill switch and rollback are simulated in memory only; no service, network listener, gateway GET or household device/vault access is installed or authorized.
    </CardHelp>
    <div className="owner-trial-reconcile-stats">
      <span>{comparisons.length} private reassessment pair(s)</span>
      <span>{comparisons.filter(c => c.persistent_original_gap).length} repeat gap(s)</span>
      <span>{notes.length} private HOLD notes · {importedReassessments} imported</span>
      <span>Owner TEST NOT GIVEN · relays OFF</span>
    </div>
    <fieldset className="owner-review-entry"><legend>QL-254 source-only proof/pin registry triage</legend>
      <p>Verified QL-254 Hub `main`: <code>d2cab6dfa98be39c8dd2775a020fe8c644768ceb</code>; immutable QL-246 public proof returned HTTP 404. Check each future commit separately.</p>
      <p>Proof B, authentic negative tests, independent trust registry snapshot, genuine custodian/witness challenge, owner TEST-only decision: NOT AVAILABLE / NOT VERIFIED. No gateway GET. No mini-server service installed or started.</p>
      <p>Offline command: <code>npm run integration:ql254:hub:check</code>. Opt-in public GitHub only: <code>npm run integration:ql254:hub:check -- --public-get --main &lt;immutable-sha&gt;</code>. Synthetic rollback: <code>npm run integration:ql254:hub:test</code>. No network runs from this screen.</p>
    </fieldset>
    <label className="owner-decision-filter">Reassessment filter <select value={filter} onChange={event => setFilter(event.target.value as typeof filter)}>
      <option value="all">All held</option><option value="source">Repeated source gap</option>
      <option value="overdue">Overdue</option><option value="historical">Imported history</option>
    </select></label>
    {!comparisons.length && <p>Two later same-watch Build 181 recurrence notes with increasing disposition references are required.</p>}
    {comparisons.length > 0 && !visible.length && <p>No reassessments match this filter.</p>}
    <div className="owner-decision-cards">{visible.map(c => <article key={c.later_recurrence_index}>
      <strong>{c.case_id} · watch #{c.reassignment_watch_index + 1} · recurrences #{c.earlier_recurrence_index + 1} → #{c.later_recurrence_index + 1}</strong>
      <small>{c.earlier_at} → {c.later_at}</small>
      <p>{c.earlier_age_days} days · {c.signals.join("; ").replaceAll("_", " ")}</p>
      {c.later_recurrence_index < importedRecurrences && <small>Historical private claim only.</small>}
      <button type="button" onClick={() => { setChosen([c.earlier_recurrence_index, c.later_recurrence_index]);
        setAction("CONTINUE_INDEPENDENT_HOLD"); setFresh(false); setHold(false); }}>Review reassessment</button>
    </article>)}</div>
    <fieldset className="owner-review-entry"><legend>Strictly private reassessment · NOT SENT</legend>
      <p>{selected ? `${selected.case_id}: ${selected.signals.join(", ")}` : "Choose a chronological later recurrence first."}</p>
      {!canRecord && selected && <p className="owner-trial-warning">Fresh non-imported later recurrence, installed Windows witness and separate HOLD attestations are required.</p>}
      <label>Fixed HOLD-only action <select value={action} disabled={!selected || !active}
        onChange={event => { setAction(event.target.value as ReassessmentAction); setFresh(false); setHold(false); }}>
        {REASSESSMENT_ACTIONS.map(a => <option key={a} value={a}>{a.replaceAll("_", " ")}</option>)}
      </select></label>
      <label className="owner-trial-check"><input type="checkbox" checked={fresh} disabled={!canRecord}
        onChange={event => { setFresh(event.target.checked); setHold(false); }} /> I freshly rechecked this later private recurrence on installed Windows.</label>
      <label className="owner-trial-check"><input type="checkbox" checked={hold} disabled={!canRecord}
        onChange={event => setHold(event.target.checked)} /> I separately acknowledge QL-254 original proof and out-of-band custody HOLD, no owner TEST, no private mini-server deployment, and field/reviewer/Vault 0/6 SECURITY HOLD.</label>
      <button type="button" disabled={!canRecord || !fresh || !hold} onClick={record}>Append Build 182 private reassessment (HOLD)</button>
    </fieldset>
    {notes.map((note, i) => <p key={i}>Reassessment #{i + 1}: recurrence #{note.earlier_recurrence_index + 1} → #{note.later_recurrence_index + 1} · {note.action.replaceAll("_", " ")} · {i < importedReassessments ? "historical" : "local"} · HOLD.</p>)}
    {feedback && <p role="status">{feedback}</p>}
    <p className="owner-trial-privacy">No real witness, owner approval, new key, authenticated request, private service, gateway, camera, vault, device or network change was made. Source CI GREEN is separate from QL-254 trust and pilot authorization. DISCONNECTED / HOLD.</p>
  </section>;
}
