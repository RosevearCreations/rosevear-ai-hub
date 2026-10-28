import { useEffect, useState, type ChangeEvent } from "react";
import { CardHelp } from "./CommandShell";
import type { TrialEnvironment } from "./ownerFieldTrial";
import type { ReviewerFollowupReceipt } from "./ownerHeldReviewerFollowup";
import { compareReviewerRenewalTriage, PRIVATE_RUNNER_TRIAGE, recordReviewerRenewalTriage,
  RENEWAL_TRIAGE_CATEGORIES, type RenewalTriageCategory,
  type RenewalTriageNote } from "./ownerReviewerRenewalTriage";

type Filter = "all" | "owner" | "source" | "overdue" | "historical";
export function ReviewerRenewalTriagePanel({ prior, notes, environment,
  importedReviewers, importedTriages, onNotesChange, compareEarlierReceipt,
  active = true }: {
  prior: ReviewerFollowupReceipt;
  notes: RenewalTriageNote[];
  environment: TrialEnvironment;
  importedReviewers: number;
  importedTriages: number;
  onNotesChange: (notes: RenewalTriageNote[]) => void;
  compareEarlierReceipt: (raw: string) => { previous_reviewers: number;
    current_reviewers: number; new_reviewers: number; comparison: unknown };
  active?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [chosen, setChosen] = useState<[number, number] | null>(null);
  const [category, setCategory] = useState<RenewalTriageCategory>("CONTINUE_INDEPENDENT_HOLD");
  const [personallyRechecked, setPersonallyRechecked] = useState(false);
  const [independentHold, setIndependentHold] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [historical, setHistorical] = useState("");
  useEffect(() => { if (!active) { setPersonallyRechecked(false); setIndependentHold(false); } }, [active]);
  const comparisons = prior.reviewer_followups.flatMap((later, index) => {
    if (!index) return [];
    const earlier = prior.reviewer_followups.findIndex((candidate, i) =>
      i < index && candidate.case_id === later.case_id &&
      candidate.reassignment_watch_index === later.reassignment_watch_index &&
      candidate.later_reassessment_index < later.later_reassessment_index &&
      Date.parse(candidate.recorded_at) < Date.parse(later.recorded_at));
    if (earlier < 0) return [];
    try { return [compareReviewerRenewalTriage(prior, earlier, index)]; }
    catch { return []; }
  });
  const visible = comparisons.filter(c => filter === "all" ||
    filter === "owner" && c.signals.some(s => s.includes("OWNER")) ||
    filter === "source" && c.signals.some(s => s.includes("SOURCE")) ||
    filter === "overdue" && c.signals.some(s => s.includes("OVERDUE")) ||
    filter === "historical" && c.later_reviewer_index < importedReviewers);
  const selected = chosen ? comparisons.find(c => c.earlier_reviewer_index === chosen[0] &&
    c.later_reviewer_index === chosen[1]) : null;
  const categoryMatches = !!selected && (category === "CONTINUE_INDEPENDENT_HOLD" ||
    category === "REQUEST_OWNER_REWITNESS" && selected.signals.includes("NEW_OWNER_EVIDENCE_MISSING") ||
    category === "REQUEST_SOURCE_REVALIDATION" && selected.signals.some(s =>
      ["NEW_SOURCE_EVIDENCE_MISSING", "SOURCE_IDENTITY_OR_ACCESS_DRIFT", "SOURCE_RENEWAL_OVERDUE"].includes(s)) ||
    category === "REQUEST_PRIVATE_RUNNER_SCOPE_REVIEW" &&
      selected.signals.includes("PRIVATE_RUNNER_APPROVAL_NOT_SUPPLIED"));
  const canRecord = active && categoryMatches && !!chosen && chosen[1] >= importedReviewers &&
    environment.installed_windows_witnessed && !!environment.installed_version &&
    environment.access !== "unknown";
  function record() {
    if (!chosen) return;
    try {
      onNotesChange(recordReviewerRenewalTriage(prior, notes, environment,
        { reviewers: importedReviewers, triages: importedTriages },
        { earlier_reviewer_index: chosen[0], later_reviewer_index: chosen[1], category,
          personally_rechecked: personallyRechecked, separate_hold_acknowledged: independentHold }));
      setPersonallyRechecked(false); setIndependentHold(false);
      setFeedback("Private Build 176 reviewer renewal triage recorded under HOLD. No private runner, key, gateway or approval was requested.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not append private HOLD triage."); }
  }
  async function compareEarlier(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]; event.currentTarget.value = "";
    if (!file) return;
    try {
      if (file.size > 7_600_000) throw new Error("Build 175 receipt exceeds 7.6 MB.");
      const result = compareEarlierReceipt(await file.text());
      setHistorical(`Exact Build 175 historical prefix: ${result.previous_reviewers} earlier, ${result.new_reviewers} new of ${result.current_reviewers}. No reviewer or owner authorization inferred.`);
    } catch (error) { setHistorical(error instanceof Error ? error.message : "Unsafe Build 175 historical comparison."); }
  }
  return <section className="owner-handoff-reconciliation" aria-label="Build 176 independent reviewer renewal and private runner approval evidence triage">
    <header className="owner-trial-ledger-heading"><div>
      <h3>Reviewer renewal outcome continuity & private runner evidence triage</h3>
      <p>Compare later Build 175 private HOLD reviewer notes and identify missing nonproduction test prerequisites. This does not provide approval.</p>
    </div><strong className="owner-trial-hold">INDEPENDENT REVIEW: HOLD</strong></header>
    <CardHelp title="Build 176 evidence-only QL-248 review">
      Compare same-watch reviewer follow-ups referencing progressively later reassessments. Owner/source timestamps must occur after the earlier reviewer note, and fresh-looking claims remain unauthenticated. QL-248 requires separate audited source SHA S, later immutable proof SHA P, precise proof-byte digest and independently authenticated public Ed25519 pin; its two-SHA amendment needs AI Data Platform consumer acceptance. Phase B private runner tests require separate owner authorization and are not enabled here.
    </CardHelp>
    <div className="owner-trial-reconcile-stats">
      <span>{comparisons.length} comparable held reviewer pair(s)</span>
      <span>{comparisons.filter(c => c.repeated_owner_gap).length} repeated owner gap(s)</span>
      <span>{comparisons.filter(c => c.source_identity_drift || c.repeated_source_gap).length} source identity gap(s)</span>
      <span>{notes.length} private triage(s) · {importedTriages} imported</span>
      <span>QL-248: two-SHA consumer agreement PENDING · runner NOT PROVISIONED</span>
    </div>
    <fieldset className="owner-review-entry"><legend>Private-runner approval evidence inventory · read-only</legend>
      <p>These missing checks identify the next independent operator tasks. No control below can issue a credential or approve a pilot.</p>
      <ul>{PRIVATE_RUNNER_TRIAGE.map(item => <li key={item.check}>
        <strong>{item.state}</strong> — {item.check}
      </li>)}</ul>
    </fieldset>
    <label>Compare earlier complete Build 175 receipt (read-only)
      <input type="file" accept=".json,application/json" disabled={!active}
        onChange={event => void compareEarlier(event)} />
    </label>
    {historical && <p role="note">{historical}</p>}
    <label className="owner-decision-filter">Manual reviewer renewal filter
      <select value={filter} onChange={e => setFilter(e.target.value as Filter)}>
        <option value="all">All held pairs</option><option value="owner">Owner gaps</option>
        <option value="source">Source gaps</option><option value="overdue">Overdue</option>
        <option value="historical">Imported history</option>
      </select>
    </label>
    {comparisons.length === 0 && <p>Two chronological Build 175 reviewer follow-ups referencing progressively later held reassessments are required.</p>}
    {comparisons.length > 0 && visible.length === 0 && <p>No reviewer renewal pairs match this filter.</p>}
    <div className="owner-decision-cards">{visible.map(c => <article key={c.later_reviewer_index}>
      <strong>{c.case_id} · watch #{c.reassignment_watch_index + 1} · reviewer notes #{c.earlier_reviewer_index + 1} → #{c.later_reviewer_index + 1}</strong>
      <small>{c.earlier_at} → {c.later_at}</small>
      <p>New owner claim: {c.newer_owner_witness_claim ? "unverified" : "MISSING"}; new source: {c.newer_distinct_source_claim ? "unverified" : "MISSING"}; separate reviewer proof: MISSING.</p>
      <p>Source age {c.source_age_days ?? "missing"} days · earlier review age {c.earlier_review_age_days} days.</p>
      <p>{c.signals.join("; ").replaceAll("_", " ")}</p>
      {c.later_reviewer_index < importedReviewers && <small>Imported historical claim only.</small>}
      <button type="button" onClick={() => { setChosen([c.earlier_reviewer_index, c.later_reviewer_index]);
        setCategory("CONTINUE_INDEPENDENT_HOLD"); setPersonallyRechecked(false); setIndependentHold(false); }}>
        Inspect exact reviewer renewal pair</button>
    </article>)}</div>
    <fieldset className="owner-review-entry"><legend>Private reviewer renewal triage · NOT SENT</legend>
      <p>{selected ? `${selected.case_id}: ${selected.signals.join(", ")}` : "Choose an exact chronological reviewer pair."}</p>
      {!canRecord && selected && <p className="owner-trial-warning">Non-imported later review, witnessed installed Windows and two separate HOLD acknowledgments required.</p>}
      <label>Fixed HOLD-only category
        <select value={category} disabled={!selected || !active} onChange={e => {
          setCategory(e.target.value as RenewalTriageCategory); setPersonallyRechecked(false); setIndependentHold(false);
        }}>{RENEWAL_TRIAGE_CATEGORIES.map(v => <option key={v} value={v}>{v.replaceAll("_", " ")}</option>)}</select>
      </label>
      <label className="owner-trial-check"><input type="checkbox" checked={personallyRechecked} disabled={!canRecord}
        onChange={e => { setPersonallyRechecked(e.target.checked); setIndependentHold(false); }} />I personally rechecked the exact held reviewer pair and private owner/source timestamps on installed Windows.</label>
      <label className="owner-trial-check"><input type="checkbox" checked={independentHold} disabled={!canRecord}
        onChange={e => setIndependentHold(e.target.checked)} />I separately acknowledge private runner NOT AUTHORIZED, QL-248 signed proof PENDING, field/independent reviewer HOLDs and Vault 0/6 SECURITY HOLD.</label>
      <button type="button" disabled={!canRecord || !personallyRechecked || !independentHold} onClick={record}>Append private Build 176 reviewer renewal triage (HOLD)</button>
    </fieldset>
    {notes.map((n, index) => <p key={index}>Triage #{index + 1}: reviewer notes #{n.earlier_reviewer_index + 1} → #{n.later_reviewer_index + 1} · {n.category.replaceAll("_", " ")} · {index < importedTriages ? "historical" : "local"} · HOLD.</p>)}
    {feedback && <p role="status">{feedback}</p>}
    <p className="owner-trial-privacy">QL-248 source-proof amendment is a proposed contract, not permission to connect. No signed source-proof file, no approved private runner, no HMAC/Ed25519 secret, no external negative witnesses, no authorized gateway GET, and no live business or household controls. DISCONNECTED · FIELD_ACCEPTANCE_HOLD · INDEPENDENT_REVIEW_HOLD · NOT_AUTHORIZED · Vault 0/6 SECURITY HOLD.</p>
  </section>;
}
