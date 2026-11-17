import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { MASTER_THEME_CHOICES, parseShellTheme } from "./shellThemePreference";
import { EMPTY_OWNER_VIEWS, parseOwnerPreferences, saveOwnerView } from "./ownerPreferences";

type Palette = {
  id: string; label: string; background: string; surface: string; panel: string;
  text: string; accent: string; muted: string;
};
const manifest = JSON.parse(
  readFileSync(new URL("../../../.github/rosevear-master-themes.v2.json", import.meta.url), "utf8"),
) as { themeIds: string[]; themes: Palette[]; build359Extension: { sharedThemeCount: number; newThemeIds: string[] } };
const css = readFileSync(new URL("./masterThemes467.css", import.meta.url), "utf8");
const expectedNew = ["aurora", "amber-night", "orchid", "daylight"];

function luminance(hex: string): number {
  const rgb = [1, 3, 5].map(at => parseInt(hex.slice(at, at + 2), 16) / 255).map(v =>
    v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
function contrast(a: string, b: string): number {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe("QL-468 four extra Master themes with consistent controls", () => {
  it("retains the original 12 and extends the shared catalogue to exactly 16", () => {
    expect(manifest.build359Extension.sharedThemeCount).toBe(16);
    expect(manifest.build359Extension.newThemeIds).toEqual(expectedNew);
    expect(manifest.themeIds).toHaveLength(16);
    expect(new Set(manifest.themeIds).size).toBe(16);
    expect(MASTER_THEME_CHOICES.map(theme => theme.id)).toEqual(manifest.themeIds);
    for (const id of expectedNew) {
      expect(parseShellTheme(id)).toBe(id);
      expect(css).toContain('data-theme="' + id + '"');
    }
  });
  it("keeps readable text/surface contrast and valid accent codes", () => {
    for (const palette of manifest.themes) {
      expect(contrast(palette.text, palette.panel), palette.id).toBeGreaterThanOrEqual(4.5);
      expect(palette.accent).toMatch(/^#[0-9a-f]{6}$/i);
    }
    expect(css).toContain('color-scheme:light');
    expect(css).toContain('input[type="date"]');
    expect(css).toContain('min-height:46px');
    expect(css).toContain('overflow-wrap:anywhere');
  });
  it("lets owner save and re-import all new themes without an acceptance authority grant", () => {
    for (const theme of expectedNew) {
      const saved = saveOwnerView(EMPTY_OWNER_VIEWS(42), {
        name: "Safe " + theme, density: "comfortable",
        theme: parseShellTheme(theme), startSection: "System",
      });
      expect(parseOwnerPreferences(JSON.stringify(saved), 42).views[0].theme).toBe(theme);
    }
    expect(() => parseOwnerPreferences(JSON.stringify({
      schemaVersion: 1, ownerId: 42,
      views: [{ name: "wrong", density: "compact", theme: "untrusted", startSection: "System" }],
    }), 42)).toThrow();
  });
});
