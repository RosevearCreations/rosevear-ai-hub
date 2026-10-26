import { useMemo, useState } from "react";

import {
  executeHomeAssistantScene, previewHomeAssistantScene,
  type AuthUser, type HomeAssistantBrowserResponse, type HomeAssistantControlPolicy,
  type HomeAssistantSceneExecution, type HomeAssistantScenePreview, type HomeAssistantSceneStep,
} from "./api";
import { safeSceneTargets, validSceneDraft } from "./sceneDraftModel";

type PreviewState = { result: HomeAssistantScenePreview; snapshot: string; expiresAt: number };

export function SceneDraftWorkbench({
  role, browser, policy,
}: {
  role: AuthUser["role"];
  browser: HomeAssistantBrowserResponse;
  policy: HomeAssistantControlPolicy;
}) {
  const canOperate = role === "owner" || role === "administrator";
  const options = useMemo(() => safeSceneTargets(browser, policy), [browser, policy]);
  const [steps, setSteps] = useState<HomeAssistantSceneStep[]>([]);
  const [selectedEntity, setSelectedEntity] = useState("");
  const [selectedAction, setSelectedAction] = useState<"on" | "off">("on");
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [execution, setExecution] = useState<HomeAssistantSceneExecution | null>(null);
  const snapshot = JSON.stringify(steps);
  const previewMatches = preview?.snapshot === snapshot && preview.expiresAt > Date.now();
  const targets = new Map(options.map((item) => [item.entity_id, item]));
  const available = options.filter((item) => !steps.some((step) => step.entity_id === item.entity_id));

  function invalidate() {
    setPreview(null);
    setConfirmation("");
    setExecution(null);
  }

  function addStep() {
    if (!selectedEntity || steps.length >= 4 || !available.some((item) => item.entity_id === selectedEntity)) return;
    setSteps((current) => [...current, { entity_id: selectedEntity, action: selectedAction }]);
    setSelectedEntity("");
    invalidate();
  }

  async function requestPreview() {
    if (!canOperate || busy || !validSceneDraft(steps, options)) return;
    setBusy(true);
    setError("");
    invalidate();
    try {
      const result = await previewHomeAssistantScene(steps);
      setPreview({ result, snapshot: JSON.stringify(steps),
        expiresAt: Date.now() + result.expires_in_seconds * 1000 });
    } catch {
      setError("Scene preview rejected. Refresh Home Assistant, review the safe-control allowlist and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function executeOnce() {
    if (!canOperate || busy || !preview || !previewMatches
      || confirmation !== preview.result.confirmation_phrase) return;
    setBusy(true);
    setError("");
    // Destroy the local ticket first. One click cannot re-submit while awaiting the server.
    invalidate();
    try {
      const result = await executeHomeAssistantScene(preview.result, steps, confirmation);
      setExecution(result);
    } catch {
      setError("Scene was rejected or its outcome is unverified. No success is assumed. Refresh and preview again before any retry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel ha-scene-workbench" aria-label="Home Assistant scene draft workbench">
      <h2>Build 144 — Scene &amp; Safe Action Drafts</h2>
      <p>Prepare up to four owner-reviewed low-risk lights and switches. Each step uses the existing Home Assistant allowlist. No native scene with hidden targets, machinery, security, heat, or alarm action is eligible.</p>
      <details className="camera-acceptance-help">
        <summary><span aria-hidden="true">ⓘ</span> Scene planning and execution help</summary>
        <ol>
          <li>Add safe actions only from observed, allowlisted devices, grouped by their current Home Assistant room.</li>
          <li>Preview obtains live source states and a one-use confirmation valid for two minutes. Preview sends no device command.</li>
          <li>Read every exact target and effect, then type the displayed confirmation phrase to execute sequentially once.</li>
          <li>A denied, changed, missing or unverified action stops the remaining steps. Receipts distinguish executed, rejected, unverified and skipped outcomes; physical operation is never certified.</li>
        </ol>
      </details>
      {!canOperate ? <p>Only Owner/Administrator can preview or execute a multi-action scene. This account may use its separately authorized single-entity controls.</p> : <>
        <p>{options.length} eligible current entities; {steps.length}/4 draft steps.</p>
        <label>Eligible room and entity
          <select aria-label="Scene target entity" value={selectedEntity}
            onChange={(event) => setSelectedEntity(event.target.value)}>
            <option value="">Choose an approved entity</option>
            {available.map((item) => <option value={item.entity_id} key={item.entity_id}>
              {item.area} · {item.label} ({item.entity_id})
            </option>)}
          </select>
        </label>
        <label>Requested effect
          <select aria-label="Scene target action" value={selectedAction}
            onChange={(event) => setSelectedAction(event.target.value as "on" | "off")}>
            <option value="on">Turn on</option><option value="off">Turn off</option>
          </select>
        </label>
        <button type="button" disabled={busy || !selectedEntity || steps.length >= 4}
          onClick={addStep}>Add draft step</button>
        {steps.length === 0 ? <p>No actions drafted. Choose a current approved entity to begin.</p> :
          <ol className="ha-scene-draft-steps">
            {steps.map((step, i) => <li key={step.entity_id}>
              <strong>{targets.get(step.entity_id)?.label || step.entity_id}</strong>
              {" · "}{targets.get(step.entity_id)?.area || "Unknown room"}
              {" · "}{step.action === "on" ? "Turn on" : "Turn off"}
              <button type="button" disabled={busy} aria-label={`Remove scene step ${i + 1}`}
                onClick={() => { setSteps((current) => current.filter((_, idx) => idx !== i)); invalidate(); }}>
                Remove
              </button>
            </li>)}
          </ol>}
        <button type="button" disabled={busy || !validSceneDraft(steps, options)}
          onClick={() => void requestPreview()}>Preview scene — no action</button>
        {preview && <section className="connection-guidance" aria-label="Scene confirmation preview">
          <h3>Exact scene preview</h3>
          <p>Expires in {preview.result.expires_in_seconds} seconds after issue. Any change to the draft or source state invalidates execution.</p>
          <ol>{preview.result.actions.map((item) => <li key={item.entity_id}>
            <code>{item.entity_id}</code> · {item.friendly_name || "Unnamed"} ·
            observed <strong>{item.current_state}</strong> → requested <strong>{item.expected_effect}</strong>
          </li>)}</ol>
          <p>{preview.result.warning}</p>
          <label>Type <code>{preview.result.confirmation_phrase}</code> to authorize exactly one attempt
            <input aria-label="Confirm scene phrase" value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)} />
          </label>
          <button type="button" disabled={busy || !previewMatches || confirmation !== preview.result.confirmation_phrase}
            onClick={() => void executeOnce()}>Confirm and execute once</button>
        </section>}
        {execution && <section className="connection-guidance" aria-label="Scene execution receipts">
          <h3>Observed result: {execution.outcome}</h3>
          <p>{execution.warning}</p>
          <ol>{execution.receipts.map((item) => <li key={item.entity_id}>
            <code>{item.entity_id}</code> · {item.action} · <strong>{item.outcome}</strong>
            {item.observed_state ? ` · observed ${item.observed_state}` : ""} · {item.detail}
          </li>)}</ol>
          <p>Refresh Home Assistant to inspect current states before creating another draft.</p>
        </section>}
        {error && <p role="alert">{error}</p>}
      </>}
      <small>Source tests do not execute our household devices. This panel never creates an autonomous scheduler, AI tool, or background multi-control rule.</small>
    </section>
  );
}
