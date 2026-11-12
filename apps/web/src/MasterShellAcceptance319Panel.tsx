import { useEffect, useRef, useState } from "react";
import { getMasterShellAcceptance319 } from "./api";
import { inspectMasterAcceptance319, type Acceptance319 } from "./masterShellAcceptance319";

export function MasterShellAcceptance319Panel() {
  const [status, setStatus] = useState<Acceptance319 | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("QL-428 external anchor, drift and supervised re-entry are not verified.");
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);

  async function refresh() {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    try {
      const next = inspectMasterAcceptance319(
        await getMasterShellAcceptance319(controller.signal),
      );
      if (active.current !== controller) return;
      setStatus(next);
      setMessage(next
        ? "Build 319 source contract verified; protected off-host and re-entry evidence remain HOLD."
        : "Build 319 protected owner status unavailable or mismatched. HOLD.");
    } catch {
      if (active.current !== controller) return;
      setStatus(null);
      setMessage("Protected Build 319 status unavailable. HOLD.");
    } finally {
      if (active.current === controller) setBusy(false);
    }
  }

  return <section className="master-306-status" aria-labelledby="master-319-title">
    <p className="eyebrow">Build 319 · QL-428 external anchor and pilot re-entry gate</p>
    <h3 id="master-319-title">External closure anchor, independent drift and owner precheck</h3>
    <p>Source code is not proof of an installed Windows host, an independent remote
      archive, a signed receiver OFF observation or physical re-entry authorization.</p>
    <button type="button" disabled={busy} onClick={() => void refresh()}>
      {busy ? "Reading protected status…" : "Refresh Build 319 owner status"}
    </button>
    <p role="status">{message}</p>
    {status && <dl>
      <dt>QL-428 anchor proposal</dt><dd>{status.ql428ExternalAnchorExport}</dd>
      <dt>Independent off-host anchor</dt><dd>{status.ql428OffHostAnchor}</dd>
      <dt>Fresh signed nonce readback</dt><dd>{status.ql428IndependentReadback}</dd>
      <dt>Local custody drift recheck</dt><dd>{status.ql428CustodyDrift}</dd>
      <dt>Fresh signed receiver OFF</dt><dd>{status.ql428ReentryReceiverOff}</dd>
      <dt>Three independent Master prechecks</dt><dd>{status.ql428ThreeMasterPrecheck}</dd>
      <dt>Dual-signed owner decision</dt><dd>{status.ql428OwnerPrecheck}</dd>
      <dt>One-use supervised precheck receipt</dt><dd>{status.ql428DurablePrecheck}</dd>
      <dt>Receiver / connection / owner / sync</dt><dd>OFF / HOLD / HOLD / HOLD</dd>
    </dl>}
    <p>Read-only; no receiver reactivation, new Windows Scheduled Tasks,
      signing-key intake or CONNECTED transition. A new supervised QL-424 ceremony
      is required for any later isolated pilot.</p>
  </section>;
}
