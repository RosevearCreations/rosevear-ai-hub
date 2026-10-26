import { useEffect, useState } from "react";
import { CardHelp } from "./CommandShell";
import { type TrialCaseId, type TrialEnvironment, type TrialObservation } from "./ownerFieldTrial";
import { type RepairHandoff } from "./ownerTrialReconciliation";
import { type ReviewEvidenceEvent } from "./ownerIndependentReview";
import { type SourceIdentityCheck } from "./ownerFieldRouting";
import { type IndependentHoldReassessment, type RepeatTrialEvidenceLink } from "./ownerRepeatTrialReassessment";
import { deriveReassessmentExceptionQueue, recordOwnerEvidenceFollowup,
  type ExceptionAge, type OwnerEvidenceFollowup } from "./ownerReassessmentFollowup";

type FilterAge = ExceptionAge | "all";
type FilterRole = "household_owner" | "camera_operator" | "workshop_operator" | "all";

export function ReassessmentFollowupPanel({ history, checks, links, reassessments, environment,
  handoffs, reviews, followups, importedTrials, importedChecks, importedReviews, importedLinks,
  importedReassessments, importedFollowups, onFollowupsChange, onChooseCase, onNavigate, active = true }: {
  history: readonly TrialObservation[]; checks: readonly SourceIdentityCheck[];
  links: readonly RepeatTrialEvidenceLink[]; reassessments: readonly IndependentHoldReassessment[];
  environment: TrialEnvironment; handoffs: readonly RepairHandoff[]; reviews: readonly ReviewEvidenceEvent[];
  followups: OwnerEvidenceFollowup[]; importedTrials: number; importedChecks: number;
  importedReviews: number; importedLinks: number; importedReassessments: number;
  importedFollowups: number; onFollowupsChange: (updated: OwnerEvidenceFollowup[]) => void;
  onChooseCase: (id: TrialCaseId) => void; onNavigate: (section: string) => void; active?: boolean;
}) {
  const [ageFilter, setAgeFilter] = useState<FilterAge>("all");
  const [roleFilter, setRoleFilter] = useState<FilterRole>("all");
  const [selection, setSelection] = useState("");
  const [witnessed, setWitnessed] = useState(false);
  const [feedback, setFeedback] = useState("");
  useEffect(() => { if (!active) setWitnessed(false); }, [active]);

  const imported = { trials: importedTrials, checks: importedChecks, reviews: importedReviews,
    links: importedLinks, reassessments: importedReassessments };
  const queue = deriveReassessmentExceptionQueue(history, checks, links, environment, handoffs, reviews,
    reassessments, imported);
  const shown = queue.filter(item => (ageFilter === "all" || item.age_band === ageFilter) &&
    (roleFilter === "all" || item.owner === roleFilter));
  const current = queue.find(item => `${item.link_index}:${item.criterion}` === selection);

  function record() {
    if (!current) { setFeedback("Select an active, exact evidence-linked exception first."); return; }
    try {
      const updated = recordOwnerEvidenceFollowup(history, checks, links, followups, environment, handoffs,
        reviews, reassessments, imported, { link_index: current.link_index, criterion: current.criterion,
          personally_reviewed: witnessed });
      onFollowupsChange(updated);
      setWitnessed(false);
      setFeedback("Manual follow-up category recorded privately. It was not sent, scheduled or acted upon; all holds remain.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not record private owner follow-up.");
    }
  }

  return <section className="owner-reassessment-followup" aria-label="Build 153 independent exception aging and owner follow-up">
    <header className="owner-trial-ledger-heading">
      <div><h3>Independent exception aging & owner evidence follow-up</h3>
        <p>Compare the exact prior source and newly witnessed result with the seven independent reviewer criteria. Aging starts when each private link was recorded, not when the underlying issue first happened.</p></div>
      <strong className="owner-trial-hold">INDEPENDENT HOLD</strong>
    </header>
    <CardHelp title="What aging and follow-up really mean">
      The counter is advisory; it never sends a reminder, changes a device, schedules a visit or verifies a human reviewer.
      Imported receipts are unverified historical operator claims. Review each exact link, original event time, later result,
      current evidence and Windows installation personally. Even an all-claimed checklist cannot authorize closure.
    </CardHelp>
    <div className="owner-trial-reconcile-stats" aria-label="Build 153 follow-up totals">
      <span>{queue.length} review exceptions including mandatory physical holds</span>
      <span>{queue.filter(item => item.age_band === "AGED_OVER_3_DAYS").length} linked over three days ago</span>
      <span>{followups.length} manually recorded follow-ups ({importedFollowups} imported)</span>
      <span>0 automatic actions</span>
    </div>
    <div className="owner-trial-controls">
      <label>Link age
        <select value={ageFilter} onChange={event => { setAgeFilter(event.target.value as FilterAge); setWitnessed(false); }}>
          <option value="all">All ages</option><option value="RECENT_UNDER_24H">Under 24 hours</option>
          <option value="WATCH_1_TO_3_DAYS">One to three days</option><option value="AGED_OVER_3_DAYS">Three days or more</option>
        </select>
      </label>
      <label>Suggested follow-up role
        <select value={roleFilter} onChange={event => { setRoleFilter(event.target.value as FilterRole); setWitnessed(false); }}>
          <option value="all">All roles</option><option value="household_owner">Household owner</option>
          <option value="camera_operator">Camera operator</option><option value="workshop_operator">Workshop operator</option>
        </select>
      </label>
    </div>
    {links.length === 0 && <p>There are no linked Build 152 repeat-trial outcomes yet. Record a new personally witnessed trial, then its exact historical route and reviewer evidence; no acceptance is implied.</p>}
    {links.length > 0 && shown.length === 0 && <p>No exceptions match these filters. Other holds still apply; reset the filters to inspect them.</p>}
    <div className="owner-reassessment-queue">
      {shown.map(item => {
        const key = `${item.link_index}:${item.criterion}`;
        const prior = followups.filter(note => note.link_index === item.link_index && note.criterion === item.criterion).at(-1);
        return <article key={key} className={selection === key ? "owner-reassessment-selected" : ""}>
          <div>
            <strong>Link #{item.link_index + 1} · {item.case_id.replaceAll("_", " ")} · {item.label}</strong>
            <small>{item.status.replaceAll("_", " ")} · {item.age_band.replaceAll("_", " ")} ({item.age_days} full days since link)</small>
            <p>Original {item.original_observed_at} · retest {item.retest_observed_at} · linked {item.first_linked_at}</p>
            <p>Earlier reviewer: {item.historical.replaceAll("_", " ")} · linked retest: {item.fresh.replaceAll("_", " ")}</p>
            <p><strong>{item.owner.replaceAll("_", " ")}</strong> · {item.action.replaceAll("_", " ")}</p>
            <p className="owner-trial-instruction">{item.instruction}</p>
            {prior && <small>Last manual note {prior.reviewed_at}{followups.indexOf(prior) < importedFollowups ? " · imported claim" : ""} · still OPEN/HOLD</small>}
          </div>
          <div className="owner-trial-row-actions">
            <CardHelp title="Exact exception and source boundaries">This category is derived from private history only; no raw address, camera media, secret, Windows command or transport action is kept. Original event age and private link age differ.</CardHelp>
            <button type="button" onClick={() => { onChooseCase(item.case_id); setWitnessed(false); }}>Prepare manual trial</button>
            <button type="button" onClick={() => { onNavigate(item.section); setWitnessed(false); }}>Open {item.section}</button>
            <button type="button" onClick={() => { setSelection(key); setWitnessed(false); setFeedback(""); }}>Review this exact exception</button>
          </div>
        </article>;
      })}
    </div>
    <fieldset className="owner-review-entry">
      <legend>Private owner follow-up, not dispatch or closure</legend>
      <p>{current ? `Selected: link #${current.link_index + 1}, ${current.case_id}, ${current.criterion} · ${current.status.replaceAll("_", " ")}. Proposed ${current.owner.replaceAll("_", " ")} / ${current.action.replaceAll("_", " ")}.` : "Select an exact exception above before recording an owner follow-up."}</p>
      <label className="owner-trial-check"><input type="checkbox" checked={witnessed} disabled={!current}
        onChange={event => setWitnessed(event.target.checked)} />I personally reviewed this exact current and historical evidence link. I understand the suggested role/action is a private follow-up note only, with no independent sign-off.</label>
      <button type="button" disabled={!current || !witnessed || !active} onClick={record}>Record owner follow-up (OPEN / HOLD only)</button>
    </fieldset>
    {feedback && <p role="status" className="owner-trial-feedback">{feedback}</p>}
    <p className="owner-trial-privacy">Every Build 153 note is manually witnessed, remains OPEN_MANUAL_HOLD, FIELD_ACCEPTANCE_HOLD and NOT_AUTHORIZED. The private export/import carries the full earlier receipt chain. No server-side evidence storage, physical test, independent reviewer verification, device control or vault release is performed.</p>
  </section>;
}
