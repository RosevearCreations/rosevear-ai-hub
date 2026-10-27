import { useEffect, useState, type ChangeEvent } from "react";
import { CardHelp } from "./CommandShell";
import type { TrialEnvironment } from "./ownerFieldTrial";
import type { OutcomeRecheckNote } from "./ownerOutcomeRecurrence";
import { compareRecheckRounds, recordExceptionWatch, WATCH_CATEGORIES,
  type ExceptionWatchCategory, type ExceptionWatchNote,
  type RecheckRoundComparison } from "./ownerRecheckDecisionWatch";

type WatchFilter = "all" | "changed" | "source" | "aged" | "historical";
type PrefixResult = { previous_rechecks: number; current_rechecks: number; new_rechecks: number;
  comparison: RecheckRoundComparison | null };

/** Authenticated owner System child; comparison and witnesses are browser-local only. */
export function RecheckDecisionWatchPanel({ rechecks, watches, environment,
  importedRechecks, importedWatches, onWatchesChange, compareEarlierReceipt, active = true }: {
  rechecks: readonly OutcomeRecheckNote[];
  watches: ExceptionWatchNote[];
  environment: TrialEnvironment;
  importedRechecks: number;
  importedWatches: number;
  onWatchesChange: (notes: ExceptionWatchNote[]) => void;
  compareEarlierReceipt: (raw: string) => PrefixResult;
  active?: boolean;
}) {
  const [filter, setFilter] = useState<WatchFilter>("all");
  const [baseline, setBaseline] = useState(0);
  const [latest, setLatest] = useState(1);
  const [category, setCategory] = useState<ExceptionWatchCategory>("CONTINUE_INDEPENDENT_REVIEW_HOLD");
  const [compared, setCompared] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [previousProof, setPreviousProof] = useState<PrefixResult | null>(null);
  const [feedback, setFeedback] = useState("");
  useEffect(() => { if (!active) { setCompared(false); setAcknowledged(false); } }, [active]);

  const comparisons: (RecheckRoundComparison & { historical: boolean })[] = [];
  rechecks.forEach((next, index) => {
    const first = rechecks.findIndex((item, earlier) => earlier < index &&
      item.review_index === next.review_index &&
      item.latest_outcome_index < next.latest_outcome_index &&
      Date.parse(item.recorded_at) < Date.parse(next.recorded_at));
    if (first < 0) return;
    try { comparisons.push({ ...compareRecheckRounds(rechecks, first, index), historical: index < importedRechecks }); }
    catch { /* Never infer fresh authority or a valid pair from incompatible historical notes. */ }
  });
  const visible = comparisons.filter(item => filter === "all" ||
    filter === "changed" && item.signals.includes("RECURRENCE_EVIDENCE_CHANGED") ||
    filter === "source" && item.signals.includes("SOURCE_EXCEPTION_PERSISTS") ||
    filter === "aged" && item.first_recheck_age_days >= 3 ||
    filter === "historical" && item.historical);
  let selected: RecheckRoundComparison | null = null;
  try { selected = compareRecheckRounds(rechecks, baseline, latest); }
  catch { /* Explicit chronological same-follow-up selection only. */ }
  const allowedCategory = !!selected && (category === "CONTINUE_INDEPENDENT_REVIEW_HOLD" ||
    category === "REQUEST_NEW_OWNER_WITNESS" && selected.signals.includes("RECURRENCE_EVIDENCE_CHANGED") ||
    category === "REQUEST_SOURCE_IDENTITY_WITNESS" && selected.signals.includes("SOURCE_EXCEPTION_PERSISTS"));
  const canRecord = active && allowedCategory && latest >= importedRechecks &&
    environment.installed_windows_witnessed && !!environment.installed_version && environment.access !== "unknown";

  function choose(first: number, second: number) {
    setBaseline(first); setLatest(second); setCategory("CONTINUE_INDEPENDENT_REVIEW_HOLD");
    setCompared(false); setAcknowledged(false); setFeedback("");
  }
  function record() {
    try {
      onWatchesChange(recordExceptionWatch(rechecks, watches, environment,
        { rechecks: importedRechecks, watches: importedWatches },
        { baseline_recheck_index: baseline, latest_recheck_index: latest, category,
          personally_compared: compared, hold_acknowledged: acknowledged }));
      setCompared(false); setAcknowledged(false);
      setFeedback("Private historical exception watch appended locally. No dispatch, schedule, reviewer approval or closure occurred.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not record private HOLD watch."); }
  }
  async function comparePrior(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setPreviousProof(null);
    try {
      if (file.size > 1_850_000) throw new Error("Earlier Build 159 receipt exceeds its private 1.85 MB limit.");
      const result = compareEarlierReceipt(await file.text());
      setPreviousProof(result);
      setFeedback("Exact historical receipt prefix compared locally. No imported claim authenticates an owner, reviewer or installed source.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Earlier private receipt did not match this history."); }
  }
  return <section className="owner-handoff-reconciliation" aria-label="Build 160 independent recheck receipt comparison and exception decision watch">
    <header className="owner-trial-ledger-heading">
      <div><h3>Independent recheck receipts & exception decision watch</h3>
        <p>Compare successive private rechecks of the same original follow-up and preserve every older owner/source exception. All watch decisions remain HOLD-only evidence.</p></div>
      <strong className="owner-trial-hold">INDEPENDENT REVIEW: HOLD</strong>
    </header>
    <CardHelp title="Private receipts are not independently authenticated">
      Comparing an older Build 159 export checks exact append-only structure, not who witnessed it or whether physical hardware is safe. A newer outcome or a longer elapsed age never clears the original finding, independent review or the first-party Vault.
    </CardHelp>
    <div className="owner-trial-reconcile-stats" aria-label="Build 160 exception watch totals">
      <span>{comparisons.length} comparable recheck round(s)</span>
      <span>{comparisons.filter(item => item.signals.includes("RECURRENCE_EVIDENCE_CHANGED")).length} changed recurrence evidence</span>
      <span>{comparisons.filter(item => item.signals.includes("SOURCE_EXCEPTION_PERSISTS")).length} source exception(s)</span>
      <span>{watches.length} private watch(s) · {importedWatches} historical</span>
      <span>0 sent, scheduled, approved or closed</span>
    </div>
    <label>Compare older Build 159 private receipt against our current chain (read-only; no import)
      <input type="file" accept=".json,application/json" disabled={!active}
        onChange={event => void comparePrior(event)} />
    </label>
    {previousProof && <p role="note">Structural prefix only: {previousProof.previous_rechecks} earlier recheck(s), {previousProof.new_rechecks} new recheck(s). {previousProof.comparison ?
      `Same follow-up #${previousProof.comparison.review_index + 1}; ${previousProof.comparison.signals.join(", ")}.` :
      "No matching same-follow-up recheck pair crossed these exports."} All evidence remains unverified and on HOLD.</p>}
    <label className="owner-decision-filter">Manual exception watch filter
      <select value={filter} onChange={event => setFilter(event.target.value as WatchFilter)}>
        <option value="all">All successive same-follow-up rechecks</option>
        <option value="changed">Changed recurrence evidence</option>
        <option value="source">Unresolved source exceptions</option>
        <option value="aged">At least 3 days since first recheck</option>
        <option value="historical">Imported comparison history</option>
      </select>
    </label>
    {comparisons.length === 0 && <p>Two chronological Build 159 rechecks on the same follow-up with newer outcome evidence are required. Independent watch remains on HOLD.</p>}
    {comparisons.length > 0 && visible.length === 0 && <p>No recheck comparisons match this manual filter.</p>}
    <div className="owner-decision-cards">
      {visible.map(item => <article key={item.latest_recheck_index} className={
        baseline === item.baseline_recheck_index && latest === item.latest_recheck_index ?
          "owner-reassessment-selected" : ""}>
        <strong>{item.case_id} · follow-up #{item.review_index + 1} · rechecks #{item.baseline_recheck_index + 1} → #{item.latest_recheck_index + 1}</strong>
        <small>First {item.baseline_at} · later {item.latest_at}</small>
        <p>{item.first_recheck_age_days} full day(s) since first recheck · signals: {item.signals.join("; ").replaceAll("_", " ")}.</p>
        {item.historical && <small>Imported historical HOLD evidence · not a fresh witness.</small>}
        <button type="button" onClick={() => choose(item.baseline_recheck_index, item.latest_recheck_index)}>Inspect exact recheck pair</button>
      </article>)}
    </div>
    <fieldset className="owner-review-entry">
      <legend>Private independent exception decision watch · NOT SENT</legend>
      <p>{selected ? `Follow-up #${selected.review_index + 1}: ${selected.first_recheck_age_days} days since first recheck; ${selected.signals.join(", ")}.` :
        "Select two chronological rechecks of the same exact follow-up."}</p>
      {!canRecord && selected && <p className="owner-trial-warning">A fresh witnessed Windows context, matching reason and non-imported latest recheck are mandatory.</p>}
      <label>Fixed HOLD-only watch category
        <select value={category} disabled={!selected || !active} onChange={event => { setCategory(event.target.value as ExceptionWatchCategory); setCompared(false); setAcknowledged(false); }}>
          {WATCH_CATEGORIES.map(item => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
        </select>
      </label>
      <label className="owner-trial-check"><input type="checkbox" checked={compared} disabled={!canRecord}
        onChange={event => { setCompared(event.target.checked); setAcknowledged(false); }} />I personally compared both exact recheck rounds, historical exceptions and the actual installed Windows Hub.</label>
      <label className="owner-trial-check"><input type="checkbox" checked={acknowledged} disabled={!canRecord}
        onChange={event => setAcknowledged(event.target.checked)} />I acknowledge this is a private HOLD watch only, not an independent approval, automated action, case closure or Vault clearance.</label>
      <button type="button" disabled={!canRecord || !compared || !acknowledged} onClick={record}>Append private exception decision watch (HOLD)</button>
    </fieldset>
    {watches.map((item, index) => <p key={index}>Watch #{index + 1}: rechecks #{item.baseline_recheck_index + 1} → #{item.latest_recheck_index + 1} · {item.category.replaceAll("_", " ")} · {index < importedWatches ? "historical import" : "local unverified"} · NOT SENT / HOLD.</p>)}
    {feedback && <p role="status" className="owner-trial-feedback">{feedback}</p>}
    <p className="owner-trial-privacy">Build 160 remains private, bounded and append-only. No network transmission, recurring timer, job, dispatch, device action, independent approval or closure. FIELD_ACCEPTANCE_HOLD · INDEPENDENT_REVIEW_HOLD · NOT_AUTHORIZED. Password/document Vault: 0/6 verified · SECURITY HOLD.</p>
  </section>;
}
