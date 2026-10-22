import { useEffect, useState, type ChangeEvent } from "react";

import {
  getCameraDashboard,
  getCameras,
  getHomeAssistantBrowser,
  getHomeAssistantStatus,
  type CameraDashboard,
  type CameraRecord,
  type HomeAssistantStatus,
} from "./api";
import {
  compareRecoverySnapshots,
  createRecoverySnapshot,
  parseRecoverySnapshot,
  type DeviceCameraSnapshot,
  type InventoryDelta,
} from "./deviceRecovery";

type EvidenceResult<T> = { kind: "available"; value: T } | { kind: "unknown"; reason: string };
type RecoveryState =
  | { kind: "loading" }
  | {
      kind: "ready";
      ha: EvidenceResult<HomeAssistantStatus>;
      cameras: EvidenceResult<CameraRecord[]>;
      dashboard: EvidenceResult<CameraDashboard>;
      snapshot: DeviceCameraSnapshot | null;
    };

const unknown = (reason: string): EvidenceResult<never> => ({ kind: "unknown", reason });

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

  async function refresh(signal?: AbortSignal) {
    setEvidence({ kind: "loading" });
    // Independent probes run in parallel; one unavailable subsystem cannot masquerade as zero devices.
    const [statusResult, cameraResult, dashboardResult] = await Promise.allSettled([
      getHomeAssistantStatus(signal),
      getCameras(signal),
      getCameraDashboard(signal),
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
      kind: "ready", ha, cameras, dashboard,
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
      setMessage(`Loaded previous inventory from ${snapshot.captured_at}. No devices or cameras were modified.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to read inventory file.");
    }
  }

  return (
    <section className="panel recovery-inventory" aria-label="Build 107 device and camera recovery evidence">
      <div className="ha-section-heading">
        <div>
          <p className="eyebrow">Build 107 · Read-only recovery</p>
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
        </>
      )}
    </section>
  );
}
