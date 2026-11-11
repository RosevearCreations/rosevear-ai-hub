import { useEffect, useRef, useState } from "react";
import { getMasterShellAcceptance309 } from "./api";
import { inspectMasterAcceptance309, type Acceptance309 } from "./masterShellAcceptance309";

export function MasterShellAcceptance309Panel() {
  const [read, setRead] = useState<Acceptance309 | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("No independently authenticated Build 309 runtime receipt has been reviewed.");
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);

  async function refresh() {
    pending.current?.abort();
    const active = new AbortController(); pending.current = active; setBusy(true);
    try {
      const snapshot = inspectMasterAcceptance309(await getMasterShellAcceptance309(active.signal));
      if (pending.current !== active) return;
      setRead(snapshot);
      setMessage(snapshot
        ? "Build 309 code contract verified. Original-host admission and AI Data owner decision remain HOLD."
        : "Untrusted or stale Build 309 status response. HOLD.");
    } catch {
      if (pending.current !== active) return;
      setRead(null); setMessage("Protected Build 309 owner status unavailable. HOLD.");
    } finally { if (pending.current === active) setBusy(false); }
  }

  return <section className="master-306-status" aria-labelledby="master-309-title">
    <p className="eyebrow">Build 309 · Ree original Windows / protected Master360 one-TEST</p>
    <h3 id="master-309-title">Signed operational receipt, Comms QL-416 review &amp; AI Data owner gate</h3>
    <p>Original-host Build 308 evidence must be independently witnessed. The protected admission
      requires one matching signed source episode, independently signed QL-414 receiver ACK,
      Comms QL-416 durable replay witness, and a separate AI Data owner decision.</p>
    <button type="button" onClick={() => void refresh()} disabled={busy}>
      {busy ? "Checking protected receipt status…" : "Refresh Build 309 owner status"}
    </button>
    <p role="status">{message}</p>
    {read && <dl>
      <dt>Installed Build 308</dt><dd>{read.installedRelease308Expected} · field witness HOLD</dd>
      <dt>Original-host operational receipt</dt><dd>{read.operationalAdmission}</dd>
      <dt>Comms QL-416 protected ledger</dt><dd>{read.ql416OperationalReview}</dd>
      <dt>Verified sampled uptime</dt><dd>{read.sampledUptime}</dd>
      <dt>AI Data owner gate</dt><dd>{read.controllerOwnerDecision}</dd>
      <dt>Automation host</dt><dd>{read.automationHost} · zero new Windows tasks</dd>
      <dt>Receiver / connection / Master sync</dt><dd>OFF / HOLD / HOLD</dd>
    </dl>}
    <p>Read-only display: this screen cannot import evidence, run the one-TEST, authorize a
      signer, operate Windows recovery, or declare a Master connection.</p>
  </section>;
}
