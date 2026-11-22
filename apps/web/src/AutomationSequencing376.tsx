import { useEffect, useState } from "react";
import {
  approveSequence376, createSequence376, getSequence376PlanPreview,
  getSequence376Plans, simulateSequence376,
  type AutomationRule, type Sequence376Plan, type Sequence376Preview,
} from "./api";

/** Owner-only graph review and source-pinned simulation. Never invokes devices. */
export function AutomationSequencing376() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [plans, setPlans] = useState<Sequence376Plan[]>([]);
  const [chosen, setChosen] = useState<number[]>([]);
  const [title, setTitle] = useState("Home automation dependency review");
  const [minutes, setMinutes] = useState(3);
  const [linear, setLinear] = useState(true);
  const [preview, setPreview] = useState<Sequence376Preview | null>(null);
  const [cause, setCause] = useState("manual-rehearsal-001");
  const [outage, setOutage] = useState<"none" | "home_assistant" |
    "mqtt" | "frigate" | "external_app">("none");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    try {
      const [found, existing] = await Promise.all([
        import("./api").then(api => api.getAutomations()),
        getSequence376Plans(),
      ]);
      setRules(found);
      setPlans(existing.plans);
    } catch {
      setMessage("Private sequencing review unavailable.");
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function create() {
    if (chosen.length === 0) return;
    setBusy(true);
    setMessage("");
    setPreview(null);
    try {
      const plan = await createSequence376({
        title, cooldown_seconds: minutes * 60, expected_revision: 0,
        steps: chosen.map((id, index) => ({
          automation_id: id,
          depends_on: linear && index > 0 ? [chosen[index - 1]] : [],
        })),
      });
      setPlans(old => [...old, plan]);
      setChosen([]);
      setMessage("Saved a local review plan. No rules or devices were changed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Plan not accepted.");
    } finally {
      setBusy(false);
    }
  }

  async function inspect(id: number) {
    setBusy(true);
    setMessage("");
    try {
      setPreview(await getSequence376PlanPreview(id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to inspect plan.");
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (!preview || !preview.sourceHash) return;
    if (!window.confirm("Approve this exact SOURCE-PINNED DRY RUN only? " +
      "No device commands or automation execution are enabled.")) return;
    setBusy(true);
    try {
      await approveSequence376(preview.plan.id, {
        expected_revision: preview.plan.revision,
        expected_source_hash: preview.sourceHash,
        owner_confirmed: true,
      });
      await refresh();
      setPreview(await getSequence376PlanPreview(preview.plan.id));
      setMessage("Approved for simulation ONLY; no live automation was enabled.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Approval not accepted.");
    } finally {
      setBusy(false);
    }
  }

  async function simulate() {
    if (!preview) return;
    setBusy(true);
    try {
      const result = await simulateSequence376(preview.plan.id, {
        cause_id: cause, expected_revision: preview.plan.revision,
        unavailable_sources: outage === "none" ? [] : [outage],
      });
      setMessage(result.state + " · " + (result.reasonCodes?.join(", ") ||
        result.reason || "Review only") + " · 0 device actions");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Simulation failed.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="panel" aria-label="Build 376 automation sequence review">
    <p className="eyebrow">Build 376 · Safe automation sequencing</p>
    <h2>Dependency graph, exact approval and outage rehearsal</h2>
    <p>Review existing automation rules and simulate dependency order. This
      feature does not send Home Assistant commands, MQTT traffic,
      camera events or messages to other applications.</p>
    <p><strong>Execution: DISABLED. Manual approval is for simulations only.</strong></p>
    <label>Plan name
      <input value={title} maxLength={120}
        onChange={event => setTitle(event.target.value)} />
    </label>
    <label>Cooldown in minutes (1–1,440)
      <input type="number" min="1" max="1440" value={minutes}
        onChange={event => setMinutes(Number(event.target.value))} />
    </label>
    <label><input type="checkbox" checked={linear}
      onChange={event => setLinear(event.target.checked)} />
      Each step depends on the previous step (untick for independent steps)
    </label>
    <p>Choose up to twelve distinct existing rules in dependency order.</p>
    <div className="ha-entity-list">
      {rules.slice(0, 50).map(rule => <label key={rule.id}>
        <input type="checkbox" checked={chosen.includes(rule.id)}
          disabled={!chosen.includes(rule.id) && chosen.length >= 12}
          onChange={event => setChosen(current => event.target.checked ?
            [...current, rule.id] : current.filter(id => id !== rule.id))} />
        {rule.name} · {rule.enabled ? "enabled source" : "disabled source"}
      </label>)}
    </div>
    <button type="button" disabled={busy || chosen.length === 0 || minutes < 1 ||
      minutes > 1440 || !title.trim()} onClick={() => void create()}>
      Save review-only plan
    </button>
    <h3>Stored plans</h3>
    {plans.length === 0 ? <p>No sequencing plans stored.</p> :
      <div className="ha-entity-list">{plans.map(plan => <article
        className="ha-entity-card" key={plan.id}>
        <strong>{plan.title}</strong>
        <p>{plan.steps.length} steps · revision {plan.revision} ·
          {" "}{plan.approvedHash ? "simulation reviewed" : "approval required"}</p>
        <button type="button" disabled={busy} onClick={() => void inspect(plan.id)}>
          Inspect exact dependencies
        </button>
      </article>)}</div>}
    {preview && <section className="panel">
      <h3>{preview.plan.title} — preview</h3>
      <p>Topological order: {preview.order.join(" → ")} ·
        {" "}{preview.state.replaceAll("_", " ")}</p>
      {preview.blockers.length > 0 && <p role="alert">
        Holds: {preview.blockers.join(", ")}
      </p>}
      <p>Exact rule source fingerprint: <code>{preview.sourceHash || "unknown"}</code>.
        A rule edit invalidates this approval automatically.</p>
      {preview.orderedRules.map(rule => <div key={rule.automationId}>
        <p>{rule.automationId}. {rule.name} · {rule.enabled ? "enabled" : "disabled"} ·
          {" "}trigger {rule.triggerType} · tools {rule.toolKeys.join(", ")}</p>
      </div>)}
      <button type="button" disabled={busy || !preview.sourceVersionPinned ||
        preview.blockers.some(code => code !== "HOLD_OWNER_APPROVAL_REQUIRED") ||
        preview.blockers.length === 0} onClick={() => void approve()}>
        Approve exact dry-run only
      </button>
      <label>Opaque rehearsal cause identifier
        <input value={cause} maxLength={80}
          onChange={event => setCause(event.target.value)} />
      </label>
      <label>Simulated provider failure (not a live status probe)
        <select value={outage} onChange={event => setOutage(
          event.target.value as typeof outage)}>
          <option value="none">None</option>
          <option value="home_assistant">Home Assistant unavailable</option>
          <option value="mqtt">MQTT unavailable</option>
          <option value="frigate">Frigate unavailable</option>
          <option value="external_app">Other application unavailable</option>
        </select>
      </label>
      <button type="button" disabled={busy || !cause.trim()} onClick={() =>
        void simulate()}>Record one replay-guarded simulation</button>
    </section>}
    {message && <p className="runtime-status" role="status">{message}</p>}
    <p>Other application telemetry is runtime input, not a Git commit.
      Real source updates require their own code review; never combine
      device events with a branch merge or treat a missing provider as healthy.</p>
  </section>;
}
