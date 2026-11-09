import { useEffect, useRef, useState } from "react";

import { getWindowsLauncherEvidence286 } from "./api";
import { launcherCandidatePreview, reviewWindowsLauncherEvidence, type Launcher, type LauncherReview } from "./windowsLauncherEvidence286";

const GUIDANCE: Record<LauncherReview["state"], string> = {
  CANDIDATES_MATCH_UNVERIFIED: "Two local release candidates agree. That does not demonstrate the loaded process binary or identify the original Windows server.",
  CANDIDATES_DIFFER: "The updater pointer differs from the inspector checkout. Inspect the installed checkout and active release record before acceptance.",
  MISSING_CANDIDATE: "One or both candidate identifiers are missing. Confirm the installed directory and updater record locally.",
  INSPECTOR_UNAVAILABLE: "Windows inspector output is missing or invalid. Review PowerShell policy, permissions and the installed script locally. No security settings were changed.",
  NOT_WINDOWS: "The responding backend is not on Windows. The original Windows launchers were not inspected.",
  STALE: "At least one observation is older than five minutes. Request a fresh read.",
  CLOCK_CHECK: "An observation timestamp appears to be in the future. Review clock settings before accepting evidence.",
  INVALID_EVIDENCE: "The backend response did not meet the read-only evidence contract.",
};

function LauncherRow({ label, value }: { label: string; value: Launcher | null }) {
  return <li><strong>{label}:</strong> {value ? <>
    Listener {value.listener.replaceAll("_", " ")}; chain {value.chainStatus.replaceAll("_", " ")}; observed kinds {value.ancestorKinds.join(" → ") || "unavailable"}.
    {value.recoveryScriptMentioned ? " Recovery script name was mentioned (weak hint only)." : " No recovery script mention observed."}
    {value.processPredatesCheckoutCommit === true ? " Process began before the inspected checkout commit (review possible stale launch)." : ""}
  </> : "Not sampled."}</li>;
}

/** Owner-supplied review is session-only and never converts unsigned observations into proof. */
export function WindowsLauncherEvidence286Panel({ ownerId }: { ownerId: string }) {
  const [review, setReview] = useState<LauncherReview | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checks, setChecks] = useState([false, false, false]);
  const [ownerReviewed, setOwnerReviewed] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    setReview(null); setChecks([false, false, false]); setOwnerReviewed(false); setShowPreview(false);
    request.current?.abort();
    request.current = null;
  }, [ownerId]);
  useEffect(() => {
    if (!review || review.state !== "CANDIDATES_MATCH_UNVERIFIED" || review.sampledAtMs === null) return;
    const remaining = Math.max(0, review.sampledAtMs + 5 * 60_000 - Date.now());
    const timer = window.setTimeout(() => {
      setReview(previous => previous?.state === "CANDIDATES_MATCH_UNVERIFIED" ? { ...previous, state: "STALE" } : previous);
      setOwnerReviewed(false);
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [review?.state, review?.sampledAtMs]);

  async function sample() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setReview(null); setError(false); setBusy(true); setChecks([false, false, false]);
    setOwnerReviewed(false); setShowPreview(false);
    try {
      const raw = await getWindowsLauncherEvidence286(controller.signal);
      if (request.current === controller && !controller.signal.aborted) setReview(reviewWindowsLauncherEvidence(raw, Date.now()));
    } catch {
      if (request.current === controller && !controller.signal.aborted) setError(true);
    } finally {
      if (request.current === controller) setBusy(false);
    }
  }
  const mayReview = review?.state === "CANDIDATES_MATCH_UNVERIFIED" &&
    review.web?.listener === "observed" && review.backend?.listener === "observed" &&
    review.web?.chainStatus === "partial_or_complete" && review.backend?.chainStatus === "partial_or_complete" &&
    review.web?.processPredatesCheckoutCommit !== true && review.backend?.processPredatesCheckoutCommit !== true &&
    checks.every(Boolean);
  const checklist = [
    "We are physically reviewing Ree's intended Windows mini-server, not merely a remote API response.",
    "We compared the recorded release and checkout candidates with the installed files and startup task locally.",
    "We observed the web and backend application behavior on this machine; no launch or restart was performed by this screen.",
  ];

  return <section className="panel" aria-labelledby="windows-launcher-286-title">
    <p className="eyebrow">Build 286 · Release candidate and launcher review</p>
    <h3 id="windows-launcher-286-title">Compare installed release candidates and local process ancestry</h3>
    <p>This owner-only check runs the existing read-only Windows launcher inspector on the responding backend. It reports limited process kinds, not process IDs, paths or command lines. A matching checkout and updater pointer does not prove which executable is running.</p>
    <button type="button" disabled={busy} onClick={() => void sample()}>{busy ? "Inspecting launchers…" : "Inspect release and launcher candidates"}</button>
    {error && <p role="alert">The inspection could not be completed. Existing results were cleared; local launcher verification remains on HOLD.</p>}
    {!review && !error && <p role="status">{busy ? "Read-only inspection in progress." : "No launcher inspection in this browser session."}</p>}
    {review && <div aria-live="polite">
      <p role="status"><strong>Candidate comparison: {review.state.replaceAll("_", " ").toLowerCase()}</strong></p>
      <p>{GUIDANCE[review.state]}</p>
      {review.state !== "INVALID_EVIDENCE" && <>
        <p>Recorded updater SHA candidate: {review.recordedSha?.slice(0, 12) ?? "not recorded"}. Checkout SHA candidate: {review.checkoutSha?.slice(0, 12) ?? "not recorded"}. Both are pointers, not loaded-process proof.</p>
        <p>Windows startup task: {review.startupTask.replaceAll("_", " ").toLowerCase()} (SCM/task observation only).</p>
        <ul aria-label="Local launcher process mapping">
          <LauncherRow label="Web listener (5173)" value={review.web} />
          <LauncherRow label="Backend listener (8765)" value={review.backend} />
        </ul>
      </>}
      <fieldset><legend>Guided owner observation — no signature or release authorization</legend>
        {checklist.map((label, index) => <label key={label} style={{ display: "block", marginBlock: "0.5rem" }}>
          <input type="checkbox" checked={checks[index]} disabled={review.state !== "CANDIDATES_MATCH_UNVERIFIED" || ownerReviewed}
            onChange={event => setChecks(previous => previous.map((check, position) => position === index ? event.target.checked : check))} /> {label}
        </label>)}
        <button type="button" disabled={!mayReview || ownerReviewed} onClick={() => setOwnerReviewed(true)}>Record owner self-review for this session</button>
        {ownerReviewed && <p role="status">Owner self-review recorded in this browser session only. Not independently witnessed or signed.</p>}
      </fieldset>
      <p><strong>Installed-process acceptance: HOLD.</strong> No independent device identity, binary-to-process verification or signed witness proof. No Master Shell publisher, Comms routing, receiver or restart was activated.</p>
      <button type="button" aria-expanded={showPreview} aria-controls="windows-launcher-286-preview" onClick={() => setShowPreview(value => !value)}>
        {showPreview ? "Hide local candidate preview" : "Preview bounded Master Shell candidate"}
      </button>
      {showPreview && <div id="windows-launcher-286-preview">
        <p>Local preview only. Not transmitted. Owner acknowledgement is self-reported, not trusted attestation.</p>
        <pre className="hub-report-preview" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{JSON.stringify(launcherCandidatePreview(review, ownerReviewed), null, 2)}</pre>
      </div>}
    </div>}
  </section>;
}
