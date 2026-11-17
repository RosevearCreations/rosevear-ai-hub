import type { ShellTheme } from "./CommandShell";

/** Display-only preference; never stores account, auth or device information. */
export const SHELL_THEME_STORAGE_KEY = "rosevear-hub-shell-theme-v1";

export const MASTER_THEME_CHOICES: readonly {id:ShellTheme;label:string}[] = [
  {id:"instrument",label:"Master Instrument"},
  {id:"nebula",label:"Nebula Purple"},
  {id:"meadow",label:"Meadow"},
  {id:"high-contrast",label:"High Contrast"},
  {id:"copper",label:"Copper Workshop"},
  {id:"arctic",label:"Arctic Blue"},
  {id:"solar",label:"Solar Gold"},
  {id:"graphite",label:"Graphite Cyan"}
];

export function parseShellTheme(value: string | null): ShellTheme {
  return (MASTER_THEME_CHOICES.some((item) => item.id === value) || value === "standard" || value === "dark") ? value as ShellTheme : "dark";
}

export function loadShellTheme(): ShellTheme {
  try { return parseShellTheme(localStorage.getItem(SHELL_THEME_STORAGE_KEY)); }
  catch { return "dark"; }
}

export function saveShellTheme(theme: ShellTheme): void {
  try { localStorage.setItem(SHELL_THEME_STORAGE_KEY, theme); }
  catch { /* Unavailable storage must never prevent choosing a theme for this session. */ }
}
