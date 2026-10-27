import { useEffect, useState, type ChangeEvent } from "react";
import { CardHelp } from "./CommandShell";
import type { TrialEnvironment, TrialObservation } from "./ownerFieldTrial";
import type { SourceIdentityCheck } from "./ownerFieldRouting";
import type { OwnerReviewFollowup } from "./ownerReassignmentReviewFollowup";
import { compareOwnerReviewRounds, recordReviewRecurrence, REVIEW_RECURRENCE_CATEGORIES,
  type ReviewRecurrenceCategory, type ReviewRecurrenceComparison,
  type ReviewRecurrenceNote } from "./ownerReviewRecurrence";

type Filter = "all" | "regression" | "source" | "overdue" | "historical";
type PrivateComparison = { previous_followups: number; current_followups: number;
  new_followups: number; comparison: ReviewRecurrenceComparison | null };

/** Private System owner panel. The word independent never implies certified real-world review. */
export function OwnerReviewRecurrencePanel({ followups, history, checks, notes, environment,
  importedFollowups, importedNotes, onNotesChange, compareEarlierReceipt, active = true }: {
  followups: readonly OwnerReviewFollowup[];
  history: readonly TrialObservation[];
  checks: readonly SourceIdentityCheck[];
  notes: ReviewRecurrenceNote[];
  environment: TrialEnvironment;
  importedFollowups: number;
  importedNotes: number;
  onNotesChange: (notes: ReviewRecurrenceNote[]) => void;
  compareEarlierReceipt: (raw: string) => PrivateComparison;
  active?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [baseline, setBaseline] = useState(0);
  const [latest, setLatest] = useState(1);
  const [category, setCategory] = useState<ReviewRecurrenceCategory>("CONTINUE_INDEPENDENT_HOLD");
  const [compared, setCompared] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [receiptComparison, setReceiptComparison] = useState<PrivateComparison | null>(null);
  const [feedback, setFeedback] = useState("");
  useEffect(() => { if (!active) { setCompared(false); setAcknowledged(false); } }, [active]);

  const comparisons: (ReviewRecurrenceComparison & { historical: boolean })[] = [];
  followups.forEach((followup, index) => {
    const earlier = followups.findIndex((item, prior) => prior < index &&
      item.reassignment_watch_index === followup.reassignment_watch_index &&
      item.observation_index < followup.observation_index &&
      Date.parse(item.recorded_at) < Date.parse(followup.followup_observed_at));
    if (earlier < 0) return;
    try {
      comparisons.push({ ...compareOwnerReviewRounds(followups, history, checks, earlier, index),
        historical: index < importedFollowups });
    } catch { /* Preserve invalid or imported claims as historical, not new authority. */ }
  });
  const visible = comparisons.filter(item => filter === "all" ||
    filter === "regression" && item.signals.some(signal => signal === "REVIEW_OUTCOME_REGRESSED" ||
      signal === "REVIEW_OUTCOME_CHANGED" || signal === "FOLLOWUP_OWNER_CLAIM_CHANGED") ||
    filter === "source" && item.signals.some(signal => signal.startsWith("FOLLOWUP_SOURCE_")) ||
    filter === "overdue" && item.signals.includes("FIRST_REVIEW_RESPONSE_OVERDUE") ||
    filter === "historical" && item.historical);
  let selected: ReviewRecurrenceComparison | null = null;
  try { selected = compareOwnerReviewRounds(followups, history, checks, baseline, latest); }
  catch { /* Explicit exact chronological pair required. */ }
  const matchingCategory = !!selected && (category === "CONTINUE_INDEPENDENT_HOLD" ||
    category === "REQUEST_RECURRENCE_EVIDENCE_RECHECK" &&
      selected.signals.some(signal => signal === "REVIEW_OUTCOME_REGRESSED" ||
        signal === "REVIEW_OUTCOME_CHANGED" || signal === "FOLLOWUP_OWNER_CLAIM_CHANGED") ||
    category === "REQUEST_SOURCE_WITNESS_RECHECK" &&
      selected.signals.some(signal => signal.startsWith("FOLLOWUP_SOURCE_")) ||
    category === "REQUEST_OVERDUE_OWNER_REVIEW_RESPONSE" &&
      selected.signals.includes("FIRST_REVIEW_RESPONSE_OVERDUE"));
  const canRecord = active && matchingCategory && latest >= importedFollowups &&
    environment.installed_windows_witnessed && environment.access !== "unknown" &&
    !!environment.installed_version;

  function choose(item: ReviewRecurrenceComparison) {
    setBaseline(item.baseline_followup_index); setLatest(item.latest_followup_index);
    setCategory("CONTINUE_INDEPENDENT_HOLD"); setCompared(false); setAcknowledged(false);
    setFeedback("");
  }
  function record() {
    try {
      onNotesChange(recordReviewRecurrence(followups, history, checks, notes, environment,
        { followups: importedFollowups, recurrences: importedNotes },
        { baseline_followup_index: baseline, latest_followup_index: latest, category,
          personally_compared: compared, hold_acknowledged: acknowledged }));
      setCompared(false); setAcknowledged(false);
      setFeedback("Private owner review recurrence appended locally. No owner was reassigned; no request, approval or message was sent.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not append private HOLD recurrence."); }
  }
  async function compareEarlier(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setReceiptComparison(null);
    try {
      if (file.size > 3_250_000) throw new Error("Earlier Build 163 receipt exceeds 3.25 MB.");
      setReceiptComparison(compareEarlierReceipt(await file.text()));
      setFeedback("Private Build 163 receipts compared as exact structural prefixes only. Nothing was imported or authenticated.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Private Build 163 receipt comparison failed."); }
  }

  return <section className="owner-handoff-reconciliation" aria-label="Build 164 independent owner review follow-up recurrence and overdue evidence recheck">
    <header className="owner-trial-ledger-heading">
      <div><h3>Owner review recurrence & overdue evidence recheck</h3>
        <p>Compare two private owner review follow-ups on the exact same held reassignment watch. Later improvements, regressions, changed owner claims and unanswered independent reviews cannot release the original HOLD.</p></div>
      <strong className="owner-trial-hold">INDEPENDENT REVIEW: HOLD</strong>
    </header>
    <CardHelp title="A review recurrence is not an automatic escalation">
      Old and new review notes are operator claims. An overdue age is computed on manual inspection; it does not notify anyone or authorize an assignment. Recheck the actual Windows Hub, retain source discrepancies and obtain independent human acceptance outside this tool.
    </CardHelp>
    <div className="owner-trial-reconcile-stats" aria-label="Build 164 recurrence totals">
      <span>{comparisons.length} same-watch review round(s)</span>
      <span>{comparisons.filter(item => item.signals.includes("REVIEW_OUTCOME_REGRESSED")).length} renewed regression(s)</span>
      <span>{comparisons.filter(item => item.signals.includes("FIRST_REVIEW_RESPONSE_OVERDUE")).length} overdue independent review(s)</span>
      <span>{notes.length} private recurrence note(s) · {importedNotes} historical</span>
      <span>0 assigned, dispatched, scheduled, approved or closed</span>
    </div>
    <label>Compare earlier Build 163 private owner review receipt with current complete chain (read-only)
      <input type="file" accept=".json,application/json" disabled={!active}
        onChange={event => void compareEarlier(event)} />
    </label>
    {receiptComparison && <p role="note">Strict append-only prefix: {receiptComparison.previous_followups} earlier review(s), {receiptComparison.new_followups} new review(s). {receiptComparison.comparison ?
      `Same watch #${receiptComparison.comparison.reassignment_watch_index + 1}; ${receiptComparison.comparison.signals.join(", ")}.` :
      "No same-watch chronological review pair crossed these private exports."} No real-world approval can be inferred.</p>}
    <label className="owner-decision-filter">Manual independent follow-up filter
      <select value={filter} onChange={event => setFilter(event.target.value as Filter)}>
        <option value="all">All same-watch owner review rounds</option>
        <option value="regression">Owner outcome recurrence or role change</option>
        <option value="source">Missing or conflicting source witness</option>
        <option value="overdue">First review response more than 7 days overdue</option>
        <option value="historical">Imported historical review rounds</option>
      </select>
    </label>
    {comparisons.length === 0 && <p>Two chronological Build 163 follow-ups for the exact same Build 162 watch, with a truly later owner trial, are required. All prior exceptions remain on HOLD.</p>}
    {comparisons.length > 0 && visible.length === 0 && <p>No owner review rounds match this manual filter.</p>}
    <div className="owner-decision-cards">
      {visible.map(item => <article key={item.latest_followup_index} className={
        baseline === item.baseline_followup_index && latest === item.latest_followup_index ?
          "owner-reassessment-selected" : ""}>
        <strong>{item.case_id} · original watch #{item.reassignment_watch_index + 1} · reviews #{item.baseline_followup_index + 1} → #{item.latest_followup_index + 1}</strong>
        <small>First {item.baseline_at} · latest {item.latest_at}</small>
        <p>Owner claims: {item.baseline_owner_claim.replaceAll("_", " ")} → {item.latest_owner_claim.replaceAll("_", " ")} (private only).</p>
        <p>Owner outcomes: {item.baseline_outcome} → {item.latest_outcome}. {item.first_review_age_days} elapsed day(s) since first owner review · {item.first_watch_age_days} since watch · {item.age_band.replaceAll("_", " ")}.</p>
        <p>Signals: {item.signals.join("; ").replaceAll("_", " ")}.</p>
        {item.historical && <small>Imported historical review · not a fresh independent decision.</small>}
        <button type="button" onClick={() => choose(item)}>Inspect exact private owner review pair</button>
      </article>)}
    </div>
    <fieldset className="owner-review-entry">
      <legend>Manual independent recurrence evidence · NOT SENT</legend>
      <p>{selected ? `Watch #${selected.reassignment_watch_index + 1}: ${selected.first_review_age_days} days since first review; ${selected.signals.join(", ")}.` :
        "Select two exact same-watch chronological owner review follow-ups."}</p>
      {!canRecord && selected && <p className="owner-trial-warning">A fresh non-imported later follow-up and witnessed installed Windows Hub are required. Imported history never authorizes independent signoff.</p>}
      <label>Fixed HOLD-only recurrence category
        <select value={category} disabled={!selected || !active} onChange={event => {
          setCategory(event.target.value as ReviewRecurrenceCategory);
          setCompared(false); setAcknowledged(false);
        }}>{REVIEW_RECURRENCE_CATEGORIES.map(item => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select>
      </label>
      <label className="owner-trial-check"><input type="checkbox" checked={compared} disabled={!canRecord}
        onChange={event => { setCompared(event.target.checked); setAcknowledged(false); }} />I personally compared both exact owner review rounds, source aliases, open original watch and installed Windows Hub.</label>
      <label className="owner-trial-check"><input type="checkbox" checked={acknowledged} disabled={!canRecord}
        onChange={event => setAcknowledged(event.target.checked)} />I acknowledge private HOLD-only evidence—not an owner assignment, independent authorization, dispatch, closure or Vault clearance.</label>
      <button type="button" disabled={!canRecord || !compared || !acknowledged} onClick={record}>Append private owner review recurrence audit (HOLD)</button>
    </fieldset>
    {notes.map((note, index) => <p key={index}>Recurrence #{index + 1}: reviews #{note.baseline_followup_index + 1} → #{note.latest_followup_index + 1} · {note.category.replaceAll("_", " ")} · {index < importedNotes ? "historical import" : "local unverified"} · NOT SENT / HOLD.</p>)}
    {feedback && <p role="status" className="owner-trial-feedback">{feedback}</p>}
    <p className="owner-trial-privacy">Build 164 remains browser-local, bounded and append-only. Manual age bands are not timers. No notification, assignment, dispatch, independent field certification, automatic closure or first-party password/document Vault clearance. FIELD_ACCEPTANCE_HOLD · INDEPENDENT_REVIEW_HOLD · NOT_AUTHORIZED · Vault 0/6 verified SECURITY HOLD.</p>
  </section>;
}
