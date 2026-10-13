import { useEffect, useRef, useState } from "react";
import { getReleaseObservability, type ReleaseObservabilityResponse } from "./api";

export const releaseInterpretation: Record<ReleaseObservabilityResponse["adoption_state"], string> = {
  CURRENT: "Updater recorded the current release; the running process still needs verification.",
  READY: "A release is eligible. Activation is not confirmed.",
  HOLD: "Adoption held. Review local logs and backup/schema gates.",
  ADOPTED: "Adoption recorded. Confirm live processes and browser acceptance.",
  FAILED: "The update failed. Review local logs before retrying.",
  ROLLED_BACK: "A rollback was recorded. Confirm the recovered application works.",
  ROLLBACK_FAILED: "Recovery failed. Keep adoption disabled and inspect locally.",
  UNVERIFIED: "No valid adoption status was found.",
};

function timestamp(value: string | null): string {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleString();
}

export function ReleaseObservabilityPanel() {
  const [snapshot, setSnapshot] = useState<ReleaseObservabilityResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  async function refresh() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    try {
      const data = await getReleaseObservability(controller.signal);
      if (request.current === controller) setSnapshot(data);
    } catch {
      if (controller.signal.aborted) return;
      setSnapshot(null);
      setError("Updater evidence unavailable. Inspect local adoption and recovery logs.");
    } finally {
      if (request.current === controller) setLoading(false);
    }
  }
  return (
    <section className="panel release-observability" aria-label="Managed release and update observability">
      <h2>Build 062 — Managed release &amp; update status</h2>
      <p>Owner-only, on-demand local evidence. Refresh never enrolls, restarts, migrates, or recovers services.</p>
      <button type="button" disabled={loading} onClick={() => void refresh()}>
        {loading ? "Reading local evidence…" : "Refresh release evidence"}
      </button>
      {error && <p role="alert">{error}</p>}
      {!snapshot && !loading && !error && <p>No local status checked yet.</p>}
      {snapshot && (
        <div role="status" aria-live="polite">
          <p><strong>Recorded adoption: {snapshot.adoption_state}</strong></p>
          <p>{releaseInterpretation[snapshot.adoption_state] ?? releaseInterpretation.UNVERIFIED}</p>
          <dl>
            <dt>Adoption task</dt><dd>{snapshot.adoption_task.replaceAll("_", " ")}</dd>
            <dt>Recovery task</dt><dd>{snapshot.recovery_task}</dd>
            <dt>Last attempt</dt><dd>{timestamp(snapshot.last_attempt_utc)}</dd>
            <dt>Recorded active release</dt><dd>{snapshot.active_release?.slice(0, 12) ?? "Not recorded"}</dd>
            <dt>Last attempted release</dt><dd>{snapshot.last_release?.slice(0, 12) ?? "Not recorded"}</dd>
            <dt>Recovery journal</dt><dd>{snapshot.journal_state}</dd>
            <dt>Failure event 610, last seven days</dt><dd>{snapshot.failure_event_610}</dd>
            <dt>Last recorded alert</dt><dd>{timestamp(snapshot.last_alert_recorded_utc)}</dd>
          </dl>
          <p><strong>Automatic-enrollment acceptance: not verified by this panel.</strong></p>
          <p>Configured tasks and GREEN CI do not prove physical rollback, private backup restoration, running process identity or signed-in Windows operation.</p>
          <p>On the server check <code>logs\hub-release-adoption.log</code>,
            <code> logs\hub-release-adoption.json</code> and
            <code> scripts\Run-Hub-Release-Assurance.cmd</code>.</p>
        </div>
      )}
    </section>
  );
}
