import { useState } from "react";

import {
  assessVaultDecisionGate, vaultDecisionQuestions, vaultDesignPaths, vaultFailureCases,
  type VaultDesignPath,
} from "./vaultDecisionGate";

/** Session-only owner decision planning. No submit, API request or secret fields. */
export function VaultDecisionGatePanel() {
  const [preference, setPreference] = useState<VaultDesignPath | null>(null);
  const [reviewedIds, setReviewedIds] = useState<string[]>([]);
  const state = assessVaultDecisionGate(preference, reviewedIds);

  return <section className="panel" id="vault-build226" aria-labelledby="vault-build226-title">
    <div className="vault-gates-heading"><div>
      <p className="eyebrow">Build 226 · owner design decision checkpoint</p>
      <h2 id="vault-build226-title">First-party local vault: decision and independent review gate</h2>
      <p>Choose which design direction we want to evaluate next. A preference is not approval to build, install, store passwords, enable MFA or migrate documents.</p>
    </div><span className="vault-gate-badge">{state.independently_verified_security_gates} / {state.required_security_gates} VERIFIED · SECURITY HOLD</span></div>

    <h3>Owner design direction (this page session only)</h3>
    <fieldset><legend>Which approach should we investigate?</legend>
      {vaultDesignPaths.map(option => <label key={option.id} style={{ display: "block", marginBlock: "0.75rem" }}>
        <input type="radio" name="vault-design-preference" checked={preference === option.id} onChange={() => setPreference(option.id)} />
        <strong>{option.title}</strong>
      </label>)}
    </fieldset>
    {preference && <div role="status" aria-live="polite">
      {vaultDesignPaths.filter(option => option.id === preference).map(option => <div key={option.id}>
        <p><strong>Benefit:</strong> {option.benefit}</p>
        <p><strong>Cost and responsibility:</strong> {option.cost}</p>
        <p><strong>Next planning step:</strong> {option.next}</p>
      </div>)}
      <p>Preference recorded in memory for this page only; independent assessment remains unverified.</p>
    </div>}
    {!preference && <p>No direction selected in this session. The earlier first-party concept remains a proposal, not an approved implementation.</p>}

    <h3>Independent security review packet · questions to resolve</h3>
    <p>These review markers only help us read the requirements. They never count as externally verified security evidence.</p>
    <ol>{vaultDecisionQuestions.map(item => <li key={item.id}>
      <label><input type="checkbox" checked={reviewedIds.includes(item.id)} onChange={event => setReviewedIds(current => event.target.checked ? [...current, item.id] : current.filter(id => id !== item.id))} />
        <strong>{item.title}</strong>: {item.requirement}</label>
    </li>)}</ol>
    <p role="status">{state.review_progress.reviewed} of {state.review_progress.total} questions reviewed locally · 0 of 6 independently verified · no owner pilot authorization.</p>

    <details><summary>Recovery failure scenarios required before any pilot</summary>
      <ul>{vaultFailureCases.map(item => <li key={item}>{item}</li>)}</ul>
    </details>
    <p>Independent assessor must review exact source, dependency versions, Windows build identity, cryptography, household access denial, document leakage, backup/restore and incident recovery. Unresolved high/critical findings keep deployment blocked. Real evidence stays outside Hub and GitHub.</p>
    <button type="button" onClick={() => { setPreference(null); setReviewedIds([]); }}>Clear session-only decision notes</button>
    <p className="vault-architecture-note"><strong>SECURITY HOLD:</strong> no first-party vault runtime installed, no credentials or private documents accepted, no MFA enabled, no private relay activated. GitHub CI GREEN cannot lift these gates.</p>
  </section>;
}
