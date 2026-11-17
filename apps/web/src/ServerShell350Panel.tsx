import { useEffect, useRef, useState } from "react";
import { getServerShell350, getServerShell351, type ServerShell350Snapshot, type ServerShell351Snapshot } from "./api";
import { MasterCommandVisualSystem } from "./MasterCommandVisualSystem";
import "./serverShell349.css";

type Skin = "instrument" | "nebula" | "aurora";
const skins: Skin[] = ["instrument", "nebula", "aurora"];

function authenticContract(data: unknown): data is ServerShell350Snapshot {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const r = data as Record<string, unknown>;
  if (r.schema !== "rosevear.hub.three-master-observability350.v1" ||
      r.sourceBuild !== 350 || r.serverShell !== "ai-data-platform" ||
      r.activationAuthorized !== false ||
      r.physicalReceiverCurrentlyOff !== false ||
      r.globalConnectivityVerified !== false ||
      r.webServiceMutationAvailable !== false ||
      !Array.isArray(r.modules) || r.modules.length !== 3 ||
      !Array.isArray(r.applications) || r.applications.length !== 2) return false;
  const modules = r.modules as Array<Record<string, unknown>>;
  const slaves = r.applications as Array<Record<string, unknown>>;
  return ["ai-data-platform", "rosevear-ai-hub", "rosevear-comms-hub"]
    .every((id, i) => modules[i]?.id === id &&
      modules[i]?.actionPolicy === "LOCAL_SIGNED_OWNER_PERMIT_ONLY") &&
    ["iCamp", "YW"].every((id, i) => slaves[i]?.id === id &&
      (slaves[i]?.connected === false ||
        (slaves[i]?.connected === true &&
          slaves[i]?.proof === "FRESH_PINNED_MTLS_AND_ED25519_JOURNAL")));
}

function matchesQl460(value: unknown): value is ServerShell351Snapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const o = value as Record<string, unknown>;
  return o.schema === "rosevear.hub.unified-operator-readiness351.v1" &&
    o.sourceBuild === 351 && o.serverShell === "ai-data-platform" &&
    o.physicalReceiverCurrentlyOff === false &&
    o.receiverActivationAuthorized === false &&
    o.webMutationAvailable === false &&
    o.installationVerified === false &&
    o.rebootAcceptanceVerified === false &&
    o.issueAlertDeliveryVerified === false &&
    typeof o.eventBus === "object" && o.eventBus !== null &&
    typeof o.homeAutomation === "object" && o.homeAutomation !== null &&
    typeof o.bootWitness === "object" && o.bootWitness !== null &&
    Array.isArray(o.issues);
}

export function ServerShell350Panel() {
  const [snapshot, setSnapshot] = useState<ServerShell350Snapshot | null>(null);
  const [ql460, setQl460] = useState<ServerShell351Snapshot | null>(null);
  const [notice, setNotice] = useState("No original-host observation has been loaded.");
  const [busy, setBusy] = useState(false);
  const [theme, setTheme] = useState<Record<string, Skin>>({});
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);

  async function refresh() {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setSnapshot(null);
    setQl460(null);
    setBusy(true);
    try {
      const response: unknown = await getServerShell350(controller.signal);
      if (pending.current !== controller) return;
      if (!authenticContract(response)) {
        setNotice("Invalid source contract: all runtime and peer states are HOLD.");
      } else {
        setSnapshot(response);
        try {
          const next: unknown = await getServerShell351(controller.signal);
          if (pending.current === controller && matchesQl460(next)) setQl460(next);
        } catch {
          // No QL-460 evidence is equivalent to HOLD, never a successful connection.
        }
        setNotice(response.signedManifestVerified
          ? "Signed original-host configuration verified. Live states require fresh source evidence."
          : "HOLD: no verified original-host signed enrollment and observation.");
      }
    } catch {
      if (pending.current === controller) setNotice("Server status unavailable: HOLD.");
    } finally {
      if (pending.current === controller) setBusy(false);
    }
  }
  const modules = snapshot?.modules ?? [];
  const peers = snapshot?.applications ?? [];
  return <MasterCommandVisualSystem
    title="Unified Three-Master Server Command Centre"
    subtitle="AI Data Platform shell · Windows AI Hub runtime · Comms Hub · independent Slave monitoring"
    release="351"
    currentPath="#master350"
    navigation={[
      { id: "master", label: "Master modules", href: "#master350" },
      { id: "slaves", label: "YW + iCamp", href: "#slaves350" },
      { id: "evidence", label: "Supervisor custody", href: "#custody350" },
      { id: "issues", label: "Master events & issue alerts", href: "#issues351" },
      { id: "automation", label: "Home automation", href: "#automation351" },
    ]}
    kpis={snapshot ? [
      { id: "host", icon: "⌂", label: "Original Windows host",
        value: snapshot.originalHostVerified ? "IDENTIFIED" : "UNVERIFIED",
        detail: snapshot.originalHost, tone: snapshot.originalHostVerified ? "info" : "warning" },
      { id: "runtime", icon: "◉", label: "All Master services",
        value: snapshot.liveAutomationHostVerified ? "RUNNING" : "NOT VERIFIED",
        detail: "Each module independently supervised",
        tone: snapshot.liveAutomationHostVerified ? "healthy" : "warning" },
      { id: "yw", icon: "Y", label: "Yard Workers",
        value: peers.find(p => p.id === "YW")?.state ?? "UNKNOWN",
        detail: "Signed peer health", tone: peers.find(p => p.id === "YW")?.connected ? "info" : "warning" },
      { id: "icamp", icon: "I", label: "iCamp",
        value: peers.find(p => p.id === "iCamp")?.state ?? "UNKNOWN",
        detail: "Signed peer health", tone: peers.find(p => p.id === "iCamp")?.connected ? "info" : "warning" },
    ] : []}
    workspaces={[
      { id: "modules", label: "Three Master modules", detail: "Independent Windows service observations",
        href: "#master350", status: "OWNER GATED", tone: "info" },
      { id: "slaves", label: "Slave Shell telemetry", detail: "Signed YW and iCamp observations only",
        href: "#slaves350", status: "PER-PEER", tone: "warning" },
      { id: "custody", label: "Automation custody", detail: "Protected permits, journals and recovery limits",
        href: "#custody350", status: "LOCAL ONLY", tone: "warning" },
    ]}>
    <section id="master350" className="mc-panel shell349">
      <div className="shell349-toolbar">
        <div><h3>Independent Master service modules</h3>
          <p>Theme controls only change the look. Service lifecycle controls require a signed local owner permit.</p>
        </div>
        <button type="button" disabled={busy} onClick={() => void refresh()}>
          {busy ? "Reading…" : "Refresh source evidence"}
        </button>
      </div>
      <p role="status">{notice}</p>
      <div className="shell349-modules">
        {modules.map((mod, i) => {
          const skin = theme[mod.id] ?? mod.theme;
          return <article className="shell349-module" data-skin={skin} key={mod.id}>
            <div className="shell349-art" aria-hidden="true" />
            <div className="shell349-content">
              <small>MASTER {i + 1} · {mod.role.replace(/-/g, " ")}</small>
              <h4>{mod.id}</h4>
              <p>Windows service: <strong>{mod.serviceName}</strong></p>
              <p>Observed: <strong>{mod.runtimeState}</strong></p>
              <p>Last verified sample: <strong>{mod.observedAtMs === null
                ? "Unknown" : new Date(mod.observedAtMs).toLocaleString()}</strong></p>
              <p>Signed desired state: <strong>{mod.desiredEnabled === null
                ? "Unknown" : mod.desiredEnabled ? "Enabled" : "Disabled"}</strong></p>
              <label>Visual theme
                <select value={skin} onChange={e => {
                  const value = e.target.value as Skin;
                  if (skins.includes(value)) setTheme(old => ({ ...old, [mod.id]: value }));
                }}>{skins.map(value => <option key={value} value={value}>{value}</option>)}</select>
              </label>
            </div>
          </article>;
        })}
      </div>
      {!modules.length && <p>No verified source data; services must not be shown as running.</p>}
    </section>
    <section id="slaves350" className="mc-panel shell349">
      <h3>Slave Shell health and issue detection</h3>
      <p>All figures are unknown until an original-host mTLS probe validates a signed, fresh peer report.</p>
      <div className="shell349-status-grid">
        {peers.map(peer => <article className="shell349-status" key={peer.id}>
          <strong>{peer.id}</strong><small>SLAVE SHELL</small>
          <p>Health: <strong>{peer.state}</strong></p>
          <p>TLS + signature: {peer.connected ? "VERIFIED SAMPLE" : "NOT VERIFIED"}</p>
          <p>Latency: {peer.latencyMs === null ? "unknown" : peer.latencyMs + " ms"}</p>
          <p>Queue backlog: {peer.queueLag ?? "unknown"}</p>
          <p>Recent errors: {peer.recentErrors ?? "unknown"}</p>
          <p>Source: {peer.proof}</p>
        </article>)}
      </div>
    </section>
    <section id="custody350" className="mc-panel shell349">
      <h3>24/7 original-host service supervision</h3>
      <p>Windows service query, start and stop are local-only, under owner-signed scoped permits.
        Recovery grants last no more than 24 hours and are limited to three attempts per hour
        per module with ten-minute spacing. No browser action or observation automatically starts a service.</p>
      <p>Supervisor installation: {snapshot?.supervisorLoopInstalledVerified
        ? "VERIFIED" : "NOT VERIFIED"} · Restart task: {snapshot?.serviceStartupTaskInstalledVerified
        ? "VERIFIED" : "NOT VERIFIED"} · Receiver state: UNKNOWN · incident OPEN.</p>
      <p>Actual 24/7 operation must be installed and proven on the original Windows PC.
        Source CI success is not a runtime health check.</p>
    </section>
    <section id="issues351" className="mc-panel shell349">
      <h3>Master event bus & verified issue alerts · QL-460</h3>
      <p>Events come only from the original-host protected local journals. A local hash chain
        detects alteration but does not independently attest a Windows reboot.</p>
      <p>Ledger: <strong>{ql460?.eventBus.integrity ?? "HOLD"}</strong> ·
        Delivery of outbound alerts: NOT VERIFIED ·
        Owner acknowledgement: NOT ENABLED</p>
      <div className="shell349-status-grid">
        {(ql460?.issues ?? []).map((issue, index) =>
          <article className="shell349-status" key={issue.source + "-" + index}>
            <strong>{issue.source}</strong>
            <small>{issue.severity}</small>
            <p>Observed: {issue.state}</p>
            <p>Evidence: {issue.evidenceDigest.slice(0, 16)}…</p>
            <p>Disposition: {issue.disposition}</p>
          </article>
        )}
      </div>
      {!(ql460?.issues.length) && <p>No current verified issue alerts. This is not proof of healthy or connected services.</p>}
    </section>
    <section id="automation351" className="mc-panel shell349">
      <h3>Home automation · read-only health</h3>
      <p>Home Assistant authenticated API: <strong>{ql460?.homeAutomation.state ?? "UNVERIFIED"}</strong></p>
      <p>Evidence: {ql460?.homeAutomation.proof ?? "NO_AUTHENTICATED_READONLY_API_RESPONSE"}</p>
      <p>No device controls, scenes, switches or receiver activation are available from this Server Shell.</p>
    </section>
    <section id="boot351" className="mc-panel shell349">
      <h3>Windows installation & reboot acceptance</h3>
      <p>Boot observations: <strong>{ql460?.bootWitness.distinctBoots ?? 0}</strong> ·
        Source: {ql460?.bootWitness.observation ?? "HOLD"}</p>
      <p>Observer task installed: NOT VERIFIED · Automatic launch after reboot: NOT VERIFIED ·
        Independent reboot acceptance: NOT VERIFIED.</p>
      <p>Windows installation requires the owner to run the disabled-first QL-460 installer locally
        and then separately approve enabling it. GitHub CI cannot install it on the original PC.</p>
    </section>
  </MasterCommandVisualSystem>;
}
