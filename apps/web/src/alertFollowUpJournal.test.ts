import { describe, expect, test } from "vitest";
import {
  appendFollowUpEntry, followUpOutcomeLabel, loadFollowUpJournal, MAX_FOLLOW_UP_ENTRIES,
  MAX_FOLLOW_UP_PER_NOTIFICATION, safeFollowUpNote, sanitizeFollowUpJournal, saveFollowUpJournal,
} from "./alertFollowUpJournal";

const at = "2026-11-08T15:00:00.000Z";

describe("Build 280 browser-local follow-up journal", () => {
  test("persists only to the specified account and rejects unavailable storage", () => {
    const storage = new Map<string, string>();
    const local = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value); },
    } as Storage;
    const entry = appendFollowUpEntry({ version: 1, entries: [] }, {
      notificationId: 17, pageOffset: 10, note: "Checked local service dashboard", outcome: "investigating", recordedAt: at,
    });
    expect(entry?.entries[0]).toEqual(expect.objectContaining({ notificationId: 17, pageOffset: 10, outcome: "investigating" }));
    expect(saveFollowUpJournal(local, 11, entry!)).toBe(true);
    expect(loadFollowUpJournal(local, 11)).toEqual(entry);
    expect(loadFollowUpJournal(local, 12).entries).toEqual([]);
    expect(saveFollowUpJournal(local, 0, entry!)).toBe(false);
    expect(saveFollowUpJournal(null, 11, entry!)).toBe(false);
    expect(loadFollowUpJournal({ getItem() { throw Error("blocked"); } } as unknown as Storage, 11).entries).toEqual([]);
  });

  test("validates stored records, eliminates duplicates and limits untrusted history", () => {
    const base = { id: 1, notificationId: 5, pageOffset: 0, outcome: "needs_review", note: "Review later", recordedAt: at };
    expect(sanitizeFollowUpJournal({ version: 2, entries: [base] }).entries).toEqual([]);
    expect(sanitizeFollowUpJournal({ version: 1, entries: [base, { ...base, note: "Overwritten" },
      { ...base, id: 2, note: "password: secret" },
      { ...base, id: 3, notificationId: -1 },
      { ...base, id: 4, recordedAt: "never" },
    ] }).entries).toEqual([base]);
    expect(safeFollowUpNote("https://example.com/private")).toBeNull();
    expect(safeFollowUpNote("a".repeat(241))).toBeNull();
    expect(safeFollowUpNote("Done\nnext step")).toBe("Done\nnext step");
    expect(followUpOutcomeLabel("reviewed_locally")).toContain("not resolved");
  });

  test("appends immutable history without overwriting, evicting, or inventing server outcomes", () => {
    let journal = { version: 1 as const, entries: [] as ReturnType<typeof sanitizeFollowUpJournal>["entries"] };
    for (let count = 0; count < MAX_FOLLOW_UP_PER_NOTIFICATION; count++) {
      journal = appendFollowUpEntry(journal, {
        notificationId: 3, pageOffset: 0, outcome: "follow_up", note: `Check ${count}`, recordedAt: at,
      })!;
    }
    expect(journal.entries).toHaveLength(MAX_FOLLOW_UP_PER_NOTIFICATION);
    expect(appendFollowUpEntry(journal, { notificationId: 3, pageOffset: 0, outcome: "reviewed_locally",
      note: "Extra", recordedAt: at })).toBeNull();
    while (journal.entries.length < MAX_FOLLOW_UP_ENTRIES) {
      journal = appendFollowUpEntry(journal, { notificationId: journal.entries.length + 10, pageOffset: 10,
        outcome: "needs_review", note: "Review", recordedAt: at })!;
    }
    expect(appendFollowUpEntry(journal, { notificationId: 999, pageOffset: 0, outcome: "needs_review",
      note: "Do not evict", recordedAt: at })).toBeNull();
    expect(journal.entries[0].note).toBe("Check 0");
  });
});
