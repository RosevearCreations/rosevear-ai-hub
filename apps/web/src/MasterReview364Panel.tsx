import { useCallback, useEffect, useRef, useState } from "react";
import { getServerShell364, type ServerShell364Snapshot } from "./api";
import { SevenAppSysop365Panel } from "./SevenAppSysop365Panel";

export function trustedReview364(value: unknown): value is ServerShell364Snapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (
    v.schema !== "rosevear.hub.ql473.cross-module-acceptance364.v1" ||
    v.sourceBuild !== 364 || v.originalHost !== "DESKTOP-AE894KC" ||
    v.serverShell !== "ai-data-platform" ||
    v.featureCoverageBaseline !== 68 ||
    v.sourceFeatureCoverageEstimate !== 73 ||
    v.estimatedSourceFeatureGainPoints !== 5 ||
    v.fieldAcceptanceEstimate !== 25 ||
    v.estimatedOverallReadiness !== 56 ||
    v.progressIsPlanningEstimateNotRuntimeProof !== true ||
    v.liveThreeMasterPilotIndependentlyVerified !== false ||
    v.offHostStorageIndependentlyProven !== false ||
    v.originalHostUnattendedRecoveryVerified !== false ||
    v.physicalUnattendedProductionGreen !== false ||
    v.threeMasterWorkerProductionGreen !== false ||
    v.commsPrivateReceiverAuthorized !== false ||
    v.workerAutomaticStartupAuthorized !== false ||
    v.webMutationAvailable !== false ||
    !Array.isArray(v.workerReviews) || v.workerReviews.length !== 3 ||
    typeof v.readbackStatus !== "string" || typeof v.peerPilotStatus !== "string" ||
    typeof v.anchorStatus !== "string"
  ) return false;
  const expected = ["Rosevear-AIHub", "Rosevear-AIDataPlatform", "Rosevear-CommsHub"];
  return v.workerReviews.every((item: Record<string, unknown>, index: number) =>
    item.worker === expected[index] &&
    item.liveConnectedVerified === false &&
    item.ownerPilotInstallationApproved === false &&
    item.realRollbackWitnessed === false &&
    typeof item.readOnlySignedClaimStatus === "string");
}

export function MasterReview364Panel() {
  const [result, setResult] = useState<ServerShell364Snapshot | null>(null);
  const [message, setMessage] = useState("No genuine off-host readback or peer-pilot evidence reviewed.");
  const [busy, setBusy] = useState(false);
  const latest = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    latest.current?.abort();
    const controller = new AbortController();
    latest.current = controller;
    setBusy(true);
    try {
      const response: unknown = await getServerShell364(controller.signal);
      if (latest.current !== controller) return;
      if (!trustedReview364(response)) {
        setResult(null);
        setMessage("HOLD_QL473_UNTRUSTED_ACCEPTANCE_DATA");
      } else {
        setResult(response);
        setMessage("Review completed. Signed claims are not proof of live connectivity or worker authority.");
      }
    } catch {
      if (latest.current === controller) {
        setResult(null);
        setMessage("HOLD_QL473_NO_ORIGINAL_HOST_READBACK");
      }
    } finally {
      if (latest.current === controller) setBusy(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => latest.current?.abort();
  }, [refresh]);

  return <section id="master-review364" className="mc-panel shell349"
    aria-label="QL-473 independent readback and three-Master pilot acceptance">
    <div className="shell349-toolbar">
      <div>
        <h3>Off-host readback & three-Master pilot evidence · QL-473</h3>
        <p>Owner-only review. No software install, Task Scheduler enable, private receiver
          activation or original-PC restart is available here.</p>
      </div>
      <button type="button" disabled={busy} onClick={() => void refresh()}>
        {busy ? "Checking…" : "Refresh pilot evidence"}
      </button>
    </div>
    <p role="status">{message}</p>
    <div className="shell349-status-grid">
      <article className="shell349-status">
        <strong>Independent copied-ledger readback</strong>
        <p>{result?.readbackStatus ?? "HOLD — no evidence"}</p>
        <small>Copy digest plus separately pinned signer. Actual off-machine custody: NOT PROVEN</small>
      </article>
      <article className="shell349-status">
        <strong>Three-Master signed pilot claims</strong>
        <p>{result?.peerPilotStatus ?? "HOLD — no evidence"}</p>
        <small>Three separate signatures are not proof of an independently observed live peer</small>
      </article>
      <article className="shell349-status">
        <strong>Original host automatic recovery</strong>
        <p>HOLD — unattended boot not physically witnessed</p>
        <small>Home Assistant guest, MQTT, cameras and backup still need live supervised tests</small>
      </article>
      <article className="shell349-status">
        <strong>QL-340C Comms TEST receiver</strong>
        <p>UNAUTHORIZED · no activation controls</p>
        <small>Independent original-host physical OFF confirmation also pending</small>
      </article>
    </div>
    <h4>Feature coverage progress (source estimates)</h4>
    <p>Previous: <strong>68%</strong>. Build 364 estimate:
      <strong> 73% (+5 percentage points)</strong> after source release checks.
      Actual field acceptance remains <strong>25%</strong> and estimated
      overall readiness <strong>56%</strong>. Not a 24/7 runtime certificate.</p>
    <h4>Individual Master pilot acceptance</h4>
    <div className="shell349-status-grid">
      {(result?.workerReviews ?? []).map(worker =>
        <article key={worker.worker} className="shell349-status">
          <strong>{worker.worker}</strong>
          <p>{worker.readOnlySignedClaimStatus}</p>
          <small>Live connected: NO · Owner-approved install: NO · Independent rollback: NO</small>
        </article>)}
    </div>
    <SevenAppSysop365Panel />
  </section>;
}
