import { useEffect, useRef, useState } from "react";
import { getMasterShellAcceptance307 } from "./api";
import { inspectMasterAcceptance307, type Acceptance307 } from "./masterShellAcceptance307";

export function MasterShellAcceptance307Panel() {
  const [read, setRead] = useState<Acceptance307 | null>(null);
  const [status, setStatus] = useState("Protected original-host acceptance has not been inspected.");
  const [busy, setBusy] = useState(false);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);

  async function refresh() {
    pending.current?.abort();
    const active = new AbortController(); pending.current = active; setBusy(true);
    try {
      const result = inspectMasterAcceptance307(await getMasterShellAcceptance307(active.signal));
      if (pending.current !== active) return;
      setRead(result);
      setStatus(result ? "Build 307 source-only review loaded. The three-master acceptance remains HOLD."
        : "Invalid Build 307 master receipt projection. HOLD.");
    } catch {
      if (pending.current !== active) return;
      setRead(null); setStatus("Original host protected evidence endpoint unavailable. HOLD.");
    } finally { if (pending.current === active) setBusy(false); }
  }
  return <section aria-labelledby="master-307-title" className="master-306-status">
    <p className="eyebrow">Build 307 · Original Ree host / three-master acceptance</p>
    <h3 id="master-307-title">Installed Build 306 proof, one-receipt custody &amp; AI Data handoff</h3>
    <p>The local uptime panel above is a measurement, not remote master uptime. This protected
      source-only review tracks the independent Ree/TEMPLAR field review, signed Source/Comms
      receipt chain and separately accepted AI Data evidence. No Windows automation is added.</p>
    <button type="button" onClick={() => void refresh()} disabled={busy}>
      {busy ? "Reviewing original-host evidence…" : "Refresh Build 307 acceptance"}
    </button>
    <p role="status">{status}</p>
    {read && <dl>
      <dt>Expected installed Build 306 source</dt><dd><code>{read.expectedInstalledRevision306}</code></dd>
      <dt>Ree launcher/process independent field review</dt><dd>HOLD — signed TEMPLAR field proof missing</dd>
      <dt>Build 306 source / Comms receipt chain</dt><dd>HOLD — independent receiver ACK missing</dd>
      <dt>AI Data QL-413 source receipt exchange</dt><dd>HOLD — no independently accepted live controller receipt</dd>
      <dt>Receiver, connection and slave integrations</dt><dd>OFF / HOLD / HOLD</dd>
      <dt>Existing Ree scheduled tasks and recovery</dt><dd>Unchanged · 0 new tasks</dd>
    </dl>}
    <p>Source signing and Comms correlation require a separately approved, protected original-host
      session. This screen cannot upload evidence, read private keys, activate a receiver,
      authorize incidents, trigger Recovery or connect Yard Workers/iCamp.</p>
  </section>;
}
