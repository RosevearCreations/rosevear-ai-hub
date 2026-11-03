import type { ShellTheme } from "./CommandShell";

/** Display-only preference; never stores account, auth or device information. */
export const SHELL_THEME_STORAGE_KEY = "rosevear-hub-shell-theme-v1";

export function parseShellTheme(value: string | null): ShellTheme {
  return value === "standard" || value === "high-contrast" || value === "dark" ? value : "dark";
}

export function loadShellTheme(): ShellTheme {
  try { return parseShellTheme(localStorage.getItem(SHELL_THEME_STORAGE_KEY)); }
  catch { return "dark"; }
}

export function saveShellTheme(theme: ShellTheme): void {
  try { localStorage.setItem(SHELL_THEME_STORAGE_KEY, theme); }
  catch { /* Unavailable storage must never prevent choosing a theme for this session. */ }
}
