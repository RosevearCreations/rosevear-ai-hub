import { useEffect, useRef, useState } from "react";
import { getMasterShellAcceptance326 } from "./api";
import { inspectMasterAcceptance326, type Acceptance326 } from "./masterShellAcceptance326";

/** No receiver command or private evidence intake exists in this view. */
export function MasterShellAcceptance326Panel() {
  const [status, setStatus] = useState<Acceptance326 | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    "QL-435 real original-host supervised pilot and independent ON witness remain unverified.",
  );
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function refresh() {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setBusy(true);
    try {
      const found = inspectMasterAcceptance326(
        await getMasterShellAcceptance326(current.signal),
      );
      if (controller.current !== current) return;
      setStatus(found);
      setMessage(found
        ? "Build 326 source contract verified. Real original-host isolated pilot remains HOLD."
        : "Build 326 protected source mismatch or unavailable. HOLD.");
    } catch {
      if (controller.current !== current) return;
      setStatus(null);
      setMessage("Protected Build 326 owner status unavailable. HOLD.");
    } finally {
      if (controller.current === current) setBusy(false);
    }
  }

  return <section className="master-306-status" aria-labelledby="master-326-title">
    <p className="eyebrow">Build 326 · QL-435 signed isolated pilot evidence</p>
    <h3 id="master-326-title">Original-host short-lease challenge and independent ON witness</h3>
    <p>Source-only HOLD projection. Real one-test ON requires supervised original Windows host,
      a hard 15-second fail-closed lease and independent OFF confirmation after the pilot.</p>
    <button type="button" disabled={busy} onClick={() => void refresh()}>
      {busy ? "Reading protected status…" : "Refresh Build 326 owner status"}
    </button>
    <p role="status">{message}</p>
    {status && <dl>
      <dt>Original QL-431 through QL-434 custody</dt><dd>{status.ql435Ql431To434ExactCustody}</dd>
      <dt>Signed original-host OFF enrollment</dt><dd>{status.ql435NewCeremonyEnrollment}</dd>
      <dt>Hard 15-second supervised lease</dt><dd>{status.ql435BoundedLease}</dd>
      <dt>Independent pre-challenge OFF</dt><dd>{status.ql435IndependentPreOnOff}</dd>
      <dt>Dual owner single-pilot prepermit</dt><dd>{status.ql435DualOwnerPrePermit}</dd>
      <dt>One-use PENDING before ON</dt><dd>{status.ql435OneUsePending}</dd>
      <dt>Original-host signed one-test ON</dt><dd>{status.ql435OriginalHostOnChallenge}</dd>
      <dt>Independent signed one-test ON</dt><dd>{status.ql435IndependentOnWitness}</dd>
      <dt>Three Master review reports</dt><dd>{status.ql435ThreeMasterPilotReview}</dd>
      <dt>Dual owner pilot evidence decision</dt><dd>{status.ql435DualOwnerPilotDecision}</dd>
      <dt>One-use ACCEPTED pilot receipt</dt><dd>{status.ql435OneUseAccepted}</dd>
      <dt>Mandatory independent post-pilot OFF</dt><dd>{status.ql435MandatoryPostPilotOff}</dd>
      <dt>General activation / connection</dt><dd>NOT AUTHORIZED / HOLD</dd>
    </dl>}
    <p>No automatic receiver ON or OFF control. Signed ON evidence is never
      equivalent to live, generally CONNECTED production operation.</p>
  </section>;
}
