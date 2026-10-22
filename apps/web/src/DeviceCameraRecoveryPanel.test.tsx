import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DeviceCameraRecoveryPanel } from "./DeviceCameraRecoveryPanel";
import { RECOVERY_SNAPSHOT_SCHEMA } from "./deviceRecovery";

const response = (value: unknown) => ({ ok: true, json: async () => value });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Build 107 read-only device and camera recovery panel", () => {
  it("compares an operator baseline and never invokes mutations or discovery", async () => {
    const methods: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      methods.push(`${init?.method ?? "GET"} ${url}`);
      if (url.endsWith("/api/v1/home-assistant/status")) return response({ configured: true, available: true, message: "OK" });
      if (url.endsWith("/api/v1/home-assistant/browser")) return response({
        devices: [{ device_id: "ha-current", name: "Current Device" }],
        entities: [{ entity_id: "sensor.current", friendly_name: "Current Sensor" }],
      });
      if (url.endsWith("/api/v1/cameras")) return response([]);
      if (url.endsWith("/api/v1/cameras/dashboard")) return response({ transport_online: true, configured: 0, healthy: 0 });
      throw new Error(`Unexpected read: ${url}`);
    }));

    render(<DeviceCameraRecoveryPanel />);
    expect(await screen.findByText(/1 devices, 1 entities/)).toBeInTheDocument();
    expect(screen.getByText(/No cameras are registered in the Hub/)).toBeInTheDocument();
    const baseline = {
      schema: RECOVERY_SNAPSHOT_SCHEMA,
      captured_at: "2026-10-20T12:00:00Z",
      home_assistant: {
        devices: [{ id: "ha-old", name: "Old TV" }],
        entities: [{ id: "media_player.tv", name: "TV" }],
      },
      cameras: [{ id: "onvif-front", name: "Front Camera" }],
    };
    const file = new File([JSON.stringify(baseline)], "baseline.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: async () => JSON.stringify(baseline) });
    fireEvent.change(screen.getByLabelText("Choose previous device camera inventory JSON"), {
      target: { files: [file] },
    });
    await waitFor(() => expect(screen.getByText(/Loaded previous inventory/)).toBeInTheDocument());
    expect(screen.getByText("Home Assistant devices").parentElement?.textContent).toContain("1 missing");
    expect(screen.getByText("Hub camera registrations").parentElement?.textContent).toContain("1 missing");
    expect(methods).toHaveLength(4);
    expect(methods.every((request) => request.startsWith("GET "))).toBe(true);
  });

  it("shows an unknown inventory, not a false zero, when the HA registry request fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/v1/home-assistant/status")) return response({ configured: true, available: true, message: "OK" });
      if (url.endsWith("/api/v1/home-assistant/browser")) throw new Error("token=PRIVATE");
      if (url.endsWith("/api/v1/cameras")) throw new Error("private camera address");
      if (url.endsWith("/api/v1/cameras/dashboard")) return response({ transport_online: true, configured: 0, healthy: 0 });
      throw new Error("Unexpected request");
    }));
    render(<DeviceCameraRecoveryPanel />);
    await screen.findByText(/Camera inventory request failed; camera count is unknown/);
    expect(screen.getByText(/device and entity counts unknown/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download current inventory" })).toBeDisabled();
    expect(document.body.textContent).not.toContain("PRIVATE");
    expect(document.body.textContent).not.toContain("private camera address");
  });
});
