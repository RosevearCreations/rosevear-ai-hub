import { useState } from "react";
import { inspectQl267HubDecision, makeQl267HubSafeHandoff } from "./ql267HubEvidence";

/** QL-265 local UI; Build 192 / QL-267 adds safe in-memory status return and export. */
export function CommsHubConnectionPanel() {
  const [report, setReport] = useState("");
  const [dryRunPlan, setDryRunPlan] = useState("");
  const [publicDecisionInput, setPublicDecisionInput] = useState("");
  const [decisionStatus, setDecisionStatus] = useState("NOT_RECEIVED");
  const [safeHandoff, setSafeHandoff] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  function prepareQl267Handoff() {
    const inspected = inspectQl267HubDecision(publicDecisionInput);
    setDecisionStatus(inspected.status);
    setSafeHandoff(JSON.stringify(makeQl267HubSafeHandoff(inspected), null, 2));
    setPublicDecisionInput("");
    setCopyMessage("Prepared locally. No network request or private receipt authentication.");
  }
  async function copyQl267Handoff() {
    if (!safeHandoff) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(safeHandoff);
      setCopyMessage("Copied sanitized HOLD handoff. Nothing sent to a server.");
    } catch {
      setCopyMessage("Clipboard unavailable. Select and copy the sanitized JSON shown below.");
    }
  }
  function clearQl267Handoff() {
    setPublicDecisionInput("");
    setSafeHandoff("");
    setDecisionStatus("NOT_RECEIVED");
    setCopyMessage("Cleared this panel’s in-memory input and export.");
  }
  function checkLocalContract() {
    setReport(JSON.stringify({
      schema: "rosevear-comms-local-preflight/v1",
      source: "rosevear-ai-hub", mode: "LOCAL_INTERFACE_ONLY",
      checks: [
        { id: "source-identity", passed: true },
        { id: "private-relay-off", passed: true },
        { id: "home-devices-out-of-scope", passed: true },
        { id: "signer-and-witness-not-inferred", passed: true },
        { id: "owner-test-not-inferred", passed: true }
      ],
      localPass: true, networkRequests: 0, authenticatedGatewayGets: 0,
      originalReviewerReceipt: "NOT_RECEIVED", independentReviewerOrigin: "NOT_VERIFIED",
      signedProofB: "NOT_VERIFIED", privateRoles: "NOT_VERIFIED",
      isolatedNonproductionTenant: "NOT_VERIFIED", ownerTestAuthorization: "NOT_GIVEN",
      activationEligible: false, connectionGateDecision: "HELD_PENDING_ORIGINAL_REVIEWER_PROOF_B_AND_OWNER_TEST",
      ql264PrivateCustodyDecision: "NOT_INDEPENDENTLY_AUTHENTICATED",
      ql264OriginalPublicProofB: "NOT_AVAILABLE", ql264ReversiblePlan: "PLAN_ONLY",
      windowsPrivateRelay: "NOT_INSTALLED_OR_STARTED",
      remoteConnection: "DISCONNECTED / HOLD"
    }, null, 2));
  }
  function previewQl264DryRun() {
    setDryRunPlan(JSON.stringify({
      kind: "rosevear.ql264.offline-reversible-test-plan.v1",
      simulated: true, networkRequests: 0, methods: ["GET"],
      paths: ["/api/integration/v1/health", "/api/integration/v1/capabilities"],
      proposedMaxMinutes: 15, proposedMaxGets: 9,
      proposedDenials: [
        "missing_authentication", "invalid_credential", "expired_credential",
        "wrong_nonproduction_tenant", "wrong_application_audience",
        "replayed_nonce", "mismatched_independent_pin"
      ],
      preconditions: "PRIVATE_CUSTODY_PROOF_B_ISOLATION_OWNER_TEST_ROLLBACK_NOT_VERIFIED",
      rollback: "PLAN_NOT_APPROVED_OR_EXECUTED",
      activationEligible: false, authenticatedGatewayGets: 0,
      ownerTestAuthorization: "NOT_GIVEN", windowsPrivateRelay: "NOT_INSTALLED_OR_STARTED",
      remoteConnection: "DISCONNECTED / HOLD"
    }, null, 2));
  }
  return <section className="panel" aria-labelledby="ql265-comms-hub-title">
    <h2 id="ql265-comms-hub-title">I.T. · Rosevear Comms Hub connection</h2>
    <p><strong>DISCONNECTED / HOLD.</strong> This panel is deliberately local. It does not inspect or expose cameras, Home Assistant, MQTT, vault contents, IP addresses, private tunnel details or signer material.</p>
    <p>Source: <code>RosevearCreations/rosevear-ai-hub</code> · Original signed proof: <code>docs/integration/ql246-source-proof.json</code> not independently verified.</p>
    <p><strong>QL-264 private custody decision: HOLD.</strong> We have no independently authenticated original custodian, witness or reviewer decision. Signed source-proof B and the separate owner TEST-only authorization remain unavailable. A local check or a public self-report cannot unlock the remote connection.</p>
    <ol>
      <li>Privately authenticate the signer custodian, separate nonce witness and reviewer, and approve a restricted persistent signing host.</li>
      <li>Verify the public SPKI pin out of band, and an isolated nonproduction GET-only source contract.</li>
      <li>Obtain owner TEST-only authorization, a rollback/stop plan and bounded network approval before any real GET.</li>
    </ol>
    <button type="button" onClick={checkLocalContract}>Run local Comms Hub readiness check (no network)</button>
    <button type="button" onClick={previewQl264DryRun}>Preview reversible TEST-only plan (no network)</button>
    <p>Local PASS checks only this screen's fixed safe contract. It is not signer custody, original gateway evidence, pilot approval or permission to install the Windows relay.</p>
    <pre role="status" aria-live="polite" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: 340, overflow: "auto" }}>{report || "Not run. Private relay remains OFF."}</pre>
    <p>The optional QL-264 preview is a static checklist: proposed GET limits and denials are not executed, no credential or home-network route is used, and rollback is not authorized.</p>
    <pre aria-label="QL-264 reversible TEST-only plan" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: 340, overflow: "auto" }}>{dryRunPlan || "Plan not previewed. Integration still HELD."}</pre>
    <h3>QL-267 · Original public custody decision return (offline)</h3>
    <p>Paste only the original <strong>sanitized public QL-264 decision status JSON</strong> if an authorized source reviewer actually returned it. Never paste identities, signatures, challenges, credentials, key material, private paths, home addresses or customer information. Public status is a self-report, not verified custody.</p>
    <label htmlFor="ql267-hub-original-public-decision">Sanitized public status JSON (cleared after inspection; not saved)</label>
    <textarea id="ql267-hub-original-public-decision" value={publicDecisionInput} maxLength={8192} rows={5}
      onChange={event => {
        setPublicDecisionInput(event.target.value);
        setSafeHandoff("");
        setDecisionStatus("NOT_RECEIVED");
        setCopyMessage("");
      }}
      placeholder="Optional original public QL-264 status JSON only" />
    <div>
      <button type="button" onClick={prepareQl267Handoff}>Validate and prepare sanitized Hub handoff (offline)</button>
      <button type="button" onClick={copyQl267Handoff} disabled={!safeHandoff}>Copy sanitized Hub handoff</button>
      <button type="button" onClick={clearQl267Handoff}>Clear in-memory handoff</button>
    </div>
    <p><strong>Public decision intake:</strong> <span aria-label="QL-267 public decision intake status">{decisionStatus}</span>. No public report or copy action can grant TEST authorization, verify humans or schedule gateway GETs.</p>
    <p aria-live="polite">{copyMessage}</p>
    <pre aria-label="QL-267 sanitized Hub handoff" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: 420, overflow: "auto" }}>{safeHandoff || "No handoff prepared. Private relay and connection remain OFF / HOLD."}</pre>
  </section>;
}
