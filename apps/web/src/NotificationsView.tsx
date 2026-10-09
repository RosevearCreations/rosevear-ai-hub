import { useEffect, useState } from "react";

import {
  createTestNotification,
  dismissNotification,
  getNotifications,
  getNotificationSummary,
  markAllNotificationsRead,
  markNotificationRead,
  type AuthUser,
  type HubNotification,
  type NotificationSeverity,
  type NotificationStatus,
  type NotificationSummary,
} from "./api";

export function NotificationsView({ currentUser }: { currentUser: AuthUser }) {
  const [notifications, setNotifications] = useState<HubNotification[]>([]);
  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState<NotificationStatus>("all");
  const [severityFilter, setSeverityFilter] = useState<NotificationSeverity | "all">("all");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const canTest =
    currentUser.role === "owner" || currentUser.role === "administrator";

  async function refresh(
    statusValue = statusFilter,
    severityValue = severityFilter,
  ) {
    setLoading(true);
    setError("");
    try {
      const [list, totals] = await Promise.all([
        getNotifications({
          status: statusValue,
          severity: severityValue === "all" ? undefined : severityValue,
          limit: 50,
        }),
        getNotificationSummary(),
      ]);
      setNotifications(list.notifications);
      setSummary(totals);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh("all", "all");
  }, []);

  async function changeStatus(value: NotificationStatus) {
    setStatusFilter(value);
    await refresh(value, severityFilter);
  }

  async function changeSeverity(value: NotificationSeverity | "all") {
    setSeverityFilter(value);
    await refresh(statusFilter, value);
  }

  async function markRead(notification: HubNotification) {
    if (!notification.unread || busy) return;
    setBusy(true);
    setError("");
    try {
      await markNotificationRead(notification.id);
      setNotice("Notification marked read.");
      await refresh();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to mark notification read.");
    } finally {
      setBusy(false);
    }
  }

  async function markAllRead() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await markAllNotificationsRead();
      setNotice(
        result.updated === 1
          ? "1 notification marked read."
          : result.updated + " notifications marked read.",
      );
      await refresh();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to mark notifications read.");
    } finally {
      setBusy(false);
    }
  }

  async function dismiss(notification: HubNotification) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await dismissNotification(notification.id);
      setNotice("Notification dismissed from your inbox.");
      await refresh();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to dismiss notification.");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    if (!canTest || busy) return;
    setBusy(true);
    setError("");
    try {
      await createTestNotification("info");
      setNotice("Local test notification created.");
      await refresh();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to create test notification.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Build 030</p>
          <h1>Notifications</h1>
          <p className="lede">
            Persistent local household alerts from deterministic automations and Hub operations.
            No email, SMS, push provider, or cloud account is required.
          </p>
        </div>
        <div className="health-card" role="status">
          <span
            className={(summary?.urgent ?? 0) > 0 ? "status-dot offline" : "status-dot online"}
            aria-hidden="true"
          />
          <span>
            {summary?.unread ?? 0} unread
            <small>{summary?.total ?? 0} visible notifications</small>
          </span>
        </div>
      </header>

      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      {notice ? <p className="automation-notice" role="status">{notice}</p> : null}

      <section className="notification-summary" aria-label="Notification summary">
        <div><span>Unread</span><strong>{summary?.unread ?? 0}</strong></div>
        <div><span>Info</span><strong>{summary?.info ?? 0}</strong></div>
        <div><span>Warning</span><strong>{summary?.warning ?? 0}</strong></div>
        <div><span>Urgent</span><strong>{summary?.urgent ?? 0}</strong></div>
      </section>

      <section className="panel notification-controls" aria-label="Notification controls">
        <label>
          Read status
          <select
            value={statusFilter}
            disabled={busy}
            onChange={(event) => void changeStatus(event.target.value as NotificationStatus)}
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </label>
        <label>
          Severity
          <select
            value={severityFilter}
            disabled={busy}
            onChange={(event) =>
              void changeSeverity(event.target.value as NotificationSeverity | "all")
            }
          >
            <option value="all">All severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="urgent">Urgent</option>
          </select>
        </label>
        <div className="notification-control-actions">
          <button type="button" disabled={busy} onClick={() => void markAllRead()}>
            Mark all read
          </button>
          {canTest ? (
            <button type="button" disabled={busy} onClick={() => void sendTest()}>
              Send local test
            </button>
          ) : null}
        </div>
      </section>

      <section className="notification-list" aria-label="Notification inbox">
        {loading ? <p>Loading notifications…</p> : null}
        {!loading && notifications.length === 0 ? (
          <p className="panel">No notifications match the current filters.</p>
        ) : null}

        {notifications.map((notification) => (
          <article
            className={
              "notification-card " +
              notification.severity +
              (notification.unread ? " unread" : "")
            }
            key={notification.id}
          >
            <div className="notification-card-header">
              <div>
                <div className="notification-title-row">
                  <span className={"notification-severity " + notification.severity}>
                    {notification.severity}
                  </span>
                  {notification.unread ? <span className="notification-unread">Unread</span> : null}
                </div>
                <h2>{notification.title}</h2>
                <small>
                  {new Date(notification.created_at).toLocaleString()} · {notification.source_type}
                </small>
              </div>
            </div>
            <p>{notification.message}</p>
            <div className="notification-actions">
              {notification.unread ? (
                <button type="button" disabled={busy} onClick={() => void markRead(notification)}>
                  Mark read
                </button>
              ) : null}
              <button type="button" disabled={busy} onClick={() => void dismiss(notification)}>
                Dismiss
              </button>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
