import { useEffect, useState } from "react";
import {
  loadWorkspaceShortcuts, MAX_PINNED_WORKSPACES, saveWorkspaceShortcuts,
  sanitizeWorkspaceShortcuts, toggleWorkspacePin, visitWorkspace,
  type WorkspaceShortcuts,
} from "./workspaceShortcutModel";

type Props = {
  userId: number;
  sections: readonly string[];
  current: string;
  onNavigate: (section: string) => void;
};

function localStorageOrNull(): Storage | null {
  try { return window.localStorage; } catch { return null; }
}

/** Navigation-only shortcuts. Never stores records, search text, credentials or permissions. */
export function WorkspaceQuickAccess({ userId, sections, current, onNavigate }: Props) {
  const allowedKey = sections.join("\0");
  const [shortcuts, setShortcuts] = useState<WorkspaceShortcuts>(() =>
    loadWorkspaceShortcuts(localStorageOrNull(), userId, sections));
  const safe = sanitizeWorkspaceShortcuts({ version: 1, ...shortcuts }, sections);
  const pinned = safe.pinned.includes(current);
  const pinLimit = safe.pinned.length >= MAX_PINNED_WORKSPACES && !pinned;

  useEffect(() => {
    setShortcuts(previous => visitWorkspace(previous, current, sections));
    // Each role change is represented by allowedKey, not an unstable array reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, allowedKey, userId]);

  useEffect(() => {
    saveWorkspaceShortcuts(localStorageOrNull(), userId, shortcuts, sections);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortcuts, allowedKey, userId]);

  return <section className="workspace-quick-access" aria-labelledby="workspace-shortcuts-heading">
    <div className="workspace-shortcuts-heading">
      <strong id="workspace-shortcuts-heading">My quick access</strong>
      <span>Only this account</span>
    </div>
    <button type="button" className="workspace-pin-button" aria-pressed={pinned}
      disabled={pinLimit} onClick={() => setShortcuts(value => toggleWorkspacePin(value, current, sections))}>
      <span aria-hidden="true">{pinned ? "★" : "☆"}</span>
      {pinned ? `Unpin ${current}` : `Pin ${current}`}
    </button>
    {pinLimit && <p className="workspace-shortcuts-help">Six screens pinned. Unpin one to make room.</p>}
    {safe.pinned.length > 0 && <nav aria-label="Pinned workspaces">
      <span className="workspace-shortcuts-label">Pinned</span>
      <div className="workspace-shortcuts-list">{safe.pinned.map(section => <button key={section}
        type="button" aria-label={`Open pinned ${section}`} aria-current={section === current ? "page" : undefined}
        onClick={() => onNavigate(section)}>{section}</button>)}</div>
    </nav>}
    <nav aria-label="Recent workspaces">
      <span className="workspace-shortcuts-label">Recent</span>
      <div className="workspace-shortcuts-list">{safe.recent.map(section => <button key={section}
        type="button" aria-label={`Open recent ${section}`} aria-current={section === current ? "page" : undefined}
        onClick={() => onNavigate(section)}>{section}</button>)}</div>
    </nav>
    {(safe.pinned.length > 0 || safe.recent.length > 1) && <button type="button"
      className="workspace-shortcuts-clear" onClick={() => setShortcuts({ pinned: [], recent: [] })}>
      Clear my shortcuts
    </button>}
  </section>;
}
