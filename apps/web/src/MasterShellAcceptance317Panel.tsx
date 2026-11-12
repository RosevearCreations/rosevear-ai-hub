import { useEffect, useRef, useState } from "react";
import { getMasterShellAcceptance317 } from "./api";
import { inspectMasterAcceptance317, type Acceptance317 } from "./masterShellAcceptance317";

export function MasterShellAcceptance317Panel() {
  const [status, setStatus] = useState<Acceptance317 | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("QL-426 durable original-host and independent owner evidence is not verified.");
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);

  async function refresh() {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    try {
      const next = inspectMasterAcceptance317(
        await getMasterShellAcceptance317(controller.signal),
      );
      if (active.current !== controller) return;
      setStatus(next);
      setMessage(next
        ? "Build 317 source checks match. Original-host custody and operational owner audit remain HOLD."
        : "Build 317 protected status missing or mismatched. HOLD.");
    } catch {
      if (active.current !== controller) return;
      setStatus(null);
      setMessage("Protected Build 317 owner status unavailable. HOLD.");
    } finally {
      if (active.current === controller) setBusy(false);
    }
  }

  return <section className="master-306-status" aria-labelledby="master-317-title">
    <p className="eyebrow">Build 317 · QL-426 checkpoint and incident audit</p>
    <h3 id="master-317-title">Original-host durable checkpoint custody and recovery</h3>
    <p>Source code does not attest an installed Windows host, signed receiver OFF,
      a durable remote witness or independent owner incident closeout.</p>
    <button type="button" disabled={busy} onClick={() => void refresh()}>
      {busy ? "Reading protected source status…" : "Refresh Build 317 owner status"}
    </button>
    <p role="status">{message}</p>
    {status && <dl>
      <dt>Original-host checkpoint</dt><dd>{status.ql426CheckpointCustody}</dd>
      <dt>Independent remote head witness</dt><dd>{status.ql426RemoteHeadWitness}</dd>
      <dt>Signed receiver OFF</dt><dd>{status.ql426SignedReceiverOff}</dd>
      <dt>Durable rollback incident</dt><dd>{status.ql426DurableIncident}</dd>
      <dt>Owner and three-Master incident audit</dt><dd>{status.independentOwnerIncidentAudit}</dd>
      <dt>Receiver / connection / owner / sync</dt><dd>OFF / HOLD / HOLD / HOLD</dd>
    </dl>}
    <p>Read-only. No private-key intake, receiver control, scheduled tasks,
      automatic Windows recovery or CONNECTED transition.</p>
  </section>;
}
