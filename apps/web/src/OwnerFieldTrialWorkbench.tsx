import { useEffect, useMemo, useState, type ChangeEvent } from "react";

import { getGo2RTCStatus, getHealth, getHomeAssistantStatus, getMQTTStatus, getOllamaStatus } from "./api";
import { CardHelp } from "./CommandShell";
import {
  TRIAL_CASES, acknowledgeTrialFollowup, createTrialReceipt, latestTrialObservations,
  parseTrialReceipt, recordTrialObservation, summarizeOwnerTrial, trialSourceIsFresh,
  type TrialAccess, type TrialCaseId, type TrialEnvironment, type TrialFinding,
  type TrialObservation, type TrialOutcome, type TrialOwner, type TrialSourceReading,
} from "./ownerFieldTrial";

const owners: { value: TrialOwner; label: string }[] = [
  { value: "unassigned", label: "Assign a follow-up owner" },
  { value: "household_owner", label: "Household owner" },
  { value: "workshop_operator", label: "Workshop operator" },
  { value: "camera_operator", label: "Camera operator" },
];
const findings: { value: TrialFinding; label: string }[] = [
  { value: "none", label: "No finding" },
  { value: "offline", label: "Offline or unavailable" },
  { value: "missing_identity", label: "Missing or mismatched identity" },
  { value: "stale_evidence", label: "Stale or contradictory observation" },
  { value: "playback_missing", label: "Camera media unavailable" },
  { value: "accessibility", label: "Keyboard/mobile/assistive access issue" },
  { value: "startup", label: "Windows startup or recovery gap" },
  { value: "permission", label: "Permission or private access issue" },
  { value: "other", label: "Another manual follow-up" },
];

type ListFilter = "all" | "followups" | "retests" | "not_tested";

/** Owner/admin-only System workbench. Observations are ephemeral until deliberately exported. */
export function OwnerFieldTrialWorkbench({ onNavigate, active = true }: { onNavigate: (section: string) => void; active?: boolean }) {
  const [environment, setEnvironment] = useState<TrialEnvironment>({ installed_version: "", access: "unknown", installed_windows_witnessed: false });
  const [observations, setObservations] = useState<TrialObservation[]>([]);
  const [readings, setReadings] = useState<TrialSourceReading[]>([]);
  const [selected, setSelected] = useState<TrialCaseId>("home");
  const [outcome, setOutcome] = useState<TrialOutcome>("blocked");
  const [finding, setFinding] = useState<TrialFinding>("none");
  const [nextOwner, setNextOwner] = useState<TrialOwner>("unassigned");
  const [witnessed, setWitnessed] = useState(false);
  const [filter, setFilter] = useState<ListFilter>("all");
  const [imported, setImported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");

  // Visiting another module retains the private ledger but never carries a stale witness confirmation.
  useEffect(() => { if (!active) setWitnessed(false); }, [active]);

  const latest = useMemo(() => latestTrialObservations(observations), [observations]);
  const summary = useMemo(() => summarizeOwnerTrial(observations), [observations]);
  const currentCase = TRIAL_CASES.find(item => item.id === selected)!;

  const visible = TRIAL_CASES.filter(item => {
    const last = latest.get(item.id);
    if (filter === "not_tested") return !last;
    if (filter === "followups") return last && last.outcome !== "passed";
    if (filter === "retests") return last?.outcome === "passed" && observations.some(previous => previous.case_id === item.id && previous.outcome !== "passed");
    return true;
  });

  function choose(id: TrialCaseId) {
    setSelected(id);
    setWitnessed(false);
    setOutcome("blocked");
    setFinding("none");
    setNextOwner("unassigned");
    setFeedback("");
  }

  function record() {
    try {
      const updated = recordTrialObservation(observations, environment, { case_id: selected, outcome, finding, next_owner: nextOwner, witnessed });
      setObservations(updated);
      setWitnessed(false);
      setFeedback(`Witnessed ${currentCase.label} outcome recorded in this browser session. Field acceptance remains on HOLD.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not record the field observation.");
    }
  }

  function acknowledge(id: TrialCaseId) {
    try {
      setObservations(previous => acknowledgeTrialFollowup(previous, id));
      setFeedback("Follow-up owner acknowledgement recorded. This does not close or certify the finding.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not acknowledge this follow-up.");
    }
  }

  async function refreshReadOnlySources() {
    setLoading(true);
    setFeedback("");
    try {
      const results = await Promise.allSettled([
        getHealth(), getOllamaStatus(), getHomeAssistantStatus(), getMQTTStatus(), getGo2RTCStatus(),
      ] as const);
      const now = new Date().toISOString();
      const state = (index: number, configured: boolean, available: boolean): TrialSourceReading["state"] =>
        results[index].status === "rejected" ? "unavailable" : !configured ? "unconfigured" : available ? "online_reported" : "offline_reported";
      const hub = results[0];
      const ollama = results[1];
      const homeAssistant = results[2];
      const mqtt = results[3];
      const go2rtc = results[4];
      const captured: TrialSourceReading[] = [
        { source: "hub", state: state(0, true, hub.status === "fulfilled"), read_at: now },
        { source: "ollama", state: state(1, true, ollama.status === "fulfilled" && ollama.value.available), read_at: now },
        { source: "home_assistant", state: state(2, homeAssistant.status === "fulfilled" && homeAssistant.value.configured,
          homeAssistant.status === "fulfilled" && homeAssistant.value.available), read_at: now },
        { source: "mqtt", state: state(3, mqtt.status === "fulfilled" && mqtt.value.configured,
          mqtt.status === "fulfilled" && mqtt.value.available), read_at: now },
        { source: "go2rtc", state: state(4, go2rtc.status === "fulfilled" && go2rtc.value.configured,
          go2rtc.status === "fulfilled" && go2rtc.value.online), read_at: now },
      ];
      setReadings(captured);
      setFeedback("Five bounded read-only GET results classified. These API claims cannot pass any physical trial case.");
    } catch {
      setReadings([]);
      setFeedback("Could not assemble the read-only status snapshot. No devices or server settings were changed.");
    } finally {
      setLoading(false);
    }
  }

  function downloadReceipt() {
    try {
      const receipt = createTrialReceipt(environment, readings, observations);
      const url = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2) + "\n"], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `rosevear-owner-field-trial-${receipt.exported_at.slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setFeedback("Private HOLD-labelled trial receipt downloaded locally. Keep it out of public issues or attachments.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Private receipt could not be generated.");
    }
  }

  async function importReceipt(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      if (file.size > 200_000) throw new Error("Private trial receipt exceeds 200 KB.");
      const receipt = parseTrialReceipt(await file.text());
      if (observations.length && !window.confirm("Replace this browser session's trial observations with the imported private receipt? Export first to keep both histories.")) return;
      setEnvironment({ ...receipt.environment, installed_windows_witnessed: false });
      setObservations(receipt.observations);
      setReadings(receipt.source_readings);
      setImported(true);
      setWitnessed(false);
      setFeedback("Private prior trial imported for review. Imported attestations are historical, not proof of current operation. Re-test on Windows before fresh acceptance.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Invalid trial receipt. Existing session preserved.");
    }
  }

  return (
    <section className="panel owner-trial" aria-label="Build 148 cross-module owner field trial">
      <header className="owner-trial-header">
        <div>
          <p className="eyebrow">Build 148 · owner-witnessed field trial</p>
          <h2>Home operations field trial & follow-ups</h2>
          <p>Compare our actual installed Windows Hub, real devices and private access with the source-level release. Record only what we personally witnessed. All unreviewed cases and independent acceptance remain on HOLD.</p>
        </div>
        <strong className="owner-trial-hold">FIELD ACCEPTANCE: HOLD</strong>
      </header>
      <details className="camera-acceptance-help">
        <summary><span aria-hidden="true">i</span> How our owner trial works safely</summary>
        <ol>
          <li>Enter only a version label and connection category confirmed on the actual Windows PC; never enter hostnames, IPs, URLs, credentials, MQTT payloads or camera locations.</li>
          <li>Read coarse service health with explicit GETs if useful. Service claims are different from real moving playback, device operation, Windows task inspection and accessible screen use.</li>
          <li>Choose a module, follow its existing screen, personally perform a safe check and record either an observed pass or a categorized issue/hold. An issue requires a next-action owner.</li>
          <li>Acknowledge follow-ups, re-test later and export the private JSON. A subsequent observed pass is still awaiting independent review, not a certified physical GREEN.</li>
          <li>Nothing runs in the background. Refresh clears this browser session; use explicit private export/import for continuity. No password vault, camera stream, Home Assistant scene, MQTT publish or Windows service command is activated.</li>
        </ol>
      </details>

      <div className="owner-trial-stats" aria-label="Field trial status counts">
        <article><strong>{summary.not_tested}</strong><span>Not tested</span></article>
        <article><strong>{summary.pass_observed}</strong><span>Owner-observed passes</span></article>
        <article><strong>{summary.open_followups}</strong><span>Open findings</span></article>
        <article><strong>{summary.awaiting_independent_review}</strong><span>Retests awaiting review</span></article>
      </div>

      <fieldset className="owner-trial-context">
        <legend>Actual Windows installation context (manual evidence)</legend>
        <label>Witnessed installed version label
          <input type="text" maxLength={48} placeholder="Example: 0.0.4-build148" value={environment.installed_version}
            onChange={event => setEnvironment(previous => ({ ...previous, installed_version: event.target.value }))} />
        </label>
        <label>Access path personally used
          <select value={environment.access} onChange={event => setEnvironment(previous => ({ ...previous, access: event.target.value as TrialAccess }))}>
            <option value="unknown">Not yet checked</option><option value="local_console">Local Windows console</option>
            <option value="private_lan">Private LAN</option><option value="tailnet">Private tailnet</option>
          </select>
        </label>
        <label className="owner-trial-check"><input type="checkbox" checked={environment.installed_windows_witnessed}
          onChange={event => setEnvironment(previous => ({ ...previous, installed_windows_witnessed: event.target.checked }))} />
          I personally checked the actual installed Windows Hub, not just this GitHub source release.</label>
      </fieldset>

      <div className="owner-trial-source">
        <div><h3>Read-only service claims</h3><p>Explicit request only; coarse status and timestamp, with private endpoints omitted. Never counted as witnessed device operation.</p></div>
        <button type="button" disabled={loading} onClick={() => void refreshReadOnlySources()}>{loading ? "Checking sources…" : "Read source service status (GET only)"}</button>
        {readings.length > 0 && <ul aria-label="Read-only API observations">{readings.map(reading => (
          <li key={reading.source}><strong>{reading.source.replaceAll("_", " ")}</strong>: {reading.state.replaceAll("_", " ")} <small>at {reading.read_at} · {trialSourceIsFresh(reading) && !imported
            ? reading.state === "unavailable" ? "recent failed GET" : "recent API claim" : "stale/historical reading"}</small></li>
        ))}</ul>}
      </div>

      <div className="owner-trial-editor">
        <h3>Record an owner-witnessed check</h3>
        <label>Module / check
          <select value={selected} onChange={event => choose(event.target.value as TrialCaseId)}>
            {TRIAL_CASES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <p className="owner-trial-instruction">{currentCase.check}</p>
        <button type="button" onClick={() => { setWitnessed(false); onNavigate(currentCase.section); }}>Open {currentCase.section} for this check</button>
        <div className="owner-trial-controls">
          <label>Observed outcome
            <select value={outcome} onChange={event => { setOutcome(event.target.value as TrialOutcome); setWitnessed(false); }}>
              <option value="blocked">Blocked / not verifiable</option><option value="issue">Issue observed</option><option value="passed">Pass personally observed</option>
            </select>
          </label>
          <label>Finding category
            <select value={finding} onChange={event => setFinding(event.target.value as TrialFinding)}>
              {findings.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label>Next-action owner
            <select value={nextOwner} onChange={event => setNextOwner(event.target.value as TrialOwner)}>
              {owners.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
        </div>
        <label className="owner-trial-check"><input type="checkbox" checked={witnessed} onChange={event => setWitnessed(event.target.checked)} />
          I personally completed this safe check and confirm the chosen outcome, including any remaining uncertainty.</label>
        <button type="button" className="primary-button" disabled={!witnessed} onClick={record}>Record witnessed outcome (no device action)</button>
      </div>

      <div className="owner-trial-ledger">
        <div className="owner-trial-ledger-heading"><div><h3>Trial ledger & follow-up queue</h3>
          <p>Every later observation remains in the private history; retesting does not erase previous failures.</p></div>
          <label>Show
            <select value={filter} onChange={event => setFilter(event.target.value as ListFilter)}>
              <option value="all">All nine checks</option><option value="followups">Open findings</option>
              <option value="retests">Retests awaiting review</option><option value="not_tested">Not tested</option>
            </select>
          </label>
        </div>
        {imported && <p className="owner-trial-warning" role="note">Imported history is for context only. We must witness current Windows/device function again before relying on prior observations.</p>}
        <div className="owner-trial-list">
          {visible.map(item => {
            const last = latest.get(item.id);
            const priorIssue = last?.outcome === "passed" && observations.some(previous => previous.case_id === item.id && previous.outcome !== "passed");
            return <article key={item.id}>
              <div><strong>{item.label}</strong><small>{item.section} · {last ? `Last owner observation ${last.observed_at}` : "No owner observation"}</small>
                <p>{!last ? "NOT TESTED · HOLD" : last.outcome === "passed"
                  ? priorIssue ? "RETEST PASS OBSERVED · INDEPENDENT REVIEW HOLD" : "OWNER PASS OBSERVED · INDEPENDENT FIELD HOLD"
                  : `${last.outcome.toUpperCase()} · ${last.finding.replaceAll("_", " ")} · ${last.next_owner.replaceAll("_", " ")}`}</p>
                {last && last.outcome !== "passed" && <small>{last.acknowledged_at ? `Follow-up acknowledged ${last.acknowledged_at} · still open` : "Follow-up acknowledgement pending"}</small>}
              </div>
              <div className="owner-trial-row-actions">
                <CardHelp title={`${item.label} guidance`}>{item.check} An API status or past receipt never replaces this safe manual check.</CardHelp>
                <button type="button" onClick={() => choose(item.id)}>Prepare check</button>
                {last && last.outcome !== "passed" && !last.acknowledged_at && <button type="button" onClick={() => acknowledge(item.id)}>Acknowledge follow-up</button>}
              </div>
            </article>;
          })}
          {visible.length === 0 && <p>No cases match that filter. This does not mean all devices are verified.</p>}
        </div>
      </div>

      <div className="owner-trial-export">
        <button type="button" onClick={downloadReceipt}>Download private HOLD-labelled JSON receipt</button>
        <label>Import previous private trial JSON
          <input type="file" accept=".json,application/json" onChange={event => void importReceipt(event)} />
        </label>
      </div>
      {feedback && <p role="status" className="owner-trial-feedback">{feedback}</p>}
      <p className="owner-trial-privacy">This ledger and coarse API readings stay in this browser session unless manually exported. No evidence is sent to the server for storage, and no background network calls or server mutations occur. Source CI, installed Windows version, API claims, personal observations and independent acceptance are different evidence classes. <strong>FIELD_ACCEPTANCE_HOLD is unconditional.</strong> The first-party password/document Vault remains at 0/6 verified, SECURITY HOLD.</p>
    </section>
  );
}
