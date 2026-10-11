import { describe, expect, it } from "vitest";

import { defaultApiBaseForHostname } from "./api";
import { remoteConnectionMode } from "./RemoteAccessPanel";

describe("Build 046 Tailscale private same-origin access", () => {
  it("retains the existing local-only API for Vite and Tauri", () => {
    for (const host of ["127.0.0.1", "localhost", "tauri.localhost"]) {
      expect(defaultApiBaseForHostname(host)).toBe("http://127.0.0.1:8765");
    }
  });

  it("never directs a remote browser to its own localhost", () => {
    expect(defaultApiBaseForHostname("rosevear-hub.example.ts.net")).toBe("");
    expect(defaultApiBaseForHostname("192.168.68.78")).toBe("");
  });

  it("does not treat public pages or insecure LAN HTTP as trusted tailnet URLs", () => {
    expect(remoteConnectionMode("https://home.example.ts.net")).toBe(
      "private-tailnet-https",
    );
    expect(remoteConnectionMode("https://example.com")).toBe("unsupported");
    expect(remoteConnectionMode("http://home.example.ts.net")).toBe("unsupported");
    expect(remoteConnectionMode("http://192.168.68.78:5173")).toBe("unsupported");
    expect(remoteConnectionMode("http://127.0.0.1:5173")).toBe("local");
  });
});
