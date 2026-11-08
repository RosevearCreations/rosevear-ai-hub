/** Build 273: browser-only, per-account Home widget layout (never an access grant). */
export const HOME_WIDGET_IDS = ["guide", "operations", "shortcuts"] as const;
export type HomeWidgetId = (typeof HOME_WIDGET_IDS)[number];
export type HomeLayout = {
  version: 1;
  order: HomeWidgetId[];
  hidden: HomeWidgetId[];
};

const KEY_PREFIX = "rosevear-ai-hub.home-layout.v1.user.";

export function defaultHomeLayout(): HomeLayout {
  return { version: 1, order: [...HOME_WIDGET_IDS], hidden: [] };
}

function isHomeWidgetId(value: unknown): value is HomeWidgetId {
  return typeof value === "string" && HOME_WIDGET_IDS.some(id => id === value);
}

export function parseHomeLayout(raw: string | null): HomeLayout {
  if (!raw || raw.length > 2048) return defaultHomeLayout();
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return defaultHomeLayout();
    const candidate = value as Record<string, unknown>;
    if (candidate.version !== 1 || !Array.isArray(candidate.order) || !Array.isArray(candidate.hidden)) {
      return defaultHomeLayout();
    }
    const order: unknown[] = candidate.order;
    const hidden: unknown[] = candidate.hidden;
    if (order.length !== HOME_WIDGET_IDS.length || !order.every(isHomeWidgetId) ||
      new Set(order).size !== HOME_WIDGET_IDS.length || !hidden.every(isHomeWidgetId) ||
      new Set(hidden).size !== hidden.length) return defaultHomeLayout();
    return { version: 1, order: [...order] as HomeWidgetId[], hidden: [...hidden] as HomeWidgetId[] };
  } catch {
    return defaultHomeLayout();
  }
}

export function moveHomeWidget(layout: HomeLayout, id: HomeWidgetId, direction: -1 | 1): HomeLayout {
  const index = layout.order.indexOf(id);
  const destination = index + direction;
  if (index < 0 || destination < 0 || destination >= layout.order.length) return layout;
  const order = [...layout.order];
  [order[index], order[destination]] = [order[destination], order[index]];
  return { ...layout, order };
}

export function toggleHomeWidget(layout: HomeLayout, id: HomeWidgetId): HomeLayout {
  return { ...layout, hidden: layout.hidden.includes(id)
    ? layout.hidden.filter(item => item !== id)
    : [...layout.hidden, id] };
}

function homeLayoutStorageKey(accountId: number): string | null {
  return Number.isSafeInteger(accountId) && accountId > 0 ? `${KEY_PREFIX}${accountId}` : null;
}

export function loadHomeLayout(accountId: number): HomeLayout {
  const key = homeLayoutStorageKey(accountId);
  if (!key) return defaultHomeLayout();
  try { return parseHomeLayout(localStorage.getItem(key)); } catch { return defaultHomeLayout(); }
}

export function saveHomeLayout(accountId: number, layout: HomeLayout): boolean {
  const key = homeLayoutStorageKey(accountId);
  if (!key) return false;
  try {
    localStorage.setItem(key, JSON.stringify(layout));
    return true;
  } catch { return false; }
}

export function clearHomeLayout(accountId: number): boolean {
  const key = homeLayoutStorageKey(accountId);
  if (!key) return false;
  try { localStorage.removeItem(key); return true; } catch { return false; }
}
