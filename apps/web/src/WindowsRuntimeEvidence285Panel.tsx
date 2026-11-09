import { useEffect, useRef, useState } from "react";

import { getHealth, getHubVersion, getWindowsRuntimeEvidence285 } from "./api";
import { reviewWindowsRuntimeEvidence, windowsEvidenceCandidatePreview, type WindowsEvidenceReview } from "./windowsRuntimeEvidence285";

const STATE_GUIDANCE: Record<WindowsEvidenceReview["state"], string> = {
  LIVE_WINDOWS_SERVICE_SNAPSHOT: "A Windows backend responded and Windows service registration was sampled. This does not identify Ree's machine or verify the installed release.",
  NOT_WINDOWS_HOST: "The responding backend reports a non-Windows host. No Windows services were inspected.",
  STALE: "The observation is older than five minutes. Refresh before making a current decision.",
  CLOCK_CHECK: "The server clock appears ahead of this browser. Check both clocks; do not accept freshness.",
  VERSION_MISMATCH: "Two API version responses disagree. Confirm the local proxy and running backend before trusting the result.",
  HEALTH_MISMATCH: "Backend /health does not agree with /version on service, environment or healthy status. Do not accept a live health claim.",
  INVALID_EVIDENCE: "The response did not meet the bounded evidence contract. No Windows status is accepted.",
};

/** Owner-only explicit read from the responding backend. No service commands or automatic polling. */
export function WindowsRuntimeEvidence285Panel() {
  const [review, setReview] = useState<WindowsEvidenceReview | null>(null);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (review?.state !== "LIVE_WINDOWS_SERVICE_SNAPSHOT" || review.sampledAtMs === null) return;
    // Invalidate the display locally when five minutes elapse. No background
    // service request or automatic polling is initiated.
    const remaining = Math.max(0, review.sampledAtMs + 5 * 60_000 - Date.now());
    const timer = window.setTimeout(() => setReview(previous => previous?.state === "LIVE_WINDOWS_SERVICE_SNAPSHOT"
      ? { ...previous, state: "STALE" } : previous), remaining);
    return () => window.clearTimeout(timer);
  }, [review?.state, review?.sampledAtMs]);

  async function check() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setReview(null);
    setCheckedAt(null);
    setError("");
    setShowPreview(false);
    setBusy(true);
    try {
      const [snapshot, version, health] = await Promise.all([
        getWindowsRuntimeEvidence285(controller.signal), getHubVersion(controller.signal), getHealth(controller.signal),
      ]);
      if (request.current !== controller) return;
      const now = Date.now();
      setReview(reviewWindowsRuntimeEvidence(snapshot, version, health, now));
      setCheckedAt(now);
    } catch {
      if (request.current !== controller || controller.signal.aborted) return;
      setError("No current backend observation. The installed version and Windows services remain unverified. Check the installed server and sign-in separately.");
    } finally {
      if (request.current === controller) setBusy(false);
    }
  }

  function reassess() {
    if (!review || checkedAt === null) return;
    // The snapshot's original receipt time is retained; a stale receipt cannot
    // be made fresh by simply clicking a UI button. Ask for a new server read.
    setReview(null);
    setCheckedAt(null);
    setShowPreview(false);
  }

  return <section className="panel" aria-labelledby="windows-runtime-285-title">
    <p className="eyebrow">Build 285 · Windows installed-version and service evidence</p>
    <h3 id="windows-runtime-285-title">Inspect the responding Hub server</h3>
    <p>Owner-only, manual, read-only request. The runtime snapshot, /version and /health must agree; on Windows the backend also queries four fixed service names. A service registered or running in Windows does <strong>not</strong> prove that its application works. Neither this browser nor CI independently identifies Ree's mini-server.</p>
    <div className="hub-connection-actions">
      <button type="button" disabled={busy} onClick={() => void check()}>
        {busy ? "Reading server evidence…" : "Check installed server and services"}
      </button>
      {review && <button type="button" onClick={reassess}>Clear snapshot</button>}
    </div>
    {error && <p role="alert">{error}</p>}
    {!review && !error && <p role="status">{busy ? "Request in progress; no status accepted yet." : "No installed server observation in this session."}</p>}
    {review && <div role="status" aria-live="polite">
      <p><strong>Live evidence state: {review.state.replaceAll("_", " ").toLowerCase()}</strong></p>
      <p>{STATE_GUIDANCE[review.state]}</p>
      {review.state !== "INVALID_EVIDENCE" && <>
        <p>Responding backend package version: <strong>{review.backendVersion ?? "not available"}</strong> (API self-report, not installed binary proof).</p>
        <p>Live backend /health cross-check: <strong>{review.backendHealthObserved ? "API reported OK (self-report)" : "not accepted"}</strong>.</p>
        <p>Recorded release pointer: <strong>{review.activeReleaseCandidate?.slice(0, 12) ?? "not recorded"}</strong> (local updater record only, not a running-process match).</p>
        <p>Host platform reported: {review.platform === "WINDOWS" ? "Windows" : "not Windows"}.</p>
        <p>Snapshot time: {review.sampledAtMs === null ? "unknown" : new Date(review.sampledAtMs).toLocaleString()} (server clock; valid for five minutes).</p>
        <h4>Windows service registration observations</h4>
        <ul aria-label="Windows service observations">{review.services.map(service => <li key={service.id}>
          <strong>{service.label}</strong>: {service.status.replaceAll("_", " ").toLowerCase()}.
          {service.status === "NOT_REGISTERED" ? " May instead run as a user application or VM." : ""}
        </li>)}</ul>
      </>}
      <p><strong>Installed release verification: HOLD.</strong> Independent process-to-release proof, physical device identity and witness acceptance are missing. This observation cannot authorize Master Shell publishing, receiver activation, restarts or service repair.</p>
      <button type="button" aria-expanded={showPreview} aria-controls="windows-runtime-285-preview" onClick={() => setShowPreview(previous => !previous)}>
        {showPreview ? "Hide candidate report" : "Preview sanitized Master Shell candidate"}
      </button>
      {showPreview && <div id="windows-runtime-285-preview">
        <p>Local preview only; no hostname, URL, service arguments, process IDs, credentials, owner identity or network transmission.</p>
        <pre className="hub-report-preview" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{JSON.stringify(windowsEvidenceCandidatePreview(review), null, 2)}</pre>
      </div>}
    </div>}
  </section>;
}
