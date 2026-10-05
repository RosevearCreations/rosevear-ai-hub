import { useEffect, useState } from "react";

import {
  getToolRegistrySummary,
  getTools,
  updateTool,
  type ToolDescriptor,
  type ToolRegistrySummary,
} from "./api";

function riskCopy(tool: ToolDescriptor): string {
  if (tool.risk_level === 0) return "Level 0 — Read";
  if (tool.risk_level === 1) return "Level 1 — Low-risk action";
  if (tool.risk_level === 2) return "Level 2 — Confirmation required";
  return "Level 3 — Prohibited autonomous action";
}

export function ToolsView() {
  const [tools, setTools] = useState<ToolDescriptor[]>([]);
  const [summary, setSummary] = useState<ToolRegistrySummary | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function refresh() {
    const [nextTools, nextSummary] = await Promise.all([
      getTools(),
      getToolRegistrySummary(),
    ]);
    setTools(nextTools);
    setSummary(nextSummary);
  }

  useEffect(() => {
    refresh().catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : "Unable to load the tool registry.");
    });
  }, []);

  async function setEnabled(tool: ToolDescriptor, enabled: boolean) {
    setBusyKey(tool.tool_key);
    setError("");
    setNotice("");
    try {
      const updated = await updateTool(tool.tool_key, enabled);
      setTools((current) =>
        current.map((item) => (item.tool_key === updated.tool_key ? updated : item)),
      );
      const nextSummary = await getToolRegistrySummary();
      setSummary(nextSummary);
      setNotice(updated.display_name + (updated.enabled ? " enabled." : " disabled."));
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Unable to update the tool.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <section className="tools-view">
      <header className="page-header">
        <div>
          <p className="eyebrow">Build 017</p>
          <h1>Tool registry</h1>
          <p className="lede">
            Review normalized tool contracts, capabilities, risk levels, and operator enable state.
            Tool execution is not introduced until the confirmation workflow is ready.
          </p>
        </div>
      </header>

      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      {notice ? <p className="knowledge-notice" role="status">{notice}</p> : null}

      {summary ? (
        <section className="tool-summary" aria-label="Tool registry summary">
          <div><span>Tools</span><strong>{summary.tool_count}</strong></div>
          <div><span>Enabled</span><strong>{summary.enabled_count}</strong></div>
          <div><span>Disabled</span><strong>{summary.disabled_count}</strong></div>
          <div><span>Capabilities</span><strong>{summary.capabilities.length}</strong></div>
        </section>
      ) : null}

      <div className="tool-list">
        {tools.map((tool) => (
          <article className="tool-card" key={tool.tool_key}>
            <div className="tool-card-header">
              <div>
                <strong>{tool.display_name}</strong>
                <code>{tool.tool_key}</code>
              </div>
              <label className="knowledge-checkbox">
                <input
                  type="checkbox"
                  checked={tool.enabled}
                  disabled={busyKey !== null || tool.risk_level === 3}
                  onChange={(event) => void setEnabled(tool, event.target.checked)}
                />
                <span>{tool.enabled ? "Enabled" : "Disabled"}</span>
              </label>
            </div>

            <p>{tool.description}</p>

            <dl className="tool-meta">
              <div>
                <dt>Risk</dt>
                <dd>{riskCopy(tool)}</dd>
              </div>
              <div>
                <dt>Confirmation policy</dt>
                <dd>{tool.confirmation_policy.replaceAll("_", " ")}</dd>
              </div>
              <div>
                <dt>Integration</dt>
                <dd>{tool.integration_name ?? "Unassigned"}</dd>
              </div>
            </dl>

            <div className="tool-capabilities" aria-label={tool.display_name + " capabilities"}>
              {tool.capabilities.map((capability) => (
                <span key={capability}>{capability}</span>
              ))}
            </div>

            <details>
              <summary>Normalized schemas</summary>
              <div className="tool-schema-grid">
                <div>
                  <strong>Input</strong>
                  <pre>{JSON.stringify(tool.input_schema, null, 2)}</pre>
                </div>
                <div>
                  <strong>Output</strong>
                  <pre>{JSON.stringify(tool.output_schema, null, 2)}</pre>
                </div>
              </div>
            </details>
          </article>
        ))}
      </div>
    </section>
  );
}
