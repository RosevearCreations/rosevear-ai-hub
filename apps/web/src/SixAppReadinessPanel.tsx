import { useState } from "react";

import { CardHelp } from "./CommandShell";
import { assessSixAppReadiness, integrationEvidenceGates, originalIntegrationGaps, type SixAppId } from "./sixAppIntegrationReadiness";

/** A fixed, offline contract map. Never makes a gateway, repository or credential request. */
export function SixAppReadinessPanel() {
  const [selected, setSelected] = useState<SixAppId | "all">("all");
  const [expandedGate, setExpandedGate] = useState<string>("source");
  const report = assessSixAppReadiness();
  const visible = selected === "all" ? report.apps : report.apps.filter(app => app.id === selected);

  return <section className="panel" aria-labelledby="hub-six-app-title">
    <header className="hub-search-header"><div>
      <p className="eyebrow">Build 227 · offline nonproduction planning</p>
      <h2 id="hub-six-app-title">Six-app integration contract &amp; readiness</h2>
    </div><CardHelp title="What readiness means">This is a fixed contract checklist, not a connectivity monitor. It never queries the six public sites or the private gateway, and it never accepts signed proof, PINs, keys or owner authorization. Green source tests do not verify a connection.</CardHelp></header>
    <p>All six applications remain <strong>DISCONNECTED / HOLD</strong>. Original evidence, independent reviewer clearance, isolated TEST permissions and separate owner authorization are still required.</p>
    <div className="audit-summary" aria-label="Six-app readiness summary">
      <div><span>Applications</span><strong>{report.required_apps}</strong></div>
      <div><span>Independently ready</span><strong>{report.independently_ready_apps}</strong></div>
      <div><span>Authenticated gateway GETs</span><strong>{report.authenticated_gateway_gets}</strong></div>
      <div><span>Private relay</span><strong>OFF</strong></div>
    </div>
    <label htmlFor="six-app-readiness-select">Review application</label>
    <select id="six-app-readiness-select" value={selected} onChange={event => setSelected(event.target.value as SixAppId | "all")}>
      <option value="all">All six applications</option>
      {report.apps.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}
    </select>
    <div className="vault-security-grid" aria-label="Six-app contract matrix">
      {visible.map(app => <article className="vault-security-card" key={app.id} aria-label={`${app.name} integration contract`}>
        <p className="eyebrow">{app.overall}</p><h3>{app.name}</h3>
        <p>{app.purpose}</p>
        <p><strong>Proposed read-only capability:</strong> {app.proposedCapability}</p>
        <p><strong>Identity boundary:</strong> {app.scope}</p>
        <p><strong>Original source SHA / signed proof:</strong> Not independently verified; no immutable proof claimed.</p>
        <p><strong>Independent witness / scoped TEST / owner decision:</strong> Not verified / not authorized.</p>
        <p>Six of six prerequisite gates unverified. No live GET or activation.</p>
      </article>)}
    </div>
    <h3>Contract verification gates</h3>
    <p>Choose a gate to see the required independent evidence. Viewing it cannot satisfy the gate.</p>
    <label htmlFor="six-app-gate-select">Evidence topic</label>
    <select id="six-app-gate-select" value={expandedGate} onChange={event => setExpandedGate(event.target.value)}>
      {integrationEvidenceGates.map(gate => <option value={gate.id} key={gate.id}>{gate.title}</option>)}
    </select>
    {integrationEvidenceGates.filter(gate => gate.id === expandedGate).map(gate => <div role="status" key={gate.id}>
      <p><strong>{gate.title}: NOT INDEPENDENTLY VERIFIED.</strong> {gate.need}</p>
    </div>)}
    <details><summary>Original evidence gaps and owner handoff</summary>
      <ol>{originalIntegrationGaps.map(gap => <li key={gap}>{gap}</li>)}</ol>
    </details>
    <p>Only after original signed/public proof, pin and custody evidence, independently witnessed negative tests, app-specific scoped identity and explicit owner TEST permission may a separate future nonproduction pilot be considered. No proofs or credentials are collected here.</p>
    <p role="status">QL-275: <strong>Under Review / Deferred</strong> · six-app gateway DISCONNECTED / HOLD · signed Proof-B NOT VERIFIED · 0 authenticated GETs · private relay OFF.</p>
  </section>;
}
