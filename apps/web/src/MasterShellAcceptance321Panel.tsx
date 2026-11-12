import { useEffect, useRef, useState } from "react";
import { getMasterShellAcceptance321 } from "./api";
import { inspectMasterAcceptance321, type Acceptance321 } from "./masterShellAcceptance321";

export function MasterShellAcceptance321Panel() {
  const [status, setStatus] = useState<Acceptance321 | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    "QL-430 original-host pilot and independent receiver/three-Master runtime proof are unverified.",
  );
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);

  async function refresh() {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    try {
      const next = inspectMasterAcceptance321(
        await getMasterShellAcceptance321(controller.signal),
      );
      if (active.current !== controller) return;
      setStatus(next);
      setMessage(next
        ? "Build 321 source contract verified; live original-host pilot acceptance remains HOLD."
        : "Build 321 protected owner status unavailable or mismatched. HOLD.");
    } catch {
      if (active.current !== controller) return;
      setStatus(null);
      setMessage("Protected Build 321 status unavailable. HOLD.");
    } finally {
      if (active.current === controller) setBusy(false);
    }
  }

  return <section className="master-306-status" aria-labelledby="master-321-title">
    <p className="eyebrow">Build 321 · QL-430 independent isolated pilot runtime</p>
    <h3 id="master-321-title">Protected original-host QL-424 re-entry and three-Master acceptance</h3>
    <p>This is code/source status only, not original-host hardware runtime
      certification or a live receiver activation signal.</p>
    <button type="button" disabled={busy} onClick={() => void refresh()}>
      {busy ? "Reading protected status…" : "Refresh Build 321 owner status"}
    </button>
    <p role="status">{message}</p>
    {status && <dl>
      <dt>Physical original-host supervised session</dt><dd>{status.ql430ProtectedOperator}</dd>
      <dt>Prior independently witnessed QL-429 custody</dt><dd>{status.ql430PriorQl429Witness}</dd>
      <dt>New dual-signed QL-424 one-test ceremony</dt><dd>{status.ql430NewQl424Ceremony}</dd>
      <dt>Signed QL-423 replay restoration</dt><dd>{status.ql430SignedQl423Replay}</dd>
      <dt>Actual protected receiver execution</dt><dd>{status.ql430ReceiverExecution}</dd>
      <dt>Separately signed live receiver attestation</dt><dd>{status.ql430IndependentReceiver}</dd>
      <dt>QL-424 three-Master operational reports</dt><dd>{status.ql430Ql424ThreeMaster}</dd>
      <dt>Independent QL-430 three-Master reports</dt><dd>{status.ql430ThreeMasterRuntime}</dd>
      <dt>Dual-signed final owner runtime acceptance</dt><dd>{status.ql430DualOwnerRuntime}</dd>
      <dt>Original-host one-use pilot custody</dt><dd>{status.ql430DurablePilot}</dd>
      <dt>Fresh fail-closed shutdown proof</dt><dd>{status.ql430FailClosedShutdown}</dd>
      <dt>Receiver / connection / owner / Master sync</dt><dd>OFF / HOLD / HOLD / HOLD</dd>
    </dl>}
    <p>A real independent, owner-supervised isolated ONE-TEST is required before any
      narrow pilot acceptance. No browser receiver control, scheduled service,
      inferred CONNECTED status or continuous uptime claim.</p>
  </section>;
}
