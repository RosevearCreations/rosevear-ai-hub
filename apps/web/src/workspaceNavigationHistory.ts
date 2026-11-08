/** Build 271: bounded, session-only history of permitted workspace names. */
export const MAX_WORKSPACE_HISTORY = 12;

export type WorkspaceNavigationHistory<T extends string> = {
  current: T;
  back: T[];
  forward: T[];
};

export function newWorkspaceNavigationHistory<T extends string>(current: T): WorkspaceNavigationHistory<T> {
  return { current, back: [], forward: [] };
}

/** Revalidate on every transition, including after a role/permission change. */
export function sanitizeWorkspaceNavigationHistory<T extends string>(
  history: WorkspaceNavigationHistory<T>, allowed: readonly T[],
): WorkspaceNavigationHistory<T> {
  if (allowed.length === 0) throw new Error("At least one workspace must be permitted");
  const current = allowed.includes(history.current) ? history.current :
    (allowed.includes("Home" as T) ? "Home" as T : allowed[0]);
  const permitted = new Set(allowed);
  const entries = (items: unknown): T[] => Array.isArray(items)
    ? items.filter((item): item is T => typeof item === "string" && permitted.has(item as T) && item !== current)
      .slice(-MAX_WORKSPACE_HISTORY)
    : [];
  return { current, back: entries(history.back), forward: entries(history.forward) };
}

export function visitWorkspaceNavigation<T extends string>(
  history: WorkspaceNavigationHistory<T>, destination: T, allowed: readonly T[],
): WorkspaceNavigationHistory<T> {
  const safe = sanitizeWorkspaceNavigationHistory(history, allowed);
  if (!allowed.includes(destination) || destination === safe.current) return safe;
  return {
    current: destination,
    back: [...safe.back, safe.current].slice(-MAX_WORKSPACE_HISTORY),
    forward: [],
  };
}

export function backWorkspaceNavigation<T extends string>(
  history: WorkspaceNavigationHistory<T>, allowed: readonly T[],
): WorkspaceNavigationHistory<T> {
  const safe = sanitizeWorkspaceNavigationHistory(history, allowed);
  if (!safe.back.length) return safe;
  return {
    current: safe.back[safe.back.length - 1],
    back: safe.back.slice(0, -1),
    forward: [safe.current, ...safe.forward].slice(0, MAX_WORKSPACE_HISTORY),
  };
}

export function forwardWorkspaceNavigation<T extends string>(
  history: WorkspaceNavigationHistory<T>, allowed: readonly T[],
): WorkspaceNavigationHistory<T> {
  const safe = sanitizeWorkspaceNavigationHistory(history, allowed);
  if (!safe.forward.length) return safe;
  return {
    current: safe.forward[0],
    back: [...safe.back, safe.current].slice(-MAX_WORKSPACE_HISTORY),
    forward: safe.forward.slice(1),
  };
}
