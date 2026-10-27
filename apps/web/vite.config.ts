import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Capture the checkout used to compile these exact browser assets. This is a
// source fingerprint, NOT proof that a Windows service or PWA was updated.
const root = fileURLToPath(new URL("../../", import.meta.url));
function gitOutput(...args: string[]): string | null {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", timeout: 4000, maxBuffer: 8192 }).trim();
  } catch { return null; }
}
const sourceSha = gitOutput("rev-parse", "HEAD");
const validSha = sourceSha && /^[0-9a-f]{40}$/.test(sourceSha) ? sourceSha : null;
const trackedChanges = gitOutput("status", "--porcelain", "--untracked-files=no");
const sourceClean = validSha !== null && trackedChanges === "";

// Use a single browser origin for the UI and authenticated API. This avoids
// localhost-vs-127.0.0.1 SameSite cookie loss and removes cross-origin session
// requests during local development. The target remains loopback only.
export default defineConfig({
  plugins: [react()],
  define: {
    __HUB_WEB_BUILD_SHA__: JSON.stringify(validSha),
    __HUB_WEB_BUILD_CLEAN__: JSON.stringify(sourceClean),
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": { target: "http://127.0.0.1:8765", changeOrigin: false },
      "/health": { target: "http://127.0.0.1:8765", changeOrigin: false },
      "/version": { target: "http://127.0.0.1:8765", changeOrigin: false },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    // Integration screens render the entire owner history; allow slower shared CI runners
    // to finish assertions without treating CPU contention as an application failure.
    testTimeout: 15_000,
  },
});
