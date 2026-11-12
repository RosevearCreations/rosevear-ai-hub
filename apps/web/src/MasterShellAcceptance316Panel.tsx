import { useEffect, useRef, useState } from "react";
import { getMasterShellAcceptance316 } from "./api";
import { inspectMasterAcceptance316, type Acceptance316 } from "./masterShellAcceptance316";

export function MasterShellAcceptance316Panel() {
  const [status, setStatus] = useState<Acceptance316 | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("No live original-host pilot or three-Master health evidence has been verified.");
  const pending = useRef<AbortController | null>(null);

  useEffect(() => () => pending.current?.abort(), []);

  async function refresh() {
    pending.current?.abort();
    const request = new AbortController();
    pending.current = request;
    setBusy(true);
    try {
      const next = inspectMasterAcceptance316(
        await getMasterShellAcceptance316(request.signal),
      );
      if (pending.current !== request) return;
      setStatus(next);
      setMessage(next
        ? "Build 316 source contract matched. Real pilot health, rollback and owner recovery remain HOLD."
        : "Build 316 source status unavailable or mismatched. HOLD.");
    } catch {
      if (pending.current !== request) return;
      setStatus(null);
      setMessage("Build 316 protected owner status unavailable. HOLD.");
    } finally {
      if (pending.current === request) setBusy(false);
    }
  }

  return <section className="master-306-status" aria-labelledby="master-316-title">
    <p className="eyebrow">Build 316 · QL-425 signed pilot health and recovery</p>
    <h3 id="master-316-title">Isolated pilot attestation, health and safe rollback</h3>
    <p>Three signed, fresh heartbeats prove only one health snapshot, not
      continuous uptime or full connectivity. Receiver shutdown requires
      separately verified protected Comms evidence.</p>
    <button type="button" disabled={busy} onClick={() => void refresh()}>
      {busy ? "Checking protected source status…" : "Refresh Build 316 owner status"}
    </button>
    <p role="status">{message}</p>
    {status && <dl>
      <dt>Original Ree-host isolated pilot</dt><dd>{status.originalHostIsolatedPilot}</dd>
      <dt>QL-425 three-Master signed heartbeat</dt><dd>{status.ql425ThreeMasterHealth}</dd>
      <dt>Durable sequence replay custody</dt><dd>{status.ql425DurableReplay}</dd>
      <dt>Independent receiver OFF proof</dt><dd>{status.ql425ReceiverRollback}</dd>
      <dt>Owner incident recovery decision</dt><dd>{status.ownerRecoveryDecision}</dd>
      <dt>Measured pilot uptime</dt><dd>{status.pilotUptime}</dd>
      <dt>Receiver / connection / owner / sync</dt><dd>OFF / HOLD / HOLD / HOLD</dd>
    </dl>}
    <p>Read-only owner status. No browser evidence import, actual receiver
      activation, task scheduling, automated rollback or auto-recovery.</p>
  </section>;
}
