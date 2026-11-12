import { useEffect, useRef, useState } from "react";
import { getMasterShellAcceptance311 } from "./api";
import { inspectMasterAcceptance311, type Acceptance311 } from "./masterShellAcceptance311";

export function MasterShellAcceptance311Panel() {
  const [read, setRead] = useState<Acceptance311 | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("No protected export closure or controller owner decision has been verified.");
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);

  async function refresh() {
    pending.current?.abort();
    const active = new AbortController();
    pending.current = active;
    setLoading(true);
    try {
      const next = inspectMasterAcceptance311(await getMasterShellAcceptance311(active.signal));
      if (pending.current !== active) return;
      setRead(next);
      setMessage(next
        ? "Build 311 code contract matched; private runtime evidence and Master activation remain HOLD."
        : "Untrusted or stale Build 311 status response. HOLD.");
    } catch {
      if (pending.current !== active) return;
      setRead(null);
      setMessage("Protected Build 311 owner status is unavailable. HOLD.");
    } finally {
      if (pending.current === active) setLoading(false);
    }
  }

  return <section className="master-306-status" aria-labelledby="master-311-title">
    <p className="eyebrow">Build 311 · protected Master360 decision convergence</p>
    <h3 id="master-311-title">Original-host export closure, independent controller review &amp; discrepancies</h3>
    <p>Signed Comms receiver acceptance, protected custody, and AI Data owner review must
      be separately proven. Export custody closure alone never activates the receiver.</p>
    <button type="button" onClick={() => void refresh()} disabled={loading}>
      {loading ? "Reviewing Master evidence…" : "Refresh Build 311 owner status"}
    </button>
    <p role="status">{message}</p>
    {read && <>
      <dl>
        <dt>Export closure</dt><dd>{read.exportClosure}</dd>
        <dt>AI Data controller</dt><dd>{read.ownerDecision}</dd>
        <dt>Private controller schema</dt><dd>{read.controllerContract}</dd>
        <dt>Receiver / connection / Master sync</dt><dd>OFF / HOLD / HOLD</dd>
        <dt>Automation host</dt><dd>DESKTOP-AE894KC only; zero new tasks</dd>
      </dl>
      <h4>Protected evidence discrepancies — notification not sent</h4>
      <ul>
        {read.discrepancies.map((item) =>
          <li key={item.code}>
            {item.code.replaceAll("_", " ")} · {item.severity} ({item.slaMinutes} minute policy) ·
            observation unverified, owner review HOLD
          </li>
        )}
      </ul>
    </>}
    <p>Read-only monitoring. No new Windows task, signer enrollment, evidence transport,
      notification, owner approval or connection activation is performed here.</p>
  </section>;
}
