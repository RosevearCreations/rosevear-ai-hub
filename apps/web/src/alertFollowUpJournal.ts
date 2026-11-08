/** Browser-local operator annotations. Never a claim about server-side alert state. */
export const MAX_FOLLOW_UP_ENTRIES = 40;
export const MAX_FOLLOW_UP_PER_NOTIFICATION = 8;
export const MAX_FOLLOW_UP_NOTE_LENGTH = 240;

export type LocalFollowUpOutcome = "needs_review" | "investigating" | "follow_up" | "reviewed_locally";
export type LocalFollowUpEntry = {
  id: number;
  notificationId: number;
  pageOffset: number;
  outcome: LocalFollowUpOutcome;
  note: string;
  recordedAt: string;
};
export type LocalFollowUpJournal = { version: 1; entries: LocalFollowUpEntry[] };

const outcomes: readonly LocalFollowUpOutcome[] = ["needs_review", "investigating", "follow_up", "reviewed_locally"];
const emptyJournal = (): LocalFollowUpJournal => ({ version: 1, entries: [] });

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function safeFollowUpNote(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const note = value.trim();
  if (!note || note.length > MAX_FOLLOW_UP_NOTE_LENGTH || /[\u0000-\u0008\u000b-\u001f\u007f]/.test(note)) return null;
  // Local storage is not encrypted. Prevent a few common accidental credential disclosures.
  if (/(https?:\/\/|password\s*[:=]|api[_ -]?key\s*[:=]|(?:access|bearer)\s+token\s*[:=])/i.test(note)) return null;
  return note;
}

function validNotificationId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}
function validOffset(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 &&
    value <= 1_000_000 && value % 10 === 0;
}
function validTimestamp(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) &&
    Number.isFinite(Date.parse(value));
}

export function sanitizeFollowUpJournal(value: unknown): LocalFollowUpJournal {
  const source = object(value);
  if (source?.version !== 1) return emptyJournal();
  const entries: LocalFollowUpEntry[] = [];
  const seenIds = new Set<number>();
  const perNotification = new Map<number, number>();
  for (const raw of Array.isArray(source.entries) ? source.entries.slice(0, 200) : []) {
    const item = object(raw);
    if (!item || !validNotificationId(item.id) || seenIds.has(item.id) ||
      !validNotificationId(item.notificationId) || !validOffset(item.pageOffset) ||
      !outcomes.includes(item.outcome as LocalFollowUpOutcome) || !validTimestamp(item.recordedAt)) continue;
    const note = safeFollowUpNote(item.note);
    if (!note || (perNotification.get(item.notificationId) ?? 0) >= MAX_FOLLOW_UP_PER_NOTIFICATION) continue;
    entries.push({ id: item.id, notificationId: item.notificationId, pageOffset: item.pageOffset,
      outcome: item.outcome as LocalFollowUpOutcome, note, recordedAt: item.recordedAt });
    seenIds.add(item.id);
    perNotification.set(item.notificationId, (perNotification.get(item.notificationId) ?? 0) + 1);
    if (entries.length === MAX_FOLLOW_UP_ENTRIES) break;
  }
  return { version: 1, entries };
}

function storageKey(accountId: number): string | null {
  return validNotificationId(accountId) ? `rosevear-ai-hub:local-follow-up:v1:${accountId}` : null;
}
export function loadFollowUpJournal(storage: Storage | null, accountId: number): LocalFollowUpJournal {
  const key = storageKey(accountId);
  if (!key || !storage) return emptyJournal();
  try { return sanitizeFollowUpJournal(JSON.parse(storage.getItem(key) ?? "null")); }
  catch { return emptyJournal(); }
}
export function saveFollowUpJournal(storage: Storage | null, accountId: number, journal: LocalFollowUpJournal): boolean {
  const key = storageKey(accountId);
  if (!key || !storage) return false;
  try { storage.setItem(key, JSON.stringify(sanitizeFollowUpJournal(journal))); return true; }
  catch { return false; }
}

export function appendFollowUpEntry(journal: LocalFollowUpJournal, input: {
  notificationId: number; pageOffset: number; outcome: LocalFollowUpOutcome; note: string; recordedAt: string;
}): LocalFollowUpJournal | null {
  const note = safeFollowUpNote(input.note);
  if (!validNotificationId(input.notificationId) || !validOffset(input.pageOffset) || !note ||
      !outcomes.includes(input.outcome) || !validTimestamp(input.recordedAt) ||
      journal.entries.length >= MAX_FOLLOW_UP_ENTRIES ||
      journal.entries.filter(entry => entry.notificationId === input.notificationId).length >= MAX_FOLLOW_UP_PER_NOTIFICATION) return null;
  const nextId = Math.max(0, ...journal.entries.map(entry => entry.id)) + 1;
  return { version: 1, entries: [...journal.entries, { id: nextId, ...input, note }] };
}

export function followUpOutcomeLabel(outcome: LocalFollowUpOutcome): string {
  return ({ needs_review: "Needs review", investigating: "Investigating", follow_up: "Follow-up needed",
    reviewed_locally: "Reviewed locally (not resolved)" })[outcome];
}
