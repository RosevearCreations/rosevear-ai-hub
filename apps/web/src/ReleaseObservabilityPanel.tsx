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
      <h2>Build 063 — Release health &amp; supervised recovery</h2>
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
          <h3>Recent release health cohorts (UTC, last seven days)</h3>
          <p>Counts group the recognized local log states by day, not by release SHA. Old, incomplete
            or damaged logs cannot support a complete success rate.</p>
          <p>Log sampling: <strong>{snapshot.health_cohorts.state}</strong>; recognized events:{" "}
            {snapshot.health_cohorts.events_counted}; unparsed lines:{" "}
            {snapshot.health_cohorts.unparsed_lines}.</p>
          {snapshot.health_cohorts.history_partial && (
            <p>History is truncated to a bounded sample. Do not treat totals as exhaustive.</p>
          )}
          {snapshot.health_cohorts.days.length === 0 ? (
            <p>No valid recent release events found.</p>
          ) : (
            <ul aria-label="UTC release health days">
              {snapshot.health_cohorts.days.map((cohort) => (
                <li key={cohort.utc_day}>
                  <strong>{cohort.utc_day}</strong>:
                  {" "}{Object.entries(cohort.counts)
                    .filter(([, count]) => count > 0)
                    .map(([state, count]) => `${state}: ${count}`)
                    .join(" · ")}
                </li>
              ))}
            </ul>
          )}
          <h3>Supervised recovery evidence</h3>
          <p>Operator report: <strong>{snapshot.supervised_recovery.status.replaceAll("_", " ")}</strong>.
            Completed checklist steps: {snapshot.supervised_recovery.reported_steps} /
            {snapshot.supervised_recovery.required_steps}.
          </p>
          <p>Evidence recorded: {timestamp(snapshot.supervised_recovery.observed_utc)}.
            Even a complete self-attestation is <strong>not independently machine-verified</strong>.</p>
          <p>The checklist must document a supervised rollback and re-adoption between two
            different releases at the same database schema. See
            <code> docs/BUILD_063_RELEASE_HEALTH_RECOVERY.md</code>.</p>
          <h3>Build 064 — Release incident triage</h3>
          <p>Incident counts are observations, not unique incidents: retries can create
            more than one event. Classification: <strong>{snapshot.incident_triage.observation}</strong>.</p>
          <ul aria-label="Release incident categories">
            {snapshot.incident_triage.groups.map((group) => (
              <li key={group.category}>
                <strong>{group.category.replaceAll("_", " ")}</strong>:
                {" "}{group.observed_events} event(s) across {group.affected_days} day(s).
                {" "}{group.recurring_across_days ? "Repeated across days; investigate." : "No multi-day recurrence established."}
              </li>
            ))}
          </ul>
          <p>Recovery follow-up: {snapshot.incident_triage.recovery_follow_up.replaceAll("_", " ")}.</p>
          <p>Operator review ledger: <strong>{snapshot.incident_reviews.state.replaceAll("_", " ")}</strong>;
            {" "}{snapshot.incident_reviews.open_records} open,
            {" "}{snapshot.incident_reviews.investigating_records} investigating,
            {" "}{snapshot.incident_reviews.operator_reported_resolved_records} reported resolved.
            No operator declaration automatically closes a system incident.</p>
          <p>Review on the server using <code>docs/BUILD_064_RELEASE_INCIDENT_TRIAGE.md</code>.
            The web interface reads evidence only; no automatic retries or fixes are triggered.</p>
          <h3>Build 066 — Guided integration recovery &amp; operator acceptance</h3>
          <p>Follow the steps below on the Windows server, then record an optional, private
            acceptance checklist. Reports are not independent service-health verification.
            No restart, publish, camera discovery or configuration change is triggered.</p>
          {!snapshot.integration_recovery ? (
            <p>Integration recovery evidence is unavailable from this backend version.</p>
          ) : (
            <>
              <p>Operator ledger: <strong>{snapshot.integration_recovery.ledger_state.replaceAll("_", " ")}</strong>.
                {" "}No service is machine-verified by this checklist.</p>
              <ul aria-label="Integration recovery instructions">
                {snapshot.integration_recovery.integrations.map((item) => (
                  <li key={item.integration}>
                    <strong>{({
                      home_assistant: "Home Assistant",
                      mqtt: "MQTT",
                      ollama: "Ollama",
                      frigate: "Frigate",
                      go2rtc: "go2rtc",
                    } as Record<string, string>)[item.integration] ?? item.integration}</strong>:
                    {" "}{item.status.replaceAll("_", " ")}
                    {" "}({item.completed_checks}/{item.required_checks} reported checks).
                    {" "}Last review: {timestamp(item.last_review_utc)}.
                    <ol>
                      {item.steps.map((step) => <li key={step}>{step}</li>)}
                    </ol>
                  </li>
                ))}
              </ul>
              <p>Record evidence locally using
                <code> docs/BUILD_066_INTEGRATION_RECOVERY.md</code>;
                never include tokens, addresses or passwords in the checklist.</p>
            </>
          )}
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
