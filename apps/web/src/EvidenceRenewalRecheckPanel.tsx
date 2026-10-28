import { useEffect, useState, type ChangeEvent } from "react";
import { CardHelp } from "./CommandShell";
import type { TrialEnvironment, TrialObservation } from "./ownerFieldTrial";
import type { SourceIdentityCheck } from "./ownerFieldRouting";
import type { OwnerReviewFollowup } from "./ownerReassignmentReviewFollowup";
import type { ReviewRecurrenceNote } from "./ownerReviewRecurrence";
import type { DispositionFollowup } from "./ownerRecurrenceDisposition";
import type { ContinuityWatchNote } from "./ownerDispositionContinuity";
import type { OutcomeNote } from "./ownerContinuityOutcome";
import type { AgingAuditNote } from "./ownerOutcomeAgingAudit";
import type { FollowupNote } from "./ownerOutcomeAgingFollowup";
import { RENEWAL_CATEGORIES, compareEvidenceRenewal, recordRenewalRecheck,
  type RenewalCategory, type RenewalComparison, type RenewalNote } from "./ownerEvidenceRenewalRecheck";

type Filter = "all" | "identity" | "overdue" | "owner" | "historical";
type ReceiptComparison = { previous_followups: number; current_followups: number;
  new_followups: number; comparison: RenewalComparison | null };
export function EvidenceRenewalRecheckPanel({ rounds, audits, outcomes, watches,
  dispositions, recurrences, followups, history, checks, notes, environment,
  importedRounds, importedNotes, onNotesChange, compareEarlierReceipt, active = true }: {
  rounds: readonly FollowupNote[];
  audits: readonly AgingAuditNote[];
  outcomes: readonly OutcomeNote[];
  watches: readonly ContinuityWatchNote[];
  dispositions: readonly DispositionFollowup[];
  recurrences: readonly ReviewRecurrenceNote[];
  followups: readonly OwnerReviewFollowup[];
  history: readonly TrialObservation[];
  checks: readonly SourceIdentityCheck[];
  notes: RenewalNote[];
  environment: TrialEnvironment;
  importedRounds: number;
  importedNotes: number;
  onNotesChange: (notes: RenewalNote[]) => void;
  compareEarlierReceipt: (raw: string) => ReceiptComparison;
  active?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [baseline, setBaseline] = useState(0);
  const [latest, setLatest] = useState(1);
  const [category, setCategory] = useState<RenewalCategory>("CONTINUE_INDEPENDENT_HOLD");
  const [rechecked, setRechecked] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [receiptComparison, setReceiptComparison] = useState<ReceiptComparison | null>(null);
  const [feedback, setFeedback] = useState("");
  useEffect(() => { if (!active) { setRechecked(false); setAcknowledged(false); } }, [active]);
  const comparisons: (RenewalComparison & { historical: boolean })[] = [];
  rounds.forEach((round, index) => {
    const earlier = rounds.findIndex((prior, previous) => previous < index &&
      prior.reassignment_watch_index === round.reassignment_watch_index &&
      prior.latest_audit_index <= round.latest_audit_index &&
      Date.parse(prior.recorded_at) < Date.parse(round.recorded_at));
    if (earlier < 0) return;
    try { comparisons.push({ ...compareEvidenceRenewal(rounds, audits, outcomes, watches,
      dispositions, recurrences, followups, history, checks, earlier, index),
      historical: index < importedRounds }); }
    catch { /* Historical private claims never establish authentication. */ }
  });
  const visible = comparisons.filter(item => filter === "all" ||
    filter === "identity" && item.signals.some(signal => signal.includes("IDENTITY") ||
      signal.includes("ALIAS") || signal.includes("ACCESS_DRIFT")) ||
    filter === "overdue" && item.signals.some(signal => signal.includes("OVERDUE")) ||
    filter === "owner" && item.signals.some(signal => signal.startsWith("OWNER_") ||
      signal === "NEW_OWNER_TRIAL_NOT_LINKED") || filter === "historical" && item.historical);
  let selected: RenewalComparison | null = null;
  try { selected = compareEvidenceRenewal(rounds, audits, outcomes, watches,
    dispositions, recurrences, followups, history, checks, baseline, latest); }
  catch { /* exact pair needed */ }
  const categoryMatches = !!selected && (category === "CONTINUE_INDEPENDENT_HOLD" ||
    category === "REQUEST_OWNER_EVIDENCE_RECHECK" && selected.signals.some(signal =>
      ["OWNER_OUTCOME_DRIFT_PERSISTS", "OWNER_CLAIM_DRIFT_PERSISTS",
        "NEW_OWNER_TRIAL_NOT_LINKED"].includes(signal)) ||
    category === "REQUEST_SOURCE_IDENTITY_DRIFT_RECHECK" && selected.signals.some(signal =>
      ["SOURCE_ALIAS_OR_IDENTITY_DRIFT", "SOURCE_VERSION_OR_ACCESS_DRIFT",
        "SOURCE_IDENTITY_NOT_AUTHENTICATED"].includes(signal)) ||
    category === "REQUEST_OVERDUE_SOURCE_RENEWAL" &&
      selected.signals.includes("SOURCE_EVIDENCE_OVERDUE"));
  const canRecord = active && categoryMatches && latest >= importedRounds &&
    environment.installed_windows_witnessed && environment.access !== "unknown" &&
    !!environment.installed_version;

  function choose(item: RenewalComparison) {
    setBaseline(item.baseline_followup_index); setLatest(item.latest_followup_index);
    setCategory("CONTINUE_INDEPENDENT_HOLD"); setRechecked(false); setAcknowledged(false);
    setFeedback("");
  }
  function record() {
    try {
      onNotesChange(recordRenewalRecheck(rounds, audits, outcomes, watches,
        dispositions, recurrences, followups, history, checks, notes, environment,
        { followups: importedRounds, rechecks: importedNotes },
        { baseline_followup_index: baseline, latest_followup_index: latest,
          category, personally_rechecked: rechecked, hold_acknowledged: acknowledged }));
      setRechecked(false); setAcknowledged(false);
      setFeedback("Build 170 private renewal and drift recheck appended locally. No message, owner change, source authentication or approval was sent.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not append private Build 170 HOLD recheck."); }
  }
  async function compareEarlier(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]; event.currentTarget.value = "";
    if (!file) return;
    setReceiptComparison(null);
    try {
      if (file.size > 5_450_000) throw new Error("Build 169 receipt exceeds 5.45 MB.");
      setReceiptComparison(compareEarlierReceipt(await file.text()));
      setFeedback("Two complete Build 169 receipts compared read-only as exact historical prefixes. No authentication, import or external action occurred.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Build 169 receipt comparison failed."); }
  }
  return <section className="owner-handoff-reconciliation" aria-label="Build 170 independent evidence renewal and source identity drift recheck">
    <header className="owner-trial-ledger-heading">
      <div><h3>Independent aging follow-up evidence renewal & source-identity drift</h3>
        <p>Inspect later Build 169 private follow-up rounds for the same original held watch. Recheck claimed alias identity and renewal after the previous round, without certifying hardware or closing a case.</p></div>
      <strong className="owner-trial-hold">INDEPENDENT REVIEW: HOLD</strong>
    </header>
    <CardHelp title="Build 170 evidence renewal and identity drift">
      Repeated follow-ups with no new owner trial or source check are valid negative evidence, not progress. Aged means 3+ days; overdue means 8+ days. Confirmed alias is still an unverified operator label. There are no background timers, reminders or live gateway/Hub commands.
    </CardHelp>
    <div className="owner-trial-reconcile-stats" aria-label="Build 170 recheck totals">
      <span>{comparisons.length} same-watch follow-up comparison(s)</span>
      <span>{comparisons.filter(item => !item.renewed_source_since_followup).length} source not renewed since prior follow-up</span>
      <span>{comparisons.filter(item => item.source_identity_drift_claim || item.source_version_access_drift_claim).length} source identity/access drift claim(s)</span>
      <span>{notes.length} private renewal recheck(s) · {importedNotes} historical</span>
      <span>0 reminders, device authentications, assignments or approvals</span>
    </div>
    <label>Compare earlier complete Build 169 private aging follow-up receipt with current chain (read-only)
      <input type="file" accept=".json,application/json" disabled={!active}
        onChange={event => void compareEarlier(event)} />
    </label>
    {receiptComparison && <p role="note">Strict append-only prefix: {receiptComparison.previous_followups} earlier follow-up(s), {receiptComparison.new_followups} newer follow-up(s). {receiptComparison.comparison ?
      `Case ${receiptComparison.comparison.case_id}; ${receiptComparison.comparison.signals.join(", ")}.` :
      "No later same-watch pair crossed these exports."} No independent approval was inferred.</p>}
    <label className="owner-decision-filter">Manual renewal recheck filter
      <select value={filter} onChange={event => setFilter(event.target.value as Filter)}>
        <option value="all">All same-watch renewal rounds</option>
        <option value="identity">Source identity, alias or access drift</option>
        <option value="overdue">Overdue source or earlier follow-up</option>
        <option value="owner">Owner outcome or missing newer owner trial</option>
        <option value="historical">Imported historical follow-ups</option>
      </select>
    </label>
    {comparisons.length === 0 && <p>Two chronological Build 169 follow-ups for the same original held case are required. A repeated check with unchanged evidence remains an unresolved HOLD.</p>}
    {comparisons.length > 0 && visible.length === 0 && <p>No renewal/drift rounds match this filter.</p>}
    <div className="owner-decision-cards">
      {visible.map(item => <article key={item.latest_followup_index} className={
        baseline === item.baseline_followup_index && latest === item.latest_followup_index ?
          "owner-reassessment-selected" : ""}>
        <strong>{item.case_id} · watch #{item.reassignment_watch_index + 1} · follow-ups #{item.baseline_followup_index + 1} → #{item.latest_followup_index + 1}</strong>
        <small>Earlier {item.baseline_at} · later {item.latest_at}</small>
        <p>New owner trial: {item.newer_owner_trial_since_followup ? "yes, unverified" : "NO"}; outcome {item.baseline_owner_outcome} → {item.latest_owner_outcome}; claimed owner {item.baseline_owner_claim.replaceAll("_", " ")} → {item.latest_owner_claim.replaceAll("_", " ")}.</p>
        <p>New source since prior follow-up: {item.renewed_source_since_followup ? "yes, unverified" : "NO"}; identity drift {item.source_identity_drift_claim ? "claimed" : "not observed"}; version/access drift {item.source_version_access_drift_claim ? "claimed" : "not observed"}; source age {item.prior_source_age_days ?? "missing"}/{item.latest_source_age_days ?? "missing"} days.</p>
        <p>Earlier follow-up age: {item.earlier_followup_age_days} days; {item.signals.join("; ").replaceAll("_", " ")}.</p>
        {item.historical && <small>Imported testimony, never an independent review.</small>}
        <button type="button" onClick={() => choose(item)}>Inspect exact evidence renewal pair</button>
      </article>)}
    </div>
    <fieldset className="owner-review-entry">
      <legend>Manual source identity drift recheck · NOT SENT</legend>
      <p>{selected ? `Case ${selected.case_id}: earlier follow-up age ${selected.earlier_followup_age_days} days; ${selected.signals.join(", ")}.` :
        "Select two exact chronological private follow-ups."}</p>
      {!canRecord && selected && <p className="owner-trial-warning">Fresh non-imported later follow-up, witnessed installed Windows Hub and separate permanent HOLD attestations are required.</p>}
      <label>Fixed HOLD-only renewal recheck category
        <select value={category} disabled={!selected || !active} onChange={event => {
          setCategory(event.target.value as RenewalCategory); setRechecked(false); setAcknowledged(false);
        }}>{RENEWAL_CATEGORIES.map(item => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select>
      </label>
      <label className="owner-trial-check"><input type="checkbox" checked={rechecked} disabled={!canRecord}
        onChange={event => { setRechecked(event.target.checked); setAcknowledged(false); }} />I personally rechecked both follow-up rounds and source identity/age against our installed Windows Hub.</label>
      <label className="owner-trial-check"><input type="checkbox" checked={acknowledged} disabled={!canRecord}
        onChange={event => setAcknowledged(event.target.checked)} />I acknowledge permanent independent, field and Vault HOLD; the source claims remain unauthenticated and this note sends nothing.</label>
      <button type="button" disabled={!canRecord || !rechecked || !acknowledged} onClick={record}>Append private evidence renewal recheck (HOLD)</button>
    </fieldset>
    {notes.map((item, index) => <p key={index}>Recheck #{index + 1}: follow-ups #{item.baseline_followup_index + 1} → #{item.latest_followup_index + 1} · {item.category.replaceAll("_", " ")} · {index < importedNotes ? "historical" : "local unverified"} · NOT SENT / HOLD.</p>)}
    {feedback && <p role="status" className="owner-trial-feedback">{feedback}</p>}
    <p className="owner-trial-privacy">Build 170 is browser-local and append-only. No automatic recheck, message, approval, source certification, camera/Hub command, role change, gateway or Vault operation. FIELD_ACCEPTANCE_HOLD · INDEPENDENT_REVIEW_HOLD · NOT_AUTHORIZED · first-party password/document Vault 0/6 SECURITY HOLD.</p>
  </section>;
}
