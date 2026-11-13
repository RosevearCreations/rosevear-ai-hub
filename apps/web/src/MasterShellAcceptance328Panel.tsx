import { useEffect, useRef, useState } from "react";
import { getMasterShellAcceptance328 } from "./api";
import { inspectMasterAcceptance328, type Acceptance328 } from "./masterShellAcceptance328";

/** Authenticated source-only release status: never an anchor, sign or receiver action. */
export function MasterShellAcceptance328Panel() {
  const [status, setStatus] = useState<Acceptance328 | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    "QL-437 external signed custody and independent original-host OFF remain unverified.",
  );
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function refresh() {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setBusy(true);
    try {
      const found = inspectMasterAcceptance328(
        await getMasterShellAcceptance328(current.signal),
      );
      if (controller.current !== current) return;
      setStatus(found);
      setMessage(found
        ? "Build 328 source verified. Real external anchor, OFF and closure remain HOLD."
        : "Build 328 signed source acceptance mismatch or unavailable. HOLD.");
    } catch {
      if (controller.current !== current) return;
      setStatus(null);
      setMessage("Build 328 owner status unavailable. HOLD.");
    } finally {
      if (controller.current === current) setBusy(false);
    }
  }

  return <section className="master-306-status" aria-labelledby="master-328-title">
    <p className="eyebrow">Build 328 · QL-437 independently anchored OFF closure review</p>
    <h3 id="master-328-title">Off-host anchor, independent OFF and expired-lease custody</h3>
    <p>Source-only HOLD. Missing signed runtime OFF remains UNKNOWN. On-time incident
      closure requires independent anchor, three-Master and dual-owner evidence.
      Expired-lease exceptions remain OPEN until separately remediated.</p>
    <button type="button" disabled={busy} onClick={() => void refresh()}>
      {busy ? "Reading protected status…" : "Refresh Build 328 owner status"}
    </button>
    <p role="status">{message}</p>
    {status && <dl>
      <dt>QL-431–436 protected receipt chain</dt><dd>{status.ql437OriginalQl431To436Custody}</dd>
      <dt>Original-host protected export</dt><dd>{status.ql437ProtectedExportProposal}</dd>
      <dt>One-use PENDING prior to external reads</dt><dd>{status.ql437OneUsePending}</dd>
      <dt>Immutable external signed anchor</dt><dd>{status.ql437ExternalAnchor}</dd>
      <dt>Separate signed independent reader</dt><dd>{status.ql437IndependentAnchorReader}</dd>
      <dt>Original-host fresh signed OFF</dt><dd>{status.ql437OriginalHostFreshOff}</dd>
      <dt>Independent fresh receiver OFF</dt><dd>{status.ql437IndependentReceiverFreshOff}</dd>
      <dt>Three signed Master reports</dt><dd>{status.ql437ThreeMasterContinuity}</dd>
      <dt>Expired-lease exception custody</dt><dd>{status.ql437ExpiredLeaseException}</dd>
      <dt>Dual owner closure/open exception</dt><dd>{status.ql437DualOwnerDecision}</dd>
      <dt>One-use FINAL receipt</dt><dd>{status.ql437OneUseFinal}</dd>
      <dt>Live receiver OFF</dt><dd>{status.ql437LiveOff}</dd>
      <dt>Connection and activation</dt><dd>HOLD / NOT AUTHORIZED</dd>
    </dl>}
  </section>;
}
