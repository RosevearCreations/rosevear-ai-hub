import { useEffect, useState } from "react";
import { CardHelp } from "./CommandShell";
import { type TrialEnvironment, type TrialObservation } from "./ownerFieldTrial";
import { type RepairHandoff } from "./ownerTrialReconciliation";
import {
  REVIEW_CRITERIA, assessIndependentEvidence, recordIndependentEvidence,
  type EvidenceState, type ReviewCriterion, type ReviewEvidenceEvent,
} from "./ownerIndependentReview";

type GapFilter = "all" | "unmet" | "contradictions" | "historical";

export function IndependentRetestReviewPanel({ history, handoffs, environment, events, importedCount, importedTrialCount = 0, onEventsChange, active = true }: {
  history: readonly TrialObservation[]; handoffs: readonly RepairHandoff[]; environment: TrialEnvironment;
  events: ReviewEvidenceEvent[]; importedCount: number; importedTrialCount?: number;
  onEventsChange: (next: ReviewEvidenceEvent[]) => void; active?: boolean;
}) {
  const [selected, setSelected] = useState("");
  const [criterion, setCriterion] = useState<ReviewCriterion>("original_finding");
  const [state, setState] = useState<EvidenceState>("gap");
  const [witnessed, setWitnessed] = useState(false);
  const [separateReviewer, setSeparateReviewer] = useState(false);
  const [filter, setFilter] = useState<GapFilter>("all");
  const [feedback, setFeedback] = useState("");

  useEffect(() => { if (!active) { setWitnessed(false); setSeparateReviewer(false); } }, [active]);

  const prepared = handoffs.filter(item => item.stage === "prepared_for_private_handoff");
  const handoff = prepared.find(item => `${item.case_id}:${item.baseline_index}` === selected) ?? prepared[0];
  const assessment = handoff ? assessIndependentEvidence(history, handoff, events, environment, importedCount, importedTrialCount) : null;

  function record() {
    if (!handoff) return;
    try {
      const next = recordIndependentEvidence(history, handoffs, events, environment, {
        case_id: handoff.case_id, baseline_index: handoff.baseline_index, criterion, state,
        reviewer_witnessed: witnessed, separate_reviewer: separateReviewer,
      }, undefined, importedTrialCount);
      onEventsChange(next);
      setWitnessed(false);
      setSeparateReviewer(false);
      setFeedback("Manual reviewer classification recorded privately. No closure or physical acceptance was issued.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not record reviewer classification.");
    }
  }

  const visible = assessment?.criteria.filter(item => filter === "all" ||
    (filter === "unmet" && item.status !== "present_claimed") ||
    (filter === "contradictions" && item.status === "contradiction") ||
    (filter === "historical" && ["stale", "imported_historical"].includes(item.status))) ?? [];

  return <section className="owner-independent-review" aria-label="Build 150 independent retest review and evidence gap register">
    <header className="owner-trial-ledger-heading">
      <div><h3>Independent retest review & evidence gaps</h3>
        <p>Prepare an evidence packet for a separate field decision. Even a complete checklist is only an unverified review claim, never permission to close a finding.</p></div>
      <strong className="owner-trial-hold">CLOSURE: NOT AUTHORIZED</strong>
    </header>
    <CardHelp title="Independent evidence review boundary">An imported report, a different reviewer checkbox, successful CI or a proposed repair cannot prove real Windows or camera operation. Review only what you personally checked. External independent acceptance is still required.</CardHelp>
    {prepared.length === 0 ? <p className="owner-trial-warning">No prepared handoffs yet. Record an actual issue and prepare its private manual handoff under Build 149 before reviewer evidence intake.</p> : <>
      <div className="owner-trial-controls">
        <label>Prepared handoff for review
          <select value={`${handoff.case_id}:${handoff.baseline_index}`} onChange={event => { setSelected(event.target.value); setWitnessed(false); setSeparateReviewer(false); }}>
            {prepared.map(item => <option key={`${item.case_id}:${item.baseline_index}`} value={`${item.case_id}:${item.baseline_index}`}>
              {item.case_id.replaceAll("_", " ")} · original issue #{item.baseline_index + 1}</option>)}
          </select>
        </label>
        <label>Gap register filter
          <select value={filter} onChange={event => setFilter(event.target.value as GapFilter)}>
            <option value="all">All seven criteria</option><option value="unmet">Unmet or incomplete</option>
            <option value="contradictions">Contradictory evidence</option><option value="historical">Stale or imported history</option>
          </select>
        </label>
      </div>
      <div className="owner-trial-reconcile-stats" aria-label="Independent evidence status">
        <span>{assessment!.present_claimed} / {REVIEW_CRITERIA.length} currently claimed present</span>
        <span>{assessment!.gaps} unmet evidence criteria</span>
        <span>{assessment!.unresolved_contradictions} contradictions requiring a new trial</span>
        <span>{assessment!.packet_readiness.replaceAll("_", " ")}</span>
      </div>
      <div className="owner-review-gap-list" aria-label="Evidence gap register">
        {visible.map(item => <article key={item.id}>
          <strong>{item.label}</strong>
          <span>{item.status.replaceAll("_", " ")}</span>
          {item.recorded_at && <small>Reviewer classification {item.recorded_at}</small>}
          <p>{REVIEW_CRITERIA.find(criteria => criteria.id === item.id)!.guidance}</p>
        </article>)}
        {visible.length === 0 && <p>No criteria match this filter. The independent closure HOLD still applies.</p>}
      </div>
      <fieldset className="owner-review-entry">
        <legend>Record a personally witnessed reviewer classification</legend>
        <div className="owner-trial-controls">
          <label>Evidence criterion
            <select value={criterion} onChange={event => { setCriterion(event.target.value as ReviewCriterion); setWitnessed(false); setSeparateReviewer(false); }}>
              {REVIEW_CRITERIA.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label>Observed evidence state
            <select value={state} onChange={event => { setState(event.target.value as EvidenceState); setWitnessed(false); setSeparateReviewer(false); }}>
              <option value="gap">Missing or unverified</option><option value="contradiction">Contradictory observations</option>
              <option value="present_claimed">Personally observed — evidence present (claim only)</option>
            </select>
          </label>
        </div>
        {criterion === "independent_witness" && state === "present_claimed" && <label className="owner-trial-check">
          <input type="checkbox" checked={separateReviewer} onChange={event => setSeparateReviewer(event.target.checked)} />
          I attest I am a different reviewer from the original field observer; this does not verify my identity.</label>}
        <label className="owner-trial-check"><input type="checkbox" checked={witnessed} onChange={event => setWitnessed(event.target.checked)} />
          I personally reviewed the exact source finding, handoff and evidence classification shown above.</label>
        <button type="button" disabled={!witnessed} onClick={record}>Record reviewer evidence (no closure)</button>
      </fieldset>
    </>}
    {feedback && <p role="status" className="owner-trial-feedback">{feedback}</p>}
    <p className="owner-trial-privacy">Review records are local browser-session statements until explicitly exported. Imported evidence is historical, and any later trial observation stales prior assessments. No reviewer identity is verified by this UI. <strong>FIELD_ACCEPTANCE_HOLD and NOT_AUTHORIZED remain unconditional.</strong></p>
  </section>;
}
