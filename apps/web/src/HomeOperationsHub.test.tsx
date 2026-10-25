import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { buildHomeOperationsSnapshot, HomeOperationsHub, safeAreaLabel } from "./HomeOperationsHub";

const fulfilled = (value: unknown): PromiseFulfilledResult<unknown> => ({ status: "fulfilled", value });
const rejected = (reason: unknown): PromiseRejectedResult => ({ status: "rejected", reason });
const checkedAt = new Date("2026-10-25T15:00:00Z");

function fixture() {
  return buildHomeOperationsSnapshot([
    fulfilled({ configured: true, available: true, token: "PRIVATE_HA_TOKEN" }),
    rejected(new Error("password=PRIVATE_MQTT_PASSWORD")),
    fulfilled({ total: 3, healthy: 1, attention: 2, stream_url: "rtsp://PRIVATE_CAMERA_URL" }),
    fulfilled({ document_count: 0 }), fulfilled({ connectors: [] }),
    fulfilled({ status: "ok", config: "PRIVATE_HUB_CONFIG" }),
    fulfilled({ available: false, base_url: "http://PRIVATE_OLLAMA_HOST" }),
    fulfilled({
      areas: [
        { area_id: "living", name: "Living room" },
        { area_id: "workshop", name: "Workshop" },
        { area_id: "private", name: "https://PRIVATE_HOST/token=SECRET" },
      ],
      devices: [
        { area_id: "living" }, { area_id: "living" }, { area_id: "workshop" },
      ],
      entities: [{ area_id: "living" }, { area_id: "workshop" }],
      credentials: "PRIVATE_BROWSER_PASSWORD",
    }),
  ], checkedAt);
}

afterEach(cleanup);

describe("Build 138 Home Operations V2", () => {
  it("summarizes the latest service reports without disclosing raw diagnostics or mistaking inventory for device health", () => {
    const snapshot = fixture();
    expect(snapshot.health.ha.status).toBe("ready");
    expect(snapshot.health.mqtt.status).toBe("unknown");
    expect(snapshot.health.camera.status).toBe("attention");
    expect(snapshot.health.ollama.status).toBe("attention");
    expect(snapshot.health.hub.status).toBe("ready");
    expect(snapshot.rooms.find((room) => room.id === "living")).toMatchObject({ devices: 2, entities: 1 });
    expect(snapshot.rooms.find((room) => room.id === "private")?.name).toBe("Room 3");
    expect(JSON.stringify(snapshot)).not.toMatch(/PRIVATE|token=|password=/);
  });

  it("distinguishes unconfigured, unavailable, and missing room browser responses", () => {
    const snapshot = buildHomeOperationsSnapshot([
      fulfilled({ configured: false, available: false }),
      fulfilled({ configured: true, available: false }),
      rejected("PRIVATE_CAMERA_SECRET"),
      rejected(""), rejected(""),
      rejected("PRIVATE_HUB_SECRET"), rejected("PRIVATE_OLLAMA_SECRET"),
      rejected("PRIVATE_BROWSER_SECRET"),
    ], checkedAt);
    expect(snapshot.health.ha.status).toBe("optional");
    expect(snapshot.health.mqtt.status).toBe("attention");
    expect(snapshot.health.camera.status).toBe("unknown");
    expect(snapshot.health.hub.status).toBe("unknown");
    expect(snapshot.health.ollama.status).toBe("unknown");
    expect(snapshot.roomsAvailable).toBe(false);
    expect(snapshot.rooms).toHaveLength(0);
  });

  it("rejects unsafe labels without affecting ordinary room names", () => {
    expect(safeAreaLabel("Front hallway", 0)).toBe("Front hallway");
    expect(safeAreaLabel("rtsp://device", 4)).toBe("Room 5");
    expect(safeAreaLabel("owner@private-host", 2)).toBe("Room 3");
    expect(safeAreaLabel("secret code", 1)).toBe("Room 2");
  });

  it("filters rooms, opens real navigation sections, and never offers physical controls", () => {
    const onNavigate = vi.fn();
    const { container } = render(<HomeOperationsHub snapshot={fixture()} loading={false}
      role="owner" onNavigate={onNavigate} />);
    const roomRegion = screen.getByRole("region", { name: "Home Assistant room inventory" });
    expect(within(roomRegion).getByRole("heading", { name: "Living room" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Filter by room"), { target: { value: "living" } });
    expect(within(roomRegion).queryByRole("heading", { name: "Workshop" })).toBeNull();
    expect(within(roomRegion).getByRole("heading", { name: "Living room" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Browse Living room devices" }));
    expect(onNavigate).toHaveBeenCalledWith("Devices");
    fireEvent.click(screen.getByRole("button", { name: "Cameras routes" }));
    fireEvent.click(screen.getByRole("button", { name: /Camera dashboard/ }));
    expect(onNavigate).toHaveBeenCalledWith("Cameras");
    fireEvent.click(screen.getByRole("button", { name: "Workshop routes" }));
    fireEvent.click(screen.getByRole("button", { name: /Workshop ↗/ }));
    expect(onNavigate).toHaveBeenCalledWith("Workshop");
    expect(container.querySelectorAll("input[type=checkbox]")).toHaveLength(0);
    expect(container.textContent).not.toMatch(/PRIVATE|rtsp:\/\//);
  });

  it("protects administrator-only destinations for household and read-only roles", () => {
    const onNavigate = vi.fn();
    const { rerender } = render(<HomeOperationsHub snapshot={fixture()} loading={false}
      role="read_only" onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole("button", { name: "Workshop routes" }));
    expect(screen.queryByRole("button", { name: /Workshop ↗/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Knowledge/ }));
    expect(onNavigate).toHaveBeenCalledWith("Knowledge");
    rerender(<HomeOperationsHub snapshot={fixture()} loading={false}
      role="household_user" onNavigate={onNavigate} />);
    expect(screen.queryByRole("button", { name: /Workshop ↗/ })).toBeNull();
  });

  it("labels pending refresh and stale snapshots rather than claiming continuous live health", () => {
    const snapshot = { ...fixture(), sampledAt: new Date("2020-01-01T00:00:00Z") };
    render(<HomeOperationsHub snapshot={snapshot} loading={true} role="owner" onNavigate={vi.fn()} />);
    expect(screen.getByRole("status").textContent).toMatch(/Refreshing; showing the previous check/);
    expect(screen.getByRole("status").textContent).toMatch(/Stale observation/);
    expect(screen.getByText(/Room counts describe Home Assistant inventory/)).toBeTruthy();
  });
});
