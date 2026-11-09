import { describe, expect, test } from "vitest";
import { buildFollowUpQueue, filterFollowUpQueue, followUpQueueAge, followUpQueueAgeLabel } from "./alertFollowUpQueue";
import { type LocalFollowUpJournal } from "./alertFollowUpJournal";

const now = new Date("2026-11-09T12:00:00.000Z");
const journal: LocalFollowUpJournal = { version: 1, entries: [
  { id: 1, notificationId: 11, pageOffset: 0, note: "First follow-up", outcome: "needs_review", recordedAt: "2026-10-20T12:00:00.000Z" },
  { id: 2, notificationId: 22, pageOffset: 10, note: "Working", outcome: "investigating", recordedAt: "2026-11-02T12:00:00.000Z" },
  { id: 3, notificationId: 33, pageOffset: 20, note: "Done locally", outcome: "reviewed_locally", recordedAt: "2026-10-15T12:00:00.000Z" },
  { id: 4, notificationId: 11, pageOffset: 30, note: "Still pending", outcome: "follow_up", recordedAt: "2026-10-21T12:00:00.000Z" },
  { id: 5, notificationId: 44, pageOffset: 0, note: "New item", outcome: "needs_review", recordedAt: "2026-11-08T12:00:00.000Z" },
  { id: 6, notificationId: 55, pageOffset: 0, note: "Wait", outcome: "needs_review", recordedAt: "2026-11-10T12:00:00.000Z" },
] };

describe("Build 281 local follow-up queue", () => {
  test("groups by alert, shows only latest personal outcome and orders overdue active follow-ups first", () => {
    const items = buildFollowUpQueue(journal, now);
    expect(items.map(item => item.notificationId)).toEqual([11, 22, 55, 33, 44]);
    expect(items[0]).toEqual(expect.objectContaining({ notificationId: 11, pageOffset: 30,
      latestOutcome: "follow_up", entryCount: 2, ageDays: 19, age: "overdue", priority: "high" }));
    expect(items[1]).toEqual(expect.objectContaining({ notificationId: 22, ageDays: 7, priority: "attention" }));
    expect(items.find(item => item.notificationId === 33)).toEqual(expect.objectContaining({
      age: "overdue", priority: "routine", latestOutcome: "reviewed_locally",
    }));
    expect(items.every(item => !("note" in item))).toBe(true);
  });

  test("filters only local queue, not inbox, and never assumes a reviewed note resolved an alert", () => {
    const items = buildFollowUpQueue(journal, now);
    expect(filterFollowUpQueue(items, { status: "outstanding", age: "aging", priority: "all" })
      .map(item => item.notificationId)).toEqual([11, 22]);
    expect(filterFollowUpQueue(items, { status: "reviewed_locally", age: "all", priority: "routine" })
      .map(item => item.notificationId)).toEqual([33]);
    expect(filterFollowUpQueue(items, { status: "outstanding", age: "overdue", priority: "high" })
      .map(item => item.notificationId)).toEqual([11]);
    expect(journal.entries).toHaveLength(6);
  });

  test("fails closed on invalid clocks, future timestamps, and exact aging boundaries", () => {
    expect(followUpQueueAge("2026-11-02T12:00:00.000Z", now)).toEqual({ days: 7, age: "aging" });
    expect(followUpQueueAge("2026-10-26T12:00:00.000Z", now)).toEqual({ days: 14, age: "overdue" });
    expect(followUpQueueAge("2026-11-10T12:00:00.000Z", now)).toEqual({ days: null, age: "clock_check" });
    expect(followUpQueueAge("bad", now)).toEqual({ days: null, age: "clock_check" });
    const item = buildFollowUpQueue(journal, now).find(value => value.notificationId === 55)!;
    expect(followUpQueueAgeLabel(item)).toMatch(/Clock check needed/);
  });

  test("uses timestamp and then append identifier to find latest even if storage has unsorted entries", () => {
    const entries = [
      { id: 8, notificationId: 1, pageOffset: 0, note: "Later", outcome: "reviewed_locally" as const, recordedAt: "2026-11-08T12:00:00.000Z" },
      { id: 7, notificationId: 1, pageOffset: 10, note: "Earlier", outcome: "needs_review" as const, recordedAt: "2026-11-07T12:00:00.000Z" },
    ];
    expect(buildFollowUpQueue({ version: 1, entries }, now)[0]).toEqual(expect.objectContaining({
      latestOutcome: "reviewed_locally", pageOffset: 0, priority: "routine",
    }));
  });
});
