import { useEffect, useRef, useState } from "react";
import { getMasterShellShutdown333 } from "./api";
import { MasterCommandVisualSystem } from "./MasterCommandVisualSystem";

type ShutdownStatus = {
  schema: "rosevear.ai-hub.ql442-owner-shutdown.v1";
  sourceBuild: 333;
  state: string;
  connection: "HOLD";
  activationAuthorized: false;
  receiver: "UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION";
  manualReceiverIsolationRequired: true;
  physicalReceiverCurrentlyOff: false;
  leaseDisposition: "UNVERIFIED";
  sourceHost: "DESKTOP-AE894KC";
  lastIndependentOffAt: null;
  lastSignedMasterReviewAt: null;
  historicalCustodyReadback: string;
  message: string;
};

function inspect(value: unknown): ShutdownStatus | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const s = value as Record<string, unknown>;
  if (s.schema !== "rosevear.ai-hub.ql442-owner-shutdown.v1" ||
      s.sourceBuild !== 333 ||
      s.connection !== "HOLD" ||
      s.activationAuthorized !== false ||
      s.receiver !== "UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION" ||
      s.manualReceiverIsolationRequired !== true ||
      s.physicalReceiverCurrentlyOff !== false ||
      s.leaseDisposition !== "UNVERIFIED" ||
      s.sourceHost !== "DESKTOP-AE894KC" ||
      s.lastIndependentOffAt !== null ||
      s.lastSignedMasterReviewAt !== null ||
      typeof s.historicalCustodyReadback !== "string" ||
      typeof s.state !== "string" ||
      typeof s.message !== "string") return null;
  return s as ShutdownStatus;
}

/** Source-only QL-442 historical instrument, not a shutdown actuator. */
export function Ql442OwnerShutdownPanel() {
  const [status, setStatus] = useState<ShutdownStatus | null>(null);
  const [message, setMessage] = useState("Fresh independently signed OFF is unverified.");
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
      const response: unknown = await getMasterShellShutdown333(current.signal);
      if (controller.current !== current) return;
      const accepted = inspect(response);
      setStatus(accepted);
      setMessage(accepted ? accepted.message : "Signed QL-442 source invalid/unavailable. HOLD.");
    } catch {
      if (controller.current !== current) return;
      setStatus(null);
      setMessage("Owner-only original-host shutdown status unavailable. HOLD.");
    } finally {
      if (controller.current === current) setBusy(false);
    }
  }

  return <MasterCommandVisualSystem
    title="Receiver & Ceremony"
    subtitle="QL-442 shutdown / independent OFF continuity — historical evidence only"
    release="333"
    currentPath="#ql442-owner-shutdown"
    navigation={[{ id: "shutdown", label: "Shutdown evidence", href: "#ql442-owner-shutdown" }]}
    kpis={status ? [
      { id: "connection", icon: "◉", label: "Master connection", value: status.connection,
        detail: "No CONNECTED authorization", tone: "warning" },
      { id: "lease", icon: "⊘", label: "Lease disposition", value: status.leaseDisposition,
        detail: "Signed original-host OFF timestamps unavailable", tone: "critical" },
      { id: "receiver", icon: "?", label: "Physical receiver", value: "UNKNOWN",
        detail: "Fresh independent OFF witness required", tone: "neutral" },
    ] : []}
    workspaces={[]}>
    <section id="ql442-owner-shutdown" className="mc-panel">
      <h3>Signed isolated shutdown and three-Master closeout</h3>
      <p>Historical OFF evidence and GREEN code cannot prove live physical OFF.
        Lease-expired shutdowns remain exceptions, not successful physical closure.
        This view has no receiver shutdown, restart, or ON control.</p>
      <button type="button" disabled={busy} onClick={() => void refresh()}>
        {busy ? "Reading source status…" : "Refresh authenticated QL-442 status"}
      </button>
      <p role="status">{message}</p>
      {status && <dl>
        <dt>Original host</dt><dd>{status.sourceHost}</dd>
        <dt>Lease classification</dt><dd>{status.leaseDisposition}</dd>
        <dt>Independent OFF observed</dt><dd>UNKNOWN</dd>
        <dt>Three-Master signed closeout</dt><dd>NOT VERIFIED</dd>
        <dt>Protected historical custody</dt><dd>{status.historicalCustodyReadback}</dd>
        <dt>Connection / activation</dt><dd>HOLD / NOT AUTHORIZED</dd>
      </dl>}
    </section>
  </MasterCommandVisualSystem>;
}
