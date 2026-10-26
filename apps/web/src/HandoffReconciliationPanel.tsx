import { useEffect, useState, type ChangeEvent } from "react";
import { CardHelp } from "./CommandShell";
import { type TrialEnvironment } from "./ownerFieldTrial";
import { type OverdueHandoffEvidence } from "./ownerOverdueHandoff";
import { type RepeatTrialEvidenceLink } from "./ownerRepeatTrialReassessment";
import { HANDOFF_FOLLOWUP_CATEGORIES, compareIndependentHandoffs, recordHandoffFollowup,
  type HandoffComparison, type HandoffFollowupCategory, type HandoffFollowupEvent } from "./ownerHandoffReconciliation";

type WatchFilter = "all" | "recurring" | "aged" | "historical";

/** Owner/Admin System child. All reconciliation stays private and locally witnessed. */
export function HandoffReconciliationPanel({ handoffs, links, followupReviews, environment, importedHandoffs,
  importedReviews, onFollowupReviewsChange, compareEarlierReceipt, active = true }: {
  handoffs: readonly OverdueHandoffEvidence[];
  links: readonly RepeatTrialEvidenceLink[];
  followupReviews: HandoffFollowupEvent[];
  environment: TrialEnvironment;
  importedHandoffs: number;
  importedReviews: number;
  onFollowupReviewsChange: (items: HandoffFollowupEvent[]) => void;
  compareEarlierReceipt: (raw: string) => { previous_handoffs: number; current_handoffs: number;
    new_handoffs: number; comparison: HandoffComparison | null };
  active?: boolean;
}) {
  const [filter, setFilter] = useState<WatchFilter>("all");
  const [baseline, setBaseline] = useState(0);
  const [latest, setLatest] = useState(1);
  const [reason, setReason] = useState<HandoffFollowupCategory>("REQUEST_INDEPENDENT_RECHECK");
  const [compared, setCompared] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [priorCheck, setPriorCheck] = useState<ReturnType<typeof compareEarlierReceipt> | null>(null);
  useEffect(() => { if (!active) { setCompared(false); setAcknowledged(false); } }, [active]);

  const comparisons: (HandoffComparison & { historical: boolean })[] = [];
  handoffs.forEach((next, index) => {
    const first = handoffs.findIndex((item, earlier) => earlier < index &&
      item.decision_index === next.decision_index && Date.parse(item.captured_at) < Date.parse(next.captured_at));
    if (first < 0) return;
    try {
      comparisons.push({ ...compareIndependentHandoffs(handoffs, first, index), historical: index < importedHandoffs });
    } catch { /* A malformed in-session pair never implies authorized reviewer evidence. */ }
  });
  const filtered = comparisons.filter(item => filter === "all" ||
    filter === "recurring" && item.discrepancies.some(key => key !== "INDEPENDENT_FOLLOWUP_AGED") ||
    filter === "aged" && item.original_followup_age_days >= 3 ||
    filter === "historical" && item.historical);
  let selected: HandoffComparison | null = null;
  try { selected = compareIndependentHandoffs(handoffs, baseline, latest); } catch { /* Require explicit pair. */ }
  const canRecord = !!selected && latest >= importedHandoffs &&
    environment.installed_windows_witnessed && environment.access !== "unknown" &&
    environment.installed_version === links[handoffs[latest]?.link_index]?.installed_version &&
    active && HANDOFF_FOLLOWUP_CATEGORIES.includes(reason) &&
    (reason === "REQUEST_INDEPENDENT_RECHECK" ||
      reason === "REQUEST_REOPENED_TRIAL_WITNESS" && selected.discrepancies.some(item =>
        item === "REOPENED_TRIAL_CHANGED" || item === "OWNER_TRIAL_CHANGED") ||
      reason === "REQUEST_SOURCE_ALIAS_WITNESS" && selected.discrepancies.includes("SOURCE_ALIAS_STATE_CHANGED"));

  function selectPair(first: number, second: number) {
    setBaseline(first);
    setLatest(second);
    setReason("REQUEST_INDEPENDENT_RECHECK");
    setCompared(false);
    setAcknowledged(false);
    setFeedback("");
  }

  function prepare() {
    try {
      const updated = recordHandoffFollowup(handoffs, links, followupReviews, environment,
        { handoffs: importedHandoffs, reviews: importedReviews },
        { baseline_handoff_index: baseline, latest_handoff_index: latest, category: reason,
          personally_compared: compared, hold_acknowledged: acknowledged });
      onFollowupReviewsChange(updated);
      setCompared(false);
      setAcknowledged(false);
      setFeedback("Exact private follow-up recorded locally as unverified HOLD evidence. No message, schedule, escalation, assignment or closure occurred.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not record private HOLD follow-up."); }
  }

  async function comparePrevious(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setPriorCheck(null);
    try {
      if (file.size > 1_200_000) throw new Error("An earlier Build 156 receipt exceeds its 1.2 MB private limit.");
      const result = compareEarlierReceipt(await file.text());
      setPriorCheck(result);
      setFeedback("Exact append-only receipt prefix matched. This comparison is informational and does not authenticate a reviewer, installed device, source alias or prior acceptance.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Earlier receipt did not match this private history."); }
  }

  return <section className="owner-handoff-reconciliation" aria-label="Build 157 independent handoff receipt reconciliation and recurrence aging">
    <header className="owner-trial-ledger-heading">
      <div><h3>Handoff receipt reconciliation & recurrence follow-up aging</h3>
        <p>Compare successive private Build 156 handoffs by their exact decision, trial and source-check indices. Follow-up age is measured from the original private handoff, not from a new import or export.</p></div>
      <strong className="owner-trial-hold">INDEPENDENT REVIEW: HOLD</strong>
    </header>
    <CardHelp title="Independent follow-up is never automatic">
      A previous JSON receipt is an unverified historical claim. Only a strict append-only prefix can be compared with a newer receipt. No copied claim authenticates hardware, sends a packet, closes a case or releases the password/document Vault. Aging is recalculated on screen, without a timer or notification.
    </CardHelp>
    <div className="owner-trial-reconcile-stats" aria-label="Build 157 handoff reconciliation totals">
      <span>{comparisons.length} successive handoff comparison(s)</span>
      <span>{comparisons.filter(item => item.discrepancies.some(key => key !== "INDEPENDENT_FOLLOWUP_AGED")).length} changed owner/source claim(s)</span>
      <span>{comparisons.filter(item => item.original_followup_age_days >= 3).length} aged follow-up(s)</span>
      <span>{followupReviews.length} private note(s), {importedReviews} historical import(s)</span>
      <span>0 sent, scheduled, independently approved or closed</span>
    </div>
    <label>Compare an earlier exported Build 156 private receipt against our current chain (read-only; no merge)
      <input type="file" accept=".json,application/json" disabled={!active}
        onChange={event => void comparePrevious(event)} />
    </label>
    {priorCheck && <p role="note">Verified structural prefix only: {priorCheck.previous_handoffs} older snapshot(s),
      {" "}{priorCheck.new_handoffs} newer snapshot(s). {priorCheck.comparison ?
        `Common decision #${priorCheck.comparison.decision_index + 1}; changed evidence: ${priorCheck.comparison.discrepancies.join(", ") || "none"}.` :
        "No same-decision handoff pair crossed these two exports."} All evidence remains unauthenticated and on HOLD.</p>}
    <label className="owner-decision-filter">Manual follow-up filter
      <select value={filter} onChange={event => setFilter(event.target.value as WatchFilter)}>
        <option value="all">All successive handoff pairs</option>
        <option value="recurring">Changed trial, owner or source claim</option>
        <option value="aged">Outstanding at least 3 full days</option>
        <option value="historical">Imported comparison history</option>
      </select>
    </label>
    {comparisons.length === 0 && <p>Two separate Build 156 private handoffs on the same exact decision are needed before historical follow-up can be compared. All independent reviews stay on HOLD.</p>}
    {comparisons.length > 0 && filtered.length === 0 && <p>No successive handoff comparisons match this manual filter.</p>}
    <div className="owner-decision-cards">
      {filtered.map(item => <article key={item.latest_handoff_index} className={latest === item.latest_handoff_index &&
        baseline === item.baseline_handoff_index ? "owner-reassessment-selected" : ""}>
        <strong>Decision #{item.decision_index + 1} · {item.case_id.replaceAll("_", " ")} · private handoffs #{item.baseline_handoff_index + 1} → #{item.latest_handoff_index + 1}</strong>
        <small>Original decision {item.original_decision_at} · first handoff {item.baseline_handoff_at} · later handoff {item.latest_handoff_at}</small>
        <p>Outstanding from first handoff: {item.original_followup_age_days} full day(s) · {item.followup_age_band.replaceAll("_", " ")}. Later handoff: {item.latest_handoff_age_days} full day(s) old.</p>
        <p>Changed evidence: {item.discrepancies.length ? item.discrepancies.map(key => key.replaceAll("_", " ")).join("; ") : "No changed indices; independent follow-up is still unverified."}</p>
        {item.historical && <small>Imported historical HOLD evidence only — cannot authorize a new review.</small>}
        <button type="button" onClick={() => selectPair(item.baseline_handoff_index, item.latest_handoff_index)}>
          Inspect exact comparison
        </button>
      </article>)}
    </div>
    <fieldset className="owner-review-entry">
      <legend>Record private independent follow-up (not sent)</legend>
      <p>{selected ? `Decision #${selected.decision_index + 1}: ${selected.followup_age_band}, ${selected.original_followup_age_days} full days since handoff #${baseline + 1}. Later owner/source changes: ${selected.discrepancies.join(", ") || "none"}.` :
        "Select two chronological private snapshots of the same exact decision."}</p>
      {selected && !canRecord && <p role="note" className="owner-trial-warning">An imported latest handoff, unwitnessed Windows context or unmatched reason cannot create fresh reviewer evidence. Older claims stay historical.</p>}
      <label>Fixed private follow-up reason
        <select value={reason} disabled={!selected || !active} onChange={event => { setReason(event.target.value as HandoffFollowupCategory);
          setCompared(false); setAcknowledged(false); }}>
          <option value="REQUEST_INDEPENDENT_RECHECK">Independent HOLD recheck requested (private)</option>
          <option value="REQUEST_REOPENED_TRIAL_WITNESS">Reopened trial needs new personal witness</option>
          <option value="REQUEST_SOURCE_ALIAS_WITNESS">Source alias needs new personal witness</option>
        </select>
      </label>
      <label className="owner-trial-check"><input type="checkbox" checked={compared} disabled={!canRecord}
        onChange={event => { setCompared(event.target.checked); setAcknowledged(false); }} />I personally compared both exact handoff snapshots against our actual installed Windows Hub and contradictory owner/source evidence.</label>
      <label className="owner-trial-check"><input type="checkbox" checked={acknowledged} disabled={!canRecord}
        onChange={event => setAcknowledged(event.target.checked)} />I acknowledge the follow-up is a private, unverified NOT SENT claim; no automatic action, independent acceptance, closure or Vault access is authorized.</label>
      <button type="button" disabled={!canRecord || !compared || !acknowledged} onClick={prepare}>
        Record private HOLD follow-up (not sent)
      </button>
    </fieldset>
    {feedback && <p role="status" className="owner-trial-feedback">{feedback}</p>}
    <p className="owner-trial-privacy">Build 157 stores bounded, append-only private note indices and advisory age only. Prior private JSON comparison is read-only and locally processed. No notifications, background work, credential storage, case closure or automatic dispatch. FIELD_ACCEPTANCE_HOLD · INDEPENDENT_REVIEW_HOLD · NOT_AUTHORIZED. First-party Vault: 0/6 verified · SECURITY HOLD.</p>
  </section>;
}
