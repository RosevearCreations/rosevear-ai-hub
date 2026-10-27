import { useEffect, useState, type ChangeEvent } from "react";
import { CardHelp } from "./CommandShell";
import type { TrialEnvironment, TrialObservation } from "./ownerFieldTrial";
import type { SourceIdentityCheck } from "./ownerFieldRouting";
import type { OwnerReviewFollowup } from "./ownerReassignmentReviewFollowup";
import type { ReviewRecurrenceNote } from "./ownerReviewRecurrence";
import { compareRecurrenceDispositions, DISPOSITION_CATEGORIES, recordDispositionFollowup,
  type DispositionCategory, type DispositionComparison,
  type DispositionFollowup } from "./ownerRecurrenceDisposition";

type Filter = "all" | "changed" | "source" | "overdue" | "historical";
type ReceiptComparison = { previous_recurrences: number; current_recurrences: number;
  new_recurrences: number; comparison: DispositionComparison | null };

/** Local-only claims; a named owner and an 'independent' disposition are not authenticated here. */
export function RecurrenceDispositionPanel({ recurrences, followups, history, checks,
  notes, environment, importedRecurrences, importedNotes, onNotesChange,
  compareEarlierReceipt, active = true }: {
  recurrences: readonly ReviewRecurrenceNote[];
  followups: readonly OwnerReviewFollowup[];
  history: readonly TrialObservation[];
  checks: readonly SourceIdentityCheck[];
  notes: DispositionFollowup[];
  environment: TrialEnvironment;
  importedRecurrences: number;
  importedNotes: number;
  onNotesChange: (notes: DispositionFollowup[]) => void;
  compareEarlierReceipt: (raw: string) => ReceiptComparison;
  active?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [baseline, setBaseline] = useState(0);
  const [latest, setLatest] = useState(1);
  const [category, setCategory] = useState<DispositionCategory>("CONTINUE_INDEPENDENT_HOLD");
  const [compared, setCompared] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [receiptComparison, setReceiptComparison] = useState<ReceiptComparison | null>(null);
  const [feedback, setFeedback] = useState("");
  useEffect(() => { if (!active) { setCompared(false); setAcknowledged(false); } }, [active]);

  const comparisons: (DispositionComparison & { historical: boolean })[] = [];
  recurrences.forEach((item, index) => {
    const earlier = recurrences.findIndex((previous, prior) => prior < index &&
      previous.reassignment_watch_index === item.reassignment_watch_index &&
      previous.latest_followup_index < item.latest_followup_index &&
      Date.parse(previous.recorded_at) < Date.parse(item.recorded_at));
    if (earlier < 0) return;
    try {
      comparisons.push({ ...compareRecurrenceDispositions(recurrences, followups, history,
        checks, earlier, index), historical: index < importedRecurrences });
    } catch { /* Unsafe or incomplete historical claims are never considered current. */ }
  });
  const visible = comparisons.filter(item => filter === "all" ||
    filter === "changed" && item.signals.some(signal => ["DISPOSITION_CHANGED", "OWNER_OUTCOME_CHANGED",
      "OWNER_CLAIM_CHANGED"].includes(signal)) ||
    filter === "source" && item.signals.some(signal => signal.startsWith("SOURCE_EVIDENCE_")) ||
    filter === "overdue" && item.signals.includes("PRIOR_DISPOSITION_OVERDUE") ||
    filter === "historical" && item.historical);
  let selected: DispositionComparison | null = null;
  try { selected = compareRecurrenceDispositions(recurrences, followups, history, checks,
    baseline, latest); } catch { /* Exact chronological same-watch pair required. */ }
  const matchingCategory = !!selected && (category === "CONTINUE_INDEPENDENT_HOLD" ||
    category === "REQUEST_DISPOSITION_RECHECK" && selected.signals.some(signal =>
      ["DISPOSITION_CHANGED", "OWNER_OUTCOME_CHANGED", "OWNER_CLAIM_CHANGED"].includes(signal)) ||
    category === "REQUEST_SOURCE_EVIDENCE_RENEWAL" && selected.signals.some(signal =>
      signal.startsWith("SOURCE_EVIDENCE_")) ||
    category === "REQUEST_OVERDUE_INDEPENDENT_REVIEW" &&
      selected.signals.includes("PRIOR_DISPOSITION_OVERDUE"));
  const canRecord = active && matchingCategory && latest >= importedRecurrences &&
    environment.installed_windows_witnessed && environment.access !== "unknown" &&
    !!environment.installed_version;

  function choose(item: DispositionComparison) {
    setBaseline(item.baseline_recurrence_index); setLatest(item.latest_recurrence_index);
    setCategory("CONTINUE_INDEPENDENT_HOLD"); setCompared(false); setAcknowledged(false);
    setFeedback("");
  }
  function record() {
    try {
      onNotesChange(recordDispositionFollowup(recurrences, followups, history, checks,
        notes, environment, { recurrences: importedRecurrences, dispositions: importedNotes },
        { baseline_recurrence_index: baseline, latest_recurrence_index: latest,
          category, personally_compared: compared, hold_acknowledged: acknowledged }));
      setCompared(false); setAcknowledged(false);
      setFeedback("Private recurrence disposition follow-up appended locally. No approval, reassignment, notification or evidence request was sent.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not append private HOLD disposition.");
    }
  }
  async function compareEarlier(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setReceiptComparison(null);
    try {
      if (file.size > 3_600_000) throw new Error("Earlier Build 164 receipt exceeds 3.6 MB.");
      setReceiptComparison(compareEarlierReceipt(await file.text()));
      setFeedback("Private Build 164 receipts compared as strict append-only structural prefixes only. No source or person was authenticated.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Private Build 164 receipt comparison failed.");
    }
  }
  return <section className="owner-handoff-reconciliation" aria-label="Build 165 independent recurrence disposition follow-up and source evidence renewal">
    <header className="owner-trial-ledger-heading">
      <div><h3>Recurrence disposition aging & source evidence renewal</h3>
        <p>Compare successive private Build 164 recurrence rounds on the same original held watch. Inspect newer owner claims and source witness evidence before any human review outside this workbench.</p></div>
      <strong className="owner-trial-hold">INDEPENDENT REVIEW: HOLD</strong>
    </header>
    <CardHelp title="Source renewal is not proof of a device or approval">
      Only a later, separately recorded source check is considered renewed. Matching aliases do not authenticate a device. Age is calculated on inspection, not monitored by a timer. Nothing is sent, assigned, approved or closed.
    </CardHelp>
    <div className="owner-trial-reconcile-stats" aria-label="Build 165 disposition totals">
      <span>{comparisons.length} same-watch recurrence round(s)</span>
      <span>{comparisons.filter(item => !item.source_evidence_renewed).length} non-renewed source claim(s)</span>
      <span>{comparisons.filter(item => item.signals.includes("PRIOR_DISPOSITION_OVERDUE")).length} overdue prior disposition(s)</span>
      <span>{notes.length} private disposition note(s) · {importedNotes} historical</span>
      <span>0 dispatched, reassigned, approved or closed</span>
    </div>
    <label>Compare earlier complete Build 164 private recurrence receipt with current chain (read-only)
      <input type="file" accept=".json,application/json" disabled={!active}
        onChange={event => void compareEarlier(event)} />
    </label>
    {receiptComparison && <p role="note">Strict append-only prefix: {receiptComparison.previous_recurrences} prior recurrence(s), {receiptComparison.new_recurrences} newer recurrence(s). {receiptComparison.comparison ?
      `Same watch #${receiptComparison.comparison.reassignment_watch_index + 1}; ${receiptComparison.comparison.signals.join(", ")}.` :
      "No newer same-watch recurrence pair in these private exports."} No independent approval is inferred.</p>}
    <label className="owner-decision-filter">Manual disposition filter
      <select value={filter} onChange={event => setFilter(event.target.value as Filter)}>
        <option value="all">All same-watch recurrence rounds</option>
        <option value="changed">Disposition, owner outcome or owner claim changed</option>
        <option value="source">Unrenewed, changed or unverified source evidence</option>
        <option value="overdue">Prior disposition more than 7 days overdue</option>
        <option value="historical">Imported historical recurrence rounds</option>
      </select>
    </label>
    {comparisons.length === 0 && <p>Two chronological Build 164 recurrence notes for the exact same Build 162 watch, each reaching a successively newer owner review, are required. All prior exceptions remain on HOLD.</p>}
    {comparisons.length > 0 && visible.length === 0 && <p>No recurrence dispositions match this manual filter.</p>}
    <div className="owner-decision-cards">
      {visible.map(item => <article key={item.latest_recurrence_index} className={
        baseline === item.baseline_recurrence_index && latest === item.latest_recurrence_index ?
          "owner-reassessment-selected" : ""}>
        <strong>{item.case_id} · watch #{item.reassignment_watch_index + 1} · recurrence #{item.baseline_recurrence_index + 1} → #{item.latest_recurrence_index + 1}</strong>
        <small>First {item.baseline_at} · latest {item.latest_at}</small>
        <p>Private disposition: {item.baseline_disposition.replaceAll("_", " ")} → {item.latest_disposition.replaceAll("_", " ")}.</p>
        <p>Owner claim: {item.baseline_owner_claim.replaceAll("_", " ")} → {item.latest_owner_claim.replaceAll("_", " ")}; outcome {item.baseline_outcome} → {item.latest_outcome}.</p>
        <p>Source renewed after prior disposition: {item.source_evidence_renewed ? "claimed (unverified)" : "NO"}. Age: {item.age_since_first_disposition_days} days since first disposition; {item.age_since_watch_days} since held watch.</p>
        <p>Signals: {item.signals.join("; ").replaceAll("_", " ")}.</p>
        {item.historical && <small>Historical import; cannot authorize a new decision.</small>}
        <button type="button" onClick={() => choose(item)}>Inspect exact private recurrence pair</button>
      </article>)}
    </div>
    <fieldset className="owner-review-entry">
      <legend>Manual recurrence disposition evidence · NOT SENT</legend>
      <p>{selected ? `Watch #${selected.reassignment_watch_index + 1}: ${selected.age_since_first_disposition_days} days since first disposition; ${selected.signals.join(", ")}.` :
        "Select two exact same-watch chronological recurrence rounds."}</p>
      {!canRecord && selected && <p className="owner-trial-warning">Fresh non-imported recurrence evidence and personally witnessed installed Windows Hub are required. Old imported claims cannot sign off anything.</p>}
      <label>Fixed HOLD-only disposition category
        <select value={category} disabled={!selected || !active} onChange={event => {
          setCategory(event.target.value as DispositionCategory); setCompared(false); setAcknowledged(false);
        }}>{DISPOSITION_CATEGORIES.map(item => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select>
      </label>
      <label className="owner-trial-check"><input type="checkbox" checked={compared} disabled={!canRecord}
        onChange={event => { setCompared(event.target.checked); setAcknowledged(false); }} />I personally compared both exact recurrence notes, newer owner/source evidence and the installed Windows Hub.</label>
      <label className="owner-trial-check"><input type="checkbox" checked={acknowledged} disabled={!canRecord}
        onChange={event => setAcknowledged(event.target.checked)} />This is private HOLD-only evidence—not a sent request, reviewer assignment, independent authorization, closure or Vault clearance.</label>
      <button type="button" disabled={!canRecord || !compared || !acknowledged} onClick={record}>Append private disposition follow-up (HOLD)</button>
    </fieldset>
    {notes.map((item, index) => <p key={index}>Disposition #{index + 1}: recurrences #{item.baseline_recurrence_index + 1} → #{item.latest_recurrence_index + 1} · {item.category.replaceAll("_", " ")} · {index < importedNotes ? "historical" : "local unverified"} · NOT SENT / HOLD.</p>)}
    {feedback && <p role="status" className="owner-trial-feedback">{feedback}</p>}
    <p className="owner-trial-privacy">Build 165 is browser-local, bounded, append-only and unverified. Manual age bands are not timers. No automatic request, notification, reassignment, independent field certification, case closure or first-party password/document Vault clearance. FIELD_ACCEPTANCE_HOLD · INDEPENDENT_REVIEW_HOLD · NOT_AUTHORIZED · Vault 0/6 verified SECURITY HOLD.</p>
  </section>;
}
