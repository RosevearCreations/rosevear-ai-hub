import { useEffect, useRef, useState } from "react";
import { getMasterShellAcceptance318 } from "./api";
import { inspectMasterAcceptance318, type Acceptance318 } from "./masterShellAcceptance318";

export function MasterShellAcceptance318Panel() {
  const [status, setStatus] = useState<Acceptance318 | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("QL-427 external witness and recovery closure remain unverified.");
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);

  async function refresh() {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    try {
      const next = inspectMasterAcceptance318(await getMasterShellAcceptance318(controller.signal));
      if (active.current !== controller) return;
      setStatus(next);
      setMessage(next
        ? "Build 318 source status verified. Original-host QL-427 operational evidence remains HOLD."
        : "Build 318 owner source status missing or mismatched. HOLD.");
    } catch {
      if (active.current !== controller) return;
      setStatus(null);
      setMessage("Protected Build 318 owner status unavailable. HOLD.");
    } finally {
      if (active.current === controller) setBusy(false);
    }
  }

  return <section className="master-306-status" aria-labelledby="master-318-title">
    <p className="eyebrow">Build 318 · QL-427 independent recovery</p>
    <h3 id="master-318-title">Independent witness, receiver isolation and recovery closure</h3>
    <p>Source checks are not original Windows-host proof. All external signer,
      receiver OFF and three-Master custody evidence must be verified independently.</p>
    <button type="button" disabled={busy} onClick={() => void refresh()}>
      {busy ? "Reading protected status…" : "Refresh Build 318 owner status"}
    </button>
    <p role="status">{message}</p>
    {status && <dl>
      <dt>QL-427 checkpoint export</dt><dd>{status.ql427CheckpointExport}</dd>
      <dt>Independent signed witness</dt><dd>{status.ql427IndependentWitness}</dd>
      <dt>Fresh signed receiver OFF</dt><dd>{status.ql427ReceiverIsolation}</dd>
      <dt>Three-Master closure</dt><dd>{status.ql427ThreeMasterRecovery}</dd>
      <dt>Distinct owner and reviewer</dt><dd>{status.ql427OwnerClosure}</dd>
      <dt>External durable closure anchor</dt><dd>{status.ql427ExternalClosureAnchor}</dd>
      <dt>Receiver / connection / owner / sync</dt><dd>OFF / HOLD / HOLD / HOLD</dd>
    </dl>}
    <p>Read-only. No signing-key intake, receiver restart, Windows Scheduled Task,
      pilot re-entry or CONNECTED transition.</p>
  </section>;
}
