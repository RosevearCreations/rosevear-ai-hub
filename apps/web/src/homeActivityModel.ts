import type { AuthRole, HubNotification, NotificationListResponse, NotificationSummary } from "./api";

export type ActivityHealth = {
  backend: "loading" | "online" | "offline";
  localAi: "loading" | "online" | "offline";
  modelCount: number | null;
};

export type ActivityHistory =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; notifications: HubNotification[]; summary: NotificationSummary; checkedAt: Date;
      page?: { total: number; limit: number; offset: number } };

export type ActivityAlert = {
  key: string;
  title: string;
  detail: string;
  priority: "urgent" | "warning" | "verify" | "setup";
  source: "notification" | "observation";
  unread: boolean | null;
  record: {
    notificationId: number;
    createdAt: string;
    reportedSourceType: string | null;
    message: string | null;
  } | null;
  destination: string | null;
  actionLabel: string | null;
};

export type HomeAlertSourceContext = {
  label: string;
  reference: string | null;
  recordedAt: string | null;
  reportedSourceType: string | null;
  explanation: string;
};

/** Provenance is deliberately descriptive: neither an inbox row nor a health probe certifies a device event. */
export function homeAlertSourceContext(item: ActivityAlert): HomeAlertSourceContext {
  if (item.source === "notification" && item.record) return {
    label: "Local notification inbox",
    reference: `Notification #${item.record.notificationId}`,
    recordedAt: Number.isFinite(Date.parse(item.record.createdAt)) ? item.record.createdAt : null,
    reportedSourceType: item.record.reportedSourceType,
    explanation: "This is an inbox record from the most recent local sample, not independently verified device activity.",
  };
  const label = item.key === "backend" ? "Current Hub backend health request"
    : item.key === "ai" ? "Current local AI health request" : "Local notification history request";
  return {
    label, reference: null, recordedAt: null, reportedSourceType: null,
    explanation: "This is a current availability observation, not a recorded event or proof of overall system health.",
  };
}

/** Only bounded, printable metadata from an already validated inbox row may enter the preview. */
function boundedNotificationText(value: unknown, limit: number): string | null {
  return typeof value === "string" && value.trim().length > 0 && value.length <= limit &&
    !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value) ? value.trim() : null;
}

export type HomeAlertFilter = "all" | "urgent" | "warning" | "unread" | "verify" | "setup";
export type HomeAlertSourceFilter = "all" | "notification" | "backend" | "ai" | "history";

/** Search and source filters are intentionally limited to the fetched page and current health observations. */
export function searchHomeActivityAlerts(alerts: readonly ActivityAlert[], query: string,
  sourceFilter: HomeAlertSourceFilter): ActivityAlert[] {
  const term = query.trim().toLocaleLowerCase();
  return alerts.filter(item => {
    if (sourceFilter === "notification" && item.source !== "notification") return false;
    if (sourceFilter !== "all" && sourceFilter !== "notification" && item.key !== sourceFilter) return false;
    return !term || item.title.toLocaleLowerCase().includes(term) || item.detail.toLocaleLowerCase().includes(term);
  });
}

/** Verify the server's paging contract before displaying pages or trusting next/previous controls. */
export function validHomeNotificationPage(list: NotificationListResponse, limit: number, offset: number): boolean {
  return Number.isSafeInteger(list.total) && list.total >= 0 && list.limit === limit && list.offset === offset &&
    Number.isSafeInteger(list.offset) && list.offset >= 0 &&
    Array.isArray(list.notifications) && list.notifications.length <= limit &&
    (offset >= list.total || list.notifications.length > 0) &&
    list.notifications.length <= Math.max(0, list.total - offset);
}

/** Filtering only affects this on-screen preview; no read/ack state is stored. */
export function filterHomeActivityAlerts(alerts: readonly ActivityAlert[], filter: HomeAlertFilter): ActivityAlert[] {
  if (filter === "all") return [...alerts];
  if (filter === "unread") return alerts.filter(item => item.source === "notification" && item.unread === true);
  return alerts.filter(item => item.priority === filter);
}

const severityRank = { urgent: 0, warning: 1, info: 2 } as const;

/** Only validated local inbox payloads may be presented as historical activity. */
export function validHomeActivityResponse(list: unknown, summary: unknown):
  list is NotificationListResponse {
  if (!list || typeof list !== "object" || !summary || typeof summary !== "object") return false;
  const entries = list as Record<string, unknown>;
  const totals = summary as Record<string, unknown>;
  if (!Array.isArray(entries.notifications) || entries.notifications.length > 20) return false;
  if (!["total", "unread", "info", "warning", "urgent"].every(key =>
    typeof totals[key] === "number" && Number.isSafeInteger(totals[key]) && (totals[key] as number) >= 0)) return false;
  return entries.notifications.every((value: unknown) => {
    if (!value || typeof value !== "object") return false;
    const item = value as Record<string, unknown>;
    return Number.isSafeInteger(item.id) && (item.id as number) > 0 &&
      typeof item.title === "string" && item.title.length > 0 && item.title.length <= 300 &&
      (item.severity === "info" || item.severity === "warning" || item.severity === "urgent") &&
      typeof item.unread === "boolean" && typeof item.created_at === "string";
  });
}

export function recentHomeNotifications(notifications: readonly HubNotification[]): HubNotification[] {
  return [...notifications].sort((a, b) => {
    const aTime = Date.parse(a.created_at);
    const bTime = Date.parse(b.created_at);
    return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0) || b.id - a.id;
  }).slice(0, 3);
}

/** Priorities are advisory; these actions navigate to existing screens only. */
export function buildHomeActivityAlerts(input: {
  health: ActivityHealth;
  history: ActivityHistory;
  role: AuthRole;
  allowed: readonly string[];
}): ActivityAlert[] {
  const { health, history, allowed, role } = input;
  const canUse = (route: string): string | null => allowed.includes(route) ? route : null;
  const admin = role === "owner" || role === "administrator";
  const reviewRoute = canUse(admin ? "System" : "Search & Help");
  const reviewLabel = admin ? "Open System" : "Open Search & Help";
  const alert = (key: string, title: string, detail: string, priority: ActivityAlert["priority"],
    destination: string | null, actionLabel: string,
    source: ActivityAlert["source"] = "observation", unread: boolean | null = null,
    record: ActivityAlert["record"] = null): ActivityAlert => ({
    key, title, detail, priority, source, unread, record, destination, actionLabel: destination ? actionLabel : null,
  });

  const alerts: ActivityAlert[] = [];
  if (health.backend === "offline") alerts.push(alert("backend", "Local Hub needs review",
    "The latest backend health request failed. This is a current observation, not a historical event.",
    "warning", reviewRoute, reviewLabel));
  else if (health.backend === "loading") alerts.push(alert("backend", "Hub health is not yet verified",
    "Waiting for the current health request; no backend availability is assumed.",
    "verify", null, reviewLabel));

  if (health.localAi === "offline") alerts.push(alert("ai", "Local AI not detected",
    "Ollama did not respond. No model or inference availability is assumed.",
    "warning", reviewRoute, reviewLabel));
  else if (health.localAi === "loading") alerts.push(alert("ai", "Checking local AI",
    "The local model service has not been verified yet.", "verify", null, reviewLabel));
  else if (health.modelCount === 0) alerts.push(alert("ai", "No local AI model installed",
    "Ollama responded but reports zero models; this is setup guidance, not an outage.",
    "setup", reviewRoute, reviewLabel));
  else if (health.modelCount === null || !Number.isSafeInteger(health.modelCount) || health.modelCount < 0)
    alerts.push(alert("ai", "AI model count unverified",
      "The model count was not usable, so local chat readiness is not confirmed.",
      "verify", reviewRoute, reviewLabel));

  if (history.kind === "error") alerts.push(alert("history", "Activity history could not be verified",
    "The local notification request failed or returned unusable data. Do not assume there are no alerts.",
    "verify", canUse("Notifications"), "Open Notifications"));
  if (history.kind === "loading") alerts.push(alert("history", "Checking recent notifications",
    "Waiting for the local inbox; priority counts are not yet available.",
    "verify", null, "Open Notifications"));
  if (history.kind === "ready") {
    const priorityNotifications = history.notifications.filter(item => item.severity !== "info")
      .sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || Number(b.unread) - Number(a.unread)
        || Date.parse(b.created_at) - Date.parse(a.created_at));
    for (const item of priorityNotifications) alerts.push(alert(`notification-${item.id}`,
      item.title, `${item.severity === "urgent" ? "Urgent" : "Warning"} local notification · ${item.unread ? "unread" : "read"}.`,
      item.severity === "urgent" ? "urgent" : "warning", canUse("Notifications"), "Open Notifications",
      "notification", item.unread, {
        notificationId: item.id, createdAt: item.created_at,
        reportedSourceType: typeof item.source_type === "string" && /^[a-zA-Z][a-zA-Z0-9_-]{0,47}$/.test(item.source_type)
          ? item.source_type : null,
        message: boundedNotificationText(item.message, 1200),
      }));
  }
  const priority = { urgent: 0, warning: 1, verify: 2, setup: 3 } as const;
  return alerts.sort((a, b) => priority[a.priority] - priority[b.priority]);
}
