import { useEffect, useRef, useState } from "react";
import { getMasterShellReconciliation343 } from "./api";
import { MasterCommandVisualSystem } from "./MasterCommandVisualSystem";

type ReconciliationStatus = {
  schema: "rosevear.ai-hub.ql452-owner-reconciliation.v1";
  sourceBuild: 343;
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
  ql451ProtectedOutcome: string;
  independentExceptionFollowUp: string;
  originalHostFreshOffReadback: string;
  threeMasterGovernance: string;
  dualOwnerClosureBoundary: string;
  lastIndependentObservationAt: null;
  nextMasterHandoff: "rosevear-comms-hub";
  applicationHandoffOrder: string[];
  connectivityVerified: false;
  message: string;
};

const applicationOrder = [
  "ai-data-platform",
  "rosevear-ai-hub",
  "rosevear-comms-hub",
  "iCamp",
  "YW",
  "devilndove",
  "rosiedazzlers",
];

function inspect(value: unknown): ReconciliationStatus | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const s = value as Record<string, unknown>;
  const handoff = s.applicationHandoffOrder;
  if (s.schema !== "rosevear.ai-hub.ql452-owner-reconciliation.v1" ||
      s.sourceBuild !== 343 || s.connection !== "HOLD" ||
      s.incidentStatus !== "OPEN_UNVERIFIED" || s.incidentClosed !== false ||
      s.activationAuthorized !== false || s.closureAuthorized !== false ||
      s.physicalReceiverCurrentlyOff !== false ||
      s.receiver !== "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF" ||
      s.manualIsolationAndIndependentOffRequired !== true ||
      s.slaveGate !== "HOLD_NEXT_MASTER_INTEGRATION_STAGE" ||
      s.originalHost !== "DESKTOP-AE894KC" ||
      s.lastIndependentObservationAt !== null ||
      s.nextMasterHandoff !== "rosevear-comms-hub" ||
      s.connectivityVerified !== false ||
      !Array.isArray(handoff) ||
      handoff.length !== applicationOrder.length ||
      !applicationOrder.every((name, i) => handoff[i] === name) ||
      typeof s.state !== "string" || typeof s.message !== "string" ||
      typeof s.ql451ProtectedOutcome !== "string" ||
      typeof s.independentExceptionFollowUp !== "string" ||
      typeof s.originalHostFreshOffReadback !== "string" ||
      typeof s.threeMasterGovernance !== "string" ||
      typeof s.dualOwnerClosureBoundary !== "string") return null;
  return s as ReconciliationStatus;
}

/** A historical source review; never an actuator or physical OFF readback. */
export function Ql452OwnerReconciliationPanel() {
  const [status, setStatus] = useState<ReconciliationStatus | null>(null);
  const [message, setMessage] = useState("QL-452 original evidence is not enrolled.");
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function refresh() {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setBusy(true);
    setStatus(null);
    try {
      const response: unknown = await getMasterShellReconciliation343(current.signal);
      if (controller.current !== current) return;
      const result = inspect(response);
      setStatus(result);
      setMessage(result ? result.message : "Untrusted QL-452 response: HOLD.");
    } catch {
      if (controller.current !== current) return;
      setStatus(null);
      setMessage("QL-452 original source unavailable: HOLD.");
    } finally {
      if (controller.current === current) setBusy(false);
    }
  }

  return <MasterCommandVisualSystem
    title="Receiver & Ceremony"
    subtitle="QL-452 independent signed renewal reconciliation and exception follow-up"
    release="343"
    currentPath="#ql452-reconciliation"
    navigation={[{ id: "reconciliation", label: "Protected outcome review",
      href: "#ql452-reconciliation" }]}
    kpis={status ? [
      { id: "connection", icon: "◉", label: "Connection", value: "HOLD",
        detail: "Receiver activation disabled", tone: "warning" },
      { id: "incident", icon: "⊘", label: "Incident", value: "OPEN",
        detail: "No closure authority", tone: "critical" },
      { id: "receiver", icon: "?", label: "Physical receiver", value: "UNKNOWN",
        detail: "No fresh independently witnessed OFF", tone: "neutral" },
    ] : []}
    workspaces={[]}>
    <section id="ql452-reconciliation" className="mc-panel">
      <h3>QL-452 signed renewal and recurrence follow-up</h3>
      <p>Independent recheck of original protected QL-450 and QL-451 signed source,
        corrective officer, external anchor, three 10s/30s host and receiver
        horizons, closure denial, three Masters and two owners. Even an accepted
        historical RENEWED receipt never authorizes closure or proves current OFF.
        Exceptions remain open for fresh corrective evidence.</p>
      <button type="button" disabled={busy} onClick={() => void refresh()}>
        {busy ? "Reading protected state…" : "Refresh QL-452 review"}
      </button>
      <p role="status">{message}</p>
      {status && <dl>
        <dt>QL-451 historical signed custody</dt><dd>{status.ql451ProtectedOutcome}</dd>
        <dt>Independent exception follow-up</dt><dd>{status.independentExceptionFollowUp}</dd>
        <dt>Original host</dt><dd>{status.originalHost}</dd>
        <dt>Fresh independent OFF witness</dt><dd>{status.originalHostFreshOffReadback}</dd>
        <dt>Three-Master governance</dt><dd>{status.threeMasterGovernance}</dd>
        <dt>Two-owner closure boundary</dt><dd>{status.dualOwnerClosureBoundary}</dd>
        <dt>Incident and receiver</dt><dd>OPEN / HOLD — physical OFF UNKNOWN</dd>
        <dt>Connectivity</dt><dd>NOT VERIFIED — no cross-app activation</dd>
      </dl>}
      <h4>Owner-directed connectivity handoff order</h4>
      <ol>{applicationOrder.map(name => <li key={name}>{name}</li>)}</ol>
      <p>The next Master recipient is rosevear-comms-hub. Each application must
        independently prove its own production SHA and connectivity. This panel
        does not send a message or change another application.</p>
    </section>
  </MasterCommandVisualSystem>;
}
