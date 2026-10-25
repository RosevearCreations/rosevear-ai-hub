import { useEffect, useMemo, useRef, useState } from "react";

import {
  acceptCameraDiscovery, getCameras, getDeviceDiscoveryReviews, getDeviceRegistryReviews,
  getHomeAssistantBrowser, getMQTTStatus, previewCameraDiscovery, saveDeviceDiscoveryReview,
  type AuthRole, type CameraPreviewResult, type CameraRecord,
  type DeviceDiscoveryDecision, type DeviceDiscoveryReview, type DeviceRegistryReviews,
  type HomeAssistantBrowserResponse,
} from "./api";
import {
  compileDiscoveryCandidates, discoveryKey, isFreshDiscovery,
} from "./deviceDiscoveryInboxModel";

type Reading = {
  ha: HomeAssistantBrowserResponse | null;
  registry: DeviceRegistryReviews | null;
  cameras: CameraRecord[] | null;
  haObservedAt: string | null;
  mqttObservedAt: string | null;
  mqttAvailable: boolean | null;
};
type CameraReading = { data: CameraPreviewResult; observedAt: string };
const sourceNames = {
  ha_device: "Home Assistant device", ha_entity: "Home Assistant entity",
  mqtt: "Reviewed MQTT topic", camera_candidate: "ONVIF camera preview",
};

/** No passive scan on mount. Only an existing camera ticket can register hardware, disabled-first. */
export function DeviceDiscoveryInbox({ role }: { role: AuthRole }) {
  const canReview = role === "owner" || role === "administrator";
  const [reading, setReading] = useState<Reading | null>(null);
  const [cameraReading, setCameraReading] = useState<CameraReading | null>(null);
  const [reviews, setReviews] = useState<DeviceDiscoveryReview[]>([]);
  const [reviewsAvailable, setReviewsAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selectedKey, setSelectedKey] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [cameraAcknowledged, setCameraAcknowledged] = useState(false);
  const [message, setMessage] = useState("");
  const inflight = useRef<AbortController | null>(null);
  useEffect(() => () => inflight.current?.abort(), []);

  const candidates = useMemo(() => compileDiscoveryCandidates({
    browser: reading?.ha ?? null, registry: reading?.registry ?? null,
    cameras: reading?.cameras ?? null, cameraPreview: cameraReading?.data ?? null,
    reviews, haObservedAt: reading?.haObservedAt ?? null,
    mqttObservedAt: reading?.mqttObservedAt ?? null,
    cameraObservedAt: cameraReading?.observedAt ?? null,
  }), [reading, cameraReading, reviews]);
  const visible = candidates.filter((row) => (sourceFilter === "all" || row.source === sourceFilter) &&
    (!search.trim() || [row.name, row.source_id, row.room].some((value) =>
      value.toLowerCase().includes(search.trim().toLowerCase()))));
  const selected = candidates.find((row) => row.key === selectedKey) ?? null;
  const selectedReview = selected ? reviews.find((row) => discoveryKey(row.source, row.source_id) === selected.key) : undefined;
  const fresh = selected ? isFreshDiscovery(selected.observedAt, Date.now(),
    selected.source === "camera_candidate" ? cameraReading?.data.expires_in_seconds ?? 300 : 300) : false;
  const reviewedThisScan = !!(selected && selectedReview &&
    selectedReview.decision === "approved_for_followup" &&
    Date.parse(selectedReview.observed_at) === Date.parse(selected.observedAt));

  function invalidate() {
    setSelectedKey("");
    setAcknowledged(false);
    setCameraAcknowledged(false);
    setCameraReading(null);
  }

  async function beginRead() {
    if (busy || !canReview) return;
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    invalidate();
    setReading(null);
    setReviewsAvailable(false);
    setBusy(true);
    setMessage("");
    const result = await Promise.allSettled([
      getHomeAssistantBrowser(controller.signal), getDeviceRegistryReviews(controller.signal),
      getCameras(controller.signal), getMQTTStatus(controller.signal),
      getDeviceDiscoveryReviews(controller.signal),
    ]);
    if (controller.signal.aborted) return;
    const checkedAt = new Date().toISOString();
    const ha = result[0].status === "fulfilled" ? result[0].value : null;
    const registry = result[1].status === "fulfilled" ? result[1].value : null;
    const cameras = result[2].status === "fulfilled" ? result[2].value : null;
    const mqtt = result[3].status === "fulfilled" ? result[3].value : null;
    const saved = result[4].status === "fulfilled" ? result[4].value : null;
    setReading({ ha, registry, cameras, haObservedAt: ha ? checkedAt : null,
      mqttObservedAt: registry ? checkedAt : null, mqttAvailable: mqtt?.available ?? null });
    setReviews(saved ?? []);
    setReviewsAvailable(!!saved);
    setMessage(saved ? "Read-only inbox assembled. Each source reading is a hint, not proof of device function."
      : "Review records unavailable. View source hints only; no approvals or registration permitted.");
    setBusy(false);
    inflight.current = null;
  }

  async function scanCameras() {
    if (!canReview || !reading || busy) return;
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    invalidate();
    setBusy(true);
    setMessage("");
    try {
      const [cameras, data] = await Promise.all([
        getCameras(controller.signal), previewCameraDiscovery(controller.signal),
      ]);
      if (controller.signal.aborted) return;
      setReading((current) => current ? { ...current, cameras } : current);
      setCameraReading({ data, observedAt: new Date().toISOString() });
      setMessage(data.truncated
        ? "ONVIF preview truncated. No camera registered; rescan or inspect the camera registry before deciding."
        : "ONVIF preview complete. No camera registered. Select one exact candidate for review.");
    } catch {
      if (!controller.signal.aborted) setMessage("ONVIF preview unavailable. No camera registered; verify the private local network and permissions.");
    } finally {
      if (inflight.current === controller) {
        setBusy(false);
        inflight.current = null;
      }
    }
  }

  async function decide(decision: DeviceDiscoveryDecision) {
    if (!canReview || !reviewsAvailable || !selected || !fresh || !acknowledged || busy) return;
    if (decision === "approved_for_followup" && selected.source === "camera_candidate" && !selected.canRegisterCamera) {
      setMessage("Conflicting or registered cameras cannot be approved through this inbox.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const result = await saveDeviceDiscoveryReview({
        source: selected.source, source_id: selected.source_id, decision,
        observed_at: selected.observedAt, expected_revision: selectedReview?.revision ?? 0,
      });
      setReviews((prior) => [...prior.filter((row) => discoveryKey(row.source, row.source_id) !== selected.key), result]);
      setMessage(decision === "approved_for_followup"
        ? "Owner follow-up review saved. No HA/MQTT device was adopted, paired, configured or controlled."
        : "Owner disposition saved. No upstream device, integration or camera record was changed.");
    } catch {
      setMessage("Decision rejected or stale. Restart source discovery and verify this exact candidate before retrying.");
    } finally {
      setBusy(false);
      setAcknowledged(false);
      setCameraAcknowledged(false);
    }
  }

  async function registerCamera() {
    if (!canReview || busy || !cameraReading || !reading || !selected ||
      selected.source !== "camera_candidate" || !selected.canRegisterCamera ||
      !fresh || !reviewedThisScan || !cameraAcknowledged || !acknowledged) return;
    const before = cameraReading;
    const target = selected.source_id;
    setCameraReading(null); // Consume local attempt before awaiting; no double-click or replay.
    setSelectedKey("");
    setBusy(true);
    setMessage("");
    try {
      const now = await getCameras();
      const compared = compileDiscoveryCandidates({
        browser: reading.ha, registry: reading.registry, cameras: now,
        cameraPreview: before.data, reviews, haObservedAt: reading.haObservedAt,
        mqttObservedAt: reading.mqttObservedAt, cameraObservedAt: before.observedAt,
      }).find((item) => item.key === discoveryKey("camera_candidate", target));
      if (!isFreshDiscovery(before.observedAt, Date.now(), before.data.expires_in_seconds) ||
        !compared?.canRegisterCamera) throw new Error("Stale or duplicate camera candidate.");
      const outcome = await acceptCameraDiscovery(before.data.preview_token, [target]);
      setReading((current) => current ? { ...current, cameras: [...now, ...outcome.cameras] } : current);
      setMessage(outcome.created === 1
        ? "One reviewed camera registered DISABLED. No stream or device control started. Open Cameras for separate setup and owner field verification."
        : "No new camera registered. The exact UUID may already exist; refresh and inspect Cameras.");
    } catch {
      setMessage("Camera registration was not verified. Preview was consumed locally; start a new scan and check the current registry before retrying.");
    } finally {
      setBusy(false);
      setCameraAcknowledged(false);
      setAcknowledged(false);
    }
  }

  return <section className="panel discovery-inbox" aria-label="Guided device discovery inbox">
    <header className="device-registry-heading">
      <div>
        <p className="eyebrow">Build 140 · Explicit owner-started discovery</p>
        <h2>Guided device discovery inbox</h2>
        <p>Collect exact source candidates, inspect duplicates and decide one at a time. No scanning, pairing or camera enrollment occurs on page load.</p>
      </div>
      {canReview && <div className="discovery-inbox-actions">
        <button type="button" disabled={busy} onClick={() => void beginRead()}>{busy ? "Checking…" : "Start source inventory review"}</button>
        <button type="button" disabled={busy || !reading} onClick={() => void scanCameras()}>Scan ONVIF cameras (opt-in)</button>
      </div>}
    </header>
    <details className="device-registry-help">
      <summary>ⓘ Discovery, adoption &amp; privacy help</summary>
      <p>Home Assistant identities and reviewed MQTT topics are observations, not permission to pair or act. To enroll an HA device, use Home Assistant → Settings → Devices &amp; services, verify the supported integration, and then manually re-read the Hub inventory. MQTT mappings remain reviewed topics until a later authorized mapping workflow.</p>
      <p>Only a separate, explicitly confirmed ONVIF camera preview can be registered here. The existing backend issues a single-use, short-lived ticket and registers successful cameras disabled. Duplicate identifiers and endpoints are held; unknown source availability never implies zero devices.</p>
    </details>
    {!canReview && <p role="note">This account can view the device registry; starting discovery and recording decisions require an Owner or Administrator.</p>}
    {!reading && <p role="note">No discovery reading yet. Start a deliberate read to populate source candidates. This panel does not poll or scan automatically.</p>}
    {reading && <>
      <div className="device-registry-stats" aria-label="Guided discovery source status">
        <div><strong>{reading.ha ? "Read" : "Unknown"}</strong><span>Home Assistant source</span></div>
        <div><strong>{reading.registry ? "Read" : "Unknown"}</strong><span>Reviewed MQTT references · broker {reading.mqttAvailable === null ? "unverified" : reading.mqttAvailable ? "connected" : "offline"}</span></div>
        <div><strong>{cameraReading ? "Preview" : "Not scanned"}</strong><span>ONVIF candidates · opt-in only</span></div>
        <div><strong>{reviewsAvailable ? "Ready" : "HOLD"}</strong><span>Owner decision ledger</span></div>
      </div>
      <div className="device-registry-filters">
        <label>Search candidate<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, exact ID, room" /></label>
        <label>Source<select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
          <option value="all">All observed sources</option>
          {Object.entries(sourceNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
        </select></label>
      </div>
      <p role="status">{visible.length} source candidates. A possible duplicate warning is not a claim that identities belong to one device.</p>
      <div className="device-registry-layout">
        <div className="device-registry-results" role="region" aria-label="Discovery candidate list">
          {visible.length === 0 && <p>No observed candidates from available sources. A failed integration read is not evidence of an empty home.</p>}
          {visible.slice(0, 100).map((row) => <button type="button" key={row.key}
            aria-pressed={row.key === selectedKey} className={row.key === selectedKey ? "device-registry-selected" : ""}
            onClick={() => { setSelectedKey(row.key); setAcknowledged(false); setCameraAcknowledged(false); setMessage(""); }}>
            <strong>{row.name}</strong><span>{sourceNames[row.source]} · {row.room}</span>
            <span>{row.state} · {row.duplicateWarnings.length ? "⚠ Duplicate/identity review needed" : "Exact source reference"}</span>
          </button>)}
          {visible.length > 100 && <p>Showing 100 of {visible.length}; filter to narrow the list.</p>}
        </div>
        <section className="device-registry-detail" aria-label="Selected discovery candidate">
          {!selected ? <p>Select exactly one discovered or observed identity before any review.</p> : <>
            <h3>{selected.name}</h3>
            <dl>
              <div><dt>Source</dt><dd>{sourceNames[selected.source]}</dd></div>
              <div><dt>Exact identity</dt><dd><code>{selected.source_id}</code></dd></div>
              <div><dt>Owner room/source</dt><dd>{selected.room}</dd></div>
              <div><dt>Evidence</dt><dd>{selected.confidence.replaceAll("_", " ")}</dd></div>
              <div><dt>State</dt><dd>{selected.state}</dd></div>
              <div><dt>Reading</dt><dd>{selected.observedAt} · {fresh ? "within 5-minute review window" : "expired; rescan"}</dd></div>
              <div><dt>Previous decision</dt><dd>{selectedReview ? `${selectedReview.decision} · revision ${selectedReview.revision}` : "Unreviewed"}</dd></div>
            </dl>
            {selected.duplicateWarnings.length > 0 && <div className="discovery-inbox-warning" role="note">
              <strong>Identity collision warning</strong>
              <ul>{selected.duplicateWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
            </div>}
            {canReview && reviewsAvailable && <div className="device-registry-editor">
              <label className="discovery-inbox-ack"><input type="checkbox" checked={acknowledged}
                onChange={(event) => { setAcknowledged(event.target.checked); setCameraAcknowledged(false); }} />
                I reviewed this exact source ID and understand a local decision never pairs, merges or operates equipment.
              </label>
              <div className="device-registry-match-actions">
                <button type="button" disabled={busy || !fresh || !acknowledged ||
                  (selected.source === "camera_candidate" && !selected.canRegisterCamera)}
                  onClick={() => void decide("approved_for_followup")}>Approve for follow-up</button>
                <button type="button" disabled={busy || !fresh || !acknowledged} onClick={() => void decide("rejected")}>Reject candidate</button>
                <button type="button" disabled={busy || !fresh || !acknowledged} onClick={() => void decide("unsupported")}>Unsupported</button>
                <button type="button" disabled={busy || !fresh || !acknowledged} onClick={() => void decide("investigate")}>Investigate</button>
              </div>
              {selected.source === "camera_candidate" && selected.canRegisterCamera && reviewedThisScan && <>
                <label className="discovery-inbox-ack"><input type="checkbox" checked={cameraAcknowledged}
                  onChange={(event) => setCameraAcknowledged(event.target.checked)} />
                  I independently checked this exact camera and authorize registering it DISABLED; this does not start streaming.
                </label>
                <button type="button" disabled={busy || !fresh || !acknowledged || !cameraAcknowledged}
                  onClick={() => void registerCamera()}>Register one reviewed camera disabled</button>
              </>}
              {selected.source !== "camera_candidate" && <p>Next: use the source's own authorized enrollment process. This inbox records review only.</p>}
            </div>}
          </>}
        </section>
      </div>
    </>}
    <details className="discovery-legacy-note"><summary>Legacy X10 / Meross compatibility guidance</summary>
      <p>X10 motion sensors, transceivers and pan/tilt camera mounts may need supported legacy hardware and an independently verified bridge. They do not automatically pair with Meross or Alexa here. If a Home Assistant-compatible bridge is available, configure it manually in Home Assistant, verify the exact device and then rescan this inbox. No direct X10-to-Meross automation has been implemented.</p>
    </details>
    <p><a href="#device-registry-360">Open Device 360 identity review</a> · <a href="#device-recovery-workbench">Open missing-device recovery</a></p>
    {message && <p className="device-registry-feedback" role="status">{message}</p>}
    <small>Source CI GREEN does not install software on the Windows Hub or certify household device function. Existing HA allowlists, camera registration permissions, MQTT policies and vault SECURITY HOLD remain unchanged.</small>
  </section>;
}
