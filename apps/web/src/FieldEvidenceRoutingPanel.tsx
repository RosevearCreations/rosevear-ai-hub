import { useEffect, useState } from "react";
import { CardHelp } from "./CommandShell";
import { TRIAL_CASES, type TrialCaseId, type TrialEnvironment, type TrialObservation } from "./ownerFieldTrial";
import { type RepairHandoff } from "./ownerTrialReconciliation";
import { type ReviewEvidenceEvent } from "./ownerIndependentReview";
import { deriveRepeatTrialRoutes, recordSourceIdentityCheck, type SourceIdentityCheck, type SourceIdentityState } from "./ownerFieldRouting";

type RouteFilter = "all" | "repeat" | "missing";

export function FieldEvidenceRoutingPanel({ history, checks, environment, handoffs, reviews, importedChecks, importedTrials,
  importedReviews, onChecksChange, onChooseCase, onNavigate, active = true }: {
  history: readonly TrialObservation[]; checks: SourceIdentityCheck[]; environment: TrialEnvironment;
  handoffs: readonly RepairHandoff[]; reviews: readonly ReviewEvidenceEvent[];
  importedChecks: number; importedTrials: number; importedReviews: number;
  onChecksChange: (next: SourceIdentityCheck[]) => void; onChooseCase: (id: TrialCaseId) => void;
  onNavigate: (section: string) => void; active?: boolean;
}) {
  const [caseId, setCaseId] = useState<TrialCaseId>("devices");
  const [sourceState, setSourceState] = useState<SourceIdentityState>("identity_unknown");
  const [alias, setAlias] = useState("");
  const [witnessed, setWitnessed] = useState(false);
  const [filter, setFilter] = useState<RouteFilter>("all");
  const [feedback, setFeedback] = useState("");
  useEffect(() => { if (!active) setWitnessed(false); }, [active]);

  const routes = deriveRepeatTrialRoutes(history, checks, environment, handoffs, reviews,
    { trials: importedTrials, checks: importedChecks, reviews: importedReviews });
  const repeat = routes.filter(item => item.priority === "REPEAT_TRIAL_REQUIRED").length;
  const shown = routes.filter(item => filter === "all" || (filter === "repeat" && item.priority === "REPEAT_TRIAL_REQUIRED") ||
    (filter === "missing" && item.priority === "EVIDENCE_INTAKE_REQUIRED"));

  function record() {
    try {
      const next = recordSourceIdentityCheck(history, checks, environment,
        { case_id: caseId, identity_state: sourceState, safe_alias: alias, personally_witnessed: witnessed });
      onChecksChange(next);
      setWitnessed(false);
      setAlias("");
      setFeedback("Manual source identity classification recorded privately. Check the repeat-trial route; no device or repair was changed.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not record source identity evidence.");
    }
  }

  return <section className="owner-source-routing" aria-label="Build 151 source identity change and repeat trial routing">
    <header className="owner-trial-ledger-heading">
      <div><h3>Source identity changes & repeat-trial routing</h3>
        <p>Review possible identity changes, reopened findings and superseded Windows versions. Routes are private suggestions, not dispatched jobs.</p></div>
      <strong className="owner-trial-hold">ALL ROUTES: FIELD HOLD</strong>
    </header>
    <CardHelp title="Source identity evidence is not a physical attestation">
      Use a made-up, non-sensitive tracking token (example: asset_ab12cd) to compare your own inspected records. Never paste an actual device ID, serial, MAC, IP, hostname, camera location, MQTT topic or secret. Identical tokens do not prove unchanged hardware. If uncertain, select Unknown or Mismatch and recheck physically.
    </CardHelp>
    <div className="owner-trial-reconcile-stats" aria-label="Repeat trial routing counts">
      <span>{routes.length} module checks on HOLD</span>
      <span>{repeat} requiring repeat trial</span>
      <span>{routes.length - repeat} requiring baseline/evidence intake</span>
      <span>0 automatic actions</span>
    </div>
    <fieldset className="owner-review-entry">
      <legend>Record a witnessed source identity classification</legend>
      <div className="owner-trial-controls">
        <label>Identity trial case
          <select value={caseId} onChange={event => { setCaseId(event.target.value as TrialCaseId); setWitnessed(false); }}>
            {TRIAL_CASES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label>Personally observed source identity
          <select value={sourceState} onChange={event => { setSourceState(event.target.value as SourceIdentityState); setWitnessed(false); }}>
            <option value="identity_unknown">Unknown or not independently inspected</option>
            <option value="confirmed_alias">Inspected, pseudonymous tracking alias recorded (claim)</option>
            <option value="operator_mismatch">Different or contradictory source identity observed</option>
          </select>
        </label>
      </div>
      {sourceState !== "identity_unknown" && <label>Made-up safe asset tracking token (not a device identifier)
        <input type="text" maxLength={18} placeholder="asset_ab12cd" value={alias} autoComplete="off"
          onChange={event => { setAlias(event.target.value); setWitnessed(false); }} />
      </label>}
      <label className="owner-trial-check"><input type="checkbox" checked={witnessed}
        onChange={event => setWitnessed(event.target.checked)} />
        I personally inspected this exact source in the currently witnessed Windows context; this is not independent certification.</label>
      <button type="button" disabled={!witnessed} onClick={record}>Record private identity check (no action)</button>
    </fieldset>
    <div className="owner-trial-controls">
      <label>Show routing results
        <select value={filter} onChange={event => setFilter(event.target.value as RouteFilter)}>
          <option value="all">All nine manual routes</option><option value="repeat">Repeat trial required</option>
          <option value="missing">Missing or historical evidence</option>
        </select>
      </label>
    </div>
    <div className="owner-source-route-list" aria-label="Private repeat trial routes">
      {shown.map(route => <article key={route.case_id}>
        <div>
          <strong>{route.label}</strong>
          <p>{route.source} · {route.section} · {route.recommended_owner.replaceAll("_", " ")}</p>
          <b>{route.priority.replaceAll("_", " ")}</b>
          <ul>{route.reasons.map(reason => <li key={reason}>{reason.replaceAll("_", " ")}</li>)}</ul>
          {route.reasons.length === 0 && <p>No detected token change; this never proves a matching physical identity or clears the field HOLD.</p>}
          <p>{route.instruction}</p>
        </div>
        <div className="owner-source-route-actions">
          <button type="button" onClick={() => { setWitnessed(false); onChooseCase(route.case_id); }}>Select manual trial</button>
          <button type="button" onClick={() => { setWitnessed(false); onNavigate(route.section); }}>Open {route.section} for inspection</button>
        </div>
      </article>)}
      {shown.length === 0 && <p>No routes match this filter. Field acceptance is still on HOLD.</p>}
    </div>
    {feedback && <p role="status" className="owner-trial-feedback">{feedback}</p>}
    <p className="owner-trial-privacy">These owner-safe labels and routes remain local to this browser session unless privately exported. Historical imports, changed source identity, reopened issues, missing Windows version and reviewer evidence gaps require a new personally witnessed trial. Source equality is not physical proof. <strong>No job dispatch, camera/HA/MQTT command, workshop operation, automated closure or field acceptance is authorized.</strong></p>
  </section>;
}
