import { useEffect, useRef, useState } from "react";
import { getMasterShellAcceptance305 } from "./api";
import { inspectMasterAcceptance305, type MasterAcceptance305 } from "./masterShellAcceptance305";

const SERVICE_NAMES: Record<string, string> = { hub_api: "Python API · 8765",
  hub_web: "Web Client · 5173", caddy_proxy: "Caddy Proxy · 8443" };

/** Owner can inspect state, never bless source signer or Comms by checking a UI box. */
export function MasterShellAcceptance305Panel() {
  const [value, setValue] = useState<MasterAcceptance305 | null>(null);
  const [message, setMessage] = useState("No live Ree-host Build 305 read attempted.");
  const [busy, setBusy] = useState(false);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  async function refresh() {
    pending.current?.abort();
    const controller = new AbortController(); pending.current = controller; setBusy(true);
    try {
      const result = inspectMasterAcceptance305(await getMasterShellAcceptance305(controller.signal));
      if (pending.current !== controller) return;
      setValue(result);
      setMessage(result ? "Source-only observation loaded. Installed-process and Master trust remain HOLD."
        : "Untrusted or incompatible Build 305 source evidence. HOLD.");
    } catch {
      if (pending.current !== controller) return;
      setValue(null); setMessage("Protected local owner read unavailable. HOLD.");
    } finally { if (pending.current === controller) setBusy(false); }
  }
  return <section aria-labelledby="master-305-title">
    <p className="eyebrow">Build 305 · Three-Master acceptance</p>
    <h3 id="master-305-title">Ree server release, durable uptime and one-TEST correlation</h3>
    <p>Read-only acceptance review for <code>DESKTOP-AE894KC</code> only.
      Build 304's database persists on Ree's machine, but an active-release pointer is not proof
      that the installed Python process matches GitHub <code>main</code>. Neither this button
      nor the browser signs, sends, acknowledges or activates telemetry.</p>
    <button type="button" onClick={() => void refresh()} disabled={busy}>
      {busy ? "Reading host evidence…" : "Refresh Build 305 host acceptance"}
    </button>
    <p role="status">{message}</p>
    {value && <>
      <dl>
        <dt>Installed release</dt><dd>{value.installedRelease.state.replaceAll("_", " ")}</dd>
        <dt>Recorded release pointer</dt><dd>{value.installedRelease.recordedReleaseSha ?? "Not recorded"}</dd>
        <dt>Ree original host</dt><dd>{value.installedRelease.originalHostObserved ? "Observed — still needs independent review" : "HOLD"}</dd>
        <dt>Automation host policy</dt><dd>{value.installedRelease.automationHostEnforced ? "Enforced on Ree" : "HOLD"}</dd>
        <dt>Durable uptime history</dt><dd>{value.installedRelease.durableHistoryState.replaceAll("_", " ")}</dd>
        <dt>Samples retained</dt><dd>{value.durableMonitoring.sampleCount} across seven-day bounded history</dd>
        <dt>Recent sample</dt><dd>{value.durableMonitoring.lastSampleAtUtc ?? "Not observed"}</dd>
        <dt>Signed QL-411/412 TEST</dt><dd>HOLD — original-host authorized signer not executed</dd>
        <dt>Comms receiver ACK</dt><dd>HOLD — not independently verified</dd>
        <dt>Master connection / slave onboarding</dt><dd>HOLD / HOLD</dd>
      </dl>
      <ul aria-label="Seven-day local uptime dashboard">
        {value.durableMonitoring.services.map(s => <li key={s.id}>
          <strong>{SERVICE_NAMES[s.id]} — {s.latestState.replaceAll("_", " ")}</strong>
          {" · "}{s.reachableSamples}/{s.sampleCount} successful TCP observations
          {s.observedAvailabilityPercent !== null ? ` (${s.observedAvailabilityPercent}% observed)` : ""}
        </li>)}
      </ul>
    </>}
    <p>The protected backend can prepare one measured, source-signed, metadata-only envelope
      compatible with Comms QL-411. QL-412 still requires independent receiver signing,
      durable replay enrollment and an owner-supervised TEST before an acknowledgement is trusted.
      The existing Windows launcher and Recovery task are unchanged; no duplicate tasks were created.</p>
  </section>;
}
