import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Use a single browser origin for the UI and authenticated API. This avoids
// localhost-vs-127.0.0.1 SameSite cookie loss and removes cross-origin session
// requests during local development. The target remains loopback only.
export default defineConfig({
  plugins: [react()],
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
  },
});
