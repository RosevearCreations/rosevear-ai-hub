import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { CameraPlaybackWorkbench } from "./CameraPlaybackWorkbench";
import type { CameraDashboard, CameraRecord, Go2RTCStatus } from "./api";

const clock = () => new Date().toISOString();
const camera: CameraRecord = {
  id: 4, endpoint_uuid: "office-4", display_name: "Office", host: "192.168.68.44", port: 80,
  service_url: "http://192.168.68.44/onvif", discovery_source: "onvif", onvif_types: [], scopes: [],
  enabled: true, last_seen_at: clock(), created_at: clock(), updated_at: clock(),
  stream: { id: 10, stream_name: "camera-4", source_scheme: "rtsp", source_host: "192.168.68.44", source_port: 554,
    credentials_present: true, enabled: true, encrypted: true, relay_url: "rtsp://127.0.0.1:8554/camera-4",
    last_sync_at: null, last_probe_at: null, last_probe_status: null, last_error: null,
    created_at: clock(), updated_at: clock() },
};
const transport: Go2RTCStatus = {
  configured: true, online: true, version: "1", api_base_url: "http://127.0.0.1:1984", rtsp_listen: "127.0.0.1:8554",
  local_api_only: true, local_rtsp_only: true, error: null,
};

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

test("acceptance waits for an explicit probe, moving-video observation, and another probe", async () => {
  let probes = 0;
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).endsWith("/api/v1/cameras/4/stream/probe") && init?.method === "POST") {
      probes += 1;
      return { ok: true, json: async () => ({ camera_id: 4, stream_name: "camera-4", status: "online", producer_count: 1, consumer_count: 0, probed_at: clock() }) };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  }));

  function Harness() {
    const [lastProbe, setLastProbe] = useState<string | null>(null);
    const dashboard: CameraDashboard = {
      generated_at: clock(), stale_after_seconds: 300, transport_online: true, transport_version: "1",
      total: 1, enabled: 1, configured: 1, healthy: lastProbe ? 1 : 0, attention: lastProbe ? 0 : 1,
      cameras: [{ camera_id: 4, display_name: "Office", enabled: true, configured: true,
        health: lastProbe ? "healthy" : "untested", last_seen_at: clock(), last_probe_at: lastProbe,
        last_probe_status: lastProbe ? "online" : null, last_error: null, source_host: "192.168.68.44",
        stream_name: "camera-4", viewer_url: "http://127.0.0.1:1984/stream.html?src=camera-4" }],
    };
    return <CameraPlaybackWorkbench cameras={[camera]} dashboard={dashboard} transport={transport}
      canAdminister onRefresh={async () => setLastProbe(clock())} />;
  }

  render(<Harness />);
  fireEvent.change(screen.getByLabelText("Recognized camera"), { target: { value: "4" } });
  expect(screen.getByText("Field acceptance on hold")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Start private preview" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Run a fresh private probe" }));
  await waitFor(() => expect(probes).toBe(1));
  const start = screen.getByRole("button", { name: "Start private preview" });
  await waitFor(() => expect(start).not.toBeDisabled());
  fireEvent.click(start);
  expect(await screen.findByTitle("Office supervised private preview")).toBeInTheDocument();
  expect(screen.getByText("Field acceptance on hold")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("checkbox", { name: /personally observed real, moving video/i }));
  fireEvent.click(screen.getByRole("button", { name: "Recheck this same private stream" }));
  await waitFor(() => expect(probes).toBe(2));
  await waitFor(() => expect(screen.getByText("Session reviewed")).toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: "Stop private preview" }));
  expect(screen.queryByTitle("Office supervised private preview")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Recognized camera"), { target: { value: "" } });
  expect(screen.getByText("Field acceptance on hold")).toBeInTheDocument();
});
