import { safeAlertViewName } from "./alertReviewPreferences";
import { type LocalFollowUpJournal } from "./alertFollowUpJournal";
import {
  type FollowUpQueueAgeFilter, type FollowUpQueueFilters, type FollowUpQueueItem,
  type FollowUpQueuePriorityFilter, type FollowUpQueueStatusFilter,
} from "./alertFollowUpQueue";

/** Local-only metadata. No alert content, note text, or source identity is persisted in a preset. */
export const MAX_FOLLOW_UP_QUEUE_PRESETS = 5;
export type SavedQueuePreset = { id: string; name: string; filters: FollowUpQueueFilters };
export type QueuePresetPreferences = { version: 1; presets: SavedQueuePreset[] };
const emptyPreferences = (): QueuePresetPreferences => ({ version: 1, presets: [] });

const validStatuses: readonly FollowUpQueueStatusFilter[] = ["all", "outstanding", "reviewed_locally"];
const validAges: readonly FollowUpQueueAgeFilter[] = ["all", "aging", "overdue", "clock_check"];
const validPriorities: readonly FollowUpQueuePriorityFilter[] = ["all", "high", "attention", "routine"];

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}
export function validQueueFilters(value: unknown): value is FollowUpQueueFilters {
  const fields = object(value);
  return !!fields && validStatuses.includes(fields.status as FollowUpQueueStatusFilter)
    && validAges.includes(fields.age as FollowUpQueueAgeFilter)
    && validPriorities.includes(fields.priority as FollowUpQueuePriorityFilter);
}
function narrowQueueFilters(filters: FollowUpQueueFilters): FollowUpQueueFilters {
  return { status: filters.status, age: filters.age, priority: filters.priority };
}

export function sanitizeQueuePresets(value: unknown): QueuePresetPreferences {
  const source = object(value);
  if (source?.version !== 1) return emptyPreferences();
  const presets: SavedQueuePreset[] = [];
  const names = new Set<string>();
  const ids = new Set<string>();
  for (const raw of Array.isArray(source.presets) ? source.presets.slice(0, 30) : []) {
    const item = object(raw);
    if (!item || typeof item.id !== "string" || !/^queue-[1-9]\d{0,4}$/.test(item.id) ||
      typeof item.name !== "string" || !validQueueFilters(item.filters)) continue;
    const name = safeAlertViewName(item.name);
    if (!name || names.has(name.toLocaleLowerCase()) || ids.has(item.id)) continue;
    presets.push({ id: item.id, name, filters: narrowQueueFilters(item.filters) });
    ids.add(item.id); names.add(name.toLocaleLowerCase());
    if (presets.length === MAX_FOLLOW_UP_QUEUE_PRESETS) break;
  }
  return { version: 1, presets };
}

function storageKey(accountId: number): string | null {
  return Number.isSafeInteger(accountId) && accountId > 0
    ? `rosevear-ai-hub:follow-up-queue-presets:v1:${accountId}` : null;
}
export function loadQueuePresets(storage: Storage | null, accountId: number): QueuePresetPreferences {
  const key = storageKey(accountId);
  if (!key || !storage) return emptyPreferences();
  try { return sanitizeQueuePresets(JSON.parse(storage.getItem(key) ?? "null")); }
  catch { return emptyPreferences(); }
}
export function persistQueuePresets(storage: Storage | null, accountId: number, value: QueuePresetPreferences): boolean {
  const key = storageKey(accountId);
  if (!key || !storage) return false;
  try { storage.setItem(key, JSON.stringify(sanitizeQueuePresets(value))); return true; }
  catch { return false; }
}
export function saveQueuePreset(previous: QueuePresetPreferences, nameInput: string,
  filters: FollowUpQueueFilters): QueuePresetPreferences | null {
  const name = safeAlertViewName(nameInput);
  if (!name || !validQueueFilters(filters)) return null;
  const existing = previous.presets.find(item => item.name.toLocaleLowerCase() === name.toLocaleLowerCase());
  if (!existing && previous.presets.length >= MAX_FOLLOW_UP_QUEUE_PRESETS) return null;
  let nextId = 1;
  while (previous.presets.some(item => item.id === `queue-${nextId}`)) nextId++;
  const preset: SavedQueuePreset = { id: existing?.id ?? `queue-${nextId}`, name, filters: narrowQueueFilters(filters) };
  return { version: 1, presets: existing ? previous.presets.map(item => item.id === existing.id ? preset : item)
    : [...previous.presets, preset] };
}

export type LocalReviewWorkload = {
  recentNotes: number;
  previousNotes: number;
  change: number;
  outstanding: number;
  reviewedLocally: number;
  overdue: number;
  clockCheck: number;
  trackedNotifications: number;
};

export function localReviewWorkload(journal: LocalFollowUpJournal, queue: readonly FollowUpQueueItem[], now: Date): LocalReviewWorkload {
  const current = now.getTime();
  let recentNotes = 0;
  let previousNotes = 0;
  for (const entry of journal.entries) {
    const age = current - Date.parse(entry.recordedAt);
    if (!Number.isFinite(current) || !Number.isFinite(age) || age < 0) continue;
    if (age < 7 * 86_400_000) recentNotes++;
    else if (age < 14 * 86_400_000) previousNotes++;
  }
  const outstanding = queue.filter(item => item.latestOutcome !== "reviewed_locally");
  return { recentNotes, previousNotes, change: recentNotes - previousNotes,
    outstanding: outstanding.length, reviewedLocally: queue.length - outstanding.length,
    overdue: outstanding.filter(item => item.age === "overdue").length,
    clockCheck: queue.filter(item => item.age === "clock_check").length,
    trackedNotifications: queue.length };
}

/** A safe report preview: only aggregate counts and known enum filter labels. No note bodies, IDs, names, or inbox data. */
export function localReviewReportPreview(workload: LocalReviewWorkload, matching: readonly FollowUpQueueItem[],
  filters: FollowUpQueueFilters, now: Date): string {
  const counts = { high: 0, attention: 0, routine: 0 };
  for (const item of matching) counts[item.priority]++;
  return [
    "Rosevear AI Hub — Personal follow-up review preview",
    `Generated: ${Number.isFinite(now.getTime()) ? now.toISOString() : "Time not verified"}`,
    "Source: bounded browser-local owner notes only; not server notification status.",
    `Filters: status=${filters.status}, age=${filters.age}, priority=${filters.priority}`,
    `Matching tracked notifications: ${matching.length}`,
    `Personal priority: high ${counts.high}, attention ${counts.attention}, routine ${counts.routine}`,
    `All locally tracked notifications: ${workload.trackedNotifications}`,
    `Outstanding personal reviews: ${workload.outstanding}; reviewed locally (not resolved): ${workload.reviewedLocally}`,
    `Outstanding with last local note 14+ days ago: ${workload.overdue}; clock checks: ${workload.clockCheck}`,
    `Local note events: last 7 days ${workload.recentNotes}, preceding 7 days ${workload.previousNotes}, change ${workload.change >= 0 ? "+" : ""}${workload.change}`,
    "Private note text, notification identifiers, actual inbox records and authentication details are intentionally excluded.",
    "This preview is not exported or sent, is not a live workload trend, and does not resolve any alert.",
  ].join("\n");
}
