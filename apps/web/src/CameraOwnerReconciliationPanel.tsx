import { useState } from "react";

import { getCameraOwnerReconciliation, type CameraOwnerReconciliation } from "./api";

export function CameraOwnerReconciliationPanel() {
  const [result, setResult] = useState<CameraOwnerReconciliation | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function inspect() {
    setBusy(true);
    setMessage("");
    try {
      setResult(await getCameraOwnerReconciliation());
    } catch (error) {
      setResult(null);
      setMessage(error instanceof Error ? error.message : "Reconciliation unavailable.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Camera owner acceptance reconciliation">
      <h3>Build 078 — Owner acceptance reconciliation</h3>
      <p>Read-only review of previously recorded manual evidence. No camera connections,
        Windows services or backup files are checked automatically.</p>
      <button type="button" onClick={() => void inspect()} disabled={busy}>
        {busy ? "Reviewing…" : "Review acceptance status"}
      </button>
      {result ? (
        <div>
          <p>Evidence status: {result.status === "HOLD" ? "HOLD" : "Manual review current"}</p>
          <p>Recorded reviews: {result.evidence_count}; newest record:
            {" "}{result.latest_evidence_id ?? "none"}.</p>
          <p>Camera plans: {result.current_inventory_count}; import events:
            {" "}{result.current_import_events}.</p>
          {result.reasons.length ? (
            <ul>{result.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
          ) : <p>Recorded observations match the current inventory. Manual checks are
            not proof of live camera playback or successful Windows restoration.</p>}
        </div>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
