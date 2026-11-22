import { useEffect, useMemo, useState } from "react";
import {
  getCameraReliability375, inspectCameraReliability375,
  bindCameraReliability375, type AuthRole,
  type CameraReliability375Report, type CameraReliability375Inspection,
} from "./api";

/** No video, credential reads, automatic polling or device actuation. */
export function CameraReliability375({ role }: { role: AuthRole }) {
  const [report, setReport] = useState<CameraReliability375Report | null>(null);
  const [result, setResult] = useState<CameraReliability375Inspection | null>(null);
  const [cameraId, setCameraId] = useState("");
  const [frigateName, setFrigateName] = useState("");
  const [kind, setKind] = useState<"camera" | "doorbell">("camera");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (role !== "owner") return;
    let active = true;
    void getCameraReliability375().then(value => {
      if (active) setReport(value);
    }).catch(() => {
      if (active) setMessage("Private camera reliability report unavailable.");
    });
    return () => { active = false; };
  }, [role]);

  const selected = useMemo(() =>
    report?.bindings.find(item => item.cameraId === Number(cameraId)),
    [report, cameraId]);

  async function inspect() {
    setBusy(true);
    setMessage("");
    setResult(null);
    try {
      const next = await inspectCameraReliability375();
      setResult(next);
      setReport(await getCameraReliability375());
      if (next.state !== "LOCAL_API_RESPONDED") {
        setMessage("Frigate source on HOLD. Missing events do not mean zero activity.");
      }
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Private inspection failed.");
    } finally {
      setBusy(false);
    }
  }

  async function decide(active: boolean) {
    if (!cameraId || !frigateName) return;
    const prompt = active
      ? "Store this LOCAL identity mapping? No doorbell pairing, video control or provider write occurs."
      : "Deactivate this LOCAL mapping? The device remains connected in its provider.";
    if (!window.confirm(prompt)) return;
    setBusy(true);
    try {
      await bindCameraReliability375({
        camera_id: Number(cameraId),
        frigate_name: frigateName,
        role: kind,
        active,
        expected_revision: selected?.revision ?? 0,
        owner_confirmed: true,
      });
      setReport(await getCameraReliability375());
      setResult(null);
      setMessage("Owner mapping updated locally. Re-inspect to see current source data.");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Local mapping failed.");
    } finally {
      setBusy(false);
    }
  }

  if (role !== "owner") return null;
  return <section className="panel" id="camera-reliability-375"
    aria-label="Camera and doorbell event reliability">
    <header className="device-registry-heading">
      <div>
        <p className="eyebrow">Build 375 · Cameras, doorbells and event reliability</p>
        <h2>Source health, event freshness and physical video evidence</h2>
        <p>One-shot local Frigate and existing go2rtc/ONVIF health comparison.
          Producer health and Frigate events are not proof of moving video.</p>
      </div>
      <button type="button" disabled={busy} onClick={() => void inspect()}>
        {busy ? "Inspecting…" : "Inspect reliability"}
      </button>
    </header>
    <p>Previous observation: {report?.history[0]?.capturedAt
      ? new Date(report.history[0].capturedAt).toLocaleString() : "none"} ·
      {" "}{report?.state.replaceAll("_", " ") ?? "unknown"}.</p>
    <p><strong>Physical video, sound and doorbell chime acceptance: FIELD HOLD.</strong>
      No camera commands, recording changes or external vendor login will run.</p>
    {message && <p role="status" className="runtime-status">{message}</p>}
    {!result ? <p role="status">Current sources have not been inspected in this view.
      Old observations are not live availability proof.</p> : <>
      <p role="status">Checked {new Date(result.checkedAt).toLocaleString()} ·
        {" "}{result.registeredCameras} registered camera(s) ·
        {" "}Frigate {result.state.replaceAll("_", " ")} ·
        {" "}go2rtc transport {result.transportOnline ? "online" : "unavailable"}.
      </p>
      <p>Event read: {result.events.readAvailable ? "available" : "unavailable"} ·
        {" "}accepted {result.events.accepted ?? "unknown"} ·
        {" "}invalid {result.events.invalid ?? "unknown"} ·
        {" "}future timestamps {result.events.futureTimestamps ?? "unknown"}.</p>
      <div className="ha-entity-list" aria-label="Frigate source reliability">
        {result.sourceCameras.map(item => <article className="ha-entity-card"
          key={item.name}>
          <h3>{item.name}</h3>
          <p>{item.eventState.replaceAll("_", " ")} ·
            {" "}detection {item.detectEnabled ? "enabled" : "disabled"} ·
            {" "}recording {item.recordEnabled ? "enabled" : "disabled"}</p>
          <p>Recent event metadata: {item.recentEventCount} ·
            {" "}Latest: {item.latestEventEpoch === null ? "none" :
              new Date(item.latestEventEpoch * 1000).toLocaleString()}</p>
          <p>Local owner binding: {item.ownerBoundCameraId ?? "not matched"} ·
            {" "}Role: {item.ownerRole ?? "unverified"}</p>
          <p>Clip/snapshot flags: {item.clipFlagCount} / {item.snapshotFlagCount}.
            Flags do not prove media playback.</p>
        </article>)}
      </div>
      <div className="ha-entity-list" aria-label="Registered camera probe history">
        {result.localCameras.map(item => <article className="ha-entity-card"
          key={item.cameraId}>
          <h3>{item.name}</h3>
          <p>Registered #{item.cameraId} · probe {item.probeState.replaceAll("_", " ")}
            {" "}· last probe age {item.probeAgeSeconds ?? "unknown"} seconds.</p>
          <p>Actual moving video: not verified.</p>
        </article>)}
      </div>
      <section className="panel" aria-label="Local camera source binding">
        <h3>Owner-reviewed identity mapping</h3>
        <p>Choose exact registered and Frigate identities. Doorbell is a LOCAL
          classification, not proof of a vendor chime or app integration.</p>
        <label>Registered camera
          <select value={cameraId} onChange={event => {
            setCameraId(event.target.value);
            const match = report?.bindings.find(x =>
              x.cameraId === Number(event.target.value));
            setFrigateName(match?.frigateName ?? "");
            setKind(match?.role ?? "camera");
          }}>
            <option value="">Choose registered camera</option>
            {result.localCameras.map(item =>
              <option key={item.cameraId} value={item.cameraId}>
                {item.name} (#{item.cameraId})
              </option>)}
          </select>
        </label>
        <label>Frigate source
          <select value={frigateName} onChange={event => setFrigateName(event.target.value)}>
            <option value="">Choose exact Frigate source</option>
            {result.sourceCameras.map(item => <option key={item.name}
              value={item.name}>{item.name}</option>)}
          </select>
        </label>
        <label>Local classification
          <select value={kind} onChange={event =>
            setKind(event.target.value as "camera" | "doorbell")}>
            <option value="camera">Camera</option>
            <option value="doorbell">Doorbell candidate</option>
          </select>
        </label>
        <button type="button" disabled={busy || !cameraId || !frigateName ||
          (selected?.active ?? false)} onClick={() => void decide(true)}>
          Save local mapping
        </button>
        {" "}
        <button type="button" disabled={busy || !selected?.active}
          onClick={() => void decide(false)}>Deactivate local mapping</button>
      </section>
    </>}
    <p>Frigate integration is localhost-only. Recording, clips, raw streams,
      webhook subscriptions and vendor-only doorbell pairing are unchanged.
      Lack of events may simply mean a quiet scene.</p>
  </section>;
}
