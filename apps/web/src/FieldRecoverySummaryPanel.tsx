import { useMemo, useState, type ChangeEvent } from "react";

import {
  getCameraDashboard, getCameras, getGo2RTCStatus, getHomeAssistantBrowser,
  getHomeAssistantStatus, getMQTTStatus,
} from "./api";
import { closureKey, parseClosureLedger, parseRecoveryWorklist, type ClosureLedger, type FollowUpWorklist } from "./deviceRecoveryClosure";
import {
  assessFieldRecovery, buildFieldSnapshot, createFieldRecoverySummary,
  validateFieldWorklist, type FieldSnapshot, type NextOwner, type OwnerObservation,
} from "./fieldRecoverySummary";

const ownerOptions: { value: NextOwner; label: string }[] = [
  { value: "unassigned", label: "Needs owner assignment" },
  { value: "household_owner", label: "Household owner" },
  { value: "workshop_operator", label: "Workshop operator" },
  { value: "camera_operator", label: "Camera operator" },
];

/** Owner-only, explicitly refreshed registry/evidence view. No automations or device controls. */
export function FieldRecoverySummaryPanel({ onNavigate }: { onNavigate: (section: string) => void }) {
  const [worklist, setWorklist] = useState<FollowUpWorklist | null>(null);
  const [ledger, setLedger] = useState<ClosureLedger | null>(null);
  const [current, setCurrent] = useState<FieldSnapshot | null>(null);
  const [marks, setMarks] = useState<Record<string, OwnerObservation>>({});
  const [filter, setFilter] = useState<"unresolved" | "reopened" | "all">("unresolved");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const assessment = useMemo(() => worklist && ledger
    ? assessFieldRecovery(worklist, ledger, current, marks) : null, [worklist, ledger, current, marks]);
  const visible = assessment?.rows.filter(row => filter === "all" ||
    (filter === "unresolved" ? row.unresolved : row.liveReopened || row.drift === "reopened")) ?? [];

  async function importWorklist(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      if (file.size > 1_000_000) throw new Error("Build 110 worklist exceeds 1 MB.");
      const parsed = validateFieldWorklist(parseRecoveryWorklist(await file.text()));
      setWorklist(parsed);
      setMessage("Private Build 110 identities loaded. Import the matching Build 111 ledger next.");
    } catch (error) {
      setWorklist(null);
      setMessage(error instanceof Error ? error.message : "Could not load the private worklist.");
    }
    setLedger(null);
    setCurrent(null);
    setMarks({});
  }

  async function importLedger(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || !worklist) return;
    try {
      if (file.size > 1_000_000) throw new Error("Build 111 ledger exceeds 1 MB.");
      const parsed = parseClosureLedger(await file.text(), worklist);
      setLedger(parsed);
      setMessage("Matching historical ledger imported. Capture a newer live authenticated registry reading.");
    } catch (error) {
      setLedger(null);
      setMessage(error instanceof Error ? error.message : "Could not load the matching ledger.");
    }
    setCurrent(null);
    setMarks({});
  }

  async function capture() {
    if (!worklist || !ledger) return;
    setBusy(true);
    setMessage("");
    try {
      const [homeAssistant, mqtt, browser, cameras, dashboard, go2rtc] = await Promise.allSettled([
        getHomeAssistantStatus(), getMQTTStatus(), getHomeAssistantBrowser(),
        getCameras(), getCameraDashboard(), getGo2RTCStatus(),
      ]);
      setCurrent(buildFieldSnapshot({ homeAssistant, mqtt, browser, cameras, dashboard, go2rtc }));
      setMarks({});
      setMessage("Read-only authenticated snapshot captured. All previous owner observations were cleared; review exact identities again.");
    } catch {
      setCurrent(null);
      setMarks({});
      setMessage("The field summary could not be assembled; nothing was changed on the server or devices.");
    } finally {
      setBusy(false);
    }
  }

  function assign(key: string, owner: NextOwner) {
    setMarks(previous => ({ ...previous, [key]: { owner, verifiedNow: false } }));
  }

  function observe(key: string, verifiedNow: boolean) {
    setMarks(previous => ({ ...previous, [key]: { owner: previous[key]?.owner ?? "unassigned", verifiedNow } }));
  }

  function download() {
    if (!worklist || !ledger || !assessment || !current) return;
    try {
      const refreshed = assessFieldRecovery(worklist, ledger, current, marks);
      const receipt = createFieldRecoverySummary(worklist, ledger, refreshed, current);
      const url = URL.createObjectURL(new Blob([`${JSON.stringify(receipt, null, 2)}\n`], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `rosevear-device-camera-field-summary-${current.capturedAt.slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage("Private owner-authored summary downloaded with every unresolved hold. Independent installed Windows/physical acceptance remains pending.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Recheck the authenticated inventory before exporting.");
    }
  }

  return (
    <section className="panel field-summary" aria-label="Build 118 device and camera field recovery acceptance summary">
      <header className="field-summary-header">
        <div>
          <p className="eyebrow">Build 118 · evidence consolidation</p>
          <h2>Device & camera recovery summary</h2>
          <p>Combine the same Build 110 worklist and matching Build 111 owner ledger with a fresh, authenticated read. Reopened and unresolved identities retain named next-action roles.</p>
        </div>
        <span className="camera-acceptance-pill">Installed field acceptance: HOLD</span>
      </header>

      <details className="camera-acceptance-help">
        <summary><span aria-hidden="true">i</span> How to review without changing our devices</summary>
        <ol>
          <li>Import the private Build 110 follow-up worklist and its matching Build 111 closure ledger. Historic owner-attested closure is <strong>not</strong> current proof.</li>
          <li>Click <strong>Read current authenticated registry</strong> only after the installed Windows Hub, original HA VM and private clients are ready. This sends only existing read-only GET calls.</li>
          <li>Review open and reopened exact IDs, assign a household/workshop/camera operator, then use Devices or Cameras to test real operation or moving video. Checking a box records only our observation.</li>
          <li>Download a private, sanitized summary including holds and next owners. Keep it off public GitHub; there is no automatic approval, physical certification or durable server write.</li>
        </ol>
      </details>

      <div className="field-summary-uploads">
        <label>1 · Private Build 110 follow-up worklist
          <input type="file" accept=".json,application/json" aria-label="Import Build 110 field worklist" onChange={event => void importWorklist(event)} />
        </label>
        {worklist && <label>2 · Matching private Build 111 closure ledger
          <input type="file" accept=".json,application/json" aria-label="Import matching Build 111 field ledger" onChange={event => void importLedger(event)} />
        </label>}
      </div>
      <div className="field-summary-actions">
        <button type="button" disabled={busy || !worklist || !ledger} onClick={() => void capture()}>3 · Read current authenticated registry</button>
        <button type="button" disabled={busy || !assessment?.readyForOwnerReview} onClick={download}>Download private owner summary with holds</button>
        <button type="button" onClick={() => onNavigate("Devices")}>Review HA Devices</button>
        <button type="button" onClick={() => onNavigate("Cameras")}>Review Camera Playback</button>
      </div>
      {message && <p role="status">{message}</p>}

      {assessment && (
        <>
          <p className="field-summary-evidence" role="note">
            Historical ledger: {assessment.historical.review_count} owner review(s), last {assessment.historical.latest_review_at}.
            Live authenticated read: {current?.capturedAt ?? "not captured"}; {assessment.readyForOwnerReview ? "newer and initially fresh" : "missing, stale or not later than the ledger"}.
            These are different evidence types, neither independently signed.
          </p>
          <div className="field-summary-metrics">
            <article><strong>{assessment.summary.unresolved}</strong><span>Current review holds</span></article>
            <article><strong>{assessment.summary.historical_reopened + assessment.summary.live_reopened}</strong><span>Historical + newly regressed</span></article>
            <article><strong>{assessment.summary.owner_observed_now}</strong><span>Owner-observed this session</span></article>
            <article><strong>{assessment.summary.needs_owner}</strong><span>Open holds without owner</span></article>
          </div>
          <p className={current?.haOnline && current.mqttOnline && current.privateCameraRelay ? "camera-acceptance-note" : "camera-acceptance-hold"}>
            Home Assistant: {current?.haOnline ? "online" : "HOLD"} · MQTT: {current?.mqttOnline ? "online" : "HOLD"} · private go2rtc: {current?.privateCameraRelay ? "online, loopback-only" : "HOLD"}.
            A service reading, registry match or healthy probe is not physical operation or moving video.
          </p>
          <div className="field-summary-filters">
            <label htmlFor="field-summary-filter">Review filter</label>
            <select id="field-summary-filter" value={filter} onChange={event => setFilter(event.target.value as typeof filter)}>
              <option value="unresolved">Unresolved current review</option>
              <option value="reopened">Reopened or newly regressed</option>
              <option value="all">All historical identities</option>
            </select>
          </div>
          {visible.length === 0 ? <p>No rows match this filter. This does not certify unlisted equipment.</p> : (
            <div className="field-summary-list">
              {visible.slice(0, 120).map(row => (
                <article key={row.key} className={row.liveReopened || row.drift === "reopened" ? "field-summary-row is-reopened" : "field-summary-row"}>
                  <div>
                    <strong>{row.name}</strong>
                    <small>{row.source} · <code>{row.id}</code> · stage {row.stage}</small>
                    <small>History: {row.current_status} / {row.drift}; fresh registry: {row.liveState}</small>
                    {row.liveReopened && <span className="camera-acceptance-hold">REOPENED: historically closed, but live inventory is absent or needs attention.</span>}
                    <p><strong>Next:</strong> {row.nextStep}</p>
                  </div>
                  <div className="field-summary-row-controls">
                    <label>Next-action owner
                      <select aria-label={`Next owner for ${row.id}`} value={row.owner} onChange={event => assign(row.key, event.target.value as NextOwner)}>
                        {ownerOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label>
                      <input type="checkbox" aria-label={`I personally verified ${row.id}`} checked={row.functionObservedNow}
                        disabled={row.liveState !== "reported" || !assessment.readyForOwnerReview ||
                          (row.source === "hub_camera" ? row.owner !== "camera_operator" : !["household_owner", "workshop_operator"].includes(row.owner))}
                        onChange={event => observe(row.key, event.target.checked)} />
                      {row.source === "hub_camera" ? "I personally watched moving video using the private viewer" : "I personally checked real device/entity function"}
                    </label>
                    <small>{row.unresolved ? "Review HOLD: no independent field closure" : "Current owner observation only — independent field hold remains"}</small>
                  </div>
                </article>
              ))}
              {visible.length > 120 && <p>Showing the first 120 of {visible.length} matching rows. The private summary retains all tracked identities and holds.</p>}
            </div>
          )}
          {assessment.untrackedCameras.length > 0 && <details>
            <summary>{assessment.untrackedCameras.length} registered camera(s) absent from this historical recovery worklist</summary>
            <p>These cameras must be reviewed separately; absence from the historical worklist is not evidence of acceptance.</p>
            <ul>{assessment.untrackedCameras.slice(0, 40).map(id => <li key={id}><code>{id}</code></li>)}</ul>
          </details>}
          <p className="camera-acceptance-privacy">All field marks and private evidence remain in this browser session unless we deliberately download a sanitized review. This screen does not start services, enrol devices, trigger ONVIF scans, probe RTSP streams, send MQTT commands, change cameras or claim installed-Windows acceptance. The exported receipt always says FIELD_ACCEPTANCE_HOLD.</p>
        </>
      )}
    </section>
  );
}
