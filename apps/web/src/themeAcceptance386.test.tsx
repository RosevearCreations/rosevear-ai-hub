import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { ThemeAcceptance386Panel } from "./ThemeAcceptance386Panel";
import {
  THEME_PALETTES386, THEME_CHECKS386, VIEWPORTS386, contrastRatio386,
  initialMatrix386, matrixDisposition386, matrixKey386, recordOwnerTheme386,
  themeContrast386,
} from "./themeAcceptance386";
import { MASTER_THEME_CHOICES, parseShellTheme } from "./shellThemePreference";

afterEach(() => cleanup());

type Manifest386 = {
  scope: string;
  themeIds: string[];
  themes: {
    id: string; label: string; background: string; surface: string;
    panel: string; text: string; accent: string; muted: string;
  }[];
};

const manifest = JSON.parse(readFileSync(
  resolve(process.cwd(), "../../.github/rosevear-master-themes.v2.json"),
  "utf8",
)) as Manifest386;
const main = readFileSync(resolve(process.cwd(), "src/main.tsx"), "utf8");
const css = readFileSync(resolve(process.cwd(), "src/themeAccessibility386.css"), "utf8");
const canonical = readFileSync(resolve(process.cwd(), "src/masterThemes467.css"), "utf8");

describe("Build386 shared 16-theme source contract", () => {
  it("uses the exact Master manifest, labels and token values with no new signer", () => {
    expect(manifest.scope).toBe("three-independent-masters");
    expect(THEME_PALETTES386).toEqual(manifest.themes);
    expect(THEME_PALETTES386).toHaveLength(16);
    expect(THEME_PALETTES386.map(t => t.id)).toEqual(manifest.themeIds);
    expect(MASTER_THEME_CHOICES.map(t => t.id)).toEqual(manifest.themeIds);
    expect(new Set(manifest.themeIds).size).toBe(16);
    for (const theme of THEME_PALETTES386) {
      expect(parseShellTheme(theme.id)).toBe(theme.id);
      expect(canonical).toContain(`data-theme="${theme.id}"`);
    }
    expect(main).toContain('import "./themeAccessibility386.css"');
  });

  it("enforces >=4.5 text and >=3 visible focus boundary ratios for all sixteen palettes", () => {
    for (const p of THEME_PALETTES386) {
      const ratios = themeContrast386(p.id);
      expect(ratios.staticWcagAAContrast, p.id).toBe(true);
      expect(ratios.mainText, p.id).toBeGreaterThanOrEqual(4.5);
      expect(ratios.mutedText, p.id).toBeGreaterThanOrEqual(4.5);
      expect(ratios.surfaceText, p.id).toBeGreaterThanOrEqual(4.5);
      expect(ratios.focusBoundary, p.id).toBeGreaterThanOrEqual(3);
      expect(ratios.liveDomVisualVerified).toBe(false);
      expect(ratios.crossMasterRuntimeParityVerified).toBe(false);
      expect(contrastRatio386(p.text, p.panel)).toBe(ratios.mainText);
    }
    expect(() => contrastRatio386("red", "#ffffff")).toThrow("HOLD_INVALID_THEME_COLOUR");
  });

  it("has responsive, keyboard and form rules without forced device action", () => {
    for (const rule of [
      "focus-visible", "outline: 3px", "min-height: 44px", "min-height: 48px",
      "max-width: 100%", "min-width: 0", "color-scheme: light", "color-scheme: dark",
      'input[type="date"]', 'input[type="time"]', "forced-colors: active",
      "prefers-reduced-motion: reduce", "max-width: 650px", "max-width: 350px",
      "overflow-x: auto",
    ]) {
      expect(css, rule).toContain(rule);
    }
  });
});

describe("Build386 owner-only 48-case device reviews never fake acceptance", () => {
  it("requires all 16 themes times three viewports, with source authority always false", () => {
    expect(THEME_CHECKS386).toHaveLength(5);
    expect(VIEWPORTS386).toHaveLength(3);
    const initial = initialMatrix386();
    const before = matrixDisposition386(initial);
    expect(Object.keys(initial)).toHaveLength(48);
    expect(before.ownerReportedReviewed).toBe(0);
    expect(before.status).toBe("HOLD_OWNER_DEVICE_MATRIX_INCOMPLETE");
    expect(before.independentOriginalDeviceWitnessed).toBe(false);
    expect(before.integratedThreeMasterVisualParityVerified).toBe(false);
    expect(before.productionSourceAuthorityFromOwnerReports).toBe(false);
    let next = initial;
    for (const palette of THEME_PALETTES386) {
      for (const device of VIEWPORTS386) {
        next = recordOwnerTheme386(next, palette.id, device.id, "owner_reports_pass");
      }
    }
    expect(matrixDisposition386(next).status).toBe("OWNER_REPORTED_48_CHECKS_UNVERIFIED");
    expect(matrixDisposition386(next).ownerReportedReviewed).toBe(48);
    next = recordOwnerTheme386(next, "daylight", "phone", "owner_reports_issue");
    expect(matrixDisposition386(next).status).toBe("OWNER_REPORTED_THEME_ISSUES_OPEN");
    expect(matrixDisposition386(next).ownerReportedIssues).toBe(1);
    expect(initial[matrixKey386("daylight", "phone")]).toBe("not_checked");
    expect(() => matrixKey386("not-a-theme" as never, "phone")).toThrow();
    expect(() => recordOwnerTheme386(next, "daylight", "desktop", "certified" as never)).toThrow();
  });

  it("renders labelled native controls, changes shell palette only on explicit click", () => {
    const apply = vi.fn();
    render(<ThemeAcceptance386Panel activeTheme="dark" onApplyTheme={apply} />);
    const region = screen.getByRole("region", { name: "Responsive theme sample viewport" });
    expect(screen.getByRole("heading", { name: "Shared 16-theme accessibility workshop" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("0/48");
    expect(screen.getAllByRole("button", { name: /^Preview / })).toHaveLength(16);
    expect(within(region).getByLabelText("Native date")).toHaveAttribute("type", "date");
    expect(within(region).getByLabelText("Native time")).toHaveAttribute("type", "time");
    expect(within(region).getByLabelText("Long field value / label alignment")).toHaveAttribute("maxlength", "180");
    expect(within(region).getByLabelText("Select menu")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Preview Daylight Control" }));
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Apply Daylight Control to the actual Hub shell" }));
    expect(apply).toHaveBeenCalledWith("daylight");
    fireEvent.click(screen.getByRole("button", { name: "Show validation example" }));
    expect(within(region).getByRole("alert")).toHaveTextContent("Sample validation failure");
    expect(within(region).getByLabelText("Validation visibility sample")).toHaveAttribute("aria-invalid", "true");
  });

  it("records an issue and clears it without signing off original device", () => {
    render(<ThemeAcceptance386Panel activeTheme="dark" onApplyTheme={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Report issue requiring follow-up" }));
    expect(screen.getByRole("status")).toHaveTextContent("1/48");
    expect(screen.getByRole("status")).toHaveTextContent("1 owner-reported issues");
    fireEvent.click(screen.getByRole("button", { name: "Clear this local report" }));
    expect(screen.getByRole("status")).toHaveTextContent("0/48");
    expect(screen.getByText(/Field certification remains HOLD/)).toBeInTheDocument();
  });
});
