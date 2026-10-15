import { useState } from "react";

import {
  getCameraRuntimeAssurance,
  saveCameraRuntimeAcceptance,
  type CameraRuntimeAssurance,
} from "./api";

export function CameraRuntimeAcceptance() {
  const [status, setStatus] = useState<CameraRuntimeAssurance | null>(null);
  const [checks, setChecks] = useState({
    backup_drill_confirmed: false,
    ha_connected_confirmed: false,
    mqtt_connected_confirmed: false,
    camera_status_confirmed: false,
  });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function inspect() {
    setBusy(true);
    setMessage("");
    try {
      setStatus(await getCameraRuntimeAssurance());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Local runtime evidence unavailable.");
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  async function record(decision: "accepted" | "hold") {
    if (!status || busy) return;
    setBusy(true);
    setMessage("");
    try {
      await saveCameraRuntimeAcceptance(status.inventory_snapshot, decision, checks);
      const updated = await getCameraRuntimeAssurance();
      setStatus(updated);
      setMessage("Owner observations recorded in the append-only Hub ledger; no services changed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Acceptance could not be recorded.");
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  const allConfirmed = Object.values(checks).every(Boolean);
  return (
    <section aria-label="Build 077 owner runtime acceptance">
      <h3>Build 077 — Owner runtime and recovery observations</h3>
      <p>These are manual confirmations, not automated proof of Windows installation
        or external device health. They do not restart services or restore backups.</p>
      <button type="button" disabled={busy} onClick={() => void inspect()}>
        {busy ? "Reading…" : "Read installed inventory evidence"}
      </button>
      {status ? (
        <div>
          <p>Database revision: {status.migration_revision ?? "unknown"};
            {" "}{status.schema_ready ? "schema ready" : "migration needed"}</p>
          <p>Camera plans: {status.camera_count}; import ledger events: {status.imported_count}</p>
          {status.latest ? (
            <p>Latest owner entry: {status.latest.decision}, recorded by user
              {" "}{status.latest.actor_user_id}.
              {" "}{status.latest_snapshot_current ? "Inventory unchanged" : "Inventory has since changed"}.
              These observations are not machine-verified.</p>
          ) : <p>No owner acceptance recorded yet.</p>}
          <fieldset disabled={busy}>
            <legend>Check these only after verifying locally on the home Windows PC</legend>
            <label><input type="checkbox" checked={checks.backup_drill_confirmed}
              onChange={(event) => setChecks((old) => ({
                ...old, backup_drill_confirmed: event.target.checked,
              }))} /> Encrypted backup and isolated recovery drill reviewed</label>
            <label><input type="checkbox" checked={checks.ha_connected_confirmed}
              onChange={(event) => setChecks((old) => ({
                ...old, ha_connected_confirmed: event.target.checked,
              }))} /> Home Assistant remains connected</label>
            <label><input type="checkbox" checked={checks.mqtt_connected_confirmed}
              onChange={(event) => setChecks((old) => ({
                ...old, mqtt_connected_confirmed: event.target.checked,
              }))} /> MQTT remains connected</label>
            <label><input type="checkbox" checked={checks.camera_status_confirmed}
              onChange={(event) => setChecks((old) => ({
                ...old, camera_status_confirmed: event.target.checked,
              }))} /> Existing camera/go2rtc status unchanged</label>
          </fieldset>
          <button type="button" disabled={busy || !status.schema_ready}
            onClick={() => void record("hold")}>Record owner HOLD</button>{" "}
          <button type="button" disabled={busy || !status.schema_ready || !allConfirmed}
            onClick={() => void record("accepted")}>Record manual owner acceptance</button>
          <p>Owner acceptance is not remote certification of live playback or installer
            deployment. A changed inventory invalidates previous acceptance currency.</p>
        </div>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
