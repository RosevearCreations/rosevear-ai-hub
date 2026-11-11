import { useEffect, useRef, useState } from "react";
import { getMasterShellAcceptance308 } from "./api";
import { inspectMasterAcceptance308, type Acceptance308 } from "./masterShellAcceptance308";

export function MasterShellAcceptance308Panel() {
  const [read, setRead] = useState<Acceptance308 | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Build 308 original-host evidence has not been refreshed.");
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  async function refresh() {
    pending.current?.abort();
    const active = new AbortController(); pending.current = active; setBusy(true);
    try {
      const response = inspectMasterAcceptance308(await getMasterShellAcceptance308(active.signal));
      if (pending.current !== active) return;
      setRead(response);
      setMessage(response ? "Actual QL-414 contract recognized; live three-master acceptance remains HOLD."
        : "Invalid or untrusted Build 308 source projection. HOLD.");
    } catch {
      if (pending.current !== active) return;
      setRead(null); setMessage("Build 308 protected owner-only endpoint unavailable. HOLD.");
    } finally { if (pending.current === active) setBusy(false); }
  }
  return <section className="master-306-status" aria-labelledby="master-308-title">
    <p className="eyebrow">Build 308 · Original Windows server / Master360</p>
    <h3 id="master-308-title">Installed Build 307 review, authentic QL-414 ACK &amp; three-master evidence</h3>
    <p>Published QL-414 uses a different signed ACK contract from Build 307's proposal.
      The protected Build 308 verifier now matches the real contract, including source digest,
      episode, correlation, independent signer and durable anti-replay gates.</p>
    <button type="button" onClick={() => void refresh()} disabled={busy}>
      {busy ? "Inspecting original-host state…" : "Refresh Build 308 acceptance"}
    </button>
    <p role="status">{message}</p>
    {read && <dl>
      <dt>Installed Build 307 process evidence</dt><dd>{read.installedBuild307Review}</dd>
      <dt>Protected one-TEST</dt><dd>{read.protectedOneTest}</dd>
      <dt>Receiver ACK</dt><dd>{read.signedReceiverAck}</dd>
      <dt>Comms QL-415 review</dt><dd>{read.ql415RuntimeReview}</dd>
      <dt>AI Data Build 367 master evidence</dt><dd>{read.aiDataMasterEvidence}</dd>
      <dt>Original Ree host</dt><dd>{read.automationHost} · No new Windows tasks</dd>
      <dt>Connection / Receiver / Slave gate</dt><dd>HOLD / OFF / HOLD</dd>
    </dl>}
    <p>Only a separately approved, protected original-host operation can generate or import
      signed evidence. This screen cannot upload receipts, sign, transmit, activate a receiver,
      execute recovery, or declare the Masters synced.</p>
  </section>;
}
