import { useEffect, useState } from "react";
import { CardHelp } from "./CommandShell";
import { TRIAL_CASES, type TrialCaseId, type TrialEnvironment, type TrialObservation } from "./ownerFieldTrial";
import { type RepairHandoff } from "./ownerTrialReconciliation";
import { type ReviewEvidenceEvent } from "./ownerIndependentReview";
import { type RouteReason, type SourceIdentityCheck } from "./ownerFieldRouting";
import { assessHoldReassessment, recordHoldReassessment, recordRepeatTrialLink, repeatTrialCandidates,
  type IndependentHoldReassessment, type ReassessmentMark, type RepeatTrialEvidenceLink } from "./ownerRepeatTrialReassessment";

export function RepeatTrialReassessmentPanel({ history, checks, links, reassessments, environment, handoffs, reviews,
  importedTrials, importedChecks, importedReviews, importedLinks, onLinksChange, onReassessmentsChange,
  onChooseCase, active = true }: {
  history: readonly TrialObservation[]; checks: readonly SourceIdentityCheck[]; links: RepeatTrialEvidenceLink[];
  reassessments: IndependentHoldReassessment[]; environment: TrialEnvironment; handoffs: readonly RepairHandoff[];
  reviews: readonly ReviewEvidenceEvent[]; importedTrials: number; importedChecks: number; importedReviews: number;
  importedLinks: number; onLinksChange: (items: RepeatTrialEvidenceLink[]) => void;
  onReassessmentsChange: (items: IndependentHoldReassessment[]) => void; onChooseCase: (id: TrialCaseId) => void;
  active?: boolean;
}) {
  const [caseId, setCaseId] = useState<TrialCaseId>("devices");
  const [reason, setReason] = useState<RouteReason>("ACTIVE_FINDING");
  const [linkWitness, setLinkWitness] = useState(false);
  const [selectedLink, setSelectedLink] = useState(-1);
  const [mark, setMark] = useState<ReassessmentMark>("reviewer_gaps_hold");
  const [reviewWitness, setReviewWitness] = useState(false);
  const [separateReviewer, setSeparateReviewer] = useState(false);
  const [feedback, setFeedback] = useState("");
  useEffect(() => { if (!active) { setLinkWitness(false); setReviewWitness(false); setSeparateReviewer(false); } }, [active]);

  const imported = { trials: importedTrials, checks: importedChecks, reviews: importedReviews, links: importedLinks };
  const candidates = repeatTrialCandidates(history, checks, environment, handoffs, reviews, imported);
  const candidate = candidates.find(item => item.case_id === caseId);
  const selectedReason = candidate?.reasons.includes(reason) ? reason : candidate?.reasons[0];
  const link = links[selectedLink];
  const assessment = link ? assessHoldReassessment(history, checks, links, selectedLink, environment,
    handoffs, reviews, imported) : null;
  const currentNote = reassessments.filter(note => note.link_index === selectedLink).at(-1);

  function linkOutcome() {
    if (!selectedReason) { setFeedback("Select a case with a new witnessed retest and a prior route reason."); return; }
    try {
      const updated = recordRepeatTrialLink(history, checks, links, environment, handoffs, reviews, imported,
        { case_id: caseId, route_reason: selectedReason, personally_witnessed: linkWitness });
      onLinksChange(updated);
      setSelectedLink(updated.length - 1);
      setLinkWitness(false);
      setFeedback("Exact old route and new witnessed outcome linked privately. No case was closed or action dispatched.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Cannot link this retest."); }
  }

  function recordReview() {
    try {
      const next = recordHoldReassessment(history, checks, links, reassessments, environment, handoffs, reviews, imported,
        { link_index: selectedLink, mark, reviewer_witnessed: reviewWitness, separate_reviewer: separateReviewer });
      onReassessmentsChange(next);
      setReviewWitness(false);
      setSeparateReviewer(false);
      setFeedback("Private manual reassessment handoff recorded. Independent and physical field acceptance remain HOLD; nothing was sent.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Cannot prepare reassessment handoff."); }
  }

  return <section className="owner-repeat-reassessment" aria-label="Build 152 repeat trial evidence links and independent hold reassessment">
    <header className="owner-trial-ledger-heading">
      <div><h3>Repeat-trial links & independent HOLD reassessment</h3>
        <p>Connect a newly witnessed result to its earlier Build 151 route reason, then compare old and fresh reviewer classifications. Nothing is automatically closed.</p></div>
      <strong className="owner-trial-hold">CLOSURE: NOT AUTHORIZED</strong>
    </header>
    <CardHelp title="Why two separate witnesses matter">
      A new owner trial is not independent review. Use the existing reviewer checklist to classify each criterion against the new trial; a separate reviewer must manually inspect the evidence. A matching made-up token does not authenticate hardware. Every outcome stays on a physical field HOLD.
    </CardHelp>
    <div className="owner-trial-reconcile-stats" aria-label="Build 152 evidence counts">
      <span>{candidates.length} cases with a linkable latest retest</span><span>{links.length} exact route links</span>
      <span>{reassessments.length} private reassessment notes</span><span>0 dispatched actions</span>
    </div>

    <fieldset className="owner-review-entry">
      <legend>Link new witnessed retest to its previous routing reason</legend>
      <div className="owner-trial-controls">
        <label>Repeat-trial case
          <select value={caseId} onChange={event => { setCaseId(event.target.value as TrialCaseId); setLinkWitness(false); }}>
            {TRIAL_CASES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label>Previous manual route reason
          <select value={selectedReason ?? ""} disabled={!candidate} onChange={event => { setReason(event.target.value as RouteReason); setLinkWitness(false); }}>
            {!candidate && <option value="">Record a later trial first</option>}
            {candidate?.reasons.map(item => <option value={item} key={item}>{item.replaceAll("_", " ")}</option>)}
          </select>
        </label>
      </div>
      {candidate ? <p>Exact original trial #{candidate.baseline_index + 1} → later witnessed trial #{candidate.retest_index + 1}. Prior safe source check: {candidate.source_check_index === null ? "absent" : `record #${candidate.source_check_index + 1}`}. Current installed version: {environment.installed_version || "unverified"}.</p>
        : <p>No eligible later witnessed trial for this case. Select the manual check, inspect the existing module and record a new outcome first. An imported pass does not count.</p>}
      <div className="owner-source-route-actions">
        <button type="button" onClick={() => { setLinkWitness(false); onChooseCase(caseId); }}>Select manual check</button>
      </div>
      <label className="owner-trial-check"><input type="checkbox" checked={linkWitness}
        onChange={event => setLinkWitness(event.target.checked)} />I personally checked the exact original route, new observed trial, safe source alias (if any) and installed Windows version.</label>
      <button type="button" disabled={!candidate || !linkWitness} onClick={linkOutcome}>Link retest evidence (HOLD)</button>
    </fieldset>

    <section className="owner-review-entry" aria-label="Reviewer comparison and manual handoff">
      <h4>Review linked result against current evidence</h4>
      <label>Exact private link
        <select value={selectedLink} onChange={event => { setSelectedLink(Number(event.target.value)); setReviewWitness(false); setSeparateReviewer(false); }}>
          <option value={-1}>Select a linked result</option>
          {links.map((item, index) => <option key={index} value={index}>{index + 1}. {item.case_id.replaceAll("_", " ")} · {item.route_reason.replaceAll("_", " ")} · trial #{item.retest_trial_index + 1}{index < importedLinks ? " (imported)" : ""}</option>)}
        </select>
      </label>
      {link && assessment && <>
        <p><strong>{assessment.packet_status.replaceAll("_", " ")}</strong> · source claim {link.source_alias ?? "unrecorded"} · Windows {link.installed_version} · linked {link.linked_at}. <strong>Physical HOLD always applies.</strong></p>
        <table className="owner-repeat-review-table">
          <caption>Seven exact reviewer criteria compared with the linked later trial</caption>
          <thead><tr><th scope="col">Criterion</th><th scope="col">Earlier evidence</th><th scope="col">New-trial evidence</th><th scope="col">Next action</th></tr></thead>
          <tbody>{assessment.comparison.map(item => <tr key={item.criterion}>
            <th scope="row">{item.label}</th><td>{item.historical.replaceAll("_", " ")}</td>
            <td>{item.fresh.replaceAll("_", " ")}</td><td>{item.requires_fresh_review ? "Witness afresh" : "Claim recorded · still HOLD"}</td>
          </tr>)}</tbody>
        </table>
        <h4>Unresolved gates</h4>
        {assessment.blockers.length ? <ul>{assessment.blockers.map(item => <li key={item}>{item}</li>)}</ul>
          : <p>All seven current reviewer criteria are claimed. This is a privately prepared packet only, not signed independent acceptance or physical certification.</p>}
        {currentNote && <p>Last private reassessment: {currentNote.mark.replaceAll("_", " ")} · {currentNote.reviewed_at}{currentNote.separate_reviewer_attested ? " · separate reviewer claimed" : " · separate reviewer not attested"}.</p>}
        <label>Reviewer reassessment classification
          <select value={mark} onChange={event => { setMark(event.target.value as ReassessmentMark); setReviewWitness(false); }}>
            <option value="reviewer_gaps_hold">Reviewer evidence gaps remain · HOLD</option>
            <option value="repeat_trial_requested">Further physical repeat trial requested · HOLD</option>
            <option value="packet_prepared_only">Fresh review packet prepared only · HOLD</option>
          </select>
        </label>
        <label className="owner-trial-check"><input type="checkbox" checked={separateReviewer}
          onChange={event => { setSeparateReviewer(event.target.checked); setReviewWitness(false); }} />A separate independent reviewer personally inspected the linked evidence (private, unverified attestation).</label>
        <label className="owner-trial-check"><input type="checkbox" checked={reviewWitness}
          onChange={event => setReviewWitness(event.target.checked)} />I personally assessed the specific historical and fresh evidence against the seven criteria and understand this records no closure.</label>
        <button type="button" disabled={!reviewWitness} onClick={recordReview}>Record private reassessment handoff (do not send)</button>
      </>}
      {!link && <p>Link the new trial first, or select an earlier private evidence link. Imported links require new Windows witnessing.</p>}
    </section>
    {feedback && <p role="status" className="owner-trial-feedback">{feedback}</p>}
    <p className="owner-trial-privacy">Build 152 links are session-only pseudonymous operator claims until privately exported. An imported pass, a source alias match, an incomplete witness or changed Windows version cannot certify equipment or clear an independent hold. No background action, repair dispatch, camera/HA/MQTT command, Windows restart or vault change occurs.</p>
  </section>;
}
