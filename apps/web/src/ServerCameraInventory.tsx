import { useEffect, useState } from "react";

import { CameraInventoryImport } from "./CameraInventoryImport";
import { CameraRuntimeAcceptance } from "./CameraRuntimeAcceptance";
import { CameraOwnerReconciliationPanel } from "./CameraOwnerReconciliationPanel";
import { CameraImportFieldAcceptance } from "./CameraImportFieldAcceptance";
import { CAMERA_SOURCES, cameraConnectionReadback, cameraSourceReadback } from "./cameraConnectionDiagnostics";

import {
  approveServerCameraPlan,
  getServerCameraPlanLedger,
  listServerCameraPlans,
  saveServerCameraPlan,
  type CameraCompatibilityLedgerEntry,
  type CameraCompatibilityPlan,
} from "./api";

export function ServerCameraInventory({
  canAdminister, isOwner,
}: { canAdminister: boolean; isOwner: boolean }) {
  const [items, setItems] = useState<CameraCompatibilityPlan[]>([]);
  const [brand, setBrand] = useState("Blink");
  const [model, setModel] = useState("");
  const [method, setMethod] = useState<CameraCompatibilityPlan["method"]>("unverified");
  const [evidence, setEvidence] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [ledger, setLedger] = useState<CameraCompatibilityLedgerEntry[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);

  async function refresh() {
    try {
      setItems(await listServerCameraPlans());
    } catch {
      setMessage("Server camera inventory unavailable. Confirm the approved database migration is installed.");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Camera inventory request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel" aria-label="Server-backed camera compatibility inventory">
      <h2>Build 074 — Shared camera model inventory</h2>
      <p>Owner-reviewed plans are saved to the local Hub database with actor-bound audit records.
        Approval does not connect to Alexa, register a camera or activate video.</p>
      <section aria-label="Build 213 camera source compatibility and connection diagnostics">
        <h3>Camera source compatibility and connection diagnostics</h3>
        <p>These are inventory and authorization checkpoints, <strong>not live camera health checks</strong>.
          Brand alone never proves RTSP, ONVIF, cloud API access or a working feed. No device is probed here.</p>
        <ul>{CAMERA_SOURCES.map((source) => (
          <li key={source.brand}>
            <strong>{source.brand === "Alarm.com" ? "Bell / Alarm.com" : source.brand}</strong>: {cameraSourceReadback(source.brand, items)}
            <span> {source.next}</span>
          </li>
        ))}</ul>
        <p>Before connection: verify model capability, permitted local or cloud-only route, account authority,
          required separate credentials, and Windows playback. Do not enter tokens, passwords or stream URLs in notes.
          Alexa-only viewing does not grant a Hub feed.</p>
      </section>
      {canAdminister ? (
        <div className="camera-discovery-choice">
          <label>Brand <select value={brand} disabled={busy} onChange={(event) => setBrand(event.target.value)}>
            {["Blink", "littlelf", "Nooie", "Netvue", "Alarm.com", "SkyBell", "IQ Panel", "Other"].map(
              (value) => <option key={value}>{value}</option>,
            )}
          </select></label>
          <label>Model <input value={model} disabled={busy} maxLength={120}
            onChange={(event) => setModel(event.target.value)} /></label>
          <label>Method <select value={method} disabled={busy}
            onChange={(event) => setMethod(event.target.value as CameraCompatibilityPlan["method"])}>
            <option value="unverified">Unverified</option>
            <option value="rtsp">Manufacturer-documented RTSP</option>
            <option value="onvif">Manufacturer-documented ONVIF</option>
            <option value="manufacturer">Authorized manufacturer API</option>
            <option value="alexa_only">Alexa only (no Hub feed)</option>
            <option value="unsupported">Unsupported</option>
          </select></label>
          <label>Evidence note (no passwords or URLs)
            <input value={evidence} disabled={busy} maxLength={400}
              onChange={(event) => setEvidence(event.target.value)} />
          </label>
          <button type="button" disabled={busy || !model.trim()}
            onClick={() => void run(async () => {
              await saveServerCameraPlan({ brand, model, method, evidence, location: "" });
              setModel(""); setEvidence("");
              await refresh();
              setMessage("Camera compatibility record saved; not activated.");
            })}>{busy ? "Saving…" : "Save camera model"}</button>
        </div>
      ) : <p>Only Owner/Administrator accounts may create or approve compatibility records.</p>}
      <button type="button" disabled={busy} onClick={() => void run(refresh)}>Refresh saved records</button>
      {items.length === 0 ? <p>No server camera models loaded.</p> : (
        <ul>{items.map((item) => (
          <li key={item.id}>
            <strong>{item.brand} — {item.model}</strong>{" "}
            <span>{item.method}, revision {item.revision}, {item.approved_at ? "plan approved" : "not approved"}</span>
            <p>{cameraConnectionReadback(item).label}. {cameraConnectionReadback(item).next}</p>
            {canAdminister ? <button type="button" disabled={busy || !!item.approved_at ||
                item.method === "unverified" || item.method === "unsupported" || item.evidence.trim().length < 8}
              onClick={() => void run(async () => {
                await approveServerCameraPlan(item.id);
                await refresh();
                setMessage("Plan approval recorded. No camera was activated.");
              })}>Approve plan</button> : null}{" "}
            <button type="button" disabled={busy} onClick={() => void run(async () => {
              setLedger(await getServerCameraPlanLedger(item.id));
              setActiveId(item.id);
            })}>View ledger</button>
          </li>
        ))}</ul>
      )}
      {activeId !== null ? (
        <section aria-label="Camera authorization ledger">
          <h3>Approval history — record {activeId}</h3>
          {ledger.length === 0 ? <p>No entries.</p> : (
            <ul>{ledger.map((entry) => <li key={entry.id}>
              {entry.action} — revision {entry.revision} — actor {entry.actor_user_id ?? "deleted account"}
            </li>)}</ul>
          )}
        </section>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
      {canAdminister ? <CameraImportFieldAcceptance /> : null}
      {isOwner ? <CameraOwnerReconciliationPanel /> : null}
      {isOwner ? <CameraRuntimeAcceptance /> : null}
      <CameraInventoryImport canAdminister={canAdminister} onImported={refresh} />
      <p>Legacy browser-local plans are not imported automatically. Backup and migrate the Hub
        database using the approved Windows procedure before using this feature.</p>
    </section>
  );
}
