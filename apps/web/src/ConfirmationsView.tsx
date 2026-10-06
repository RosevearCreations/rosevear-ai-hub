import { useEffect, useState } from "react";

import {
  approveConfirmation,
  getConfirmations,
  rejectConfirmation,
  type ConfirmationRequest,
} from "./api";

type Filter = ConfirmationRequest["status"] | "all";

function statusLabel(value: ConfirmationRequest["status"]): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function ConfirmationsView() {
  const [items, setItems] = useState<ConfirmationRequest[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function refresh(nextFilter: Filter = filter) {
    setItems(await getConfirmations(nextFilter));
  }

  useEffect(() => {
    refresh(filter).catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : "Unable to load confirmations.");
    });
  }, [filter]);

  async function decide(item: ConfirmationRequest, decision: "approve" | "reject") {
    if (busyId !== null) return;

    setBusyId(item.id);
    setError("");
    setNotice("");
    try {
      const updated =
        decision === "approve"
          ? await approveConfirmation(item.id)
          : await rejectConfirmation(item.id);
      setNotice(
        updated.preview.tool_name +
          (decision === "approve" ? " approved." : " rejected."),
      );
      await refresh();
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Unable to record decision.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="confirmations-view">
      <header className="page-header">
        <div>
          <p className="eyebrow">Build 018</p>
          <h1>Confirmations</h1>
          <p className="lede">
            Review the exact intended action before any Level 2 tool can change Hub state.
            Approvals expire and can be consumed only once.
          </p>
        </div>
      </header>

      <div className="confirmation-toolbar">
        <label>
          <span>Show</span>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as Filter)}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
            <option value="consumed">Consumed</option>
            <option value="all">All</option>
          </select>
        </label>
      </div>

      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      {notice ? <p className="knowledge-notice" role="status">{notice}</p> : null}

      {items.length === 0 ? (
        <section className="panel">
          <h2>No {filter === "all" ? "" : filter + " "}confirmations</h2>
          <p>There are no confirmation requests matching this view.</p>
        </section>
      ) : (
        <div className="confirmation-list">
          {items.map((item) => (
            <article className="confirmation-card" key={item.id}>
              <div className="confirmation-card-header">
                <div>
                  <span className={"confirmation-status " + item.status}>
                    {statusLabel(item.status)}
                  </span>
                  <h2>{item.preview.tool_name}</h2>
                  <code>{item.tool_key}</code>
                </div>
                <div className="confirmation-expiry">
                  <span>Expires</span>
                  <strong>{new Date(item.expires_at).toLocaleString()}</strong>
                </div>
              </div>

              <div className="confirmation-preview">
                <strong>Exact intended action</strong>
                <p>{item.preview.summary}</p>
              </div>

              <dl className="confirmation-meta">
                <div>
                  <dt>Risk</dt>
                  <dd>Level {item.risk_level} — {item.preview.risk_label.replaceAll("_", " ")}</dd>
                </div>
                <div>
                  <dt>Requested by user</dt>
                  <dd>#{item.requested_by_user_id}</dd>
                </div>
                <div>
                  <dt>Argument fingerprint</dt>
                  <dd><code>{item.arguments_hash.slice(0, 16)}…</code></dd>
                </div>
              </dl>

              <details>
                <summary>Exact arguments</summary>
                <pre>{JSON.stringify(item.arguments, null, 2)}</pre>
              </details>

              {item.status === "pending" ? (
                <div className="confirmation-actions">
                  <button
                    className="primary-button"
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => void decide(item, "approve")}
                  >
                    {busyId === item.id ? "Working…" : "Approve"}
                  </button>
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => void decide(item, "reject")}
                  >
                    Reject
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
