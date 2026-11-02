import { useEffect, useRef, useState } from "react";

import { getLocalModelHealthBudget, type LocalModelHealthBudget } from "./api";
import { gibibytes } from "./ResourceBudgetPanel";

function bytesOrUnknown(value: number | null): string {
  return value === null ? "Not reported" : gibibytes(value);
}

export function LocalModelHealthPanel() {
  const [sample, setSample] = useState<LocalModelHealthBudget | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => request.current?.abort(), []);

  async function check() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    try {
      const response = await getLocalModelHealthBudget(controller.signal);
      if (request.current === controller) setSample(response);
    } catch (reason) {
      if (controller.signal.aborted) return;
      setSample(null);
      setError(reason instanceof Error ? reason.message : "The local model check could not complete.");
    } finally {
      if (request.current === controller) setLoading(false);
    }
  }

  return (
    <section className="panel" aria-label="Local AI model health and resource budget">
      <h2>Local AI model health &amp; resource budget</h2>
      <p>
        Inspect local Ollama installation, loaded models and shared host resources. ⓘ This
        checks version, installed models and resident models only; it does not send a prompt,
        download a model, change settings or collect remote telemetry. No background polling.
      </p>
      <button type="button" disabled={loading} onClick={() => void check()}>
        {loading ? "Checking local models…" : "Check local AI models & resources"}
      </button>
      {error && <p role="alert">Check unavailable: {error}. Confirm Ollama is running, then retry manually.</p>}
      {!sample && !loading && !error && <p>No local model measurement requested yet.</p>}
      {sample && (
        <div role="status" aria-live="polite">
          <p>
            Sampled {new Date(sample.sampled_at_utc).toLocaleString()} · request took {sample.probe_duration_ms.toFixed(0)} ms.
            Results are a point-in-time observation, not a continuous usage record.
          </p>
          {sample.inventory_state === "unavailable" ? (
            <p>Ollama inventory unavailable or timed out. Installed model count and sizes are unknown, not zero. Check the local Ollama service and retry.</p>
          ) : (
            <>
              <p>Ollama version: {sample.ollama_version ?? "Not reported"} · {sample.models.length} installed model(s) returned.</p>
              {sample.models.length === 0 ? <p>No installed models reported by Ollama.</p> : (
                <ul>
                  {sample.models.map((model, index) => (
                    <li key={`${model.name}-${index}`}>
                      <strong>{model.name}</strong> · reported artifact size {bytesOrUnknown(model.size_bytes)}
                      {model.parameter_size ? ` · ${model.parameter_size} parameters` : ""}
                      {model.quantization ? ` · ${model.quantization}` : ""}
                    </li>
                  ))}
                </ul>
              )}
              <p>Sum of reported installed sizes: {bytesOrUnknown(sample.installed_disk_size_sum_bytes)}. {sample.installed_disk_size_note}</p>
            </>
          )}
          {sample.resident_state === "unknown" ? (
            <p>Loaded-model RAM/VRAM measurements were not available. This does not prove no model is running.</p>
          ) : sample.resident_models.length === 0 ? (
            <p>Ollama reported no models resident at the time of this sample.</p>
          ) : (
            <>
              <h3>Models loaded in Ollama at sample time</h3>
              <ul>{sample.resident_models.map((model, index) => (
                <li key={`${model.name}-${index}`}>{model.name}: resident size {bytesOrUnknown(model.resident_size_bytes)}, VRAM {bytesOrUnknown(model.vram_bytes)}</li>
              ))}</ul>
            </>
          )}
          {sample.host_budget ? (
            <p>
              Host RAM available {gibibytes(sample.host_budget.host_memory.available_bytes)} of {gibibytes(sample.host_budget.host_memory.total_bytes)};
              Hub workspace free {gibibytes(sample.host_budget.workspace_volume.free_bytes)}.
              {sample.host_budget.status === "attention" ? " Resource guidelines need review." : " Hub resource guidelines are within limits."}
            </p>
          ) : <p>Host RAM and workspace budget could not be sampled; capacity is unknown.</p>}
          <p>
            ⓘ On a shared Windows host, reserve RAM, storage and GPU headroom for Home Assistant, cameras and the Hub.
            Choose a smaller quantized model if resources are tight. Ollama artifact sizes do not predict peak working
            memory or prove responsiveness; this check deliberately does not generate text or run a benchmark.
          </p>
        </div>
      )}
    </section>
  );
}
