import { useEffect, useState } from "react";
import { CardHelp } from "./CommandShell";
import { type TrialCaseId, type TrialEnvironment, type TrialObservation } from "./ownerFieldTrial";
import { type SourceIdentityCheck } from "./ownerFieldRouting";
import { type RepeatTrialEvidenceLink } from "./ownerRepeatTrialReassessment";
import { type FollowupDecision } from "./ownerFollowupDecisionReplay";
import { deriveRecurrenceWatch, recordRecurrenceResolution, type RecurrenceResolutionEvidence,
  type ResolutionImportCounts } from "./ownerRecurrenceResolution";

type WatchFilter = "all" | "overdue" | "new_trial" | "awaiting_trial" | "review" | "historical";

export function RecurrenceResolutionPanel({ history, checks, links, decisions, resolutions, environment,
  imported, onResolutionsChange, onChooseCase, onNavigate, active = true }: {
  history: readonly TrialObservation[]; checks: readonly SourceIdentityCheck[];
  links: readonly RepeatTrialEvidenceLink[]; decisions: readonly FollowupDecision[];
  resolutions: RecurrenceResolutionEvidence[]; environment: TrialEnvironment;
  imported: ResolutionImportCounts; onResolutionsChange: (updated: RecurrenceResolutionEvidence[]) => void;
  onChooseCase: (id: TrialCaseId) => void; onNavigate: (section: string) => void; active?: boolean;
}) {
  const [filter, setFilter] = useState<WatchFilter>("all");
  const [selected, setSelected] = useState<number | null>(null);
  const [witnessed, setWitnessed] = useState(false);
  const [holdAcknowledged, setHoldAcknowledged] = useState(false);
  const [feedback, setFeedback] = useState("");
  useEffect(() => { if (!active) { setWitnessed(false); setHoldAcknowledged(false); } }, [active]);

  const rows = deriveRecurrenceWatch(history, checks, links, decisions, resolutions, imported);
  const visible = rows.filter(row => filter === "all" ||
    (filter === "overdue" && row.overdue) ||
    (filter === "new_trial" && row.state === "NEW_TRIAL_NEEDS_MANUAL_INTAKE") ||
    (filter === "awaiting_trial" && row.state === "WAITING_FOR_NEW_OWNER_TRIAL") ||
    (filter === "review" && row.state === "OWNER_EVIDENCE_NEEDS_INDEPENDENT_REVIEW") ||
    (filter === "historical" && row.source_imported));
  const chosen = rows.find(row => row.decision_index === selected);
  const eligible = !!chosen && chosen.state === "NEW_TRIAL_NEEDS_MANUAL_INTAKE" &&
    environment.installed_windows_witnessed && environment.access !== "unknown" &&
    environment.installed_version === links[chosen.link_index]?.installed_version &&
    !decisions.some((decision, index) => index > chosen.decision_index &&
      decision.case_id === chosen.case_id && decision.link_index === chosen.link_index &&
      decision.criterion === chosen.criterion);

  function select(index: number) {
    setSelected(index);
    setWitnessed(false);
    setHoldAcknowledged(false);
    setFeedback("");
  }

  function record() {
    if (!chosen || chosen.newest_trial_index === null) {
      setFeedback("Select a decision with a newer, exact owner-witnessed trial first."); return;
    }
    try {
      const updated = recordRecurrenceResolution(history, checks, links, decisions, resolutions,
        environment, imported, { decision_index: chosen.decision_index,
          trial_index: chosen.newest_trial_index, personally_witnessed: witnessed,
          hold_acknowledged: holdAcknowledged });
      onResolutionsChange(updated);
      setWitnessed(false);
      setHoldAcknowledged(false);
      setFeedback("Manual owner resolution evidence recorded locally as an unverified HOLD claim. No independent acceptance, notification, reassignment or execution occurred.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to record exact private resolution evidence.");
    }
  }

  return <section className="owner-recurrence-resolution" aria-label="Build 155 recurrence resolution intake and overdue decision watch">
    <header className="owner-trial-ledger-heading">
      <div><h3>Recurrence resolution evidence & overdue decision watch</h3>
        <p>Compare each Build 154 decision to our later personally observed trial. Overdue dates are advisory, checked only when this screen renders; no reminders or background processing.</p></div>
      <strong className="owner-trial-hold">INDEPENDENT REVIEW: HOLD</strong>
    </header>
    <CardHelp title="An owner improvement is not independent closure">
      A later claimed pass, matching safe alias, imported reviewer note or elapsed time never proves physical source identity or installed Windows readiness. Every submitted row is an unverified, exact-source private claim. Contradictions and original timestamps remain in the historical chain; no automatic escalation or Vault release exists.
    </CardHelp>
    <div className="owner-trial-reconcile-stats" aria-label="Build 155 decision watch totals">
      <span>{rows.length} independent decision(s)</span>
      <span>{rows.filter(row => row.overdue).length} overdue manual watch(es)</span>
      <span>{rows.filter(row => row.state === "NEW_TRIAL_NEEDS_MANUAL_INTAKE").length} new trial(s) awaiting intake</span>
      <span>{resolutions.length} recorded HOLD evidence item(s) ({imported.resolutions} imported)</span>
      <span>0 notifications, dispatches or closures</span>
    </div>
    <label className="owner-decision-filter">Decision watch filter
      <select value={filter} onChange={event => { setFilter(event.target.value as WatchFilter); setWitnessed(false); setHoldAcknowledged(false); }}>
        <option value="all">All historical and current decisions</option>
        <option value="overdue">Overdue after 72 hours (manual)</option>
        <option value="new_trial">New owner trial needs intake</option>
        <option value="awaiting_trial">No newer witnessed owner trial</option>
        <option value="review">Owner evidence awaiting independent review</option>
        <option value="historical">Imported historical decision or trial</option>
      </select>
    </label>
    {rows.length === 0 && <p>No Build 154 independent HOLD decisions yet. Start with an exact owner follow-up and a separate manual reviewer decision before the watch can compare newer trials.</p>}
    {rows.length > 0 && visible.length === 0 && <p>No decisions match this manual filter. That does not lift a physical, evidence or independent-review hold.</p>}
    <div className="owner-decision-cards">
      {visible.map(row => <article key={row.decision_index} className={selected === row.decision_index ? "owner-reassessment-selected" : ""}>
        <strong>Decision #{row.decision_index + 1} · {row.case_id.replaceAll("_", " ")} · {row.criterion.replaceAll("_", " ")}</strong>
        <small>{row.state.replaceAll("_", " ")} · {row.age_band.replaceAll("_", " ")}</small>
        <p>Original link: {row.original_linked_at}</p>
        <p>Independent decision: {row.decision_at} · age {row.age_days} complete day(s)</p>
        <p>Decision category: {row.decision.replaceAll("_", " ")}</p>
        <p>Newer owner trial: {row.newest_trial_at ?? "not yet recorded"}{row.newest_trial_index !== null ? ` · #${row.newest_trial_index + 1}` : ""}</p>
        <p>Source check: {row.source_comparison.replaceAll("_", " ")}</p>
        <p>Intake: {row.evidence_at ?? "not recorded"} · {row.claim?.replaceAll("_", " ") ?? "independent HOLD remains"}</p>
        {row.overdue && <p className="owner-trial-warning">Overdue for manual owner/reviewer attention. No alert was sent.</p>}
        {row.source_imported && <small>Historical imported decision/trial; fresh witnessing and a new decision required.</small>}
        <div className="owner-trial-row-actions">
          <button type="button" onClick={() => { onChooseCase(row.case_id); setWitnessed(false); }}>Prepare newer owner trial</button>
          <button type="button" onClick={() => { onNavigate(row.section); setWitnessed(false); }}>Open {row.section}</button>
          <button type="button" onClick={() => select(row.decision_index)}>Inspect exact decision evidence</button>
        </div>
      </article>)}
    </div>
    <fieldset className="owner-review-entry">
      <legend>Manual owner resolution evidence intake (private HOLD)</legend>
      <p>{chosen ? `Selected decision #${chosen.decision_index + 1}, ${chosen.case_id}, criterion ${chosen.criterion}, latest new trial ${chosen.newest_trial_at ?? "not recorded"}.` : "Select a decision to inspect exact newer owner trial evidence."}</p>
      {chosen && !eligible && <p role="note" className="owner-trial-warning">A fresh non-imported post-decision trial, the latest decision and personally witnessed matching Windows version are required before intake. Earlier evidence remains available for read-only review.</p>}
      {chosen && eligible && <p>The new trial result is read directly from the owner trial ledger. An observed pass will be labelled improvement UNVERIFIED; issue/blocked results stay recurring. No free-text identifiers or addresses are accepted.</p>}
      <label className="owner-trial-check"><input type="checkbox" checked={witnessed} disabled={!eligible || !active}
        onChange={event => { setWitnessed(event.target.checked); setHoldAcknowledged(false); }} />I personally witnessed the exact newer owner trial on our installed Windows Hub; I have not inferred device readiness from source CI.</label>
      <label className="owner-trial-check"><input type="checkbox" checked={holdAcknowledged} disabled={!eligible || !active}
        onChange={event => setHoldAcknowledged(event.target.checked)} />I understand this evidence remains an unverified owner claim and needs a separate independent reviewer; no case is closed.</label>
      <button type="button" onClick={record} disabled={!eligible || !active || !witnessed || !holdAcknowledged}>Record owner recurrence evidence (HOLD; not sent)</button>
    </fieldset>
    {feedback && <p role="status" className="owner-trial-feedback">{feedback}</p>}
    <p className="owner-trial-privacy">Build 155 is a manual, on-screen watch and private session ledger; no scheduler, notifications, device commands or background database writes. Every result retains FIELD_ACCEPTANCE_HOLD, INDEPENDENT_REVIEW_HOLD and NOT_AUTHORIZED. First-party Vault: 0/6 verified, SECURITY HOLD.</p>
  </section>;
}
