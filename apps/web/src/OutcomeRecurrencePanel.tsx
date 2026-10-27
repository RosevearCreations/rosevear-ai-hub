import { useEffect, useState } from "react";
import { CardHelp } from "./CommandShell";
import type { TrialEnvironment } from "./ownerFieldTrial";
import type { SourceIdentityCheck } from "./ownerFieldRouting";
import type { HandoffFollowupEvent } from "./ownerHandoffReconciliation";
import type { FollowupOutcomeEvent } from "./ownerFollowupOutcome";
import { compareOutcomeRounds, recordOutcomeRecheck, RECHECK_REASONS,
  type OutcomeRecheckNote, type OutcomeRecurrenceComparison,
  type RecheckReason } from "./ownerOutcomeRecurrence";

type Filter = "all" | "changed" | "recurrence" | "source" | "historical";

/** Browser-only independent recheck watch; no timer, dispatch or approval action. */
export function OutcomeRecurrencePanel({ outcomes, followups, checks, rechecks, environment,
  importedOutcomes, importedRechecks, onRechecksChange, active = true }: {
  outcomes: readonly FollowupOutcomeEvent[];
  followups: readonly HandoffFollowupEvent[];
  checks: readonly SourceIdentityCheck[];
  rechecks: OutcomeRecheckNote[];
  environment: TrialEnvironment;
  importedOutcomes: number;
  importedRechecks: number;
  onRechecksChange: (notes: OutcomeRecheckNote[]) => void;
  active?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [baseline, setBaseline] = useState(0);
  const [latest, setLatest] = useState(1);
  const [reason, setReason] = useState<RecheckReason>("REQUEST_INDEPENDENT_OUTCOME_RECHECK");
  const [compared, setCompared] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [feedback, setFeedback] = useState("");
  useEffect(() => { if (!active) { setCompared(false); setAcknowledged(false); } }, [active]);

  const comparisons: (OutcomeRecurrenceComparison & { historical: boolean })[] = [];
  outcomes.forEach((next, index) => {
    const first = outcomes.findIndex((item, earlier) => earlier < index &&
      item.review_index === next.review_index &&
      Date.parse(item.observation_at) < Date.parse(next.observation_at));
    if (first < 0) return;
    try {
      comparisons.push({ ...compareOutcomeRounds(outcomes, followups, checks, first, index),
        historical: index < importedOutcomes });
    } catch { /* Never infer authority from invalid or chronologically overlapping snapshots. */ }
  });
  const visible = comparisons.filter(item => filter === "all" ||
    filter === "changed" && item.signals.includes("OWNER_OUTCOME_CHANGED") ||
    filter === "recurrence" && item.signals.includes("ISSUE_RECURRED_AFTER_IMPROVEMENT") ||
    filter === "source" && item.signals.some(signal => signal.includes("SOURCE")) ||
    filter === "historical" && item.historical);
  let selected: OutcomeRecurrenceComparison | null = null;
  try { selected = compareOutcomeRounds(outcomes, followups, checks, baseline, latest); }
  catch { /* Explicit same-follow-up chronological pair required. */ }
  const eligibleReason = !!selected && (reason === "REQUEST_INDEPENDENT_OUTCOME_RECHECK" ||
    reason === "REQUEST_RECURRENCE_WITNESS" && selected.signals.includes("ISSUE_RECURRED_AFTER_IMPROVEMENT") ||
    reason === "REQUEST_SOURCE_IDENTITY_RECHECK" && selected.signals.some(signal => signal.includes("SOURCE")));
  const canRecord = active && eligibleReason && latest >= importedOutcomes &&
    environment.installed_windows_witnessed && !!environment.installed_version &&
    environment.access !== "unknown";

  function selectPair(first: number, second: number) {
    setBaseline(first); setLatest(second); setReason("REQUEST_INDEPENDENT_OUTCOME_RECHECK");
    setCompared(false); setAcknowledged(false); setFeedback("");
  }
  function prepare() {
    try {
      const updated = recordOutcomeRecheck(outcomes, followups, checks, rechecks, environment,
        { outcomes: importedOutcomes, rechecks: importedRechecks },
        { baseline_outcome_index: baseline, latest_outcome_index: latest, reason,
          personally_compared: compared, hold_acknowledged: acknowledged });
      onRechecksChange(updated);
      setCompared(false); setAcknowledged(false);
      setFeedback("Private Build 159 exception recheck appended without dispatch, clearance or closure.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not record private exception recheck."); }
  }
  return <section className="owner-handoff-reconciliation" aria-label="Build 159 independent outcome recurrence and historical exception oversight">
    <header className="owner-trial-ledger-heading">
      <div><h3>Outcome recurrence comparison & historical exception oversight</h3>
        <p>Compare separate witnessed outcome rounds for the same exact Build 157 follow-up. Preserve contradictory owner and source identity claims across the full private chain.</p></div>
      <strong className="owner-trial-hold">INDEPENDENT REVIEW: HOLD</strong>
    </header>
    <CardHelp title="A changed owner result never closes a historical exception">
      A previously reported improvement followed by an issue is flagged for independent witnessing. Missing or changed pseudonymous source evidence is not proof of device identity. Every manual recheck remains private, NOT SENT and unverified, and imports never provide fresh acceptance authority.
    </CardHelp>
    <div className="owner-trial-reconcile-stats" aria-label="Build 159 recurrence totals">
      <span>{comparisons.length} comparable outcome round(s)</span>
      <span>{comparisons.filter(item => item.signals.includes("ISSUE_RECURRED_AFTER_IMPROVEMENT")).length} renewed issue(s)</span>
      <span>{comparisons.filter(item => item.signals.some(signal => signal.includes("SOURCE"))).length} source identity exception(s)</span>
      <span>{rechecks.length} private recheck(s) · {importedRechecks} historical</span>
      <span>0 sent, approved, scheduled or closed</span>
    </div>
    <label className="owner-decision-filter">Historical exception filter
      <select value={filter} onChange={event => setFilter(event.target.value as Filter)}>
        <option value="all">All same-follow-up outcome rounds</option>
        <option value="changed">Owner outcome changed</option>
        <option value="recurrence">Issue after reported improvement</option>
        <option value="source">Source identity evidence changed or missing</option>
        <option value="historical">Imported historical rounds</option>
      </select>
    </label>
    {comparisons.length === 0 && <p>Two chronological Build 158 outcomes of the same follow-up are required. Independent recheck remains on HOLD.</p>}
    {comparisons.length > 0 && visible.length === 0 && <p>No outcome comparisons match this manual filter.</p>}
    <div className="owner-decision-cards">
      {visible.map(item => <article key={item.latest_outcome_index} className={
        baseline === item.baseline_outcome_index && latest === item.latest_outcome_index ?
          "owner-reassessment-selected" : ""}>
        <strong>{item.case_id} · follow-up #{item.review_index + 1} · outcomes #{item.baseline_outcome_index + 1} → #{item.latest_outcome_index + 1}</strong>
        <small>First {item.baseline_at} · later {item.latest_at}</small>
        <p>{item.age_days} full day(s) since first outcome. Signals: {item.signals.join("; ").replaceAll("_", " ")}.</p>
        {item.historical && <small>Imported historical only · no fresh reviewer authority.</small>}
        <button type="button" onClick={() => selectPair(item.baseline_outcome_index, item.latest_outcome_index)}>Inspect exact outcome pair</button>
      </article>)}
    </div>
    <fieldset className="owner-review-entry">
      <legend>Manual historical exception recheck · NOT SENT</legend>
      <p>{selected ? `Follow-up #${selected.review_index + 1}, ${selected.age_days} full days: ${selected.signals.join(", ")}.` :
        "Choose two chronological outcome rounds of one original private follow-up."}</p>
      {!canRecord && selected && <p className="owner-trial-warning">Fresh Windows witnessing, an eligible reason and a non-imported latest outcome are mandatory.</p>}
      <label>Fixed private recheck reason
        <select value={reason} disabled={!selected || !active} onChange={event => { setReason(event.target.value as RecheckReason); setCompared(false); setAcknowledged(false); }}>
          {RECHECK_REASONS.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
        </select>
      </label>
      <label className="owner-trial-check"><input type="checkbox" checked={compared} disabled={!canRecord}
        onChange={event => { setCompared(event.target.checked); setAcknowledged(false); }} />I personally compared both outcome rounds and their unresolved historical source/owner evidence against our installed Windows Hub.</label>
      <label className="owner-trial-check"><input type="checkbox" checked={acknowledged} disabled={!canRecord}
        onChange={event => setAcknowledged(event.target.checked)} />I acknowledge this is a private NOT SENT HOLD note; no independent approval, automatic action, case closure or Vault clearance is authorized.</label>
      <button type="button" disabled={!canRecord || !compared || !acknowledged} onClick={prepare}>Append private historical exception recheck (HOLD)</button>
    </fieldset>
    {rechecks.map((item, index) => <p key={index}>Recheck #{index + 1}: outcomes #{item.baseline_outcome_index + 1} → #{item.latest_outcome_index + 1} · {item.recheck_reason.replaceAll("_", " ")} · {index < importedRechecks ? "historical import" : "local unverified"} · NOT SENT / HOLD.</p>)}
    {feedback && <p role="status" className="owner-trial-feedback">{feedback}</p>}
    <p className="owner-trial-privacy">Build 159 is browser-local and append-only. No network transmission, timer, job, instruction to hardware, approval or case closure. FIELD_ACCEPTANCE_HOLD · INDEPENDENT_REVIEW_HOLD · NOT_AUTHORIZED. Password/document Vault: 0/6 verified · SECURITY HOLD.</p>
  </section>;
}
