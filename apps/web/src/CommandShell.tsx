import { useEffect, useRef, useState, type ReactNode } from "react";

export type ShellDensity = "comfortable" | "compact";
export type ShellTheme = "standard" | "high-contrast";

/** Only the already role-authorized sections supplied by App can be searched. */
export function filterShellSections(sections: readonly string[], query: string): string[] {
  const term = query.trim().toLocaleLowerCase();
  return sections.filter(section => section.toLocaleLowerCase().includes(term));
}

export function CommandPalette({
  open, sections, current, onOpen, onClose, onChoose,
}: {
  open: boolean;
  sections: readonly string[];
  current: string;
  onOpen: () => void;
  onClose: () => void;
  onChoose: (section: string) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const matches = filterShellSections(sections, query);

  useEffect(() => {
    function onShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k" && !event.altKey) {
        event.preventDefault();
        onOpen();
      }
    }
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [onOpen]);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    inputRef.current?.focus();
    function keyboard(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      } else if (event.key === "Tab") {
        const focusables = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]),input:not([disabled])',
        ) ?? []);
        if (focusables.length < 2) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", keyboard);
    return () => {
      window.removeEventListener("keydown", keyboard);
      previousFocus.current?.focus();
      setQuery("");
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="command-overlay" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div className="command-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="hub-command-title">
        <div className="command-dialog-header">
          <div>
            <p className="eyebrow">Navigation only</p>
            <h2 id="hub-command-title">Jump to a workspace</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close workspace search">×</button>
        </div>
        <label htmlFor="hub-command-query">Search our available screens</label>
        <input id="hub-command-query" ref={inputRef} value={query} onChange={event => setQuery(event.target.value)}
          onKeyDown={event => {
            if (event.key === "Enter" && matches[0]) {
              event.preventDefault();
              onChoose(matches[0]);
              onClose();
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              dialogRef.current?.querySelector<HTMLButtonElement>(".command-results button")?.focus();
            }
          }} placeholder="Search Home, Cameras, Workshop…" autoComplete="off" />
        <div className="command-results" aria-label="Available workspace results">
          {matches.length ? matches.map(section => (
            <button type="button" key={section} aria-current={current === section ? "page" : undefined}
              onClick={() => { onChoose(section); onClose(); }}>
              <span>{section}</span><small>{section === current ? "Current screen" : "Open screen"}</small>
            </button>
          )) : <p role="status">No available screens match that name. No permissions have changed.</p>}
        </div>
        <p className="command-help-note">Press Escape to close. This finder only navigates; it never runs actions or searches private records.</p>
      </div>
    </div>
  );
}

/** Small, keyboard-native per-card disclosure. Help never changes the associated service. */
export function CardHelp({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="card-help">
      <summary aria-label={`Help: ${title}`}><span aria-hidden="true">i</span><span className="visually-hidden">Help: {title}</span></summary>
      <div className="card-help-content"><strong>{title}</strong><p>{children}</p></div>
    </details>
  );
}
