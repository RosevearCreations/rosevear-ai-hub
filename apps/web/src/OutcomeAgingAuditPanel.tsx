import { useEffect, useState, type ChangeEvent } from "react";
import { CardHelp } from "./CommandShell";
import type { TrialEnvironment, TrialObservation } from "./ownerFieldTrial";
import type { SourceIdentityCheck } from "./ownerFieldRouting";
import type { OwnerReviewFollowup } from "./ownerReassignmentReviewFollowup";
import type { ReviewRecurrenceNote } from "./ownerReviewRecurrence";
import type { DispositionFollowup } from "./ownerRecurrenceDisposition";
import type { ContinuityWatchNote } from "./ownerDispositionContinuity";
import type { OutcomeNote } from "./ownerContinuityOutcome";
import { AGING_CATEGORIES, compareOutcomeAging, recordAgingAudit,
  type AgingAuditNote, type AgingCategory, type AgingComparison } from "./ownerOutcomeAgingAudit";

type Filter = "all" | "owner" | "source" | "overdue" | "historical";
type ReceiptComparison = { previous_outcomes: number; current_outcomes: number;
  new_outcomes: number; comparison: AgingComparison | null };

export function OutcomeAgingAuditPanel({ outcomes, watches, dispositions, recurrences,
  followups, history, checks, notes, environment, importedOutcomes, importedNotes,
  onNotesChange, compareEarlierReceipt, active = true }: {
  outcomes: readonly OutcomeNote[];
  watches: readonly ContinuityWatchNote[];
  dispositions: readonly DispositionFollowup[];
  recurrences: readonly ReviewRecurrenceNote[];
  followups: readonly OwnerReviewFollowup[];
  history: readonly TrialObservation[];
  checks: readonly SourceIdentityCheck[];
  notes: AgingAuditNote[];
  environment: TrialEnvironment;
  importedOutcomes: number;
  importedNotes: number;
  onNotesChange: (notes: AgingAuditNote[]) => void;
  compareEarlierReceipt: (raw: string) => ReceiptComparison;
  active?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [baseline, setBaseline] = useState(0);
  const [latest, setLatest] = useState(1);
  const [category, setCategory] = useState<AgingCategory>("CONTINUE_INDEPENDENT_HOLD");
  const [rechecked, setRechecked] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [receiptComparison, setReceiptComparison] = useState<ReceiptComparison | null>(null);
  const [feedback, setFeedback] = useState("");
  useEffect(() => { if (!active) { setRechecked(false); setAcknowledged(false); } }, [active]);

  const comparisons: (AgingComparison & { historical: boolean })[] = [];
  outcomes.forEach((item, index) => {
    const earlier = outcomes.findIndex((prior, previous) => previous < index &&
      prior.reassignment_watch_index === item.reassignment_watch_index &&
      prior.latest_continuity_index < item.latest_continuity_index &&
      Date.parse(prior.recorded_at) < Date.parse(item.recorded_at));
    if (earlier < 0) return;
    try { comparisons.push({ ...compareOutcomeAging(outcomes, watches, dispositions,
      recurrences, followups, history, checks, earlier, index),
      historical: index < importedOutcomes }); }
    catch { /* Historical/private claims never become acceptance. */ }
  });
  const visible = comparisons.filter(item => filter === "all" ||
    filter === "owner" && item.signals.some(signal => ["OWNER_OUTCOME_CHANGED_AGAIN",
      "OWNER_CLAIM_CONFLICT_PERSISTS", "REPEATED_OWNER_EXCEPTION",
      "NEW_OWNER_TRIAL_NOT_WITNESSED"].includes(signal)) ||
    filter === "source" && item.signals.some(signal => signal.startsWith("SOURCE_")) ||
    filter === "overdue" && item.signals.some(signal => signal.endsWith("OVERDUE")) ||
    filter === "historical" && item.historical);
  let selected: AgingComparison | null = null;
  try { selected = compareOutcomeAging(outcomes, watches, dispositions, recurrences,
    followups, history, checks, baseline, latest); } catch { /* An exact pair is required. */ }
  const matchesCategory = !!selected && (category === "CONTINUE_INDEPENDENT_HOLD" ||
    category === "REQUEST_OWNER_EXCEPTION_RECHECK" && selected.signals.some(signal =>
      ["OWNER_OUTCOME_CHANGED_AGAIN", "OWNER_CLAIM_CONFLICT_PERSISTS",
        "REPEATED_OWNER_EXCEPTION"].includes(signal)) ||
    category === "REQUEST_SOURCE_FRESHNESS_RECHECK" && selected.signals.some(signal =>
      signal.startsWith("SOURCE_")) ||
    category === "REQUEST_OVERDUE_REVIEW" && selected.signals.includes("EARLIER_OUTCOME_OVERDUE"));
  const canRecord = active && matchesCategory && !!selected?.new_owner_trial_since_outcome &&
    latest >= importedOutcomes && environment.installed_windows_witnessed &&
    environment.access !== "unknown" && !!environment.installed_version;

  function choose(item: AgingComparison) {
    setBaseline(item.baseline_outcome_index); setLatest(item.latest_outcome_index);
    setCategory("CONTINUE_INDEPENDENT_HOLD"); setRechecked(false); setAcknowledged(false);
    setFeedback("");
  }
  function record() {
    try {
      onNotesChange(recordAgingAudit(outcomes, watches, dispositions, recurrences,
        followups, history, checks, notes, environment,
        { outcomes: importedOutcomes, audits: importedNotes },
        { baseline_outcome_index: baseline, latest_outcome_index: latest,
          category, personally_rechecked: rechecked, hold_acknowledged: acknowledged }));
      setRechecked(false); setAcknowledged(false);
      setFeedback("Private Build 168 outcome aging audit appended locally. No reminder, assignment, source certification or approval was sent.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not append private HOLD audit."); }
  }
  async function compareEarlier(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setReceiptComparison(null);
    try {
      if (file.size > 4_650_000) throw new Error("Earlier Build 167 receipt exceeds 4.65 MB.");
      setReceiptComparison(compareEarlierReceipt(await file.text()));
      setFeedback("Complete private Build 167 receipts compared as exact append-only historical prefixes only. Nothing was imported or authenticated.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Build 167 receipt comparison failed."); }
  }

  return <section className="owner-handoff-reconciliation" aria-label="Build 168 independent continuity outcome aging audit and source freshness recheck">
    <header className="owner-trial-ledger-heading">
      <div><h3>Continuity outcome aging audit & source freshness recheck</h3>
        <p>Compare successive private Build 167 HOLD outcomes for one original held case. Recheck owner observations and linked source-alias age without authenticating the device or closing the case.</p></div>
      <strong className="owner-trial-hold">INDEPENDENT REVIEW: HOLD</strong>
    </header>
    <CardHelp title="Build 168 manual freshness and aging audit">
      A source check must be explicitly linked to the newer private outcome to count as fresh. Three days is aged; eight days is overdue. Missing or matching aliases are never physical source proof. No timers, messages, external gateway calls, owner assignments or automatic closure occur.
    </CardHelp>
    <div className="owner-trial-reconcile-stats" aria-label="Build 168 aging audit totals">
      <span>{comparisons.length} same-watch outcome comparison(s)</span>
      <span>{comparisons.filter(item => !item.new_owner_trial_since_outcome).length} missing newer owner trial(s)</span>
      <span>{comparisons.filter(item => item.signals.includes("SOURCE_EVIDENCE_OVERDUE")).length} overdue source check(s)</span>
      <span>{notes.length} private aging audit(s) · {importedNotes} historical</span>
      <span>0 reminders, assignments, commands or approvals</span>
    </div>
    <label>Compare earlier complete Build 167 private outcome receipt with current chain (read-only)
      <input type="file" accept=".json,application/json" disabled={!active}
        onChange={event => void compareEarlier(event)} />
    </label>
    {receiptComparison && <p role="note">Strict append-only prefix: {receiptComparison.previous_outcomes} prior outcome(s), {receiptComparison.new_outcomes} newer outcome(s). {receiptComparison.comparison ?
      `Case ${receiptComparison.comparison.case_id}; ${receiptComparison.comparison.signals.join(", ")}.` :
      "No newer same-watch outcome pair crossed these private exports."} No actual approval is inferred.</p>}
    <label className="owner-decision-filter">Manual audit filter
      <select value={filter} onChange={event => setFilter(event.target.value as Filter)}>
        <option value="all">All same-watch outcome rounds</option>
        <option value="owner">Owner changes or repeated exceptions</option>
        <option value="source">Source renewal or identity/freshness concerns</option>
        <option value="overdue">Overdue outcome or source evidence</option>
        <option value="historical">Imported historical outcomes</option>
      </select>
    </label>
    {comparisons.length === 0 && <p>Two chronological Build 167 private outcome notes with newer Build 166 continuity evidence for the exact same held case are required.</p>}
    {comparisons.length > 0 && visible.length === 0 && <p>No outcome aging pairs match this filter.</p>}
    <div className="owner-decision-cards">
      {visible.map(item => <article key={item.latest_outcome_index} className={
        baseline === item.baseline_outcome_index && latest === item.latest_outcome_index ?
          "owner-reassessment-selected" : ""}>
        <strong>{item.case_id} · watch #{item.reassignment_watch_index + 1} · outcomes #{item.baseline_outcome_index + 1} → #{item.latest_outcome_index + 1}</strong>
        <small>Earlier {item.baseline_at} · later {item.latest_at}</small>
        <p>Owner evidence newly witnessed: {item.new_owner_trial_since_outcome ? "yes, still unverified" : "NO"}; outcome {item.baseline_owner_outcome} → {item.latest_owner_outcome}; owner {item.baseline_owner_claim.replaceAll("_", " ")} → {item.latest_owner_claim.replaceAll("_", " ")}.</p>
        <p>Linked source check renewed: {item.source_renewed_since_outcome ? "yes, unverified" : "NO"}; confirmed alias claim: {item.latest_source_confirmed_alias_claim ? "yes, not certified" : "NO"}; source age {item.source_age_days ?? "missing"} day(s).</p>
        <p>Earlier outcome age: {item.outcome_age_days} day(s); {item.signals.join("; ").replaceAll("_", " ")}.</p>
        {item.historical && <small>Imported historical testimony, not independent review.</small>}
        <button type="button" onClick={() => choose(item)}>Inspect exact aging outcome pair</button>
      </article>)}
    </div>
    <fieldset className="owner-review-entry">
      <legend>Manual independent aging audit · NOT SENT</legend>
      <p>{selected ? `Case ${selected.case_id}: ${selected.outcome_age_days} day(s) since earlier outcome; ${selected.signals.join(", ")}.` :
        "Select two exact chronological private outcome notes."}</p>
      {!canRecord && selected && <p className="owner-trial-warning">A later non-imported Build 167 outcome, a newer owner trial after the first outcome and witnessed installed Windows Hub are required.</p>}
      <label>Fixed HOLD-only aging audit category
        <select value={category} disabled={!selected || !active} onChange={event => {
          setCategory(event.target.value as AgingCategory); setRechecked(false); setAcknowledged(false);
        }}>{AGING_CATEGORIES.map(item => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select>
      </label>
      <label className="owner-trial-check"><input type="checkbox" checked={rechecked} disabled={!canRecord}
        onChange={event => { setRechecked(event.target.checked); setAcknowledged(false); }} />I personally rechecked both owner outcomes, source evidence age and actual installed Windows Hub.</label>
      <label className="owner-trial-check"><input type="checkbox" checked={acknowledged} disabled={!canRecord}
        onChange={event => setAcknowledged(event.target.checked)} />I acknowledge permanent independent, field and Vault HOLD; this private record sends nothing and approves no case.</label>
      <button type="button" disabled={!canRecord || !rechecked || !acknowledged} onClick={record}>Append private aging audit (HOLD)</button>
    </fieldset>
    {notes.map((item, index) => <p key={index}>Audit #{index + 1}: outcomes #{item.baseline_outcome_index + 1} → #{item.latest_outcome_index + 1} · {item.category.replaceAll("_", " ")} · {index < importedNotes ? "historical" : "local unverified"} · NOT SENT / HOLD.</p>)}
    {feedback && <p role="status" className="owner-trial-feedback">{feedback}</p>}
    <p className="owner-trial-privacy">Build 168 is browser-local, bounded, append-only and unverified. No automatic aging timer, notification, remote integration command, real owner reassignment, independent approval, field acceptance or password/document Vault release. FIELD_ACCEPTANCE_HOLD · INDEPENDENT_REVIEW_HOLD · NOT_AUTHORIZED · Vault 0/6 verified SECURITY HOLD.</p>
  </section>;
}
