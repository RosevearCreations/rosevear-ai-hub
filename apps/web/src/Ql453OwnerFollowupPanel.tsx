import { useEffect, useRef, useState } from "react";
import { getMasterShellFollowup344 } from "./api";
import { MasterCommandVisualSystem } from "./MasterCommandVisualSystem";

type Followup = {
  schema: "rosevear.ai-hub.ql453-owner-followup.v1";
  sourceBuild: 344;
  state: string;
  connection: "HOLD";
  incidentStatus: "OPEN_UNVERIFIED";
  incidentClosed: false;
  activationAuthorized: false;
  closureAuthorized: false;
  physicalReceiverCurrentlyOff: false;
  receiver: "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF";
  manualIsolationAndIndependentOffRequired: true;
  slaveGate: "HOLD_NEXT_MASTER_INTEGRATION_STAGE";
  originalHost: "DESKTOP-AE894KC";
  ql452ProtectedHistory: string;
  independentFreshOffReadback: string;
  offReadbackExpiresAt: null;
  signedOwnerReview: string;
  threeMasterHandoff: string;
  driftEscalation: string;
  crossAppConnectivityVerified: false;
  handoffContractDigest: string;
  applicationHandoffOrder: string[];
  securityTiers: string[];
  nextMasterHandoff: "rosevear-comms-hub";
  messageDelivered: false;
  message: string;
};

const order = ["ai-data-platform", "rosevear-ai-hub", "rosevear-comms-hub",
  "iCamp", "YW", "devilndove", "rosiedazzlers"];
const tiers = ["PUBLIC_READ", "USER_SCOPED", "TENANT_SCOPED", "OPERATOR_SCOPED",
  "MASTER_GOVERNANCE", "ORIGINAL_HOST_OWNER_CEREMONY"];

function trusted(value: unknown): Followup | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const p = value as Record<string, unknown>;
  const links = p.applicationHandoffOrder;
  const levels = p.securityTiers;
  if (p.schema !== "rosevear.ai-hub.ql453-owner-followup.v1" ||
      p.sourceBuild !== 344 || p.connection !== "HOLD" ||
      p.incidentStatus !== "OPEN_UNVERIFIED" || p.incidentClosed !== false ||
      p.activationAuthorized !== false || p.closureAuthorized !== false ||
      p.physicalReceiverCurrentlyOff !== false ||
      p.receiver !== "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF" ||
      p.manualIsolationAndIndependentOffRequired !== true ||
      p.slaveGate !== "HOLD_NEXT_MASTER_INTEGRATION_STAGE" ||
      p.originalHost !== "DESKTOP-AE894KC" ||
      p.offReadbackExpiresAt !== null ||
      p.crossAppConnectivityVerified !== false ||
      p.messageDelivered !== false ||
      p.nextMasterHandoff !== "rosevear-comms-hub" ||
      !Array.isArray(links) || links.length !== order.length ||
      !order.every((name, i) => links[i] === name) ||
      !Array.isArray(levels) || levels.length !== tiers.length ||
      !tiers.every((name, i) => levels[i] === name) ||
      typeof p.handoffContractDigest !== "string" ||
      !/^[0-9a-f]{64}$/.test(p.handoffContractDigest) ||
      typeof p.state !== "string" || typeof p.message !== "string" ||
      typeof p.ql452ProtectedHistory !== "string" ||
      typeof p.independentFreshOffReadback !== "string" ||
      typeof p.signedOwnerReview !== "string" ||
      typeof p.threeMasterHandoff !== "string" ||
      typeof p.driftEscalation !== "string") return null;
  return p as Followup;
}

/** Read-only owner view: no receiver commands, no cross-app message transmission. */
export function Ql453OwnerFollowupPanel() {
  const [result, setResult] = useState<Followup | null>(null);
  const [message, setMessage] = useState("Original QL-453 follow-up signers are not enrolled.");
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function refresh() {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setResult(null);
    setBusy(true);
    try {
      const response: unknown = await getMasterShellFollowup344(current.signal);
      if (controller.current !== current) return;
      const accepted = trusted(response);
      setResult(accepted);
      setMessage(accepted ? accepted.message : "Invalid QL-453 reply: HOLD.");
    } catch {
      if (controller.current !== current) return;
      setResult(null);
      setMessage("QL-453 owner evidence unavailable: HOLD.");
    } finally {
      if (controller.current === current) setBusy(false);
    }
  }

  return <MasterCommandVisualSystem
    title="Receiver & Ceremony"
    subtitle="QL-453 expiring signed OFF readback, owner follow-up and Master drift escalation"
    release="344"
    currentPath="#ql453-owner-followup"
    navigation={[{ id: "followup", label: "QL-453 signed follow-up",
      href: "#ql453-owner-followup" }]}
    kpis={result ? [
      { id: "connection", icon: "◉", label: "Connection", value: "HOLD",
        detail: "No inter-app handshake", tone: "warning" },
      { id: "incident", icon: "⊘", label: "Incident", value: "OPEN",
        detail: "No closure authority", tone: "critical" },
      { id: "receiver", icon: "?", label: "Physical receiver", value: "UNKNOWN",
        detail: "Historical evidence is not current OFF", tone: "neutral" },
    ] : []}
    workspaces={[]}>
    <section id="ql453-owner-followup" className="mc-panel">
      <h3>Independent signed follow-up and expiry</h3>
      <p>Historical QL-452 reconciliation, original host and independent receiver
        signatures, 45-second expiry check, owner veto and three distinct chained
        Master signatures. Changed, expired or conflicting evidence requires
        escalation and fresh independent verification. No automatic actuation.</p>
      <button type="button" disabled={busy} onClick={() => void refresh()}>
        {busy ? "Reading protected status…" : "Refresh QL-453 follow-up"}
      </button>
      <p role="status">{message}</p>
      {result && <dl>
        <dt>Original QL-452 history</dt><dd>{result.ql452ProtectedHistory}</dd>
        <dt>Independent OFF readback</dt><dd>{result.independentFreshOffReadback}</dd>
        <dt>Expiry</dt><dd>NOT VERIFIED — no current expiry evidence</dd>
        <dt>Signed owner review</dt><dd>{result.signedOwnerReview}</dd>
        <dt>Three-Master handoff</dt><dd>{result.threeMasterHandoff}</dd>
        <dt>Drift escalation</dt><dd>{result.driftEscalation}</dd>
        <dt>Incident / physical receiver</dt><dd>OPEN / HOLD — OFF UNKNOWN</dd>
        <dt>Cross-app message delivery</dt><dd>NOT VERIFIED — no transport enabled</dd>
      </dl>}
      <h4>Ordered application handoff</h4>
      <ol>{order.map(name => <li key={name}>{name}</li>)}</ol>
      <h4>Shared six-level security hierarchy</h4>
      <ol>{tiers.map(name => <li key={name}>{name}</li>)}</ol>
      <p>The original-host ceremony tier is never granted through a cross-app
        message. GitHub CI and signed metadata alone cannot activate a receiver,
        close an incident or certify a live connection.</p>
    </section>
  </MasterCommandVisualSystem>;
}
