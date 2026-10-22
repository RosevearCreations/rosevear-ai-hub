import { useState, type ChangeEvent } from "react";

import type { DeviceCameraSnapshot } from "./deviceRecovery";
import type { CameraPlaybackReadiness } from "./deviceFieldReconciliation";
import {
  buildRecoveryFollowUpQueue,
  createRecoveryFollowUpReceipt,
  parseOwnerAcceptanceReceipt,
  validateOwnerIntegrationName,
  type FollowUpStage,
  type OwnerAcceptanceReceipt,
} from "./deviceRecoveryFollowUps";

type LocalReview = {
  snapshotAt: string | null;
  integrationGroups: Record<string, string>;
  checkedIdentities: string[];
  observedVideo: string[];
};
type LocalSelection = { snapshotAt: string | null; keys: string[] };

const emptyReview = (snapshotAt: string | null): LocalReview => ({
  snapshotAt, integrationGroups: {}, checkedIdentities: [], observedVideo: [],
});

const stageLabels: Record<FollowUpStage, string> = {
  ha_integration: "Missing HA integration/device evidence",
  ha_owner_check: "Reappeared HA identities needing owner function checks",
  camera_registration: "Camera discovery and registration",
  camera_stream: "Camera source, transport and stream health",
  camera_playback: "Fresh human live-playback observations",
};

const stages = Object.keys(stageLabels) as FollowUpStage[];

/** Operates only on private local evidence and GET-derived snapshots. Never writes to HA or camera APIs. */
export function DeviceCameraFollowUpPanel({
  current, playback,
}: {
  current: DeviceCameraSnapshot | null;
  playback: CameraPlaybackReadiness[];
}) {
  const [receipt, setReceipt] = useState<OwnerAcceptanceReceipt | null>(null);
  const [review, setReview] = useState<LocalReview>(emptyReview(null));
  const [selection, setSelection] = useState<LocalSelection>({ snapshotAt: null, keys: [] });
  const [integration, setIntegration] = useState("");
  const [message, setMessage] = useState("");
  const currentAt = current?.captured_at ?? null;
  const selected = selection.snapshotAt === currentAt ? selection.keys : [];
  const effectiveReview = review.snapshotAt === currentAt ? review : emptyReview(currentAt);
  const queue = receipt && current ? buildRecoveryFollowUpQueue(
    receipt, current, playback, effectiveReview.integrationGroups,
    new Set(effectiveReview.checkedIdentities), new Set(effectiveReview.observedVideo),
  ) : null;
  const canReview = Boolean(queue?.laterReading && queue.freshReading);

  async function importOwnerReceipt(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (file.size > 1_000_000) {
      setReceipt(null);
      setReview(emptyReview(null));
      setSelection({ snapshotAt: null, keys: [] });
      setMessage("Owner acceptance receipt exceeds the 1 MB limit.");
      return;
    }
    try {
      const parsed = parseOwnerAcceptanceReceipt(await file.text());
      setReceipt(parsed);
      setReview(emptyReview(currentAt));
      setSelection({ snapshotAt: currentAt, keys: [] });
      setIntegration("");
      setMessage("Build 109 owner receipt loaded locally. Earlier acceptance does not certify new integration health or moving video.");
    } catch (error) {
      setReceipt(null);
      setReview(emptyReview(null));
      setSelection({ snapshotAt: null, keys: [] });
      setMessage(error instanceof Error ? error.message : "Unable to read the owner receipt.");
    }
  }

  function mark(type: "checkedIdentities" | "observedVideo", key: string, checked: boolean) {
    const age = current ? Date.now() - Date.parse(current.captured_at) : NaN;
    if (!queue?.laterReading || !Number.isFinite(age) || age > 300_000 || age < -60_000) {
      setMessage("Inventory is stale or not later than the owner receipt. Recheck before acknowledging current devices or video.");
      return;
    }
    setReview((previous) => {
      const active = previous.snapshotAt === currentAt ? previous : emptyReview(currentAt);
      return { ...active, [type]: checked ? [...new Set([...active[type], key])] : active[type].filter((value) => value !== key) };
    });
  }

  function assignIntegration() {
    if (!canReview || selected.length === 0) return;
    const age = current ? Date.now() - Date.parse(current.captured_at) : NaN;
    if (!Number.isFinite(age) || age > 300_000 || age < -60_000) {
      setMessage("Inventory has aged out. Recheck before grouping HA follow-ups.");
      return;
    }
    try {
      const name = validateOwnerIntegrationName(integration);
      const eligible = new Set(queue?.followUps
        .filter((item) => item.source !== "hub_camera")
        .map((item) => item.key));
      setReview((previous) => {
        const active = previous.snapshotAt === currentAt ? previous : emptyReview(currentAt);
        const updated = { ...active.integrationGroups };
        for (const key of selected) if (eligible.has(key)) updated[key] = name;
        return { ...active, integrationGroups: updated };
      });
      setSelection({ snapshotAt: currentAt, keys: [] });
      setIntegration("");
      setMessage(`Grouped the selected HA follow-ups under the owner-supplied integration “${name}”. This does not prove integration ownership.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Invalid integration name.");
    }
  }

  function exportQueue() {
    if (!receipt || !current) return;
    const latest = buildRecoveryFollowUpQueue(receipt, current, playback, effectiveReview.integrationGroups,
      new Set(effectiveReview.checkedIdentities), new Set(effectiveReview.observedVideo));
    if (!latest.laterReading || !latest.freshReading) {
      setMessage("Evidence is no longer fresh. Recheck inventory before exporting the follow-up queue.");
      return;
    }
    const packet = createRecoveryFollowUpReceipt(receipt, current, latest);
    const href = URL.createObjectURL(new Blob([JSON.stringify(packet, null, 2) + "\n"], {
      type: "application/json",
    }));
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `rosevear-device-camera-follow-ups-${current.captured_at.slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(href);
    setMessage("Private follow-up queue downloaded. Nothing was enrolled, repaired, switched or streamed by this screen.");
  }

  const haRows = queue?.followUps.filter((item) => item.stage === "ha_integration" || item.stage === "ha_owner_check") ?? [];
  return (
    <section className="recovery-field-review" aria-label="Build 110 supervised integration and camera follow-up queue">
      <h3>Build 110 — Group missing integrations and camera follow-ups</h3>
      <p>Import a Build 109 owner acceptance receipt after a new inventory refresh. This local queue separates missing HA identities, camera registration, stream-health and human playback work without auto-adding devices or retaining stream URLs.</p>
      <label className="recovery-receipt-upload">
        Import Build 109 private owner acceptance JSON
        <input type="file" accept=".json,application/json" aria-label="Choose Build 109 owner acceptance JSON" onChange={(event) => void importOwnerReceipt(event)} />
      </label>
      {message && <p role="status">{message}</p>}
      {receipt && <p>Owner receipt created <strong>{receipt.generated_at}</strong>. Its snapshot was taken at <strong>{receipt.new_snapshot_at}</strong>; this screen needs a later, fresh reading.</p>}
      {receipt && !current && <p role="note">The current HA and camera registries are unavailable; do not treat failed reads as empty inventories.</p>}
      {queue && (
        <>
          {!queue.laterReading && <p role="alert" className="connection-guidance">Recheck inventory: this reading is not later than the imported owner receipt.</p>}
          {queue.laterReading && !queue.freshReading && <p role="alert" className="connection-guidance">Inventory evidence is stale. Recheck before grouping or acknowledging current status.</p>}
          <div className="recovery-evidence-grid">
            <div><h4>Home Assistant follow-ups</h4>
              <p>{queue.summary.ha_integration} missing integration/identity · {queue.summary.ha_owner_check} owner function checks · {queue.retiredExceptions} previously accepted retired exceptions</p>
            </div>
            <div><h4>Camera follow-ups</h4>
              <p>{queue.summary.camera_registration} registration · {queue.summary.camera_stream} stream/transport · {queue.summary.camera_playback} live playback</p>
            </div>
          </div>
          {haRows.length > 0 && (
            <div className="recovery-evidence-actions">
              <button type="button" disabled={!canReview} onClick={() => setSelection({ snapshotAt: currentAt, keys: haRows.map((item) => item.key) })}>
                Select all {haRows.length} HA follow-ups
              </button>
              <label>Owner-supplied integration group
                <input type="text" maxLength={64} placeholder="e.g. MQTT or Meross" value={integration} onChange={(event) => setIntegration(event.target.value)} />
              </label>
              <button type="button" disabled={!canReview || selected.length === 0} onClick={assignIntegration}>
                Group {selected.length} selected
              </button>
            </div>
          )}
          {stages.map((stage) => {
            const rows = queue.followUps.filter((item) => item.stage === stage);
            if (rows.length === 0) return null;
            return (
              <details key={stage} open>
                <summary>{stageLabels[stage]} ({rows.length})</summary>
                <div className="recovery-review-list">
                  {rows.slice(0, 100).map((item) => (
                    <div className="recovery-review-item recovery-follow-up-item" key={item.key}>
                      {item.source !== "hub_camera" && (
                        <label className="recovery-playback-mark">
                          <input type="checkbox" checked={selected.includes(item.key)} disabled={!canReview}
                            aria-label={`Select integration group: ${item.name}`}
                            onChange={(event) => setSelection((previous) => {
                              const active = previous.snapshotAt === currentAt ? previous.keys : [];
                              return { snapshotAt: currentAt, keys: event.target.checked
                                ? [...new Set([...active, item.key])] : active.filter((key) => key !== item.key) };
                            })} />
                          Group
                        </label>
                      )}
                      <span>
                        <strong>{item.name}</strong>
                        <small>{item.source} · <code>{item.id}</code> · {item.group}</small>
                        <small>{item.evidence}</small>
                        <small>Next: {item.next_step}</small>
                      </span>
                      {item.stage === "ha_owner_check" && (
                        <label className="recovery-playback-mark">
                          <input type="checkbox" disabled={!canReview}
                            checked={canReview && effectiveReview.checkedIdentities.includes(item.key)}
                            aria-label={`Verified HA function now: ${item.name}`}
                            onChange={(event) => mark("checkedIdentities", item.key, event.target.checked)} />
                          I checked this function on the actual HA system now
                        </label>
                      )}
                      {item.stage === "camera_playback" && (
                        <label className="recovery-playback-mark">
                          <input type="checkbox" disabled={!canReview}
                            checked={canReview && effectiveReview.observedVideo.includes(item.id)}
                            aria-label={`Viewed current moving video: ${item.name}`}
                            onChange={(event) => mark("observedVideo", item.id, event.target.checked)} />
                          I watched moving live video for this camera now
                        </label>
                      )}
                    </div>
                  ))}
                  {rows.length > 100 && <p>Showing 100 of {rows.length}; the private export includes every outstanding item.</p>}
                </div>
              </details>
            );
          })}
          <p role="status">{queue.summary.total_open} open follow-ups · {queue.summary.status === "owner_attested_queue_only"
            ? "no listed queue holds after local observations (not independent physical acceptance)"
            : "owner-supervised reconciliation remains required"}.</p>
          <button type="button" disabled={!canReview} onClick={exportQueue}>Download private follow-up queue (including unresolved holds)</button>
          <p className="connection-guidance">Integration groups are owner-supplied hints, never an automatic device-to-integration match. No Home Assistant enrollment, camera registration, stream configuration, database restore or device control runs here.</p>
        </>
      )}
    </section>
  );
}
