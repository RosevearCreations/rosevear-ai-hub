import { useEffect, useState, type ChangeEvent } from "react";
import { CardHelp } from "./CommandShell";
import type { TrialEnvironment, TrialObservation } from "./ownerFieldTrial";
import type { SourceIdentityCheck } from "./ownerFieldRouting";
import type { ExceptionWatchNote } from "./ownerRecheckDecisionWatch";
import { compareHistoricalWatchFollowup, recordHistoricalWatchAudit,
  WATCH_AUDIT_CATEGORIES, type HistoricalWatchAuditNote,
  type HistoricalWatchComparison, type WatchAuditCategory } from "./ownerHistoricalWatchAudit";

type SnapshotResult = { previous_observations: number; current_observations: number;
  new_observations: number; previous_watches: number; comparison: HistoricalWatchComparison | null };
type AuditFilter = "all" | "overdue" | "source" | "improvement" | "historical";

/** Owner/admin System tab only. No timers, provider writes or automatic reviewer decisions. */
export function HistoricalWatchAuditPanel({ watches, history, checks, audits, environment,
  importedTrials, importedChecks, importedWatches, importedAudits, onAuditsChange,
  compareEarlierReceipt, active = true }: {
  watches: readonly ExceptionWatchNote[];
  history: readonly TrialObservation[];
  checks: readonly SourceIdentityCheck[];
  audits: HistoricalWatchAuditNote[];
  environment: TrialEnvironment;
  importedTrials: number;
  importedChecks: number;
  importedWatches: number;
  importedAudits: number;
  onAuditsChange: (notes: HistoricalWatchAuditNote[]) => void;
  compareEarlierReceipt: (raw: string) => SnapshotResult;
  active?: boolean;
}) {
  const [filter, setFilter] = useState<AuditFilter>("all");
  const [watchIndex, setWatchIndex] = useState(0);
  const [observationIndex, setObservationIndex] = useState(0);
  const [sourceCheckIndex, setSourceCheckIndex] = useState<number | null>(null);
  const [category, setCategory] = useState<WatchAuditCategory>("CONTINUE_HISTORICAL_REVIEW_HOLD");
  const [personallyWitnessed, setPersonallyWitnessed] = useState(false);
  const [holdAcknowledged, setHoldAcknowledged] = useState(false);
  const [snapshot, setSnapshot] = useState<SnapshotResult | null>(null);
  const [feedback, setFeedback] = useState("");
  useEffect(() => { if (!active) { setPersonallyWitnessed(false); setHoldAcknowledged(false); } }, [active]);

  const available: HistoricalWatchComparison[] = [];
  watches.forEach((watch, wi) => {
    history.forEach((observation, oi) => {
      if (observation.case_id !== watch.case_id ||
        Date.parse(observation.observed_at) <= Date.parse(watch.recorded_at)) return;
      const sourceIndices = checks.map((item, index) => item.trial_index === oi &&
        item.case_id === watch.case_id ? index : -1).filter(index => index >= 0);
      const source = sourceIndices.at(-1) ?? null;
      try { available.push(compareHistoricalWatchFollowup(watches, history, checks, wi, oi, source)); }
      catch { /* A historical claim cannot create a valid witnessed recheck. */ }
    });
  });
  const visible = available.filter(item => filter === "all" ||
    filter === "overdue" && item.watch_age_days > 7 ||
    filter === "source" && item.signals.some(signal => signal.includes("SOURCE")) ||
    filter === "improvement" && item.signals.includes("OWNER_IMPROVEMENT_UNVERIFIED") ||
    filter === "historical" && item.watch_index < importedWatches);
  let selected: HistoricalWatchComparison | null = null;
  try { selected = compareHistoricalWatchFollowup(watches, history, checks,
    watchIndex, observationIndex, sourceCheckIndex); }
  catch { /* Select exact watch, newer trial and optional matching source evidence. */ }
  const relevantCategory = !!selected && (category === "CONTINUE_HISTORICAL_REVIEW_HOLD" ||
    category === "REQUEST_OWNER_OUTCOME_RECHECK" && selected.signals.some(signal =>
      signal === "OWNER_OUTCOME_CHANGED" || signal === "OWNER_ISSUE_STILL_OPEN") ||
    category === "REQUEST_SOURCE_IDENTITY_RECHECK" && selected.signals.some(signal =>
      signal === "FRESH_SOURCE_WITNESS_MISSING" || signal === "SOURCE_IDENTITY_CONTRADICTION" ||
      signal === "SOURCE_IDENTITY_UNVERIFIED"));
  const canRecord = active && relevantCategory && observationIndex >= importedTrials &&
    (sourceCheckIndex === null || sourceCheckIndex >= importedChecks) &&
    environment.installed_windows_witnessed && environment.access !== "unknown" &&
    !!environment.installed_version;

  function choose(item: HistoricalWatchComparison) {
    setWatchIndex(item.watch_index); setObservationIndex(item.observation_index);
    setSourceCheckIndex(item.source_check_index); setCategory("CONTINUE_HISTORICAL_REVIEW_HOLD");
    setPersonallyWitnessed(false); setHoldAcknowledged(false); setFeedback("");
  }
  function record() {
    try {
      onAuditsChange(recordHistoricalWatchAudit(watches, history, checks, audits, environment,
        { trials: importedTrials, checks: importedChecks, audits: importedAudits },
        { watch_index: watchIndex, observation_index: observationIndex,
          source_check_index: sourceCheckIndex, category,
          personally_witnessed: personallyWitnessed, hold_acknowledged: holdAcknowledged }));
      setPersonallyWitnessed(false); setHoldAcknowledged(false);
      setFeedback("Private exception aging audit appended in this browser. Historical watch and independent HOLD remain; nothing was sent or approved.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not record private audit."); }
  }
  async function comparePrior(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setSnapshot(null);
    try {
      if (file.size > 2_100_000) throw new Error("Earlier Build 160 receipt exceeds 2.1 MB.");
      setSnapshot(compareEarlierReceipt(await file.text()));
      setFeedback("Exact earlier watch snapshot compared locally without importing or authenticating its witnesses.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Private historical comparison failed."); }
  }
  return <section className="owner-handoff-reconciliation" aria-label="Build 161 historical watch outcome follow-up and exception aging audit">
    <header className="owner-trial-ledger-heading">
      <div><h3>Historical watch outcome follow-up & exception aging audit</h3>
        <p>Link an older private watch to a later witnessed owner trial. An improved result, a matching pseudonym or an overdue alert cannot close an original finding.</p></div>
      <strong className="owner-trial-hold">INDEPENDENT REVIEW: HOLD</strong>
    </header>
    <CardHelp title="Every historical watch remains unresolved">
      Newer owner trial observations and source aliases are unverified operator claims until separately reviewed on the installed Windows Hub. Imported claims are historical only. No timer, dispatch, acceptance, first-party Vault clearance or automatic closure exists.
    </CardHelp>
    <div className="owner-trial-reconcile-stats" aria-label="Build 161 historical audit totals">
      <span>{available.length} later watch-to-trial comparison(s)</span>
      <span>{available.filter(item => item.watch_age_days > 7).length} aged beyond 7 days</span>
      <span>{available.filter(item => item.signals.includes("SOURCE_IDENTITY_CONTRADICTION")).length} source contradictions</span>
      <span>{audits.length} private audit(s) · {importedAudits} historical</span>
      <span>0 sent, automatically rechecked, approved or closed</span>
    </div>
    <label>Compare older Build 160 watch snapshot against current private evidence (read-only)
      <input type="file" accept=".json,application/json" disabled={!active}
        onChange={event => void comparePrior(event)} />
    </label>
    {snapshot && <p role="note">Strict historical prefix: {snapshot.previous_watches} older watch(s), {snapshot.new_observations} new trial(s). {snapshot.comparison ?
      `Case ${snapshot.comparison.case_id}: ${snapshot.comparison.signals.join(", ")}.` :
      "No later trial of an older watched case was found."} Neither receipt proves physical installation or reviewer identity.</p>}
    <label className="owner-decision-filter">Manual aging and exception filter
      <select value={filter} onChange={event => setFilter(event.target.value as AuditFilter)}>
        <option value="all">All watch-to-owner follow-ups</option>
        <option value="overdue">Watch older than seven days</option>
        <option value="source">Missing or contradictory source witness</option>
        <option value="improvement">Reported improvement (still HOLD)</option>
        <option value="historical">Imported watch context</option>
      </select>
    </label>
    {available.length === 0 && <p>No newer same-case owner trial exists after a Build 160 watch. Original exceptions remain open for independent review.</p>}
    {available.length > 0 && visible.length === 0 && <p>No historical watch follow-ups match this manual filter.</p>}
    <div className="owner-decision-cards">
      {visible.map(item => <article key={`${item.watch_index}:${item.observation_index}`} className={
        watchIndex === item.watch_index && observationIndex === item.observation_index ?
          "owner-reassessment-selected" : ""}>
        <strong>{item.case_id} · watch #{item.watch_index + 1} → owner trial #{item.observation_index + 1}</strong>
        <small>Watch {item.watch_recorded_at} · newer observed {item.followup_observed_at}</small>
        <p>{item.watch_age_days} full day(s) since watch · {item.original_exception_age_days} day(s) since first recheck · {item.watch_age_band.replaceAll("_", " ")}.</p>
        <p>Owner {item.owner_outcome} / {item.owner_finding} · {item.signals.join("; ").replaceAll("_", " ")}.</p>
        {item.watch_index < importedWatches && <small>Imported historical watch · not a fresh reviewer decision.</small>}
        <button type="button" onClick={() => choose(item)}>Inspect watch and exact owner trial</button>
      </article>)}
    </div>
    <fieldset className="owner-review-entry">
      <legend>Manual historical exception audit · NOT SENT</legend>
      <p>{selected ? `Watch #${selected.watch_index + 1}, trial #${selected.observation_index + 1}: ${selected.watch_age_days} full days elapsed; ${selected.signals.join(", ")}.` :
        "Select an older watch and its later same-case owner trial."}</p>
      {!canRecord && selected && <p className="owner-trial-warning">Record a fresh non-imported owner trial and personally re-witness the installed Windows Hub. Imported claims never qualify.</p>}
      <label>Fixed HOLD-only audit category
        <select value={category} disabled={!selected || !active} onChange={event => {
          setCategory(event.target.value as WatchAuditCategory); setPersonallyWitnessed(false); setHoldAcknowledged(false);
        }}>
          {WATCH_AUDIT_CATEGORIES.map(item => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
        </select>
      </label>
      <label className="owner-trial-check"><input type="checkbox" checked={personallyWitnessed} disabled={!canRecord}
        onChange={event => { setPersonallyWitnessed(event.target.checked); setHoldAcknowledged(false); }} />I personally witnessed this later exact owner trial on the installed Windows Hub and compared the earlier watch and source history.</label>
      <label className="owner-trial-check"><input type="checkbox" checked={holdAcknowledged} disabled={!canRecord}
        onChange={event => setHoldAcknowledged(event.target.checked)} />I acknowledge all prior independent, field, and Vault/security HOLDS remain; this audit does not send, assign, approve or close anything.</label>
      <button type="button" disabled={!canRecord || !personallyWitnessed || !holdAcknowledged} onClick={record}>Append private historical watch aging audit (HOLD)</button>
    </fieldset>
    {audits.map((item, index) => <p key={index}>Audit #{index + 1}: watch #{item.watch_index + 1} / trial #{item.observation_index + 1} · {item.category.replaceAll("_", " ")} · {index < importedAudits ? "historical import" : "local unverified"} · NOT SENT / HOLD.</p>)}
    {feedback && <p role="status" className="owner-trial-feedback">{feedback}</p>}
    <p className="owner-trial-privacy">Build 161 is private, bounded, manually dated and append-only. No scheduled monitor, external write, dispatch, reviewer approval, physical acceptance, closure or password/document Vault clearance. FIELD_ACCEPTANCE_HOLD · INDEPENDENT_REVIEW_HOLD · NOT_AUTHORIZED · Vault 0/6 verified / SECURITY HOLD.</p>
  </section>;
}
