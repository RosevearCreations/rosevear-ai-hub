import { useEffect, useState } from "react";
import { CardHelp } from "./CommandShell";
import { type TrialCaseId, type TrialEnvironment, type TrialObservation } from "./ownerFieldTrial";
import { type RepairHandoff } from "./ownerTrialReconciliation";
import { type ReviewEvidenceEvent } from "./ownerIndependentReview";
import { type SourceIdentityCheck } from "./ownerFieldRouting";
import { type IndependentHoldReassessment, type RepeatTrialEvidenceLink } from "./ownerRepeatTrialReassessment";
import { type OwnerEvidenceFollowup } from "./ownerReassessmentFollowup";
import { deriveFollowupDecisionReplay, recordFollowupDecision, type DecisionChoice,
  type FollowupDecision } from "./ownerFollowupDecisionReplay";

type ReplayFilter = "all" | "recurring" | "source" | "reviewer" | "imported";
const decisions: { value: DecisionChoice; label: string }[] = [
  { value: "REPEAT_TRIAL_REQUESTED", label: "Request a new safe owner trial" },
  { value: "RECHECK_SOURCE_IDENTITY", label: "Request private source identity recheck" },
  { value: "RECONCILE_REVIEWER_CONTRADICTION", label: "Reconcile independent evidence contradiction" },
  { value: "OWNER_NOTE_REQUIRED", label: "Request fresh owner evidence note" },
  { value: "INDEPENDENT_FIELD_HOLD_REVIEW", label: "Continue independent field HOLD review" },
];

export function FollowupDecisionReplayPanel({ history, checks, links, reassessments, environment,
  handoffs, reviews, followups, reviewDecisions, importedTrials, importedChecks, importedReviews,
  importedLinks, importedReassessments, importedFollowups, importedDecisions, onDecisionsChange,
  onChooseCase, onNavigate, active = true }: {
  history: readonly TrialObservation[]; checks: readonly SourceIdentityCheck[];
  links: readonly RepeatTrialEvidenceLink[]; reassessments: readonly IndependentHoldReassessment[];
  environment: TrialEnvironment; handoffs: readonly RepairHandoff[]; reviews: readonly ReviewEvidenceEvent[];
  followups: readonly OwnerEvidenceFollowup[]; reviewDecisions: FollowupDecision[];
  importedTrials: number; importedChecks: number; importedReviews: number; importedLinks: number;
  importedReassessments: number; importedFollowups: number; importedDecisions: number;
  onDecisionsChange: (updated: FollowupDecision[]) => void;
  onChooseCase: (id: TrialCaseId) => void; onNavigate: (section: string) => void; active?: boolean;
}) {
  const [filter, setFilter] = useState<ReplayFilter>("all");
  const [selected, setSelected] = useState("");
  const [choice, setChoice] = useState<DecisionChoice>("INDEPENDENT_FIELD_HOLD_REVIEW");
  const [personallyReviewed, setPersonallyReviewed] = useState(false);
  const [separateReviewer, setSeparateReviewer] = useState(false);
  const [feedback, setFeedback] = useState("");
  useEffect(() => { if (!active) { setPersonallyReviewed(false); setSeparateReviewer(false); } }, [active]);

  const imported = { trials: importedTrials, checks: importedChecks, reviews: importedReviews,
    links: importedLinks, reassessments: importedReassessments, followups: importedFollowups,
    decisions: importedDecisions };
  const replay = deriveFollowupDecisionReplay(history, checks, links, followups, reviewDecisions,
    environment, handoffs, reviews, reassessments, imported);
  const visible = replay.filter(item => filter === "all" ||
    (filter === "recurring" && item.review_priority === "RECURRING_HOLD_RECHECK") ||
    (filter === "source" && item.recurrence.some(signal => ["SOURCE_IDENTITY_RECURRENCE",
      "WINDOWS_RECHECK", "SUPERSEDED_TRIAL"].includes(signal))) ||
    (filter === "reviewer" && item.recurrence.some(signal => ["REVIEWER_CONTRADICTION",
      "REPEATED_REVIEW_DECISION", "EVIDENCE_STATUS_CHANGED"].includes(signal))) ||
    (filter === "imported" && item.source_imported));
  const selectedRow = replay.find(item => `${item.link_index}:${item.criterion}` === selected);
  const alreadyReviewed = !!selectedRow && reviewDecisions.some(item =>
    item.source_followup_index === selectedRow.source_followup_index);
  const importedSource = !!selectedRow && (selectedRow.source_followup_index < importedFollowups ||
    selectedRow.link_index < importedLinks);

  function select(linkIndex: number, criterion: string) {
    const row = replay.find(item => item.link_index === linkIndex && item.criterion === criterion);
    setSelected(`${linkIndex}:${criterion}`);
    setChoice(row?.suggested_action ?? "INDEPENDENT_FIELD_HOLD_REVIEW");
    setPersonallyReviewed(false);
    setSeparateReviewer(false);
    setFeedback("");
  }

  function record() {
    if (!selectedRow) { setFeedback("Select an exact current follow-up note first."); return; }
    try {
      const updated = recordFollowupDecision(history, checks, links, followups, reviewDecisions,
        environment, handoffs, reviews, reassessments, imported,
        { source_followup_index: selectedRow.source_followup_index, decision: choice,
          personally_reviewed: personallyReviewed, separate_reviewer: separateReviewer });
      onDecisionsChange(updated);
      setPersonallyReviewed(false);
      setSeparateReviewer(false);
      setFeedback("Independent follow-up decision noted locally as a private unverified claim. No action was sent; all physical and independent holds remain.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not record independent decision replay.");
    }
  }

  return <section className="owner-decision-replay" aria-label="Build 154 independent follow-up decision replay and recurrence oversight">
    <header className="owner-trial-ledger-heading">
      <div><h3>Follow-up decision replay & recurrence oversight</h3>
        <p>Revisit the exact Build 153 owner note, compare earlier and current evidence classifications, and surface repeat decisions or source contradictions for separate manual review.</p></div>
      <strong className="owner-trial-hold">CLOSURE: NOT AUTHORIZED</strong>
    </header>
    <CardHelp title="Replay does not certify the Windows installation">
      Historical timestamps, safe aliases and reviewer checkboxes are private operator claims, not authenticated devices or signed decisions.
      Repeated notes never become automatic tasks. A separate reviewer can write only an explicitly witnessed HOLD-labelled decision,
      not approve a repaired camera, MQTT action, startup task, workshop device or password Vault.
    </CardHelp>
    <div className="owner-trial-reconcile-stats" aria-label="Build 154 recurrence totals">
      <span>{replay.length} exact follow-up topics</span>
      <span>{replay.filter(row => row.review_priority === "RECURRING_HOLD_RECHECK").length} recurrence rechecks</span>
      <span>{reviewDecisions.length} private reviewer notes ({importedDecisions} imported)</span>
      <span>0 dispatches or approvals</span>
    </div>
    <label className="owner-decision-filter">Review scope
      <select value={filter} onChange={event => { setFilter(event.target.value as ReplayFilter); setPersonallyReviewed(false); setSeparateReviewer(false); }}>
        <option value="all">All exact owner follow-ups</option>
        <option value="recurring">Repeated or contradicted</option>
        <option value="source">Source, Windows or superseded trial</option>
        <option value="reviewer">Reviewer or evidence status change</option>
        <option value="imported">Includes imported historical claims</option>
      </select>
    </label>
    {followups.length === 0 && <p>There are no Build 153 owner follow-up notes. Review an exact prior exception and record its manual HOLD note before replaying decisions here.</p>}
    {followups.length > 0 && visible.length === 0 && <p>No exact follow-up topics match this filter. This does not clear physical or independent review holds.</p>}
    <div className="owner-decision-cards">
      {visible.map(row => {
        const key = `${row.link_index}:${row.criterion}`;
        return <article key={key} className={selected === key ? "owner-reassessment-selected" : ""}>
          <strong>Link #{row.link_index + 1} · {row.case_id.replaceAll("_", " ")} · {row.criterion.replaceAll("_", " ")}</strong>
          <small>{row.review_priority.replaceAll("_", " ")} · original link {row.first_linked_at}</small>
          <p>Owner note #1: {row.first_owner_note_at} · newest {row.latest_owner_note_at}</p>
          <p><strong>{row.owner_notes}</strong> owner note(s) · <strong>{row.decisions}</strong> independent decision(s)</p>
          <p>Old: {row.historical_status.replaceAll("_", " ")} · current: {row.current_status.replaceAll("_", " ")}</p>
          <p>Latest decision: {row.latest_decision ? row.latest_decision.replaceAll("_", " ") : "not yet recorded"}</p>
          <p>Recurrence: {row.recurrence.length ? row.recurrence.map(item => item.replaceAll("_", " ")).join(" · ") : "no additional signal; field HOLD remains"}</p>
          {row.source_imported && <small>Imported evidence in chain · fresh Windows witnessing required</small>}
          <div className="owner-trial-row-actions">
            <CardHelp title="Historical and current status boundaries">Every status shown is an unverified operator classification. Changing the status does not erase a past contradiction or confer independent approval.</CardHelp>
            <button type="button" onClick={() => { onChooseCase(row.case_id); setPersonallyReviewed(false); }}>Prepare owner recheck</button>
            <button type="button" onClick={() => { onNavigate(row.section); setPersonallyReviewed(false); }}>Open {row.section}</button>
            <button type="button" onClick={() => select(row.link_index, row.criterion)}>Review exact latest note</button>
          </div>
        </article>;
      })}
    </div>
    <fieldset className="owner-review-entry">
      <legend>Independent manual decision replay (private HOLD only)</legend>
      <p>{selectedRow ? `Selected: owner note #${selectedRow.source_followup_index + 1}, ${selectedRow.case_id}, ${selectedRow.criterion}. ${selectedRow.review_priority.replaceAll("_", " ")}.` : "Select a linked follow-up topic to review the latest exact note."}</p>
      {importedSource && <p className="owner-trial-warning" role="note">Imported owner notes or links are historical claims. Record a fresh witnessed owner note before preparing a new independent decision.</p>}
      {alreadyReviewed && <p>That exact latest note already has a private independent decision; create a newly witnessed owner follow-up before reviewing again.</p>}
      <label>Manual reviewer decision (no execution)
        <select value={choice} disabled={!selectedRow || alreadyReviewed || importedSource} onChange={event => {
          setChoice(event.target.value as DecisionChoice); setPersonallyReviewed(false); setSeparateReviewer(false);
        }}>
          {decisions.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      <label className="owner-trial-check"><input type="checkbox" checked={separateReviewer}
        disabled={!selectedRow || alreadyReviewed || importedSource || !active}
        onChange={event => { setSeparateReviewer(event.target.checked); setPersonallyReviewed(false); }} />A separate reviewer personally inspected the latest private owner note (unverified self-attestation).</label>
      <label className="owner-trial-check"><input type="checkbox" checked={personallyReviewed}
        disabled={!selectedRow || alreadyReviewed || importedSource || !active}
        onChange={event => setPersonallyReviewed(event.target.checked)} />I personally compared original, current and recurring evidence and understand this will not certify or close the case.</label>
      <button type="button" disabled={!active || !selectedRow || alreadyReviewed || importedSource ||
        !separateReviewer || !personallyReviewed} onClick={record}>Record independent HOLD decision (not sent)</button>
    </fieldset>
    {feedback && <p role="status" className="owner-trial-feedback">{feedback}</p>}
    <p className="owner-trial-privacy">Build 154 replay remains in the browser session until private export. Its nested historical receipts and reviewer notes cannot dispatch work, certify a source alias, override FIELD_ACCEPTANCE_HOLD / INDEPENDENT_REVIEW_HOLD, or change NOT_AUTHORIZED closure. Vault 0/6 SECURITY HOLD stays unchanged.</p>
  </section>;
}
