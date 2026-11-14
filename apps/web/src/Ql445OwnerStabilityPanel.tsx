import { useEffect, useRef, useState } from "react";
import { getMasterShellStability336 } from "./api";
import { MasterCommandVisualSystem } from "./MasterCommandVisualSystem";

type StabilityStatus = {
  schema: "rosevear.ai-hub.ql445-owner-stability.v1";
  sourceBuild: 336;
  state: string;
  connection: "HOLD";
  activationAuthorized: false;
  physicalReceiverCurrentlyOff: false;
  receiver: "UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION";
  manualReceiverIsolationRequired: true;
  freshPhysicalOffProven: false;
  incidentClosed: false;
  sourceHost: "DESKTOP-AE894KC";
  ql444ProtectedClosure: string;
  originalCommsSource: string;
  twoSignedHostProbes: string;
  twoIndependentObservations: string;
  recurrenceClassification: string;
  recurrenceSuspected: boolean;
  threeMasterReview: string;
  dualOwnerReview: string;
  lastIndependentObservationAt: null;
  message: string;
};

function inspect(value: unknown): StabilityStatus | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const s = value as Record<string, unknown>;
  if (s.schema !== "rosevear.ai-hub.ql445-owner-stability.v1" ||
      s.sourceBuild !== 336 ||
      s.connection !== "HOLD" ||
      s.activationAuthorized !== false ||
      s.physicalReceiverCurrentlyOff !== false ||
      s.receiver !== "UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION" ||
      s.manualReceiverIsolationRequired !== true ||
      s.freshPhysicalOffProven !== false ||
      s.incidentClosed !== false ||
      s.sourceHost !== "DESKTOP-AE894KC" ||
      s.lastIndependentObservationAt !== null ||
      typeof s.ql444ProtectedClosure !== "string" ||
      typeof s.originalCommsSource !== "string" ||
      typeof s.twoSignedHostProbes !== "string" ||
      typeof s.twoIndependentObservations !== "string" ||
      typeof s.recurrenceClassification !== "string" ||
      typeof s.recurrenceSuspected !== "boolean" ||
      typeof s.threeMasterReview !== "string" ||
      typeof s.dualOwnerReview !== "string" ||
      typeof s.state !== "string" ||
      typeof s.message !== "string") return null;
  return s as StabilityStatus;
}

/** Read-only QL-445. Historical OFF cannot assert current physical state. */
export function Ql445OwnerStabilityPanel() {
  const [status, setStatus] = useState<StabilityStatus | null>(null);
  const [message, setMessage] = useState("Signed QL-445 source not enrolled.");
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
      const response: unknown = await getMasterShellStability336(current.signal);
      if (controller.current !== current) return;
      const accepted = inspect(response);
      setStatus(accepted);
      setMessage(accepted ? accepted.message : "Untrusted QL-445 source. HOLD.");
    } catch {
      if (controller.current !== current) return;
      setStatus(null);
      setMessage("QL-445 evidence unavailable. HOLD.");
    } finally {
      if (controller.current === current) setBusy(false);
    }
  }

  return <MasterCommandVisualSystem
    title="Receiver & Ceremony"
    subtitle="QL-445 post-closure independent OFF stability and signed ON recurrence"
    release="336"
    currentPath="#ql445-owner-stability"
    navigation={[{ id: "stability", label: "Post-closure stability", href: "#ql445-owner-stability" }]}
    kpis={status ? [
      { id: "connection", icon: "◉", label: "Connection", value: "HOLD",
        detail: "Activation stays disabled", tone: "warning" },
      { id: "classification", icon: "⊘", label: "Recurrence review",
        value: status.recurrenceClassification,
        detail: "Requires original signed two-sample proof", tone: "critical" },
      { id: "receiver", icon: "?", label: "Physical receiver", value: "UNKNOWN",
        detail: "History cannot guarantee live OFF", tone: "neutral" },
    ] : []}
    workspaces={[]}>
    <section id="ql445-owner-stability" className="mc-panel">
      <h3>Original-source post-closure stability and recurrence</h3>
      <p>Two independently signed receiver readings must reconcile with two
        original-host watchdog-armed observations after historical QL-444 closure.
        A signed ON recurrence opens a new incident-risk case, never CONNECTED.
        This panel cannot actuate or restart a receiver.</p>
      <button type="button" disabled={busy} onClick={() => void refresh()}>
        {busy ? "Checking authenticated source…" : "Refresh QL-445 owner evidence"}
      </button>
      <p role="status">{message}</p>
      {status && <dl>
        <dt>Original host</dt><dd>{status.sourceHost}</dd>
        <dt>Protected QL-444 closure</dt><dd>{status.ql444ProtectedClosure}</dd>
        <dt>Signed Comms origin</dt><dd>{status.originalCommsSource}</dd>
        <dt>Two original host probes</dt><dd>{status.twoSignedHostProbes}</dd>
        <dt>Two independent receiver observations</dt><dd>{status.twoIndependentObservations}</dd>
        <dt>Signed recurrence classification</dt><dd>{status.recurrenceClassification}</dd>
        <dt>Three-Master review</dt><dd>{status.threeMasterReview}</dd>
        <dt>Dual-owner review</dt><dd>{status.dualOwnerReview}</dd>
        <dt>Current physical state</dt><dd>UNKNOWN — independently revalidate</dd>
        <dt>Connection and activation</dt><dd>HOLD / disabled</dd>
      </dl>}
    </section>
  </MasterCommandVisualSystem>;
}
