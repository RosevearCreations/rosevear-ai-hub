import { useEffect, useRef, useState } from "react";
import { getMasterShellReadiness330 } from "./api";
import { MasterCommandVisualSystem, type MasterCommandKpi } from "./MasterCommandVisualSystem";
import { Ql439ReadOnlyInspector, type Ql439ReadinessSnapshot } from "./Ql439ReadOnlyInspector";

type Readiness330 = {
  sourceBuild: 330;
  schema: "rosevear.ai-hub.ql439-owner-source.v1";
  state: "QL439_DURABLE_PRIVATE_READINESS_FRESH_OFF_RECHECK_REQUIRED";
  connection: "HOLD";
  activationAuthorized: false;
  slaveGate: "HOLD_NEXT_MASTER_INTEGRATION_STAGE";
  receiver: "UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION";
  snapshot: Ql439ReadinessSnapshot | null;
  message: string;
};

function accepted(value: unknown): value is Readiness330 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return (
    item.sourceBuild === 330 &&
    item.schema === "rosevear.ai-hub.ql439-owner-source.v1" &&
    item.state === "QL439_DURABLE_PRIVATE_READINESS_FRESH_OFF_RECHECK_REQUIRED" &&
    item.connection === "HOLD" &&
    item.activationAuthorized === false &&
    item.slaveGate === "HOLD_NEXT_MASTER_INTEGRATION_STAGE" &&
    item.receiver === "UNKNOWN_UNTIL_FRESH_INDEPENDENT_OFF_REVALIDATION" &&
    (item.snapshot === null || typeof item.snapshot === "object") &&
    typeof item.message === "string"
  );
}

/** Scoped System panel, source-only. No private browser cache or receiver controls. */
export function Ql439OwnerReadinessPanel() {
  const [status, setStatus] = useState<Readiness330 | null>(null);
  const [message, setMessage] = useState("Protected QL-439 status has not been read.");
  const [pending, setPending] = useState(false);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  async function refresh() {
    requestRef.current?.abort();
    const current = new AbortController();
    requestRef.current = current;
    setPending(true);
    setStatus(null);
    try {
      const source: unknown = await getMasterShellReadiness330(current.signal);
      if (requestRef.current !== current) return;
      if (!accepted(source)) {
        setMessage("Authenticated QL-439 source was missing or unsafe. HOLD.");
        return;
      }
      setStatus(source);
      setMessage(source.message);
    } catch {
      if (requestRef.current !== current) return;
      setMessage("QL-439 owner source unavailable. HOLD.");
    } finally {
      if (requestRef.current === current) setPending(false);
    }
  }

  const instruments: MasterCommandKpi[] = status ? [
    { id: "connection", icon: "◉", tone: "warning", label: "Connection",
      value: status.connection, detail: "No Master connection authorization" },
    { id: "activation", icon: "⊘", tone: "critical", label: "Receiver activation",
      value: status.activationAuthorized ? "UNSAFE" : "NOT AUTHORIZED",
      detail: "Preparation-only decision boundary" },
    { id: "receiver", icon: "?", tone: "neutral", label: "Physical receiver",
      value: "UNKNOWN", detail: "Fresh independent OFF evidence required" },
  ] : [];

  return <MasterCommandVisualSystem
    title="Original-host ceremony readiness"
    subtitle="QL-439 protected evidence — read-only System instrument"
    release="330"
    currentPath="#ql439-owner-status"
    navigation={[{ id: "status", label: "Readiness evidence", href: "#ql439-owner-status" }]}
    kpis={instruments}
    workspaces={[]}>
    <section className="mc-panel" id="ql439-owner-status">
      <h3>Source readback</h3>
      <p>Historic custody never proves present physical OFF. All runtime controls remain unavailable.</p>
      <button type="button" disabled={pending} onClick={() => void refresh()}>
        {pending ? "Reading owner source…" : "Refresh authenticated source"}
      </button>
      <p role="status">{message}</p>
      <Ql439ReadOnlyInspector
        snapshot={status?.snapshot ?? null}
        pending={pending}
        error={!status ? message : status.snapshot ? null : "No signed original-host readiness source enrolled"}
      />
    </section>
  </MasterCommandVisualSystem>;
}
