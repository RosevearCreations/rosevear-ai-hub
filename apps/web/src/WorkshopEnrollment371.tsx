import { useEffect, useState } from "react";

import {
  getWorkshopEnrollment371,
  type AuthRole,
  type WorkshopEnrollment371Report,
} from "./api";

/** The registry proves only what Windows reported, not active machine control. */
export function WorkshopEnrollment371({ role }: { role: AuthRole }) {
  const [report, setReport] = useState<WorkshopEnrollment371Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    setBusy(true);
    try {
      setReport(await getWorkshopEnrollment371());
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Printer PC enrollment unavailable.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (role === "owner") void refresh();
  }, [role]);

  if (role !== "owner") return null;

  return <section className="panel" id="workshop-enrollment371"
    aria-label="Windows printer PC enrollment and USB identity review">
    <header className="device-registry-heading">
      <div>
        <p className="eyebrow">Build 371 · Supervised printer PC acceptance</p>
        <h2>USB identities &amp; first telemetry</h2>
        <p>Compare two independently signed registry snapshots. A Windows USB ID is not proof that an Ender 5 Pro,
          Ortur laser or camera is active, and no program may silently claim it.</p>
      </div>
      <button type="button" disabled={busy} onClick={() => void refresh()}>
        {busy ? "Checking…" : "Recheck receipts"}
      </button>
    </header>
    {error && <p role="alert" className="auth-error">{error}</p>}
    {!report ? <p role="status">No verified printer-PC observations yet.</p> : <>
      <p role="status">
        <strong>{report.state.replaceAll("_", " ")}</strong>
        {" · " + report.receivedCount + " stored signed receipts"}
        {report.lastObservedAtMs != null
          ? " · Last Windows observation " + new Date(report.lastObservedAtMs).toLocaleString()
          : ""}
        {" · " + (report.sourceFresh ? "Source timestamp fresh" : "Source not fresh")}
      </p>
      <div className="dashboard-grid" aria-label="Supervised field acceptance gates">
        {([
          ["Signed receipt", report.gates.signedReceipt],
          ["Repeat receipt", report.gates.repeatReceipt],
          ["USB IDs", report.gates.usbRegistryObserved],
          ["Physical device checked", report.gates.physicalDeviceConfirmed],
          ["Camera feed checked", report.gates.cameraFeedVerified],
          ["Master ACK", report.gates.remoteMasterAck],
        ] as const).map(([name, accepted]) =>
          <article className="panel" key={name}>
            <strong>{name}</strong>
            <p>{accepted ? "Source evidence present" : "HOLD · not evidenced"}</p>
          </article>)}
      </div>
      <p>For the two Ender 5 Pro cameras, start the optional local-only viewer on the printer PC;
        camera pictures are not sent to the AI Hub. The viewer uses only one camera at a time
        and does not touch the printer serial port.</p>
      <div role="region" aria-label="Compared Windows USB device identities">
        {report.devices.length === 0 && <p>No hashed Windows USB/PnP identities received.
          Run the collector with --include-usb from the supervised Windows PC.</p>}
        {report.devices.map(item =>
          <article className="panel" key={item.kind + item.deviceId}>
            <h3>{item.label}</h3>
            <p>{item.kind.replaceAll("_", " ")} · ID {item.deviceId}</p>
            <p>Previous COM: {item.previousPort || "unknown"} · Current COM: {item.currentPort || "unknown"}
              {" · " + item.transition.replaceAll("_", " ")}</p>
            <p>Evidence: Windows PnP registry only; physical identity and use are unverified.</p>
          </article>)}
      </div>
    </>}
  </section>;
}
