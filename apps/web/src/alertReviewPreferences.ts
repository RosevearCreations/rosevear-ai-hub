import type { HomeAlertFilter, HomeAlertSourceFilter } from "./homeActivityModel";

export const MAX_SAVED_ALERT_VIEWS = 6;
export const MAX_ALERT_BOOKMARKS = 12;
export const ALERT_REVIEW_PAGE_SIZE = 10;

export type SavedAlertView = { id: string; name: string; filter: HomeAlertFilter;
  source: HomeAlertSourceFilter; query: string };
export type AlertReviewBookmark = { notificationId: number; pageOffset: number };
export type AlertReviewPreferences = { version: 1; views: SavedAlertView[]; bookmarks: AlertReviewBookmark[] };
export type AlertReviewSession = { filter: HomeAlertFilter; source: HomeAlertSourceFilter;
  query: string; pageOffset: number; selectedKey: string | null };

const filters: HomeAlertFilter[] = ["all", "urgent", "warning", "unread", "verify", "setup"];
const sources: HomeAlertSourceFilter[] = ["all", "notification", "backend", "ai", "history"];
const emptyPreferences = (): AlertReviewPreferences => ({ version: 1, views: [], bookmarks: [] });
export const emptyAlertReviewSession = (): AlertReviewSession => ({
  filter: "all", source: "all", query: "", pageOffset: 0, selectedKey: null,
});

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function safeQuery(value: unknown): string {
  return typeof value === "string" && value.length <= 120 && !/[\u0000-\u001f\u007f]/.test(value)
    ? value : "";
}

export function safeAlertViewName(value: string): string | null {
  const name = value.trim();
  return name.length >= 1 && name.length <= 40 && !/[\u0000-\u001f\u007f]/.test(name) &&
    !/(https?:\/\/|@|password|secret|token|api[_ -]?key)/i.test(name) ? name : null;
}

function safeFilter(value: unknown): HomeAlertFilter {
  return filters.includes(value as HomeAlertFilter) ? value as HomeAlertFilter : "all";
}
function safeSource(value: unknown): HomeAlertSourceFilter {
  return sources.includes(value as HomeAlertSourceFilter) ? value as HomeAlertSourceFilter : "all";
}
function safeOffset(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000 &&
    value % ALERT_REVIEW_PAGE_SIZE === 0 ? value : 0;
}

export function sanitizeAlertReviewPreferences(value: unknown): AlertReviewPreferences {
  const src = record(value);
  if (src?.version !== 1) return emptyPreferences();
  const views: SavedAlertView[] = [];
  const seen = new Set<string>();
  const seenIds = new Set<string>();
  for (const candidate of Array.isArray(src.views) ? src.views.slice(0, 50) : []) {
    const item = record(candidate);
    if (!item || typeof item.id !== "string" || !/^view-[1-9]\d{0,4}$/.test(item.id) ||
        typeof item.name !== "string") continue;
    const name = safeAlertViewName(item.name);
    if (!name || seen.has(name.toLocaleLowerCase()) || seenIds.has(item.id)) continue;
    views.push({ id: item.id, name, filter: safeFilter(item.filter), source: safeSource(item.source),
      query: safeQuery(item.query) });
    seen.add(name.toLocaleLowerCase());
    seenIds.add(item.id);
    if (views.length === MAX_SAVED_ALERT_VIEWS) break;
  }
  const bookmarks: AlertReviewBookmark[] = [];
  const ids = new Set<number>();
  for (const candidate of Array.isArray(src.bookmarks) ? src.bookmarks.slice(0, 50) : []) {
    const item = record(candidate);
    if (!item || typeof item.notificationId !== "number" || !Number.isSafeInteger(item.notificationId) ||
      item.notificationId < 1 || ids.has(item.notificationId)) continue;
    bookmarks.push({ notificationId: item.notificationId, pageOffset: safeOffset(item.pageOffset) });
    ids.add(item.notificationId);
    if (bookmarks.length === MAX_ALERT_BOOKMARKS) break;
  }
  return { version: 1, views, bookmarks };
}

export function sanitizeAlertReviewSession(value: unknown): AlertReviewSession {
  const src = record(value);
  const selectedKey = typeof src?.selectedKey === "string" && /^notification-[1-9]\d{0,14}$/.test(src.selectedKey)
    ? src.selectedKey : null;
  return { filter: safeFilter(src?.filter), source: safeSource(src?.source),
    query: safeQuery(src?.query), pageOffset: safeOffset(src?.pageOffset), selectedKey };
}

function storageKey(userId: number, kind: "views" | "session"): string | null {
  return Number.isSafeInteger(userId) && userId > 0 ? `rosevear-ai-hub:alert-review:v1:${userId}:${kind}` : null;
}

export function loadAlertReviewPreferences(storage: Storage | null, userId: number): AlertReviewPreferences {
  const key = storageKey(userId, "views");
  if (!key || !storage) return emptyPreferences();
  try { return sanitizeAlertReviewPreferences(JSON.parse(storage.getItem(key) ?? "null")); }
  catch { return emptyPreferences(); }
}
export function saveAlertReviewPreferences(storage: Storage | null, userId: number, value: AlertReviewPreferences): boolean {
  const key = storageKey(userId, "views");
  if (!key || !storage) return false;
  try { storage.setItem(key, JSON.stringify(sanitizeAlertReviewPreferences(value))); return true; }
  catch { return false; }
}
export function loadAlertReviewSession(storage: Storage | null, userId: number): AlertReviewSession {
  const key = storageKey(userId, "session");
  if (!key || !storage) return emptyAlertReviewSession();
  try { return sanitizeAlertReviewSession(JSON.parse(storage.getItem(key) ?? "null")); }
  catch { return emptyAlertReviewSession(); }
}
export function saveAlertReviewSession(storage: Storage | null, userId: number, value: AlertReviewSession): boolean {
  const key = storageKey(userId, "session");
  if (!key || !storage) return false;
  try { storage.setItem(key, JSON.stringify(sanitizeAlertReviewSession(value))); return true; }
  catch { return false; }
}

export function saveNamedAlertView(previous: AlertReviewPreferences, nameInput: string,
  selection: Pick<AlertReviewSession, "filter" | "source" | "query">): AlertReviewPreferences | null {
  const name = safeAlertViewName(nameInput);
  if (!name) return null;
  const old = previous.views.find(view => view.name.toLocaleLowerCase() === name.toLocaleLowerCase());
  if (!old && previous.views.length === MAX_SAVED_ALERT_VIEWS) return null;
  let candidate = 1;
  while (previous.views.some(view => view.id === `view-${candidate}`)) candidate++;
  const next: SavedAlertView = { id: old?.id ?? `view-${candidate}`, name,
    filter: safeFilter(selection.filter), source: safeSource(selection.source), query: safeQuery(selection.query) };
  return { ...previous, views: old ? previous.views.map(view => view.id === old.id ? next : view)
    : [...previous.views, next] };
}

export function toggleAlertBookmark(previous: AlertReviewPreferences, notificationId: number,
  pageOffset: number): AlertReviewPreferences {
  if (!Number.isSafeInteger(notificationId) || notificationId < 1) return previous;
  const found = previous.bookmarks.some(item => item.notificationId === notificationId);
  if (found) return { ...previous, bookmarks: previous.bookmarks.filter(item => item.notificationId !== notificationId) };
  if (previous.bookmarks.length >= MAX_ALERT_BOOKMARKS) return previous;
  return { ...previous, bookmarks: [...previous.bookmarks, { notificationId, pageOffset: safeOffset(pageOffset) }] };
}
