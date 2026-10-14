import { describe, expect, it } from "vitest";

import { defaultApiBaseForHostname } from "./api";
import { remoteConnectionMode } from "./RemoteAccessPanel";

describe("Build 046 Tailscale private same-origin access", () => {
  it("keeps Vite same-origin while Tauri uses its fixed loopback API", () => {
    for (const host of ["127.0.0.1", "localhost"]) {
      expect(defaultApiBaseForHostname(host)).toBe("");
    }
    expect(defaultApiBaseForHostname("tauri.localhost")).toBe("http://127.0.0.1:8765");
  });

  it("never directs a remote browser to its own localhost", () => {
    expect(defaultApiBaseForHostname("rosevear-hub.example.ts.net")).toBe("");
    expect(defaultApiBaseForHostname("192.168.68.78")).toBe("");
    expect(defaultApiBaseForHostname("192.168.2.30")).toBe("");
  });

  it("does not treat public pages or insecure LAN HTTP as trusted tailnet URLs", () => {
    expect(remoteConnectionMode("https://home.example.ts.net")).toBe(
      "private-tailnet-https",
    );
    expect(remoteConnectionMode("https://example.com")).toBe("unsupported");
    expect(remoteConnectionMode("http://home.example.ts.net")).toBe("unsupported");
    expect(remoteConnectionMode("http://192.168.68.78:5173")).toBe("unsupported");
    expect(remoteConnectionMode("https://192.168.68.78:8443")).toBe("private-lan-https");
    expect(remoteConnectionMode("https://192.168.2.30:8443")).toBe("private-lan-https");
    expect(remoteConnectionMode("https://10.0.0.4:8443")).toBe("private-lan-https");
    expect(remoteConnectionMode("https://172.31.4.5:8443")).toBe("private-lan-https");
    expect(remoteConnectionMode("https://172.32.1.5:8443")).toBe("unsupported");
    expect(remoteConnectionMode("https://169.254.9.4:8443")).toBe("unsupported");
    expect(remoteConnectionMode("https://8.8.8.8:8443")).toBe("unsupported");
    expect(remoteConnectionMode("http://127.0.0.1:5173")).toBe("local");
  });
});
