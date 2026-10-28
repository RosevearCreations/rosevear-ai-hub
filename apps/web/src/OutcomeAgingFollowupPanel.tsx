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
import { FOLLOWUP_CATEGORIES, compareAgingFollowups, recordAgingFollowup,
  type FollowupCategory, type FollowupComparison, type FollowupNote } from "./ownerOutcomeAgingFollowup";

type Filter = "all" | "owner" | "source" | "overdue" | "historical";
type ReceiptComparison = { previous_audits: number; current_audits: number;
  new_audits: number; comparison: FollowupComparison | null };

export function OutcomeAgingFollowupPanel({ audits, outcomes, watches, dispositions,
  recurrences, followups, history, checks, notes, environment, importedAudits,
  importedNotes, onNotesChange, compareEarlierReceipt, active = true }: {
  audits: readonly AgingAuditNote[];
  outcomes: readonly OutcomeNote[];
  watches: readonly ContinuityWatchNote[];
  dispositions: readonly DispositionFollowup[];
  recurrences: readonly ReviewRecurrenceNote[];
  followups: readonly OwnerReviewFollowup[];
  history: readonly TrialObservation[];
  checks: readonly SourceIdentityCheck[];
  notes: FollowupNote[];
  environment: TrialEnvironment;
  importedAudits: number;
  importedNotes: number;
  onNotesChange: (notes: FollowupNote[]) => void;
  compareEarlierReceipt: (raw: string) => ReceiptComparison;
  active?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [baseline, setBaseline] = useState(0);
  const [latest, setLatest] = useState(1);
  const [category, setCategory] = useState<FollowupCategory>("CONTINUE_INDEPENDENT_HOLD");
  const [compared, setCompared] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [receiptComparison, setReceiptComparison] = useState<ReceiptComparison | null>(null);
  const [feedback, setFeedback] = useState("");
  useEffect(() => { if (!active) { setCompared(false); setAcknowledged(false); } }, [active]);

  const comparisons: (FollowupComparison & { historical: boolean })[] = [];
  audits.forEach((audit, index) => {
    const earlier = audits.findIndex((prior, previous) => previous < index &&
      prior.reassignment_watch_index === audit.reassignment_watch_index &&
      prior.latest_outcome_index < audit.latest_outcome_index &&
      Date.parse(prior.recorded_at) < Date.parse(audit.recorded_at));
    if (earlier < 0) return;
    try { comparisons.push({ ...compareAgingFollowups(audits, outcomes, watches,
      dispositions, recurrences, followups, history, checks, earlier, index),
      historical: index < importedAudits }); }
    catch { /* No historical operator claim establishes real-world acceptance. */ }
  });
  const visible = comparisons.filter(item => filter === "all" ||
    filter === "owner" && item.signals.some(signal => signal.startsWith("OWNER_") ||
      signal === "NEW_OWNER_TRIAL_NOT_WITNESSED") ||
    filter === "source" && item.signals.some(signal => signal.startsWith("SOURCE_") ||
      signal === "REPEATED_OVERDUE_SOURCE_EVIDENCE") ||
    filter === "overdue" && item.signals.some(signal => signal.includes("OVERDUE")) ||
    filter === "historical" && item.historical);
  let selected: FollowupComparison | null = null;
  try { selected = compareAgingFollowups(audits, outcomes, watches, dispositions,
    recurrences, followups, history, checks, baseline, latest); }
  catch { /* An exact pair is required. */ }
  const matchesCategory = !!selected && (category === "CONTINUE_INDEPENDENT_HOLD" ||
    category === "REQUEST_OWNER_OUTCOME_FOLLOWUP" && selected.signals.some(signal =>
      ["OWNER_OUTCOME_DRIFT_CONTINUES", "OWNER_CLAIM_CONFLICT_CONTINUES"].includes(signal)) ||
    category === "REQUEST_OVERDUE_SOURCE_RECHECK" &&
      selected.signals.includes("SOURCE_EVIDENCE_OVERDUE") ||
    category === "REQUEST_INDEPENDENT_CONTINUITY_REVIEW" &&
      selected.signals.includes("PRIOR_AGING_AUDIT_OVERDUE"));
  const canRecord = active && matchesCategory && !!selected?.newer_witnessed_owner_trial &&
    latest >= importedAudits && environment.installed_windows_witnessed &&
    environment.access !== "unknown" && !!environment.installed_version;

  function choose(item: FollowupComparison) {
    setBaseline(item.baseline_audit_index); setLatest(item.latest_audit_index);
    setCategory("CONTINUE_INDEPENDENT_HOLD"); setCompared(false); setAcknowledged(false);
    setFeedback("");
  }
  function record() {
    try {
      onNotesChange(recordAgingFollowup(audits, outcomes, watches, dispositions,
        recurrences, followups, history, checks, notes, environment,
        { audits: importedAudits, followups: importedNotes },
        { baseline_audit_index: baseline, latest_audit_index: latest, category,
          personally_compared: compared, hold_acknowledged: acknowledged }));
      setCompared(false); setAcknowledged(false);
      setFeedback("Private Build 169 follow-up reconciliation appended locally. No source certification, reminder, assignment or independent approval was sent.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not append private Build 169 HOLD follow-up."); }
  }
  async function compareEarlier(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setReceiptComparison(null);
    try {
      if (file.size > 5_050_000) throw new Error("Earlier Build 168 receipt exceeds 5.05 MB.");
      setReceiptComparison(compareEarlierReceipt(await file.text()));
      setFeedback("Complete Build 168 private receipts compared read-only as exact append-only prefixes. Nothing was authenticated, imported or sent.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Build 168 receipt comparison failed."); }
  }

  return <section className="owner-handoff-reconciliation" aria-label="Build 169 independent outcome aging follow-up reconciliation and overdue source continuity">
    <header className="owner-trial-ledger-heading">
      <div><h3>Outcome aging follow-up reconciliation & overdue source continuity</h3>
        <p>Compare chronological private Build 168 audits for the same original held case. Reconcile owner claim drift, renewed alias testimony and repeated overdue source evidence without assuming physical proof.</p></div>
      <strong className="owner-trial-hold">INDEPENDENT REVIEW: HOLD</strong>
    </header>
    <CardHelp title="Build 169 manual overdue source continuity">
      A source renewal is only an unverified local operator claim linked to a later aging audit. Aged means three or more days and overdue means eight or more days; missing source evidence is also overdue. Never auto-send, escalate, assign, certify, close or activate any integration.
    </CardHelp>
    <div className="owner-trial-reconcile-stats" aria-label="Build 169 follow-up totals">
      <span>{comparisons.length} same-watch aging-audit follow-up comparison(s)</span>
      <span>{comparisons.filter(item => !item.newer_witnessed_owner_trial).length} missing newer owner trial(s)</span>
      <span>{comparisons.filter(item => item.signals.includes("REPEATED_OVERDUE_SOURCE_EVIDENCE")).length} repeatedly overdue source pair(s)</span>
      <span>{notes.length} private follow-up(s) · {importedNotes} historical</span>
      <span>0 reminders, source certifications, assignments or approvals</span>
    </div>
    <label>Compare earlier complete Build 168 private aging audit receipt with current chain (read-only)
      <input type="file" accept=".json,application/json" disabled={!active}
        onChange={event => void compareEarlier(event)} />
    </label>
    {receiptComparison && <p role="note">Strict append-only prefix: {receiptComparison.previous_audits} prior aging audit(s), {receiptComparison.new_audits} newer audit(s). {receiptComparison.comparison ?
      `Case ${receiptComparison.comparison.case_id}; ${receiptComparison.comparison.signals.join(", ")}.` :
      "No newer same-watch aging audit pair crossed these exports."} No real approval is inferred.</p>}
    <label className="owner-decision-filter">Manual follow-up filter
      <select value={filter} onChange={event => setFilter(event.target.value as Filter)}>
        <option value="all">All same-watch audit follow-ups</option>
        <option value="owner">Owner outcome or claim changes</option>
        <option value="source">Source renewal, identity and age</option>
        <option value="overdue">Overdue source and aging audit evidence</option>
        <option value="historical">Imported historical audits</option>
      </select>
    </label>
    {comparisons.length === 0 && <p>Two chronological Build 168 aging audits with newer Build 167 outcome evidence for the exact same held watch are required.</p>}
    {comparisons.length > 0 && visible.length === 0 && <p>No aging follow-up pairs match this filter.</p>}
    <div className="owner-decision-cards">
      {visible.map(item => <article key={item.latest_audit_index} className={
        baseline === item.baseline_audit_index && latest === item.latest_audit_index ?
          "owner-reassessment-selected" : ""}>
        <strong>{item.case_id} · watch #{item.reassignment_watch_index + 1} · aging audits #{item.baseline_audit_index + 1} → #{item.latest_audit_index + 1}</strong>
        <small>Earlier {item.baseline_at} · later {item.latest_at}</small>
        <p>New owner trial since prior audit: {item.newer_witnessed_owner_trial ? "yes, unverified" : "NO"}; outcome {item.baseline_owner_outcome} → {item.latest_owner_outcome}; claimed owner {item.baseline_owner_claim.replaceAll("_", " ")} → {item.latest_owner_claim.replaceAll("_", " ")}.</p>
        <p>New source alias testimony: {item.source_renewed_since_audit ? "yes, still unverified" : "NO"}; confirmed alias claim: {item.latest_source_confirmed_alias_claim ? "yes, not certified" : "NO"}; earlier/latest source age {item.earlier_source_age_days ?? "missing"}/{item.source_age_days ?? "missing"} day(s).</p>
        <p>Earlier audit age: {item.prior_audit_age_days} day(s); {item.signals.join("; ").replaceAll("_", " ")}.</p>
        {item.historical && <small>Imported historical testimony, not independent review.</small>}
        <button type="button" onClick={() => choose(item)}>Inspect exact aging follow-up pair</button>
      </article>)}
    </div>
    <fieldset className="owner-review-entry">
      <legend>Manual independent aging follow-up · NOT SENT</legend>
      <p>{selected ? `Case ${selected.case_id}: prior audit age ${selected.prior_audit_age_days} day(s); ${selected.signals.join(", ")}.` :
        "Select two exact chronological private aging audits."}</p>
      {!canRecord && selected && <p className="owner-trial-warning">A later non-imported Build 168 audit, an owner trial after the first audit, and witnessed installed Windows Hub are required.</p>}
      <label>Fixed HOLD-only follow-up category
        <select value={category} disabled={!selected || !active} onChange={event => {
          setCategory(event.target.value as FollowupCategory); setCompared(false); setAcknowledged(false);
        }}>{FOLLOWUP_CATEGORIES.map(item => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select>
      </label>
      <label className="owner-trial-check"><input type="checkbox" checked={compared} disabled={!canRecord}
        onChange={event => { setCompared(event.target.checked); setAcknowledged(false); }} />I personally compared two aging audits, newer owner trial and source age against our actual Windows Hub.</label>
      <label className="owner-trial-check"><input type="checkbox" checked={acknowledged} disabled={!canRecord}
        onChange={event => setAcknowledged(event.target.checked)} />I acknowledge permanent independent, field and Vault HOLD; this follow-up remains private and sends no actual request.</label>
      <button type="button" disabled={!canRecord || !compared || !acknowledged} onClick={record}>Append private aging follow-up (HOLD)</button>
    </fieldset>
    {notes.map((item, index) => <p key={index}>Follow-up #{index + 1}: audits #{item.baseline_audit_index + 1} → #{item.latest_audit_index + 1} · {item.category.replaceAll("_", " ")} · {index < importedNotes ? "historical" : "local unverified"} · NOT SENT / HOLD.</p>)}
    {feedback && <p role="status" className="owner-trial-feedback">{feedback}</p>}
    <p className="owner-trial-privacy">Build 169 is browser-local, append-only and unverified. No timer, reminder, notification, gateway traffic, source certification, device action, reassignment, field or independent acceptance, or password/document Vault release. FIELD_ACCEPTANCE_HOLD · INDEPENDENT_REVIEW_HOLD · NOT_AUTHORIZED · Vault 0/6 SECURITY HOLD.</p>
  </section>;
}
