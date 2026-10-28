import { useEffect, useState, type ChangeEvent } from "react";
import { CardHelp } from "./CommandShell";
import type { TrialEnvironment } from "./ownerFieldTrial";
import type { DriftOutcomeReceipt } from "./ownerSourceDriftOutcome";
import { compareOutcomeExceptions, EXCEPTION_CATEGORIES, recordExceptionRecurrence,
  type ExceptionCategory, type ExceptionNote } from "./ownerOutcomeExceptionRecurrence";

type Filter = "all" | "owner" | "source" | "overdue" | "historical";
export function OutcomeExceptionRecurrencePanel({ prior, notes, environment,
  importedOutcomes, importedRecurrences, onNotesChange, compareEarlierReceipt,
  active = true }: {
  prior: DriftOutcomeReceipt;
  notes: ExceptionNote[];
  environment: TrialEnvironment;
  importedOutcomes: number;
  importedRecurrences: number;
  onNotesChange: (notes: ExceptionNote[]) => void;
  compareEarlierReceipt: (raw: string) => { previous_outcomes: number;
    current_outcomes: number; new_outcomes: number; comparison: unknown };
  active?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [chosen, setChosen] = useState<[number, number] | null>(null);
  const [category, setCategory] = useState<ExceptionCategory>("CONTINUE_INDEPENDENT_HOLD");
  const [rechecked, setRechecked] = useState(false);
  const [held, setHeld] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [historical, setHistorical] = useState("");
  useEffect(() => { if (!active) { setRechecked(false); setHeld(false); } }, [active]);
  const reviews = prior.drift_outcomes.flatMap((later, index) => {
    if (!index) return [];
    const earlier = prior.drift_outcomes.findIndex((candidate, previous) => previous < index &&
      candidate.case_id === later.case_id &&
      candidate.reassignment_watch_index === later.reassignment_watch_index &&
      candidate.latest_recheck_index <= later.latest_recheck_index &&
      Date.parse(candidate.recorded_at) < Date.parse(later.recorded_at));
    if (earlier < 0) return [];
    try { return [compareOutcomeExceptions(prior, earlier, index)]; }
    catch { return []; }
  });
  const visible = reviews.filter(item => filter === "all" ||
    filter === "owner" && item.signals.some(signal => signal.startsWith("OWNER_") ||
      signal === "REPEATED_OWNER_WITNESS_GAP") ||
    filter === "source" && item.signals.some(signal => signal.includes("SOURCE_") ||
      signal.includes("ACCESS_CONFLICT")) ||
    filter === "overdue" && item.signals.some(signal => signal.includes("OVERDUE")) ||
    filter === "historical" && item.latest_outcome_index < importedOutcomes);
  const selected = chosen ? reviews.find(item => item.baseline_outcome_index === chosen[0] &&
    item.latest_outcome_index === chosen[1]) : null;
  const categoryMatches = !!selected && (category === "CONTINUE_INDEPENDENT_HOLD" ||
    category === "REQUEST_OWNER_FRESHNESS_RECHECK" && selected.signals.some(signal =>
      ["OWNER_CONTINUITY_NOT_FRESH", "REPEATED_OWNER_WITNESS_GAP"].includes(signal)) ||
    category === "REQUEST_RECURRING_SOURCE_REVIEW" && selected.signals.some(signal =>
      ["REPEATED_SOURCE_RENEWAL_GAP", "REPEATED_SOURCE_IDENTITY_DRIFT",
        "VERSION_OR_ACCESS_CONFLICT_UNRESOLVED"].includes(signal)) ||
    category === "REQUEST_OVERDUE_EVIDENCE_RENEWAL" &&
      selected.signals.includes("SOURCE_STILL_OVERDUE"));
  const canRecord = active && categoryMatches && !!chosen && chosen[1] >= importedOutcomes &&
    environment.installed_windows_witnessed && !!environment.installed_version &&
    environment.access !== "unknown";
  function record() {
    if (!chosen) return;
    try {
      onNotesChange(recordExceptionRecurrence(prior, notes, environment,
        { outcomes: importedOutcomes, recurrences: importedRecurrences },
        { baseline_outcome_index: chosen[0], latest_outcome_index: chosen[1], category,
          personally_rechecked: rechecked, independent_hold_acknowledged: held }));
      setRechecked(false); setHeld(false);
      setFeedback("Build 172 private exception recurrence recorded. No message, device action, gateway call or approval occurred.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Unable to record private HOLD note."); }
  }
  async function compareEarlier(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]; event.currentTarget.value = "";
    if (!file) return;
    try {
      if (file.size > 6_250_000) throw new Error("Build 171 receipt exceeds 6.25 MB.");
      const result = compareEarlierReceipt(await file.text());
      setHistorical(`Exact historical prefix: ${result.previous_outcomes} earlier outcome(s), ${result.new_outcomes} new of ${result.current_outcomes}. No independent authorization inferred.`);
    } catch (error) { setHistorical(error instanceof Error ? error.message : "Invalid Build 171 comparison."); }
  }
  return <section className="owner-handoff-reconciliation" aria-label="Build 172 independent exception recurrence and owner continuity freshness">
    <header className="owner-trial-ledger-heading"><div>
      <h3>Independent recheck exception recurrence & owner continuity freshness</h3>
      <p>Compare later Build 171 private HOLD outcomes for repeated source and owner evidence gaps; every outcome remains an unauthenticated claim.</p>
    </div><strong className="owner-trial-hold">INDEPENDENT REVIEW: HOLD</strong></header>
    <CardHelp title="Build 172 private recurrence review">
      Owner freshness must come from a separately witnessed observation after the earlier outcome, never from a newer export date. Source renewal needs a distinct later pseudonymous check. Three days is aged and eight days is overdue, assessed only when we open this review.
    </CardHelp>
    <div className="owner-trial-reconcile-stats">
      <span>{reviews.length} same-watch outcome comparison(s)</span>
      <span>{reviews.filter(item => item.repeated_owner_gap).length} repeated owner gaps</span>
      <span>{reviews.filter(item => item.repeated_source_gap || item.repeated_identity_drift).length} repeated source exceptions</span>
      <span>{notes.length} private HOLD note(s) · {importedRecurrences} historical</span>
      <span>0 commands, messages, gateway calls or approvals</span>
    </div>
    <label>Compare earlier complete Build 171 receipt (read-only)
      <input type="file" accept=".json,application/json" disabled={!active}
        onChange={event => void compareEarlier(event)} />
    </label>
    {historical && <p role="note">{historical}</p>}
    <label className="owner-decision-filter">Manual recurrence filter
      <select value={filter} onChange={event => setFilter(event.target.value as Filter)}>
        <option value="all">All outcomes</option><option value="owner">Owner witness/freshness</option>
        <option value="source">Repeated source or access drift</option>
        <option value="overdue">Overdue evidence</option>
        <option value="historical">Imported historical outcomes</option>
      </select>
    </label>
    {reviews.length === 0 && <p>At least two chronological Build 171 HOLD outcome notes for one original watch are needed. Repeated stale evidence is never a pass.</p>}
    {reviews.length > 0 && visible.length === 0 && <p>No recurrence outcomes match this filter.</p>}
    <div className="owner-decision-cards">{visible.map(item => <article key={item.latest_outcome_index}>
      <strong>{item.case_id} · watch #{item.reassignment_watch_index + 1} · outcomes #{item.baseline_outcome_index + 1} → #{item.latest_outcome_index + 1}</strong>
      <small>{item.baseline_at} → {item.latest_at}</small>
      <p>Fresh owner witness: {item.owner_witness_fresh_since_prior_outcome ? "claimed, unverified" : "MISSING"}; fresh source: {item.source_evidence_fresh_since_prior_outcome ? "claimed, unverified" : "MISSING"}; repeated identity drift: {item.repeated_identity_drift ? "unresolved" : "not reported"}.</p>
      <p>Old/latest source age: {item.baseline_source_age_days ?? "missing"}/{item.latest_source_age_days ?? "missing"} days; earlier outcome age {item.earlier_outcome_age_days} days.</p>
      <p>{item.signals.join("; ").replaceAll("_", " ")}</p>
      {item.latest_outcome_index < importedOutcomes && <small>Historical operator claim, not independently accepted.</small>}
      <button type="button" onClick={() => { setChosen([item.baseline_outcome_index, item.latest_outcome_index]);
        setCategory("CONTINUE_INDEPENDENT_HOLD"); setRechecked(false); setHeld(false); }}>Inspect exact recurrence pair</button>
    </article>)}</div>
    <fieldset className="owner-review-entry"><legend>Manual exception recurrence · NOT SENT</legend>
      <p>{selected ? `Selected ${selected.case_id}: ${selected.signals.join(", ")}` : "Choose an exact chronological pair."}</p>
      {!canRecord && selected && <p className="owner-trial-warning">Non-imported later outcome, witnessed installed Windows and separate HOLD review required.</p>}
      <label>Fixed HOLD-only recurrence category
        <select value={category} disabled={!selected || !active} onChange={event => {
          setCategory(event.target.value as ExceptionCategory); setRechecked(false); setHeld(false);
        }}>{EXCEPTION_CATEGORIES.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select>
      </label>
      <label className="owner-trial-check"><input type="checkbox" checked={rechecked} disabled={!canRecord}
        onChange={event => { setRechecked(event.target.checked); setHeld(false); }} />I personally compared these outcomes against the installed Windows Hub and checked actual owner/source dates.</label>
      <label className="owner-trial-check"><input type="checkbox" checked={held} disabled={!canRecord}
        onChange={event => setHeld(event.target.checked)} />I separately acknowledge immutable field, reviewer, gateway and Vault HOLDs; no action or owner approval is sent.</label>
      <button type="button" disabled={!canRecord || !rechecked || !held} onClick={record}>Append private Build 172 recurrence (HOLD)</button>
    </fieldset>
    {notes.map((item, index) => <p key={index}>Recurrence #{index + 1}: outcomes #{item.baseline_outcome_index + 1} → #{item.latest_outcome_index + 1} · {item.category.replaceAll("_", " ")} · {index < importedRecurrences ? "historical" : "local"} · NOT SENT / HOLD.</p>)}
    {feedback && <p role="status">{feedback}</p>}
    <p className="owner-trial-privacy">No background scheduling, external messages, cross-company connection, device commands, reassignment or Vault activation. FIELD_ACCEPTANCE_HOLD · INDEPENDENT_REVIEW_HOLD · NOT_AUTHORIZED · Vault 0/6 SECURITY HOLD.</p>
  </section>;
}
