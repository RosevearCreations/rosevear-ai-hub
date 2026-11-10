import { useEffect, useRef, useState } from "react";
import { getMasterShellActivation304 } from "./api";
import { inspectMasterActivation304, type MasterActivation304 } from "./masterShellActivation304";

const NAMES: Record<string, string> = { hub_api: "Python API", hub_web: "Web client", caddy_proxy: "Caddy proxy" };

export function MasterShellActivation304Panel() {
  const [review, setReview] = useState<MasterActivation304 | null>(null);
  const [message, setMessage] = useState("Awaiting read-only original-host review.");
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function refresh() {
    controller.current?.abort();
    const next = new AbortController(); controller.current = next; setBusy(true);
    try {
      const inspected = inspectMasterActivation304(await getMasterShellActivation304(next.signal));
      if (controller.current !== next) return;
      setReview(inspected);
      setMessage(inspected ? "Read original-source monitoring only; no Master connection authorized."
        : "Source evidence incompatible or overclaims trust. HOLD.");
    } catch {
      if (controller.current !== next) return;
      setReview(null);
      setMessage("Protected owner read unavailable. Confirm the original Ree host. HOLD.");
    } finally { if (controller.current === next) setBusy(false); }
  }
  return <section aria-labelledby="master-activation-304-title">
    <p className="eyebrow">Build 304 · MASTER360-AIHUB-ACTIVATE</p>
    <h3 id="master-activation-304-title">Persistent source uptime, signed telemetry and Comms handoff</h3>
    <p>Ree's original Windows server retains automation/recovery authority. The master connection
      remains HOLD until original-host evidence, signer, independent review and receiver ACK
      are verified. This page cannot execute Windows tasks, share secrets or send alerts.</p>
    <button type="button" disabled={busy} onClick={() => void refresh()}>
      {busy ? "Reviewing local evidence…" : "Refresh Build 304 Master activation evidence"}
    </button>
    <p role="status">{message}</p>
    {review && <>
      <dl>
        <dt>Original Windows host policy</dt><dd>{review.monitoring.automationHostEnforced ? "ENFORCED" : "HOLD"}</dd>
        <dt>Durable monitoring</dt><dd>{review.monitoring.collectionState.replaceAll("_", " ")}</dd>
        <dt>History store</dt><dd>{review.monitoring.historyDurability.replaceAll("_", " ")}</dd>
        <dt>Retained uptime samples</dt><dd>{review.monitoring.sampleCount} (maximum 10,080)</dd>
        <dt>Most recent sample</dt><dd>{review.monitoring.lastSampleAtUtc ?? "Not observed"}</dd>
        <dt>AI Data signed telemetry</dt><dd>HOLD — independently authenticated original signer required</dd>
        <dt>Comms handoff acceptance</dt><dd>HOLD — protected receiver acknowledgement required</dd>
        <dt>Next master/slave stage</dt><dd>HOLD until all three Masters are verified</dd>
      </dl>
      <ul aria-label="Persistent original-host service observations">
        {review.monitoring.services.map(s => <li key={s.id}>
          <strong>{NAMES[s.id]}: {s.latestState.replaceAll("_", " ")}</strong>
          {" · "}{s.reachableSamples}/{s.sampleCount} reachable samples
          {s.observedAvailabilityPercent !== null ? ` (${s.observedAvailabilityPercent}% observed)` : ""}
        </li>)}
      </ul>
      {review.monitoring.incidentCandidates.length > 0 && <>
        <h4>Comms incident candidates — local only</h4>
        <ul aria-label="Unsent incident candidates">
          {review.monitoring.incidentCandidates.map(x => <li key={x.service}>
            {NAMES[x.service]}: three consecutive failed TCP checks — HOLD for independent operator review.
          </li>)}
        </ul>
      </>}
    </>}
    <p>Install and enable the existing AI Hub Python server on Ree's <code>DESKTOP-AE894KC</code>;
      keep its existing Windows Recovery task. No new scheduled task was created.
      The monitoring flag and Ree-only automation host guard must both be enabled in that launcher's environment.</p>
  </section>;
}
