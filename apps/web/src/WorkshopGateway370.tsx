import { useEffect, useState } from "react";

import { getWorkshopGateway370, type AuthRole, type WorkshopGateway370Report } from "./api";

export function WorkshopGateway370({ role }: { role: AuthRole }) {
  const [report, setReport] = useState<WorkshopGateway370Report | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true);
    try {
      setReport(await getWorkshopGateway370());
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Printer PC gateway unavailable.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (role === "owner") void refresh();
  }, [role]);

  if (role !== "owner") return null;
  return <section className="panel" id="workshop-gateway370"
    aria-label="Read-only printer PC workshop observations">
    <header className="device-registry-heading">
      <div>
        <p className="eyebrow">Build 370 · Printer PC source gateway</p>
        <h2>Workshop PC — ports and machines</h2>
        <p>Signed Windows serial/print queue inventory, optional local OctoPrint telemetry,
          and explicit equipment awaiting verification. No machinery controls.</p>
      </div>
      <button type="button" disabled={busy} onClick={() => void refresh()}>
        {busy ? "Checking…" : "Refresh"}
      </button>
    </header>
    {error && <p role="alert" className="auth-error">{error}</p>}
    {!report ? <p role="status">No gateway data yet.</p> : <>
      <p role="status"><strong>{report.state.replaceAll("_", " ")}</strong>
        {report.receipt ? " · Source " + report.receipt.collectorId
          + " · Last receipt " + new Date(report.receipt.receivedAt).toLocaleString()
          + " · " + report.receipt.ageSeconds + "s old" : " · Collector not enrolled."}
      </p>
      <p>Windows port enumeration means the interface was listed, not that a device is
        physically verified, safe, printing, or available to another application.
        Laser, 3D printer, scanner, Cricut and cameras remain unverified unless an
        appropriate supported read-only source reports them.</p>
      <div className="dashboard-grid">
        <article className="panel"><h3>Serial ports</h3><p>{report.devices.filter(x => x.kind === "serial").length}</p></article>
        <article className="panel"><h3>Printer queues</h3><p>{report.devices.filter(x => x.kind === "printer_queue").length}</p></article>
        <article className="panel"><h3>Local print APIs</h3><p>{report.devices.filter(x => x.kind === "octoprint").length}</p></article>
        <article className="panel"><h3>Unverified equipment notes</h3><p>{report.devices.filter(x => x.kind === "manual_note").length}</p></article>
      </div>
      <div role="region" aria-label="Workshop equipment source list">
        {report.devices.length === 0 && <p>No Windows printer-PC receipts yet.</p>}
        {report.devices.map(item => <article className="panel" key={item.kind + ":" + item.device_id}>
          <h3>{item.label}</h3>
          <p>{item.kind.replaceAll("_", " ")} · {item.device_id} ·
            {" " + item.presence.replaceAll("_", " ")} · Source {item.proof.replaceAll("_", " ")}
            {item.progress_percent != null ? " · Print " + item.progress_percent + "%" : ""}
            {item.nozzle_c != null ? " · Nozzle " + item.nozzle_c + "°C" : ""}
            {item.bed_c != null ? " · Bed " + item.bed_c + "°C" : ""}</p>
        </article>)}
      </div>
    </>}
  </section>;
}
