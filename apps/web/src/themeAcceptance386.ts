/** Build 386: exact 16-theme read-only presentation catalogue from shared Master manifest.
 * Static palette parity tests deliberately fail if the three-Master contract changes.
 * Owner observations here are not remotely witnessed field certification.
 */
export const THEME_PALETTES386 = [
  {
    "id": "instrument",
    "label": "Master Instrument",
    "background": "#050b16",
    "surface": "#081625",
    "panel": "#0b1c2d",
    "text": "#eef6ff",
    "accent": "#9a46ff",
    "muted": "#b4c5d7"
  },
  {
    "id": "nebula",
    "label": "Nebula Purple",
    "background": "#130923",
    "surface": "#211134",
    "panel": "#281848",
    "text": "#f9eeff",
    "accent": "#d27dfd",
    "muted": "#e2c7f8"
  },
  {
    "id": "meadow",
    "label": "Meadow",
    "background": "#061b1b",
    "surface": "#113a36",
    "panel": "#17493f",
    "text": "#e8fff5",
    "accent": "#66ddb4",
    "muted": "#b9e2d4"
  },
  {
    "id": "high-contrast",
    "label": "High Contrast",
    "background": "#030303",
    "surface": "#111111",
    "panel": "#1d1d1d",
    "text": "#ffffff",
    "accent": "#ffdd55",
    "muted": "#f3f3f3"
  },
  {
    "id": "copper",
    "label": "Copper Workshop",
    "background": "#181018",
    "surface": "#2b1c1a",
    "panel": "#362624",
    "text": "#fff3e9",
    "accent": "#f6b46d",
    "muted": "#ead2c5"
  },
  {
    "id": "arctic",
    "label": "Arctic Blue",
    "background": "#071b30",
    "surface": "#0d3450",
    "panel": "#154461",
    "text": "#edfbff",
    "accent": "#78dcff",
    "muted": "#c6ecf8"
  },
  {
    "id": "solar",
    "label": "Solar Gold",
    "background": "#201911",
    "surface": "#352819",
    "panel": "#423321",
    "text": "#fff8e5",
    "accent": "#ffcd68",
    "muted": "#ead8ac"
  },
  {
    "id": "graphite",
    "label": "Graphite Cyan",
    "background": "#0b141c",
    "surface": "#192933",
    "panel": "#203843",
    "text": "#eaf9ff",
    "accent": "#55e3e6",
    "muted": "#bfdee6"
  },
  {
    "id": "crimson",
    "label": "Crimson Forge",
    "background": "#19090d",
    "surface": "#32121a",
    "panel": "#451923",
    "text": "#fff0f3",
    "accent": "#ff6b84",
    "muted": "#efb8c3"
  },
  {
    "id": "emerald",
    "label": "Emerald Circuit",
    "background": "#061813",
    "surface": "#0c3026",
    "panel": "#104638",
    "text": "#ecfff7",
    "accent": "#4ee0a5",
    "muted": "#b8dfd0"
  },
  {
    "id": "ultraviolet",
    "label": "Ultraviolet Grid",
    "background": "#100920",
    "surface": "#22113c",
    "panel": "#321653",
    "text": "#fbf1ff",
    "accent": "#b884ff",
    "muted": "#dbc9ef"
  },
  {
    "id": "steel",
    "label": "Steel Command",
    "background": "#0c1218",
    "surface": "#18232d",
    "panel": "#23313d",
    "text": "#f1f7fb",
    "accent": "#8fc7e8",
    "muted": "#c0d0dc"
  },
  {
    "id": "aurora",
    "label": "Aurora Signal",
    "background": "#061c28",
    "surface": "#123749",
    "panel": "#194b5c",
    "text": "#eafcff",
    "accent": "#60e8df",
    "muted": "#b5e2e9"
  },
  {
    "id": "amber-night",
    "label": "Amber Night",
    "background": "#21150e",
    "surface": "#352417",
    "panel": "#4a3020",
    "text": "#fff5e6",
    "accent": "#ffc274",
    "muted": "#ecd3b5"
  },
  {
    "id": "orchid",
    "label": "Orchid Circuit",
    "background": "#170d23",
    "surface": "#291838",
    "panel": "#3a264e",
    "text": "#fff3ff",
    "accent": "#eea4ff",
    "muted": "#e1c3ed"
  },
  {
    "id": "daylight",
    "label": "Daylight Control",
    "background": "#edf4fd",
    "surface": "#ffffff",
    "panel": "#dce9f8",
    "text": "#142d48",
    "accent": "#005bb5",
    "muted": "#415a76"
  }
] as const;

export type ThemeId386 = typeof THEME_PALETTES386[number]["id"];
export const VIEWPORTS386 = [
  { id: "desktop", label: "Desktop · 1440px" },
  { id: "tablet", label: "Tablet · 768px" },
  { id: "phone", label: "Phone · 375px" },
] as const;
export type Viewport386 = typeof VIEWPORTS386[number]["id"];
export type OwnerFinding386 = "not_checked" | "owner_reports_pass" | "owner_reports_issue";
export type Matrix386 = Record<string, OwnerFinding386>;

export const THEME_CHECKS386 = [
  "Text, muted text and button contrast on all surfaces",
  "Labels, long text inputs, validation and error messages",
  "Native date, time and select field visibility and usability",
  "Tab, Shift+Tab, Enter, Escape and clearly visible keyboard focus",
  "No horizontal clipping at 200% zoom and the selected device width",
] as const;

const hex386 = /^#[0-9a-f]{6}$/i;

function luminance386(value: string): number {
  if (!hex386.test(value)) throw new Error("HOLD_INVALID_THEME_COLOUR");
  const linear = [1, 3, 5]
    .map(index => parseInt(value.slice(index, index + 2), 16) / 255)
    .map(channel => channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

export function contrastRatio386(foreground: string, background: string): number {
  const [bright, dim] = [luminance386(foreground), luminance386(background)]
    .sort((a, b) => b - a);
  return (bright + 0.05) / (dim + 0.05);
}

export function themeContrast386(id: ThemeId386) {
  const theme = THEME_PALETTES386.find(item => item.id === id);
  if (!theme) throw new Error("HOLD_UNKNOWN_SHARED_THEME");
  return {
    mainText: contrastRatio386(theme.text, theme.panel),
    mutedText: contrastRatio386(theme.muted, theme.panel),
    surfaceText: contrastRatio386(theme.text, theme.surface),
    focusBoundary: contrastRatio386(theme.accent, theme.panel),
    staticWcagAAContrast:
      contrastRatio386(theme.text, theme.panel) >= 4.5 &&
      contrastRatio386(theme.muted, theme.panel) >= 4.5 &&
      contrastRatio386(theme.text, theme.surface) >= 4.5 &&
      contrastRatio386(theme.accent, theme.panel) >= 3,
    liveDomVisualVerified: false as const,
    crossMasterRuntimeParityVerified: false as const,
  };
}

export function matrixKey386(theme: ThemeId386, viewport: Viewport386): string {
  if (!THEME_PALETTES386.some(item => item.id === theme) ||
      !VIEWPORTS386.some(item => item.id === viewport)) {
    throw new Error("HOLD_UNKNOWN_THEME_OR_DEVICE");
  }
  return theme + "|" + viewport;
}

export function initialMatrix386(): Matrix386 {
  return Object.fromEntries(
    THEME_PALETTES386.flatMap(theme =>
      VIEWPORTS386.map(viewport => [matrixKey386(theme.id, viewport.id), "not_checked"])),
  );
}

export function recordOwnerTheme386(
  current: Matrix386, theme: ThemeId386,
  viewport: Viewport386, finding: OwnerFinding386,
): Matrix386 {
  if (!["not_checked", "owner_reports_pass", "owner_reports_issue"].includes(finding)) {
    throw new Error("HOLD_INVALID_OWNER_THEME_REPORT");
  }
  return { ...current, [matrixKey386(theme, viewport)]: finding };
}

export function matrixDisposition386(matrix: Matrix386) {
  const ids = THEME_PALETTES386.flatMap(theme =>
    VIEWPORTS386.map(viewport => matrixKey386(theme.id, viewport.id)));
  const statuses = ids.map(id => matrix[id] ?? "not_checked");
  const issues = statuses.filter(x => x === "owner_reports_issue").length;
  const completed = statuses.filter(x => x !== "not_checked").length;
  return {
    themeCount: THEME_PALETTES386.length,
    viewportCount: VIEWPORTS386.length,
    totalDeviceChecks: ids.length,
    ownerReportedReviewed: completed,
    ownerReportedIssues: issues,
    ownerReportedPass: completed - issues,
    status: completed !== ids.length ? "HOLD_OWNER_DEVICE_MATRIX_INCOMPLETE"
      : issues > 0 ? "OWNER_REPORTED_THEME_ISSUES_OPEN"
      : "OWNER_REPORTED_48_CHECKS_UNVERIFIED",
    independentOriginalDeviceWitnessed: false as const,
    integratedThreeMasterVisualParityVerified: false as const,
    productionSourceAuthorityFromOwnerReports: false as const,
  };
}
