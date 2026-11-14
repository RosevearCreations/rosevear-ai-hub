import { useEffect, useRef, useState } from "react";
import { getMasterShellRemediation339 } from "./api";
import { MasterCommandVisualSystem } from "./MasterCommandVisualSystem";

type RemediationStatus = {
  schema: "rosevear.ai-hub.ql448-owner-remediation.v1";
  sourceBuild: 339;
  state: string;
  connection: "HOLD";
  activationAuthorized: false;
  physicalReceiverCurrentlyOff: false;
  receiver: "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF";
  manualIsolationAndIndependentOffRequired: true;
  slaveGate: "HOLD_NEXT_MASTER_INTEGRATION_STAGE";
  incidentStatus: string;
  originalHost: "DESKTOP-AE894KC";
  ql447ProtectedIncident: string;
  originalCommsIncident: string;
  independentCorrectiveOfficer: string;
  shortMediumLongOriginalHost: string;
  independentReceiverHorizons: string;
  threeMasterContinuity: string;
  twoOwnerDisposition: string;
  exceptionClosurePreconditionsEvidenced: false;
  lastIndependentObservationAt: null;
  message: string;
};

function inspect(value: unknown): RemediationStatus | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const s = value as Record<string, unknown>;
  if (s.schema !== "rosevear.ai-hub.ql448-owner-remediation.v1" ||
      s.sourceBuild !== 339 || s.connection !== "HOLD" ||
      s.activationAuthorized !== false ||
      s.physicalReceiverCurrentlyOff !== false ||
      s.receiver !== "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF" ||
      s.manualIsolationAndIndependentOffRequired !== true ||
      s.slaveGate !== "HOLD_NEXT_MASTER_INTEGRATION_STAGE" ||
      s.incidentStatus !== "OPEN_UNVERIFIED" ||
      s.originalHost !== "DESKTOP-AE894KC" ||
      s.exceptionClosurePreconditionsEvidenced !== false ||
      s.lastIndependentObservationAt !== null ||
      typeof s.state !== "string" ||
      typeof s.ql447ProtectedIncident !== "string" ||
      typeof s.originalCommsIncident !== "string" ||
      typeof s.independentCorrectiveOfficer !== "string" ||
      typeof s.shortMediumLongOriginalHost !== "string" ||
      typeof s.independentReceiverHorizons !== "string" ||
      typeof s.threeMasterContinuity !== "string" ||
      typeof s.twoOwnerDisposition !== "string" ||
      typeof s.message !== "string") return null;
  return s as RemediationStatus;
}

/** Read-only original-host history. Signed OFF does not establish present OFF. */
export function Ql448OwnerRemediationPanel() {
  const [status, setStatus] = useState<RemediationStatus | null>(null);
  const [message, setMessage] = useState("Independent QL-448 remediation not enrolled.");
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function refresh() {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setStatus(null);
    setBusy(true);
    try {
      const response: unknown = await getMasterShellRemediation339(current.signal);
      if (controller.current !== current) return;
      const accepted = inspect(response);
      setStatus(accepted);
      setMessage(accepted ? accepted.message : "Untrusted QL-448 evidence; HOLD.");
    } catch {
      if (controller.current !== current) return;
      setStatus(null);
      setMessage("QL-448 original source unavailable; HOLD.");
    } finally {
      if (controller.current === current) setBusy(false);
    }
  }

  return <MasterCommandVisualSystem
    title="Receiver & Ceremony"
    subtitle="QL-448 signed corrective remediation and 30-second continuity review"
    release="339"
    currentPath="#ql448-owner-remediation"
    navigation={[{ id: "remediation", label: "Long-horizon corrective review",
      href: "#ql448-owner-remediation" }]}
    kpis={status ? [
      { id: "connection", icon: "◉", label: "Connection", value: "HOLD",
        detail: "Activation disabled", tone: "warning" },
      { id: "incident", icon: "⊘", label: "Incident", value: "OPEN",
        detail: "Closure remains owner-gated and unverified", tone: "critical" },
      { id: "receiver", icon: "?", label: "Physical receiver", value: "UNKNOWN",
        detail: "Historical evidence is not live OFF", tone: "neutral" },
    ] : []}
    workspaces={[]}>
    <section id="ql448-owner-remediation" className="mc-panel">
      <h3>Independent corrective receipts and long-horizon original-host evidence</h3>
      <p>QL-447 protected OPEN/HOLD incident custody, an independent corrective
        officer, original-host SHORT/MEDIUM/LONG samples (10s/30s), independently
        signed receiver readbacks, three Master decisions and two owner signatures
        are all required. A completed correction only evidences closure preconditions,
        never incident closure, receiver activation or current physical OFF.</p>
      <button type="button" disabled={busy} onClick={() => void refresh()}>
        {busy ? "Reading historical custody…" : "Refresh QL-448 signed evidence"}
      </button>
      <p role="status">{message}</p>
      {status && <dl>
        <dt>Original Windows host</dt><dd>{status.originalHost}</dd>
        <dt>Protected QL-447 open incident</dt><dd>{status.ql447ProtectedIncident}</dd>
        <dt>Original signed Comms incident</dt><dd>{status.originalCommsIncident}</dd>
        <dt>Independent corrective officer</dt><dd>{status.independentCorrectiveOfficer}</dd>
        <dt>Three original-host signed horizons</dt><dd>{status.shortMediumLongOriginalHost}</dd>
        <dt>Independent receiver observations</dt><dd>{status.independentReceiverHorizons}</dd>
        <dt>Three Master continuity votes</dt><dd>{status.threeMasterContinuity}</dd>
        <dt>Dual-owner disposition</dt><dd>{status.twoOwnerDisposition}</dd>
        <dt>Closure preconditions</dt><dd>NOT VERIFIED — not incident closure</dd>
        <dt>Physical receiver now</dt><dd>UNKNOWN — independent fresh OFF required</dd>
        <dt>Connection</dt><dd>HOLD / no activation authority</dd>
      </dl>}
    </section>
  </MasterCommandVisualSystem>;
}
