import { afterEach, describe, expect, it, vi } from "vitest";
import {
  defaultApiBaseForHostname,
  getOllamaModels,
  getUsers,
  HUB_AUTH_REQUIRED_EVENT,
  login,
} from "./api";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("Hub session origin and 401 propagation", () => {
  it("uses the exact browser origin through Vite, not a different loopback host", () => {
    expect(defaultApiBaseForHostname("127.0.0.1")).toBe("");
    expect(defaultApiBaseForHostname("localhost")).toBe("");
    expect(defaultApiBaseForHostname("tauri.localhost")).toBe("http://127.0.0.1:8765");
    expect(defaultApiBaseForHostname("household.example")).toBe("");
  });

  it("reports session rejection once for any protected read", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false, status: 401,
      json: async () => ({ detail: "Authentication required." }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const listener = vi.fn();
    window.addEventListener(HUB_AUTH_REQUIRED_EVENT, listener);
    try {
      await expect(getOllamaModels()).rejects.toThrow("401");
      await expect(getUsers()).rejects.toThrow("Authentication required");
      expect(listener).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/models/ollama/models");
      expect(fetchMock.mock.calls[1][0]).toBe("/api/v1/auth/users");
    } finally {
      window.removeEventListener(HUB_AUTH_REQUIRED_EVENT, listener);
    }
  });

  it("does not treat an incorrect login password as an expired signed-in session", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, status: 401, json: async () => ({ detail: "Invalid username or password." }),
    }));
    const listener = vi.fn();
    window.addEventListener(HUB_AUTH_REQUIRED_EVENT, listener);
    try {
      await expect(login("owner", "incorrect-password")).rejects.toThrow("Invalid username or password");
      expect(listener).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener(HUB_AUTH_REQUIRED_EVENT, listener);
    }
  });
});
