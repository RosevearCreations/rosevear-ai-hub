import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  applyAutomationChange,
  approveConfirmation,
  confirmAutomationChange,
  draftAutomation,
  getAutomationHistory,
  getAutomationHistorySummary,
  getAutomationRuntime,
  getAutomations,
  getOllamaModels,
  rejectConfirmation,
  type AutomationChangePayload,
  type AutomationConfirmation,
  type AutomationDraft,
  type AutomationHistorySummary,
  type AutomationRule,
  type AutomationRun,
  type AutomationRunStatus,
  type AutomationRuntime,
  type OllamaModel,
} from "./api";

type LoadState = "loading" | "ready" | "error";

export function AutomationView() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [automations, setAutomations] = useState<AutomationRule[]>([]);
  const [runtime, setRuntime] = useState<AutomationRuntime | null>(null);
  const [history, setHistory] = useState<AutomationRun[]>([]);
  const [historySummary, setHistorySummary] = useState<AutomationHistorySummary | null>(null);
  const [historyStatus, setHistoryStatus] = useState<AutomationRunStatus | "all">("all");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [model, setModel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [draft, setDraft] = useState<AutomationDraft | null>(null);
  const [enableAfterCreation, setEnableAfterCreation] = useState(false);
  const [confirmation, setConfirmation] = useState<AutomationConfirmation | null>(null);
  const [pendingPayload, setPendingPayload] = useState<AutomationChangePayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function refresh() {
    setLoadState("loading");
    setError("");
    try {
      const [rules, modelPayload, runtimePayload, historyPayload, summaryPayload] =
        await Promise.all([
          getAutomations(),
          getOllamaModels(),
          getAutomationRuntime(),
          getAutomationHistory({ limit: 25 }),
          getAutomationHistorySummary(),
        ]);
      setAutomations(rules);
      setModels(modelPayload.models);
      setRuntime(runtimePayload);
      setHistory(historyPayload.runs);
      setHistorySummary(summaryPayload);
      setModel((current) => current || modelPayload.models[0]?.name || "");
      setLoadState("ready");
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load automations.");
      setLoadState("error");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);


  async function loadHistory(statusValue: AutomationRunStatus | "all") {
    setHistoryLoading(true);
    setError("");
    try {
      const result = await getAutomationHistory({
        status: statusValue === "all" ? undefined : statusValue,
        limit: 25,
      });
      setHistory(result.runs);
      setHistoryStatus(statusValue);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load automation history.");
    } finally {
      setHistoryLoading(false);
    }
  }

  const canDraft = model.length > 0 && prompt.trim().length >= 3 && !busy;
  const triggerLabel = useMemo(() => {
    const trigger = draft?.definition.trigger;
    if (!trigger || typeof trigger !== "object") return "Unknown trigger";
    const type = (trigger as Record<string, unknown>).type;
    return typeof type === "string" ? type.replaceAll("_", " ") : "Unknown trigger";
  }, [draft]);

  async function createDraft(event: FormEvent) {
    event.preventDefault();
    if (!canDraft) return;
    setBusy(true);
    setError("");
    setNotice("");
    setConfirmation(null);
    setPendingPayload(null);
    try {
      const result = await draftAutomation(prompt.trim(), "ollama", model);
      setDraft(result);
      setEnableAfterCreation(result.recommended_enabled);
      setNotice("Draft validated. Review every field before requesting a save confirmation.");
    } catch (value) {
      setDraft(null);
      setError(value instanceof Error ? value.message : "AI authoring failed.");
    } finally {
      setBusy(false);
    }
  }

  async function prepareConfirmation() {
    if (!draft || busy) return;
    const payload: AutomationChangePayload = {
      operation: "create",
      automation_id: null,
      name: draft.name,
      enabled: enableAfterCreation,
      definition: draft.definition,
    };
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await confirmAutomationChange(payload);
      setPendingPayload(payload);
      setConfirmation(result);
      setNotice("Exact Level-2 save confirmation prepared. Nothing has been saved yet.");
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to prepare confirmation.");
    } finally {
      setBusy(false);
    }
  }

  async function approveAndCreate() {
    if (!confirmation || !pendingPayload || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await approveConfirmation(confirmation.confirmation_id);
      const result = await applyAutomationChange(
        pendingPayload,
        confirmation.confirmation_id,
      );
      if (result.automation) {
        setAutomations((current) =>
          [...current, result.automation as AutomationRule].sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        );
        setNotice(
          result.automation.enabled
            ? "Automation created and enabled."
            : "Automation created disabled. Enable it only after final review.",
        );
      }
      setDraft(null);
      setPrompt("");
      setConfirmation(null);
      setPendingPayload(null);
      setEnableAfterCreation(false);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to create automation.");
    } finally {
      setBusy(false);
    }
  }

  async function rejectPreparedConfirmation() {
    if (!confirmation || busy) return;
    setBusy(true);
    setError("");
    try {
      await rejectConfirmation(confirmation.confirmation_id);
      setConfirmation(null);
      setPendingPayload(null);
      setNotice("Save confirmation rejected. The draft remains available for review.");
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to reject confirmation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Build 035</p>
          <h1>Automations</h1>
          <p className="lede">
            Author rules with human approval, including local Frigate camera events, inspect durable
            run history, and diagnose failures without automatically replaying uncertain actions.
          </p>
        </div>
        <div className="health-card" role="status">
          <span
            className={runtime?.running ? "status-dot online" : "status-dot pending"}
            aria-hidden="true"
          />
          <span>
            Event Engine {runtime?.running ? "running" : "checking"}
            <small>
              {runtime
                ? runtime.processed_events + " events processed"
                : "Loading runtime status"}
            </small>
            {runtime ? (
              <small>
                Frigate {runtime.frigate_rule_count} rule
                {runtime.frigate_rule_count === 1 ? "" : "s"} · {runtime.frigate_online ? "online" : "idle/offline"}
              </small>
            ) : null}
          </span>
        </div>
      </header>

      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      {notice ? <p className="automation-notice" role="status">{notice}</p> : null}

      <section className="automation-layout">
        <article className="panel automation-author">
          <h2>AI-assisted rule authoring</h2>
          <p>
            Drafts are not saved automatically. The AI can only propose Rule Schema v1 using
            Event Engine-supported Level-1 actions.
          </p>

          <form className="automation-form" onSubmit={(event) => void createDraft(event)}>
            <label>
              Local model
              <select value={model} onChange={(event) => setModel(event.target.value)}>
                {models.length === 0 ? <option value="">No model installed</option> : null}
                {models.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Describe the automation
              <textarea
                rows={7}
                maxLength={4000}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Example: When workshop motion turns on and workshop occupied is on, turn on the workshop light. Add a 30-second cooldown."
              />
            </label>

            <button className="primary-button" type="submit" disabled={!canDraft}>
              {busy ? "Working…" : "Draft and validate"}
            </button>
          </form>

          {models.length === 0 && loadState !== "loading" ? (
            <p className="automation-warning">
              Install at least one Ollama model before using AI-assisted authoring.
            </p>
          ) : null}
        </article>

        <article className="panel">
          <h2>Saved rules</h2>
          {loadState === "loading" ? <p>Loading automations…</p> : null}
          {loadState === "error" ? <p>Automation list is unavailable.</p> : null}
          {loadState === "ready" && automations.length === 0 ? (
            <p>No automations saved yet.</p>
          ) : null}
          <div className="automation-rule-list">
            {automations.map((rule) => {
              const trigger = rule.definition.trigger;
              const triggerType =
                trigger && typeof trigger === "object"
                  ? String((trigger as Record<string, unknown>).type ?? "unknown")
                  : "unknown";
              return (
                <div className="automation-rule-card" key={rule.id}>
                  <strong>{rule.name}</strong>
                  <span>{rule.enabled ? "Enabled" : "Disabled"}</span>
                  <small>{triggerType.replaceAll("_", " ")}</small>
                </div>
              );
            })}
          </div>
        </article>
      </section>


      <section className="automation-history" aria-label="Automation execution history">
        <div className="automation-history-heading">
          <div>
            <p className="eyebrow">Build 029 evidence</p>
            <h2>Execution history</h2>
            <p>
              Failed and interrupted actions are never retried automatically. Correct the cause,
              review the evidence, and allow a new source event to trigger the rule.
            </p>
          </div>
          <label>
            Status
            <select
              value={historyStatus}
              disabled={historyLoading}
              onChange={(event) =>
                void loadHistory(event.target.value as AutomationRunStatus | "all")
              }
            >
              <option value="all">All runs</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="interrupted">Interrupted</option>
              <option value="skipped">Skipped</option>
              <option value="running">Running</option>
            </select>
          </label>
        </div>

        <div className="automation-history-summary">
          <div><span>Total</span><strong>{historySummary?.total_runs ?? 0}</strong></div>
          <div><span>Success</span><strong>{historySummary?.success_count ?? 0}</strong></div>
          <div><span>Failures</span><strong>{historySummary?.failure_count ?? 0}</strong></div>
          <div><span>Skipped</span><strong>{historySummary?.skipped_count ?? 0}</strong></div>
        </div>

        {historyLoading ? <p>Refreshing run history…</p> : null}
        {!historyLoading && history.length === 0 ? <p>No matching automation runs yet.</p> : null}

        <div className="automation-run-list">
          {history.map((run) => {
            const errorValue = run.result_summary.error;
            const failureKind = run.result_summary.failure_kind;
            const sourceValue =
              run.result_summary.event && typeof run.result_summary.event === "object"
                ? (run.result_summary.event as Record<string, unknown>).source
                : null;
            return (
              <article className="automation-run-card" key={run.id}>
                <div className="automation-run-header">
                  <div>
                    <strong>{run.automation_name}</strong>
                    <small>Run #{run.id} · {new Date(run.started_at).toLocaleString()}</small>
                  </div>
                  <span className={"automation-run-status " + run.status}>{run.status}</span>
                </div>
                <dl>
                  <div><dt>Source</dt><dd>{typeof sourceValue === "string" ? sourceValue : "—"}</dd></div>
                  <div><dt>Duration</dt><dd>{run.duration_ms === null ? "—" : run.duration_ms + " ms"}</dd></div>
                  <div><dt>Actions</dt><dd>{String(run.result_summary.actions_completed ?? 0)}</dd></div>
                  <div><dt>Failure kind</dt><dd>{typeof failureKind === "string" ? failureKind : "—"}</dd></div>
                </dl>
                {typeof errorValue === "string" ? <p className="automation-run-error">{errorValue}</p> : null}
                <details>
                  <summary>Run evidence</summary>
                  <pre className="automation-code">{JSON.stringify(run.result_summary, null, 2)}</pre>
                </details>
              </article>
            );
          })}
        </div>
      </section>

      {draft ? (
        <section className="panel automation-review" aria-label="AI draft review">
          <div className="automation-review-heading">
            <div>
              <p className="eyebrow">Validated draft</p>
              <h2>{draft.name}</h2>
              <p>{draft.explanation || "No additional explanation was supplied."}</p>
            </div>
            <span className="automation-trigger">{triggerLabel}</span>
          </div>

          {draft.assumptions.length > 0 ? (
            <div>
              <strong>Assumptions to review</strong>
              <ul>
                {draft.assumptions.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ) : null}

          {draft.warnings.length > 0 ? (
            <div className="automation-warning">
              <strong>Warnings</strong>
              <ul>
                {draft.warnings.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ) : null}

          <details>
            <summary>Review exact Rule Schema JSON</summary>
            <pre className="automation-code">{JSON.stringify(draft.definition, null, 2)}</pre>
          </details>

          <label className="automation-enable">
            <input
              type="checkbox"
              checked={enableAfterCreation}
              onChange={(event) => setEnableAfterCreation(event.target.checked)}
            />
            Enable immediately after creation
          </label>
          <small>
            Disabled is recommended until the trigger, conditions, targets, cooldown, and
            assumptions have all been checked.
          </small>

          {!confirmation ? (
            <button
              className="primary-button"
              type="button"
              disabled={busy}
              onClick={() => void prepareConfirmation()}
            >
              Prepare exact save confirmation
            </button>
          ) : (
            <div className="automation-confirmation">
              <strong>Exact Level-2 action</strong>
              <p>{confirmation.preview.summary}</p>
              <details>
                <summary>Confirmation arguments</summary>
                <pre className="automation-code">
                  {JSON.stringify(confirmation.preview.arguments, null, 2)}
                </pre>
              </details>
              <div className="automation-actions">
                <button
                  className="primary-button"
                  type="button"
                  disabled={busy}
                  onClick={() => void approveAndCreate()}
                >
                  Approve and create this exact rule
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void rejectPreparedConfirmation()}
                >
                  Reject save
                </button>
              </div>
            </div>
          )}
        </section>
      ) : null}
    </>
  );
}
