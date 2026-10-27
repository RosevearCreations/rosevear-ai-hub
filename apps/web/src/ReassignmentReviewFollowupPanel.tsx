import { useEffect, useState, type ChangeEvent } from "react";
import { CardHelp } from "./CommandShell";
import type { TrialEnvironment, TrialObservation } from "./ownerFieldTrial";
import type { SourceIdentityCheck } from "./ownerFieldRouting";
import type { ReassignmentWatchNote } from "./ownerAuditReassignmentWatch";
import { compareOwnerReviewEvidence, recordOwnerReviewFollowup, OWNER_REVIEW_CATEGORIES,
  type OwnerReviewCategory, type OwnerReviewComparison,
  type OwnerReviewFollowup } from "./ownerReassignmentReviewFollowup";

type Filter = "all" | "overdue" | "owner" | "source" | "historical";
type Comparison = { previous_watches: number; current_watches: number;
  new_watches: number; latest_unverified_case: string | null };

/** Read-only System owner workflow; never issues real reassignment or independent signoff. */
export function ReassignmentReviewFollowupPanel({ watches, history, checks, followups,
  environment, importedTrials, importedFollowups, onFollowupsChange,
  compareEarlierReceipt, active = true }: {
  watches: readonly ReassignmentWatchNote[];
  history: readonly TrialObservation[];
  checks: readonly SourceIdentityCheck[];
  followups: OwnerReviewFollowup[];
  environment: TrialEnvironment;
  importedTrials: number;
  importedFollowups: number;
  onFollowupsChange: (notes: OwnerReviewFollowup[]) => void;
  compareEarlierReceipt: (raw: string) => Comparison;
  active?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [watchIndex, setWatchIndex] = useState(0);
  const [observationIndex, setObservationIndex] = useState(0);
  const [sourceIndex, setSourceIndex] = useState<number | null>(null);
  const [category, setCategory] = useState<OwnerReviewCategory>("CONTINUE_REASSIGNMENT_HOLD");
  const [witnessed, setWitnessed] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [receiptComparison, setReceiptComparison] = useState<Comparison | null>(null);
  const [feedback, setFeedback] = useState("");
  useEffect(() => { if (!active) { setWitnessed(false); setAcknowledged(false); } }, [active]);

  const pairs: (OwnerReviewComparison & { historical: boolean })[] = [];
  watches.forEach((watch, wi) => history.forEach((trial, oi) => {
    if (trial.case_id !== watch.case_id || Date.parse(trial.observed_at) <= Date.parse(watch.recorded_at)) return;
    const source = checks.findIndex(check => check.trial_index === oi && check.case_id === trial.case_id);
    try {
      pairs.push({ ...compareOwnerReviewEvidence(watches, history, checks, wi, oi,
        source < 0 ? null : source), historical: oi < importedTrials });
    } catch { /* Do not treat mismatched or unwitnessed historical claims as new authority. */ }
  }));
  const visible = pairs.filter(item => filter === "all" ||
    filter === "overdue" && item.signals.includes("OWNER_REVIEW_OVERDUE") ||
    filter === "owner" && item.signals.some(signal => signal.startsWith("OWNER_")) ||
    filter === "source" && item.signals.some(signal => signal.startsWith("SOURCE_")) ||
    filter === "historical" && item.historical);
  let selected: OwnerReviewComparison | null = null;
  try { selected = compareOwnerReviewEvidence(watches, history, checks,
    watchIndex, observationIndex, sourceIndex); }
  catch { /* Require explicit exact case/time pairing. */ }
  const categoryMatches = !!selected && (category === "CONTINUE_REASSIGNMENT_HOLD" ||
    category === "REQUEST_OVERDUE_REVIEW_WITNESS" &&
      selected.signals.includes("OWNER_REVIEW_OVERDUE") ||
    category === "REQUEST_SOURCE_IDENTITY_RECHECK" &&
      selected.signals.some(signal => signal.startsWith("SOURCE_")) ||
    category === "REQUEST_OWNER_REVIEW_REEVIDENCE" && selected.signals.some(signal =>
      signal.startsWith("OWNER_REVIEW_") || signal === "OWNER_NEXT_ACTION_CLAIM_CHANGED"));
  const canRecord = active && categoryMatches && observationIndex >= importedTrials &&
    environment.installed_windows_witnessed && environment.access !== "unknown" &&
    !!environment.installed_version;

  function choose(item: OwnerReviewComparison) {
    setWatchIndex(item.reassignment_watch_index); setObservationIndex(item.observation_index);
    setSourceIndex(item.source_check_index); setCategory("CONTINUE_REASSIGNMENT_HOLD");
    setWitnessed(false); setAcknowledged(false); setFeedback("");
  }
  function record() {
    try {
      onFollowupsChange(recordOwnerReviewFollowup(watches, history, checks,
        followups, environment, { trials: importedTrials, followups: importedFollowups },
        { reassignment_watch_index: watchIndex, observation_index: observationIndex,
          source_check_index: sourceIndex, category, personally_witnessed: witnessed,
          hold_acknowledged: acknowledged }));
      setWitnessed(false); setAcknowledged(false);
      setFeedback("Private owner review follow-up appended in this browser. No reassignment, request, approval or notification was sent.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not record private HOLD follow-up."); }
  }
  async function compareEarlier(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setReceiptComparison(null);
    try {
      if (file.size > 2_900_000) throw new Error("Earlier Build 162 receipt exceeds 2.9 MB.");
      setReceiptComparison(compareEarlierReceipt(await file.text()));
      setFeedback("Two complete private reassignment receipts were compared structurally. Nothing was imported or authenticated.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Build 162 private receipt comparison failed."); }
  }

  return <section className="owner-handoff-reconciliation" aria-label="Build 163 private reassignment watch follow-up and overdue owner review audit">
    <header className="owner-trial-ledger-heading">
      <div><h3>Reassignment watch follow-up & overdue owner review evidence</h3>
        <p>Match an earlier private watch to a later same-case owner trial. Inspect aging, conflicting claims and unverified source witnesses without changing a real owner.</p></div>
      <strong className="owner-trial-hold">INDEPENDENT REVIEW: HOLD</strong>
    </header>
    <CardHelp title="Follow-up is not an owner reassignment">
      Compare exact historical Build 162 watches and later operator-witnessed owner observations. An overdue band does not schedule a notice. A reported improvement or matched alias is not independent certification. Confirm our installed Windows Hub and preserve every HOLD.
    </CardHelp>
    <div className="owner-trial-reconcile-stats" aria-label="Build 163 follow-up totals">
      <span>{watches.length} private reassignment watch(s)</span>
      <span>{pairs.length} later same-case owner review(s)</span>
      <span>{pairs.filter(item => item.signals.includes("OWNER_REVIEW_OVERDUE")).length} overdue comparison(s)</span>
      <span>{followups.length} private follow-up(s) · {importedFollowups} historical</span>
      <span>0 sent, assigned, scheduled, independently approved or closed</span>
    </div>
    <label>Compare earlier Build 162 private reassignment watch receipt with our current chain (read-only)
      <input type="file" accept=".json,application/json" disabled={!active}
        onChange={event => void compareEarlier(event)} />
    </label>
    {receiptComparison && <p role="note">Strict immutable prefix: {receiptComparison.previous_watches} earlier watch(es), {receiptComparison.new_watches} new watch(es) in {receiptComparison.current_watches} total. Latest case {receiptComparison.latest_unverified_case ?? "none"}; evidence remains private and unverified.</p>}
    <label className="owner-decision-filter">Manual owner review evidence filter
      <select value={filter} onChange={event => setFilter(event.target.value as Filter)}>
        <option value="all">All exact later owner review pairs</option>
        <option value="overdue">Overdue owner review after 7 days</option>
        <option value="owner">Changed owner or review outcome</option>
        <option value="source">Missing or contradictory source witness</option>
        <option value="historical">Imported historical owner trials</option>
      </select>
    </label>
    {pairs.length === 0 && <p>A complete Build 162 watch and a strictly later operator-witnessed trial for that exact case are required. Previous HOLDs remain open.</p>}
    {pairs.length > 0 && visible.length === 0 && <p>No owner review evidence matches this filter.</p>}
    <div className="owner-decision-cards">
      {visible.map(item => <article key={`${item.reassignment_watch_index}:${item.observation_index}`} className={
        watchIndex === item.reassignment_watch_index && observationIndex === item.observation_index ?
          "owner-reassessment-selected" : ""}>
        <strong>{item.case_id} · reassignment watch #{item.reassignment_watch_index + 1} → owner trial #{item.observation_index + 1}</strong>
        <small>Watch {item.watch_recorded_at} · later trial {item.followup_observed_at}</small>
        <p>Owner claims: {item.prior_owner_claim.replaceAll("_", " ")} → {item.current_owner_claim.replaceAll("_", " ")} (not an actual assignment).</p>
        <p>{item.watch_age_days} elapsed full day(s) · {item.age_band.replaceAll("_", " ")} · {item.owner_outcome} / {item.owner_finding}.</p>
        <p>Signals: {item.signals.join("; ").replaceAll("_", " ")}.</p>
        {item.historical && <small>Imported owner review · not a fresh independent review.</small>}
        <button type="button" onClick={() => choose(item)}>Inspect exact watch and owner review pair</button>
      </article>)}
    </div>
    <fieldset className="owner-review-entry">
      <legend>Manual owner review follow-up · NOT SENT</legend>
      <p>{selected ? `Watch #${selected.reassignment_watch_index + 1}: ${selected.watch_age_days} days outstanding; ${selected.signals.join(", ")}.` :
        "Select a chronological Build 162 watch and later witnessed owner trial."}</p>
      {!canRecord && selected && <p className="owner-trial-warning">A fresh non-imported owner trial and re-witnessed installed Windows Hub are mandatory. Historical imported claims cannot close a review.</p>}
      <label>Fixed HOLD-only follow-up category
        <select value={category} disabled={!selected || !active} onChange={event => {
          setCategory(event.target.value as OwnerReviewCategory);
          setWitnessed(false); setAcknowledged(false);
        }}>{OWNER_REVIEW_CATEGORIES.map(item => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select>
      </label>
      <label className="owner-trial-check"><input type="checkbox" checked={witnessed} disabled={!canRecord}
        onChange={event => { setWitnessed(event.target.checked); setAcknowledged(false); }} />I personally rechecked the exact earlier watch, later owner review, optional source evidence and our installed Windows Hub.</label>
      <label className="owner-trial-check"><input type="checkbox" checked={acknowledged} disabled={!canRecord}
        onChange={event => setAcknowledged(event.target.checked)} />I acknowledge the review remains private HOLD evidence only, not reassignment, sending, certification, closure or Vault clearance.</label>
      <button type="button" disabled={!canRecord || !witnessed || !acknowledged} onClick={record}>Append private owner review follow-up evidence (HOLD)</button>
    </fieldset>
    {followups.map((note, index) => <p key={index}>Review #{index + 1}: watch #{note.reassignment_watch_index + 1} → owner trial #{note.observation_index + 1} · {note.category.replaceAll("_", " ")} · {index < importedFollowups ? "historical import" : "local unverified"} · NOT SENT / HOLD.</p>)}
    {feedback && <p role="status" className="owner-trial-feedback">{feedback}</p>}
    <p className="owner-trial-privacy">Build 163 stays browser-local, strictly historical on import, bounded and append-only. No timer, dispatch, reassignment, independent acceptance, automatic closeout or first-party Vault release. FIELD_ACCEPTANCE_HOLD · INDEPENDENT_REVIEW_HOLD · NOT_AUTHORIZED · Vault 0/6 verified SECURITY HOLD.</p>
  </section>;
}
