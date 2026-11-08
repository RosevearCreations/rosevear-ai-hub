import { beforeEach, describe, expect, it } from "vitest";
import {
  loadAlertReviewPreferences, loadAlertReviewSession, saveAlertReviewPreferences, saveAlertReviewSession,
  saveNamedAlertView, sanitizeAlertReviewPreferences, sanitizeAlertReviewSession, toggleAlertBookmark,
  MAX_ALERT_BOOKMARKS, MAX_SAVED_ALERT_VIEWS,
} from "./alertReviewPreferences";

describe("Build 279 personal alert review views and bookmarks", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

  it("isolates saved names and filters by account without persisting alert messages", () => {
    const initial = loadAlertReviewPreferences(localStorage, 1);
    const saved = saveNamedAlertView(initial, "Morning warnings", { filter: "warning", source: "notification", query: "Pump" })!;
    expect(saveAlertReviewPreferences(localStorage, 1, saved)).toBe(true);
    expect(loadAlertReviewPreferences(localStorage, 1).views).toEqual(saved.views);
    expect(loadAlertReviewPreferences(localStorage, 2).views).toEqual([]);
    expect(JSON.stringify(localStorage)).not.toContain("alert body");
    const updated = saveNamedAlertView(saved, "morning warnings", { filter: "urgent", source: "all", query: "" })!;
    expect(updated.views).toHaveLength(1);
    expect(updated.views[0].filter).toBe("urgent");
  });

  it("rejects malformed, excessive and sensitive saved settings", () => {
    const views = Array.from({ length: MAX_SAVED_ALERT_VIEWS + 4 }, (_, i) => ({
      id: `view-${i + 1}`, name: `Review ${i + 1}`, filter: "warning", source: "notification", query: "ok",
    }));
    const bookmarks = Array.from({ length: MAX_ALERT_BOOKMARKS + 4 }, (_, i) => ({
      notificationId: i + 1, pageOffset: i * 10,
    }));
    const sanitized = sanitizeAlertReviewPreferences({ version: 1, views, bookmarks });
    expect(sanitized.views).toHaveLength(MAX_SAVED_ALERT_VIEWS);
    expect(sanitized.bookmarks).toHaveLength(MAX_ALERT_BOOKMARKS);
    expect(saveNamedAlertView(sanitized, "more", { filter: "all", source: "all", query: "" })).toBeNull();
    expect(saveNamedAlertView(sanitized, "password=private", { filter: "all", source: "all", query: "" })).toBeNull();
    expect(sanitizeAlertReviewPreferences({ version: 99, views, bookmarks }).views).toEqual([]);
    expect(sanitizeAlertReviewSession({ filter: "admin", source: "secret", query: "ok\nno", pageOffset: -2,
      selectedKey: "notification-private" })).toEqual({ filter: "all", source: "all", query: "", pageOffset: 0, selectedKey: null });
  });

  it("retains only notification references and validated page offsets for bookmarks", () => {
    const first = toggleAlertBookmark(loadAlertReviewPreferences(localStorage, 1), 17, 10);
    expect(first.bookmarks).toEqual([{ notificationId: 17, pageOffset: 10 }]);
    expect(toggleAlertBookmark(first, 17, 10).bookmarks).toEqual([]);
    expect(toggleAlertBookmark(first, 18, 3).bookmarks[1].pageOffset).toBe(0);
    expect(toggleAlertBookmark(first, -1, 10)).toBe(first);
  });

  it("restores only the account's bounded session review position", () => {
    const session = { filter: "urgent" as const, source: "notification" as const, query: "Garage",
      pageOffset: 20, selectedKey: "notification-22" };
    expect(saveAlertReviewSession(sessionStorage, 7, session)).toBe(true);
    expect(loadAlertReviewSession(sessionStorage, 7)).toEqual(session);
    expect(loadAlertReviewSession(sessionStorage, 8).pageOffset).toBe(0);
    expect(loadAlertReviewSession(null, 7).selectedKey).toBeNull();
  });
});
