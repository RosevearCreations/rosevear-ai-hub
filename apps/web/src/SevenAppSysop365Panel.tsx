import { useCallback, useEffect, useRef, useState } from "react";
import { getSysop365, type Sysop365Snapshot } from "./api";

const IDs = [
  "ai-data-platform",
  "rosevear-ai-hub",
  "rosevear-comms-hub",
  "yw",
  "icamp",
  "rosiedazzlers",
  "devilndove",
];
const labels: Record<string, string> = {
  "ai-data-platform": "AI Data Platform · Master",
  "rosevear-ai-hub": "Rosevear AI Hub · Original Windows Master",
  "rosevear-comms-hub": "Rosevear Comms Hub · Master",
  "yw": "Yard Workers · Governed Slave Shell",
  "icamp": "iCamp · Governed Slave Shell",
  "rosiedazzlers": "Rosie Dazzlers · Business application",
  "devilndove": "Devil n Dove · Business application",
};

export function trustedSysop365(value: unknown): value is Sysop365Snapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  if (
    r.schema !== "rosevear.hub.sysop-seven-app365.v1" ||
    r.sourceBuild !== 365 ||
    r.serverShell !== "ai-data-platform" ||
    r.originalHost !== "DESKTOP-AE894KC" ||
    r.verifiedLiveConnections !== 0 ||
    r.liveSevenAppStatisticsVerified !== false ||
    r.originalHostAutonomousBootVerified !== false ||
    r.commsPrivateReceiverAuthorized !== false ||
    r.webMutationAvailable !== false ||
    !Array.isArray(r.apps) ||
    r.apps.length !== 7 ||
    typeof r.acceptedSignedSourceSnapshots !== "number" ||
    r.acceptedSignedSourceSnapshots < 0 ||
    r.acceptedSignedSourceSnapshots > 7
  ) return false;
  return r.apps.every((item: Record<string, unknown>, index: number) =>
    item.appId === IDs[index] &&
    typeof item.accepted === "boolean" &&
    typeof item.reason === "string" &&
    item.connected === false &&
    (item.accepted !== true || (
      item.reason === "SIGNED_AGGREGATE_SOURCE_ONLY" &&
      item.liveAuthenticatedTransportVerified === false &&
      item.physicalRebootIndependentlyWitnessed === false &&
      typeof item.metrics === "object" && item.metrics !== null &&
      typeof item.sysop === "object" && item.sysop !== null
    )));
}

function measured(value: number | null | undefined): string {
  return value === null || value === undefined ? "Unmeasured" : value.toLocaleString();
}

export function SevenAppSysop365Panel() {
  const [model, setModel] = useState<Sysop365Snapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("No seven-app original-host statistics reviewed.");
  const controller = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setBusy(true);
    try {
      const result: unknown = await getSysop365(current.signal);
      if (controller.current !== current) return;
      if (!trustedSysop365(result)) {
        setModel(null);
        setMessage("HOLD_UNTRUSTED_SEVEN_APP_SYSOP_SOURCE");
      } else {
        setModel(result);
        setMessage("Read-only source snapshot review. No live peer connection is proven.");
      }
    } catch {
      if (controller.current === current) {
        setModel(null);
        setMessage("HOLD_ORIGINAL_HOST_STATISTICS_UNAVAILABLE");
      }
    } finally {
      if (controller.current === current) setBusy(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => controller.current?.abort();
  }, [refresh]);

  const rows: Sysop365Snapshot["apps"] = model?.apps ?? IDs.map(appId => ({
    appId, accepted: false, connected: false, reason: "HOLD_NOT_YET_REVIEWED",
  }));

  return <section id="sysop-seven-app365" className="mc-panel shell349"
    aria-label="Seven application source statistics and Sysop observations">
    <div className="shell349-toolbar">
      <div>
        <h3>Seven-app statistics & Sysop procedures · Build 365</h3>
        <p>Three Masters + two Slave Shells + two independent business applications.
          Signed source aggregates are not evidence of live authenticated delivery.</p>
      </div>
      <button type="button" disabled={busy} onClick={() => void refresh()}>
        {busy ? "Checking…" : "Refresh source statistics"}
      </button>
    </div>
    <p role="status">{message}</p>
    <p>Independently connected live sources: <strong>0 verified</strong>.
      Physical Windows unattended reboot: <strong>NOT VERIFIED</strong>.
      Private Comms receiver: <strong>NOT AUTHORIZED</strong>.</p>
    <div className="shell349-status-grid">
      {rows.map(app => <article key={app.appId} className="shell349-status">
        <strong>{labels[app.appId]}</strong>
        <p>{app.accepted ? "Signed source claim only" : app.reason}</p>
        <small>Live authenticated transport: NOT VERIFIED</small>
        {app.accepted && app.metrics && <div>
          <p>Requests: {measured(app.metrics.requests)} · Errors:
            {" "}{measured(app.metrics.serverErrors)}</p>
          <p>Jobs completed: {measured(app.metrics.jobsCompleted)} · Failed:
            {" "}{measured(app.metrics.jobsFailed)}</p>
          <p>Queue: {measured(app.metrics.queueDepth)} · p95:
            {" "}{measured(app.metrics.latencyP95Ms)} ms</p>
          <small>Sysop signed claim: {app.sysop?.eventKind ?? "Unknown"}.
            Actual physical reboot independently witnessed: NO</small>
        </div>}
      </article>)}
    </div>
    <p>Never interpret a missing statistic as zero. No browser restart, install, key
      enrollment, device operation or messaging activation is available here.</p>
  </section>;
}
