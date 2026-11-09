import { useState } from "react";

import { hubModuleEstimates } from "./masterShellReadiness283";
import { fieldEvidencePreflight, fieldEvidenceReportPreview, fieldFreshness, loadOwnerFieldObservations, saveOwnerFieldObservation, type OwnerFieldObservation, type OwnerFieldOutcome } from "./fieldAcceptance284";

function localStorageOrNull(): Storage | null {
  try { return typeof window !== "undefined" ? window.localStorage : null; }
  catch { return null; }
}

/** Manual owner-reported field notes; never a remote test, independent certificate or publisher. */
export function OwnerFieldAcceptance284({ ownerId }: { ownerId: string }) {
  const [observations, setObservations] = useState<OwnerFieldObservation[]>(() => loadOwnerFieldObservations(localStorageOrNull(), ownerId));
  const [message, setMessage] = useState("No field observations changed in this session.");
  const [scope, setScope] = useState<"pending" | "all" | "recorded">("pending");
  const [showPreview, setShowPreview] = useState(false);
  const nowMs = Date.now();
  const summary = fieldEvidencePreflight(observations, nowMs);
  const records = new Map(observations.map(record => [record.moduleId, record]));
  const applicable = hubModuleEstimates.filter(module => module.percent !== null);
  const visible = applicable.filter(module => {
    const record = records.get(module.id);
    return scope === "all" || (scope === "recorded" ? Boolean(record) : fieldFreshness(record, nowMs) !== "CURRENT_OWNER_REPORT" || record?.outcome === "owner_reported_problem");
  });

  function record(moduleId: string, outcome: OwnerFieldOutcome | null) {
    const saved = saveOwnerFieldObservation(localStorageOrNull(), ownerId, observations, moduleId, outcome, Date.now());
    if (saved.saved) setObservations(saved.observations);
    setMessage(saved.saved ? "Owner report saved only in this browser. Independent field acceptance remains unverified." : "Could not save owner report locally. No field state was changed.");
  }

  return <section aria-labelledby="hub-field-preflight-title">
    <p className="eyebrow">Build 284 · owner field reports and freshness</p>
    <h3 id="hub-field-preflight-title">Installed-system evidence preflight</h3>
    <p>This is a <strong>personal, browser-local checklist</strong>. Recording a result does not contact Ree's Windows server, prove a device works, obtain an independent witness or authorize reporting to AI Data Platform.</p>
    <ul aria-label="Owner field evidence freshness summary">
      <li>AI Hub modules requiring review: {summary.applicableModuleCount}</li>
      <li>Never reviewed here: {summary.missing}</li>
      <li>Current owner-reported records (30 days): {summary.currentOwnerReports}</li>
      <li>Stale owner reports: {summary.stale}</li>
      <li>Clock anomalies requiring review: {summary.clockCheck}</li>
      <li>Owner-reported issues: {summary.reportedIssues}</li>
      <li>Independently verified module acceptances: <strong>0</strong> — no independent evidence intake is enabled.</li>
    </ul>
    <p><strong>Master Shell report preflight: BLOCKED.</strong> Independent field proof and the shared reporting contract are still outstanding; no publisher or receiver is activated.</p>
    <label htmlFor="hub-field-filter">Show module observations</label>{" "}
    <select id="hub-field-filter" value={scope} onChange={event => setScope(event.target.value as typeof scope)}>
      <option value="pending">Missing, stale or clock-check</option>
      <option value="recorded">Recorded on this browser</option>
      <option value="all">All AI Hub modules</option>
    </select>
    <p role="status">{message} {visible.length} module(s) shown.</p>
    <ul aria-label="Owner field module review">
      {visible.map(module => {
        const observation = records.get(module.id);
        const freshness = fieldFreshness(observation, nowMs);
        return <li key={module.id}>
          <strong>{module.label}</strong> — {freshness.replaceAll("_", " ").toLowerCase()}
          <div>Field work needed: {module.outstanding}</div>
          {observation && <div>Owner reported: {observation.outcome === "owner_reported_working" ? "working" : "needs attention"}; recorded {new Date(observation.observedAtMs).toLocaleString()} (local browser clock).</div>}
          <div className="hub-connection-actions">
            <button type="button" onClick={() => record(module.id, "owner_reported_working")} aria-label={`Record owner-reported working: ${module.label}`}>Owner reports working</button>
            <button type="button" onClick={() => record(module.id, "owner_reported_problem")} aria-label={`Record issue: ${module.label}`}>Report issue</button>
            {observation && <button type="button" onClick={() => record(module.id, null)} aria-label={`Remove local observation: ${module.label}`}>Remove local record</button>}
          </div>
        </li>;
      })}
    </ul>
    <button type="button" aria-expanded={showPreview} aria-controls="hub-field-preflight-report" onClick={() => setShowPreview(previous => !previous)}>
      {showPreview ? "Hide owner field preflight preview" : "Preview owner field preflight report"}
    </button>
    {showPreview && <div id="hub-field-preflight-report">
      <p>Review-only aggregate. No identity, credential, private device address or owner notes are included. This preview is neither an external report nor signed acceptance.</p>
      <pre className="hub-report-preview" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{JSON.stringify(fieldEvidenceReportPreview(observations, nowMs), null, 2)}</pre>
    </div>}
  </section>;
}
