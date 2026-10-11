import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { PwaInstallPanel, pwaConnectionNotice } from "./PwaInstallPanel";
import workerSource from "../public/sw.js?raw";
import manifestSource from "../public/manifest.webmanifest?raw";
import offlineSource from "../public/offline.html?raw";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Build 045 installable PWA", () => {
  it("ships an installable standalone manifest with the right icons", () => {
    const manifest = JSON.parse(manifestSource) as {
      display: string; start_url: string; scope: string; icons: { sizes: string; type: string }[];
    };
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.icons.map((icon) => icon.sizes)).toEqual(["192x192", "512x512"]);
    expect(manifest.icons.every((icon) => icon.type === "image/png")).toBe(true);
  });

  it("never presents private saved content while offline", () => {
    expect(offlineSource).toContain("offline mode does not show cached private conversations");
    expect(offlineSource).toContain("cannot send commands");
    expect(pwaConnectionNotice(false, true)).toContain("device controls are unavailable");
    expect(pwaConnectionNotice(true, false)).toContain("localhost or HTTPS");
  });

  it("keeps installation opt-in and invokes the browser prompt only after a click", async () => {
    vi.stubGlobal("isSecureContext", true);
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    const invoke = vi.fn(async () => {});
    render(<PwaInstallPanel />);
    expect(invoke).not.toHaveBeenCalled();
    const event = new Event("beforeinstallprompt", { cancelable: true }) as Event & {
      prompt: typeof invoke;
      userChoice: Promise<{ outcome: "accepted" }>;
    };
    event.prompt = invoke;
    event.userChoice = Promise.resolve({ outcome: "accepted" });
    fireEvent(window, event);
    await waitFor(() => expect(screen.getByRole("button", { name: "Install app" })).toBeInTheDocument());
    expect(invoke).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Install app" }));
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
  });

  it("service worker ignores API, remote hosts, and development modules", async () => {
    const handlers: Record<string, (event: any) => void> = {};
    const addAll = vi.fn(async () => {});
    const asset = { ok: true, type: "basic", clone: () => asset };
    const cache = { addAll, match: vi.fn(async () => undefined), put: vi.fn(async () => {}) };
    const cachesMock = {
      open: vi.fn(async () => cache),
      match: vi.fn(async () => ({ offline: true })),
      keys: vi.fn(async () => ["rosevear-pwa-static-v044"]),
      delete: vi.fn(async () => true),
    };
    const selfMock = {
      location: { origin: "http://127.0.0.1:5173" },
      addEventListener: (name: string, callback: (event: any) => void) => { handlers[name] = callback; },
      skipWaiting: vi.fn(async () => {}),
      clients: { claim: vi.fn(async () => {}) },
    };
    const fetchMock = vi.fn(async () => asset);
    new Function("self", "caches", "fetch", "Response", workerSource)(
      selfMock, cachesMock, fetchMock, { error: () => ({ offline: true }) },
    );
    let intercepted: Promise<unknown> | null = null;
    const request = (url: string, mode = "cors") => ({
      request: { method: "GET", url, mode },
      respondWith: (value: Promise<unknown>) => { intercepted = value; },
    });

    handlers.fetch(request("http://127.0.0.1:5173/api/v1/auth/status"));
    expect(intercepted).toBeNull();
    handlers.fetch(request("http://127.0.0.1:5173/api/v1/home-assistant/control"));
    expect(intercepted).toBeNull();
    handlers.fetch(request("http://127.0.0.1:5173/src/main.tsx"));
    expect(intercepted).toBeNull();
    handlers.fetch(request("http://127.0.0.1:8765/api/v1/chat/conversations"));
    expect(intercepted).toBeNull();
    handlers.fetch(request("http://127.0.0.1:5173/assets/index-hashed.js"));
    expect(intercepted).not.toBeNull();
    await intercepted;
    expect(cache.put).toHaveBeenCalledTimes(1);

    let install: Promise<unknown> | undefined;
    handlers.install({ waitUntil: (promise: Promise<unknown>) => { install = promise; } });
    await install;
    expect(addAll).toHaveBeenCalledWith([
      "/offline.html",
      "/manifest.webmanifest",
      "/icons/rosevear-192.png",
      "/icons/rosevear-512.png",
    ]);
    expect(JSON.stringify(addAll.mock.calls)).not.toContain("/api/");
    let offlineFallback: Promise<unknown> | null = null;
    handlers.fetch({
      request: { method: "GET", url: "http://127.0.0.1:5173/", mode: "navigate" },
      respondWith: (promise: Promise<unknown>) => { offlineFallback = promise; },
    });
    expect(offlineFallback).not.toBeNull();
    // Navigation is always network-first; never cached private index.html.
    expect(cache.put).toHaveBeenCalledTimes(1);
  });
});
