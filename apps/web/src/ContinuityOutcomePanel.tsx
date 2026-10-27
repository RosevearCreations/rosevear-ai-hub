import { useEffect, useState, type ChangeEvent } from "react";
import { CardHelp } from "./CommandShell";
import type { TrialEnvironment, TrialObservation } from "./ownerFieldTrial";
import type { SourceIdentityCheck } from "./ownerFieldRouting";
import type { OwnerReviewFollowup } from "./ownerReassignmentReviewFollowup";
import type { ReviewRecurrenceNote } from "./ownerReviewRecurrence";
import type { DispositionFollowup } from "./ownerRecurrenceDisposition";
import type { ContinuityWatchNote } from "./ownerDispositionContinuity";
import { compareContinuityOutcomes, OUTCOME_CATEGORIES, recordOutcomeNote,
  type OutcomeCategory, type OutcomeComparison, type OutcomeNote } from "./ownerContinuityOutcome";

type Filter = "all" | "owner" | "source" | "overdue" | "historical";
type ReceiptComparison = { previous_watches: number; current_watches: number;
  new_watches: number; comparison: OutcomeComparison | null };

export function ContinuityOutcomePanel({ watches, dispositions, recurrences, followups,
  history, checks, notes, environment, importedWatches, importedNotes, onNotesChange,
  compareEarlierReceipt, active = true }: {
  watches: readonly ContinuityWatchNote[];
  dispositions: readonly DispositionFollowup[];
  recurrences: readonly ReviewRecurrenceNote[];
  followups: readonly OwnerReviewFollowup[];
  history: readonly TrialObservation[];
  checks: readonly SourceIdentityCheck[];
  notes: OutcomeNote[];
  environment: TrialEnvironment;
  importedWatches: number;
  importedNotes: number;
  onNotesChange: (notes: OutcomeNote[]) => void;
  compareEarlierReceipt: (raw: string) => ReceiptComparison;
  active?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [baseline, setBaseline] = useState(0);
  const [latest, setLatest] = useState(1);
  const [category, setCategory] = useState<OutcomeCategory>("CONTINUE_INDEPENDENT_HOLD");
  const [compared, setCompared] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [receiptComparison, setReceiptComparison] = useState<ReceiptComparison | null>(null);
  const [feedback, setFeedback] = useState("");
  useEffect(() => { if (!active) { setCompared(false); setAcknowledged(false); } }, [active]);

  const comparisons: (OutcomeComparison & { historical: boolean })[] = [];
  watches.forEach((item, index) => {
    const earlier = watches.findIndex((prior, previous) => previous < index &&
      prior.reassignment_watch_index === item.reassignment_watch_index &&
      prior.latest_disposition_index < item.latest_disposition_index &&
      Date.parse(prior.recorded_at) < Date.parse(item.recorded_at));
    if (earlier < 0) return;
    try { comparisons.push({ ...compareContinuityOutcomes(watches, dispositions,
      recurrences, followups, history, checks, earlier, index),
      historical: index < importedWatches }); }
    catch { /* Older claims are not independent approval. */ }
  });
  const visible = comparisons.filter(item => filter === "all" ||
    filter === "owner" && item.signals.some(signal => ["OWNER_OUTCOME_CHANGED",
      "OWNER_CLAIM_CONTRADICTED", "REPEATED_DISPOSITION_EXCEPTION", "OWNER_TRIAL_NOT_RENEWED"].includes(signal)) ||
    filter === "source" && item.signals.some(signal => signal.startsWith("SOURCE_")) ||
    filter === "overdue" && item.signals.includes("SOURCE_EVIDENCE_OVERDUE") ||
    filter === "historical" && item.historical);
  let selected: OutcomeComparison | null = null;
  try { selected = compareContinuityOutcomes(watches, dispositions, recurrences,
    followups, history, checks, baseline, latest); } catch { /* A valid pair is required. */ }
  const matchesCategory = !!selected && (category === "CONTINUE_INDEPENDENT_HOLD" ||
    category === "REQUEST_OWNER_OUTCOME_RECHECK" && selected.signals.some(signal =>
      ["OWNER_OUTCOME_CHANGED", "OWNER_CLAIM_CONTRADICTED", "REPEATED_DISPOSITION_EXCEPTION"].includes(signal)) ||
    category === "REQUEST_SOURCE_FRESHNESS_RECHECK" && selected.signals.some(signal =>
      signal.startsWith("SOURCE_")) ||
    category === "REQUEST_OVERDUE_INDEPENDENT_REVIEW" && selected.age_band === "OVER_SEVEN_DAYS");
  const canRecord = active && matchesCategory && !!selected?.owner_trial_renewed &&
    latest >= importedWatches && environment.installed_windows_witnessed &&
    environment.access !== "unknown" && !!environment.installed_version;

  function choose(item: OutcomeComparison) {
    setBaseline(item.baseline_continuity_index); setLatest(item.latest_continuity_index);
    setCategory("CONTINUE_INDEPENDENT_HOLD"); setCompared(false); setAcknowledged(false);
    setFeedback("");
  }
  function record() {
    try {
      onNotesChange(recordOutcomeNote(watches, dispositions, recurrences, followups,
        history, checks, notes, environment,
        { watches: importedWatches, outcomes: importedNotes },
        { baseline_continuity_index: baseline, latest_continuity_index: latest,
          category, personally_compared: compared, hold_acknowledged: acknowledged }));
      setCompared(false); setAcknowledged(false);
      setFeedback("Private Build 167 continuity outcome appended locally; no request, communication, reassignment or approval was sent.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not append private HOLD outcome."); }
  }
  async function compareEarlier(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setReceiptComparison(null);
    try {
      if (file.size > 4_300_000) throw new Error("Earlier Build 166 receipt exceeds 4.3 MB.");
      setReceiptComparison(compareEarlierReceipt(await file.text()));
      setFeedback("Build 166 private receipts compared as append-only historical prefixes only. Nothing was imported or authenticated.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Build 166 receipt comparison failed."); }
  }
  return <section className="owner-handoff-reconciliation" aria-label="Build 167 independent continuity outcome and source evidence freshness">
    <header className="owner-trial-ledger-heading">
      <div><h3>Continuity watch outcomes & source evidence freshness</h3>
        <p>Reconcile successive same-watch Build 166 HOLD notes against newly witnessed owner trials and source claims. A newer alias is never independently authenticated device evidence.</p></div>
      <strong className="owner-trial-hold">INDEPENDENT REVIEW: HOLD</strong>
    </header>
    <CardHelp title="How to interpret Build 167 evidence">
      Recheck actual Windows and two distinct private continuity notes. Freshness bands are calculated only while inspecting this screen. Source aliases, device health, owner outcomes and imported files remain unverified; no background timers or gateway requests run.
    </CardHelp>
    <div className="owner-trial-reconcile-stats" aria-label="Build 167 outcome totals">
      <span>{comparisons.length} same-watch outcome pair(s)</span>
      <span>{comparisons.filter(item => !item.owner_trial_renewed).length} missing fresh owner trial(s)</span>
      <span>{comparisons.filter(item => item.signals.includes("SOURCE_EVIDENCE_OVERDUE")).length} overdue source claim(s)</span>
      <span>{notes.length} private outcome note(s) · {importedNotes} historical</span>
      <span>0 sends, assignments, commands or approvals</span>
    </div>
    <label>Compare earlier complete Build 166 private continuity receipt with current chain (read-only)
      <input type="file" accept=".json,application/json" disabled={!active}
        onChange={event => void compareEarlier(event)} />
    </label>
    {receiptComparison && <p role="note">Strict append-only prefix: {receiptComparison.previous_watches} prior watch(es), {receiptComparison.new_watches} newer watch(es). {receiptComparison.comparison ?
      `Case ${receiptComparison.comparison.case_id}; ${receiptComparison.comparison.signals.join(", ")}.` :
      "No newer same-watch outcome pair crossed these private exports."} This is not real approval.</p>}
    <label className="owner-decision-filter">Manual outcome filter
      <select value={filter} onChange={event => setFilter(event.target.value as Filter)}>
        <option value="all">All same-watch continuity outcomes</option>
        <option value="owner">Changed or repeated owner exceptions</option>
        <option value="source">Source evidence freshness or identity claims</option>
        <option value="overdue">Overdue source evidence</option>
        <option value="historical">Imported historical outcomes</option>
      </select>
    </label>
    {comparisons.length === 0 && <p>Two chronological Build 166 notes for the same held reassignment watch with a newer disposition are required. All prior decisions remain HOLD.</p>}
    {comparisons.length > 0 && visible.length === 0 && <p>No continuity outcomes match this manual filter.</p>}
    <div className="owner-decision-cards">
      {visible.map(item => <article key={item.latest_continuity_index} className={
        baseline === item.baseline_continuity_index && latest === item.latest_continuity_index ?
          "owner-reassessment-selected" : ""}>
        <strong>{item.case_id} · watch #{item.reassignment_watch_index + 1} · continuity #{item.baseline_continuity_index + 1} → #{item.latest_continuity_index + 1}</strong>
        <small>Earlier {item.baseline_at} · later {item.latest_at}</small>
        <p>Owner trial renewed after earlier watch: {item.owner_trial_renewed ? "yes, unverified" : "NO"}; outcome {item.baseline_outcome} → {item.latest_outcome}; owner {item.baseline_owner_claim.replaceAll("_", " ")} → {item.latest_owner_claim.replaceAll("_", " ")}.</p>
        <p>Source check renewed: {item.source_evidence_renewed ? "yes, unverified" : "NO"}; claimed alias confirmed: {item.source_identity_confirmed_claim ? "yes, not certified" : "NO"}; latest source age {item.source_age_days ?? "missing"} day(s).</p>
        <p>Continuity age {item.continuity_age_days} day(s); {item.signals.join("; ").replaceAll("_", " ")}.</p>
        {item.historical && <small>Historical import; never independent sign-off.</small>}
        <button type="button" onClick={() => choose(item)}>Inspect exact continuity outcome pair</button>
      </article>)}
    </div>
    <fieldset className="owner-review-entry">
      <legend>Manual outcome reconciliation evidence · NOT SENT</legend>
      <p>{selected ? `Case ${selected.case_id}: ${selected.continuity_age_days} days since earlier continuity note; ${selected.signals.join(", ")}.` :
        "Select two exact chronological same-watch continuity notes."}</p>
      {!canRecord && selected && <p className="owner-trial-warning">A later non-imported watch, a genuinely newer owner trial after the earlier watch and personally witnessed installed Windows are required.</p>}
      <label>Fixed HOLD-only outcome category
        <select value={category} disabled={!selected || !active} onChange={event => {
          setCategory(event.target.value as OutcomeCategory); setCompared(false); setAcknowledged(false);
        }}>{OUTCOME_CATEGORIES.map(item => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select>
      </label>
      <label className="owner-trial-check"><input type="checkbox" checked={compared} disabled={!canRecord}
        onChange={event => { setCompared(event.target.checked); setAcknowledged(false); }} />I personally compared both watch outcomes, renewed source evidence and current installed Windows Hub.</label>
      <label className="owner-trial-check"><input type="checkbox" checked={acknowledged} disabled={!canRecord}
        onChange={event => setAcknowledged(event.target.checked)} />I acknowledge permanent independent/field/Vault HOLD. This private note sends nothing and authorizes no closure.</label>
      <button type="button" disabled={!canRecord || !compared || !acknowledged} onClick={record}>Append private outcome reconciliation (HOLD)</button>
    </fieldset>
    {notes.map((item, index) => <p key={index}>Outcome #{index + 1}: continuity #{item.baseline_continuity_index + 1} → #{item.latest_continuity_index + 1} · {item.category.replaceAll("_", " ")} · {index < importedNotes ? "historical" : "local unverified"} · NOT SENT / HOLD.</p>)}
    {feedback && <p role="status" className="owner-trial-feedback">{feedback}</p>}
    <p className="owner-trial-privacy">Build 167 remains browser-local, bounded, append-only and unverified. No live gateway connection, notification, remote command, owner reassignment, field certification, independent approval or first-party Vault clearance. FIELD_ACCEPTANCE_HOLD · INDEPENDENT_REVIEW_HOLD · NOT_AUTHORIZED · Vault 0/6 verified SECURITY HOLD.</p>
  </section>;
}
