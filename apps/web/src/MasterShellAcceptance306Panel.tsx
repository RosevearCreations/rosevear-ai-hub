import { useEffect, useRef, useState } from "react";
import { getMasterShellAcceptance306 } from "./api";
import { inspectMasterAcceptance306, type Acceptance306 } from "./masterShellAcceptance306";

const labels: Record<string, string> = {
  hub_api: "API 8765", hub_web: "Web 5173", caddy_proxy: "Caddy 8443",
};

export function MasterShellAcceptance306Panel() {
  const [read, setRead] = useState<Acceptance306 | null>(null);
  const [message, setMessage] = useState("Ree-host evidence has not been read in this session.");
  const [busy, setBusy] = useState(false);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);

  async function refresh() {
    pending.current?.abort();
    const controller = new AbortController(); pending.current = controller; setBusy(true);
    try {
      const result = inspectMasterAcceptance306(await getMasterShellAcceptance306(controller.signal));
      if (pending.current !== controller) return;
      setRead(result);
      setMessage(result ? "Local source observations loaded; protected master acceptance remains HOLD."
        : "Invalid or incompatible Master360 Build 306 evidence. HOLD.");
    } catch {
      if (pending.current !== controller) return;
      setRead(null); setMessage("Protected owner endpoint unavailable. HOLD.");
    } finally { if (pending.current === controller) setBusy(false); }
  }
  return <section aria-labelledby="master-306-title" className="master-306-status">
    <p className="eyebrow">Build 306 · Three-Master uptime and evidence acceptance</p>
    <h3 id="master-306-title">Original Ree host · release review, one-TEST and uptime history</h3>
    <p>This owner-only view reads existing seven-day local TCP observations from
      <code> DESKTOP-AE894KC</code>. Missing time is unknown, not downtime or uptime.
      The separate AI Data Platform and Comms Hub connections require authenticated evidence;
      a successful GitHub build alone cannot connect them.</p>
    <button type="button" onClick={() => void refresh()} disabled={busy}>
      {busy ? "Reading protected host status…" : "Refresh Build 306 three-master status"}
    </button>
    <p role="status">{message}</p>
    {read && <>
      <ul aria-label="Three-master acceptance states">
        {read.masterSources.map(s => <li key={s.id}><strong>{s.id}</strong> — {s.state.replaceAll("_", " ")}</li>)}
      </ul>
      <dl>
        <dt>Independent installed-release review</dt><dd>HOLD — no protected signed Ree field review imported</dd>
        <dt>Source-signed one-TEST import</dt><dd>HOLD — no owner-authorized source envelope imported</dd>
        <dt>Comms QL-412 signed ACK</dt><dd>HOLD — no independent receiver-signed acknowledgement</dd>
        <dt>Windows automation and Recovery task</dt><dd>Ree host only · unchanged · zero new tasks</dd>
        <dt>Connection / subsequent application onboarding</dt><dd>HOLD / HOLD</dd>
      </dl>
      <h4>Seven-day observed reachability — original host only</h4>
      {read.observedLocalTrend.length ? <div style={{ overflowX: "auto" }}>
        <table>
          <caption>Observed loopback TCP checks; percentages are of sampled minutes only.</caption>
          <thead><tr><th scope="col">UTC day</th><th scope="col">Samples</th>
            {Object.entries(labels).map(([id, name]) => <th scope="col" key={id}>{name}</th>)}</tr></thead>
          <tbody>{read.observedLocalTrend.map(day => <tr key={day.dayUtc}>
            <th scope="row">{day.dayUtc}</th><td>{day.observedMinutes}</td>
            {Object.keys(labels).map(id => <td key={id}>
              {day.reachableMinutes[id]}/{day.observedMinutes} ({Math.round(100 * day.reachableMinutes[id] / day.observedMinutes)}%)
            </td>)}
          </tr>)}</tbody>
        </table>
      </div> : <p>No fresh, protected original-host daily observations available. HOLD.</p>}
    </>}
    <p>Signed owner field reviews and measured telemetry can be checked by the separately
      authenticated protected server adapter. This page does not upload, sign, transmit,
      enroll keys, start the receiver, run Recovery or create Windows scheduled tasks.</p>
  </section>;
}
