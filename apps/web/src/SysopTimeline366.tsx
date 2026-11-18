import { useCallback, useEffect, useRef, useState } from "react";
import { getSysopHistory366, type SysopHistory366Snapshot } from "./api";

const IDS = [
  "ai-data-platform", "rosevear-ai-hub", "rosevear-comms-hub",
  "yw", "icamp", "rosiedazzlers", "devilndove",
];

export function trustedHistory366(value: unknown): value is SysopHistory366Snapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  return r.schema === "rosevear.hub.sysop-history366.v1" &&
    r.sourceBuild === 366 && r.originalHost === "DESKTOP-AE894KC" &&
    r.serverShell === "ai-data-platform" &&
    (r.journalStatus === "HOLD_NOT_ORIGINAL_HOST_OR_UNCONFIGURED" ||
      r.journalStatus === "HOLD_PRIVATE_LEDGER_INVALID_OR_MISSING" ||
      r.journalStatus === "LOCAL_SIGNED_CLAIM_HISTORY_ONLY") &&
    typeof r.historyCount === "number" && r.historyCount >= 0 &&
    r.historyCount <= 2048 &&
    r.liveConnectedSourceCount === 0 &&
    r.liveAuthenticatedTransportVerified === false &&
    r.physicalRebootIndependentlyWitnessed === false &&
    r.threeMasterRuntimeGreen === false &&
    r.commsPrivateReceiverAuthorized === false &&
    r.webMutationAvailable === false &&
    Array.isArray(r.sources) && r.sources.length === 7 &&
    Array.isArray(r.events) && r.events.length <= 24 &&
    r.sources.every((s: Record<string, unknown>, index: number) =>
      s.appId === IDS[index] && typeof s.recordCount === "number" &&
      s.recordCount >= 0 && typeof s.freshSignedSourceOnly === "boolean") &&
    r.events.every((e: Record<string, unknown>) =>
      IDS.includes(String(e.appId)) &&
      typeof e.eventKind === "string" &&
      typeof e.observedAtMs === "number" &&
      e.liveAuthenticatedTransportVerified === false &&
      e.physicalRebootIndependentlyWitnessed === false);
}

function readableDate(ms: number | null): string {
  return ms === null ? "Never" : new Date(ms).toLocaleString();
}

export function SysopTimeline366() {
  const [data, setData] = useState<SysopHistory366Snapshot | null>(null);
  const [message, setMessage] = useState("Signed historical source data not yet reviewed.");
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    controller.current?.abort();
    const next = new AbortController();
    controller.current = next;
    setBusy(true);
    try {
      const value: unknown = await getSysopHistory366(next.signal);
      if (controller.current !== next) return;
      if (!trustedHistory366(value)) {
        setData(null);
        setMessage("HOLD_UNTRUSTED_HISTORY_SOURCE");
      } else {
        setData(value);
        setMessage(value.journalStatus === "LOCAL_SIGNED_CLAIM_HISTORY_ONLY"
          ? "Private journal loaded. Signed-file evidence is NOT a live connection."
          : "HOLD: No valid original-host private Sysop history yet.");
      }
    } catch {
      if (controller.current === next) {
        setData(null);
        setMessage("HOLD_SYSOP_HISTORY_UNAVAILABLE");
      }
    } finally {
      if (controller.current === next) setBusy(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => controller.current?.abort();
  }, [refresh]);

  return <section id="sysop-history366" aria-label="Seven-app historical Sysop evidence">
    <div className="shell349-toolbar">
      <div>
        <h3>Signed Sysop history · Build 366</h3>
        <p>Operator-approved local journal. Seven source IDs; bounded, replay-resistant
          signed aggregates. This screen cannot ingest, reboot, connect or activate services.</p>
      </div>
      <button type="button" disabled={busy} onClick={() => void refresh()}>
        {busy ? "Reading…" : "Refresh history"}
      </button>
    </div>
    <p role="status">{message}</p>
    <p>Records: <strong>{data?.historyCount ?? 0}</strong> ·
      Live connections independently verified: <strong>0</strong> ·
      Autonomous original-host reboot: <strong>NOT VERIFIED</strong></p>
    <div className="shell349-status-grid">
      {data?.sources.map(s => <article className="shell349-status" key={s.appId}>
        <strong>{s.appId}</strong>
        <p>{s.recordCount} signed historical samples</p>
        <small>Latest claimed observation: {readableDate(s.lastClaimedAtMs)}</small>
        <p>{s.freshSignedSourceOnly ? "Recent signed file only" : "No fresh verified source"}</p>
      </article>)}
    </div>
    {!!data?.events.length && <>
      <h4>Recent Sysop claims — not independent physical witnesses</h4>
      <div className="shell349-status-grid">
        {data.events.map((e, i) => <article className="shell349-status"
          key={e.appId + ":" + e.observedAtMs + ":" + i}>
          <strong>{e.appId} · {e.eventKind}</strong>
          <p>{readableDate(e.observedAtMs)} · {e.claimedStatus}</p>
          <small>Process uptime: {e.processUptimeSec ?? "Unmeasured"} sec ·
            Restart count: {e.restartCount ?? "Unmeasured"}</small>
        </article>)}
      </div>
    </>}
    <p>Repeated valid signed files are rejected by unique event ID and nonce in the
      local journal. All values are aggregate claims, not measured live peer connectivity.
      Receiver QL-340C remains unauthorized.</p>
  </section>;
}
