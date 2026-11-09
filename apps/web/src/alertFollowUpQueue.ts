import { type LocalFollowUpEntry, type LocalFollowUpJournal, type LocalFollowUpOutcome } from "./alertFollowUpJournal";

/** Personal review priorities only. These never describe the server notification's state. */
export type FollowUpQueueAge = "recent" | "aging" | "overdue" | "clock_check";
export type FollowUpQueuePriority = "high" | "attention" | "routine";
export type FollowUpQueueStatusFilter = "all" | "outstanding" | "reviewed_locally";
export type FollowUpQueueAgeFilter = "all" | "aging" | "overdue" | "clock_check";
export type FollowUpQueuePriorityFilter = "all" | FollowUpQueuePriority;
export type FollowUpQueueItem = {
  notificationId: number;
  pageOffset: number;
  latestOutcome: LocalFollowUpOutcome;
  latestAt: string;
  ageDays: number | null;
  age: FollowUpQueueAge;
  priority: FollowUpQueuePriority;
  entryCount: number;
};

export function followUpQueueAge(recordedAt: string, now: Date): { days: number | null; age: FollowUpQueueAge } {
  const recorded = Date.parse(recordedAt);
  const current = now.getTime();
  if (!Number.isFinite(recorded) || !Number.isFinite(current) || recorded > current) {
    return { days: null, age: "clock_check" };
  }
  const days = Math.floor((current - recorded) / 86_400_000);
  return { days, age: days >= 14 ? "overdue" : days >= 7 ? "aging" : "recent" };
}

function latestEntry(current: LocalFollowUpEntry, next: LocalFollowUpEntry): LocalFollowUpEntry {
  const diff = Date.parse(next.recordedAt) - Date.parse(current.recordedAt);
  return diff > 0 || (diff === 0 && next.id > current.id) ? next : current;
}

export function buildFollowUpQueue(journal: LocalFollowUpJournal, now: Date): FollowUpQueueItem[] {
  const grouped = new Map<number, { latest: LocalFollowUpEntry; count: number }>();
  for (const entry of journal.entries) {
    const previous = grouped.get(entry.notificationId);
    grouped.set(entry.notificationId, previous
      ? { latest: latestEntry(previous.latest, entry), count: previous.count + 1 }
      : { latest: entry, count: 1 });
  }
  const priorityRank: Record<FollowUpQueuePriority, number> = { high: 0, attention: 1, routine: 2 };
  return [...grouped.entries()].map(([notificationId, { latest, count }]) => {
    const { days, age } = followUpQueueAge(latest.recordedAt, now);
    const outstanding = latest.outcome !== "reviewed_locally";
    const priority: FollowUpQueuePriority = !outstanding ? "routine"
      : age === "overdue" ? "high"
        : age !== "recent" || latest.outcome === "follow_up" ? "attention" : "routine";
    return { notificationId, pageOffset: latest.pageOffset, latestOutcome: latest.outcome,
      latestAt: latest.recordedAt, ageDays: days, age, priority, entryCount: count };
  }).sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]
    || Date.parse(a.latestAt) - Date.parse(b.latestAt) || a.notificationId - b.notificationId);
}

export function filterFollowUpQueue(items: readonly FollowUpQueueItem[], filters: {
  status: FollowUpQueueStatusFilter; age: FollowUpQueueAgeFilter; priority: FollowUpQueuePriorityFilter;
}): FollowUpQueueItem[] {
  return items.filter(item =>
    (filters.status === "all" || (filters.status === "reviewed_locally"
      ? item.latestOutcome === "reviewed_locally" : item.latestOutcome !== "reviewed_locally")) &&
    (filters.age === "all" || item.age === filters.age || (filters.age === "aging" && item.age === "overdue")) &&
    (filters.priority === "all" || item.priority === filters.priority));
}

export function followUpQueueAgeLabel(item: FollowUpQueueItem): string {
  if (item.age === "clock_check") return "Clock check needed — future review time";
  return `${item.ageDays} day${item.ageDays === 1 ? "" : "s"} since personal review · ${
    item.age === "overdue" ? "14+ days" : item.age === "aging" ? "7–13 days" : "recent"}`;
}
