import { useEffect, useRef, useState } from "react";
import { getMasterShellAcceptance314 } from "./api";
import { inspectMasterAcceptance314, type Acceptance314 } from "./masterShellAcceptance314";

export function MasterShellAcceptance314Panel() {
  const [status, setStatus] = useState<Acceptance314 | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Original-host field receipts are not independently verified.");
  const pending = useRef<AbortController | null>(null);

  useEffect(() => () => pending.current?.abort(), []);

  async function refresh() {
    pending.current?.abort();
    const active = new AbortController();
    pending.current = active;
    setBusy(true);
    try {
      const next = inspectMasterAcceptance314(
        await getMasterShellAcceptance314(active.signal),
      );
      if (pending.current !== active) return;
      setStatus(next);
      setMessage(next
        ? "Exact Build 314 source contract loaded. Live field custody and owner acceptance remain HOLD."
        : "Build 314 source status unavailable or invalid. HOLD.");
    } catch {
      if (pending.current !== active) return;
      setStatus(null);
      setMessage("Build 314 protected source status unavailable. HOLD.");
    } finally {
      if (pending.current === active) setBusy(false);
    }
  }

  return <section className="master-306-status" aria-labelledby="master-314-title">
    <p className="eyebrow">Build 314 · protected original-host field review</p>
    <h3 id="master-314-title">Original host, QL-423 replay &amp; Master owner decision</h3>
    <p>Source CI GREEN does not establish actual Ree-host receipt custody,
      independent Comms ledger recovery, or a supervised operational activation.</p>
    <button type="button" disabled={busy} onClick={() => void refresh()}>
      {busy ? "Checking protected status…" : "Refresh Build 314 owner status"}
    </button>
    <p role="status">{message}</p>
    {status && <dl>
      <dt>Signed original-host field receipt</dt><dd>{status.originalFieldReceipt}</dd>
      <dt>QL-423 durable replay restoration</dt><dd>{status.ql423ReplayRestoration}</dd>
      <dt>Independent Master owner decision</dt><dd>{status.ownerDecisionRecheck}</dd>
      <dt>Private field journal</dt><dd>{status.privateFieldJournal}</dd>
      <dt>Receiver / connection / owner / synchronization</dt><dd>OFF / HOLD / HOLD / HOLD</dd>
    </dl>}
    <p>This owner view cannot upload signed receipts, turn on the receiver,
      create a Windows task, accept an owner decision, or activate a Master.</p>
  </section>;
}
