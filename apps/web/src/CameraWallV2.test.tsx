import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { CameraWallV2, cameraRoom } from "./CameraWallV2";
import type { CameraDashboard, CameraRecord, Go2RTCStatus } from "./api";

const probeAt = new Date().toISOString();
function camera(id: number): CameraRecord {
  return {
    id, endpoint_uuid: `cam-${id}`, display_name: id === 1 ? "Hall Camera" : "Workshop Camera",
    host: `192.168.68.${50 + id}`, port: 80, service_url: "private",
    discovery_source: "manual", onvif_types: [], scopes: [], enabled: true,
    last_seen_at: probeAt, created_at: probeAt, updated_at: probeAt,
    stream: {
      id, stream_name: `camera-${id}`, source_scheme: "rtsp", source_host: `192.168.68.${50 + id}`,
      source_port: 554, credentials_present: true, enabled: true, encrypted: true,
      relay_url: `rtsp://127.0.0.1:8554/camera-${id}`,
      last_sync_at: probeAt, last_probe_at: probeAt, last_probe_status: "online", last_error: null,
      created_at: probeAt, updated_at: probeAt,
    },
  };
}
const transport: Go2RTCStatus = {
  configured: true, online: true, version: "local", api_base_url: "http://127.0.0.1:1984",
  rtsp_listen: "127.0.0.1:8554", local_api_only: true, local_rtsp_only: true, error: null,
};
function dashboard(health2 = "healthy"): CameraDashboard {
  return {
    generated_at: probeAt, stale_after_seconds: 300, transport_online: true, transport_version: "local",
    total: 2, enabled: 2, configured: 2, healthy: health2 === "healthy" ? 2 : 1,
    attention: health2 === "healthy" ? 0 : 1,
    cameras: [1, 2].map((id) => ({
      camera_id: id, display_name: id === 1 ? "Hall Camera" : "Workshop Camera", enabled: true,
      configured: true, health: id === 2 ? health2 : "healthy", last_seen_at: probeAt,
      last_probe_at: probeAt, last_probe_status: "online", last_error: null,
      source_host: `192.168.68.${50 + id}`, stream_name: `camera-${id}`,
      viewer_url: `http://127.0.0.1:1984/stream.html?src=camera-${id}`,
    })),
  };
}
function mockPreferences() {
  let writes = 0;
  vi.stubGlobal("fetch", vi.fn(async (request: RequestInfo | URL, options?: RequestInit) => {
    const url = String(request);
    if (url.endsWith("/api/v1/device-registry/reviews")) return { ok: true, json: async () => ({
      annotations: [{ source: "camera", source_id: "1", alias: "", room_label: "Hall", disposition: "reviewed", revision: 1, reviewed_at: probeAt }],
      matches: [],
    }) };
    if (url.endsWith("/api/v1/camera-wall/preferences")) {
      if (options?.method === "PUT") {
        writes++;
        const body = JSON.parse(String(options.body));
        expect(body).not.toHaveProperty("viewer_url");
        expect(body).not.toHaveProperty("source_url");
        return { ok: true, json: async () => ({ favorite_camera_ids: body.favorite_camera_ids, compact: body.compact, revision: 1 }) };
      }
      return { ok: true, json: async () => ({ favorite_camera_ids: [], compact: false, revision: 0 }) };
    }
    throw new Error(`Unexpected API call: ${url}`);
  }));
  return () => writes;
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Build 141 private Camera Wall", () => {
  test("reviewed rooms only; unavailable room annotations do not guess from hostname", () => {
    expect(cameraRoom(camera(1), [])).toBe("Unassigned cameras");
    expect(cameraRoom(camera(1), [{ source: "camera", source_id: "2", alias: "", room_label: "Kitchen", disposition: "reviewed", revision: 1, reviewed_at: probeAt }])).toBe("Unassigned cameras");
  });

  test("groups cards, starts zero streams by default, only one live focus at a time, and saves private IDs", async () => {
    const writes = mockPreferences();
    // Existing private playback rule requires localhost browser, as on the Windows server.
    render(<CameraWallV2 cameras={[camera(1), camera(2)]} dashboard={dashboard()} transport={transport} userId={1} />);
    await screen.findByRole("region", { name: "Hall camera group" });
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Start private preview" }).length).toBe(2));
    expect(screen.queryByRole("iframe")).not.toBeInTheDocument();
    expect(document.querySelectorAll("iframe")).toHaveLength(0);
    const hall = screen.getByRole("region", { name: "Hall camera group" });
    fireEvent.click(within(hall).getByRole("button", { name: "Start private preview" }));
    expect(screen.getByTitle("Hall Camera live view")).toHaveAttribute("src", "http://127.0.0.1:1984/stream.html?src=camera-1");
    const unassigned = screen.getByRole("region", { name: "Unassigned cameras camera group" });
    fireEvent.click(within(unassigned).getByRole("button", { name: "Start private preview" }));
    expect(document.querySelectorAll("iframe")).toHaveLength(1);
    expect(screen.queryByTitle("Hall Camera live view")).not.toBeInTheDocument();
    expect(screen.getByTitle("Workshop Camera live view")).toBeInTheDocument();
    fireEvent.click(within(hall).getByRole("button", { name: "☆ Favorite" }));
    fireEvent.click(screen.getByRole("button", { name: "Save private layout" }));
    await waitFor(() => expect(writes()).toBe(1));
    expect(screen.getByText(/Video remains stopped/)).toBeInTheDocument();
  });

  test("stale health disables selection without stopping the rest of the grid; no credentials shown", async () => {
    mockPreferences();
    render(<CameraWallV2 cameras={[camera(1), camera(2)]} dashboard={dashboard("failed")} transport={transport} userId={1} />);
    await screen.findByText("Failed");
    expect(screen.getByText("Failed")).toHaveClass("camera-health-failed");
    expect(screen.getAllByRole("button", { name: "Start private preview" }).some((btn) => btn.hasAttribute("disabled"))).toBe(true);
    expect(document.querySelectorAll("iframe")).toHaveLength(0);
    expect(screen.queryByText(/rtsp:\/\//i)).not.toBeInTheDocument();
  });

  test("transport degradation closes the large private viewer instead of auto-retrying", async () => {
    mockPreferences();
    const { rerender } = render(<CameraWallV2 cameras={[camera(1)]} dashboard={dashboard()} transport={transport} userId={1} />);
    await screen.findByRole("region", { name: "Hall camera group" });
    const button = await screen.findByRole("button", { name: "Start private preview" });
    fireEvent.click(button);
    await waitFor(() => expect(document.querySelectorAll("iframe")).toHaveLength(1));
    rerender(<CameraWallV2 cameras={[camera(1)]} dashboard={{ ...dashboard(), transport_online: false }} transport={transport} userId={1} />);
    await waitFor(() => expect(document.querySelectorAll("iframe")).toHaveLength(0));
    expect(screen.getByRole("button", { name: "Start private preview" })).toBeDisabled();
  });
  test("Build 214 filters problem cameras and flags follow-ups without network writes or private frames", async () => {
    const writes = mockPreferences();
    render(<CameraWallV2 cameras={[camera(1), camera(2)]} dashboard={dashboard("failed")} transport={transport} userId={1} />);
    await screen.findByRole("region", { name: "Hall camera group" });
    fireEvent.click(screen.getByLabelText("Needs attention only"));
    expect(screen.queryByRole("region", { name: "Hall camera group" })).not.toBeInTheDocument();
    const attention = screen.getByRole("region", { name: "Unassigned cameras camera group" });
    expect(attention).toHaveTextContent("Last-good frame: No verified last-good frame metadata");
    fireEvent.click(within(attention).getByRole("button", { name: "Flag for manual follow-up" }));
    expect(screen.getByRole("region", { name: "Private camera owner follow-up summary" })).toHaveTextContent("1 flagged this session");
    expect(writes()).toBe(0);
    expect(document.querySelectorAll("iframe, img")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Clear session follow-ups" }));
    expect(screen.getByRole("region", { name: "Private camera owner follow-up summary" })).toHaveTextContent("0 flagged this session");
  });
});
