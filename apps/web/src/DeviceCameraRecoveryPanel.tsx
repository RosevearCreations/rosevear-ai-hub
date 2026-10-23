import { useEffect, useState, type ChangeEvent } from "react";

import {
  getCameraDashboard,
  getCameras,
  getHomeAssistantBrowser,
  getHomeAssistantStatus,
  getGo2RTCStatus,
  type CameraDashboard,
  type CameraRecord,
  type Go2RTCStatus,
  type HomeAssistantStatus,
} from "./api";
import {
  compareRecoverySnapshots,
  createRecoverySnapshot,
  parseRecoverySnapshot,
  type DeviceCameraSnapshot,
  type InventoryDelta,
} from "./deviceRecovery";
import {
  allowedDispositions,
  cameraPlaybackReadiness,
  createFieldReviewReport,
  missingFieldIdentities,
  type OwnerDisposition,
} from "./deviceFieldReconciliation";
import { DeviceCameraReceiptPanel } from "./DeviceCameraReceiptPanel";
import { DeviceCameraFollowUpPanel } from "./DeviceCameraFollowUpPanel";
import { DeviceCameraClosurePanel } from "./DeviceCameraClosurePanel";

type EvidenceResult<T> = { kind: "available"; value: T } | { kind: "unknown"; reason: string };
type RecoveryState =
  | { kind: "loading" }
  | {
      kind: "ready";
      ha: EvidenceResult<HomeAssistantStatus>;
      cameras: EvidenceResult<CameraRecord[]>;
      dashboard: EvidenceResult<CameraDashboard>;
      transport: EvidenceResult<Go2RTCStatus>;
      snapshot: DeviceCameraSnapshot | null;
    };

const unknown = (reason: string): EvidenceResult<never> => ({ kind: "unknown", reason });

const dispositionLabels: Record<OwnerDisposition, string> = {
  unreviewed: "Not reviewed",
  review_integration: "Review Home Assistant integration",
  review_discovery: "Review camera discovery/registration",
  check_offline: "Check device power or network",
  review_identity_change: "Compare renamed or replaced identity",
  confirmed_retired: "Owner confirms intentionally removed",
};

function Difference({ label, delta }: { label: string; delta: InventoryDelta }) {
  return (
    <div className="recovery-difference">
      <h3>{label}</h3>
      <p><strong>{delta.missing.length}</strong> missing from this reading · <strong>{delta.newItems.length}</strong> new</p>
      {delta.missing.length > 0 && (
        <details>
          <summary>Previously recorded, not visible now ({delta.missing.length})</summary>
          <ul>{delta.missing.slice(0, 30).map((item) => (
            <li key={item.id}>{item.name} <code>{item.id}</code></li>
          ))}</ul>
          {delta.missing.length > 30 && <p>Showing first 30. Exported snapshots retain the full list.</p>}
        </details>
      )}
      {delta.newItems.length > 0 && (
        <details>
          <summary>New identities ({delta.newItems.length})</summary>
          <ul>{delta.newItems.slice(0, 30).map((item) => (
            <li key={item.id}>{item.name} <code>{item.id}</code></li>
          ))}</ul>
        </details>
      )}
    </div>
  );
}

export function DeviceCameraRecoveryPanel() {
  const [evidence, setEvidence] = useState<RecoveryState>({ kind: "loading" });
  const [baseline, setBaseline] = useState<DeviceCameraSnapshot | null>(null);
  const [message, setMessage] = useState("");
  const [decisions, setDecisions] = useState<Record<string, OwnerDisposition>>({});
  const [seenLive, setSeenLive] = useState<string[]>([]);

  async function refresh(signal?: AbortSignal) {
    // Human acknowledgements belong to one set of evidence, never a later refresh.
    setDecisions({});
    setSeenLive([]);
    setEvidence({ kind: "loading" });
    // Independent probes run in parallel; one unavailable subsystem cannot masquerade as zero devices.
    const [statusResult, cameraResult, dashboardResult, transportResult] = await Promise.allSettled([
      getHomeAssistantStatus(signal),
      getCameras(signal),
      getCameraDashboard(signal),
      getGo2RTCStatus(signal),
    ]);
    if (signal?.aborted) return;

    const ha: EvidenceResult<HomeAssistantStatus> = statusResult.status === "fulfilled"
      ? { kind: "available", value: statusResult.value }
      : unknown("Home Assistant status could not be read.");
    const cameras: EvidenceResult<CameraRecord[]> = cameraResult.status === "fulfilled"
      ? { kind: "available", value: cameraResult.value }
      : unknown("Camera inventory request failed; camera count is unknown.");
    const dashboard: EvidenceResult<CameraDashboard> = dashboardResult.status === "fulfilled"
      ? { kind: "available", value: dashboardResult.value }
      : unknown("Camera transport/health request failed.");
    const transport: EvidenceResult<Go2RTCStatus> = transportResult.status === "fulfilled"
      ? { kind: "available", value: transportResult.value }
      : unknown("go2rtc listener safety cannot be confirmed.");

    let browser = null;
    if (ha.kind === "available" && ha.value.available) {
      try {
        browser = await getHomeAssistantBrowser(signal);
      } catch {
        // Connection green does not imply the registry API has returned a trustworthy inventory.
      }
    }
    if (signal?.aborted) return;
    setEvidence({
      kind: "ready", ha, cameras, dashboard, transport,
      snapshot: browser && cameras.kind === "available"
        ? createRecoverySnapshot(browser, cameras.value)
        : null,
    });
  }

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, []);

  const current = evidence.kind === "ready" ? evidence.snapshot : null;
  const comparison = baseline && current ? compareRecoverySnapshots(baseline, current) : null;
  const missing = comparison ? missingFieldIdentities(comparison) : [];
  const playback = evidence.kind === "ready" && evidence.cameras.kind === "available"
    ? cameraPlaybackReadiness(
      evidence.cameras.value,
      evidence.dashboard.kind === "available" ? evidence.dashboard.value : null,
      evidence.transport.kind === "available" ? evidence.transport.value : null,
    ) : [];

  function exportEvidence() {
    if (!current) return;
    const blob = new Blob([JSON.stringify(current, null, 2) + "\n"], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `rosevear-device-camera-inventory-${current.captured_at.slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(href);
    setMessage("Read-only inventory exported. Keep the file private; it contains household device names.");
  }

  async function importBaseline(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (file.size > 1_000_000) {
      setMessage("Inventory file is too large (1 MB maximum).");
      return;
    }
    try {
      const snapshot = parseRecoverySnapshot(await file.text());
      setBaseline(snapshot);
      setDecisions({});
      setSeenLive([]);
      setMessage(`Loaded previous inventory from ${snapshot.captured_at}. No devices or cameras were modified.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to read inventory file.");
    }
  }

  function exportFieldReview() {
    if (!baseline || !current) return;
    const report = createFieldReviewReport(baseline, current, decisions, playback, new Set(seenLive));
    const href = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2) + "\n"], {
      type: "application/json",
    }));
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `rosevear-supervised-field-review-${current.captured_at.slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(href);
    setMessage("Supervised review notes downloaded privately. They do not prove devices were restored or video was independently verified.");
  }

  return (
    <section className="panel recovery-inventory" aria-label="Build 108 supervised device and camera reconciliation">
      <div className="ha-section-heading">
        <div>
          <p className="eyebrow">Builds 107–108 · Read-only evidence and supervised review</p>
          <h2>Device & camera inventory recovery</h2>
          <p>Keep a private baseline, then compare after a reboot. An absent reading is not proof that a device was deleted.</p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={evidence.kind === "loading"}>
          {evidence.kind === "loading" ? "Checking…" : "Recheck inventory"}
        </button>
      </div>

      {evidence.kind === "loading" ? <p role="status">Reading Home Assistant and camera registries…</p> : (
        <>
          <div className="recovery-evidence-grid">
            <div>
              <h3>Home Assistant</h3>
              {evidence.ha.kind === "unknown" ? <p>{evidence.ha.reason}</p> : (
                <p>{evidence.ha.value.available ? "API online" : "API unavailable"} · {current
                  ? `${current.home_assistant.devices.length} devices, ${current.home_assistant.entities.length} entities`
                  : "device and entity counts unknown"}</p>
              )}
              {!current && <p>Check the VM, Home Assistant integrations, token and registry API. Do not interpret this as an empty inventory.</p>}
              {current && current.home_assistant.devices.length === 0 && (
                <p className="connection-guidance">Connected but the device registry is empty. Review <strong>Home Assistant → Settings → Devices & services</strong>, including Discovered integrations, before re-adding anything.</p>
              )}
            </div>
            <div>
              <h3>Camera registry</h3>
              {evidence.cameras.kind === "unknown" ? <p>{evidence.cameras.reason}</p> : (
                <p>{evidence.cameras.value.length} saved cameras</p>
              )}
              {evidence.dashboard.kind === "unknown" ? <p>{evidence.dashboard.reason}</p> : (
                <p>go2rtc {evidence.dashboard.value.transport_online ? "reachable" : "unavailable"} · {evidence.dashboard.value.configured} configured · {evidence.dashboard.value.healthy} healthy</p>
              )}
              {evidence.transport.kind === "unknown" && <p>{evidence.transport.reason}</p>}
              {evidence.transport.kind === "available" && (
                <p>Private transport listeners: {evidence.transport.value.local_api_only && evidence.transport.value.local_rtsp_only ? "both loopback-only" : "not confirmed safe"}</p>
              )}
              {evidence.cameras.kind === "available" && evidence.cameras.value.length === 0 && (
                <p className="connection-guidance">No cameras are registered in the Hub. go2rtc being online does not discover cameras. In <strong>Cameras</strong>, run ONVIF preview and accept selected discoveries together, or review existing camera worksheet/import evidence.</p>
              )}
            </div>
          </div>
          <div className="recovery-evidence-actions">
            <button type="button" onClick={exportEvidence} disabled={!current}>Download current inventory</button>
            <label>
              Compare against a previously downloaded inventory
              <input aria-label="Choose previous device camera inventory JSON" type="file" accept=".json,application/json" onChange={(event) => void importBaseline(event)} />
            </label>
          </div>
          {!current && <p role="note">Export is held until Home Assistant registry and camera inventory both load. Failed probes must never be recorded as zero.</p>}
          {message && <p role="status">{message}</p>}
          {comparison && (
            <div className="recovery-comparison" aria-label="Previous versus current device and camera identities">
              <h3>Compared with {baseline?.captured_at}</h3>
              <p>Missing means not reported by the current source, not erased. Review integrations or camera discovery before changing saved records.</p>
              <Difference label="Home Assistant devices" delta={comparison.devices} />
              <Difference label="Home Assistant entities" delta={comparison.entities} />
              <Difference label="Hub camera registrations" delta={comparison.cameras} />
            </div>
          )}
          {comparison && (
            <section className="recovery-field-review" aria-label="Owner review of missing device and camera identities">
              <h3>Build 108 — Supervised missing-identity review</h3>
              <p>Classify each missing identity using Home Assistant <strong>Settings → Devices & services</strong> or the Hub <strong>Cameras</strong> section. The snapshot does not identify which HA integration owns a missing entity. These selections record what to check, not that restoration happened.</p>
              {missing.length === 0 ? <p>No earlier identities are missing in this comparison.</p> : (
                <div className="recovery-review-list">
                  {missing.map((item) => (
                    <label className="recovery-review-item" key={item.key}>
                      <span>
                        <strong>{item.name}</strong>
                        <small>{item.source === "hub_camera" ? "Hub camera" : item.source === "ha_device" ? "HA device" : "HA entity"} · <code>{item.id}</code></small>
                      </span>
                      <select
                        aria-label={`${item.name} recovery disposition`}
                        value={decisions[item.key] ?? "unreviewed"}
                        onChange={(event) => setDecisions((previous) => ({
                          ...previous,
                          [item.key]: event.target.value as OwnerDisposition,
                        }))}
                      >
                        {allowedDispositions(item.source).map((choice) => (
                          <option key={choice} value={choice}>{dispositionLabels[choice]}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              )}
              <p role="status">{missing.filter((item) => (decisions[item.key] ?? "unreviewed") === "unreviewed").length} missing identities still need owner classification.</p>
            </section>
          )}
          {current && (
            <section className="recovery-field-review" aria-label="Individual camera playback field verification">
              <h3>Supervised camera playback checks</h3>
              <p>In <strong>Cameras</strong>, review ONVIF discoveries together, explicitly register selected cameras, configure their RTSP source and run a health probe. Then view <em>moving live video</em> for each camera before acknowledging it here. A healthy API response by itself does not prove playback.</p>
              {playback.length === 0 ? (
                <p>No saved cameras to test. Discovery and registration require separate owner approval in Cameras.</p>
              ) : (
                <div className="recovery-review-list">
                  {playback.map((camera) => (
                    <label key={camera.id} className="recovery-review-item">
                      <span>
                        <strong>{camera.name}</strong>
                        <small>{camera.reason}</small>
                        {camera.lastProbeAt && <small>Last probe: {camera.lastProbeAt}</small>}
                      </span>
                      <span className="recovery-playback-mark">
                        <input
                          type="checkbox"
                          aria-label={`Viewed moving live video: ${camera.name}`}
                          disabled={!camera.ready}
                          checked={camera.ready && seenLive.includes(camera.id)}
                          onChange={(event) => setSeenLive((previous) => event.target.checked
                            ? [...previous, camera.id]
                            : previous.filter((id) => id !== camera.id))}
                        />
                        I personally viewed moving video
                      </span>
                    </label>
                  ))}
                </div>
              )}
              <p role="status">{playback.filter((camera) => camera.ready && seenLive.includes(camera.id)).length} of {playback.length} registered cameras have a session-only operator playback acknowledgement. Refresh clears these marks.</p>
            </section>
          )}
          <div className="recovery-evidence-actions">
            <button type="button" onClick={exportFieldReview} disabled={!comparison}>
              Download supervised field review
            </button>
          </div>
          <p className="connection-guidance">No database restoration, integration enrollment, camera registration, stream configuration or physical control is performed by this review. Any missing backup or unverified stream remains a separate owner-supervised acceptance task.</p>
        </>
      )}
      <DeviceCameraReceiptPanel current={current} playback={playback} />
      <DeviceCameraFollowUpPanel current={current} playback={playback} />
      <DeviceCameraClosurePanel current={current} playback={playback} />
    </section>
  );
}
