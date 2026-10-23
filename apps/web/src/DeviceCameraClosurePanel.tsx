import { useState, type ChangeEvent } from "react";

import type { DeviceCameraSnapshot } from "./deviceRecovery";
import type { CameraPlaybackReadiness } from "./deviceFieldReconciliation";
import {
  buildClosureReview,
  closureKey,
  createClosureLedger,
  parseClosureLedger,
  parseRecoveryWorklist,
  type ClosureAction,
  type ClosureLedger,
  type FollowUpWorklist,
} from "./deviceRecoveryClosure";

type LocalMarks = { snapshotAt: string | null; actions: Record<string, ClosureAction> };
const emptyMarks = (snapshotAt: string | null): LocalMarks => ({ snapshotAt, actions: {} });

/** Explicit human review over GET-derived evidence; no HA, ONVIF, go2rtc or Frigate mutations. */
export function DeviceCameraClosurePanel({
  current, playback,
}: {
  current: DeviceCameraSnapshot | null;
  playback: CameraPlaybackReadiness[];
}) {
  const [worklist, setWorklist] = useState<FollowUpWorklist | null>(null);
  const [previous, setPrevious] = useState<ClosureLedger | null>(null);
  const [marks, setMarks] = useState<LocalMarks>(emptyMarks(null));
  const [message, setMessage] = useState("");
  const currentAt = current?.captured_at ?? null;
  const activeMarks = marks.snapshotAt === currentAt ? marks.actions : {};
  const review = worklist && current ? buildClosureReview(worklist, previous, current, playback, activeMarks) : null;
  const canReview = Boolean(review?.laterReading && review.freshReading);

  async function importWorklist(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      if (file.size > 1_000_000) throw new Error("Build 110 worklist exceeds the 1 MB limit.");
      const parsed = parseRecoveryWorklist(await file.text());
      setWorklist(parsed);
      setPrevious(null);
      setMarks(emptyMarks(currentAt));
      setMessage("Build 110 private queue loaded. Historical owner checks and playback do not carry over as verified.");
    } catch (error) {
      setWorklist(null);
      setPrevious(null);
      setMarks(emptyMarks(null));
      setMessage(error instanceof Error ? error.message : "Unable to read Build 110 queue.");
    }
  }

  async function importLedger(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || !worklist) return;
    try {
      if (file.size > 1_000_000) throw new Error("Build 111 closure ledger exceeds the 1 MB limit.");
      const parsed = parseClosureLedger(await file.text(), worklist);
      setPrevious(parsed);
      setMarks(emptyMarks(currentAt));
      setMessage(`Imported ${parsed.entries.length} historical owner reviews. Every identity requires a later fresh inventory before new closure decisions.`);
    } catch (error) {
      setPrevious(null);
      setMarks(emptyMarks(currentAt));
      setMessage(error instanceof Error ? error.message : "Unable to read closure ledger.");
    }
  }

  function mark(key: string, action: ClosureAction, checked: boolean) {
    if (!worklist || !current) return;
    const latest = buildClosureReview(worklist, previous, current, playback, activeMarks);
    if (!latest.freshReading || !latest.laterReading) {
      setMessage("A later and fresh device/camera inventory is required. Refresh before marking owner observations.");
      return;
    }
    setMarks((old) => {
      const next = old.snapshotAt === currentAt ? { ...old.actions } : {};
      if (checked) next[key] = action;
      else delete next[key];
      return { snapshotAt: currentAt, actions: next };
    });
  }

  function exportLedger() {
    if (!worklist || !current) return;
    const latest = buildClosureReview(worklist, previous, current, playback, activeMarks);
    if (!latest.laterReading || !latest.freshReading) {
      setMessage("Review expired or inventory is not later than previous evidence. Refresh and review again.");
      return;
    }
    try {
      const receipt = createClosureLedger(worklist, previous, current, latest);
      const href = URL.createObjectURL(new Blob([`${JSON.stringify(receipt, null, 2)}\n`], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `rosevear-device-camera-closure-ledger-${current.captured_at.slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(href);
      setMessage("Private owner-review ledger downloaded. Open holds remain open; no device or camera changes were made.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to export closure ledger.");
    }
  }

  return (
    <section className="recovery-field-review" aria-label="Build 111 owner-supervised closure and playback recheck ledger">
      <h3>Build 111 — Owner closure and camera playback rechecks</h3>
      <p>Import the Build 110 follow-up JSON, then refresh our local device and camera status. A later inventory is required for every review. This records explicit owner observations; it cannot repair a device or verify a camera by itself.</p>
      <label className="recovery-receipt-upload">
        Import Build 110 private follow-up worklist
        <input type="file" accept=".json,application/json" aria-label="Choose Build 110 follow-up JSON" onChange={(event) => void importWorklist(event)} />
      </label>
      {worklist && (
        <label className="recovery-receipt-upload">
          Continue from an existing Build 111 private closure ledger (optional)
          <input type="file" accept=".json,application/json" aria-label="Choose existing Build 111 closure ledger" onChange={(event) => void importLedger(event)} />
        </label>
      )}
      {message && <p role="status">{message}</p>}
      {worklist && <p>Loaded {worklist.follow_ups.length} exact identities from the queue created at <strong>{worklist.generated_at}</strong>. {previous ? `${previous.entries.length} historical reviews imported.` : "No older closure ledger loaded."}</p>}
      {worklist && !current && <p role="alert">Device/camera registries are unavailable. An unreadable registry must not be treated as empty or retired.</p>}
      {review && (
        <>
          {!review.laterReading && <p role="alert" className="connection-guidance">This inventory is not later than the worklist and any imported closure review. Refresh the device/camera inventory.</p>}
          {review.laterReading && !review.freshReading && <p role="alert" className="connection-guidance">Inventory is older than five minutes or has an invalid future timestamp. Refresh before acknowledging devices or playback.</p>}
          <div className="recovery-evidence-grid">
            <div><h4>Unresolved / reopened</h4><p>{review.summary.open_holds} open holds · {review.summary.reopened} reopened from the prior owner review</p></div>
            <div><h4>Owner-attested closures</h4><p>{review.summary.owner_attested_closed} explicitly checked in this session · not independent certification</p></div>
          </div>
          <div className="recovery-review-list">
            {worklist?.follow_ups.slice(0, 100).map((item, index) => {
              const result = review.decisions[index];
              const key = closureKey(item.source, item.id);
              const action: ClosureAction = item.source === "hub_camera" ? "verified_live_video" :
                result.registry_present ? "verified_function" : "confirmed_retired";
              const markable = item.source !== "hub_camera" || (result.registry_present && result.private_stream_ready);
              const guidance = item.source === "hub_camera" ?
                !result.registry_present ? "Camera registration missing; inspect discovery, do not enroll automatically." :
                  !result.private_stream_ready ? "Stream health or private viewer evidence unavailable; review go2rtc and probes." :
                    "Owner must watch moving live video in the Cameras screen now." :
                result.registry_present ? "Owner must test the actual Home Assistant function now." :
                  "Confirm that the absent HA identity is intentionally retired; do not interpret a failed read as retirement.";
              return (
                <div className="recovery-review-item recovery-follow-up-item" key={key}>
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.source} · <code>{item.id}</code>{item.integration_group_owner_supplied ? ` · Owner group: ${item.integration_group_owner_supplied}` : ""}</small>
                    <small>Current stage: {result.stage} · {result.status}{result.reopened_from_previous ? " · REOPENED" : ""}</small>
                    <small>{guidance}</small>
                  </span>
                  {markable ? (
                    <label className="recovery-playback-mark">
                      <input type="checkbox" disabled={!canReview}
                        aria-label={`${action === "verified_live_video" ? "Observed current moving video" : action === "verified_function" ? "Verified current HA function" : "Confirmed intentionally retired"}: ${item.name}`}
                        checked={canReview && result.owner_action === action}
                        onChange={(event) => mark(key, action, event.target.checked)} />
                      {action === "verified_live_video" ? "I watched moving live video now" :
                        action === "verified_function" ? "I tested this HA function now" : "I confirm this HA identity is intentionally retired"}
                    </label>
                  ) : <small className="connection-guidance">Held until camera registration and safe, fresh stream evidence pass.</small>}
                </div>
              );
            })}
            {worklist && worklist.follow_ups.length > 100 && <p>Showing 100 of {worklist.follow_ups.length}; the export retains every identity and unresolved hold.</p>}
          </div>
          <button type="button" disabled={!canReview} onClick={exportLedger}>Download private closure ledger, including open holds</button>
          <p className="connection-guidance">A checkbox is an owner assertion only. Later readings reopen prior closure unless checked again; old video observations never carry forward. No credentials, stream URLs, integration mutations, camera enrollment or remote commands are exported.</p>
        </>
      )}
    </section>
  );
}
