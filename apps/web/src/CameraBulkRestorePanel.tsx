import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import { acceptCameraDiscovery, getCameras, previewCameraDiscovery, type CameraPreviewResult, type CameraRecord } from "./api";
import {
  assessCameraRestore, createCameraRestoreReceipt, importCameraPriorEvidence,
  type CameraPriorEvidence,
} from "./cameraBulkRestore";

interface Reading {
  registry: CameraRecord[];
  preview: CameraPreviewResult;
  scannedAt: string;
}

/** Session-only operator comparison. The only write is an independently confirmed, one-time server ticket. */
export function CameraBulkRestorePanel() {
  const [prior, setPrior] = useState<CameraPriorEvidence | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [verifiedHardware, setVerifiedHardware] = useState(false);
  const [receipt, setReceipt] = useState<ReturnType<typeof createCameraRestoreReceipt> | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const inflight = useRef<AbortController | null>(null);

  useEffect(() => () => inflight.current?.abort(), []);

  const rows = useMemo(() => prior && reading
    ? assessCameraRestore(prior, reading.registry, reading.preview.candidates) : [], [prior, reading]);
  const restorable = rows.filter((row) => row.status === "restore_candidate");

  function clearReview() {
    setReading(null);
    setSelected([]);
    setVerifiedHardware(false);
    setReceipt(null);
  }

  async function importPrior(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    inflight.current?.abort();
    inflight.current = null;
    setBusy(false);
    clearReview();
    try {
      if (file.size > 1_000_000) throw new Error("Camera evidence exceeds 1 MB.");
      const parsed = importCameraPriorEvidence(await file.text());
      setPrior(parsed);
      setMessage(`Imported ${parsed.cameras.length} prior camera identities. Run a fresh ONVIF review explicitly.`);
    } catch (error) {
      setPrior(null);
      setMessage(error instanceof Error ? error.message : "Invalid camera evidence.");
    }
  }

  async function scan() {
    if (!prior || busy) return;
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    clearReview();
    setBusy(true);
    setMessage("");
    try {
      const [registry, preview] = await Promise.all([
        getCameras(controller.signal), previewCameraDiscovery(controller.signal),
      ]);
      if (controller.signal.aborted) return;
      const scannedAt = new Date().toISOString();
      if (Date.parse(scannedAt) <= Date.parse(prior.sourceAt)) {
        throw new Error("Current discovery is not later than the imported evidence.");
      }
      setReading({ registry, preview, scannedAt });
      setMessage("Fresh registry and private ONVIF discovery compared. No camera has been registered.");
    } catch (error) {
      if (!controller.signal.aborted) {
        setMessage(error instanceof Error ? error.message : "Camera registry or discovery unavailable; counts are unknown.");
      }
    } finally {
      if (inflight.current === controller) {
        inflight.current = null;
        setBusy(false);
      }
    }
  }

  function fresh(): boolean {
    if (!reading) return false;
    const age = Date.now() - Date.parse(reading.scannedAt);
    return Number.isFinite(age) && age >= -60_000 && age < Math.min(300, reading.preview.expires_in_seconds) * 1000;
  }

  async function registerSelected() {
    if (!prior || !reading || busy || !verifiedHardware || !fresh() || !selected.length ||
      selected.some((uuid) => !restorable.some((row) => row.candidate.endpoint_uuid === uuid))) {
      setMessage("Selection is no longer valid. Restart a fresh camera discovery review.");
      return;
    }
    const before = reading;
    const chosen = [...selected];
    clearReview(); // one local attempt only, including double-clicks
    setBusy(true);
    setMessage("");
    try {
      const current = await getCameras();
      const refreshed = assessCameraRestore(prior, current, before.preview.candidates);
      if (!freshAt(before) || chosen.some((uuid) =>
        refreshed.find((row) => row.candidate.endpoint_uuid === uuid)?.status !== "restore_candidate")) {
        throw new Error("Camera registry changed or the discovery expired. No registration attempted; review again.");
      }
      const result = await acceptCameraDiscovery(before.preview.preview_token, chosen);
      const packet = createCameraRestoreReceipt(prior, before.scannedAt, new Date().toISOString(), chosen, result.cameras);
      setReceipt(packet);
      setMessage(`${result.created} camera(s) registered disabled. Download the private receipt and inspect actual hardware/video separately.`);
    } catch (error) {
      setMessage((error instanceof Error ? error.message : "Camera registration failed.") +
        " Any partial or externally concurrent change requires a fresh registry review; no feed was switched here.");
    } finally {
      setBusy(false);
    }
  }

  function downloadReceipt() {
    if (!receipt) return;
    const url = URL.createObjectURL(new Blob([`${JSON.stringify(receipt, null, 2)}\n`], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `rosevear-camera-restore-review-${receipt.reviewed_at.slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="panel recovery-inventory" aria-label="Build 115 camera recovery and bulk restore review">
      <p className="eyebrow">Build 115 · Operator-reviewed, no automatic restore</p>
      <h2>Camera discovery & bulk restore candidates</h2>
      <p>Import private previous identity evidence, explicitly run ONVIF discovery and compare exact endpoint IDs with the current Hub registry. Similar names or network addresses are <strong>not</strong> identity proof. Live feeds are never configured here.</p>
      <label className="recovery-receipt-upload">
        Import Build 107 camera inventory or Build 110 follow-up worklist JSON
        <input type="file" accept=".json,application/json" aria-label="Choose prior camera inventory or worklist JSON" onChange={(event) => void importPrior(event)} />
      </label>
      {prior && <p>{prior.cameras.length} prior camera identities · source {prior.sourceAt}. Imported evidence stays in this browser session.</p>}
      <button type="button" disabled={!prior || busy} onClick={() => void scan()}>{busy ? "Reviewing…" : "Compare fresh registry and ONVIF discovery"}</button>
      {message && <p role="status">{message}</p>}
      {reading && <>
        <p>{reading.preview.candidates.length} discovered · {restorable.length} eligible exact-ID restore candidates · {rows.length - restorable.length} held/skipped.</p>
        {reading.preview.truncated && <p role="alert">ONVIF results were bounded or excluded by private-network policy. Not seeing a camera does not prove it is offline.</p>}
        <p>Discovery at {reading.scannedAt}; server authorization is one-use and expires. Model hints are untrusted ONVIF labels: check the physical camera.</p>
        <div className="recovery-review-list">
          {rows.map((row) => (
            <div className="recovery-review-item" key={row.candidate.endpoint_uuid}>
              <label className="recovery-playback-mark">
                <input type="checkbox" aria-label={`Select camera restore ${row.candidate.display_name}`}
                  disabled={busy || row.status !== "restore_candidate" || !fresh()}
                  checked={selected.includes(row.candidate.endpoint_uuid)}
                  onChange={(event) => {
                    setVerifiedHardware(false);
                    setSelected((old) => event.target.checked ? [...new Set([...old, row.candidate.endpoint_uuid])] : old.filter((id) => id !== row.candidate.endpoint_uuid));
                  }} /> Restore
              </label>
              <span>
                <strong>{row.candidate.display_name}</strong>
                <small>Exact endpoint: <code>{row.candidate.endpoint_uuid}</code></small>
                <small>Previous name: {row.priorName ?? "not in evidence"} · ONVIF hardware label: {row.candidate.model_hint ?? "not reported"}</small>
                <small>{row.status.replaceAll("_", " ")}: {row.reason}</small>
              </span>
            </div>
          ))}
        </div>
        {restorable.length > 0 && <button type="button" disabled={busy || !fresh()} onClick={() => {
          setSelected(restorable.map((row) => row.candidate.endpoint_uuid));
          setVerifiedHardware(false);
        }}>Select all {restorable.length} exact-ID candidates</button>}
        {selected.length > 0 && <>
          <label className="recovery-playback-mark">
            <input type="checkbox" checked={verifiedHardware} disabled={busy || !fresh()}
              onChange={(event) => setVerifiedHardware(event.target.checked)} />
            I reviewed the {selected.length} selected physical camera(s), confirmed hardware/model identity, and authorize disabled-only registration (no stream changes).
          </label>
          <button type="button" disabled={!verifiedHardware || busy || !fresh()} onClick={() => void registerSelected()}>
            Register {selected.length} owner-approved camera{selected.length === 1 ? "" : "s"} disabled
          </button>
        </>}
        <p className="connection-guidance">Unmatched and conflicting cameras require individual investigation and fresh review. This workflow does not restore passwords, RTSP, go2rtc, HA integrations, old approvals or working video.</p>
      </>}
      {receipt && <button type="button" onClick={downloadReceipt}>Download private disabled-registration receipt</button>}
      <p role="note">Current Windows hardware, private stream and actual moving video remain unaccepted until separately owner-tested. GitHub CI GREEN is not field acceptance.</p>
    </section>
  );
}

function freshAt(reading: Reading): boolean {
  const age = Date.now() - Date.parse(reading.scannedAt);
  return Number.isFinite(age) && age >= -60_000 && age < Math.min(300, reading.preview.expires_in_seconds) * 1000;
}
