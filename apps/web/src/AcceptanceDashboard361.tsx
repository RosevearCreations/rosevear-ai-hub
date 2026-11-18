import { useCallback, useEffect, useRef, useState } from "react";
import {
  getServerShell361,
  type ServerShell361Snapshot,
} from "./api";
import "./serverShell349.css";

export function trustedAcceptance361(value: unknown): value is ServerShell361Snapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  return r.schema === "rosevear.hub.ql470.acceptance-dashboard361.v1" &&
    r.sourceBuild === 361 && r.serverShell === "ai-data-platform" &&
    r.originalHost === "DESKTOP-AE894KC" &&
    r.physicalUnattendedProductionGreen === false &&
    r.threeMasterWorkerProductionGreen === false &&
    r.commsPrivateReceiverAuthorized === false &&
    r.authenticatedDeviceRuntimeVerified === false &&
    r.independentSignedMasterWorkerAckVerified === false &&
    r.liveMasterConnectivityVerified === false &&
    r.webMutationAvailable === false &&
    r.taskSchedulerHistoryIsNamedTaskProof === false &&
    Array.isArray(r.tasks) && r.tasks.length === 2 &&
    Array.isArray(r.masterServices) && r.masterServices.length === 3 &&
    Array.isArray(r.holdCodes) &&
    typeof r.fieldEvidence === "object" && r.fieldEvidence !== null &&
    Object.keys(r.fieldEvidence).sort().join(",") === "ai-data-worker,comms-worker,guest,reboot" &&
    r.tasks.every((t: Record<string, unknown>) => t.identityVerified === false &&
      t.unattendedBootProven === false && typeof t.name === "string") &&
    r.masterServices.every((s: Record<string, unknown>) =>
      s.enrollmentApproved === false && s.peerSignedAckVerified === false &&
      s.rollbackReady === false && typeof s.name === "string");
}

const scopeLabels: Record<keyof ServerShell361Snapshot["fieldEvidence"], string> = {
  reboot: "Unattended reboot & independent witness",
  guest: "Home Assistant · MQTT · cameras · backup",
  "ai-data-worker": "AI Data Platform worker",
  "comms-worker": "Comms Hub non-receiver worker",
};

export function AcceptanceDashboard361() {
  const [snapshot, setSnapshot] = useState<ServerShell361Snapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("No live original-host evidence has been reviewed.");
  const controllerRef = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setBusy(true);
    try {
      const result: unknown = await getServerShell361(controller.signal);
      if (controllerRef.current !== controller) return;
      if (!trustedAcceptance361(result)) {
        setSnapshot(null);
        setMessage("HOLD_INVALID_DASHBOARD_SOURCE_CONTRACT");
      } else {
        setSnapshot(result);
        setMessage(result.localTelemetryFreshButUnsigned
          ? "Fresh, UNSIGNED original-host inventory only — physical acceptance remains HOLD."
          : "HOLD: original Windows telemetry is missing, stale, off-host or source-mismatched.");
      }
    } catch {
      if (controllerRef.current === controller) {
        setSnapshot(null);
        setMessage("HOLD: original-host acceptance endpoint unavailable.");
      }
    } finally {
      if (controllerRef.current === controller) setBusy(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => controllerRef.current?.abort();
  }, [refresh]);

  return <section id="master-acceptance361" className="mc-panel shell349" aria-label="QL-470 Master acceptance dashboard">
    <div className="shell349-toolbar">
      <div>
        <h2>Original Host & Three-Master Acceptance · QL-470</h2>
        <p>Owner-only, read-only evidence dashboard. All installation, activation and receiver
          controls remain outside the browser and require separate approvals.</p>
      </div>
      <button type="button" disabled={busy} onClick={() => void refresh()}>
        {busy ? "Checking…" : "Refresh evidence"}
      </button>
    </div>
    <p role="status">{message}</p>
    <div className="shell349-status-grid">
      <article className="shell349-status">
        <strong>Physical Windows unattended operation</strong>
        <p>HOLD — not verified</p>
        <small>No physical pre-login proof or independently accepted guest recovery</small>
      </article>
      <article className="shell349-status">
        <strong>Three-Master workers</strong>
        <p>HOLD — no verified independent service enrollment</p>
        <small>Master signed ACK, version and rollback acceptance pending</small>
      </article>
      <article className="shell349-status">
        <strong>Private Comms TEST receiver</strong>
        <p>OFF / UNAUTHORIZED (not independently observed)</p>
        <small>No permission to enable QL-340C</small>
      </article>
      <article className="shell349-status">
        <strong>Original-host telemetry</strong>
        <p>{snapshot?.localTelemetryFreshButUnsigned
          ? "Fresh unsigned snapshot" : "HOLD — no fresh trusted source"}</p>
        <small>Task Scheduler event IDs are not proof a named task ran</small>
      </article>
    </div>
    {snapshot && <>
      <h3>Recovery task observations</h3>
      <div className="shell349-status-grid">
        {snapshot.tasks.map(t => <article key={t.name} className="shell349-status">
          <strong>{t.name}</strong>
          <p>Windows state: {t.observedState}</p>
          <small>Latest run: {t.lastRunUtc ? new Date(t.lastRunUtc).toLocaleString() : "Not observed"}</small>
          <p>Exact identity and reboot success: NOT INDEPENDENTLY VERIFIED</p>
        </article>)}
      </div>
      <h3>Independent Windows worker enrollment</h3>
      <div className="shell349-status-grid">
        {snapshot.masterServices.map(w => <article key={w.name} className="shell349-status">
          <strong>{w.name}</strong>
          <p>Observed: {w.observedState} · Start mode: {w.startMode}</p>
          <small>Approved installation: NO · Signed peer ACK: NO · Rollback verified: NO</small>
        </article>)}
      </div>
      <h3>Authenticated device and signed review evidence</h3>
      <div className="shell349-status-grid">
        {(Object.keys(scopeLabels) as Array<keyof typeof scopeLabels>).map(scope =>
          <article key={scope} className="shell349-status">
            <strong>{scopeLabels[scope]}</strong>
            <p>{snapshot.fieldEvidence[scope]}</p>
            <small>Claim/source review only; independent physical runtime verification pending</small>
          </article>)}
      </div>
      <p>Task Scheduler sampled event IDs: {snapshot.taskHistoryEventsSampled}. Last Windows boot:
        {" "}{snapshot.lastWindowsBootUtc ?? "UNVERIFIED"}.</p>
      <details>
        <summary>Outstanding acceptance gates</summary>
        <ul>{snapshot.holdCodes.map(code => <li key={code}>{code}</li>)}</ul>
      </details>
    </>}
  </section>;
}
