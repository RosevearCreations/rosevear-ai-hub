import { useEffect, useRef, useState } from "react";
import { getMasterShellRenewal334 } from "./api";
import { MasterCommandVisualSystem } from "./MasterCommandVisualSystem";

type RenewalStatus = {
  schema: "rosevear.ai-hub.ql443-owner-renewal.v1";
  sourceBuild: 334;
  state: string;
  connection: "HOLD";
  activationAuthorized: false;
  receiver: "UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION";
  manualReceiverIsolationRequired: true;
  physicalReceiverCurrentlyOff: false;
  freshPhysicalOffProven: false;
  incidentClosed: false;
  leaseDisposition: "UNVERIFIED";
  sourceHost: "DESKTOP-AE894KC";
  historicalAdmission: string;
  expiredLeaseException: string;
  threeMasterFreshOff: string;
  lastFreshIndependentOffAt: null;
  message: string;
};

function inspect(value: unknown): RenewalStatus | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const s = value as Record<string, unknown>;
  if (s.schema !== "rosevear.ai-hub.ql443-owner-renewal.v1" ||
      s.sourceBuild !== 334 ||
      s.connection !== "HOLD" ||
      s.activationAuthorized !== false ||
      s.receiver !== "UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION" ||
      s.manualReceiverIsolationRequired !== true ||
      s.physicalReceiverCurrentlyOff !== false ||
      s.freshPhysicalOffProven !== false ||
      s.incidentClosed !== false ||
      s.leaseDisposition !== "UNVERIFIED" ||
      s.sourceHost !== "DESKTOP-AE894KC" ||
      s.lastFreshIndependentOffAt !== null ||
      typeof s.historicalAdmission !== "string" ||
      typeof s.expiredLeaseException !== "string" ||
      typeof s.threeMasterFreshOff !== "string" ||
      typeof s.state !== "string" ||
      typeof s.message !== "string") return null;
  return s as RenewalStatus;
}

/** Read-only source instrument; synthetic code GREEN does not certify physical OFF. */
export function Ql443OwnerRenewalPanel() {
  const [status, setStatus] = useState<RenewalStatus | null>(null);
  const [message, setMessage] = useState("Protected QL-443 source custody unverified.");
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
      const response: unknown = await getMasterShellRenewal334(current.signal);
      if (controller.current !== current) return;
      const accepted = inspect(response);
      setStatus(accepted);
      setMessage(accepted ? accepted.message : "Untrusted QL-443 source. HOLD.");
    } catch {
      if (controller.current !== current) return;
      setStatus(null);
      setMessage("Owner-only QL-443 source unavailable. HOLD.");
    } finally {
      if (controller.current === current) setBusy(false);
    }
  }

  return <MasterCommandVisualSystem
    title="Receiver & Ceremony"
    subtitle="QL-443 protected custody and renewed OFF — evidence only"
    release="334"
    currentPath="#ql443-owner-renewal"
    navigation={[{ id: "renewal", label: "Custody renewal", href: "#ql443-owner-renewal" }]}
    kpis={status ? [
      { id: "connection", icon: "◉", label: "Master connection", value: status.connection,
        detail: "No activation authorized", tone: "warning" },
      { id: "lease", icon: "⊘", label: "Lease exception", value: status.leaseDisposition,
        detail: "Historical classification not enrolled", tone: "critical" },
      { id: "receiver", icon: "?", label: "Current receiver", value: "UNKNOWN",
        detail: "New independently signed live OFF required", tone: "neutral" },
    ] : []}
    workspaces={[]}>
    <section id="ql443-owner-renewal" className="mc-panel">
      <h3>Protected shutdown custody / renewed three-Master OFF</h3>
      <p>Original host DESKTOP-AE894KC and independently enrolled signers are required.
        Historical evidence admission cannot close a physical pilot. Late leases
        remain open exceptions. This screen has no ON, OFF or restart controls.</p>
      <button type="button" disabled={busy} onClick={() => void refresh()}>
        {busy ? "Reading original-source status…" : "Refresh authenticated QL-443 status"}
      </button>
      <p role="status">{message}</p>
      {status && <dl>
        <dt>Original host</dt><dd>{status.sourceHost}</dd>
        <dt>Historical protected admission</dt><dd>{status.historicalAdmission}</dd>
        <dt>Expired-lease exception handoff</dt><dd>{status.expiredLeaseException}</dd>
        <dt>Three-Master fresh OFF</dt><dd>{status.threeMasterFreshOff}</dd>
        <dt>Current physical receiver</dt><dd>UNKNOWN — independently verify</dd>
        <dt>Connection and authorization</dt><dd>HOLD / NOT AUTHORIZED</dd>
      </dl>}
    </section>
  </MasterCommandVisualSystem>;
