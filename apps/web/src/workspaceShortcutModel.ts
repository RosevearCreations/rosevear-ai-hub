/** Build 269: screen names only, scoped to an authenticated local account. */
export const WORKSPACE_SHORTCUTS_PREFIX = "rosevear-hub:workspace-shortcuts:v1:";
export const MAX_PINNED_WORKSPACES = 6;
export const MAX_RECENT_WORKSPACES = 5;

export type WorkspaceShortcuts = {
  pinned: string[];
  recent: string[];
};

const empty = (): WorkspaceShortcuts => ({ pinned: [], recent: [] });

export function workspaceShortcutsKey(userId: number): string {
  if (!Number.isSafeInteger(userId) || userId < 1) throw new Error("Invalid local account");
  return `${WORKSPACE_SHORTCUTS_PREFIX}${userId}`;
}

function allowedNames(values: unknown, allowed: readonly string[], limit: number): string[] {
  if (!Array.isArray(values)) return [];
  const permitted = new Set(allowed);
  return [...new Set(values.filter((value): value is string =>
    typeof value === "string" && permitted.has(value)))].slice(0, limit);
}

export function sanitizeWorkspaceShortcuts(value: unknown, allowed: readonly string[]): WorkspaceShortcuts {
  if (!value || typeof value !== "object" || Array.isArray(value)) return empty();
  const candidate = value as Record<string, unknown>;
  if (candidate.version !== 1) return empty();
  return {
    pinned: allowedNames(candidate.pinned, allowed, MAX_PINNED_WORKSPACES),
    recent: allowedNames(candidate.recent, allowed, MAX_RECENT_WORKSPACES),
  };
}

export function loadWorkspaceShortcuts(
  storage: Pick<Storage, "getItem"> | null, userId: number, allowed: readonly string[],
): WorkspaceShortcuts {
  try {
    const value = storage?.getItem(workspaceShortcutsKey(userId));
    return value ? sanitizeWorkspaceShortcuts(JSON.parse(value), allowed) : empty();
  } catch {
    return empty();
  }
}

export function saveWorkspaceShortcuts(
  storage: Pick<Storage, "setItem"> | null, userId: number, value: WorkspaceShortcuts,
  allowed: readonly string[],
): void {
  try {
    const safe = sanitizeWorkspaceShortcuts({ version: 1, ...value }, allowed);
    storage?.setItem(workspaceShortcutsKey(userId), JSON.stringify({ version: 1, ...safe }));
  } catch {
    // Restricted storage and private browsing must not block navigation.
  }
}

export function visitWorkspace(
  value: WorkspaceShortcuts, current: string, allowed: readonly string[],
): WorkspaceShortcuts {
  const safe = sanitizeWorkspaceShortcuts({ version: 1, ...value }, allowed);
  if (!allowed.includes(current)) return safe;
  const recent = [current, ...safe.recent.filter(name => name !== current)]
    .slice(0, MAX_RECENT_WORKSPACES);
  if (safe.pinned.join("\0") === value.pinned.join("\0") &&
      recent.join("\0") === value.recent.join("\0")) return value;
  return { ...safe, recent };
}

export function toggleWorkspacePin(
  value: WorkspaceShortcuts, current: string, allowed: readonly string[],
): WorkspaceShortcuts {
  const safe = sanitizeWorkspaceShortcuts({ version: 1, ...value }, allowed);
  if (!allowed.includes(current)) return safe;
  if (safe.pinned.includes(current)) {
    return { ...safe, pinned: safe.pinned.filter(name => name !== current) };
  }
  if (safe.pinned.length >= MAX_PINNED_WORKSPACES) return safe;
  return { ...safe, pinned: [...safe.pinned, current] };
}
