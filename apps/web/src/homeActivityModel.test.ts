import { describe, expect, test } from "vitest";

import type { HubNotification, NotificationSummary } from "./api";
import {
  buildHomeActivityAlerts, recentHomeNotifications, validHomeActivityResponse,
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
});
