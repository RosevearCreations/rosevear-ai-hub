import { useEffect, useRef, useState } from "react";
import { getMasterShellEscalation337 } from "./api";
import { MasterCommandVisualSystem } from "./MasterCommandVisualSystem";

type EscalationStatus = {
  schema: "rosevear.ai-hub.ql446-owner-escalation.v1";
  sourceBuild: 337;
  state: string;
  connection: "HOLD";
  activationAuthorized: false;
  physicalReceiverCurrentlyOff: false;
  receiver: "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF";
  manualIsolationAndIndependentOffRequired: true;
  slaveGate: "HOLD_NEXT_MASTER_INTEGRATION_STAGE";
  originalHost: "DESKTOP-AE894KC";
  ql445ProtectedSource: string;
  signedCommsReadback: string;
  shortMediumLongProbes: string;
  independentReceiverObservations: string;
  recurrenceClassification: string;
  escalationOfficer: string;
  threeMasterReopening: string;
  twoOwnerDecision: string;
  lastIndependentObservationAt: null;
  message: string;
};

function inspect(value: unknown): EscalationStatus | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const s = value as Record<string, unknown>;
  if (s.schema !== "rosevear.ai-hub.ql446-owner-escalation.v1" ||
      s.sourceBuild !== 337 ||
      s.connection !== "HOLD" ||
      s.activationAuthorized !== false ||
      s.physicalReceiverCurrentlyOff !== false ||
      s.receiver !== "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF" ||
      s.manualIsolationAndIndependentOffRequired !== true ||
      s.slaveGate !== "HOLD_NEXT_MASTER_INTEGRATION_STAGE" ||
      s.originalHost !== "DESKTOP-AE894KC" ||
      s.lastIndependentObservationAt !== null ||
      typeof s.state !== "string" ||
      typeof s.ql445ProtectedSource !== "string" ||
      typeof s.signedCommsReadback !== "string" ||
      typeof s.shortMediumLongProbes !== "string" ||
      typeof s.independentReceiverObservations !== "string" ||
      typeof s.recurrenceClassification !== "string" ||
      typeof s.escalationOfficer !== "string" ||
      typeof s.threeMasterReopening !== "string" ||
      typeof s.twoOwnerDecision !== "string" ||
      typeof s.message !== "string") return null;
  return s as EscalationStatus;
}

/** Historical evidence only. All present hardware states are unknown. */
export function Ql446OwnerEscalationPanel() {
  const [status, setStatus] = useState<EscalationStatus | null>(null);
  const [message, setMessage] = useState("Original-host QL-446 source not enrolled.");
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
      const response: unknown = await getMasterShellEscalation337(current.signal);
      if (controller.current !== current) return;
      const accepted = inspect(response);
      setStatus(accepted);
      setMessage(accepted ? accepted.message : "Untrusted QL-446 source; HOLD.");
    } catch {
      if (controller.current !== current) return;
      setStatus(null);
      setMessage("QL-446 source unavailable; HOLD.");
    } finally {
      if (controller.current === current) setBusy(false);
    }
  }

  return <MasterCommandVisualSystem
    title="Receiver & Ceremony"
    subtitle="QL-446 protected multi-horizon OFF/ON incident escalation"
    release="337"
    currentPath="#ql446-owner-escalation"
    navigation={[{ id: "escalation", label: "Three-horizon recurrence", href: "#ql446-owner-escalation" }]}
    kpis={status ? [
      { id: "connection", icon: "◉", label: "Connection", value: "HOLD",
        detail: "Activation disabled", tone: "warning" },
      { id: "classification", icon: "⊘", label: "Incident classification",
        value: status.recurrenceClassification,
        detail: "Signed independent review required", tone: "critical" },
      { id: "receiver", icon: "?", label: "Physical receiver", value: "UNKNOWN",
        detail: "History cannot prove current OFF", tone: "neutral" },
    ] : []}
    workspaces={[]}>
    <section id="ql446-owner-escalation" className="mc-panel">
      <h3>Three-horizon original-host evidence and incident reopening</h3>
      <p>SHORT, MEDIUM and LONG signed samples must be independently reconciled.
        New ON evidence, signed disagreement or a previous recurrence requires
        an independent escalation officer, three Master reviews and two owners.
        No restart, activation or receiver control exists in this panel.</p>
      <button type="button" disabled={busy} onClick={() => void refresh()}>
        {busy ? "Reading protected custody…" : "Refresh QL-446 source evidence"}
      </button>
      <p role="status">{message}</p>
      {status && <dl>
        <dt>Original Windows host</dt><dd>{status.originalHost}</dd>
        <dt>Prior QL-445 custody</dt><dd>{status.ql445ProtectedSource}</dd>
        <dt>Original Comms source</dt><dd>{status.signedCommsReadback}</dd>
        <dt>Three signed host horizons</dt><dd>{status.shortMediumLongProbes}</dd>
        <dt>Independent receiver readbacks</dt><dd>{status.independentReceiverObservations}</dd>
        <dt>Recurrence classification</dt><dd>{status.recurrenceClassification}</dd>
        <dt>Escalation officer</dt><dd>{status.escalationOfficer}</dd>
        <dt>Three-Master reopening</dt><dd>{status.threeMasterReopening}</dd>
        <dt>Original dual-owner review</dt><dd>{status.twoOwnerDecision}</dd>
        <dt>Physical receiver now</dt><dd>UNKNOWN — signed external readback required</dd>
        <dt>Connection</dt><dd>HOLD / no activation authority</dd>
      </dl>}
    </section>
  </MasterCommandVisualSystem>;
}
