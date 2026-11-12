import { useEffect, useRef, useState } from "react";
import { getMasterShellAcceptance324 } from "./api";
import { inspectMasterAcceptance324, type Acceptance324 } from "./masterShellAcceptance324";

/** Read-only source gate. Original-host evidence cannot be uploaded here. */
export function MasterShellAcceptance324Panel() {
  const [status, setStatus] = useState<Acceptance324 | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    "QL-433 protected new-ceremony authorization and original-host OFF evidence remain unverified.",
  );
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function refresh() {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setBusy(true);
    try {
      const found = inspectMasterAcceptance324(
        await getMasterShellAcceptance324(current.signal),
      );
      if (controller.current !== current) return;
      setStatus(found);
      setMessage(found
        ? "Build 324 source contract verified. Independent recovery and owner precheck remain HOLD."
        : "Build 324 protected source mismatch or unavailable. HOLD.");
    } catch {
      if (controller.current !== current) return;
      setStatus(null);
      setMessage("Protected Build 324 owner status unavailable. HOLD.");
    } finally {
      if (controller.current === current) setBusy(false);
    }
  }

  return <section className="master-306-status" aria-labelledby="master-324-title">
    <p className="eyebrow">Build 324 · QL-433 anchored recovery decision / new ceremony</p>
    <h3 id="master-324-title">Independent external decision and supervised new-ceremony precheck</h3>
    <p>Read-only source evidence, not a live external anchor, original Windows receiver,
      owner authorization, automatic restart, continuous monitoring or CONNECTED proof.</p>
    <button type="button" disabled={busy} onClick={() => void refresh()}>
      {busy ? "Reading protected status…" : "Refresh Build 324 owner status"}
    </button>
    <p role="status">{message}</p>
    {status && <dl>
      <dt>Protected exact signed QL-432 owner review</dt><dd>{status.ql433QL432ProtectedOwnerReceipt}</dd>
      <dt>Original QL-431 terminal reconciled OFF checkpoint</dt><dd>{status.ql433ReconciledOffCheckpoint}</dd>
      <dt>Fresh next ceremony / episode scope</dt><dd>{status.ql433NewCeremonyScope}</dd>
      <dt>Immutable independently anchored decision export</dt><dd>{status.ql433ExternalDecisionAnchor}</dd>
      <dt>Distinct signed independent off-host reader</dt><dd>{status.ql433IndependentAnchorReader}</dd>
      <dt>Fresh original Windows host signed OFF</dt><dd>{status.ql433OriginalHostOff}</dd>
      <dt>Fresh separately signed receiver OFF</dt><dd>{status.ql433IndependentReceiverOff}</dd>
      <dt>Three separate Master new-ceremony prechecks</dt><dd>{status.ql433ThreeMasterPrecheck}</dd>
      <dt>Distinct owner/reviewer precheck-only decision</dt><dd>{status.ql433DualOwnerPrecheck}</dd>
      <dt>Durable one-use protected original-host receipt</dt><dd>{status.ql433DurableOneUsePrecheck}</dd>
      <dt>Receiver / connection / owner / Master sync</dt><dd>OFF / HOLD / HOLD / HOLD</dd>
    </dl>}
    <p>A QL-433 precheck can only prepare a separate owner-supervised QL-429/430
      ceremony. It never restarts a terminated QL-431 incident.</p>
  </section>;
}
