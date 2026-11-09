import { describe, expect, test } from "vitest";
import { type LocalFollowUpJournal } from "./alertFollowUpJournal";
import { buildFollowUpQueue, filterFollowUpQueue } from "./alertFollowUpQueue";
import {
  loadQueuePresets, localReviewReportPreview, localReviewWorkload,
  MAX_FOLLOW_UP_QUEUE_PRESETS, persistQueuePresets, sanitizeQueuePresets, saveQueuePreset,
} from "./followUpQueueInsights";

const now = new Date("2026-11-09T12:00:00.000Z");
const filters = { status: "outstanding" as const, age: "overdue" as const, priority: "high" as const };
const journal: LocalFollowUpJournal = { version: 1, entries: [
  { id: 1, notificationId: 101, pageOffset: 0, outcome: "needs_review", note: "PRIVATE access code 123456",
    recordedAt: "2026-10-20T12:00:00.000Z" },
  { id: 2, notificationId: 101, pageOffset: 0, outcome: "follow_up", note: "Confidential address details",
    recordedAt: "2026-11-08T12:00:00.000Z" },
  { id: 3, notificationId: 202, pageOffset: 10, outcome: "reviewed_locally", note: "Private diagnostic result",
    recordedAt: "2026-11-01T12:00:00.000Z" },
  { id: 4, notificationId: 303, pageOffset: 20, outcome: "needs_review", note: "Still needs check",
    recordedAt: "2026-10-15T12:00:00.000Z" },
  { id: 5, notificationId: 404, pageOffset: 0, outcome: "needs_review", note: "Future clock anomaly",
    recordedAt: "2026-12-01T12:00:00.000Z" },
] };

describe("Build 282 saved owner follow-up presets and safe workload report", () => {
  test("saves filters only, overwrites by name, respects limits and isolates owners", () => {
    const storage = new Map<string, string>();
    const local = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); },
    } as Storage;
    let prefs = saveQueuePreset({ version: 1, presets: [] }, "Weekly aging", filters)!;
    expect(prefs.presets[0]).toEqual({ id: "queue-1", name: "Weekly aging", filters });
    expect(persistQueuePresets(local, 9, prefs)).toBe(true);
    expect(loadQueuePresets(local, 9)).toEqual(prefs);
    expect(loadQueuePresets(local, 10).presets).toEqual([]);
    prefs = saveQueuePreset(prefs, "weekly AGING", { ...filters, age: "aging" })!;
    expect(prefs.presets).toHaveLength(1);
    expect(prefs.presets[0].id).toBe("queue-1");
    for (let i = 2; i <= MAX_FOLLOW_UP_QUEUE_PRESETS; i++) prefs = saveQueuePreset(prefs, `Preset ${i}`, filters)!;
    expect(saveQueuePreset(prefs, "Excess", filters)).toBeNull();
    expect(saveQueuePreset(prefs, "token: private", filters)).toBeNull();
    expect(saveQueuePreset(prefs, "https://unsafe.example", filters)).toBeNull();
    expect(persistQueuePresets(local, 0, prefs)).toBe(false);
    expect(persistQueuePresets(null, 9, prefs)).toBe(false);
    expect(loadQueuePresets({ getItem() { throw Error("unavailable"); } } as unknown as Storage, 9).presets).toEqual([]);
  });

  test("drops malformed, duplicate and credential-bearing presets without changing journal", () => {
    const good = { id: "queue-1", name: "Review aging", filters };
    expect(sanitizeQueuePresets({ version: 2, presets: [good] }).presets).toEqual([]);
    expect(sanitizeQueuePresets({ version: 1, presets: [good,
      { ...good, id: "queue-2", name: "review AGING" },
      { ...good, id: "queue-3", name: "passwords" },
      { ...good, id: "queue-4", filters: { status: "resolve", age: "all", priority: "all" } },
      { ...good, id: "../etc" },
    ] }).presets).toEqual([good]);
    expect(sanitizeQueuePresets({ version: 1, presets: [{ ...good,
      filters: { ...filters, note: "credential-like extra field" },
    }] }).presets).toEqual([good]);
    expect(saveQueuePreset({ version: 1, presets: [] }, "Clean", {
      ...filters, note: "secret extra field",
    } as typeof filters & { note: string })?.presets[0].filters).toEqual(filters);
    expect(journal.entries).toHaveLength(5);
  });

  test("counts local note events in rolling windows, distinguishes tracked work from live alerts and ignores future clocks", () => {
    const queue = buildFollowUpQueue(journal, now);
    const workload = localReviewWorkload(journal, queue, now);
    expect(workload).toEqual({ recentNotes: 1, previousNotes: 1, change: 0,
      outstanding: 3, reviewedLocally: 1, overdue: 1, clockCheck: 1, trackedNotifications: 4 });
    const current = new Date("2026-11-09T12:00:00.000Z");
    expect(localReviewWorkload({ version: 1, entries: [] }, [], current).recentNotes).toBe(0);
  });

  test("previews only aggregate metadata, excluding notes, alert identifiers and any export", () => {
    const queue = buildFollowUpQueue(journal, now);
    const matching = filterFollowUpQueue(queue, filters);
    const report = localReviewReportPreview(localReviewWorkload(journal, queue, now), matching, filters, now);
    expect(report).toContain("Matching tracked notifications: 1");
    expect(report).toContain("Outstanding personal reviews: 3");
    expect(report).not.toContain("No data");
    for (const word of ["123456", "Confidential", "diagnostic result", "notification #101", "notification #303"])
      expect(report.toLowerCase()).not.toContain(word.toLowerCase());
    expect(report).toContain("not exported or sent");
    expect(report).toContain("not server notification status");
  });
});
