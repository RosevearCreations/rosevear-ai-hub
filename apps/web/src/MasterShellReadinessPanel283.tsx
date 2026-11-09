import { useState } from "react";

import { buildMasterShellCandidateReport, hubModuleEstimates, masterShellOpenDecisions, masterShellRoutingAssessment } from "./masterShellReadiness283";

/** Owner-only, local review of a proposed report. Never publishes or authenticates. */
export function MasterShellReadinessPanel283() {
  const [scope, setScope] = useState<"applicable" | "not-applicable" | "all">("applicable");
  const [showPreview, setShowPreview] = useState(false);
  const modules = hubModuleEstimates.filter(item => scope === "all" || (scope === "applicable" ? item.percent !== null : item.percent === null));

  return <section className="panel" aria-labelledby="master-shell-candidate-title">
    <p className="eyebrow">Build 283 · proposed Master Shell readiness</p>
    <h2 id="master-shell-candidate-title">AI Hub source inventory and evidence gaps</h2>
    <p><strong>Owner review only — not transmitted.</strong> AI Data Platform owns suite-wide completion and monitoring; Rosevear Comms Hub owns operational communications. This Hub supplies only its own proposed status and evidence. No shared contract or private connection has been activated by this screen.</p>
    <p>Percentages below are <strong>unverified Build 281 source-review estimates</strong>, not audited product completion or Windows deployment proof. N/A is not zero. Current results must be independently reconciled before the Master Shell can use them as truth.</p>
    <label htmlFor="master-shell-module-scope">Module scope</label>{" "}
    <select id="master-shell-module-scope" value={scope} onChange={event => setScope(event.target.value as typeof scope)}>
      <option value="applicable">AI Hub modules</option>
      <option value="not-applicable">Other applications' responsibilities</option>
      <option value="all">All requested facets</option>
    </select>
    <p role="status">{modules.length} module facets shown; no live status requests made.</p>
    <ul aria-label="Master Shell candidate module evidence">
      {modules.map(module => <li key={module.id}>
        <strong>{module.label}: {module.percent === null ? "N/A" : `${module.percent}% provisional`}</strong>
        <div>Code evidence: {module.evidence}</div>
        <div>Required proof: {module.outstanding}</div>
      </li>)}
    </ul>
    <h3>Integration routes and present boundaries</h3>
    <ul>{masterShellRoutingAssessment.map(route => <li key={route.flow}><strong>{route.flow} — {route.state}</strong>. {route.detail}</li>)}</ul>
    <h3>Decisions for the joint Master Shell architecture</h3>
    <ol>{masterShellOpenDecisions.map(decision => <li key={decision}>{decision}</li>)}</ol>
    <button type="button" aria-expanded={showPreview} aria-controls="master-shell-candidate-preview" onClick={() => setShowPreview(previous => !previous)}>
      {showPreview ? "Hide proposed report schema" : "Preview proposed report schema"}
    </button>
    {showPreview && <div id="master-shell-candidate-preview">
      <p>Local preview only. No upload, clipboard write, API call, recipient subscription or authorization change.</p>
      <pre className="hub-report-preview" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{JSON.stringify(buildMasterShellCandidateReport(), null, 2)}</pre>
    </div>}
  </section>;
}
