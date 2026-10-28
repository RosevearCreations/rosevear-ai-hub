import { useEffect, useState, type ChangeEvent } from "react";
import { CardHelp } from "./CommandShell";
import type { TrialEnvironment } from "./ownerFieldTrial";
import type { RenewalReceipt } from "./ownerEvidenceRenewalRecheck";
import { compareDriftOutcomes, DRIFT_OUTCOME_CATEGORIES, recordDriftOutcome,
  type DriftOutcomeCategory, type DriftOutcomeNote } from "./ownerSourceDriftOutcome";

export function SourceDriftOutcomePanel({ prior, notes, environment, importedRechecks,
  importedOutcomes, onNotesChange, compareEarlierReceipt, active = true }: {
  prior: RenewalReceipt;
  notes: DriftOutcomeNote[];
  environment: TrialEnvironment;
  importedRechecks: number;
  importedOutcomes: number;
  onNotesChange: (notes: DriftOutcomeNote[]) => void;
  compareEarlierReceipt: (raw: string) => { previous_rechecks: number;
    current_rechecks: number; new_rechecks: number; comparison: unknown };
  active?: boolean;
}) {
  const [chosen, setChosen] = useState<[number, number] | null>(null);
  const [category, setCategory] = useState<DriftOutcomeCategory>("CONTINUE_INDEPENDENT_HOLD");
  const [compared, setCompared] = useState(false);
  const [hold, setHold] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [historical, setHistorical] = useState("");
  const [filter, setFilter] = useState<"all" | "overdue" | "owner" | "drift">("all");
  useEffect(() => { if (!active) { setCompared(false); setHold(false); } }, [active]);
  const reviews = prior.renewal_rechecks.flatMap((latest, index) => {
    if (index === 0) return [];
    const earlier = prior.renewal_rechecks.findIndex((candidate, previous) => previous < index &&
      candidate.case_id === latest.case_id &&
      candidate.reassignment_watch_index === latest.reassignment_watch_index &&
      Date.parse(candidate.recorded_at) < Date.parse(latest.recorded_at));
    if (earlier < 0) return [];
    try { return [compareDriftOutcomes(prior, earlier, index)]; }
    catch { return []; }
  });
  const visible = reviews.filter(item => filter === "all" ||
    filter === "overdue" && item.signals.some(signal => signal.includes("OVERDUE")) ||
    filter === "owner" && item.signals.some(signal => signal.startsWith("OWNER_")) ||
    filter === "drift" && item.identity_or_access_drift_continues);
  const selected = chosen ? reviews.find(item => item.baseline_recheck_index === chosen[0] &&
    item.latest_recheck_index === chosen[1]) : null;
  const matched = !!selected && (category === "CONTINUE_INDEPENDENT_HOLD" ||
    category === "REQUEST_OWNER_CONTINUITY_WITNESS" && selected.signals.some(signal =>
      signal === "OWNER_WITNESS_GAP" || signal === "OWNER_CLAIM_CHANGED") ||
    category === "REQUEST_SOURCE_DRIFT_REVIEW" && selected.identity_or_access_drift_continues ||
    category === "REQUEST_OVERDUE_SOURCE_REFRESH" && selected.signals.includes("SOURCE_EVIDENCE_OVERDUE"));
  const canRecord = active && matched && !!chosen && chosen[1] >= importedRechecks &&
    environment.installed_windows_witnessed && !!environment.installed_version &&
    environment.access !== "unknown";
  function record() {
    if (!chosen) return;
    try { onNotesChange(recordDriftOutcome(prior, notes, environment,
      { rechecks: importedRechecks, outcomes: importedOutcomes },
      { baseline_recheck_index: chosen[0], latest_recheck_index: chosen[1], category,
        personally_compared: compared, permanent_hold_acknowledged: hold }));
      setCompared(false); setHold(false);
      setFeedback("Build 171 private HOLD outcome appended; no gateway request, owner change or device action.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not record private HOLD."); }
  }
  async function compareEarlier(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]; event.currentTarget.value = "";
    if (!file) return;
    try { if (file.size > 5_850_000) throw new Error("Build 170 receipt exceeds 5.85 MB.");
      const result = compareEarlierReceipt(await file.text());
      setHistorical(`${result.previous_rechecks} earlier, ${result.current_rechecks} current; ${result.new_rechecks} new private rechecks. No approval inferred.`);
    } catch (error) { setHistorical(error instanceof Error ? error.message : "Invalid earlier receipt."); }
  }
  return <section className="owner-handoff-reconciliation" aria-label="Build 171 source drift outcome aging and owner evidence continuity">
    <header className="owner-trial-ledger-heading"><div>
      <h3>Independent source drift outcome aging & owner evidence continuity</h3>
      <p>Compare successive Build 170 held rechecks for the same original watch. Missing owner witness, repeated source age and identity changes remain unresolved operator claims.</p>
    </div><strong className="owner-trial-hold">INDEPENDENT REVIEW: HOLD</strong></header>
    <CardHelp title="Build 171 source drift outcome review">
      Historical evidence is never a fresh owner observation. Aged means 3+ days; overdue means 8+ days. The panel is private, manual and disconnected. QL-243 nonproduction signed GET testing needs separate owner consent and server-side credentials; never paste a key here.
    </CardHelp>
    <div className="owner-trial-reconcile-stats">
      <span>{reviews.length} same-watch outcome comparison(s)</span>
      <span>{reviews.filter(item => !item.owner_witness_continuity).length} owner witness gap(s)</span>
      <span>{reviews.filter(item => item.signals.includes("SOURCE_AGE_REPEATED_OVERDUE")).length} repeated overdue source(s)</span>
      <span>{notes.length} local HOLD notes · {importedOutcomes} historical</span>
      <span>0 gateway calls, device controls or approvals</span>
    </div>
    <label>Compare earlier complete Build 170 receipt (read-only)
      <input type="file" accept=".json,application/json" disabled={!active}
        onChange={event => void compareEarlier(event)} />
    </label>
    {historical && <p role="note">{historical}</p>}
    <label className="owner-decision-filter">Manual outcome filter
      <select value={filter} onChange={event => setFilter(event.target.value as typeof filter)}>
        <option value="all">All same-watch outcomes</option>
        <option value="overdue">Repeated or current overdue source</option>
        <option value="owner">Owner witness gap/claim change</option>
        <option value="drift">Alias, identity or access drift</option>
      </select>
    </label>
    {reviews.length === 0 && <p>Two chronological Build 170 HOLD rechecks for the same case are needed; an unchanged recheck is not evidence of recovery.</p>}
    {reviews.length > 0 && visible.length === 0 && <p>No private outcomes match this filter.</p>}
    <div className="owner-decision-cards">{visible.map(item =>
      <article key={item.latest_recheck_index}>
        <strong>{item.case_id} · watch #{item.reassignment_watch_index + 1} · rechecks #{item.baseline_recheck_index + 1} → #{item.latest_recheck_index + 1}</strong>
        <small>{item.baseline_at} → {item.latest_at}</small>
        <p>Owner witness continuity: {item.owner_witness_continuity ? "claimed, unverified" : "MISSING"}; source renewal: {item.source_renewed_after_prior_recheck ? "claimed, unverified" : "NOT RENEWED"}; identity/access drift: {item.identity_or_access_drift_continues ? "unresolved" : "not recorded"}.</p>
        <p>Prior/latest source age: {item.prior_source_age_days ?? "missing"}/{item.latest_source_age_days ?? "missing"} days; earlier recheck age {item.earlier_recheck_age_days} days.</p>
        <p>{item.signals.join("; ").replaceAll("_", " ")}</p>
        {item.latest_recheck_index < importedRechecks && <small>Historical import only, not a fresh independent witness.</small>}
        <button type="button" onClick={() => { setChosen([item.baseline_recheck_index,
          item.latest_recheck_index]); setCategory("CONTINUE_INDEPENDENT_HOLD");
          setCompared(false); setHold(false); }}>Inspect exact drift outcome pair</button>
      </article>)}</div>
    <fieldset className="owner-review-entry"><legend>Manual source drift outcome · NOT SENT</legend>
      <p>{selected ? `Selected case ${selected.case_id}: ${selected.signals.join(", ")}` : "Select a chronological recheck pair."}</p>
      {!canRecord && selected && <p className="owner-trial-warning">Later non-imported recheck and a freshly witnessed installed Windows Hub are required.</p>}
      <label>Fixed HOLD-only outcome category
        <select value={category} disabled={!selected || !active} onChange={event => {
          setCategory(event.target.value as DriftOutcomeCategory); setCompared(false); setHold(false);
        }}>{DRIFT_OUTCOME_CATEGORIES.map(value =>
          <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select>
      </label>
      <label className="owner-trial-check"><input type="checkbox" disabled={!canRecord}
        checked={compared} onChange={event => { setCompared(event.target.checked); setHold(false); }} />I compared both private rechecks with the currently installed Windows Hub; no device identity was authenticated.</label>
      <label className="owner-trial-check"><input type="checkbox" disabled={!canRecord}
        checked={hold} onChange={event => setHold(event.target.checked)} />I acknowledge unchanged field, independent, gateway and Vault HOLDs; this note sends nothing.</label>
      <button type="button" disabled={!canRecord || !compared || !hold} onClick={record}>Append private Build 171 outcome (HOLD)</button>
    </fieldset>
    {notes.map((item, index) => <p key={index}>Outcome #{index + 1}: rechecks #{item.baseline_recheck_index + 1} → #{item.latest_recheck_index + 1} · {item.category.replaceAll("_", " ")} · {index < importedOutcomes ? "historical" : "local"} · NOT SENT / HOLD.</p>)}
    {feedback && <p role="status">{feedback}</p>}
    <p className="owner-trial-privacy">Build 171 has no automatic notices, remote gateway calls, device commands, owner authorization or case closure. FIELD_ACCEPTANCE_HOLD · INDEPENDENT_REVIEW_HOLD · NOT_AUTHORIZED · Vault 0/6 SECURITY HOLD.</p>
  </section>;
}
