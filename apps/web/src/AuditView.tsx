import { useEffect, useState } from "react";

import {
  getAuditEvents,
  getAuditSummary,
  type AuditEvent,
  type AuditSummary,
} from "./api";

const PAGE_SIZE = 25;

function formatTimestamp(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "—";
}

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function AuditView() {
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [toolInput, setToolInput] = useState("");
  const [outcomeInput, setOutcomeInput] = useState("");
  const [eventTypeInput, setEventTypeInput] = useState("");
  const [actorInput, setActorInput] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    toolKey: "",
    resultStatus: "",
    eventType: "",
    actorUserId: undefined as number | undefined,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    getAuditSummary(controller.signal)
      .then(setSummary)
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(caught instanceof Error ? caught.message : "Unable to load audit summary.");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    getAuditEvents(
      {
        search: filters.search || undefined,
        toolKey: filters.toolKey || undefined,
        resultStatus: filters.resultStatus || undefined,
        eventType: filters.eventType || undefined,
        actorUserId: filters.actorUserId,
        limit: PAGE_SIZE,
        offset,
      },
      controller.signal,
    )
      .then((response) => {
        setEvents(response.events);
        setTotal(response.total);
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(caught instanceof Error ? caught.message : "Unable to load audit events.");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [filters, offset]);

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const actor = actorInput.trim();
    setOffset(0);
    setFilters({
      search: searchInput.trim(),
      toolKey: toolInput.trim(),
      resultStatus: outcomeInput,
      eventType: eventTypeInput.trim(),
      actorUserId: actor ? Number(actor) : undefined,
    });
  }

  function clearFilters() {
    setSearchInput("");
    setToolInput("");
    setOutcomeInput("");
    setEventTypeInput("");
    setActorInput("");
    setOffset(0);
    setFilters({
      search: "",
      toolKey: "",
      resultStatus: "",
      eventType: "",
      actorUserId: undefined,
    });
  }

  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + PAGE_SIZE, total);

  return (
    <section className="audit-view">
      <header className="page-header">
        <div>
          <p className="eyebrow">Build 019</p>
          <h1>Audit log</h1>
          <p className="lede">
            Review who performed an action, which tool was involved, the sanitized inputs,
            outcome, confirmation evidence, and timestamp.
          </p>
        </div>
      </header>

      {summary ? (
        <section className="audit-summary" aria-label="Audit summary">
          <div><span>Events</span><strong>{summary.total_events}</strong></div>
          <div><span>Success</span><strong>{summary.success_count}</strong></div>
          <div><span>Failures</span><strong>{summary.failure_count}</strong></div>
          <div><span>Tool events</span><strong>{summary.tool_event_count}</strong></div>
        </section>
      ) : null}

      <form className="audit-filters" onSubmit={applyFilters}>
        <label>
          <span>Search</span>
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Event, action, object, tool…"
          />
        </label>
        <label>
          <span>Tool key</span>
          <input
            value={toolInput}
            onChange={(event) => setToolInput(event.target.value)}
            placeholder="knowledge.document.delete"
          />
        </label>
        <label>
          <span>Event type</span>
          <input
            value={eventTypeInput}
            onChange={(event) => setEventTypeInput(event.target.value)}
            placeholder="confirmation.approved"
          />
        </label>
        <label>
          <span>Outcome</span>
          <select
            value={outcomeInput}
            onChange={(event) => setOutcomeInput(event.target.value)}
          >
            <option value="">All</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>
        <label>
          <span>Actor user ID</span>
          <input
            type="number"
            min="1"
            value={actorInput}
            onChange={(event) => setActorInput(event.target.value)}
            placeholder="1"
          />
        </label>
        <div className="audit-filter-actions">
          <button className="primary-button" type="submit">Apply filters</button>
          <button type="button" onClick={clearFilters}>Clear</button>
        </div>
      </form>

      {error ? <p className="auth-error" role="alert">{error}</p> : null}

      <div className="audit-list">
        {loading ? (
          <section className="panel" role="status">Loading audit events…</section>
        ) : events.length === 0 ? (
          <section className="panel">
            <h2>No matching audit events</h2>
            <p>Adjust the filters to inspect a different portion of the local audit trail.</p>
          </section>
        ) : (
          events.map((item) => (
            <article className="audit-card" key={item.id}>
              <div className="audit-card-header">
                <div>
                  <span className={"audit-outcome " + item.result_status}>
                    {item.result_status}
                  </span>
                  <h2>{item.event_type}</h2>
                  <code>#{item.id}</code>
                </div>
                <time dateTime={item.created_at}>{formatTimestamp(item.created_at)}</time>
              </div>

              <dl className="audit-meta">
                <div>
                  <dt>Actor</dt>
                  <dd>{item.actor ? item.actor.username + " (#" + item.actor.id + ")" : "System"}</dd>
                </div>
                <div>
                  <dt>Action</dt>
                  <dd>{item.action}</dd>
                </div>
                <div>
                  <dt>Object</dt>
                  <dd>{item.object_type}{item.object_id ? " · " + item.object_id : ""}</dd>
                </div>
                <div>
                  <dt>Tool</dt>
                  <dd>{item.tool_key ?? "—"}</dd>
                </div>
                <div>
                  <dt>Risk</dt>
                  <dd>{item.risk_level === null ? "—" : "Level " + item.risk_level}</dd>
                </div>
                <div>
                  <dt>Confirmation</dt>
                  <dd>{item.confirmation_id ?? "—"}</dd>
                </div>
              </dl>

              <div className="audit-details-grid">
                <details>
                  <summary>Sanitized arguments</summary>
                  <pre>{pretty(item.sanitized_arguments)}</pre>
                </details>
                <details>
                  <summary>Result</summary>
                  <pre>{pretty(item.result)}</pre>
                </details>
              </div>
            </article>
          ))
        )}
      </div>

      <footer className="audit-pagination">
        <span>
          Showing {pageStart}–{pageEnd} of {total}
        </span>
        <div>
          <button
            type="button"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            Previous
          </button>
          <button
            type="button"
            disabled={offset + PAGE_SIZE >= total}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            Next
          </button>
        </div>
      </footer>
    </section>
  );
}
