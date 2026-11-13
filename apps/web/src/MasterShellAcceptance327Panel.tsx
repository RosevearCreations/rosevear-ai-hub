import { useEffect, useRef, useState } from "react";
import { getMasterShellAcceptance327 } from "./api";
import { inspectMasterAcceptance327, type Acceptance327 } from "./masterShellAcceptance327";

/** Read-only source acceptance; never issues a shutdown/enable control. */
export function MasterShellAcceptance327Panel() {
  const [status, setStatus] = useState<Acceptance327 | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    "QL-436 real original-host signed shutdown and independent receiver OFF remain unverified.",
  );
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function refresh() {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setBusy(true);
    try {
      const found = inspectMasterAcceptance327(
        await getMasterShellAcceptance327(current.signal),
      );
      if (controller.current !== current) return;
      setStatus(found);
      setMessage(found
        ? "Build 327 source release verified. Real host shutdown and independent OFF remain HOLD."
        : "Build 327 protected source mismatch or unavailable. HOLD.");
    } catch {
      if (controller.current !== current) return;
      setStatus(null);
      setMessage("Protected Build 327 owner evidence unavailable. HOLD.");
    } finally {
      if (controller.current === current) setBusy(false);
    }
  }

  return <section className="master-306-status" aria-labelledby="master-327-title">
    <p className="eyebrow">Build 327 · QL-436 protected signed shutdown continuity</p>
    <h3 id="master-327-title">Independent receiver OFF and lease-expiry exception review</h3>
    <p>Source-only evidence. Receiver remains UNKNOWN until separately signed live OFF
      verification on the original host. No automatic shutdown or activation is issued here.</p>
    <button type="button" disabled={busy} onClick={() => void refresh()}>
      {busy ? "Reading protected status…" : "Refresh Build 327 owner status"}
    </button>
    <p role="status">{message}</p>
    {status && <dl>
      <dt>Original QL-431–435 signed custody</dt><dd>{status.ql436PriorQl431To435Custody}</dd>
      <dt>Original-host protected shutdown authority</dt><dd>{status.ql436ProtectedShutdownAuthority}</dd>
      <dt>One-use PENDING before external read</dt><dd>{status.ql436OneUsePending}</dd>
      <dt>Original-host signed fail-closed shutdown</dt><dd>{status.ql436SignedOriginalHostOff}</dd>
      <dt>Separate receiver signed OFF</dt><dd>{status.ql436IndependentReceiverOff}</dd>
      <dt>Lease on-time versus exception review</dt><dd>{status.ql436LeaseDisposition}</dd>
      <dt>Three Master incident continuity</dt><dd>{status.ql436ThreeMasterContinuity}</dd>
      <dt>Dual-owner retain HOLD or escalate</dt><dd>{status.ql436DualOwnerReview}</dd>
      <dt>One-use RECONCILED receipt</dt><dd>{status.ql436ReconciledReceipt}</dd>
      <dt>Actual independent runtime OFF</dt><dd>{status.ql436IndependentRuntimeOff}</dd>
      <dt>Receiver / connection / activation</dt>
      <dd>UNKNOWN UNTIL INDEPENDENT SIGNED OFF / HOLD / NOT AUTHORIZED</dd>
    </dl>}
  </section>;
}
