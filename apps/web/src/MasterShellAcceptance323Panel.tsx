import { useEffect, useRef, useState } from "react";
import { getMasterShellAcceptance323 } from "./api";
import { inspectMasterAcceptance323, type Acceptance323 } from "./masterShellAcceptance323";

/** Read-only source contract; no live anchor, receiver or owner intake. */
export function MasterShellAcceptance323Panel() {
  const [status, setStatus] = useState<Acceptance323 | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    "QL-432 original-host anchor and owner review have not been independently verified.",
  );
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);

  async function refresh() {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    try {
      const next = inspectMasterAcceptance323(
        await getMasterShellAcceptance323(controller.signal),
      );
      if (active.current !== controller) return;
      setStatus(next);
      setMessage(next
        ? "Build 323 source verified; external anchor, original-host OFF and owner review remain HOLD."
        : "Build 323 protected source unavailable or mismatched. HOLD.");
    } catch {
      if (active.current !== controller) return;
      setStatus(null);
      setMessage("Protected Build 323 source status unavailable. HOLD.");
    } finally {
      if (active.current === controller) setBusy(false);
    }
  }

  return <section className="master-306-status" aria-labelledby="master-323-title">
    <p className="eyebrow">Build 323 · QL-432 external incident anchor and recovery review</p>
    <h3 id="master-323-title">Original-host recovery: independent anchor and new-ceremony-only decision</h3>
    <p>Source-only security checklist. A successful code deployment does not
      verify a real off-host immutable pin, receiver, signed owner decision,
      continuously monitored pilot or universal connection.</p>
    <button type="button" disabled={busy} onClick={() => void refresh()}>
      {busy ? "Reading protected status…" : "Refresh Build 323 owner status"}
    </button>
    <p role="status">{message}</p>
    {status && <dl>
      <dt>Durable terminal QL-431 signed OFF incident</dt><dd>{status.ql432ReconciledOffIncident}</dd>
      <dt>Independently anchored immutable external checkpoint</dt><dd>{status.ql432ExternalAnchor}</dd>
      <dt>Distinct signed off-host anchor readback</dt><dd>{status.ql432IndependentAnchorReadback}</dd>
      <dt>Fresh signed original Windows host OFF</dt><dd>{status.ql432OriginalHostRecoveryOff}</dd>
      <dt>Fresh separate signed receiver OFF</dt><dd>{status.ql432IndependentReceiverOff}</dd>
      <dt>Three independent Master recovery dispositions</dt><dd>{status.ql432ThreeMasterDisposition}</dd>
      <dt>Owner and reviewer new-ceremony-only consent</dt><dd>{status.ql432OwnerNewCeremonyReview}</dd>
      <dt>Original-host durable one-use review receipt</dt><dd>{status.ql432DurableOneUseReview}</dd>
      <dt>Receiver / connection / owner / Master sync</dt><dd>OFF / HOLD / HOLD / HOLD</dd>
    </dl>}
    <p>QL-432 never restarts the old isolated pilot. Any future activation
      requires a brand-new, independently approved QL-429/430 ceremony.</p>
  </section>;
}
