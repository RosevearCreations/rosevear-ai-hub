import { useEffect, useState } from "react";
import { CardHelp } from "./CommandShell";
import { type TrialCaseId, type TrialEnvironment, type TrialObservation } from "./ownerFieldTrial";
import { type SourceIdentityCheck } from "./ownerFieldRouting";
import { type RepeatTrialEvidenceLink } from "./ownerRepeatTrialReassessment";
import { type FollowupDecision } from "./ownerFollowupDecisionReplay";
import { type RecurrenceResolutionEvidence } from "./ownerRecurrenceResolution";
import { deriveOverdueHandoffWatch, recordOverdueHandoff, type HandoffImportCounts,
  type ManualHandoffCategory, type OverdueHandoffEvidence } from "./ownerOverdueHandoff";

type HandoffFilter = "all" | "overdue" | "reopened" | "source" | "historical";

/** Owner/Admin-only child of the authenticated System workbench. Explicit local events, never a send. */
export function OverdueHandoffPanel({ history, checks, links, decisions, resolutions, handoffs, environment,
  imported, onHandoffsChange, onChooseCase, onNavigate, active = true }: {
  history: readonly TrialObservation[]; checks: readonly SourceIdentityCheck[];
  links: readonly RepeatTrialEvidenceLink[]; decisions: readonly FollowupDecision[];
  resolutions: readonly RecurrenceResolutionEvidence[]; handoffs: OverdueHandoffEvidence[];
  environment: TrialEnvironment; imported: HandoffImportCounts;
  onHandoffsChange: (updated: OverdueHandoffEvidence[]) => void;
  onChooseCase: (id: TrialCaseId) => void; onNavigate: (section: string) => void; active?: boolean;
}) {
  const [filter, setFilter] = useState<HandoffFilter>("all");
  const [selected, setSelected] = useState<number | null>(null);
  const [category, setCategory] = useState<ManualHandoffCategory>("OVERDUE_INDEPENDENT_REVIEW_REQUEST");
  const [personallyReviewed, setPersonallyReviewed] = useState(false);
  const [holdAcknowledged, setHoldAcknowledged] = useState(false);
  const [feedback, setFeedback] = useState("");
  useEffect(() => { if (!active) { setPersonallyReviewed(false); setHoldAcknowledged(false); } }, [active]);

  const rows = deriveOverdueHandoffWatch(history, checks, links, decisions, resolutions, handoffs, imported);
  const filtered = rows.filter(row => filter === "all" || filter === "overdue" && row.overdue ||
    filter === "historical" && row.source_imported || filter === "source" &&
    ["ALIAS_CHANGED_RECHECK_HOLD", "SOURCE_CHECK_DISPUTED_HOLD"].includes(row.source_alias_comparison) ||
    filter === "reopened" && row.reopened_comparison.startsWith("REOPENED_"));
  const chosen = rows.find(row => row.decision_index === selected);
  const eligible = !!chosen && chosen.eligible_for_manual_handoff &&
    environment.installed_windows_witnessed && environment.access !== "unknown" &&
    environment.installed_version === links[chosen.link_index]?.installed_version &&
    !decisions.some((decision, index) => index > chosen.decision_index &&
      decision.case_id === chosen.case_id && decision.link_index === chosen.link_index &&
      decision.criterion === chosen.criterion);
  const categoryMatches = !!chosen && (category === "OVERDUE_INDEPENDENT_REVIEW_REQUEST" ? chosen.overdue :
    category === "REOPENED_TRIAL_COMPARISON_REQUEST" ? chosen.reopened_comparison.startsWith("REOPENED_") :
      ["ALIAS_CHANGED_RECHECK_HOLD", "SOURCE_CHECK_DISPUTED_HOLD"].includes(chosen.source_alias_comparison));

  function choose(index: number) {
    setSelected(index);
    setCategory("OVERDUE_INDEPENDENT_REVIEW_REQUEST");
    setPersonallyReviewed(false);
    setHoldAcknowledged(false);
    setFeedback("");
  }

  function prepare() {
    if (!chosen) { setFeedback("Select the exact independent decision and snapshot first."); return; }
    try {
      const updated = recordOverdueHandoff(history, checks, links, decisions, resolutions,
        handoffs, environment, imported, { decision_index: chosen.decision_index, category,
          personally_reviewed: personallyReviewed, hold_acknowledged: holdAcknowledged });
      onHandoffsChange(updated);
      setPersonallyReviewed(false);
      setHoldAcknowledged(false);
      setFeedback("Exact owner/reviewer handoff snapshot prepared locally as an unverified private HOLD. No message, job, escalation or closure was sent.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not prepare private HOLD handoff.");
    }
  }

  return <section className="owner-overdue-handoff" aria-label="Build 156 independent overdue handoff and reopened trial comparison">
    <header className="owner-trial-ledger-heading">
      <div><h3>Overdue decision handoff & reopened trial comparison</h3>
        <p>Freeze exact owner/reviewer evidence at a manual handoff time. Later owner passes, reopened issues and changed safe source aliases remain separate unverified claims.</p></div>
      <strong className="owner-trial-hold">INDEPENDENT REVIEW: HOLD</strong>
    </header>
    <CardHelp title="Why a private handoff is not field acceptance">
      Every private handoff is manually prepared but not delivered. Age is advisory only, with no background timer or automatic escalation. Matching aliases do not authenticate devices, and past owner improvement never overrides a reopened issue, independent hold or Vault security gate.
    </CardHelp>
    <div className="owner-trial-reconcile-stats" aria-label="Build 156 handoff watch totals">
      <span>{rows.filter(row => row.overdue).length} overdue decision(s)</span>
      <span>{rows.filter(row => row.reopened_comparison.startsWith("REOPENED_")).length} reopened trial comparison(s)</span>
      <span>{rows.filter(row => row.source_alias_comparison === "ALIAS_CHANGED_RECHECK_HOLD").length} changed alias recheck(s)</span>
      <span>{handoffs.length} private HOLD handoff(s), {imported.handoffs} historical import(s)</span>
      <span>0 sent, auto-escalated or closed</span>
    </div>
    <label className="owner-decision-filter">Private handoff filter
      <select value={filter} onChange={event => { setFilter(event.target.value as HandoffFilter);
        setPersonallyReviewed(false); setHoldAcknowledged(false); }}>
        <option value="all">All independent decisions</option>
        <option value="overdue">Overdue manual review</option>
        <option value="reopened">Later reopened owner trial</option>
        <option value="source">Source alias change or disputed witness</option>
        <option value="historical">Imported historical decisions</option>
      </select>
    </label>
    {rows.length === 0 && <p>No Build 154 independent HOLD decisions. Build 155 evidence and independent follow-ups must be recorded before an exact handoff can be reviewed.</p>}
    {rows.length > 0 && filtered.length === 0 && <p>No decisions match this manual filter. All physical and reviewer HOLDs remain unchanged.</p>}
    <div className="owner-decision-cards">
      {filtered.map(row => <article key={row.decision_index}
        className={selected === row.decision_index ? "owner-reassessment-selected" : ""}>
        <strong>Decision #{row.decision_index + 1} · {row.case_id.replaceAll("_", " ")} · {row.criterion.replaceAll("_", " ")}</strong>
        <small>{row.age_band.replaceAll("_", " ")} · {row.age_days} full day(s), from original decision</small>
        <p>Source link {row.source_linked_at} · decision {row.decision_at}</p>
        <p>Build 155 owner intake {row.resolution_recorded_at ?? "none"} · {row.prior_owner_claim?.replaceAll("_", " ") ?? "no previous improvement claim"}</p>
        <p>Reopened comparison: {row.reopened_comparison.replaceAll("_", " ")}</p>
        <p>Latest owner trial {row.newest_trial_at ?? "none"}{row.newest_trial_index !== null ? ` · #${row.newest_trial_index + 1}` : ""}</p>
        <p>Source alias comparison: {row.source_alias_comparison.replaceAll("_", " ")} (alias not disclosed)</p>
        <p>Private snapshots prepared: {row.existing_handoffs} (not sent)</p>
        {row.overdue && <p className="owner-trial-warning">Overdue for human follow-up only. No notification or escalation was sent.</p>}
        {row.source_imported && <small>Historical imported chain; new witnessed trial and independent decision needed.</small>}
        <div className="owner-trial-row-actions">
          <button type="button" onClick={() => { onChooseCase(row.case_id); setPersonallyReviewed(false); }}>Prepare trial recheck</button>
          <button type="button" onClick={() => { onNavigate(row.section); setPersonallyReviewed(false); }}>Open {row.section}</button>
          <button type="button" onClick={() => choose(row.decision_index)}>Inspect handoff snapshot</button>
        </div>
      </article>)}
    </div>
    <fieldset className="owner-review-entry">
      <legend>Prepare exact private independent HOLD handoff (never send)</legend>
      <p>{chosen ? `Decision #${chosen.decision_index + 1}, original ${chosen.decision_at}, ${chosen.age_band}, owner claim ${chosen.prior_owner_claim ?? "none"}, comparison ${chosen.reopened_comparison}.` :
        "Select an exact decision to inspect its immutable owner/reviewer evidence snapshot."}</p>
      {chosen && !eligible && <p role="note" className="owner-trial-warning">Only a current non-imported overdue, reopened or source-disputed decision in a personally witnessed matching Windows environment may prepare a new HOLD handoff. No imported note becomes fresh authorization.</p>}
      {chosen && eligible && !categoryMatches && <p role="note">Choose a fixed handoff reason matching this exact overdue, reopened or source-disputed evidence.</p>}
      <label>Fixed manual handoff reason
        <select value={category} disabled={!eligible || !active} onChange={event => { setCategory(event.target.value as ManualHandoffCategory);
          setPersonallyReviewed(false); setHoldAcknowledged(false); }}>
          <option value="OVERDUE_INDEPENDENT_REVIEW_REQUEST">Overdue independent review requested (private)</option>
          <option value="REOPENED_TRIAL_COMPARISON_REQUEST">Reopened owner trial comparison requested (private)</option>
          <option value="SOURCE_ALIAS_RECHECK_REQUEST">Source alias recheck requested (private)</option>
        </select>
      </label>
      <label className="owner-trial-check"><input type="checkbox" checked={personallyReviewed} disabled={!eligible || !active}
        onChange={event => { setPersonallyReviewed(event.target.checked); setHoldAcknowledged(false); }} />I personally inspected the exact overdue decision, owner trial history and source comparison in the installed Windows Hub context.</label>
      <label className="owner-trial-check"><input type="checkbox" checked={holdAcknowledged} disabled={!eligible || !active}
        onChange={event => setHoldAcknowledged(event.target.checked)} />I acknowledge the exported snapshot is an unverified private claim. No independent acceptance, assignment, job, message or Vault release is authorized.</label>
      <button type="button" disabled={!eligible || !categoryMatches || !active || !personallyReviewed || !holdAcknowledged} onClick={prepare}>
        Prepare private HOLD handoff snapshot (not sent)
      </button>
    </fieldset>
    {feedback && <p role="status" className="owner-trial-feedback">{feedback}</p>}
    <p className="owner-trial-privacy">Build 156 records immutable, bounded evidence snapshots only in this session. Later observations do not rewrite earlier timestamps or erase contradictions. Explicit export/import only. No background work or dispatch. FIELD_ACCEPTANCE_HOLD · INDEPENDENT_REVIEW_HOLD · NOT_AUTHORIZED. First-party Vault: 0/6 verified · SECURITY HOLD.</p>
  </section>;
}
