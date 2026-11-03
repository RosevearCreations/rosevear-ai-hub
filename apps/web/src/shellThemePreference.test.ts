import { afterEach, describe, expect, it } from "vitest";
import { loadShellTheme, parseShellTheme, saveShellTheme, SHELL_THEME_STORAGE_KEY } from "./shellThemePreference";

afterEach(() => localStorage.removeItem(SHELL_THEME_STORAGE_KEY));

describe("Build 232 explicit low-glare Dark Mode preference", () => {
  it("defaults safely to dark for absent or unknown values without revealing private state", () => {
    expect(parseShellTheme(null)).toBe("dark");
    expect(parseShellTheme("unknown")).toBe("dark");
    expect(parseShellTheme("light")).toBe("dark");
    expect(loadShellTheme()).toBe("dark");
  });

  it("remembers only recognized display themes and allows High contrast to stay selectable", () => {
    saveShellTheme("dark");
    expect(localStorage.getItem(SHELL_THEME_STORAGE_KEY)).toBe("dark");
    saveShellTheme("high-contrast");
    expect(loadShellTheme()).toBe("high-contrast");
    saveShellTheme("standard");
    expect(loadShellTheme()).toBe("standard");
    expect(Object.keys(localStorage)).not.toContain("password");
  });
});
