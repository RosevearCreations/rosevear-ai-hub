import { useState } from "react";

import {
  getCameraImportFieldReadiness,
  type CameraImportFieldReadiness,
} from "./api";

export function CameraImportFieldAcceptance() {
  const [readiness, setReadiness] = useState<CameraImportFieldReadiness | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function inspect() {
    setBusy(true);
    setMessage("");
    setReadiness(null);
    try {
      setReadiness(await getCameraImportFieldReadiness());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Readiness inspection failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Camera inventory database acceptance">
      <h3>Build 076 — Installed database readiness</h3>
      <p>Read-only inspection of the Hub database reached by this app. This is not
        confirmation that the home Windows installation has been updated.</p>
      <button type="button" disabled={busy} onClick={() => void inspect()}>
        {busy ? "Inspecting…" : "Inspect installed database"}
      </button>
      {readiness ? (
        <div>
          <p>Migration revision: {readiness.migration_revision ?? "unavailable"}</p>
          <p>Schema: {readiness.schema_ready ? "Ready" : "Needs migration / review"}</p>
          <p>Inventory records: {readiness.camera_records};
            pending plans: {readiness.unapproved_records}</p>
          <p>Import ledger events: {readiness.import_ledger_events};
            issued review receipts: {readiness.review_receipts}</p>
          <p>Windows runtime, Home Assistant, MQTT and camera playback
            must still be verified on the local machine.</p>
        </div>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
