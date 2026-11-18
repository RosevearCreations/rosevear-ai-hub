import { useEffect, useRef, useState } from "react";
import { getServerShell362, type ServerShell362Snapshot } from "./api";
import { MasterCustody363Panel } from "./MasterCustody363Panel";

export function trustedHistory362(value: unknown): value is ServerShell362Snapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  const pilots = r.masterPilotReadiness as Record<string, unknown> | null;
  return r.schema === "rosevear.hub.ql471.signed-history-dashboard362.v1" &&
    r.sourceBuild === 362 && r.originalHost === "DESKTOP-AE894KC" &&
    r.serverShell === "ai-data-platform" &&
    r.signedClaimsAreLiveMeasurements === false &&
    r.signaturesReverifiedAtRead === false &&
    r.physicalUnattendedProductionGreen === false &&
    r.threeMasterWorkerProductionGreen === false &&
    r.commsPrivateReceiverAuthorized === false &&
    r.pilotInstallAuthorized === false &&
    r.webMutationAvailable === false &&
    (r.ledgerIntegrity === "HOLD_UNAVAILABLE" ||
      r.ledgerIntegrity === "LOCAL_HASH_CHAIN_ONLY_NOT_INDEPENDENTLY_ANCHORED") &&
    typeof r.historyCount === "number" && r.historyCount >= 0 &&
    r.historyCount <= 48 && Array.isArray(r.drills) && r.drills.length <= 12 &&
    typeof pilots === "object" && pilots !== null &&
    !Array.isArray(pilots) &&
    pilots["ai-data-platform"] === "HOLD_INDEPENDENT_OWNER_INSTALL_AND_SIGNED_ACK" &&
    pilots["rosevear-comms-hub"] ===
      "HOLD_INDEPENDENT_OWNER_INSTALL_AND_SIGNED_ACK" &&
    r.drills.every((d: Record<string, unknown>) =>
      typeof d.drillId === "string" &&
      d.physicalRecoveryIndependentlyVerified === false &&
      typeof d.eventsRecorded === "number" &&
      typeof d.pairedClaimTimeline === "boolean" &&
      Array.isArray(d.scopes));
}

export function SignedHistory362() {
  const [data, setData] = useState<ServerShell362Snapshot | null>(null);
  const [message, setMessage] = useState("No signed field history has been reviewed.");
  const [busy, setBusy] = useState(false);
  const current = useRef<AbortController | null>(null);

  async function refresh() {
    current.current?.abort();
    const controller = new AbortController();
    current.current = controller;
    setBusy(true);
    try {
      const result: unknown = await getServerShell362(controller.signal);
      if (current.current !== controller) return;
      if (!trustedHistory362(result)) {
        setData(null);
        setMessage("HOLD_INVALID_SIGNED_FIELD_HISTORY");
      } else {
        setData(result);
        setMessage(result.ledgerIntegrity === "HOLD_UNAVAILABLE"
          ? "No valid private history found on the original Windows host."
          : "Local hash-chain integrity checked. Original Ed25519 signatures are NOT reverified by this dashboard.");
      }
    } catch {
      if (current.current === controller) {
        setData(null);
        setMessage("HOLD_SIGNED_HISTORY_ENDPOINT_UNAVAILABLE");
      }
    } finally {
      if (current.current === controller) setBusy(false);
    }
  }

  useEffect(() => {
    void refresh();
    return () => current.current?.abort();
  }, []);

  return <section id="signed-history362" aria-label="QL-471 recovery field evidence">
    <div className="shell349-toolbar">
      <div>
        <h3>Signed field intake & recovery drill history · QL-471</h3>
        <p>Historical claims accepted by an offline verifier. Not proof of a current Windows
          login screen, authenticated Home Assistant/camera operation or live Master pilot.</p>
      </div>
      <button type="button" disabled={busy} onClick={() => void refresh()}>
        {busy ? "Reviewing…" : "Refresh history"}
      </button>
    </div>
    <p role="status">{message}</p>
    <div className="shell349-status-grid">
      <article className="shell349-status">
        <strong>Signed claim records</strong>
        <p>{data?.historyCount ?? 0} historical entries</p>
        <small>Evidence is stored outside the repository; private signing keys never enter this screen</small>
      </article>
      <article className="shell349-status">
        <strong>AI Data Platform independent worker</strong>
        <p>HOLD · Owner-approved pilot missing</p>
        <small>Installed identity, pinned mTLS, signed ACK and rollback independently required</small>
      </article>
      <article className="shell349-status">
        <strong>Comms Hub non-receiver worker</strong>
        <p>HOLD · No automatic enrollment</p>
        <small>QL-340C private TEST receiver remains unauthorized</small>
      </article>
      <article className="shell349-status">
        <strong>Original-host production</strong>
        <p>HOLD · Physical recovery unverified</p>
        <small>Successful GitHub builds and historical signed claims do not prove 24/7 operation</small>
      </article>
    </div>
    {data && <>
      <p>Local claim ledger: <strong>{data.ledgerIntegrity}</strong></p>
      {data.drills.length > 0 && <>
        <h4>Recovery drill records</h4>
        <div className="shell349-status-grid">
          {data.drills.map(drill => <article className="shell349-status" key={drill.drillId}>
            <strong>{drill.drillId}</strong>
            <p>{drill.eventsRecorded} recorded claims ·
              {drill.pairedClaimTimeline ? " paired BEFORE/AFTER claim timeline" : " incomplete timeline"}</p>
            <small>{drill.scopes.join(", ")} · Physical recovery: NOT VERIFIED</small>
            <p>Latest claimed observation: {drill.lastObservedAt ?? "Unknown"}</p>
          </article>)}
        </div>
      </>}
      <p>Local chain tip: <code>{data.latestChainHash ?? "NOT AVAILABLE"}</code>.
        Compare against an independently saved trusted anchor; the local hash chain
        alone cannot prove immutability.</p>
    </>}
  <MasterCustody363Panel />
  </section>;
}
