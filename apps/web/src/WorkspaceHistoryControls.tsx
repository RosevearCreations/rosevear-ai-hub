import {
  sanitizeWorkspaceNavigationHistory, type WorkspaceNavigationHistory,
} from "./workspaceNavigationHistory";

type Props<T extends string> = {
  history: WorkspaceNavigationHistory<T>;
  allowed: readonly T[];
  onBack: () => void;
  onForward: () => void;
  onHome: () => void;
};

/** Explicit screen navigation only. These controls never call a service or replay an action. */
export function WorkspaceHistoryControls<T extends string>({ history, allowed, onBack, onForward, onHome }: Props<T>) {
  const safe = sanitizeWorkspaceNavigationHistory(history, allowed);
  const back = safe.back[safe.back.length - 1];
  const forward = safe.forward[0];
  const atHome = safe.current === "Home";

  return <nav className="workspace-history-controls" aria-label="Workspace history">
    <div className="workspace-history-actions">
      <button type="button" disabled={!back} onClick={onBack}
        aria-label={back ? `Back to ${back}` : "No previous workspace"}>
        <span aria-hidden="true">←</span> Back
      </button>
      <button type="button" disabled={!forward} onClick={onForward}
        aria-label={forward ? `Forward to ${forward}` : "No next workspace"}>
        Forward <span aria-hidden="true">→</span>
      </button>
      <button type="button" disabled={atHome} onClick={onHome} aria-label="Return to Home workspace">
        <span aria-hidden="true">⌂</span> Home
      </button>
    </div>
    <span className="workspace-history-note">This sign-in only · Screens, not actions</span>
  </nav>;
}
