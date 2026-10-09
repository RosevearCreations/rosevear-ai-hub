import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { CameraView } from "./CameraView";
import type { AuthUser } from "./api";

const owner: AuthUser = {
  id: 1,
  username: "owner",
  role: "owner",
  enabled: true,
  created_at: "2026-10-09T00:00:00Z",
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CameraView", () => {
  test("lists discovered cameras and runs an owner ONVIF scan", async () => {
    let scans = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/v1/cameras") && (!init?.method || init.method === "GET")) {
        return {
          ok: true,
          json: async () => [{
            id: 1,
            endpoint_uuid: "camera-1",
            display_name: "Front Door",
            host: "192.168.68.55",
            port: 80,
            service_url: "http://192.168.68.55/onvif/device_service",
            discovery_source: "onvif_ws_discovery",
            onvif_types: ["dn:NetworkVideoTransmitter"],
            scopes: ["onvif://www.onvif.org/name/Front%20Door"],
            enabled: true,
            last_seen_at: "2026-10-09T10:00:00Z",
            created_at: "2026-10-09T10:00:00Z",
            updated_at: "2026-10-09T10:00:00Z",
            stream: null,
          }],
        };
      }
      if (url.endsWith("/api/v1/cameras/go2rtc/status")) {
        return {
          ok: true,
          json: async () => ({
            configured: true,
            online: true,
            version: "1.9.14",
            api_base_url: "http://127.0.0.1:1984",
            rtsp_listen: "127.0.0.1:8554",
            local_api_only: true,
            local_rtsp_only: true,
            error: null,
          }),
        };
      }
      if (url.endsWith("/api/v1/cameras/discover")) {
        scans += 1;
        return {
          ok: true,
          json: async () => ({ discovered: 1, created: 0, updated: 1, cameras: [] }),
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    }));

    render(<CameraView currentUser={owner} />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Cameras" })).toBeInTheDocument();
      expect(screen.getByText("Front Door")).toBeInTheDocument();
      expect(screen.getByText("192.168.68.55:80")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Scan local network" }));

    await waitFor(() => {
      expect(scans).toBe(1);
      expect(screen.getByText(/Discovery found 1 ONVIF device/)).toBeInTheDocument();
    });
  });
});


test("owner can submit an encrypted RTSP source without redisplay", async () => {
  let configured = 0;
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/api/v1/cameras") && (!init?.method || init.method === "GET")) {
      return {
        ok: true,
        json: async () => [{
          id: 2,
          endpoint_uuid: "camera-2",
          display_name: "Garage",
          host: "192.168.68.56",
          port: 80,
          service_url: "http://192.168.68.56/onvif/device_service",
          discovery_source: "onvif_ws_discovery",
          onvif_types: [],
          scopes: [],
          enabled: true,
          last_seen_at: "2026-10-09T10:00:00Z",
          created_at: "2026-10-09T10:00:00Z",
          updated_at: "2026-10-09T10:00:00Z",
          stream: null,
        }],
      };
    }
    if (url.endsWith("/api/v1/cameras/go2rtc/status")) {
      return {
        ok: true,
        json: async () => ({
          configured: true,
          online: true,
          version: "1.9.14",
          api_base_url: "http://127.0.0.1:1984",
          rtsp_listen: "127.0.0.1:8554",
          local_api_only: true,
          local_rtsp_only: true,
          error: null,
        }),
      };
    }
    if (url.endsWith("/api/v1/cameras/2/stream") && init?.method === "PUT") {
      configured += 1;
      return {
        ok: true,
        json: async () => ({
          synced: true,
          message: "Encrypted stream source saved and synchronized to go2rtc runtime.",
          stream: {
            id: 1,
            stream_name: "camera-2",
            source_scheme: "rtsp",
            source_host: "192.168.68.56",
            source_port: 554,
            credentials_present: true,
            enabled: true,
            encrypted: true,
            relay_url: "rtsp://127.0.0.1:8554/camera-2",
            last_sync_at: "2026-10-09T10:00:00Z",
            last_probe_at: null,
            last_probe_status: null,
            last_error: null,
            created_at: "2026-10-09T10:00:00Z",
            updated_at: "2026-10-09T10:00:00Z",
          },
        }),
      };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  }));

  render(<CameraView currentUser={owner} />);

  const input = await screen.findByLabelText("RTSP source URL");
  fireEvent.change(input, {
    target: { value: "rtsp://user:password@192.168.68.56/live" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save encrypted RTSP source" }));

  await waitFor(() => {
    expect(configured).toBe(1);
    expect(screen.getByText(/Encrypted stream source saved/)).toBeInTheDocument();
  });
});
