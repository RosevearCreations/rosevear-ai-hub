import { useEffect, useRef, useState } from "react";

import { getResourceBudget, type ResourceBudgetResponse } from "./api";

export function gibibytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "Unknown";
  return (bytes / (1024 ** 3)).toFixed(2) + " GiB";
}

const messages: Record<ResourceBudgetResponse["signals"][number], string> = {
  api_memory: "Hub API process memory has reached the review guideline.",
  host_memory: "Available system RAM is below the review guideline.",
  workspace_disk: "Free space on the Hub workspace volume is below the review guideline.",
};

export function ResourceBudgetPanel() {
  const [snapshot, setSnapshot] = useState<ResourceBudgetResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => request.current?.abort(), []);

  async function refresh() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    try {
      const data = await getResourceBudget(controller.signal);
      if (request.current === controller) setSnapshot(data);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Unable to read resource budget.");
      setSnapshot(null);
    } finally {
      if (request.current === controller) setLoading(false);
    }
  }

  return (
    <section className="panel" aria-label="Performance and resource budget">
      <h2>Performance and resource budget</h2>
      <p>
        A read-only snapshot for the administrator. Click Refresh to sample this
        server. Nothing is polled, tuned, deleted, or restarted automatically.
      </p>
      <button type="button" onClick={() => void refresh()} disabled={loading}>
        {loading ? "Checking…" : "Refresh resource snapshot"}
      </button>
      {error && <p role="alert">Metrics unavailable: {error}</p>}
      {!snapshot && !loading && !error && <p>No measurement taken yet.</p>}
      {snapshot && (
        <div role="status" aria-live="polite">
          <p>
            <strong>{snapshot.status === "attention" ? "Review recommended" : "Within guidelines"}</strong>
            {" · "}Sampled {new Date(snapshot.sampled_at_utc).toLocaleString()}
          </p>
          <dl>
            <dt>Hub API working memory</dt>
            <dd>{gibibytes(snapshot.api_process.rss_bytes)} (review at {gibibytes(snapshot.guidelines.api_rss_warning_bytes)})</dd>
            <dt>Host RAM available</dt>
            <dd>{gibibytes(snapshot.host_memory.available_bytes)} / {gibibytes(snapshot.host_memory.total_bytes)} total</dd>
            <dt>Hub workspace volume free</dt>
            <dd>{gibibytes(snapshot.workspace_volume.free_bytes)} / {gibibytes(snapshot.workspace_volume.total_bytes)} total</dd>
            <dt>Hub API CPU time since process start</dt>
            <dd>{snapshot.api_process.cpu_seconds_total.toFixed(2)} seconds</dd>
          </dl>
          {snapshot.signals.length > 0 && (
            <ul>
              {snapshot.signals.map((signal) => <li key={signal}>{messages[signal]}</li>)}
            </ul>
          )}
          <small>
            Guidelines: at least {gibibytes(snapshot.guidelines.min_host_available_bytes)}
            {" "}RAM available and {gibibytes(snapshot.guidelines.min_workspace_free_bytes)}
            {" "}free on the Hub workspace volume. This is not a benchmark for Ollama,
            the Home Assistant VM or other drives, and no automatic action is taken.
          </small>
        </div>
      )}
    </section>
  );
}
