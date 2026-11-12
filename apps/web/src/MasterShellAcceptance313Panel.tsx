import { useEffect, useRef, useState } from "react";
import { getMasterShellAcceptance313 } from "./api";
import { inspectMasterAcceptance313, type Acceptance313 } from "./masterShellAcceptance313";

export function MasterShellAcceptance313Panel() {
  const [status, setStatus] = useState<Acceptance313 | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Signed original-host pilot evidence is not verified.");
  const pending = useRef<AbortController | null>(null);

  useEffect(() => () => pending.current?.abort(), []);

  async function refresh() {
    pending.current?.abort();
    const active = new AbortController();
    pending.current = active;
    setLoading(true);
    try {
      const result = inspectMasterAcceptance313(
        await getMasterShellAcceptance313(active.signal),
      );
      if (pending.current !== active) return;
      setStatus(result);
      setMessage(result
        ? "Build 313 source status matched. Signed runtime and owner acceptance remain HOLD."
        : "Build 313 status was unavailable or did not match the protected contract. HOLD.");
    } catch {
      if (pending.current !== active) return;
      setStatus(null);
      setMessage("Protected Build 313 owner status unavailable. HOLD.");
    } finally {
      if (pending.current === active) setLoading(false);
    }
  }

  return <section className="master-306-status" aria-labelledby="master-313-title">
    <p className="eyebrow">Build 313 · signed pilot and independent owner continuity</p>
    <h3 id="master-313-title">Original-host receipt, Comms closure &amp; controller review</h3>
    <p>A GitHub release cannot prove that Ree's original Windows host issued a
      signed receipt or that Comms and AI Data independently accepted it.</p>
    <button type="button" disabled={loading} onClick={() => void refresh()}>
      {loading ? "Checking source readiness…" : "Refresh Build 313 owner status"}
    </button>
    <p role="status">{message}</p>
    {status && <dl>
      <dt>Signed original-host pilot</dt><dd>{status.signedOriginalHostPilot}</dd>
      <dt>QL-421 closure / QL-422 independent ledger</dt><dd>{status.ql421ClosureReadback}</dd>
      <dt>AI Data owner continuity</dt><dd>{status.controllerOwnerContinuity}</dd>
      <dt>Protected episode journal</dt><dd>{status.privateEpisodeJournal}</dd>
      <dt>Original-host uptime</dt><dd>{status.originalHostUptime}</dd>
      <dt>Owner acceptance / receiver / connection / sync</dt><dd>HOLD / OFF / HOLD / HOLD</dd>
    </dl>}
    <p>Read-only owner view. No private keys, evidence transport, Windows task,
      incident closure, owner decision or receiver activation takes place here.</p>
  </section>;
}
