import { useEffect, useRef, useState } from "react";
import { getMasterShellAcceptance310 } from "./api";
import { inspectMasterAcceptance310, type Acceptance310 } from "./masterShellAcceptance310";

export function MasterShellAcceptance310Panel() {
  const [read, setRead] = useState<Acceptance310 | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("No independently authenticated Build 310 field adoption yet.");
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  async function refresh() {
    pending.current?.abort();
    const active = new AbortController();
    pending.current = active;
    setBusy(true);
    try {
      const next = inspectMasterAcceptance310(await getMasterShellAcceptance310(active.signal));
      if (pending.current !== active) return;
      setRead(next);
      setMessage(next
        ? "Build 310 code contract matched. Original-host export and controller decision still HOLD."
        : "Untrusted or stale Build 310 status. HOLD.");
    } catch {
      if (pending.current !== active) return;
      setRead(null);
      setMessage("Protected Build 310 status unavailable. HOLD.");
    } finally {
      if (pending.current === active) setBusy(false);
    }
  }
  return <section className="master-306-status" aria-labelledby="master-310-title">
    <p className="eyebrow">Build 310 · Ree original Windows / protected one-TEST export audit</p>
    <h3 id="master-310-title">Field adoption, transport witness &amp; AI Data owner review</h3>
    <p>An installed Build 309 and independent TEMPLAR field review are required. A prepared export
      is not a sent export; transport proof is not a signed Comms ACK or Master synchronization.</p>
    <button type="button" disabled={busy} onClick={() => void refresh()}>
      {busy ? "Reviewing protected status…" : "Refresh Build 310 owner status"}
    </button>
    <p role="status">{message}</p>
    {read && <dl>
      <dt>Installed Build 309</dt><dd>{read.originalHostAdoption}</dd>
      <dt>One-TEST export audit</dt><dd>{read.oneTestExportAudit}</dd>
      <dt>AI Data owner decision</dt><dd>{read.controllerReview}</dd>
      <dt>Receiver / connection / Master sync</dt><dd>OFF / HOLD / HOLD</dd>
      <dt>Automation authority</dt><dd>{read.automationHost} · zero new Windows tasks</dd>
    </dl>}
    <p>Read-only. Cannot send, import evidence, authorize the receiver, or operate recovery tasks.</p>
  </section>;
}
