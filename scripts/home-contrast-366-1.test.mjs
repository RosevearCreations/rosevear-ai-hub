import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync("apps/web/src/homeContrast366Hotfix.css", "utf8");
const entry = readFileSync("apps/web/src/main.tsx", "utf8");
const skin = '.app-shell[data-theme]:not([data-theme="daylight"]):not([data-theme="high-contrast"]) .content .home-operations-hub';

test("dark Home Operations surface is applied after legacy styles", () => {
  assert.ok(entry.includes('import "./modern2026.css";\nimport "./homeContrast366Hotfix.css";'));
  assert.ok(css.includes(skin));
  assert.match(css, /background: var\(--home-surface\) !important/);
  assert.match(css, /color: var\(--home-ink\) !important/);
  assert.ok(css.includes('var(--m-panel, var(--shell-paper, #101826))'));
});

test("all user-visible home headings, controls and nested surfaces remain readable", () => {
  for (const selector of [
    ".home-ops-heading h3", ".home-ops-routes h4", ".home-ops-room-toolbar label",
    ".home-ops-health-card", ".home-ops-observation", ".home-ops-contexts button",
    ".home-ops-room-toolbar select", ".home-ops-help", ".home-ops-room-grid article",
    ".home-ops-footnote", ":focus-visible",
  ]) {
    assert.ok(css.includes(selector), `Missing dark Home Operations coverage: ${selector}`);
  }
  assert.match(css, /background: var\(--home-raised\) !important/);
});

test("Daylight and High Contrast opt out of the dark surface", () => {
  assert.ok(skin.includes(':not([data-theme="daylight"])'));
  assert.ok(skin.includes(':not([data-theme="high-contrast"])'));
  assert.ok(css.includes("@media (forced-colors: active)"));
  assert.doesNotMatch(css, /(?:Stop-Process|Remove-NetFirewallRule|startvm|Restart-Computer)/i);
});
