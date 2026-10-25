import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { DeviceDiscoveryInbox } from "./DeviceDiscoveryInbox";

const HA = { areas: [{ area_id: "hall", name: "Hallway" }],
  devices: [{ device_id: "ha-lamp-1", name: "Hall Lamp", area_id: "hall" }], entities: [] };
const CAMERA = { endpoint_uuid: "onvif-lampcam-1", display_name: "Hall Camera",
  host: "PRIVATE_CAMERA_IP", port: 80, registered: false };

function mockServer(options: { duplicate?: boolean; scanUnavailable?: boolean } = {}) {
  const requests: { path: string; method: string; body: Record<string, unknown> | null }[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    const method = init?.method || "GET";
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : null;
    requests.push({ path, method, body });
    let result: unknown;
    if (path.endsWith("/api/v1/home-assistant/browser")) result = HA;
    else if (path.endsWith("/api/v1/device-registry/reviews")) result = { annotations: [], matches: [] };
    else if (path.endsWith("/api/v1/mqtt/status")) result = { available: false };
    else if (path.endsWith("/api/v1/device-discovery/reviews")) result = [];
    else if (path.endsWith("/api/v1/cameras") && method === "GET") {
      result = options.duplicate ? [{ ...CAMERA, endpoint_uuid: "different-uuid" }] : [];
    } else if (path.endsWith("/api/v1/cameras/discovery/preview")) {
      if (options.scanUnavailable) return { ok: false, status: 503, json: async () => ({ detail: "Unavailable" }) };
      result = { preview_token: "PRIVATE_SINGLE_USE_TICKET", expires_in_seconds: 300,
        truncated: false, candidates: [CAMERA] };
    } else if (path.endsWith("/api/v1/device-discovery/review") && method === "PUT") {
      result = { ...body, revision: 1, reviewed_at: new Date().toISOString() };
    } else if (path.endsWith("/api/v1/cameras/discovery/accept") && method === "POST") {
      result = { created: 1, already_registered: 0, cameras: [{ ...CAMERA, id: 12, enabled: false }] };
    } else return { ok: false, status: 404, json: async () => ({ detail: "Not found" }) };
    return { ok: true, json: async () => result };
  });
  vi.stubGlobal("fetch", fetchMock);
  return { requests };
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Build 140 guided discovery acceptance", () => {
  it("never polls/scans on mount; read-only users cannot initiate discovery", async () => {
    const { requests } = mockServer();
    render(<DeviceDiscoveryInbox role="read_only" />);
    expect(requests).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Start source inventory review" })).not.toBeInTheDocument();
    expect(screen.getByText(/No discovery reading yet/)).toBeInTheDocument();
  });

  it("explicit source read never requests ONVIF scan, then permits independent candidate review", async () => {
    const { requests } = mockServer();
    render(<DeviceDiscoveryInbox role="owner" />);
    expect(requests).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Start source inventory review" }));
    const list = await screen.findByRole("region", { name: "Discovery candidate list" });
    expect(within(list).getByRole("button", { name: /Hall Lamp/ })).toBeInTheDocument();
    expect(requests.filter((request) => request.path.includes("discovery/preview"))).toHaveLength(0);
    fireEvent.click(within(list).getByRole("button", { name: /Hall Lamp/ }));
    expect(screen.getByRole("button", { name: "Approve for follow-up" })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I reviewed this exact source ID/ }));
    fireEvent.click(screen.getByRole("button", { name: "Reject candidate" }));
    expect(await screen.findByText(/Owner disposition saved/)).toBeInTheDocument();
    expect(requests.filter((request) => request.method === "PUT")).toHaveLength(1);
    expect(requests.find((request) => request.method === "PUT")?.body).toMatchObject({
      source: "ha_device", source_id: "ha-lamp-1", decision: "rejected", expected_revision: 0,
    });
    expect(requests.filter((request) => request.path.includes("discovery/accept"))).toHaveLength(0);
  });

  it("registers exactly one camera disabled only after two acknowledgements and a durable approval", async () => {
    const { requests } = mockServer();
    const { container } = render(<DeviceDiscoveryInbox role="owner" />);
    fireEvent.click(screen.getByRole("button", { name: "Start source inventory review" }));
    await screen.findByRole("region", { name: "Discovery candidate list" });
    fireEvent.click(screen.getByRole("button", { name: "Scan ONVIF cameras (opt-in)" }));
    const camera = await screen.findByRole("button", { name: /Hall Camera/ });
    fireEvent.click(camera);
    expect(screen.queryByRole("button", { name: "Register one reviewed camera disabled" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /I reviewed this exact source ID/ }));
    fireEvent.click(screen.getByRole("button", { name: "Approve for follow-up" }));
    expect(await screen.findByText(/Owner follow-up review saved/)).toBeInTheDocument();
    const registration = await screen.findByRole("button", { name: "Register one reviewed camera disabled" });
    expect(registration).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I reviewed this exact source ID/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /I independently checked this exact camera/ }));
    fireEvent.click(registration);
    expect(await screen.findByText(/One reviewed camera registered DISABLED/)).toBeInTheDocument();
    expect(requests.filter((request) => request.path.endsWith("/discovery/preview"))).toHaveLength(1);
    expect(requests.filter((request) => request.path.endsWith("/discovery/accept"))).toHaveLength(1);
    expect(requests.find((request) => request.path.endsWith("/discovery/accept"))?.body).toMatchObject({
      preview_token: "PRIVATE_SINGLE_USE_TICKET", endpoint_uuids: ["onvif-lampcam-1"],
    });
    expect(container.textContent).not.toContain("PRIVATE_CAMERA_IP");
    expect(container.textContent).not.toContain("PRIVATE_SINGLE_USE_TICKET");
  });

  it("rejects a duplicate camera endpoint, and a failed preview never registers anything", async () => {
    const { requests } = mockServer({ duplicate: true });
    render(<DeviceDiscoveryInbox role="owner" />);
    fireEvent.click(screen.getByRole("button", { name: "Start source inventory review" }));
    await screen.findByRole("region", { name: "Discovery candidate list" });
    fireEvent.click(screen.getByRole("button", { name: "Scan ONVIF cameras (opt-in)" }));
    fireEvent.click(await screen.findByRole("button", { name: /Hall Camera/ }));
    expect(screen.getByText(/Camera endpoint conflicts with a registered UUID/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /I reviewed this exact source ID/ }));
    expect(screen.getByRole("button", { name: "Approve for follow-up" })).toBeDisabled();
    expect(requests.filter((request) => request.path.includes("discovery/accept"))).toHaveLength(0);
  });
});
