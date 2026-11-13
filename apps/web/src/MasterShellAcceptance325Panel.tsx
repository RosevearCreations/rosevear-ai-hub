import { useEffect, useRef, useState } from "react";
import { getMasterShellAcceptance325 } from "./api";
import { inspectMasterAcceptance325, type Acceptance325 } from "./masterShellAcceptance325";

/** Authenticated source projection only; no original-host signer enrollment. */
export function MasterShellAcceptance325Panel() {
  const [status, setStatus] = useState<Acceptance325 | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    "QL-434 protected signed authority handoff and original-host readiness remain unverified.",
  );
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function refresh() {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setBusy(true);
    try {
      const found = inspectMasterAcceptance325(
        await getMasterShellAcceptance325(current.signal),
      );
      if (controller.current !== current) return;
      setStatus(found);
      setMessage(found
        ? "Build 325 source contract verified. Independent original-host readiness remains HOLD."
        : "Build 325 protected source mismatch or unavailable. HOLD.");
    } catch {
      if (controller.current !== current) return;
      setStatus(null);
      setMessage("Protected Build 325 owner evidence unavailable. HOLD.");
    } finally {
      if (controller.current === current) setBusy(false);
    }
  }

  return <section className="master-306-status" aria-labelledby="master-325-title">
    <p className="eyebrow">Build 325 · QL-434 protected independent authority handoff</p>
    <h3 id="master-325-title">New-ceremony original-host readiness (OFF / HOLD)</h3>
    <p>Signed source readiness is not live Windows verification or permission to activate
      the receiver. Separate owner-supervised enrollment and runtime proof remain necessary.</p>
    <button type="button" disabled={busy} onClick={() => void refresh()}>
      {busy ? "Reading protected status…" : "Refresh Build 325 owner status"}
    </button>
    <p role="status">{message}</p>
    {status && <dl>
      <dt>QL-433 signed precheck custody</dt><dd>{status.ql434QL433OneUsePrecheck}</dd>
      <dt>QL-431 / QL-432 original incident reconciliation</dt><dd>{status.ql434QL431432Chain}</dd>
      <dt>Independent authority issuer</dt><dd>{status.ql434IndependentIssuer}</dd>
      <dt>Distinct independent witness</dt><dd>{status.ql434DistinctWitness}</dd>
      <dt>Original Windows host signed readiness OFF</dt><dd>{status.ql434OriginalHostReadyOff}</dd>
      <dt>Separate receiver signed OFF</dt><dd>{status.ql434IndependentReceiverOff}</dd>
      <dt>Three Master signed readiness reports</dt><dd>{status.ql434ThreeMasterReadiness}</dd>
      <dt>Dual owner new-ceremony-only consent</dt><dd>{status.ql434DualOwnerConsent}</dd>
      <dt>Durable one-use readiness receipt</dt><dd>{status.ql434OneUseReceipt}</dd>
      <dt>New supervised QL-429/430 enrollment</dt><dd>{status.ql434NewCeremonyEnrollment}</dd>
      <dt>Activation authorized / receiver / connection</dt><dd>FALSE / OFF / HOLD</dd>
    </dl>}
  </section>;
}
