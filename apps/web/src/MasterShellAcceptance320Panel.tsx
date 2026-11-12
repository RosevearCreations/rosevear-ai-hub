import { useEffect, useRef, useState } from "react";
import { getMasterShellAcceptance320 } from "./api";
import { inspectMasterAcceptance320, type Acceptance320 } from "./masterShellAcceptance320";

export function MasterShellAcceptance320Panel() {
  const [status, setStatus] = useState<Acceptance320 | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    "QL-429 public key enrollment and original-host pilot witness have not been independently verified.",
  );
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);

  async function refresh() {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    try {
      const next = inspectMasterAcceptance320(
        await getMasterShellAcceptance320(controller.signal),
      );
      if (active.current !== controller) return;
      setStatus(next);
      setMessage(next
        ? "Build 320 source contract verified. Real signer, receiver and owner evidence remain HOLD."
        : "Build 320 protected source status unavailable or mismatched. HOLD.");
    } catch {
      if (active.current !== controller) return;
      setStatus(null);
      setMessage("Protected Build 320 status unavailable. HOLD.");
    } finally {
      if (active.current === controller) setBusy(false);
    }
  }

  return <section className="master-306-status" aria-labelledby="master-320-title">
    <p className="eyebrow">Build 320 · QL-429 protected signer enrollment and witness</p>
    <h3 id="master-320-title">Original-host fresh challenge and independent pilot witness</h3>
    <p>This is authenticated source status, not proof of enrolled physical keys,
      a working remote anchor, an original Windows receiver or an approved live pilot.</p>
    <button type="button" disabled={busy} onClick={() => void refresh()}>
      {busy ? "Reading protected status…" : "Refresh Build 320 owner status"}
    </button>
    <p role="status">{message}</p>
    {status && <dl>
      <dt>Independently administered remote store</dt><dd>{status.ql429ExternalStoreIdentity}</dd>
      <dt>Distinct public signer enrollment</dt><dd>{status.ql429SeparateSignerEnrollment}</dd>
      <dt>Original-device possession proofs</dt><dd>{status.ql429IndependentPossessionProofs}</dd>
      <dt>Original-host 192-bit one-use challenge</dt><dd>{status.ql429FreshChallenge}</dd>
      <dt>Fresh original receiver-OFF response</dt><dd>{status.ql429OriginalHostOff}</dd>
      <dt>Three independent Master pilot witnesses</dt><dd>{status.ql429ThreeMasterWitness}</dd>
      <dt>Dual-signed supervised owner precheck</dt><dd>{status.ql429OwnerWitness}</dd>
      <dt>Externally witnessed durable receipt</dt><dd>{status.ql429DurableWitness}</dd>
      <dt>Receiver / connection / owner / sync</dt><dd>OFF / HOLD / HOLD / HOLD</dd>
    </dl>}
    <p>Precheck only. No receiver activation, scheduled task, key import or CONNECTED
      transition. A new original-host QL-424 ceremony and independent runtime
      acceptance are required before any isolated pilot.</p>
  </section>;
}
