import { useEffect, useRef, useState } from "react";
import { getMasterShellContinuity335 } from "./api";
import { MasterCommandVisualSystem } from "./MasterCommandVisualSystem";

type ContinuityStatus = {
  schema: "rosevear.ai-hub.ql444-owner-continuity.v1";
  sourceBuild: 335;
  state: string;
  connection: "HOLD";
  activationAuthorized: false;
  physicalReceiverCurrentlyOff: false;
  receiver: "UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION";
  manualReceiverIsolationRequired: true;
  freshPhysicalOffProven: false;
  incidentClosed: false;
  leaseDisposition: "UNVERIFIED";
  sourceHost: "DESKTOP-AE894KC";
  signedHostContinuity: string;
  twoSampleIndependentOffWatch: string;
  leaseExceptionRemediation: string;
  threeMasterClosure: string;
  dualOwnerClosure: string;
  protectedHistoricalClosure: string;
  lastIndependentOffAt: null;
  message: string;
};

function inspect(value: unknown): ContinuityStatus | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const s = value as Record<string, unknown>;
  if (s.schema !== "rosevear.ai-hub.ql444-owner-continuity.v1" ||
      s.sourceBuild !== 335 ||
      s.connection !== "HOLD" ||
      s.activationAuthorized !== false ||
      s.receiver !== "UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION" ||
      s.manualReceiverIsolationRequired !== true ||
      s.physicalReceiverCurrentlyOff !== false ||
      s.freshPhysicalOffProven !== false ||
      s.incidentClosed !== false ||
      s.leaseDisposition !== "UNVERIFIED" ||
      s.sourceHost !== "DESKTOP-AE894KC" ||
      s.lastIndependentOffAt !== null ||
      typeof s.signedHostContinuity !== "string" ||
      typeof s.twoSampleIndependentOffWatch !== "string" ||
      typeof s.leaseExceptionRemediation !== "string" ||
      typeof s.threeMasterClosure !== "string" ||
      typeof s.dualOwnerClosure !== "string" ||
      typeof s.protectedHistoricalClosure !== "string" ||
      typeof s.state !== "string" ||
      typeof s.message !== "string") return null;
  return s as ContinuityStatus;
}

/** Signed historical evidence only; not a live OFF or actuator interface. */
export function Ql444OwnerContinuityPanel() {
  const [status, setStatus] = useState<ContinuityStatus | null>(null);
  const [message, setMessage] = useState("No verified original-host continuity source.");
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
      const response: unknown = await getMasterShellContinuity335(current.signal);
      if (controller.current !== current) return;
      const accepted = inspect(response);
      setStatus(accepted);
      setMessage(accepted ? accepted.message : "Unverified QL-444 source; HOLD.");
    } catch {
      if (controller.current !== current) return;
      setStatus(null);
      setMessage("Owner QL-444 evidence unavailable; HOLD.");
    } finally {
      if (controller.current === current) setBusy(false);
    }
  }

  return <MasterCommandVisualSystem
    title="Receiver & Ceremony"
    subtitle="QL-444 signed OFF continuity and owner-gated incident evidence closure"
    release="335"
    currentPath="#ql444-owner-continuity"
    navigation={[{ id: "continuity", label: "OFF continuity watch", href: "#ql444-owner-continuity" }]}
    kpis={status ? [
      { id: "connection", icon: "◉", label: "Connection gate", value: status.connection,
        detail: "No activation authority", tone: "warning" },
      { id: "lease", icon: "⊘", label: "Lease exception", value: status.leaseDisposition,
        detail: "Remediation is not proven", tone: "critical" },
      { id: "receiver", icon: "?", label: "Current receiver", value: "UNKNOWN",
        detail: "Fresh independent physical OFF required", tone: "neutral" },
    ] : []}
    workspaces={[]}>
    <section id="ql444-owner-continuity" className="mc-panel">
      <h3>Two-sample independent OFF continuity and protected closure</h3>
      <p>Only independently pinned original-host and external receiver evidence can
        support historical incident closure. An expired lease requires separately
        signed remediation and three-Master/dual-owner approval. No physical
        receiver ON/OFF, restart, or CONNECTED control is available here.</p>
      <button type="button" disabled={busy} onClick={() => void refresh()}>
        {busy ? "Reading signed custody…" : "Refresh authenticated QL-444 evidence"}
      </button>
      <p role="status">{message}</p>
      {status && <dl>
        <dt>Original host</dt><dd>{status.sourceHost}</dd>
        <dt>Host OFF continuity</dt><dd>{status.signedHostContinuity}</dd>
        <dt>Two independent OFF samples</dt><dd>{status.twoSampleIndependentOffWatch}</dd>
        <dt>Lease exception remediation</dt><dd>{status.leaseExceptionRemediation}</dd>
        <dt>Three-Master review</dt><dd>{status.threeMasterClosure}</dd>
        <dt>Two-owner closure</dt><dd>{status.dualOwnerClosure}</dd>
        <dt>Protected historical custody</dt><dd>{status.protectedHistoricalClosure}</dd>
        <dt>Current physical receiver</dt><dd>UNKNOWN — new live OFF proof required</dd>
        <dt>Connection</dt><dd>HOLD / activation disabled</dd>
      </dl>}
    </section>
  </MasterCommandVisualSystem>;
}
