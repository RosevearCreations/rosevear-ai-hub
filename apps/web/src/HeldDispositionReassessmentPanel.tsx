import { useEffect, useState, type ChangeEvent } from "react";
import { CardHelp } from "./CommandShell";
import type { TrialEnvironment } from "./ownerFieldTrial";
import type { DispositionFollowupReceipt } from "./ownerRecurrenceDispositionFollowup";
import { compareHeldDispositionReassessments, HELD_REASSESSMENT_CATEGORIES,
  recordHeldDispositionReassessment, type HeldReassessmentCategory,
  type HeldReassessmentNote } from "./ownerHeldDispositionReassessment";

type Filter = "all" | "owner" | "source" | "overdue" | "historical";
export function HeldDispositionReassessmentPanel({ prior, notes, environment,
  importedFollowups, importedReassessments, onNotesChange, compareEarlierReceipt,
  active = true }: {
  prior: DispositionFollowupReceipt;
  notes: HeldReassessmentNote[];
  environment: TrialEnvironment;
  importedFollowups: number;
  importedReassessments: number;
  onNotesChange: (notes: HeldReassessmentNote[]) => void;
  compareEarlierReceipt: (raw: string) => { previous_followups: number;
    current_followups: number; new_followups: number; comparison: unknown };
  active?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [chosen, setChosen] = useState<[number, number] | null>(null);
  const [category, setCategory] = useState<HeldReassessmentCategory>("CONTINUE_INDEPENDENT_HOLD");
  const [rechecked, setRechecked] = useState(false);
  const [held, setHeld] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [historical, setHistorical] = useState("");
  useEffect(() => { if (!active) { setRechecked(false); setHeld(false); } }, [active]);
  const reviews = prior.recurrence_disposition_followups.flatMap((later, index) => {
    if (!index) return [];
    const earlier = prior.recurrence_disposition_followups.findIndex((candidate, previous) =>
      previous < index && candidate.case_id === later.case_id &&
      candidate.reassignment_watch_index === later.reassignment_watch_index &&
      candidate.later_recurrence_index <= later.later_recurrence_index &&
      Date.parse(candidate.recorded_at) < Date.parse(later.recorded_at));
    if (earlier < 0) return [];
    try { return [compareHeldDispositionReassessments(prior, earlier, index)]; }
    catch { return []; }
  });
  const visible = reviews.filter(item => filter === "all" ||
    filter === "owner" && item.signals.some(s => s.includes("OWNER")) ||
    filter === "source" && item.signals.some(s => s.includes("SOURCE")) ||
    filter === "overdue" && item.signals.some(s => s.includes("OVERDUE")) ||
    filter === "historical" && item.later_followup_index < importedFollowups);
  const selected = chosen ? reviews.find(item => item.earlier_followup_index === chosen[0] &&
    item.later_followup_index === chosen[1]) : null;
  const categoryMatches = !!selected && (category === "CONTINUE_INDEPENDENT_HOLD" ||
    category === "REQUEST_OWNER_REWITNESS" && selected.signals.includes("OWNER_CONTINUITY_GAP") ||
    category === "REQUEST_SOURCE_REVALIDATION" && selected.signals.some(s =>
      ["SOURCE_CONTINUITY_GAP", "SOURCE_IDENTITY_CONFLICT_UNRESOLVED", "SOURCE_OVERDUE"].includes(s)) ||
    category === "REQUEST_SEPARATE_REVIEWER_PROOF" &&
      selected.signals.includes("SEPARATE_REVIEWER_PROOF_MISSING"));
  const canRecord = active && categoryMatches && !!chosen && chosen[1] >= importedFollowups &&
    environment.installed_windows_witnessed && !!environment.installed_version &&
    environment.access !== "unknown";
  function record() {
    if (!chosen) return;
    try {
      onNotesChange(recordHeldDispositionReassessment(prior, notes, environment,
        { followups: importedFollowups, reassessments: importedReassessments },
        { earlier_followup_index: chosen[0], later_followup_index: chosen[1], category,
          personally_rechecked: rechecked, separate_hold_acknowledged: held }));
      setRechecked(false); setHeld(false);
      setFeedback("Build 174 private HOLD reassessment recorded. No external request, command or approval occurred.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Unable to append private HOLD note."); }
  }
  async function compareEarlier(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]; event.currentTarget.value = "";
    if (!file) return;
    try {
      if (file.size > 7_000_000) throw new Error("Build 173 receipt exceeds 7 MB.");
      const result = compareEarlierReceipt(await file.text());
      setHistorical(`Exact Build 173 historical prefix: ${result.previous_followups} earlier, ${result.new_followups} new of ${result.current_followups}. No reviewer authority inferred.`);
    } catch (error) { setHistorical(error instanceof Error ? error.message : "Invalid Build 173 historical comparison."); }
  }
  return <section className="owner-handoff-reconciliation" aria-label="Build 174 held disposition source recheck and independent reviewer reassessment">
    <header className="owner-trial-ledger-heading"><div>
      <h3>Held disposition source continuity & independent reviewer reassessment</h3>
      <p>Compare later Build 173 private HOLD follow-ups. Claimed owner and source freshness is not independently witnessed hardware proof.</p>
    </div><strong className="owner-trial-hold">INDEPENDENT REVIEW: HOLD</strong></header>
    <CardHelp title="Build 174 held source/reviewer reassessment">
      Match one held case and watch. Count a later owner observation and source check only when each occurred after the earlier follow-up and before the later follow-up. Version, alias and access conflicts remain unresolved until separately witnessed. QL-246 source proof remains PENDING: no independently trusted Ed25519 key, one-time challenge, seven external negative denials or live GET receipts are available here.
    </CardHelp>
    <div className="owner-trial-reconcile-stats">
      <span>{reviews.length} same-watch comparison(s)</span>
      <span>{reviews.filter(item => item.repeated_owner_gap).length} repeated owner gaps</span>
      <span>{reviews.filter(item => item.repeated_source_gap || item.identity_conflict_unresolved).length} source exceptions</span>
      <span>{notes.length} private reassessment(s) · {importedReassessments} historical</span>
      <span>0 signed gateway proofs, messages, commands or approvals</span>
    </div>
    <label>Compare earlier complete Build 173 receipt (read-only)
      <input type="file" accept=".json,application/json" disabled={!active}
        onChange={event => void compareEarlier(event)} />
    </label>
    {historical && <p role="note">{historical}</p>}
    <label className="owner-decision-filter">Manual reassessment filter
      <select value={filter} onChange={event => setFilter(event.target.value as Filter)}>
        <option value="all">All held pairs</option><option value="owner">Owner evidence</option>
        <option value="source">Source evidence</option><option value="overdue">Overdue evidence</option>
        <option value="historical">Imported history</option>
      </select>
    </label>
    {reviews.length === 0 && <p>At least two chronological Build 173 HOLD follow-ups for the same original watch are required.</p>}
    {reviews.length > 0 && visible.length === 0 && <p>No held disposition pairs match this filter.</p>}
    <div className="owner-decision-cards">{visible.map(item => <article key={item.later_followup_index}>
      <strong>{item.case_id} · watch #{item.reassignment_watch_index + 1} · follow-ups #{item.earlier_followup_index + 1} → #{item.later_followup_index + 1}</strong>
      <small>{item.earlier_at} → {item.later_at}</small>
      <p>Later owner: {item.newer_owner_witness_claim ? "claimed, unverified" : "MISSING"}; later distinct source: {item.newer_source_check_claim ? "claimed, unverified" : "MISSING"}; separate reviewer: UNVERIFIED.</p>
      <p>Source age: {item.source_age_days ?? "missing"} days · earlier follow-up age: {item.earlier_followup_age_days} days.</p>
      <p>{item.signals.join("; ").replaceAll("_", " ")}</p>
      {item.later_followup_index < importedFollowups && <small>Historical operator claim only.</small>}
      <button type="button" onClick={() => { setChosen([item.earlier_followup_index, item.later_followup_index]);
        setCategory("CONTINUE_INDEPENDENT_HOLD"); setRechecked(false); setHeld(false); }}>Inspect exact held follow-up pair</button>
    </article>)}</div>
    <fieldset className="owner-review-entry"><legend>Private reassessment · NOT SENT</legend>
      <p>{selected ? `Selected ${selected.case_id}: ${selected.signals.join(", ")}` : "Choose an exact chronological pair."}</p>
      {!canRecord && selected && <p className="owner-trial-warning">Non-imported later follow-up, witnessed installed Windows and separate HOLD review required.</p>}
      <label>Fixed HOLD-only category
        <select value={category} disabled={!selected || !active} onChange={event => {
          setCategory(event.target.value as HeldReassessmentCategory); setRechecked(false); setHeld(false);
        }}>{HELD_REASSESSMENT_CATEGORIES.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select>
      </label>
      <label className="owner-trial-check"><input type="checkbox" checked={rechecked} disabled={!canRecord}
        onChange={event => { setRechecked(event.target.checked); setHeld(false); }} />I personally compared this exact held pair and checked the owner/source timestamps on the installed Windows Hub.</label>
      <label className="owner-trial-check"><input type="checkbox" checked={held} disabled={!canRecord}
        onChange={event => setHeld(event.target.checked)} />I separately acknowledge independent reviewer, field, gateway and Vault HOLDs; QL-246 is PENDING and no owner approval is claimed.</label>
      <button type="button" disabled={!canRecord || !rechecked || !held} onClick={record}>Append private Build 174 reassessment (HOLD)</button>
    </fieldset>
    {notes.map((item, index) => <p key={index}>Reassessment #{index + 1}: follow-ups #{item.earlier_followup_index + 1} → #{item.later_followup_index + 1} · {item.category.replaceAll("_", " ")} · {index < importedReassessments ? "historical" : "local"} · HOLD.</p>)}
    {feedback && <p role="status">{feedback}</p>}
    <p className="owner-trial-privacy">QL-246: no signed public proof, no provisioned operator challenge/pin and no independently witnessed external negative cases. DISCONNECTED · FIELD_ACCEPTANCE_HOLD · INDEPENDENT_REVIEW_HOLD · NOT_AUTHORIZED · Vault 0/6 SECURITY HOLD. No automatic dispatch, remote device or camera access.</p>
  </section>;
}
