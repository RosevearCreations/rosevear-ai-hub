import { useEffect, useRef, useState } from "react";

import { getWindowsLauncherEvidence286 } from "./api";
import { WindowsEvidenceHandoff288Panel } from "./WindowsEvidenceHandoff288Panel";
import { reviewWindowsLauncherEvidence, type LauncherReview } from "./windowsLauncherEvidence286";
import {
  inspectWindowsLauncherDrift287, loadOwnerWindowsRecords287, masterShellWindowsReadiness287,
  previousWindowsTransition287, recordWindowsOwnerObservation287, type LauncherDriftCode,
  type OwnerWindowsOutcome, type OwnerWindowsRecord,
} from "./windowsOwnerAcceptance287";

const DRIFT_LABELS: Record<LauncherDriftCode, string> = {
  UPDATER_RELEASE_CHANGED: "Recorded updater release changed",
  CHECKOUT_CHANGED: "Inspected checkout changed",
  WEB_LAUNCHER_CHANGED: "Web listener or launcher chain changed",
  BACKEND_LAUNCHER_CHANGED: "Backend listener or launcher chain changed",
  STARTUP_TASK_CHANGED: "Windows startup task status changed",
};

function localStorageOrNull(): Storage | null {
  try { return typeof window !== "undefined" ? window.localStorage : null; }
  catch { return null; }
}

/** Owner reports and detected candidate drift, not a release authority or publisher. */
export function WindowsOwnerAcceptance287Panel({ ownerId }: { ownerId: string }) {
  const [records, setRecords] = useState<OwnerWindowsRecord[]>(() =>
    loadOwnerWindowsRecords287(localStorageOrNull(), ownerId));
  const [review, setReview] = useState<LauncherReview | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [checks, setChecks] = useState([false, false, false]);
  const [message, setMessage] = useState("No owner observation recorded in this browser session.");
  const [showPreview, setShowPreview] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    request.current?.abort(); request.current = null;
    setRecords(loadOwnerWindowsRecords287(localStorageOrNull(), ownerId));
    setReview(null); setChecks([false, false, false]); setShowPreview(false);
    setError(false); setMessage("Switched owner; no prior browser session evidence was carried over.");
  }, [ownerId]);
  useEffect(() => {
    if (review?.sampledAtMs === null || review?.sampledAtMs === undefined) return;
    const remaining = Math.max(0, review.sampledAtMs + 5 * 60_000 - Date.now());
    const timer = window.setTimeout(() => setNowMs(Date.now()), remaining + 1);
    return () => window.clearTimeout(timer);
  }, [review?.sampledAtMs]);

  const latest = records.at(-1) ?? null;
  const drift = inspectWindowsLauncherDrift287(latest, review, nowMs);
  const historyChanges = previousWindowsTransition287(records);
  const canRecord = review !== null && [
    "CANDIDATES_MATCH_UNVERIFIED", "CANDIDATES_DIFFER", "MISSING_CANDIDATE",
  ].includes(review.state) && review.sampledAtMs !== null &&
    nowMs - review.sampledAtMs <= 5 * 60_000 && review.sampledAtMs <= nowMs + 60_000 && checks.every(Boolean);
  const canReportWorking = canRecord && review?.state === "CANDIDATES_MATCH_UNVERIFIED" &&
    review.web?.listener === "observed" && review.backend?.listener === "observed" &&
    review.web?.chainStatus === "partial_or_complete" && review.backend?.chainStatus === "partial_or_complete" &&
    review.web?.processPredatesCheckoutCommit !== true && review.backend?.processPredatesCheckoutCommit !== true;

  async function inspect() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setReview(null); setError(false); setBusy(true); setChecks([false, false, false]); setShowPreview(false);
    try {
      const raw = await getWindowsLauncherEvidence286(controller.signal);
      if (request.current === controller && !controller.signal.aborted) {
        const now = Date.now();
        setNowMs(now);
        setReview(reviewWindowsLauncherEvidence(raw, now));
      }
    } catch {
      if (request.current === controller && !controller.signal.aborted) setError(true);
    } finally {
      if (request.current === controller) setBusy(false);
    }
  }

  function record(outcome: OwnerWindowsOutcome) {
    const result = recordWindowsOwnerObservation287(
      localStorageOrNull(), ownerId, records, review, outcome, checks.every(Boolean), Date.now());
    if (result.saved) {
      setRecords(result.records);
      setChecks([false, false, false]);
      setMessage("Owner-reported observation saved in this browser only. This is not signed or independently witnessed.");
    } else {
      setMessage("No observation saved. Check the current inspector evidence, three confirmations and browser storage.");
    }
  }

  return <><section className="panel" aria-labelledby="windows-owner-287-title">
    <p className="eyebrow">Build 287 · Original Windows owner observations and drift</p>
    <h3 id="windows-owner-287-title">Owner field evidence and Master Shell reconciliation</h3>
    <p>Compare a fresh read-only launcher snapshot with up to five previous <strong>owner-reported</strong> observations saved only in this browser. This screen does not prove we are on Ree's physical Windows machine, sign an acceptance, modify startup settings or send a Master Shell report.</p>
    <button type="button" disabled={busy} onClick={() => void inspect()}>
      {busy ? "Reading local launcher candidates…" : "Compare current launcher with owner history"}
    </button>
    {error && <p role="alert">Inspection unavailable; current launcher status is not accepted. Previous local owner notes remain unchanged.</p>}
    <p role="status">{message}</p>
    <p>Browser-local owner observations: <strong>{records.length}</strong> (most recent {latest ? new Date(latest.recordedAtMs).toLocaleString() : "none"}).</p>
    {review && <p>Fresh comparison: <strong>{review.state.replaceAll("_", " ").toLowerCase()}</strong>. Live candidate inspection is not installed binary attestation.</p>}
    <p>Drift status: <strong>{drift.state.replaceAll("_", " ").toLowerCase()}</strong>.</p>
    {drift.changes.length > 0 && <ul aria-label="Current launcher drift details">
      {drift.changes.map(code => <li key={code}>{DRIFT_LABELS[code]}</li>)}
    </ul>}
    {historyChanges.length > 0 && <>
      <p><strong>Recorded historical transition:</strong> The last two owner snapshots differ. Saving a new observation does not erase that history.</p>
      <ul aria-label="Previous recorded launcher changes">{historyChanges.map(code => <li key={code}>{DRIFT_LABELS[code]}</li>)}</ul>
    </>}
    {review && <fieldset>
      <legend>Guided original Windows field review — self-report only</legend>
      {[
        "We checked the actual intended Windows computer, not just the URL responding in this browser.",
        "We compared the installed version and Windows startup task with the reported release candidates.",
        "We observed the web and backend behavior or identified an issue to record; no restart was requested here.",
      ].map((label, index) => <label key={label} style={{ display: "block", marginBlock: "0.5rem" }}>
        <input type="checkbox" checked={checks[index]}
          onChange={event => setChecks(previous => previous.map((value, position) => position === index ? event.target.checked : value))} /> {label}
      </label>)}
      <div className="hub-connection-actions">
        <button type="button" disabled={!canReportWorking} onClick={() => record("owner_reported_working")}>Record owner-reported working</button>
        <button type="button" disabled={!canRecord} onClick={() => record("owner_reported_issue")}>Record owner-reported issue</button>
      </div>
    </fieldset>}
    <p><strong>Master Shell readiness: HOLD.</strong> This local audit trail and drift comparison are not original-host proof, signed owner consent, independent witness acceptance or an approved AI Data Platform reporting connection.</p>
    <button type="button" aria-expanded={showPreview} aria-controls="windows-owner-287-preview"
      onClick={() => setShowPreview(value => !value)}>
      {showPreview ? "Hide readiness candidate" : "Preview sanitized Master Shell readiness"}
    </button>
    {showPreview && <div id="windows-owner-287-preview">
      <p>Local preview only. No owner identity, device address, command line, process ID, credentials or external transmission.</p>
      <pre className="hub-report-preview" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
        {JSON.stringify(masterShellWindowsReadiness287(records, review, nowMs), null, 2)}
      </pre>
    </div>}
  </section><WindowsEvidenceHandoff288Panel ownerId={ownerId} records={records} review={review} /></>;
}
