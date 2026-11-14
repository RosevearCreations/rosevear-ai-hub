import { useEffect, useRef, useState } from "react";
import { getMasterShellIncident338 } from "./api";
import { MasterCommandVisualSystem } from "./MasterCommandVisualSystem";

type IncidentStatus = {
  schema: "rosevear.ai-hub.ql447-owner-incident.v1";
  sourceBuild: 338;
  state: string;
  connection: "HOLD";
  activationAuthorized: false;
  physicalReceiverCurrentlyOff: false;
  receiver: "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF";
  manualIsolationAndIndependentOffRequired: true;
  slaveGate: "HOLD_NEXT_MASTER_INTEGRATION_STAGE";
  incidentStatus: string;
  originalHost: "DESKTOP-AE894KC";
  ql446ProtectedRecurrence: string;
  commsOriginalIncidentIntake: string;
  signedHostIsolation: string;
  independentIsolation: string;
  threeMasterCorrectiveFollowUp: string;
  twoOwnerFollowUp: string;
  lastIndependentObservationAt: null;
  message: string;
};

function inspect(value: unknown): IncidentStatus | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const s = value as Record<string, unknown>;
  if (s.schema !== "rosevear.ai-hub.ql447-owner-incident.v1" ||
      s.sourceBuild !== 338 || s.connection !== "HOLD" ||
      s.activationAuthorized !== false ||
      s.physicalReceiverCurrentlyOff !== false ||
      s.receiver !== "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF" ||
      s.manualIsolationAndIndependentOffRequired !== true ||
      s.slaveGate !== "HOLD_NEXT_MASTER_INTEGRATION_STAGE" ||
      s.originalHost !== "DESKTOP-AE894KC" ||
      s.lastIndependentObservationAt !== null ||
      typeof s.state !== "string" ||
      typeof s.incidentStatus !== "string" ||
      typeof s.ql446ProtectedRecurrence !== "string" ||
      typeof s.commsOriginalIncidentIntake !== "string" ||
      typeof s.signedHostIsolation !== "string" ||
      typeof s.independentIsolation !== "string" ||
      typeof s.threeMasterCorrectiveFollowUp !== "string" ||
      typeof s.twoOwnerFollowUp !== "string" ||
      typeof s.message !== "string") return null;
  return s as IncidentStatus;
}

/** QL-447 historical read-only evidence; never represents live OFF. */
export function Ql447OwnerIncidentPanel() {
  const [status, setStatus] = useState<IncidentStatus | null>(null);
  const [message, setMessage] = useState("Original-host QL-447 sources not enrolled.");
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
      const response: unknown = await getMasterShellIncident338(current.signal);
      if (controller.current !== current) return;
      const accepted = inspect(response);
      setStatus(accepted);
      setMessage(accepted ? accepted.message : "Untrusted QL-447 incident source; HOLD.");
    } catch {
      if (controller.current !== current) return;
      setStatus(null);
      setMessage("QL-447 incident source unavailable; HOLD.");
    } finally {
      if (controller.current === current) setBusy(false);
    }
  }

  return <MasterCommandVisualSystem
    title="Receiver & Ceremony"
    subtitle="QL-447 original-host signed incident intake and corrective continuity"
    release="338"
    currentPath="#ql447-owner-incident"
    navigation={[{ id: "incident", label: "Isolation follow-up", href: "#ql447-owner-incident" }]}
    kpis={status ? [
      { id: "connection", icon: "◉", label: "Connection", value: "HOLD",
        detail: "Activation disabled", tone: "warning" },
      { id: "incident", icon: "⊘", label: "Incident", value: status.incidentStatus,
        detail: "Closure not authorized", tone: "critical" },
      { id: "receiver", icon: "?", label: "Physical receiver", value: "UNKNOWN",
        detail: "Signed history is not current OFF", tone: "neutral" },
    ] : []}
    workspaces={[]}>
    <section id="ql447-owner-incident" className="mc-panel">
      <h3>Original-host recurrence and signed isolation reconfirmation</h3>
      <p>Only an independently signed, reopened QL-446 incident qualifies.
        The original host, independent observer, three Masters and two owners
        must confirm an evidence-only corrective decision. Signed ON or isolation
        control disagreement remains an open incident. No receiver commands exist here.</p>
      <button type="button" disabled={busy} onClick={() => void refresh()}>
        {busy ? "Reading protected incident…" : "Refresh QL-447 incident evidence"}
      </button>
      <p role="status">{message}</p>
      {status && <dl>
        <dt>Original Windows host</dt><dd>{status.originalHost}</dd>
        <dt>Prior QL-446 reopened case</dt><dd>{status.ql446ProtectedRecurrence}</dd>
        <dt>Original signed Comms intake</dt><dd>{status.commsOriginalIncidentIntake}</dd>
        <dt>Signed host isolation lock, lease and watchdog</dt><dd>{status.signedHostIsolation}</dd>
        <dt>Independent receiver observation</dt><dd>{status.independentIsolation}</dd>
        <dt>Three Master corrective reviews</dt><dd>{status.threeMasterCorrectiveFollowUp}</dd>
        <dt>Two owner signatures</dt><dd>{status.twoOwnerFollowUp}</dd>
        <dt>Incident</dt><dd>{status.incidentStatus} / manual review required</dd>
        <dt>Physical receiver now</dt><dd>UNKNOWN — new external readback required</dd>
        <dt>Connection</dt><dd>HOLD / no activation authority</dd>
      </dl>}
    </section>
  </MasterCommandVisualSystem>;
}
