import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  clearHomeLayout, defaultHomeLayout, loadHomeLayout, moveHomeWidget,
  parseHomeLayout, saveHomeLayout, toggleHomeWidget,
} from "./homeLayoutPreference";

describe("Build 273 per-account Home layout preferences", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

  test("starts with every optional widget visible in the established order", () => {
    expect(defaultHomeLayout()).toEqual({ version: 1, order: ["guide", "operations", "shortcuts"], hidden: [] });
    expect(loadHomeLayout(1)).toEqual(defaultHomeLayout());
  });

  test("moves widgets only within bounds and never duplicates or loses one", () => {
    const initial = defaultHomeLayout();
    expect(moveHomeWidget(initial, "guide", -1)).toBe(initial);
    expect(moveHomeWidget(initial, "shortcuts", 1)).toBe(initial);
    const changed = moveHomeWidget(initial, "operations", -1);
    expect(changed.order).toEqual(["operations", "guide", "shortcuts"]);
    expect(initial.order).toEqual(["guide", "operations", "shortcuts"]);
  });

  test("toggles visibility and restores the widget without altering order", () => {
    const hidden = toggleHomeWidget(defaultHomeLayout(), "operations");
    expect(hidden.hidden).toEqual(["operations"]);
    expect(toggleHomeWidget(hidden, "operations")).toEqual(defaultHomeLayout());
  });

  test("persists separately by signed-in account and removes a preference on reset", () => {
    const changed = toggleHomeWidget(moveHomeWidget(defaultHomeLayout(), "shortcuts", -1), "guide");
    expect(saveHomeLayout(11, changed)).toBe(true);
    expect(loadHomeLayout(11)).toEqual(changed);
    expect(loadHomeLayout(12)).toEqual(defaultHomeLayout());
    expect(clearHomeLayout(11)).toBe(true);
    expect(loadHomeLayout(11)).toEqual(defaultHomeLayout());
  });

  test("rejects malformed, unknown, duplicate, oversized and incompatible persisted layouts", () => {
    for (const raw of [
      "{bad json", "null", JSON.stringify({ version: 2, order: ["guide", "operations", "shortcuts"], hidden: [] }),
      JSON.stringify({ version: 1, order: ["guide", "guide", "shortcuts"], hidden: [] }),
      JSON.stringify({ version: 1, order: ["guide", "operations", "admin"], hidden: [] }),
      JSON.stringify({ version: 1, order: ["guide", "operations", "shortcuts"], hidden: ["guide", "guide"] }),
      JSON.stringify({ version: 1, order: ["guide", "operations", "shortcuts"], hidden: ["privileged"] }),
      "x".repeat(2049),
    ]) expect(parseHomeLayout(raw)).toEqual(defaultHomeLayout());
  });

  test("fails safely for invalid account IDs and blocked browser storage", () => {
    expect(saveHomeLayout(0, defaultHomeLayout())).toBe(false);
    expect(loadHomeLayout(-1)).toEqual(defaultHomeLayout());
    expect(clearHomeLayout(Number.NaN)).toBe(false);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("storage denied"); });
    expect(saveHomeLayout(1, defaultHomeLayout())).toBe(false);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("storage denied"); });
    expect(loadHomeLayout(1)).toEqual(defaultHomeLayout());
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("storage denied"); });
    expect(clearHomeLayout(1)).toBe(false);
  });
});
