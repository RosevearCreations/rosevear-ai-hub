import { CardHelp } from "./CommandShell";
import type { ReassessmentNote } from "./ownerRecurrenceReassessment";
import { summarizeQl256Continuity } from "./ql256RenewalContinuity";

/** Read-only owner-safe QL-256 next-action panel; no keys, contacts or private receipt upload. */
export function Ql256SignerCustodyPanel({ reassessments }: { reassessments: readonly ReassessmentNote[] }) {
  const summary = summarizeQl256Continuity(reassessments);
  return <section className="owner-handoff-reconciliation" aria-label="Build 183 QL-256 real signer custody readiness">
    <header className="owner-trial-ledger-heading"><div>
      <h3>QL-256 · Real Ed25519 signer and independent custody handoff</h3>
      <p>Source code has GREEN CI; this screen cannot inspect a private signer, appoint a real person or approve a network trial.</p>
    </div><strong className="owner-trial-hold">PRIVATE TRUST: HOLD</strong></header>
    <CardHelp title="Build 183 signer provisioning and trustworthy evidence">
      A genuine signer requires an approved separate private key store and a real custodian. A different independently authenticated witness must confirm the public SPKI SHA-256 through a separately maintained registry, with an opaque private receipt. Never paste an Ed25519 private key, HMAC secret, owner identity document, LAN address, vault or device information here. The owner must later authenticate a TEST-only decision for a narrow future nonproduction GET window; a normal GREEN release is not that permission.
    </CardHelp>
    <div className="owner-decision-summary">
      <span>{summary.reassessments_reviewed} private reassessments · {summary.unique_case_watch_pairs} case/watch pairs</span>
      <span>{summary.repeated_original_source_gaps} repeat original source gaps</span>
      <span>{summary.aging_over_seven_days} older than 7 days</span>
      <span>Signer: STATUS UNKNOWN · no relay installation</span>
    </div>
    <fieldset className="owner-review-entry"><legend>Verified source and actual missing trust material</legend>
      <p>Verified public Build 182 source A/CI (not a private signer audit): <code>9cac2ebcb386bec7dfcf2379acb0998c531c6aa1</code> · completed GREEN main Actions run <a href="https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/40878851316" target="_blank" rel="noreferrer">40878851316</a>.</p>
      <p>Original source proof at this immutable SHA: HTTP 404. Signer decision <strong>SIGNER_STATUS_UNKNOWN</strong>, no assigned independent custodian/witness/reviewer and no trusted SPKI pin or final proof B. An absent public file cannot prove the private signer does not exist.</p>
      <p>Immediate action: appoint an authorized private signer custodian and a different independent witness, choose approved private key storage, and record the decision outside GitHub. A separate owner-approved nonproduction test is a later gate.</p>
      <p>Use <code>npm run integration:ql256:hub:check</code> for a redacted config inventory; opt into public GitHub-only verification with <code>npm run integration:ql256:hub:check -- --public-get --source &lt;full-A-sha&gt;</code>. No gateway or home device is contacted.</p>
    </fieldset>
    <fieldset className="owner-review-entry"><legend>Proposed future Windows mini-server, not installed</legend>
      <p>Dedicated least-privilege service account; outbound-only private TLS/Tailscale; isolated app/tenant credentials; no device, vault, MQTT, Home Assistant or camera permissions; bounded health checks, kill switch, revocation and return-to-disabled verification. No existing Windows startup task or household access was changed.</p>
      <p>Owner TEST-only approval: NOT GIVEN. Original health/capability/denial/audit receipts: NOT RUN / NOT VERIFIED. Relay installed or started: NO. Connection: DISCONNECTED / HOLD.</p>
    </fieldset>
    <p className="owner-trial-privacy">Operator notes remain historical, local, untrusted claims until independently verified. No private signing key, signer custody, witness, approval, Windows service or authenticated GET has been created by this build.</p>
  </section>;
}
