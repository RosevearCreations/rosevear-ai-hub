import { useMemo, useState } from "react";

import {
  applyAutomationChange,
  approveConfirmation,
  confirmAutomationChange,
  rejectConfirmation,
  type AutomationChangePayload,
  type AutomationConfirmation,
  type AutomationHistorySummary,
  type AutomationRule,
  type AutomationRun,
  type AutomationRuntime,
} from "./api";

export type OperationalState = "disabled" | "event_ready" | "check_source" | "check_runtime";

export function describeTrigger(rule: AutomationRule): string {
  const trigger = rule.definition.trigger;
  if (!trigger || typeof trigger !== "object") return "Trigger not verified";
  const kind = (trigger as Record<string, unknown>).type;
  switch (kind) {
    case "state_change": return "Home Assistant · state change";
    case "state_threshold": return "Home Assistant · numeric threshold";
    case "mqtt_message": return "MQTT · incoming message";
    case "frigate_event": return "Frigate · camera event";
    default: return "Unsupported event trigger";
  }
}

export function readiness(rule: AutomationRule, runtime: AutomationRuntime | null): OperationalState {
  if (!rule.enabled) return "disabled";
  if (!runtime?.running) return "check_runtime";
  const kind = (rule.definition.trigger as Record<string, unknown> | undefined)?.type;
  if (kind === "mqtt_message" && !runtime.mqtt_configured) return "check_source";
  if ((kind === "state_change" || kind === "state_threshold") && !runtime.home_assistant_configured) {
    return "check_source";
  }
  if (kind === "frigate_event" && (!runtime.frigate_configured || !runtime.frigate_online)) {
    return "check_source";
  }
  return "event_ready";
}

export function lastRunForRule(ruleId: number, recentRuns: AutomationRun[]): AutomationRun | undefined {
  return recentRuns.filter((run) => run.automation_id === ruleId)
    .sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at))[0];
}

type PendingChange = { payload: AutomationChangePayload; confirmation: AutomationConfirmation };

export function AutomationOperationsConsole({
  rules, history, runtime, summary, onChanged,
}: {
  rules: AutomationRule[];
  history: AutomationRun[];
  runtime: AutomationRuntime | null;
  summary: AutomationHistorySummary | null;
  onChanged: () => Promise<void>;
}) {
  const [filter, setFilter] = useState("all");
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const counters = useMemo(() => ({
    enabled: rules.filter((rule) => rule.enabled).length,
    disabled: rules.filter((rule) => !rule.enabled).length,
    sourceCheck: rules.filter((rule) => readiness(rule, runtime) === "check_source").length,
  }), [rules, runtime]);

  const visible = rules.filter((rule) =>
    filter === "all"
    || (filter === "enabled" && rule.enabled)
    || (filter === "disabled" && !rule.enabled)
    || (filter === "failed" && ["failed", "interrupted"].includes(lastRunForRule(rule.id, history)?.status ?? ""))
    || (filter === "needs_attention" && ["check_source", "check_runtime"].includes(readiness(rule, runtime)))
  );

  async function prepare(rule: AutomationRule) {
    if (busy || pending) return;
    setBusy(true);
    setMessage("");
    try {
      const payload: AutomationChangePayload = {
        operation: "update", automation_id: rule.id, name: rule.name,
        enabled: !rule.enabled, definition: rule.definition,
      };
      const confirmation = await confirmAutomationChange(payload);
      setPending({ payload, confirmation });
      setMessage("Exact change preview prepared. Nothing has changed yet.");
    } catch {
      setMessage("Could not prepare exact change. Verify permissions and current rule state.");
    } finally { setBusy(false); }
  }

  async function apply() {
    if (!pending || busy) return;
    setBusy(true);
    setMessage("");
    try {
      await approveConfirmation(pending.confirmation.confirmation_id);
      await applyAutomationChange(pending.payload, pending.confirmation.confirmation_id);
      setPending(null);
      setMessage("Confirmed rule state updated. No previous run was replayed.");
      await onChanged();
    } catch {
      setPending(null);
      setMessage("Rule change not verified. Refresh rules before preparing a fresh confirmation.");
    } finally { setBusy(false); }
  }

  async function reject() {
    if (!pending || busy) return;
    setBusy(true);
    try {
      await rejectConfirmation(pending.confirmation.confirmation_id);
      setPending(null);
      setMessage("Rule change rejected. No automation was changed.");
    } catch {
      setMessage("Could not reject pending confirmation; allow expiry and refresh.");
    } finally { setBusy(false); }
  }

  return (
    <section className="panel automation-operations-console" aria-label="Automation operations console">
      <header>
        <p className="eyebrow">Build 056</p>
        <h2>Operations &amp; rule readiness</h2>
        <p>Event-triggered rules, not clock schedules. Readiness is a configuration snapshot,
          not proof of broker connectivity or future execution. No automatic replay.</p>
      </header>
      <dl className="automation-operations-stats">
        <div><dt>Enabled rules</dt><dd>{counters.enabled}</dd></div>
        <div><dt>Disabled rules</dt><dd>{counters.disabled}</dd></div>
        <div><dt>Check source configuration</dt><dd>{counters.sourceCheck}</dd></div>
        <div><dt>Failed / interrupted recorded</dt><dd>{summary?.failure_count ?? "Unknown"}</dd></div>
        <div><dt>Interrupted after restart</dt><dd>{runtime?.recovered_interrupted_runs ?? "Unknown"}</dd></div>
        <div><dt>Auto-retry</dt><dd>{summary?.automatic_retry_enabled ? "Enabled" : "Off"}</dd></div>
      </dl>
      <p>Event queue: {runtime ? `${runtime.queue_depth} / ${runtime.queue_capacity}` : "Not verified"}.
        Dropped: {runtime?.dropped_events ?? "Unknown"} · Processing failures: {runtime?.failed_events ?? "Unknown"}.
        No run should be replayed just because a previous outcome is uncertain.</p>
      <label>Filter operational rules
        <select aria-label="Filter operational rules" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All rules</option>
          <option value="enabled">Enabled</option>
          <option value="disabled">Disabled</option>
          <option value="needs_attention">Source/runtime needs attention</option>
          <option value="failed">Failure in last 25 listed runs</option>
        </select>
      </label>
      <p>{visible.length} / {rules.length} rules shown. Run evidence below is a recent sample,
        not a lifetime failure count per rule.</p>
      <div className="automation-operational-rules">
        {visible.map((rule) => {
          const last = lastRunForRule(rule.id, history);
          const state = readiness(rule, runtime);
          return (
            <article key={rule.id} className="automation-operational-rule">
              <strong>{rule.name}</strong>
              <small>{describeTrigger(rule)} · {rule.enabled ? "Enabled" : "Disabled"}</small>
              <dl>
                <div><dt>Readiness</dt><dd>{state.replaceAll("_", " ")}</dd></div>
                <div><dt>Last observed run</dt><dd>{last
                  ? `${last.status} · ${new Date(last.started_at).toLocaleString()}`
                  : "No run in recent sample"}</dd></div>
                <div><dt>Cooldown</dt><dd>{String(rule.definition.cooldown_seconds ?? 0)} seconds</dd></div>
              </dl>
              <button type="button" disabled={busy || pending !== null}
                onClick={() => void prepare(rule)}>
                Prepare exact {rule.enabled ? "pause" : "enable"} confirmation
              </button>
            </article>
          );
        })}
      </div>
      {pending && (
        <section className="automation-operations-pending" aria-label="Exact rule change preview">
          <h3>Confirm exact rule state change</h3>
          <p>{pending.confirmation.preview.summary}</p>
          <p>Will {pending.payload.enabled ? "enable" : "disable"} one existing rule.
            No past run will be retried. Enabled rules require source and tool readiness.</p>
          <details><summary>Exact arguments</summary>
            <pre className="automation-code">{JSON.stringify(pending.confirmation.preview.arguments, null, 2)}</pre>
          </details>
          <p>Expires: {new Date(pending.confirmation.expires_at).toLocaleString()}</p>
          <button type="button" disabled={busy} onClick={() => void apply()}>Approve exact change</button>
          <button type="button" disabled={busy} onClick={() => void reject()}>Reject</button>
        </section>
      )}
      {message && <p role="status">{message}</p>}
      {rules.length === 0 && <p>No saved rules yet. Draft and confirm a rule below.</p>}
      <small>Failed and interrupted physical actions are not automatically retried.
        Inspect Run evidence and Audit records before changing a rule.</small>
    </section>
  );
}
