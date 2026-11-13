import { useEffect, useRef, useState } from "react";
import { getMasterShellWitness332 } from "./api";
import { MasterCommandVisualSystem } from "./MasterCommandVisualSystem";

type WitnessStatus = {
  sourceBuild: 332;
  schema: "rosevear.ai-hub.ql441-owner-source.v1";
  state: "QL441_PRIVATE_DECISION_FRESH_OFF_AND_LEASE_CLOSEOUT_REQUIRED";
  connection: "HOLD";
  activationAuthorized: false;
  decision: "UNVERIFIED_HOLD";
  receiver: "UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION";
  manualReceiverIsolationRequired: true;
  privateDecisionPresent: false;
  lastIndependentObservationAt: null;
  leaseExpiresAt: null;
  message: string;
};

function isWitnessStatus(value: unknown): value is WitnessStatus {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return v.sourceBuild === 332 &&
    v.schema === "rosevear.ai-hub.ql441-owner-source.v1" &&
    v.state === "QL441_PRIVATE_DECISION_FRESH_OFF_AND_LEASE_CLOSEOUT_REQUIRED" &&
    v.connection === "HOLD" &&
    v.activationAuthorized === false &&
    v.decision === "UNVERIFIED_HOLD" &&
    v.receiver === "UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION" &&
    v.manualReceiverIsolationRequired === true &&
    v.privateDecisionPresent === false &&
    v.lastIndependentObservationAt === null &&
    v.leaseExpiresAt === null &&
    typeof v.message === "string";
}

/** Authenticated source-only QL-441 witness inspector — no ON control or lease. */
export function Ql441OwnerWitnessPanel() {
  const [status, setStatus] = useState<WitnessStatus | null>(null);
  const [message, setMessage] = useState("Live signed ON/OFF evidence is not available.");
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function refresh() {
    request.current?.abort();
    const current = new AbortController();
    request.current = current;
    setBusy(true);
    setStatus(null);
    try {
      const data: unknown = await getMasterShellWitness332(current.signal);
      if (request.current !== current) return;
      if (!isWitnessStatus(data)) {
        setMessage("Source authentication or custody status invalid. HOLD.");
        return;
      }
      setStatus(data);
      setMessage(data.message);
    } catch {
      if (request.current !== current) return;
      setStatus(null);
      setMessage("Original-host QL-441 source unavailable. HOLD.");
    } finally {
      if (request.current === current) setBusy(false);
    }
  }

  return <MasterCommandVisualSystem
    title="Receiver & Ceremony"
    subtitle="QL-441 isolated signed ON witness — read-only owner instrument"
    release="332"
    currentPath="#ql441-owner-witness"
    navigation={[{ id: "witness", label: "Witness custody", href: "#ql441-owner-witness" }]}
    kpis={status ? [
      { id: "connection", icon: "◉", label: "Master connection", value: status.connection,
        detail: "No CONNECTED authorization", tone: "warning" },
      { id: "decision", icon: "⊘", label: "Witness GO/NO-GO", value: status.decision,
        detail: "Signed external decision not independently verified", tone: "critical" },
      { id: "receiver", icon: "?", label: "Physical receiver", value: "UNKNOWN",
        detail: "Fresh independent OFF and shutdown custody required", tone: "neutral" },
    ] : []}
    workspaces={[]}>
    <section id="ql441-owner-witness" className="mc-panel">
      <h3>Protected signed witness custody</h3>
      <p>Historical code receipts cannot establish live receiver state. A GO witness
        does not authorize keeping a receiver ON, restarting or connecting a Master.</p>
      <button type="button" disabled={busy} onClick={() => void refresh()}>
        {busy ? "Reading source status…" : "Refresh authenticated witness status"}
      </button>
      <p role="status">{message}</p>
      {status && <p>Receiver isolation remains required. Lease expiry and
        independent ON/OFF timestamps are UNKNOWN until signed source admission.</p>}
    </section>
  </MasterCommandVisualSystem>;
}
