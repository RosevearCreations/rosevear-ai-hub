import { useCallback, useEffect, useRef, useState } from "react";
import { getGovernedIntake384 } from "./api";

const IDS = [
  "ai-data-platform", "rosevear-ai-hub", "rosevear-comms-hub",
  "yw", "icamp", "rosiedazzlers", "devilndove",
] as const;

type Row384 = {
  appId: string;
  authority: string;
  status: string;
  historicalReceipts: number;
  samplesLast24Hours: number;
  latestClaimedState: string | null;
  latestClaimedAtMs: number | null;
  latestMetrics: Record<string, number | null> | null;
  reportedErrorFraction: number | null;
  freshSourceReceipt: boolean;
};

type Snapshot384 = {
  schema: string;
  sourceBuild: number;
  status: string;
  sources: Row384[];
  historicalCorrelatedReceipts: number;
  freshSignedReceipts: number;
  allSevenSourceReceiptsFresh: boolean;
  allSevenLiveConnected: false;
  threeMasterDeliveryAckProven: false;
  physicalOriginalHostWitnessed: false;
  commsPrivateReceiverAuthorized: false;
  mutationAvailable: false;
  tenantDataExposed: false;
};

export function trustedGovernance384(value: unknown): value is Snapshot384 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (v.schema !== "rosevear.hub.governed-intake384.v1" ||
      v.sourceBuild !== 384 ||
      !Array.isArray(v.sources) || v.sources.length !== 7 ||
      v.allSevenLiveConnected !== false ||
      v.threeMasterDeliveryAckProven !== false ||
      v.physicalOriginalHostWitnessed !== false ||
      v.commsPrivateReceiverAuthorized !== false ||
      v.mutationAvailable !== false || v.tenantDataExposed !== false ||
      typeof v.status !== "string" ||
      typeof v.historicalCorrelatedReceipts !== "number" ||
      typeof v.freshSignedReceipts !== "number" ||
      !Number.isInteger(v.freshSignedReceipts) ||
      v.freshSignedReceipts < 0 || v.freshSignedReceipts > 7 ||
      typeof v.allSevenSourceReceiptsFresh !== "boolean") return false;
  return v.sources.every((row: Record<string, unknown>, i: number) =>
    row.appId === IDS[i] &&
    typeof row.authority === "string" &&
    typeof row.status === "string" &&
    typeof row.historicalReceipts === "number" &&
    typeof row.samplesLast24Hours === "number" &&
    typeof row.freshSourceReceipt === "boolean" &&
    (row.latestClaimedState === null ||
      ["HEALTHY", "DEGRADED", "UNHEALTHY", "UNKNOWN"].includes(String(row.latestClaimedState))) &&
    (row.latestClaimedAtMs === null || typeof row.latestClaimedAtMs === "number") &&
    (row.latestMetrics === null ||
      (typeof row.latestMetrics === "object" && !Array.isArray(row.latestMetrics))) &&
    (row.reportedErrorFraction === null ||
      (typeof row.reportedErrorFraction === "number" &&
       row.reportedErrorFraction >= 0 && row.reportedErrorFraction <= 1)));
}

export function GovernedIntake384Panel() {
  const [data, setData] = useState<Snapshot384 | null>(null);
  const [message, setMessage] = useState("Seven-source governed analytics not yet reviewed.");
  const [busy, setBusy] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    try {
      const result: unknown = await getGovernedIntake384(controller.signal);
      if (pending.current !== controller) return;
      if (!trustedGovernance384(result)) {
        setData(null);
        setMessage("HOLD_UNTRUSTED_GOVERNANCE_SOURCE");
      } else {
        setData(result);
        setMessage(result.status);
      }
    } catch {
      if (pending.current === controller) {
        setData(null);
        setMessage("HOLD_GOVERNANCE_API_UNAVAILABLE");
      }
    } finally {
      if (pending.current === controller) setBusy(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    return () => pending.current?.abort();
  }, [refresh]);
  return <section className="mc-panel shell349" aria-label="Governed seven-source analytics">
    <div className="shell349-toolbar">
      <div>
        <h3>Seven-application governed analytics · Build 384</h3>
        <p>Only previously verified signed source claims correlated to stored
          authenticated private TLS collection receipts. No customer or tenant records.</p>
      </div>
      <button type="button" onClick={() => void refresh()} disabled={busy}>
        {busy ? "Reading…" : "Refresh local analytics"}
      </button>
    </div>
    <p role="status">{message}</p>
    <p>Correlated historical receipts: <strong>{data?.historicalCorrelatedReceipts ?? 0}</strong>
      {" · "}Fresh source receipts: <strong>{data?.freshSignedReceipts ?? 0}/7</strong>
      {" · "}Live end-to-end master ACK: <strong>NOT CERTIFIED</strong></p>
    <div className="shell349-status-grid">
      {data?.sources.map(s => <article key={s.appId} className="shell349-status">
        <strong>{s.appId}</strong>
        <small>{s.authority}</small>
        <p>{s.status}</p>
        <p>24h signed-and-TLS-correlated samples: {s.samplesLast24Hours}</p>
        <p>Latest claimed state: {s.latestClaimedState ?? "Unmeasured"}</p>
        <p>Latest queue: {s.latestMetrics?.queueDepth ?? "Unmeasured"}</p>
        <p>Latest source-reported error fraction: {
          s.reportedErrorFraction === null
            ? "Unmeasured" : (s.reportedErrorFraction * 100).toFixed(1) + "%"
        }</p>
      </article>)}
    </div>
    <p>These counts describe historical private collection receipts, not continuously
      connected services. The original Windows host, Comms receiver authorization,
      tenant permissions and live signed peer delivery have independent acceptance gates.</p>
  </section>;
}
