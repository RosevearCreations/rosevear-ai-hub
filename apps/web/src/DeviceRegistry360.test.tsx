import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import type { HomeAssistantBrowserResponse, HomeAssistantControlPolicy } from "./api";
import { DeviceRegistry360 } from "./DeviceRegistry360";

const browser = {
  areas: [{ area_id: "living", name: "Living room" }, { area_id: "workshop", name: "Workshop" }],
  devices: [{ device_id: "dev-room", name: "Hall Monitor", area_id: "living" }],
  entities: [{ entity_id: "sensor.hall", domain: "sensor", state: "23", friendly_name: "Hall Monitor",
    device_id: "dev-room", area_id: "living", area_name: "Living room", last_updated: "2026-10-25T10:00:00Z" }],
} as HomeAssistantBrowserResponse;
const policy = { candidates: [{ entity_id: "sensor.hall", allowed: true, blocked_reason: null }] } as HomeAssistantControlPolicy;

function apiFixtures() {
  const requests: { path: string; method: string; body: Record<string, unknown> | null }[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : null;
    requests.push({ path, method, body });
    let result: unknown;
    if (path.endsWith("/api/v1/cameras")) result = [{ id: 7, display_name: "Hall Monitor", enabled: true,
      last_seen_at: "2026-10-25T09:00:00Z", stream: null,
      host: "PRIVATE_HOST", service_url: "rtsp://PRIVATE_STREAM", port: 554 }];
    else if (path.endsWith("/api/v1/cameras/dashboard")) result = { cameras: [{ camera_id: 7,
      health: "unavailable", last_probe_at: null, last_error: "PRIVATE_ERROR" }] };
    else if (path.endsWith("/api/v1/mqtt/status")) result = { available: false };
    else if (path.endsWith("/api/v1/device-registry/reviews")) result = { annotations: [], matches: [] };
    else if (path.endsWith("/api/v1/device-registry/annotation") && method === "PUT") {
      result = { ...body, revision: 1, reviewed_at: "2026-10-25T10:10:00Z" };
    } else if (path.endsWith("/api/v1/device-registry/match-review") && method === "PUT") {
      result = { ...body, revision: 1, reviewed_at: "2026-10-25T10:10:00Z" };
    } else return { ok: false, status: 404, json: async () => ({ detail: "Not found" }) };
    return { ok: true, json: async () => result };
  });
  vi.stubGlobal("fetch", fetchMock);
  return { requests, fetchMock };
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Build 139 Device 360 operator screen", () => {
  beforeEach(() => { apiFixtures(); });

  it("searches exact identities, displays provider origins and never renders private connection details", async () => {
    const { container } = render(<DeviceRegistry360 browser={browser} policy={policy} role="owner" />);
    const results = await screen.findByRole("region", { name: "Device registry results" });
    await waitFor(() => expect(within(results).getAllByRole("button")).toHaveLength(3));
    expect(screen.getByText(/3 of 3 source identities/)).toBeInTheDocument();
    const reconciliation = screen.getByRole("region", { name: "Build 212 Home Assistant to Hub reconciliation" });
    expect(reconciliation).toHaveTextContent("1 HA device IDs · 1 HA entity IDs");
    expect(reconciliation).toHaveTextContent("possible cross-source name matches");
    expect(reconciliation).not.toHaveTextContent("PRIVATE_STREAM");
    fireEvent.click(within(results).getByRole("button", { name: /Hall Monitor.*Camera/i }));
    expect(screen.getByRole("region", { name: "Selected source identity" })).toHaveTextContent("camera:7".split(":")[1]);
    expect(container.textContent).not.toMatch(/PRIVATE_HOST|PRIVATE_STREAM|PRIVATE_ERROR/);
    fireEvent.change(screen.getByLabelText("Search identity or room"), { target: { value: "sensor.hall" } });
    expect(within(results).getAllByRole("button")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Clear registry filters" }));
    fireEvent.change(screen.getByLabelText("Source"), { target: { value: "camera" } });
    expect(within(results).getAllByRole("button")).toHaveLength(1);
    expect(screen.getByText(/Each source retains its own ID/)).toBeInTheDocument();
  });

  it("owner reviews aliases and Hub-only room labels, with no provider write", async () => {
    const { requests } = apiFixtures();
    render(<DeviceRegistry360 browser={browser} policy={policy} role="owner" />);
    const results = await screen.findByRole("region", { name: "Device registry results" });
    await waitFor(() => expect(within(results).getAllByRole("button")).toHaveLength(3));
    fireEvent.click(within(results).getByRole("button", { name: /Hall Monitor.*Home Assistant device/i }));
    fireEvent.change(screen.getByLabelText("Reviewed display name"), { target: { value: "Owner Hall Monitor" } });
    fireEvent.change(screen.getByLabelText("Room label"), { target: { value: "Workshop" } });
    fireEvent.click(screen.getByRole("button", { name: "Save reviewed metadata" }));
    expect(await screen.findByText(/Local identity metadata reviewed and saved/)).toBeInTheDocument();
    const writes = requests.filter((request) => request.method === "PUT");
    expect(writes).toHaveLength(1);
    expect(writes[0].path).toMatch(/device-registry\/annotation$/);
    expect(writes[0].body).toMatchObject({ source: "ha_device", source_id: "dev-room",
      alias: "Owner Hall Monitor", room_label: "Workshop", expected_revision: 0 });
    expect(screen.getByRole("region", { name: "Selected source identity" })).toHaveTextContent("(Hub annotation)");
  });

  it("read-only accounts can inspect but cannot edit identities, approve topics or match suggestions", async () => {
    render(<DeviceRegistry360 browser={browser} policy={policy} role="read_only" />);
    expect(await screen.findByRole("region", { name: "Device registry results" })).toBeInTheDocument();
    const results = screen.getByRole("region", { name: "Device registry results" });
    await waitFor(() => expect(within(results).getAllByRole("button")).toHaveLength(3));
    fireEvent.click(within(results).getByRole("button", { name: /Hall Monitor.*Camera/i }));
    expect(screen.queryByRole("button", { name: "Save reviewed metadata" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Review MQTT topic reference" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Keep distinct" })).not.toBeInTheDocument();
  });

  it("requires deliberate MQTT acknowledgement and only records a note after it", async () => {
    const { requests } = apiFixtures();
    render(<DeviceRegistry360 browser={browser} policy={policy} role="owner" />);
    const save = await screen.findByRole("button", { name: "Save reviewed topic reference" });
    fireEvent.change(screen.getByLabelText("Exact non-secret MQTT topic"), {
      target: { value: "house/temperature" },
    });
    expect(save).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I have reviewed this exact topic/ }));
    fireEvent.click(save);
    expect(await screen.findByText(/Owner-reviewed MQTT topic reference saved/)).toBeInTheDocument();
    expect(requests.filter((request) => request.method === "PUT")).toHaveLength(1);
    expect(requests.find((request) => request.method === "PUT")?.body).toMatchObject({
      source: "mqtt", source_id: "house/temperature", expected_revision: 0,
    });
  });
});
