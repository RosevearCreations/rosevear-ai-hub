import { useEffect, useRef, useState } from "react";
import { getMasterShellDisposition340 } from "./api";
import { MasterCommandVisualSystem } from "./MasterCommandVisualSystem";

type DispositionStatus = {
  schema: "rosevear.ai-hub.ql449-owner-disposition.v1";
  sourceBuild: 340;
  state: string;
  connection: "HOLD";
  activationAuthorized: false;
  physicalReceiverCurrentlyOff: false;
  receiver: "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF";
  manualIsolationAndIndependentOffRequired: true;
  slaveGate: "HOLD_NEXT_MASTER_INTEGRATION_STAGE";
  incidentStatus: "OPEN_UNVERIFIED";
  incidentClosed: false;
  originalHost: "DESKTOP-AE894KC";
  ql448ProtectedCorrection: string;
  originalCommsIncident: string;
  independentExternalAnchor: string;
  originalHostOffReadback: string;
  independentReceiverReadback: string;
  threeMasterDisposition: string;
  twoOwnerDisposition: string;
  independentAnchoredReviewAdmitted: false;
  lastIndependentObservationAt: null;
  message: string;
};

function inspect(value: unknown): DispositionStatus | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const s = value as Record<string, unknown>;
  if (s.schema !== "rosevear.ai-hub.ql449-owner-disposition.v1" ||
      s.sourceBuild !== 340 || s.connection !== "HOLD" ||
      s.activationAuthorized !== false ||
      s.physicalReceiverCurrentlyOff !== false ||
      s.receiver !== "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF" ||
      s.manualIsolationAndIndependentOffRequired !== true ||
      s.slaveGate !== "HOLD_NEXT_MASTER_INTEGRATION_STAGE" ||
      s.incidentStatus !== "OPEN_UNVERIFIED" ||
      s.incidentClosed !== false ||
      s.originalHost !== "DESKTOP-AE894KC" ||
      s.independentAnchoredReviewAdmitted !== false ||
      s.lastIndependentObservationAt !== null ||
      typeof s.state !== "string" ||
      typeof s.ql448ProtectedCorrection !== "string" ||
      typeof s.originalCommsIncident !== "string" ||
      typeof s.independentExternalAnchor !== "string" ||
      typeof s.originalHostOffReadback !== "string" ||
      typeof s.independentReceiverReadback !== "string" ||
      typeof s.threeMasterDisposition !== "string" ||
      typeof s.twoOwnerDisposition !== "string" ||
      typeof s.message !== "string") return null;
  return s as DispositionStatus;
}

/** Signed historical review is not live OFF, incident closure or activation. */
export function Ql449OwnerDispositionPanel() {
  const [status, setStatus] = useState<DispositionStatus | null>(null);
  const [message, setMessage] = useState("QL-449 original external anchors are not enrolled.");
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
      const response: unknown = await getMasterShellDisposition340(current.signal);
      if (controller.current !== current) return;
      const accepted = inspect(response);
      setStatus(accepted);
      setMessage(accepted ? accepted.message : "Untrusted QL-449 source; HOLD.");
    } catch {
      if (controller.current !== current) return;
      setStatus(null);
      setMessage("QL-449 original source unavailable; HOLD.");
    } finally {
      if (controller.current === current) setBusy(false);
    }
  }

  return <MasterCommandVisualSystem
    title="Receiver & Ceremony"
    subtitle="QL-449 anchored original-host OFF re-attestation and owner disposition"
    release="340"
    currentPath="#ql449-owner-disposition"
    navigation={[{ id: "disposition", label: "Anchored disposition review",
      href: "#ql449-owner-disposition" }]}
    kpis={status ? [
      { id: "connection", icon: "◉", label: "Connection", value: "HOLD",
        detail: "Activation disabled", tone: "warning" },
      { id: "incident", icon: "⊘", label: "Incident", value: "OPEN",
        detail: "Disposition review is not closure", tone: "critical" },
      { id: "receiver", icon: "?", label: "Physical receiver", value: "UNKNOWN",
        detail: "Historical signed OFF cannot prove now OFF", tone: "neutral" },
    ] : []}
    workspaces={[]}>
    <section id="ql449-owner-disposition" className="mc-panel">
      <h3>Independent anchor, host re-attestation and owner-gated review</h3>
      <p>Requires exact protected QL-448 corrected-exception custody, original
        Comms OPEN/HOLD incident readback, a separately signed external anchor,
        original Windows host and independent receiver observations, three Master
        decisions and two distinct owner signatures. Signed historical OFF never
        closes an incident or proves current physical OFF. No hardware commands.</p>
      <button type="button" disabled={busy} onClick={() => void refresh()}>
        {busy ? "Reading historical custody…" : "Refresh QL-449 anchored evidence"}
      </button>
      <p role="status">{message}</p>
      {status && <dl>
        <dt>Original Windows host</dt><dd>{status.originalHost}</dd>
        <dt>Original QL-448 corrected exception</dt><dd>{status.ql448ProtectedCorrection}</dd>
        <dt>Original signed Comms incident</dt><dd>{status.originalCommsIncident}</dd>
        <dt>External independent anchor</dt><dd>{status.independentExternalAnchor}</dd>
        <dt>Fresh signed original-host readback</dt><dd>{status.originalHostOffReadback}</dd>
        <dt>Independent receiver witness</dt><dd>{status.independentReceiverReadback}</dd>
        <dt>Three Master review votes</dt><dd>{status.threeMasterDisposition}</dd>
        <dt>Two owner disposition votes</dt><dd>{status.twoOwnerDisposition}</dd>
        <dt>Original incident</dt><dd>OPEN — no closure authority</dd>
        <dt>Physical receiver now</dt><dd>UNKNOWN — independent fresh OFF required</dd>
        <dt>Connection</dt><dd>HOLD / activation disabled</dd>
      </dl>}
    </section>
  </MasterCommandVisualSystem>;
}
