import { useCallback, useEffect, useRef, useState } from "react";

import { getNotifications, getNotificationSummary, type AuthRole } from "./api";
import {
  buildHomeActivityAlerts, filterHomeActivityAlerts, recentHomeNotifications, validHomeActivityResponse,
  type ActivityHealth, type ActivityHistory, type HomeAlertFilter,
} from "./homeActivityModel";
import "./homeActivitySummary.css";

export function HomeActivitySummary({ health, role, allowed, onNavigate }: {
  health: ActivityHealth;
  role: AuthRole;
  allowed: readonly string[];
  onNavigate: (section: string) => void;
}) {
  const [history, setHistory] = useState<ActivityHistory>({ kind: "loading" });
  const [alertFilter, setAlertFilter] = useState<HomeAlertFilter>("all");
  const controllerRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setHistory({ kind: "loading" });
    try {
      const [list, summary] = await Promise.all([
        getNotifications({ status: "all", limit: 10, signal: controller.signal }),
        getNotificationSummary(controller.signal),
      ]);
      if (controller.signal.aborted) return;
      if (!validHomeActivityResponse(list, summary)) {
        setHistory({ kind: "error" });
        return;
      }
      setHistory({ kind: "ready", notifications: list.notifications, summary, checkedAt: new Date() });
    } catch {
      if (!controller.signal.aborted) setHistory({ kind: "error" });
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => controllerRef.current?.abort();
  }, [refresh]);

  const alerts = buildHomeActivityAlerts({ health, history, role, allowed });
  const filteredAlerts = filterHomeActivityAlerts(alerts, alertFilter);
  const previewAlerts = filteredAlerts.slice(0, 6);
  const recent = history.kind === "ready" ? recentHomeNotifications(history.notifications) : [];
  const canOpenNotifications = allowed.includes("Notifications");
  return <section className="home-activity-summary" aria-labelledby="home-activity-title">
    <header className="home-activity-heading">
      <div>
        <p className="eyebrow">Read-only Hub overview</p>
        <h2 id="home-activity-title">Activity and priority alerts</h2>
        <p>Actual local inbox entries and current service observations. No repairs, acknowledgements or messages are sent here.</p>
      </div>
      <button type="button" disabled={history.kind === "loading"} onClick={() => void refresh()}>
        {history.kind === "loading" ? "Checking activity…" : "Refresh activity"}
      </button>
    </header>
    <div className="home-activity-counts" aria-label="Local notification counts">
      <span>Unread <strong>{history.kind === "ready" ? history.summary.unread : "Not verified"}</strong></span>
      <span>Urgent <strong>{history.kind === "ready" ? history.summary.urgent : "Not verified"}</strong></span>
      <span>Warnings <strong>{history.kind === "ready" ? history.summary.warning : "Not verified"}</strong></span>
    </div>
    <div className="home-activity-columns">
      <section aria-label="Priority follow-ups">
        <h3>What needs attention?</h3>
        <div className="home-activity-triage" role="group" aria-label="Priority alert filters">
          <label htmlFor="home-alert-filter">Show follow-ups</label>
          <select id="home-alert-filter" value={alertFilter}
            onChange={event => setAlertFilter(event.target.value as HomeAlertFilter)}>
            <option value="all">All priorities</option>
            <option value="urgent">Urgent only</option>
            <option value="warning">Warnings only</option>
            <option value="unread">Unread notifications</option>
            <option value="verify">Needs verification</option>
            <option value="setup">Setup guidance</option>
          </select>
          <button type="button" disabled={alertFilter === "all"} onClick={() => setAlertFilter("all")}>Show all alerts</button>
        </div>
        <p className="home-activity-filter-count" role="status">
          Showing {previewAlerts.length} of {filteredAlerts.length} matching follow-ups; {alerts.length} total in this sampled view.
          Filters never mark anything reviewed or change the full notification counts.
        </p>
        {alerts.length === 0 && alertFilter === "all"
          ? <p className="home-activity-empty">No priority issues were identified from these limited readings. This does not certify device health or all activity.</p>
          : previewAlerts.length === 0
            ? <p className="home-activity-empty">No follow-ups match this filter. Other priorities may still need attention; choose Show all alerts to restore the full list.</p>
          : <ol className="home-activity-list">
            {previewAlerts.map(item => <li key={item.key} className={`home-activity-alert home-activity-${item.priority}`}>
              <span className="home-activity-priority">{item.priority}</span>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
              {item.destination && item.actionLabel
                ? <button type="button" onClick={() => onNavigate(item.destination!)}>{item.actionLabel}</button>
                : <small>No follow-up route is available to this account.</small>}
            </li>)}
          </ol>}
      </section>
      <section aria-label="Recent local notification activity">
        <h3>Recent local notifications</h3>
        {history.kind === "loading" ? <p>Checking the local notification inbox…</p>
          : history.kind === "error" ? <p role="status">History unavailable. No claim is made about the presence or absence of alerts.</p>
            : recent.length === 0 ? <p className="home-activity-empty">No notifications returned by the local inbox. Other Hub activity may exist.</p>
              : <ol className="home-activity-list">
                {recent.map(item => <li key={item.id}>
                  <span className="home-activity-priority">{item.severity}{item.unread ? " · unread" : ""}</span>
                  <strong>{item.title}</strong>
                  <small>{Number.isFinite(Date.parse(item.created_at)) ? new Date(item.created_at).toLocaleString() : "Time unavailable"}</small>
                </li>)}
              </ol>}
        {canOpenNotifications
          ? <button type="button" onClick={() => onNavigate("Notifications")}>Open notification inbox</button>
          : <small>Notification inbox is not available to this account.</small>}
      </section>
    </div>
    <p className="home-activity-caution">
      {history.kind === "ready" ? `Last inbox check: ${history.checkedAt.toLocaleString()}. ` : "Inbox status not verified. "}
      Comms attachment remains HOLD; this panel does not enable a connection. Manual refresh reads the inbox only.
    </p>
  </section>;
}
