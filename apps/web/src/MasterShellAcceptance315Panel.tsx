import { useEffect, useRef, useState } from "react";
import { getMasterShellAcceptance315 } from "./api";
import { inspectMasterAcceptance315, type Acceptance315 } from "./masterShellAcceptance315";

export function MasterShellAcceptance315Panel() {
  const [status, setStatus] = useState<Acceptance315 | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("QL-424 original-host authority has not been independently enrolled.");
  const pending = useRef<AbortController | null>(null);

  useEffect(() => () => pending.current?.abort(), []);

  async function refresh() {
    pending.current?.abort();
    const current = new AbortController();
    pending.current = current;
    setBusy(true);
    try {
      const result = inspectMasterAcceptance315(
        await getMasterShellAcceptance315(current.signal),
      );
      if (pending.current !== current) return;
      setStatus(result);
      setMessage(result
        ? "Build 315 source contract matched. Signer custody, isolated pilot and owner acceptance remain HOLD."
        : "Build 315 status unavailable or invalid. HOLD.");
    } catch {
      if (pending.current !== current) return;
      setStatus(null);
      setMessage("Build 315 protected owner status unavailable. HOLD.");
    } finally {
      if (pending.current === current) setBusy(false);
    }
  }

  return <section className="master-306-status" aria-labelledby="master-315-title">
    <p className="eyebrow">Build 315 · original-host isolated pilot gate</p>
    <h3 id="master-315-title">Protected signer authority and QL-424 ceremony readiness</h3>
    <p>The source release cannot enroll the real Windows signer, activate the
      Comms receiver, accept an incident, or establish three-Master connectivity.</p>
    <button type="button" disabled={busy} onClick={() => void refresh()}>
      {busy ? "Checking protected source status…" : "Refresh Build 315 owner status"}
    </button>
    <p role="status">{message}</p>
    {status && <dl>
      <dt>Original Ree-host source signer</dt><dd>{status.sourceSignerEnrollment}</dd>
      <dt>Independent receiver witness</dt><dd>{status.receiverWitnessEnrollment}</dd>
      <dt>QL-424 isolated ceremony readiness</dt><dd>{status.ql424CeremonyReadiness}</dd>
      <dt>Three-Master owner review</dt><dd>{status.threeMasterOwnerGate}</dd>
      <dt>Private authority journal</dt><dd>{status.privateAuthorityJournal}</dd>
      <dt>Receiver / connection / owner / sync</dt><dd>OFF / HOLD / HOLD / HOLD</dd>
    </dl>}
    <p>Read-only and fail-closed. No signing keys, ceremony execution,
      evidence intake, Windows task, automatic rollback, or receiver controls exist here.</p>
  </section>;
}
