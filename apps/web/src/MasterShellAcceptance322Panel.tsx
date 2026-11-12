import { useEffect, useRef, useState } from "react";
import { getMasterShellAcceptance322 } from "./api";
import { inspectMasterAcceptance322, type Acceptance322 } from "./masterShellAcceptance322";

export function MasterShellAcceptance322Panel() {
  const [status, setStatus] = useState<Acceptance322 | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    "QL-431 original-host health, signed shutdown and incident custody remain unverified.",
  );
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);

  async function refresh() {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    try {
      const next = inspectMasterAcceptance322(
        await getMasterShellAcceptance322(controller.signal),
      );
      if (active.current !== controller) return;
      setStatus(next);
      setMessage(next
        ? "Build 322 source contract verified. Independent original-host runtime and incident evidence remain HOLD."
        : "Build 322 protected source status unavailable or mismatched. HOLD.");
    } catch {
      if (active.current !== controller) return;
      setStatus(null);
      setMessage("Protected Build 322 status unavailable. HOLD.");
    } finally {
      if (active.current === controller) setBusy(false);
    }
  }

  return <section className="master-306-status" aria-labelledby="master-322-title">
    <p className="eyebrow">Build 322 · QL-431 protected pilot health and incident custody</p>
    <h3 id="master-322-title">Signed health continuity and independent fail-closed receiver shutdown</h3>
    <p>This view reports source evidence gaps only, not an active Windows
      monitor, a completed shutdown, a CONNECTED app, or a measured uptime SLA.</p>
    <button type="button" disabled={busy} onClick={() => void refresh()}>
      {busy ? "Reading protected status…" : "Refresh Build 322 owner status"}
    </button>
    <p role="status">{message}</p>
    {status && <dl>
      <dt>Independent QL-430 accepted isolated pilot</dt><dd>{status.ql431Ql430AcceptedPilot}</dd>
      <dt>Three independently signed fresh health reports</dt><dd>{status.ql431IndependentMasterHealth}</dd>
      <dt>Monotonic Master high-water checkpoints</dt><dd>{status.ql431MonotonicSequences}</dd>
      <dt>Independent signed receiver ON</dt><dd>{status.ql431IndependentReceiverOn}</dd>
      <dt>Durable health checkpoints</dt><dd>{status.ql431DurableHealthCheckpoint}</dd>
      <dt>Fail-closed incident custody before shutdown</dt><dd>{status.ql431PendingFailClosedIncident}</dd>
      <dt>Original-host signed shutdown acknowledgement</dt><dd>{status.ql431SignedReceiverShutdown}</dd>
      <dt>Fresh independently signed receiver OFF</dt><dd>{status.ql431IndependentReceiverOff}</dd>
      <dt>Three separate Master incident signatures</dt><dd>{status.ql431ThreeMasterIncident}</dd>
      <dt>Distinct owner and reviewer incident acceptance</dt><dd>{status.ql431DualOwnerIncident}</dd>
      <dt>One-way durable incident closure</dt><dd>{status.ql431DurableReconciliation}</dd>
      <dt>Receiver / connection / owner / Master sync</dt><dd>OFF / HOLD / HOLD / HOLD</dd>
    </dl>}
    <p>One protected observation per original-host operator invocation. No auto
      restart, scheduled task or universal CONNECTED transition. Failure requires
      independent OFF proof and a new ceremony before any pilot re-entry.</p>
  </section>;
}
