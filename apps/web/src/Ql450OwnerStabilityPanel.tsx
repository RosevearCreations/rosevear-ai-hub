import { useEffect, useRef, useState } from "react";
import { getMasterShellStability341 } from "./api";
import { MasterCommandVisualSystem } from "./MasterCommandVisualSystem";

type StabilityStatus = {
  schema: "rosevear.ai-hub.ql450-owner-stability.v1";
  sourceBuild: 341;
  state: string;
  connection: "HOLD";
  activationAuthorized: false;
  closureAuthorized: false;
  physicalReceiverCurrentlyOff: false;
  receiver: "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF";
  manualIsolationAndIndependentOffRequired: true;
  slaveGate: "HOLD_NEXT_MASTER_INTEGRATION_STAGE";
  incidentStatus: "OPEN_UNVERIFIED";
  incidentClosed: false;
  originalHost: "DESKTOP-AE894KC";
  ql449ProtectedReview: string;
  originalCommsOpenIncident: string;
  originalIndependentAnchor: string;
  threeOriginalHostStabilityHorizons: string;
  independentReceiverHorizons: string;
  closureAuthorityBoundary: string;
  threeMasterRecurrence: string;
  twoOwnerContinuity: string;
  independentStabilityReviewAdmitted: false;
  lastIndependentObservationAt: null;
  message: string;
};

function inspect(value: unknown): StabilityStatus | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const s = value as Record<string, unknown>;
  if (s.schema !== "rosevear.ai-hub.ql450-owner-stability.v1" ||
      s.sourceBuild !== 341 || s.connection !== "HOLD" ||
      s.activationAuthorized !== false ||
      s.closureAuthorized !== false ||
      s.physicalReceiverCurrentlyOff !== false ||
      s.receiver !== "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF" ||
      s.manualIsolationAndIndependentOffRequired !== true ||
      s.slaveGate !== "HOLD_NEXT_MASTER_INTEGRATION_STAGE" ||
      s.incidentStatus !== "OPEN_UNVERIFIED" ||
      s.incidentClosed !== false ||
      s.originalHost !== "DESKTOP-AE894KC" ||
      s.independentStabilityReviewAdmitted !== false ||
      s.lastIndependentObservationAt !== null ||
      typeof s.state !== "string" ||
      typeof s.ql449ProtectedReview !== "string" ||
      typeof s.originalCommsOpenIncident !== "string" ||
      typeof s.originalIndependentAnchor !== "string" ||
      typeof s.threeOriginalHostStabilityHorizons !== "string" ||
      typeof s.independentReceiverHorizons !== "string" ||
      typeof s.closureAuthorityBoundary !== "string" ||
      typeof s.threeMasterRecurrence !== "string" ||
      typeof s.twoOwnerContinuity !== "string" ||
      typeof s.message !== "string") return null;
  return s as StabilityStatus;
}

/** A successful historic stability review is neither closure nor current OFF. */
export function Ql450OwnerStabilityPanel() {
  const [status, setStatus] = useState<StabilityStatus | null>(null);
  const [message, setMessage] = useState("Original QL-450 physical signers are not enrolled.");
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
      const response: unknown = await getMasterShellStability341(current.signal);
      if (controller.current !== current) return;
      const accepted = inspect(response);
      setStatus(accepted);
      setMessage(accepted ? accepted.message : "Untrusted original QL-450 source: HOLD.");
    } catch {
      if (controller.current !== current) return;
      setStatus(null);
      setMessage("Independent QL-450 source unavailable: HOLD.");
    } finally {
      if (controller.current === current) setBusy(false);
    }
  }

  return <MasterCommandVisualSystem
    title="Receiver & Ceremony"
    subtitle="QL-450 original-host stability and independent closure boundary"
    release="341"
    currentPath="#ql450-owner-stability"
    navigation={[{ id: "stability", label: "Independent OFF stability sampling",
      href: "#ql450-owner-stability" }]}
    kpis={status ? [
      { id: "connection", icon: "◉", label: "Connection", value: "HOLD",
        detail: "Receiver activation disabled", tone: "warning" },
      { id: "incident", icon: "⊘", label: "Incident", value: "OPEN",
        detail: "No automatic closure authority", tone: "critical" },
      { id: "receiver", icon: "?", label: "Physical receiver", value: "UNKNOWN",
        detail: "Historical OFF is not current OFF", tone: "neutral" },
    ] : []}
    workspaces={[]}>
    <section id="ql450-owner-stability" className="mc-panel">
      <h3>Signed recurrence stability, independent authority and Master continuity</h3>
      <p>Original QL-449 protected REVIEW and Comms OPEN/HOLD source, independent
        anchor, original DESKTOP-AE894KC host plus independent receiver signatures
        for short, medium (10s) and long (30s) horizons, independent closure
        denial, three Master votes and two original owners are required.
        Even signed historical STABLE never closes the incident or proves current OFF.</p>
      <button type="button" disabled={busy} onClick={() => void refresh()}>
        {busy ? "Reading historical custody…" : "Refresh QL-450 signed stability"}
      </button>
      <p role="status">{message}</p>
      {status && <dl>
        <dt>Original protected QL-449 REVIEW</dt><dd>{status.ql449ProtectedReview}</dd>
        <dt>Comms original incident</dt><dd>{status.originalCommsOpenIncident}</dd>
        <dt>Original independent anchor</dt><dd>{status.originalIndependentAnchor}</dd>
        <dt>Original Windows host</dt><dd>{status.originalHost}</dd>
        <dt>Signed host short, medium and long samples</dt>
        <dd>{status.threeOriginalHostStabilityHorizons}</dd>
        <dt>Independent receiver witnesses</dt><dd>{status.independentReceiverHorizons}</dd>
        <dt>Separate closure-authority boundary</dt><dd>{status.closureAuthorityBoundary}</dd>
        <dt>Three Master recurrence votes</dt><dd>{status.threeMasterRecurrence}</dd>
        <dt>Two owner continuity votes</dt><dd>{status.twoOwnerContinuity}</dd>
        <dt>Incident</dt><dd>OPEN — closure is not authorized</dd>
        <dt>Physical receiver</dt><dd>UNKNOWN — independent current OFF required</dd>
        <dt>Connection</dt><dd>HOLD — activation disabled</dd>
      </dl>}
    </section>
  </MasterCommandVisualSystem>;
}
