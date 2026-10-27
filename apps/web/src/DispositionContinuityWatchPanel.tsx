import { useEffect, useState, type ChangeEvent } from "react";
import { CardHelp } from "./CommandShell";
import type { TrialEnvironment, TrialObservation } from "./ownerFieldTrial";
import type { SourceIdentityCheck } from "./ownerFieldRouting";
import type { OwnerReviewFollowup } from "./ownerReassignmentReviewFollowup";
import type { ReviewRecurrenceNote } from "./ownerReviewRecurrence";
import type { DispositionFollowup } from "./ownerRecurrenceDisposition";
import { compareDispositionContinuity, CONTINUITY_CATEGORIES, recordContinuityWatch,
  type ContinuityCategory, type ContinuityComparison,
  type ContinuityWatchNote } from "./ownerDispositionContinuity";

type Filter = "all" | "changed" | "source" | "overdue" | "historical";
type ReceiptComparison = { previous_dispositions: number; current_dispositions: number;
  new_dispositions: number; comparison: ContinuityComparison | null };

export function DispositionContinuityWatchPanel({ dispositions, recurrences, followups,
  history, checks, notes, environment, importedDispositions, importedNotes, onNotesChange,
  compareEarlierReceipt, active = true }: {
  dispositions: readonly DispositionFollowup[];
  recurrences: readonly ReviewRecurrenceNote[];
  followups: readonly OwnerReviewFollowup[];
  history: readonly TrialObservation[];
  checks: readonly SourceIdentityCheck[];
  notes: ContinuityWatchNote[];
  environment: TrialEnvironment;
  importedDispositions: number;
  importedNotes: number;
  onNotesChange: (notes: ContinuityWatchNote[]) => void;
  compareEarlierReceipt: (raw: string) => ReceiptComparison;
  active?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [baseline, setBaseline] = useState(0);
  const [latest, setLatest] = useState(1);
  const [category, setCategory] = useState<ContinuityCategory>("CONTINUE_INDEPENDENT_HOLD");
  const [compared, setCompared] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [receiptComparison, setReceiptComparison] = useState<ReceiptComparison | null>(null);
  const [feedback, setFeedback] = useState("");
  useEffect(() => { if (!active) { setCompared(false); setAcknowledged(false); } }, [active]);

  const comparisons: (ContinuityComparison & { historical: boolean })[] = [];
  dispositions.forEach((item, index) => {
    const earlier = dispositions.findIndex((previous, prior) => prior < index &&
      previous.reassignment_watch_index === item.reassignment_watch_index &&
      previous.latest_recurrence_index < item.latest_recurrence_index &&
      Date.parse(previous.recorded_at) < Date.parse(item.recorded_at));
    if (earlier < 0) return;
    try { comparisons.push({ ...compareDispositionContinuity(dispositions, recurrences,
      followups, history, checks, earlier, index), historical: index < importedDispositions }); }
    catch { /* Historical, contradictory private claims must never become authority. */ }
  });
  const visible = comparisons.filter(item => filter === "all" ||
    filter === "changed" && item.signals.some(signal => ["DISPOSITION_RECHECK_CHANGED",
      "OWNER_OUTCOME_CHANGED", "OWNER_CLAIM_CHANGED"].includes(signal)) ||
    filter === "source" && item.signals.some(signal => signal.startsWith("SOURCE_RENEWAL_")) ||
    filter === "overdue" && item.signals.includes("OVERDUE_SOURCE_RECHECK_NEEDED") ||
    filter === "historical" && item.historical);
  let selected: ContinuityComparison | null = null;
  try { selected = compareDispositionContinuity(dispositions, recurrences, followups,
    history, checks, baseline, latest); } catch { /* An exact chronological pair is required. */ }
  const matchingCategory = !!selected && (category === "CONTINUE_INDEPENDENT_HOLD" ||
    category === "REQUEST_DISPOSITION_CONTINUITY_RECHECK" && selected.signals.some(signal =>
      ["DISPOSITION_RECHECK_CHANGED", "OWNER_OUTCOME_CHANGED", "OWNER_CLAIM_CHANGED"].includes(signal)) ||
    category === "REQUEST_SOURCE_RENEWAL_WITNESS" && selected.signals.some(signal =>
      signal.startsWith("SOURCE_RENEWAL_")) ||
    category === "REQUEST_OVERDUE_SOURCE_RENEWAL" &&
      selected.signals.includes("OVERDUE_SOURCE_RECHECK_NEEDED"));
  const canRecord = active && matchingCategory && latest >= importedDispositions &&
    environment.installed_windows_witnessed && environment.access !== "unknown" &&
    !!environment.installed_version;

  function choose(item: ContinuityComparison) {
    setBaseline(item.baseline_disposition_index); setLatest(item.latest_disposition_index);
    setCategory("CONTINUE_INDEPENDENT_HOLD"); setCompared(false); setAcknowledged(false);
    setFeedback("");
  }
  function record() {
    try {
      onNotesChange(recordContinuityWatch(dispositions, recurrences, followups,
        history, checks, notes, environment,
        { dispositions: importedDispositions, watches: importedNotes },
        { baseline_disposition_index: baseline, latest_disposition_index: latest,
          category, personally_compared: compared, hold_acknowledged: acknowledged }));
      setCompared(false); setAcknowledged(false);
      setFeedback("Private disposition continuity watch appended locally. No real request, approval, reassignment or notification was sent.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not append private HOLD continuity watch."); }
  }
  async function compareEarlier(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setReceiptComparison(null);
    try {
      if (file.size > 3_950_000) throw new Error("Earlier Build 165 receipt exceeds 3.95 MB.");
      setReceiptComparison(compareEarlierReceipt(await file.text()));
      setFeedback("Build 165 private receipts compared as exact structural prefixes only. Nothing was imported, sent or authenticated.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Build 165 receipt comparison failed."); }
  }

  return <section className="owner-handoff-reconciliation" aria-label="Build 166 independent disposition continuity and overdue source renewal watch">
    <header className="owner-trial-ledger-heading">
      <div><h3>Disposition evidence recheck continuity & overdue source renewal</h3>
        <p>Compare successive private Build 165 disposition rounds against one exact original held watch. Later improvements and matching aliases never release the independent or physical field HOLD.</p></div>
      <strong className="owner-trial-hold">INDEPENDENT REVIEW: HOLD</strong>
    </header>
    <CardHelp title="This watch cannot send reminders or approve source evidence">
      An overdue band is recalculated only on manual inspection; there is no timer. A new source alias check is an unverified claim, not device authentication. Do not copy customer data, credentials, IPs, camera locations or tenant secrets into private evidence.
    </CardHelp>
    <div className="owner-trial-reconcile-stats" aria-label="Build 166 continuity totals">
      <span>{comparisons.length} same-watch disposition pair(s)</span>
      <span>{comparisons.filter(item => item.signals.includes("SOURCE_RENEWAL_STALLED")).length} stalled source renewal(s)</span>
      <span>{comparisons.filter(item => item.signals.includes("OVERDUE_SOURCE_RECHECK_NEEDED")).length} overdue source recheck(s)</span>
      <span>{notes.length} private continuity note(s) · {importedNotes} historical</span>
      <span>0 alerts, assignments, approvals, commands or closures</span>
    </div>
    <label>Compare earlier complete Build 165 private disposition receipt with current chain (read-only)
      <input type="file" accept=".json,application/json" disabled={!active}
        onChange={event => void compareEarlier(event)} />
    </label>
    {receiptComparison && <p role="note">Strict append-only prefix: {receiptComparison.previous_dispositions} prior disposition(s), {receiptComparison.new_dispositions} newer disposition(s). {receiptComparison.comparison ?
      `Same watch #${receiptComparison.comparison.reassignment_watch_index + 1}; ${receiptComparison.comparison.signals.join(", ")}.` :
      "No newer same-watch disposition pair crossed these private exports."} No real approval is inferred.</p>}
    <label className="owner-decision-filter">Manual continuity filter
      <select value={filter} onChange={event => setFilter(event.target.value as Filter)}>
        <option value="all">All same-watch disposition rounds</option>
        <option value="changed">Disposition or owner claim changed</option>
        <option value="source">Source renewal, change or unverified claim</option>
        <option value="overdue">Overdue source renewal recheck</option>
        <option value="historical">Imported historical dispositions</option>
      </select>
    </label>
    {comparisons.length === 0 && <p>Two chronological Build 165 disposition notes for the exact same original held watch, with a truly newer Build 164 recurrence in the second, are required. All prior decisions remain on HOLD.</p>}
    {comparisons.length > 0 && visible.length === 0 && <p>No disposition continuity pairs match this manual filter.</p>}
    <div className="owner-decision-cards">
      {visible.map(item => <article key={item.latest_disposition_index} className={
        baseline === item.baseline_disposition_index && latest === item.latest_disposition_index ?
          "owner-reassessment-selected" : ""}>
        <strong>{item.case_id} · watch #{item.reassignment_watch_index + 1} · dispositions #{item.baseline_disposition_index + 1} → #{item.latest_disposition_index + 1}</strong>
        <small>Earlier {item.baseline_at} · newer {item.latest_at}</small>
        <p>Disposition: {item.baseline_category.replaceAll("_", " ")} → {item.latest_category.replaceAll("_", " ")}.</p>
        <p>Owner claims: {item.baseline_owner_claim.replaceAll("_", " ")} → {item.latest_owner_claim.replaceAll("_", " ")}; outcomes {item.baseline_outcome} → {item.latest_outcome}.</p>
        <p>Source claim renewed since earlier disposition: {item.source_renewal_since_prior_disposition ? "yes, unverified" : "NO"}; source alias check claims confirmed: {item.latest_source_verified_claim ? "yes, not certified" : "NO"}.</p>
        <p>{item.earlier_disposition_age_days} day(s) since earlier disposition; {item.first_watch_age_days} since original watch. {item.signals.join("; ").replaceAll("_", " ")}.</p>
        {item.historical && <small>Historical import; never an independent sign-off.</small>}
        <button type="button" onClick={() => choose(item)}>Inspect exact private disposition pair</button>
      </article>)}
    </div>
    <fieldset className="owner-review-entry">
      <legend>Manual continuity watch evidence · NOT SENT</legend>
      <p>{selected ? `Watch #${selected.reassignment_watch_index + 1}: ${selected.earlier_disposition_age_days} day(s) since first selected disposition; ${selected.signals.join(", ")}.` :
        "Select two exact same-watch chronological disposition rounds."}</p>
      {!canRecord && selected && <p className="owner-trial-warning">A fresh non-imported later disposition and witnessed actual Windows Hub are required. Imported evidence cannot authorize current acceptance.</p>}
      <label>Fixed HOLD-only continuity category
        <select value={category} disabled={!selected || !active} onChange={event => {
          setCategory(event.target.value as ContinuityCategory); setCompared(false); setAcknowledged(false);
        }}>{CONTINUITY_CATEGORIES.map(item => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select>
      </label>
      <label className="owner-trial-check"><input type="checkbox" checked={compared} disabled={!canRecord}
        onChange={event => { setCompared(event.target.checked); setAcknowledged(false); }} />I personally compared the exact disposition rounds, source renewal claims and current installed Windows Hub.</label>
      <label className="owner-trial-check"><input type="checkbox" checked={acknowledged} disabled={!canRecord}
        onChange={event => setAcknowledged(event.target.checked)} />This is private HOLD-only evidence—not a notification, source certification, independent authorization, reassignment, closure or Vault clearance.</label>
      <button type="button" disabled={!canRecord || !compared || !acknowledged} onClick={record}>Append private continuity watch (HOLD)</button>
    </fieldset>
    {notes.map((item, index) => <p key={index}>Continuity #{index + 1}: dispositions #{item.baseline_disposition_index + 1} → #{item.latest_disposition_index + 1} · {item.category.replaceAll("_", " ")} · {index < importedNotes ? "historical" : "local unverified"} · NOT SENT / HOLD.</p>)}
    {feedback && <p role="status" className="owner-trial-feedback">{feedback}</p>}
    <p className="owner-trial-privacy">Build 166 is browser-local, bounded, append-only and unverified. Manual age bands are not timers. No notification, remote integration command, reassignment, approval, independent field acceptance or first-party password/document Vault clearance. FIELD_ACCEPTANCE_HOLD · INDEPENDENT_REVIEW_HOLD · NOT_AUTHORIZED · Vault 0/6 verified SECURITY HOLD.</p>
  </section>;
}
