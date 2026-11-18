import { useCallback, useEffect, useRef, useState } from "react";
import { getServerShell363, type ServerShell363Snapshot } from "./api";
import { MasterReview364Panel } from "./MasterReview364Panel";

export function isTrustedReview363(value: unknown): value is ServerShell363Snapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  if (r.schema !== "rosevear.hub.ql472.anchor-and-drill-status363.v1" ||
      r.sourceBuild !== 363 || r.originalHost !== "DESKTOP-AE894KC" ||
      r.serverShell !== "ai-data-platform" ||
      r.offHostStorageIndependentlyVerified !== false ||
      r.physicalUnattendedProductionGreen !== false ||
      r.threeMasterWorkerProductionGreen !== false ||
      r.commsPrivateReceiverAuthorized !== false ||
      r.webMutationAvailable !== false ||
      !Array.isArray(r.workerReviews) || r.workerReviews.length !== 2 ||
      typeof r.rebootCorrelation !== "object" || r.rebootCorrelation === null) return false;
  const status = r.rebootCorrelation as Record<string, unknown>;
  return status.physicalRebootIndependentlyProven === false &&
    status.authenticatedGuestRuntimeIndependentlyProven === false &&
    r.workerReviews.every((worker: Record<string, unknown>) =>
      worker.pilotInstallAuthorized === false &&
      worker.sourceEvidenceMeansLivePeer === false &&
      worker.signedPeerAckIndependentlyVerified === false &&
      worker.rollbackIndependentlyWitnessed === false &&
      typeof worker.worker === "string" &&
      typeof worker.escalation === "string");
}

export function MasterCustody363Panel() {
  const [data, setData] = useState<ServerShell363Snapshot | null>(null);
  const [notice, setNotice] = useState("No independent custodian anchor has been reviewed.");
  const [busy, setBusy] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    try {
      const candidate: unknown = await getServerShell363(controller.signal);
      if (pending.current !== controller) return;
      if (!isTrustedReview363(candidate)) {
        setData(null);
        setNotice("HOLD_INVALID_QL472_READONLY_REVIEW");
      } else {
        setData(candidate);
        setNotice(candidate.anchorStatus);
      }
    } catch {
      if (pending.current === controller) {
        setData(null);
        setNotice("HOLD_NO_ORIGINAL_HOST_ANCHOR_REVIEW");
      }
    } finally {
      if (pending.current === controller) setBusy(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    return () => pending.current?.abort();
  }, [refresh]);

  return <section id="master-custody363" className="mc-panel shell349"
    aria-label="QL-472 independent evidence custody and Master review">
    <div className="shell349-toolbar">
      <div>
        <h3>Independent custody & original-host corroboration · QL-472</h3>
        <p>Signer verification and historical claims are not physical, off-host storage,
          unattended recovery, or authorized live service proof.</p>
      </div>
      <button type="button" disabled={busy} onClick={() => void refresh()}>
        {busy ? "Reviewing…" : "Refresh custody"}
      </button>
    </div>
    <p role="status">{notice}</p>
    <div className="shell349-status-grid">
      <article className="shell349-status">
        <strong>Independent anchor</strong>
        <p>{data?.independentCustodianSignatureVerified
          ? "Signed custodian statement verified" : "HOLD — no verified custodian statement"}</p>
        <small>Durable off-host copy: NOT INDEPENDENTLY VERIFIED</small>
      </article>
      <article className="shell349-status">
        <strong>Windows recovery timeline</strong>
        <p>{data?.rebootCorrelation.bootBoundaryChronologicallyCorrelated
          ? "Signed claims correlate with fresh UNSIGNED boot metadata" : "HOLD — incomplete evidence"}</p>
        <small>Actual unattended restart: NOT INDEPENDENTLY PROVEN</small>
      </article>
      <article className="shell349-status">
        <strong>Physical production</strong>
        <p>HOLD — original Windows host not accepted</p>
        <small>Code CI GREEN does not prove 24/7 operation</small>
      </article>
      <article className="shell349-status">
        <strong>Comms private TEST receiver</strong>
        <p>UNAUTHORIZED · actual OFF requires separate readback</p>
        <small>No browser control or automatic launch</small>
      </article>
    </div>
    {data && <>
      <p>Anchored history records: {data.historyEntryCount}. Signed anchor issued:
        {" "}{data.anchorIssuedAt ?? "UNAVAILABLE"}.</p>
      {data.anchorHeadSha256 && <p>Claim chain digest:
        <code>{data.anchorHeadSha256}</code></p>}
      <h4>Per-worker pilot review and escalation</h4>
      <div className="shell349-status-grid">
        {data.workerReviews.map(worker => <article className="shell349-status" key={worker.worker}>
          <strong>{worker.worker}</strong>
          <p>{worker.escalation.replaceAll("_", " ")}</p>
          <small>{worker.fieldClaimCount} historical claims · owner-approved pilot:
            NO · signed live ACK: NO · rollback witnessed: NO</small>
        </article>)}
      </div>
    </>}
    <MasterReview364Panel />
  </section>;
}
