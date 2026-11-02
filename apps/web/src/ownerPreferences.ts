import type { ShellDensity, ShellTheme } from "./CommandShell";

export type SavedOwnerView = {
  name: string;
  density: ShellDensity;
  theme: ShellTheme;
  startSection: "Home" | "System" | "Devices" | "Cameras" | "Workshop" | "Search & Help";
};

export type OwnerPreferenceDocument = {
  schemaVersion: 1;
  ownerId: number;
  views: SavedOwnerView[];
};

export const EMPTY_OWNER_VIEWS = (ownerId: number): OwnerPreferenceDocument => ({ schemaVersion: 1, ownerId, views: [] });
export const ownerPreferenceKey = (ownerId: number) => `rosevear-hub-owner-display-v1-${ownerId}`;
const sections = ["Home", "System", "Devices", "Cameras", "Workshop", "Search & Help"] as const;
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));

/** Reject unrecognized, sensitive or future-schema fields; never deserialize arbitrary acceptance state. */
export function parseOwnerPreferences(raw: string, ownerId: number): OwnerPreferenceDocument {
  if (raw.length > 16_384) throw new Error("Preferences file exceeds 16 KB.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Invalid preferences JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid preferences document.");
  const doc = value as Record<string, unknown>;
  if (!exactKeys(doc, ["schemaVersion", "ownerId", "views"]) || doc.schemaVersion !== 1) {
    throw new Error("Unsupported preferences schema or unexpected fields.");
  }
  if (doc.ownerId !== ownerId) throw new Error("Preferences belong to another owner account.");
  if (!Array.isArray(doc.views) || doc.views.length > 12) throw new Error("Too many saved views.");
  const names = new Set<string>();
  for (const view of doc.views) {
    if (!view || typeof view !== "object" || Array.isArray(view)) throw new Error("Invalid saved view.");
    const item = view as Record<string, unknown>;
    if (!exactKeys(item, ["name", "density", "theme", "startSection"]) ||
      typeof item.name !== "string" || item.name.trim().length < 1 || item.name.length > 48 ||
      !["comfortable", "compact"].includes(String(item.density)) ||
      !["standard", "high-contrast"].includes(String(item.theme)) ||
      !sections.includes(item.startSection as typeof sections[number])) {
      throw new Error("Saved view includes unsupported values.");
    }
    const normalized = item.name.trim().toLocaleLowerCase();
    if (names.has(normalized)) throw new Error("Duplicate saved view names.");
    names.add(normalized);
  }
  return value as OwnerPreferenceDocument;
}

export function saveOwnerView(doc: OwnerPreferenceDocument, view: SavedOwnerView): OwnerPreferenceDocument {
  const filtered = doc.views.filter(item => item.name.toLocaleLowerCase() !== view.name.toLocaleLowerCase());
  return parseOwnerPreferences(JSON.stringify({ ...doc, views: [...filtered, view] }), doc.ownerId);
}
