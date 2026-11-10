import { useEffect, useRef, useState } from "react";
import { getMasterShellLocalUptime303 } from "./api";
import { inspectMasterShellUptime303, type Uptime303 } from "./masterShellUptime303";

const NAMES = { hub_api: "Python API · 8765", hub_web: "Web client · 5173",
  caddy_proxy: "Caddy proxy · 8443" };

/** Owner-only source observations; never polls another app or sends a Shell incident. */
export function MasterShellUptime303Panel() {
  const [snapshot, setSnapshot] = useState<Uptime303 | null>(null);
  const [message, setMessage] = useState("No original-host uptime observation loaded.");
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function refresh() {
    controller.current?.abort();
    const next = new AbortController(); controller.current = next; setBusy(true);
    try {
      const value = inspectMasterShellUptime303(await getMasterShellLocalUptime303(next.signal));
      if (controller.current !== next) return;
      setSnapshot(value);
      setMessage(value ? "Read-only original-source snapshot loaded. No Shell message sent."
        : "Invalid or incompatible local uptime evidence; remain HOLD.");
    } catch {
      if (controller.current !== next) return;
      setSnapshot(null);
      setMessage("Local uptime snapshot unavailable; inspect Ree's server and owner sign-in. HOLD.");
    } finally { if (controller.current === next) setBusy(false); }
  }
  return <section aria-labelledby="master-uptime-303-title">
    <p className="eyebrow">Build 303 · Ree's Windows server source monitoring</p>
    <h3 id="master-uptime-303-title">Original-host uptime and Master Shell coordination</h3>
    <p>Local source: DESKTOP-AE894KC (Ree). The background sampler runs only on that Windows host
      when explicitly enabled. Checks are loopback TCP availability, not full service health,
      a continuous uptime SLA or signed proof. Data resets when the API restarts.</p>
    <button type="button" disabled={busy} onClick={() => void refresh()}>
      {busy ? "Reading Ree's server…" : "Refresh server uptime evidence"}
    </button>
    <p role="status">{message}</p>
    {snapshot && <>
      <dl>
        <dt>Monitoring</dt><dd>{snapshot.collectionState.replaceAll("_", " ")}</dd>
        <dt>Session length</dt><dd>{snapshot.processSessionSeconds} seconds</dd>
        <dt>Samples captured</dt><dd>{snapshot.sampleCount} (up to 1,440)</dd>
        <dt>Most recent sample</dt><dd>{snapshot.lastSampleAtUtc ?? "Not observed"}</dd>
      </dl>
      <ul aria-label="Ree's server loopback availability">
        {snapshot.services.map(service => <li key={service.id}>
          <strong>{NAMES[service.id]}: {service.state.replaceAll("_", " ")}</strong>
          {" · "}{service.reachableSamples}/{service.sampleCount} sampled TCP checks reachable
          {service.sampleCount > 0 ? ` (${Math.round(100 * service.reachableSamples / service.sampleCount)}% observed availability)` : ""}
        </li>)}
      </ul>
    </>}
    <p><strong>AI Data Platform:</strong> intelligence/monitoring destination — HOLD until authenticated,
      approved source telemetry exists. <strong>Comms Hub:</strong> incidents/operator operations —
      receiver OFF, no alert sent. The original AI Hub retains device and automation authority.</p>
    <p>Automatic monitoring is opt-in on Ree's Windows host using
      <code>ROSEVEAR_MASTER_LOCAL_MONITOR_303=1</code> before starting the Python server.
      This does not move other applications' cloud jobs to Windows or enable remote commands.</p>
  </section>;
}
