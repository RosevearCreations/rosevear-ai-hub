import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const workflow = readFileSync(path.join(repositoryRoot, ".github/workflows/foundation.yml"), "utf8");
const webPackage = JSON.parse(readFileSync(path.join(repositoryRoot, "apps/web/package.json"), "utf8"));

// This is a source-level contract check, not a replacement for GitHub's
// independent event- and platform-level required check enforcement.
for (const expected of [
  "branches: [main, dev]",
  "  docs-foundation:",
  "  backend:",
  "  web:",
  "  backup-windows:",
  "  desktop-windows:",
  "run: pytest",
  "run: npm run typecheck",
  "run: npm run build",
  "run: npm run desktop:check",
  "run: npm run desktop:build",
  "run: npm run integration:ql256:witness:test",
  "run: npm run integration:ql264:hub:test",
  "run: python -m rosevear_ai_hub.disaster_recovery synthetic",
  "run: ./scripts/test-hub-release-policy.ps1",
  "scripts/inspect-hub-artifact-251.ps1",
  "scripts/inspect-hub-mapping-253.ps1",
  "if-no-files-found: error",
]) {
  assert.ok(workflow.includes(expected), `Required verification missing: ${expected}`);
}

assert.match(workflow, /on:\s*\n\s*push:\s*\n\s*branches:\s*\[main, dev\]\s*\n\s*pull_request:\s*\n\s*branches:\s*\[main, dev\]/);
assert.equal((workflow.match(/^  (?:docs-foundation|backend|web|backup-windows|desktop-windows):$/gm) ?? []).length, 5);
assert.equal((workflow.match(/run: npm run test -- --maxWorkers=1/g) ?? []).length, 1,
  "Run the complete web suite exactly once, without redundant selected spec invocations");
assert.equal(webPackage.scripts.test, "vitest run", "The full suite must discover all specs by default");
assert.doesNotMatch(workflow, /continue-on-error:\s*true|--passWithNoTests|\|\|\s*true/);
assert.ok(workflow.indexOf("run: npm run test -- --maxWorkers=1") < workflow.indexOf("run: npm run build"),
  "A successful web suite must precede production build");

console.log("Build 252: five independent CI job gates and one full web suite preserved");
