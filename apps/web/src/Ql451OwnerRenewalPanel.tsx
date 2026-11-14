import { useEffect, useRef, useState } from "react";
import { getMasterShellRenewal342 } from "./api";
import { MasterCommandVisualSystem } from "./MasterCommandVisualSystem";

type RenewalStatus = {
  schema: "rosevear.ai-hub.ql451-owner-renewal.v1";
  sourceBuild: 342;
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
  ql450ProtectedReview: string;
  originalCommsOpenCase: string;
  independentResponseOfficer: string;
  independentExternalAnchor: string;
  originalHostRenewalHorizons: string;
  independentReceiverHorizons: string;
  independentClosureBoundary: string;
  threeMasterReassessment: string;
  twoOwnerReassessment: string;
  responsePreconditionsEvidenced: false;
  lastIndependentObservationAt: null;
  message: string;
};

function inspect(value: unknown): RenewalStatus | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const s = value as Record<string, unknown>;
  if (s.schema !== "rosevear.ai-hub.ql451-owner-renewal.v1" ||
      s.sourceBuild !== 342 || s.connection !== "HOLD" ||
      s.activationAuthorized !== false ||
      s.closureAuthorized !== false ||
      s.physicalReceiverCurrentlyOff !== false ||
      s.receiver !== "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF" ||
      s.manualIsolationAndIndependentOffRequired !== true ||
      s.slaveGate !== "HOLD_NEXT_MASTER_INTEGRATION_STAGE" ||
      s.incidentStatus !== "OPEN_UNVERIFIED" ||
      s.incidentClosed !== false ||
      s.originalHost !== "DESKTOP-AE894KC" ||
      s.responsePreconditionsEvidenced !== false ||
      s.lastIndependentObservationAt !== null ||
      typeof s.state !== "string" ||
      typeof s.ql450ProtectedReview !== "string" ||
      typeof s.originalCommsOpenCase !== "string" ||
      typeof s.independentResponseOfficer !== "string" ||
      typeof s.independentExternalAnchor !== "string" ||
      typeof s.originalHostRenewalHorizons !== "string" ||
      typeof s.independentReceiverHorizons !== "string" ||
      typeof s.independentClosureBoundary !== "string" ||
      typeof s.threeMasterReassessment !== "string" ||
      typeof s.twoOwnerReassessment !== "string" ||
      typeof s.message !== "string") return null;
  return s as RenewalStatus;
}

/** Historical source proof is neither present physical OFF nor incident closure. */
export function Ql451OwnerRenewalPanel() {
  const [status, setStatus] = useState<RenewalStatus | null>(null);
  const [message, setMessage] = useState("QL-451 original response signers are not enrolled.");
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
      const response: unknown = await getMasterShellRenewal342(current.signal);
      if (controller.current !== current) return;
      const accepted = inspect(response);
      setStatus(accepted);
      setMessage(accepted ? accepted.message : "Untrusted QL-451 evidence: HOLD.");
    } catch {
      if (controller.current !== current) return;
      setStatus(null);
      setMessage("QL-451 original source unavailable: HOLD.");
    } finally {
      if (controller.current === current) setBusy(false);
    }
  }

  return <MasterCommandVisualSystem
    title="Receiver & Ceremony"
    subtitle="QL-451 independent response, long-horizon OFF renewal and owner review"
    release="342"
    currentPath="#ql451-owner-renewal"
    navigation={[{ id: "renewal", label: "Independent response renewal",
      href: "#ql451-owner-renewal" }]}
    kpis={status ? [
      { id: "connection", icon: "◉", label: "Connection", value: "HOLD",
        detail: "Receiver activation disabled", tone: "warning" },
      { id: "incident", icon: "⊘", label: "Incident", value: "OPEN",
        detail: "No automatic closure authority", tone: "critical" },
      { id: "receiver", icon: "?", label: "Physical receiver", value: "UNKNOWN",
        detail: "Signed historical OFF is not live OFF", tone: "neutral" },
    ] : []}
    workspaces={[]}>
    <section id="ql451-owner-renewal" className="mc-panel">
      <h3>Independent recurrence response and owner-gated reassessment</h3>
      <p>Requires exact protected QL-450 signed custody, original Comms OPEN/HOLD,
        separate corrective response officer, independent anchor, original-host
        SHORT/MEDIUM/LONG (10s/30s) signed observations and receiver witnesses,
        independent closure-denial authority, three Master votes and two owners.
        No control, connection, live OFF assertion or incident closure.</p>
      <button type="button" disabled={busy} onClick={() => void refresh()}>
        {busy ? "Reading original custody…" : "Refresh QL-451 signed renewal"}
      </button>
      <p role="status">{message}</p>
      {status && <dl>
        <dt>Protected QL-450 historical custody</dt><dd>{status.ql450ProtectedReview}</dd>
        <dt>Original Comms open incident</dt><dd>{status.originalCommsOpenCase}</dd>
        <dt>Independent response officer</dt><dd>{status.independentResponseOfficer}</dd>
        <dt>Independent external anchor</dt><dd>{status.independentExternalAnchor}</dd>
        <dt>Original host</dt><dd>{status.originalHost}</dd>
        <dt>Short, medium, long signed host OFF renewal</dt>
        <dd>{status.originalHostRenewalHorizons}</dd>
        <dt>Independent receiver witnesses</dt><dd>{status.independentReceiverHorizons}</dd>
        <dt>Closure authority</dt><dd>{status.independentClosureBoundary}</dd>
        <dt>Three Master reassessment</dt><dd>{status.threeMasterReassessment}</dd>
        <dt>Two owner approvals</dt><dd>{status.twoOwnerReassessment}</dd>
        <dt>Incident and physical state</dt><dd>OPEN/HOLD — physical OFF UNKNOWN</dd>
      </dl>}
    </section>
  </MasterCommandVisualSystem>;
}
