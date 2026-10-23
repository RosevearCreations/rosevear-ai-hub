import { useEffect, useState } from "react";

import { probeCameraStream, type CameraDashboard, type CameraRecord, type Go2RTCStatus } from "./api";
import { assessPrivatePlayback, cameraBinding } from "./cameraPlaybackReview";

type Evidence = {
  cameraId: number;
  binding: string;
  firstProbeAt: string;
  observedMovingVideo: boolean;
  recheckAt: string | null;
};

export function CameraPlaybackWorkbench({ cameras, dashboard, transport, canAdminister, onRefresh }: {
  cameras: CameraRecord[];
  dashboard: CameraDashboard | null;
  transport: Go2RTCStatus | null;
  canAdminister: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const selected = cameras.find((camera) => camera.id === selectedId);
  const currentBinding = selected ? cameraBinding(selected) : null;
  useEffect(() => {
    setEvidence(null);
    setPreviewOpen(false);
  }, [currentBinding]);
  const health = dashboard?.cameras.find((item) => item.camera_id === selectedId);
  const assessment = selected
    ? assessPrivatePlayback(selected, health, transport,
      typeof window === "undefined" ? "" : window.location.hostname,
      dashboard?.stale_after_seconds ?? 300)
    : null;
  const probeAssessment = selected
    ? assessPrivatePlayback(selected, health, transport,
      typeof window === "undefined" ? "" : window.location.hostname,
      dashboard?.stale_after_seconds ?? 300, Date.now(), true)
    : null;
  const matching = Boolean(selected && evidence && evidence.cameraId === selected.id &&
    evidence.binding === currentBinding);
  const accepted = matching && assessment?.ready && evidence?.observedMovingVideo && Boolean(evidence.recheckAt);

  async function runProbe(recheck: boolean) {
    if (!selected || !canAdminister || !(recheck ? assessment?.ready : probeAssessment?.ready) || (recheck && !matching)) return;
    const cameraId = selected.id;
    const binding = cameraBinding(selected);
    setBusy(true);
    setMessage("");
    try {
      const result = await probeCameraStream(cameraId);
      if (result.camera_id !== cameraId || result.status !== "online" || result.producer_count < 1 ||
          !Number.isFinite(Date.parse(result.probed_at))) {
        setEvidence(null);
        setPreviewOpen(false);
        setMessage("Probe did not prove an active producer. Acceptance is on hold.");
        return;
      }
      await onRefresh();
      if (recheck) {
        setEvidence((current) => current && current.cameraId === cameraId && current.binding === binding &&
          current.observedMovingVideo && Date.parse(result.probed_at) >= Date.parse(current.firstProbeAt)
          ? { ...current, recheckAt: result.probed_at } : null);
        setMessage("Recheck completed. Confirm the same stream is still shown and the evidence gate remains clear.");
      } else {
        setEvidence({ cameraId, binding, firstProbeAt: result.probed_at, observedMovingVideo: false, recheckAt: null });
        setMessage("Probe returned an active producer. Start the preview and personally check for moving video.");
      }
    } catch {
      setEvidence(null);
      setPreviewOpen(false);
      setMessage("Private probe failed. Check the Hub's local camera diagnostic screen; do not paste credentials here.");
    } finally {
      setBusy(false);
    }
  }

  function selectCamera(cameraId: number | null) {
    setSelectedId(cameraId);
    setEvidence(null);
    setPreviewOpen(false);
    setMessage("");
  }

  return (
    <section className="panel camera-acceptance-workbench" aria-label="Build 116 supervised playback acceptance">
      <div className="camera-acceptance-heading">
        <div>
          <p className="eyebrow">Build 116 · supervised field review</p>
          <h2>Private stream and playback acceptance</h2>
          <p>Select one recognized camera. This workbench never changes registration, RTSP settings, go2rtc configuration, or physical devices.</p>
        </div>
        <span className={accepted ? "camera-acceptance-pill is-reviewed" : "camera-acceptance-pill"}>
          {accepted ? "Session reviewed" : "Field acceptance on hold"}
        </span>
      </div>
      <div className="camera-acceptance-steps" aria-label="Acceptance sequence">
        <span>1. Identify</span><span>2. Private probe</span><span>3. View motion</span><span>4. Recheck</span>
      </div>
      <details className="camera-acceptance-help">
        <summary><span aria-hidden="true">i</span> How to verify a camera safely</summary>
        <ol>
          <li>Choose a camera we physically recognize. Leave newly registered, unverified cameras disabled.</li>
          <li>Check that go2rtc is loopback-only, then run the explicitly requested private probe.</li>
          <li>On the Windows Hub itself, start the private preview. Confirm recognizable, genuinely moving video; a green probe is not enough.</li>
          <li>Recheck the same stream, stop playback, and keep any failed or changed identity on hold. Checks are not saved as a production field receipt.</li>
        </ol>
      </details>
      <label className="camera-acceptance-select">
        Recognized camera
        <select value={selectedId ?? ""} onChange={(event) => selectCamera(event.target.value ? Number(event.target.value) : null)}>
          <option value="">Choose a registered camera…</option>
          {cameras.map((camera) => <option key={camera.id} value={camera.id}>{camera.display_name} (#{camera.id})</option>)}
        </select>
      </label>
      {selected ? (
        <>
          <p className={assessment?.ready ? "camera-acceptance-note" : "camera-acceptance-hold"} role="status">
            {assessment?.ready ? "Private readiness: " : "Hold: "}{assessment?.reason}
          </p>
          {!matching && evidence ? <p className="camera-acceptance-hold">Camera identity changed since the check. Start a new supervised review.</p> : null}
          {canAdminister ? (
            <div className="camera-actions">
              <button type="button" disabled={busy || !probeAssessment?.ready} onClick={() => void runProbe(false)}>
                {busy ? "Checking…" : "Run a fresh private probe"}
              </button>
              <button type="button" disabled={!assessment?.ready || !matching || !evidence?.firstProbeAt}
                onClick={() => setPreviewOpen((current) => !current)}>
                {previewOpen ? "Stop private preview" : "Start private preview"}
              </button>
            </div>
          ) : <p>Owner or Administrator must perform the supervised acceptance actions.</p>}
          {previewOpen && assessment?.ready && matching && assessment.viewerUrl ? (
            <div className="camera-acceptance-video">
              <iframe src={assessment.viewerUrl} title={selected.display_name + " supervised private preview"}
                sandbox="allow-scripts allow-same-origin" referrerPolicy="no-referrer" />
              <p>Private Windows-server browser only. Stop preview when finished. An API status or still image is not proof of moving video.</p>
            </div>
          ) : null}
          {canAdminister && matching ? (
            <>
              <label className="camera-acceptance-check">
                <input type="checkbox" disabled={!previewOpen || !assessment?.ready || busy}
                  checked={Boolean(evidence?.observedMovingVideo)}
                  onChange={(event) => setEvidence((current) => current ? {
                    ...current, observedMovingVideo: event.target.checked, recheckAt: null,
                  } : null)} />
                I personally observed real, moving video from this exact camera on the installed Windows Hub.
              </label>
              <button type="button" disabled={busy || !previewOpen || !evidence?.observedMovingVideo || !assessment?.ready}
                onClick={() => void runProbe(true)}>Recheck this same private stream</button>
            </>
          ) : null}
          {accepted ? (
            <p className="camera-acceptance-note" role="status">Session-only operator observation complete for {selected.display_name}. This is not a persisted owner receipt or confirmation of a separate Windows installation.</p>
          ) : <p>Acceptance remains on hold until private transport, recent probes, and observed moving video all agree.</p>}
          {message ? <p role="status">{message}</p> : null}
        </>
      ) : <p>No camera selected. Cameras added through discovery stay disabled until we manually review them.</p>}
      <p className="camera-acceptance-privacy">Privacy: no RTSP source address, password, clip, screenshot, stream URL, or acceptance receipt is exported or stored by this workbench. Evidence clears on camera change or reload.</p>
    </section>
  );
}
