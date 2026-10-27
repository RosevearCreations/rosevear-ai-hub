import { useEffect, useState, type ChangeEvent } from "react";
import { CardHelp } from "./CommandShell";
import type { TrialEnvironment, TrialObservation } from "./ownerFieldTrial";
import type { SourceIdentityCheck } from "./ownerFieldRouting";
import type { HistoricalWatchAuditNote } from "./ownerHistoricalWatchAudit";
import { compareAuditRounds, recordReassignmentWatch, REASSIGNMENT_CATEGORIES,
  type AuditRoundComparison, type ReassignmentWatchCategory,
  type ReassignmentWatchNote } from "./ownerAuditReassignmentWatch";

type AuditFilter = "all" | "owner" | "source" | "overdue" | "imported";
type ReceiptComparison = { previous_audits: number; current_audits: number;
  new_audits: number; comparison: AuditRoundComparison | null };

/** Authenticated System child. Displays private, non-authoritative suggested reassignment watches. */
export function AuditReassignmentWatchPanel({ audits, history, checks, notes, environment,
  importedAudits, importedNotes, onNotesChange, compareEarlierReceipt, active = true }: {
  audits: readonly HistoricalWatchAuditNote[];
  history: readonly TrialObservation[];
  checks: readonly SourceIdentityCheck[];
  notes: ReassignmentWatchNote[];
  environment: TrialEnvironment;
  importedAudits: number;
  importedNotes: number;
  onNotesChange: (notes: ReassignmentWatchNote[]) => void;
  compareEarlierReceipt: (raw: string) => ReceiptComparison;
  active?: boolean;
}) {
  const [filter, setFilter] = useState<AuditFilter>("all");
  const [baseline, setBaseline] = useState(0);
  const [latest, setLatest] = useState(1);
  const [category, setCategory] = useState<ReassignmentWatchCategory>("CONTINUE_INDEPENDENT_HOLD");
  const [compared, setCompared] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [receiptComparison, setReceiptComparison] = useState<ReceiptComparison | null>(null);
  const [feedback, setFeedback] = useState("");
  useEffect(() => { if (!active) { setCompared(false); setAcknowledged(false); } }, [active]);

  const comparisons: (AuditRoundComparison & { historical: boolean })[] = [];
  audits.forEach((audit, index) => {
    const previous = audits.findIndex((item, prior) => prior < index &&
      item.watch_index === audit.watch_index &&
      item.observation_index < audit.observation_index &&
      Date.parse(item.recorded_at) < Date.parse(audit.followup_observed_at));
    if (previous < 0) return;
    try { comparisons.push({ ...compareAuditRounds(audits, history, checks, previous, index),
      historical: index < importedAudits }); }
    catch { /* Imported or mismatched claims are not a fresh reviewer reassignment. */ }
  });
  const visible = comparisons.filter(item => filter === "all" ||
    filter === "owner" && item.signals.includes("OWNER_REASSIGNMENT_PROPOSED") ||
    filter === "source" && item.signals.some(signal => signal.startsWith("SOURCE_")) ||
    filter === "overdue" && item.first_audit_age_days > 7 ||
    filter === "imported" && item.historical);
  let selected: AuditRoundComparison | null = null;
  try { selected = compareAuditRounds(audits, history, checks, baseline, latest); }
  catch { /* Explicit chronological pair selection only. */ }
  const matchingCategory = !!selected && (category === "CONTINUE_INDEPENDENT_HOLD" ||
    category === "REQUEST_OWNER_REASSIGNMENT_WITNESS" &&
      selected.signals.includes("OWNER_REASSIGNMENT_PROPOSED") ||
    category === "REQUEST_SOURCE_CONTRADICTION_RECHECK" &&
      selected.signals.some(signal => signal.startsWith("SOURCE_")) ||
    category === "REQUEST_OVERDUE_INDEPENDENT_RESPONSE" &&
      selected.signals.includes("INDEPENDENT_RESPONSE_OVERDUE"));
  const canRecord = active && matchingCategory && latest >= importedAudits &&
    environment.installed_windows_witnessed && environment.access !== "unknown" &&
    !!environment.installed_version;

  function choose(item: AuditRoundComparison) {
    setBaseline(item.baseline_audit_index); setLatest(item.latest_audit_index);
    setCategory("CONTINUE_INDEPENDENT_HOLD"); setCompared(false); setAcknowledged(false);
    setFeedback("");
  }
  function record() {
    try {
      onNotesChange(recordReassignmentWatch(audits, history, checks, notes, environment,
        { audits: importedAudits, watches: importedNotes },
        { baseline_audit_index: baseline, latest_audit_index: latest, category,
          personally_compared: compared, hold_acknowledged: acknowledged }));
      setCompared(false); setAcknowledged(false);
      setFeedback("Private reassignment exception watch appended locally; no owner role was changed, no case closed and no packet sent.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not append private HOLD watch."); }
  }
  async function compareEarlier(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setReceiptComparison(null);
    try {
      if (file.size > 2_500_000) throw new Error("Earlier Build 161 receipt exceeds 2.5 MB.");
      setReceiptComparison(compareEarlierReceipt(await file.text()));
      setFeedback("Private chronological audit receipts compared locally as structural evidence only. Nothing was imported.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Build 161 receipt comparison failed."); }
  }
  return <section className="owner-handoff-reconciliation" aria-label="Build 162 audit receipt reconciliation and owner exception reassignment watch">
    <header className="owner-trial-ledger-heading">
      <div><h3>Independent aging audit reconciliation & owner reassignment watch</h3>
        <p>Compare two private aging audits of one exact historical watch. Changed follow-up roles, contradictory source aliases and unanswered review aging remain manual HOLD evidence—not an assignment.</p></div>
      <strong className="owner-trial-hold">INDEPENDENT REVIEW: HOLD</strong>
    </header>
    <CardHelp title="A changed owner is a proposal only">
      An owner role shown on a later trial is an unverified operator claim, not a new staff assignment. Receipt comparison checks exact history prefixes but cannot authenticate a reviewer, physical installation or source identity. All earlier findings and security HOLDs stay in force.
    </CardHelp>
    <div className="owner-trial-reconcile-stats" aria-label="Build 162 audit reassignment totals">
      <span>{comparisons.length} same-watch audit round(s)</span>
      <span>{comparisons.filter(item => item.signals.includes("OWNER_REASSIGNMENT_PROPOSED")).length} changed owner role(s)</span>
      <span>{comparisons.filter(item => item.signals.some(signal => signal.startsWith("SOURCE_"))).length} source discrepancy(s)</span>
      <span>{notes.length} private watch(s) · {importedNotes} historical</span>
      <span>0 assigned, sent, scheduled, approved or closed</span>
    </div>
    <label>Compare older Build 161 private audit receipt with our current audit chain (read-only)
      <input type="file" accept=".json,application/json" disabled={!active}
        onChange={event => void compareEarlier(event)} />
    </label>
    {receiptComparison && <p role="note">Strict prefix: {receiptComparison.previous_audits} earlier audit(s), {receiptComparison.new_audits} new audit(s). {receiptComparison.comparison ?
      `Same watch #${receiptComparison.comparison.watch_index + 1}; ${receiptComparison.comparison.signals.join(", ")}.` :
      "No matching same-watch audit round crossed these exports."} Historical files remain unverified and never authorize field acceptance.</p>}
    <label className="owner-decision-filter">Manual independent exception filter
      <select value={filter} onChange={event => setFilter(event.target.value as AuditFilter)}>
        <option value="all">All chronological same-watch audit rounds</option>
        <option value="owner">Changed follow-up owner role</option>
        <option value="source">Contradictory or missing source identity</option>
        <option value="overdue">Independent response more than 7 days overdue</option>
        <option value="imported">Imported historical audit rounds</option>
      </select>
    </label>
    {comparisons.length === 0 && <p>Two chronological Build 161 audits of the same exact watch, with a later owner trial, are required. Original exceptions remain on HOLD.</p>}
    {comparisons.length > 0 && visible.length === 0 && <p>No audit rounds match this manual filter.</p>}
    <div className="owner-decision-cards">
      {visible.map(item => <article key={item.latest_audit_index} className={
        baseline === item.baseline_audit_index && latest === item.latest_audit_index ?
          "owner-reassessment-selected" : ""}>
        <strong>{item.case_id} · watch #{item.watch_index + 1} · audits #{item.baseline_audit_index + 1} → #{item.latest_audit_index + 1}</strong>
        <small>Older {item.baseline_at} · newer {item.latest_at}</small>
        <p>Owner roles: {item.baseline_owner.replaceAll("_", " ")} → {item.latest_owner.replaceAll("_", " ")} (unverified proposal).</p>
        <p>{item.first_audit_age_days} full day(s) since first audit · {item.original_watch_age_days} days since original watch · {item.age_band.replaceAll("_", " ")}.</p>
        <p>Signals: {item.signals.join("; ").replaceAll("_", " ")}.</p>
        {item.historical && <small>Historical imported audit · not a fresh reviewer decision.</small>}
        <button type="button" onClick={() => choose(item)}>Inspect exact private aging audit pair</button>
      </article>)}
    </div>
    <fieldset className="owner-review-entry">
      <legend>Manual independent owner exception watch · NOT SENT</legend>
      <p>{selected ? `Old watch #${selected.watch_index + 1}: ${selected.first_audit_age_days} days since earlier audit; ${selected.signals.join(", ")}.` :
        "Select two chronological audits linked to the same watched exception."}</p>
      {!canRecord && selected && <p className="owner-trial-warning">A fresh non-imported newer audit and witnessed installed Windows Hub are mandatory. Historical role changes never authorize reassignment.</p>}
      <label>Fixed HOLD-only exception category
        <select value={category} disabled={!selected || !active} onChange={event => {
          setCategory(event.target.value as ReassignmentWatchCategory);
          setCompared(false); setAcknowledged(false);
        }}>{REASSIGNMENT_CATEGORIES.map(item => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select>
      </label>
      <label className="owner-trial-check"><input type="checkbox" checked={compared} disabled={!canRecord}
        onChange={event => { setCompared(event.target.checked); setAcknowledged(false); }} />I personally compared the two exact aging audit rounds, older watch, owner role claims, source evidence and installed Windows Hub.</label>
      <label className="owner-trial-check"><input type="checkbox" checked={acknowledged} disabled={!canRecord}
        onChange={event => setAcknowledged(event.target.checked)} />I acknowledge this is private HOLD evidence only, not staff reassignment, a dispatch, reviewer approval, independent closure or Vault clearance.</label>
      <button type="button" disabled={!canRecord || !compared || !acknowledged} onClick={record}>Append private owner reassignment exception watch (HOLD)</button>
    </fieldset>
    {notes.map((note, index) => <p key={index}>Watch #{index + 1}: audits #{note.baseline_audit_index + 1} → #{note.latest_audit_index + 1} · {note.category.replaceAll("_", " ")} · {index < importedNotes ? "historical import" : "local unverified"} · NOT SENT / HOLD.</p>)}
    {feedback && <p role="status" className="owner-trial-feedback">{feedback}</p>}
    <p className="owner-trial-privacy">Build 162 remains browser-local, bounded and append-only. No timer, message, reassignment command, source mutation, independent certification, automatic closure or first-party password/document Vault clearance. FIELD_ACCEPTANCE_HOLD · INDEPENDENT_REVIEW_HOLD · NOT_AUTHORIZED · Vault 0/6 verified SECURITY HOLD.</p>
  </section>;
}
