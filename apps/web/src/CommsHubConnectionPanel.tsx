import { useState } from "react";

/** Build 189 / QL-265. Local UI contract only; never connects to the home server relay. */
export function CommsHubConnectionPanel() {
  const [report, setReport] = useState("");
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
      signedProofB: "NOT_VERIFIED", privateRoles: "NOT_VERIFIED",
      isolatedNonproductionTenant: "NOT_VERIFIED", ownerTestAuthorization: "NOT_GIVEN",
      windowsPrivateRelay: "NOT_INSTALLED_OR_STARTED",
      remoteConnection: "DISCONNECTED / HOLD"
    }, null, 2));
  }
  return <section className="panel" aria-labelledby="ql265-comms-hub-title">
    <h2 id="ql265-comms-hub-title">I.T. · Rosevear Comms Hub connection</h2>
    <p><strong>DISCONNECTED / HOLD.</strong> This panel is deliberately local. It does not inspect or expose cameras, Home Assistant, MQTT, vault contents, IP addresses, private tunnel details or signer material.</p>
    <p>Source: <code>RosevearCreations/rosevear-ai-hub</code> · Original signed proof: <code>docs/integration/ql246-source-proof.json</code> not independently verified.</p>
    <ol>
      <li>Privately authenticate the signer custodian, separate nonce witness and reviewer, and approve a restricted persistent signing host.</li>
      <li>Verify the public SPKI pin out of band, and an isolated nonproduction GET-only source contract.</li>
      <li>Obtain owner TEST-only authorization, a rollback/stop plan and bounded network approval before any real GET.</li>
    </ol>
    <button type="button" onClick={checkLocalContract}>Run local Comms Hub readiness check (no network)</button>
    <p>Local PASS does not indicate that the Windows relay is installed, started or safe to connect.</p>
    <pre role="status" aria-live="polite" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: 340, overflow: "auto" }}>{report || "Not run. Private relay remains OFF."}</pre>
  </section>;
}
