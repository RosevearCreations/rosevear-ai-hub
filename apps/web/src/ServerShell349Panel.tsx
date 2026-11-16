import { useEffect, useRef, useState } from "react";
import { getServerShell349, type ServerShell349Snapshot } from "./api";
import { MasterCommandVisualSystem } from "./MasterCommandVisualSystem";
import "./serverShell349.css";

type Theme349 = "instrument" | "nebula" | "aurora";
const themes: Theme349[] = ["instrument", "nebula", "aurora"];

function isSnapshot(value: unknown): value is ServerShell349Snapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return item.schema === "rosevear.hub.ql458-server-shell-readiness.v1" &&
    item.sourceBuild === 349 && item.serverShell === "ai-data-platform" &&
    item.crossAppConnectivityVerified === false &&
    item.physicalReceiverCurrentlyOff === false &&
    item.activationAuthorized === false &&
    Array.isArray(item.modules) && item.modules.length === 3 &&
    Array.isArray(item.applications) && item.applications.length === 4;
}

export function ServerShell349Panel() {
  const [snapshot, setSnapshot] = useState<ServerShell349Snapshot | null>(null);
  const [message, setMessage] = useState("No signed original-host enrollment evidence loaded.");
  const [working, setWorking] = useState(false);
  const [themesByModule, setThemesByModule] = useState<Record<string, Theme349>>({});
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function refresh() {
    controller.current?.abort();
    const next = new AbortController();
    controller.current = next;
    setSnapshot(null);
    setWorking(true);
    try {
      const data: unknown = await getServerShell349(next.signal);
      if (next !== controller.current) return;
      if (!isSnapshot(data)) {
        setMessage("Invalid or incomplete status response — HOLD.");
        return;
      }
      setSnapshot(data);
      setMessage(data.verifiedLocalOwnerManifest
        ? "Owner-signed local intent verified; live services and links remain unverified."
        : "HOLD: no independently verified original-host owner enrollment.");
    } catch {
      if (next === controller.current) setMessage("Server Shell unavailable — HOLD.");
    } finally {
      if (next === controller.current) setWorking(false);
    }
  }

  const modules = snapshot?.modules ?? [];
  const applications = snapshot?.applications ?? [];
  return <MasterCommandVisualSystem
    title="Unified Server Shell — three Master modules"
    subtitle="QL-458 · AI Data Platform control plane · local AI Hub automation · Comms operations"
    release="349"
    currentPath="#server-shell-349"
    navigation={[
      { id: "modules", label: "Three Masters", href: "#server-shell-349" },
      { id: "slaves", label: "Slave Shell status", href: "#server-shell-slaves" },
      { id: "evidence", label: "Original-host evidence", href: "#server-shell-evidence" },
    ]}
    kpis={snapshot ? [
      { id: "host", icon: "⌂", label: "Automation host", value: "UNVERIFIED",
        detail: snapshot.automationHost, tone: "warning" },
      { id: "yw", icon: "Y", label: "Yard Workers", value: "UNKNOWN",
        detail: "No authenticated live telemetry", tone: "warning" },
      { id: "icamp", icon: "I", label: "iCamp", value: "UNKNOWN",
        detail: "No authenticated live telemetry", tone: "warning" },
      { id: "physical", icon: "!", label: "Original receiver", value: "HOLD",
        detail: "No fresh independent OFF witness", tone: "critical" },
    ] : []}
    workspaces={[]}>
    <section id="server-shell-349" className="mc-panel shell349">
      <div className="shell349-toolbar">
        <div><h3>Three Masters · one operating vision</h3>
          <p>Separate modules and release lifecycles. Visual themes do not start, stop or connect applications.</p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={working}>
          {working ? "Checking…" : "Refresh verified source"}
        </button>
      </div>
      <p role="status">{message}</p>
      <div className="shell349-modules">
        {modules.map((mod, index) => {
          const selected = themesByModule[mod.id] ?? mod.theme;
          return <article className="shell349-module" data-skin={selected} key={mod.id}>
            <div className="shell349-art" aria-hidden="true" />
            <div className="shell349-content">
              <small>MASTER {index + 1} · {mod.role.replace(/-/g, " ")}</small>
              <h4>{mod.id}</h4>
              <p>Runtime: <strong>{mod.runtimeState}</strong></p>
              <p>Signed module intent: <strong>{mod.desiredEnabled === null ? "UNKNOWN" :
                mod.desiredEnabled ? "ENABLED REQUESTED" : "DISABLED REQUESTED"}</strong></p>
              <label>Appearance
                <select value={selected} onChange={event => {
                  const t = event.target.value as Theme349;
                  if (themes.includes(t)) {
                    setThemesByModule(current => ({ ...current, [mod.id]: t }));
                  }
                }}>
                  {themes.map(t => <option value={t} key={t}>{t}</option>)}
                </select>
              </label>
            </div>
          </article>;
        })}
      </div>
      {!modules.length && <p>Awaiting an authorized Server Shell snapshot. All modules HOLD.</p>}
    </section>
    <section id="server-shell-slaves" className="mc-panel shell349">
      <h3>Slave Shell and business application telemetry</h3>
      <p>YL/iCamp monitoring placeholders report unknown until signed real-world peer evidence is available.</p>
      <div className="shell349-status-grid">
        {applications.map(item => <article className="shell349-status" key={item.id}>
          <strong>{item.id}</strong><small>{item.kind}</small>
          <p>Connection: {item.connectivity}</p>
          <p>Signed enrollment intent: {item.signedPeerIntentPresent ? "present" : "not verified"}</p>
          <p>Latency: {item.latencyMs ?? "unknown"} · Errors: {item.errorCount ?? "unknown"}</p>
        </article>)}
      </div>
    </section>
    <section id="server-shell-evidence" className="mc-panel shell349">
      <h3>Evidence and automation safety</h3>
      <p>Owner-signed configuration is not proof of running Windows services.
        A real original-host signed TLS/ACK receipt and independently validated peer telemetry
        are required before any CONNECTED claim. Home automation and physical controls are not activated.</p>
      <p>Receiver: UNKNOWN · incident OPEN · activation DENIED.</p>
    </section>
  </MasterCommandVisualSystem>;
}
