import { describe, expect, test } from "vitest";

import type { HubNotification, NotificationSummary } from "./api";
import {
  buildHomeActivityAlerts, filterHomeActivityAlerts, homeAlertSourceContext,
  recentHomeNotifications, searchHomeActivityAlerts, validHomeActivityResponse, validHomeNotificationPage,
  type ActivityHistory,
} from "./homeActivityModel";

const summary: NotificationSummary = { total: 2, unread: 1, info: 0, warning: 1, urgent: 1, newest_at: "2026-11-08T12:00:00Z" };
function note(id: number, severity: HubNotification["severity"], unread = true): HubNotification {
  return { id, audience: "household", title: `Local notice ${id}`, message: "Local only", severity,
    source_type: "test", source_id: null, created_by_user_id: 1,
    created_at: `2026-11-08T1${id}:00:00Z`, read_at: null, dismissed_at: null, unread };
}
const history: ActivityHistory = { kind: "ready", notifications: [note(1, "warning"), note(2, "urgent", false)],
  summary, checkedAt: new Date("2026-11-08T12:00:00Z") };

describe("Build 274 Home activity model", () => {
  test("rejects malformed or untrusted notification history instead of fabricating zero alerts", () => {
    expect(validHomeActivityResponse({ notifications: [note(1, "warning")], total: 1 }, summary)).toBe(true);
    expect(validHomeActivityResponse({ notifications: [{ id: 1, title: "Spoof", severity: "critical", unread: true, created_at: "" }] }, summary)).toBe(false);
    expect(validHomeActivityResponse({ notifications: [note(1, "warning")] }, { ...summary, urgent: -1 })).toBe(false);
    expect(validHomeActivityResponse({ notifications: "not an array" }, summary)).toBe(false);
    expect(validHomeActivityResponse(null, summary)).toBe(false);
  });

  test("orders recent real notifications newest first without mutating the inbox", () => {
    const original = [note(1, "warning"), note(2, "urgent")];
    expect(recentHomeNotifications(original).map(item => item.id)).toEqual([2, 1]);
    expect(original.map(item => item.id)).toEqual([1, 2]);
  });

  test("puts urgent notices first, preserves unread context, and navigates only to allowed screens", () => {
    const alerts = buildHomeActivityAlerts({
      health: { backend: "online", localAi: "online", modelCount: 2 }, history,
      role: "owner", allowed: ["Home", "Notifications", "System"],
    });
    expect(alerts.map(item => item.priority)).toEqual(["urgent", "warning"]);
    expect(alerts[0]).toMatchObject({ title: "Local notice 2", destination: "Notifications", actionLabel: "Open Notifications" });
    expect(alerts[1].detail).toContain("unread");
  });

  test("makes offline and unavailable status explicit without implying a historical event", () => {
    const alerts = buildHomeActivityAlerts({
      health: { backend: "offline", localAi: "offline", modelCount: null }, history: { kind: "error" },
      role: "read_only", allowed: ["Home", "Search & Help"],
    });
    expect(alerts.map(item => item.key)).toEqual(["backend", "ai", "history"]);
    expect(alerts[0]).toMatchObject({ priority: "warning", destination: "Search & Help" });
    expect(alerts[1]).toMatchObject({ priority: "warning", destination: "Search & Help" });
    expect(alerts[2]).toMatchObject({ priority: "verify", destination: null, actionLabel: null });
    expect(alerts[0].detail).toContain("current observation");
  });

  test("never offers a restricted follow-up action even if a notification exists", () => {
    const alerts = buildHomeActivityAlerts({
      health: { backend: "online", localAi: "online", modelCount: 1 }, history,
      role: "read_only", allowed: ["Home"],
    });
    expect(alerts.every(item => item.destination === null && item.actionLabel === null)).toBe(true);
  });

  test("treats no-model as optional setup and unknown counts as unverified", () => {
    const base = { backend: "online" as const, localAi: "online" as const };
    const setup = buildHomeActivityAlerts({ health: { ...base, modelCount: 0 },
      history: { kind: "ready", notifications: [], summary: { ...summary, total: 0, unread: 0, warning: 0, urgent: 0 }, checkedAt: new Date() },
      role: "owner", allowed: ["System"] });
    expect(setup).toMatchObject([{ key: "ai", priority: "setup", destination: "System" }]);
    const unknown = buildHomeActivityAlerts({ health: { ...base, modelCount: Number.NaN },
      history: { kind: "loading" }, role: "owner", allowed: [] });
    expect(unknown.map(item => item.priority)).toEqual(["verify", "verify"]);
  });

  test("never claims the inbox is clear while history is loading or failed", () => {
    const health = { backend: "online" as const, localAi: "online" as const, modelCount: 1 };
    expect(buildHomeActivityAlerts({ health, history: { kind: "loading" }, role: "owner", allowed: [] })[0].key).toBe("history");
    expect(buildHomeActivityAlerts({ health, history: { kind: "error" }, role: "owner", allowed: [] })[0].key).toBe("history");
  });

  test("filters priority alerts without changing original order, full counts or authorization", () => {
    const all = buildHomeActivityAlerts({
      health: { backend: "offline", localAi: "online", modelCount: 0 }, history,
      role: "read_only", allowed: ["Home", "Notifications", "Search & Help"],
    });
    expect(all.map(item => item.priority)).toEqual(["urgent", "warning", "warning", "setup"]);
    expect(filterHomeActivityAlerts(all, "all")).toEqual(all);
    expect(filterHomeActivityAlerts(all, "urgent").map(item => item.key)).toEqual(["notification-2"]);
    expect(filterHomeActivityAlerts(all, "warning")).toHaveLength(2);
    expect(filterHomeActivityAlerts(all, "unread").map(item => item.key)).toEqual(["notification-1"]);
    expect(filterHomeActivityAlerts(all, "verify")).toHaveLength(0);
    expect(filterHomeActivityAlerts(all, "setup").map(item => item.key)).toEqual(["ai"]);
    expect(all).toHaveLength(4);
    expect(filterHomeActivityAlerts(all, "warning")[0].destination).toBe("Search & Help");
  });

  test("does not truncate the underlying sampled alerts before filtering", () => {
    const many = Array.from({ length: 8 }, (_, i) => note(i + 1, "warning"));
    const all = buildHomeActivityAlerts({
      health: { backend: "online", localAi: "online", modelCount: 1 },
      history: { ...history, notifications: many }, role: "owner", allowed: ["Notifications"],
    });
    expect(all).toHaveLength(8);
    expect(filterHomeActivityAlerts(all, "unread")).toHaveLength(8);
  });

  test("Build 276 preserves bounded inbox provenance without treating records as verified events", () => {
    const alerts = buildHomeActivityAlerts({
      health: { backend: "online", localAi: "online", modelCount: 1 }, history,
      role: "owner", allowed: ["Home", "Notifications"],
    });
    expect(alerts[0].record).toMatchObject({ notificationId: 2, message: "Local only", reportedSourceType: "test" });
    expect(homeAlertSourceContext(alerts[0])).toMatchObject({
      label: "Local notification inbox", reference: "Notification #2", reportedSourceType: "test",
      recordedAt: "2026-11-08T12:00:00Z",
    });
    expect(homeAlertSourceContext(alerts[0]).explanation).toContain("not independently verified");
    expect(history.kind).toBe("ready");
    if (history.kind === "ready") expect(history.notifications[0].message).toBe("Local only");
  });

  test("Build 276 rejects unsafe source metadata, oversized message and false event timestamps", () => {
    const invalid = { ...note(3, "warning"), source_type: "https://private.invalid/path",
      source_id: "private-device-token", message: "x".repeat(1201), created_at: "invalid timestamp" };
    const alerts = buildHomeActivityAlerts({
      health: { backend: "offline", localAi: "online", modelCount: 1 },
      history: { ...history, notifications: [invalid] }, role: "read_only", allowed: ["Home"],
    });
    const inbox = alerts.find(item => item.source === "notification");
    expect(inbox?.record).toMatchObject({ message: null, reportedSourceType: null });
    expect(inbox?.destination).toBeNull();
    expect(inbox && homeAlertSourceContext(inbox)).toMatchObject({ recordedAt: null, reportedSourceType: null });
    expect(JSON.stringify(inbox)).not.toContain("private-device-token");
    const observation = alerts.find(item => item.key === "backend");
    expect(observation && homeAlertSourceContext(observation)).toMatchObject({
      label: "Current Hub backend health request", recordedAt: null, reference: null,
    });
    expect(observation && homeAlertSourceContext(observation).explanation).toContain("not a recorded event");
  });

  test("Build 277 combines local search and named source filters without changing alert records", () => {
    const alerts = buildHomeActivityAlerts({
      health: { backend: "offline", localAi: "online", modelCount: 0 }, history,
      role: "read_only", allowed: ["Home"],
    });
    expect(searchHomeActivityAlerts(alerts, "LOCAL NOTICE 2", "notification").map(item => item.key))
      .toEqual(["notification-2"]);
    expect(searchHomeActivityAlerts(alerts, "  local hub  ", "backend").map(item => item.key))
      .toEqual(["backend"]);
    expect(searchHomeActivityAlerts(alerts, "Ollama", "ai").map(item => item.key)).toEqual(["ai"]);
    expect(searchHomeActivityAlerts(alerts, "Local only", "notification")).toEqual([]);
    expect(searchHomeActivityAlerts(alerts, "", "history")).toEqual([]);
    expect(searchHomeActivityAlerts(alerts, "", "all")).toEqual(alerts);
    expect(alerts.find(item => item.key === "notification-2")?.destination).toBeNull();
  });

  test("Build 277 fails closed on unusable paging metadata, inconsistent offsets and oversized rows", () => {
    const page = { notifications: [note(1, "warning")], total: 12, limit: 10, offset: 10 };
    expect(validHomeNotificationPage(page, 10, 10)).toBe(true);
    expect(validHomeNotificationPage({ ...page, offset: 0 }, 10, 10)).toBe(false);
    expect(validHomeNotificationPage({ ...page, total: -1 }, 10, 10)).toBe(false);
    expect(validHomeNotificationPage({ ...page, total: Number.POSITIVE_INFINITY }, 10, 10)).toBe(false);
    expect(validHomeNotificationPage({ ...page, limit: 100 }, 10, 10)).toBe(false);
    expect(validHomeNotificationPage({ ...page, total: 10 }, 10, 10)).toBe(false);
    expect(validHomeNotificationPage({ ...page, notifications: [] }, 10, 10)).toBe(false);
    expect(validHomeNotificationPage({ ...page, notifications: Array.from({ length: 11 }, () => note(1, "warning")) }, 10, 10)).toBe(false);
    expect(validHomeNotificationPage({ notifications: [], total: 0, limit: 10, offset: 0 }, 10, 0)).toBe(true);
  });
});
