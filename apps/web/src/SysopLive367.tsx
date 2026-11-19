import { useCallback, useEffect, useRef, useState } from "react";
import { getSysopLive367, type SysopLive367Snapshot } from "./api";

const IDS = [
  "ai-data-platform", "rosevear-ai-hub", "rosevear-comms-hub",
  "yw", "icamp", "rosiedazzlers", "devilndove",
];

export function trustedSysopLive367(value: unknown): value is SysopLive367Snapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  return r.schema === "rosevear.hub.live-sources367.v1" &&
    r.sourceBuild === 367 && r.originalHost === "DESKTOP-AE894KC" &&
    r.serverShell === "ai-data-platform" &&
    ["HOLD_NOT_ORIGINAL_HOST_OR_UNCONFIGURED", "HOLD_NO_VALID_TLS_RECEIPT_LEDGER",
      "LOCAL_TLS_SIGNED_SOURCE_RECEIPTS_ONLY"].includes(String(r.status)) &&
    Number.isSafeInteger(r.verifiedTlsSignedReceiptCount) &&
    (r.verifiedTlsSignedReceiptCount as number) >= 0 &&
    (r.verifiedTlsSignedReceiptCount as number) <= 2048 &&
    r.verifiedThreeMasterDeliveryAcks === 0 && r.threeMasterRuntimeGreen === false &&
    r.allSevenLiveConnected === false && r.commsPrivateReceiverAuthorized === false &&
    r.physicalBootIndependentlyWitnessed === false && r.webMutationsEnabled === false &&
    Array.isArray(r.sources) && r.sources.length === 7 &&
    r.sources.every((source: Record<string, unknown>, index: number) =>
      source.appId === IDS[index] &&
      Number.isSafeInteger(source.receiptCount) &&
      (source.receiptCount as number) >= 0 &&
      (source.receiptCount as number) <= 2048 &&
      (source.lastTlsSignedReceiptMs === null ||
        (typeof source.lastTlsSignedReceiptMs === "number" &&
          Number.isSafeInteger(source.lastTlsSignedReceiptMs))) &&
      typeof source.freshTlsSignedSourceOnly === "boolean");
}

export function SysopLive367() {
  const [data, setData] = useState<SysopLive367Snapshot | null>(null);
  const [message, setMessage] = useState("No operator-verified private TLS source receipts reviewed.");
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    request.current?.abort();
    const current = new AbortController();
    request.current = current;
    setBusy(true);
    try {
      const result: unknown = await getSysopLive367(current.signal);
      if (request.current !== current) return;
      if (!trustedSysopLive367(result)) {
        setData(null);
        setMessage("HOLD_UNTRUSTED_LIVE_SOURCE_READBACK");
      } else {
        setData(result);
        setMessage(result.status === "LOCAL_TLS_SIGNED_SOURCE_RECEIPTS_ONLY"
          ? "Private TLS and Ed25519 source receipts observed. Master delivery ACKs are NOT verified."
          : "HOLD: Sources are not enrolled or no validated private TLS receipt journal exists.");
      }
    } catch {
      if (request.current === current) {
        setData(null);
        setMessage("HOLD_SYSOP367_READBACK_UNAVAILABLE");
      }
    } finally {
      if (request.current === current) setBusy(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => request.current?.abort();
  }, [refresh]);

  return <section id="sysop-live367" aria-label="Original-host private signed telemetry receipts">
    <div className="shell349-toolbar">
      <div>
        <h3>Private source enrollment & signed receipt inspection · Build 367</h3>
        <p>One-pass original-host read-only collector. Each source requires its own pinned
          public signing key, expected commit and approved private TLS CA.
          This screen NEVER enrolls peers, sends messages or controls devices.</p>
      </div>
      <button type="button" disabled={busy} onClick={() => void refresh()}>
        {busy ? "Checking…" : "Refresh transport receipts"}
      </button>
    </div>
    <p role="status">{message}</p>
    <p>Private TLS + signed source receipts: <strong>{data?.verifiedTlsSignedReceiptCount ?? 0}</strong>.
      Independently verified three-Master delivery ACKs: <strong>0</strong>.
      Three-Master connection: <strong>HOLD</strong>.</p>
    <div className="shell349-status-grid">
      {(data?.sources ?? IDS.map(appId => ({
        appId, receiptCount: 0, lastTlsSignedReceiptMs: null,
        freshTlsSignedSourceOnly: false,
      }))).map(source => <article className="shell349-status" key={source.appId}>
        <strong>{source.appId}</strong>
        <p>{source.receiptCount} persisted TLS + signature receipt(s)</p>
        <small>Latest: {source.lastTlsSignedReceiptMs === null ? "Not observed" :
          new Date(source.lastTlsSignedReceiptMs).toLocaleString()}</small>
        <p>{source.freshTlsSignedSourceOnly
          ? "Fresh TLS signed source read — not a Master ACK"
          : "HOLD: No current verified transport receipt"}</p>
      </article>)}
    </div>
    <p>No physical reboot witness, private Comms receiver activation, seven-app CONNECTED
      status, or operator permission is inferred from a TLS GET. Missing sources stay HOLD.</p>
  </section>;
}
