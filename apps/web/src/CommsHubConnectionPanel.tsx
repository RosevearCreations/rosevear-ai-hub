import { useState } from "react";

/** QL-265 local UI; Build 191 / QL-264 adds a reversible TEST-only planning preview. */
export function CommsHubConnectionPanel() {
  const [report, setReport] = useState("");
  const [dryRunPlan, setDryRunPlan] = useState("");
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
  </section>;
}
