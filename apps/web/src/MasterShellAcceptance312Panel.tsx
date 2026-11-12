import { useEffect, useRef, useState } from "react";
import { getMasterShellAcceptance312 } from "./api";
import { inspectMasterAcceptance312, type Acceptance312 } from "./masterShellAcceptance312";

export function MasterShellAcceptance312Panel() {
  const [read, setRead] = useState<Acceptance312 | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Protected pilot evidence is not independently verified.");
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);

  async function refresh() {
    pending.current?.abort();
    const request = new AbortController();
    pending.current = request;
    setLoading(true);
    try {
      const next = inspectMasterAcceptance312(await getMasterShellAcceptance312(request.signal));
      if (pending.current !== request) return;
      setRead(next);
      setMessage(next
        ? "Exact Build 312 source contract loaded. Live evidence and Master acceptance remain HOLD."
        : "Mismatched or untrusted Build 312 source status. HOLD.");
    } catch {
      if (pending.current !== request) return;
      setRead(null);
      setMessage("Protected Build 312 status unavailable. HOLD.");
    } finally {
      if (pending.current === request) setLoading(false);
    }
  }
  return <section className="master-306-status" aria-labelledby="master-312-title">
    <p className="eyebrow">Build 312 · supervised protected pilot</p>
    <h3 id="master-312-title">Original-host pilot, controller schema &amp; incident handoff</h3>
    <p>Only independent Ree-host, Comms QL-421 and AI Data controller witnesses
      can admit exact receipt custody. Source CI does not certify live operation.</p>
    <button type="button" disabled={loading} onClick={() => void refresh()}>
      {loading ? "Checking protected evidence…" : "Refresh Build 312 owner status"}
    </button>
    <p role="status">{message}</p>
    {read && <>
      <dl>
        <dt>Original Ree host pilot</dt><dd>{read.originalHostPilot}</dd>
        <dt>AI Data schema negotiation</dt><dd>{read.schemaNegotiation}</dd>
        <dt>QL-421 incident handoff</dt><dd>{read.incidentHandoff}</dd>
        <dt>Owner certification</dt><dd>{read.ownerCertification}</dd>
        <dt>Receiver / connection / synchronization</dt><dd>OFF / HOLD / HOLD</dd>
      </dl>
      <h4>Independent handoff receipt custody</h4>
      <ul>{read.handoffMasters.map((item) =>
        <li key={item.master}>{item.master}: {item.state}</li>)}</ul>
    </>}
    <p>No new Windows task, automatic sender, key creation, receiver activation,
      incident closure or owner approval is performed from this screen.</p>
  </section>;
}
