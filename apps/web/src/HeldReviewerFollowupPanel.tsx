import { useEffect, useState, type ChangeEvent } from "react";
import { CardHelp } from "./CommandShell";
import type { TrialEnvironment } from "./ownerFieldTrial";
import type { HeldReassessmentReceipt } from "./ownerHeldDispositionReassessment";
import { compareHeldReviewerFollowups, recordHeldReviewerFollowup,
  REVIEWER_FOLLOWUP_CATEGORIES, type ReviewerFollowupCategory,
  type ReviewerFollowupNote } from "./ownerHeldReviewerFollowup";

type Filter = "all" | "owner" | "source" | "overdue" | "historical";
export function HeldReviewerFollowupPanel({ prior, notes, environment,
  importedReassessments, importedFollowups, onNotesChange, compareEarlierReceipt,
  active = true }: {
  prior: HeldReassessmentReceipt;
  notes: ReviewerFollowupNote[];
  environment: TrialEnvironment;
  importedReassessments: number;
  importedFollowups: number;
  onNotesChange: (notes: ReviewerFollowupNote[]) => void;
  compareEarlierReceipt: (raw: string) => {
    previous_reassessments: number; current_reassessments: number;
    new_reassessments: number; comparison: unknown };
  active?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [chosen, setChosen] = useState<[number, number] | null>(null);
  const [category, setCategory] = useState<ReviewerFollowupCategory>("CONTINUE_INDEPENDENT_HOLD");
  const [reviewed, setReviewed] = useState(false);
  const [held, setHeld] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [historical, setHistorical] = useState("");
  useEffect(() => { if (!active) { setReviewed(false); setHeld(false); } }, [active]);
  const comparisons = prior.held_disposition_reassessments.flatMap((later, index) => {
    if (!index) return [];
    const earlier = prior.held_disposition_reassessments.findIndex((candidate, i) =>
      i < index && candidate.case_id === later.case_id &&
      candidate.reassignment_watch_index === later.reassignment_watch_index &&
      candidate.later_followup_index < later.later_followup_index &&
      Date.parse(candidate.recorded_at) < Date.parse(later.recorded_at));
    if (earlier < 0) return [];
    try { return [compareHeldReviewerFollowups(prior, earlier, index)]; }
    catch { return []; }
  });
  const visible = comparisons.filter(item => filter === "all" ||
    filter === "owner" && item.signals.some(s => s.includes("OWNER")) ||
    filter === "source" && item.signals.some(s => s.includes("SOURCE")) ||
    filter === "overdue" && item.signals.some(s => s.includes("OVERDUE")) ||
    filter === "historical" && item.later_reassessment_index < importedReassessments);
  const selected = chosen ? comparisons.find(c => c.earlier_reassessment_index === chosen[0] &&
    c.later_reassessment_index === chosen[1]) : null;
  const categoryMatches = !!selected && (category === "CONTINUE_INDEPENDENT_HOLD" ||
    category === "REQUEST_SEPARATE_REVIEWER" && selected.signals.includes("INDEPENDENT_REVIEWER_EVIDENCE_MISSING") ||
    category === "REQUEST_OWNER_REWITNESS" && selected.signals.includes("LATER_OWNER_CLAIM_MISSING") ||
    category === "REQUEST_OVERDUE_SOURCE_RENEWAL" && selected.signals.includes("OVERDUE_SOURCE_RENEWAL"));
  const canRecord = active && categoryMatches && !!chosen && chosen[1] >= importedReassessments &&
    environment.installed_windows_witnessed && !!environment.installed_version &&
    environment.access !== "unknown";
  function record() {
    if (!chosen) return;
    try {
      onNotesChange(recordHeldReviewerFollowup(prior, notes, environment,
        { reassessments: importedReassessments, followups: importedFollowups },
        { earlier_reassessment_index: chosen[0], later_reassessment_index: chosen[1],
          category, owner_evidence_rechecked: reviewed, independent_hold_acknowledged: held }));
      setReviewed(false); setHeld(false);
      setFeedback("Build 175 local reviewer follow-up recorded under HOLD. No source, gateway or owner authorization was contacted.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Unable to record private HOLD follow-up."); }
  }
  async function compareEarlier(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]; event.currentTarget.value = "";
    if (!file) return;
    try {
      if (file.size > 7_300_000) throw new Error("Build 174 receipt exceeds 7.3 MB.");
      const result = compareEarlierReceipt(await file.text());
      setHistorical(`Exact Build 174 historical prefix: ${result.previous_reassessments} earlier, ${result.new_reassessments} new of ${result.current_reassessments}. Reviewer proof still missing.`);
    } catch (error) { setHistorical(error instanceof Error ? error.message : "Unsafe Build 174 historical comparison."); }
  }
  return <section className="owner-handoff-reconciliation" aria-label="Build 175 held independent reviewer follow-up and overdue source renewal">
    <header className="owner-trial-ledger-heading"><div>
      <h3>Independent reviewer follow-up & overdue owner/source renewal</h3>
      <p>Recheck later private Build 174 HOLD reassessments. An app operator's comparison cannot provide an independent reviewer signature.</p>
    </div><strong className="owner-trial-hold">INDEPENDENT REVIEW: HOLD</strong></header>
    <CardHelp title="Build 175 reviewer and QL-247 readiness">
      Compare two chronological reassessments for the same held watch with a genuinely newer underlying disposition follow-up. Owner/source dates must fall after the earlier reassessment and before the later one. Manual age bands never trigger a timer. QL-247 Phase A returns public source provenance and honest PENDING evidence; Phase B needs separately approved private runner, nonproduction secrets and independent observed denials. No live pilot or device access is authorized.
    </CardHelp>
    <div className="owner-trial-reconcile-stats">
      <span>{comparisons.length} same-watch private pair(s)</span>
      <span>{comparisons.filter(c => c.repeated_owner_gap).length} repeated owner gap(s)</span>
      <span>{comparisons.filter(c => c.source_identity_conflict || c.repeated_source_gap).length} source identity exception(s)</span>
      <span>{notes.length} local follow-up(s) · {importedFollowups} imported</span>
      <span>QL-247 PRIVATE RUNNER: NOT PROVISIONED · no verified GETs</span>
    </div>
    <label>Compare earlier complete Build 174 receipt (read-only)
      <input type="file" accept=".json,application/json" disabled={!active}
        onChange={event => void compareEarlier(event)} />
    </label>
    {historical && <p role="note">{historical}</p>}
    <label className="owner-decision-filter">Manual reviewer follow-up filter
      <select value={filter} onChange={event => setFilter(event.target.value as Filter)}>
        <option value="all">All held pairs</option><option value="owner">Owner gaps</option>
        <option value="source">Source gaps</option><option value="overdue">Overdue</option>
        <option value="historical">Imported history</option>
      </select>
    </label>
    {comparisons.length === 0 && <p>Two chronological Build 174 reassessments referencing progressively later follow-ups for the same watch are required.</p>}
    {comparisons.length > 0 && !visible.length && <p>No held reviewer pairs match this filter.</p>}
    <div className="owner-decision-cards">{visible.map(c => <article key={c.later_reassessment_index}>
      <strong>{c.case_id} · watch #{c.reassignment_watch_index + 1} · reassessments #{c.earlier_reassessment_index + 1} → #{c.later_reassessment_index + 1}</strong>
      <small>{c.earlier_at} → {c.later_at}</small>
      <p>Later owner claim: {c.later_owner_claim ? "unverified" : "MISSING"}; later source: {c.later_distinct_source_claim ? "unverified" : "MISSING"}; independent reviewer: MISSING.</p>
      <p>Source age {c.source_age_days ?? "missing"} days · earlier reviewer age {c.earlier_review_age_days} days.</p>
      <p>{c.signals.join("; ").replaceAll("_", " ")}</p>
      {c.later_reassessment_index < importedReassessments && <small>Imported historical claim only.</small>}
      <button type="button" onClick={() => { setChosen([c.earlier_reassessment_index, c.later_reassessment_index]);
        setCategory("CONTINUE_INDEPENDENT_HOLD"); setReviewed(false); setHeld(false); }}>
        Inspect exact held reviewer pair</button>
    </article>)}</div>
    <fieldset className="owner-review-entry"><legend>Private reviewer follow-up · NOT SENT</legend>
      <p>{selected ? `${selected.case_id}: ${selected.signals.join(", ")}` : "Choose one exact held reassessment pair."}</p>
      {!canRecord && selected && <p className="owner-trial-warning">Non-imported later reassessment, witnessed Windows and separate HOLD review are mandatory.</p>}
      <label>Fixed HOLD-only category
        <select value={category} disabled={!selected || !active} onChange={e => {
          setCategory(e.target.value as ReviewerFollowupCategory); setReviewed(false); setHeld(false);
        }}>{REVIEWER_FOLLOWUP_CATEGORIES.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select>
      </label>
      <label className="owner-trial-check"><input type="checkbox" checked={reviewed} disabled={!canRecord}
        onChange={e => { setReviewed(e.target.checked); setHeld(false); }} />I personally compared the exact owner/source evidence and chronological reassessments on the installed Windows Hub.</label>
      <label className="owner-trial-check"><input type="checkbox" checked={held} disabled={!canRecord}
        onChange={e => setHeld(e.target.checked)} />I separately acknowledge independent reviewer, field, gateway, QL-247 private runner and Vault security HOLDs. No authorization is granted.</label>
      <button type="button" disabled={!canRecord || !reviewed || !held} onClick={record}>Append private Build 175 reviewer follow-up (HOLD)</button>
    </fieldset>
    {notes.map((note, index) => <p key={index}>Reviewer follow-up #{index + 1}: reassessments #{note.earlier_reassessment_index + 1} → #{note.later_reassessment_index + 1} · {note.category.replaceAll("_", " ")} · {index < importedFollowups ? "historical" : "local"} · HOLD.</p>)}
    {feedback && <p role="status">{feedback}</p>}
    <p className="owner-trial-privacy">QL-247 PHASE A: PENDING · PRIVATE TEST RUNNER: NOT PROVISIONED · HMAC: NOT PROVISIONED · SIGNER PIN: UNVERIFIED · NEGATIVE DENIALS: UNVERIFIED · DISCONNECTED. No cameras, passwords, LAN addresses, device actuation, reservations, billing, SMS, dispatch or live pilot approval. FIELD_ACCEPTANCE_HOLD · INDEPENDENT_REVIEW_HOLD · NOT_AUTHORIZED · Vault 0/6 SECURITY HOLD.</p>
  </section>;
}
