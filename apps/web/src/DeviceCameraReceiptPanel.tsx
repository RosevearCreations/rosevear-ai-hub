import { useState, type ChangeEvent } from "react";

import type { DeviceCameraSnapshot } from "./deviceRecovery";
import type { CameraPlaybackReadiness } from "./deviceFieldReconciliation";
import {
  createOwnerAcceptancePacket,
  parseFieldReviewReceipt,
  reconcileFieldReviewReceipt,
  type FieldReviewReceipt,
} from "./deviceRecoveryReceipts";

type OwnerMarks = { snapshotAt: string | null; identities: string[]; cameras: string[] };

export function DeviceCameraReceiptPanel({
  current, playback,
}: {
  current: DeviceCameraSnapshot | null;
  playback: CameraPlaybackReadiness[];
}) {
  const [receipt, setReceipt] = useState<FieldReviewReceipt | null>(null);
  const [marks, setMarks] = useState<OwnerMarks>({ snapshotAt: null, identities: [], cameras: [] });
  const [message, setMessage] = useState("");
  const effectiveMarks = marks.snapshotAt === (current?.captured_at ?? null)
    ? marks : { snapshotAt: current?.captured_at ?? null, identities: [], cameras: [] };
  const reconciliation = current && receipt ? reconcileFieldReviewReceipt(receipt, current, playback) : null;
  const packet = receipt && current && reconciliation
    ? createOwnerAcceptancePacket(receipt, current, reconciliation,
      new Set(effectiveMarks.identities), new Set(effectiveMarks.cameras)) : null;

  async function importReceipt(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (file.size > 1_000_000) {
      setReceipt(null);
      setMarks({ snapshotAt: null, identities: [], cameras: [] });
      setMessage("The field review receipt exceeds the 1 MB limit.");
      return;
    }
    try {
      const parsed = parseFieldReviewReceipt(await file.text());
      setReceipt(parsed);
      setMarks({ snapshotAt: current?.captured_at ?? null, identities: [], cameras: [] });
      setMessage("Build 108 field review receipt loaded locally. Its historic observations are not current device or camera acceptance.");
    } catch (error) {
      setReceipt(null);
      setMarks({ snapshotAt: null, identities: [], cameras: [] });
      setMessage(error instanceof Error ? error.message : "Unable to read field review receipt.");
    }
  }

  function toggle(type: "identities" | "cameras", id: string, checked: boolean) {
    const evidenceAge = current ? Date.now() - Date.parse(current.captured_at) : NaN;
    if (!Number.isFinite(evidenceAge) || evidenceAge > 300_000 || evidenceAge < -60_000) {
      setMessage("The current inventory evidence is stale. Recheck inventory before owner acceptance.");
      return;
    }
    setMarks((previous) => {
      const eligible = previous.snapshotAt === current?.captured_at ? previous[type] : [];
      return {
        snapshotAt: current?.captured_at ?? null,
        identities: previous.snapshotAt === current?.captured_at ? previous.identities : [],
        cameras: previous.snapshotAt === current?.captured_at ? previous.cameras : [],
        [type]: checked ? [...eligible, id] : eligible.filter((item) => item !== id),
      };
    });
  }

  function downloadPacket() {
    if (!packet || !reconciliation?.laterReading || !current || !receipt) return;
    const freshReconciliation = reconcileFieldReviewReceipt(receipt, current, playback);
    if (!freshReconciliation.freshReading) {
      setMessage("The registry/stream evidence is stale. Recheck inventory before exporting acceptance.");
      return;
    }
    const freshPacket = createOwnerAcceptancePacket(receipt, current, freshReconciliation,
      new Set(effectiveMarks.identities), new Set(effectiveMarks.cameras));
    const href = URL.createObjectURL(new Blob([JSON.stringify(freshPacket, null, 2) + "\n"], {
      type: "application/json",
    }));
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `rosevear-owner-acceptance-${current.captured_at.slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(href);
    setMessage("Private owner acceptance receipt downloaded. Any remaining holds and lack of independent physical verification remain explicit.");
  }

  return (
    <section className="recovery-field-review" aria-label="Build 109 field review receipt reconciliation">
      <h3>Build 109 — Reconcile an earlier field review</h3>
      <p>After saving a Build 108 supervised field review, recheck the actual Windows Hub inventory and import that private review here. Earlier decisions and video observations are <strong>not</strong> carried forward as verified repairs.</p>
      <label className="recovery-receipt-upload">
        Import previous supervised field review JSON
        <input type="file" aria-label="Choose Build 108 field review JSON" accept=".json,application/json" onChange={(event) => void importReceipt(event)} />
      </label>
      {message && <p role="status">{message}</p>}
      {receipt && (
        <p>Imported owner review from <strong>{receipt.generated_at}</strong>, based on a registry reading at <strong>{receipt.current_captured_at}</strong>. This file is local and may contain household names.</p>
      )}
      {receipt && !current && <p role="note">Current inventory is unavailable. Receipt comparison and owner acceptance are held until all registry reads succeed.</p>}
      {reconciliation && packet && (
        <>
          {!reconciliation.laterReading && (
            <p className="connection-guidance" role="alert">The new registry reading must be later than the imported receipt's source snapshot. Recheck inventory; no historical checkbox can certify a repeated or older reading.</p>
          )}
          {reconciliation.laterReading && !reconciliation.freshReading && (
            <p className="connection-guidance" role="alert">The latest registry reading has aged out. Recheck inventory before claiming current camera playback or physical acceptance.</p>
          )}
          <div className="recovery-evidence-grid">
            <div><h4>Missing identity follow-ups</h4>
              <p>{packet.summary.reappeared_in_registry} reappeared in today's registry · {packet.summary.retired_exceptions} owner-retired exceptions · {packet.summary.identity_acceptance_holds} require review</p>
            </div>
            <div><h4>Live camera follow-ups</h4>
              <p>{packet.camera_playback.filter((item) => item.operator_observed_moving_video_now).length} currently acknowledged · {packet.summary.camera_playback_holds} without new playback verification</p>
            </div>
          </div>
          {reconciliation.identities.length > 0 && (
            <details open>
              <summary>Review previously missing devices, entities and camera registrations ({reconciliation.identities.length})</summary>
              <div className="recovery-review-list">
                {reconciliation.identities.map((item) => {
                  const canReview = reconciliation.laterReading && reconciliation.freshReading &&
                    (item.presentNow || item.previouslyRetired);
                  return <label className="recovery-review-item" key={item.key}>
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.source} · <code>{item.id}</code></small>
                      <small>Prior action: {item.previousDisposition.replaceAll("_", " ")}</small>
                      <small>{item.presentNow
                        ? "Identity reappeared in current registry; physical function still needs owner review."
                        : item.previouslyRetired ? "Absent; owner previously marked intentionally retired."
                          : "Still absent; requires integration, discovery, identity or power/network follow-up."}</small>
                    </span>
                    <span className="recovery-playback-mark">
                      <input type="checkbox" disabled={!canReview}
                        aria-label={`Personally verified identity: ${item.name}`}
                        checked={canReview && effectiveMarks.identities.includes(item.key)}
                        onChange={(event) => toggle("identities", item.key, event.target.checked)} />
                      I checked this identity or retired exception on the actual Hub
                    </span>
                  </label>;
                })}
              </div>
            </details>
          )}
          {reconciliation.cameras.length > 0 && (
            <details open>
              <summary>Independently recheck current camera playback ({reconciliation.cameras.length})</summary>
              <div className="recovery-review-list">
                {reconciliation.cameras.map((item) => {
                  const canCheck = reconciliation.laterReading && reconciliation.freshReading && item.readyNow;
                  return <label className="recovery-review-item" key={item.id}>
                    <span>
                      <strong>{item.name}</strong>
                      <small><code>{item.id}</code></small>
                      <small>{item.newSinceReceipt ? "New registration since receipt" : item.previouslyObserved ? "Prior human playback claim, not current proof" : "No prior playback claim"}</small>
                      <small>{item.currentRegistered ? item.reason : "Camera missing from current Hub registry."}</small>
                    </span>
                    <span className="recovery-playback-mark">
                      <input type="checkbox" disabled={!canCheck}
                        aria-label={`Personally verified current moving video: ${item.name}`}
                        checked={canCheck && effectiveMarks.cameras.includes(item.id)}
                        onChange={(event) => toggle("cameras", item.id, event.target.checked)} />
                      I viewed moving video for this camera now
                    </span>
                  </label>;
                })}
              </div>
            </details>
          )}
          <p role="status">Owner review status: {packet.summary.status === "owner_attested_only"
            ? "all listed observations acknowledged locally (not an independent audit)"
            : `${packet.summary.identity_acceptance_holds} identity and ${packet.summary.camera_playback_holds} camera holds remain`}. No device was restored, enrolled or controlled by this screen.</p>
          <button type="button" onClick={downloadPacket} disabled={!reconciliation.laterReading || !reconciliation.freshReading}>
            Download owner acceptance receipt (including holds)
          </button>
        </>
      )}
    </section>
  );
}
