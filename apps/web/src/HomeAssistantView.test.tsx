import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { HomeAssistantView } from "./HomeAssistantView";

describe("HomeAssistantView", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/v1/home-assistant/status")) {
          return { ok: true, json: async () => ({ configured: true, available: true, base_url: "http://homeassistant.test", url_configured: true, token_configured: true, message: "API running." }) };
        }
        if (url.endsWith("/api/v1/home-assistant/browser")) {
          return {
            ok: true,
            json: async () => ({
              area_count: 2, device_count: 2, domain_count: 2, entity_count: 2,
              areas: [
                { area_id: "workshop", name: "Workshop", aliases: [], floor_id: null, icon: null },
                { area_id: "living_room", name: "Living room", aliases: [], floor_id: null, icon: null },
              ],
              devices: [
                { device_id: "device-1", name: "Workshop thermostat", area_id: "workshop", manufacturer: "Example", model: "T1", sw_version: null, hw_version: null, parent_device_id: null },
                { device_id: "device-2", name: "Living room lamp", area_id: "living_room", manufacturer: "Example", model: "L1", sw_version: null, hw_version: null, parent_device_id: null },
              ],
              domains: [{ domain: "light", count: 1 }, { domain: "sensor", count: 1 }],
              entities: [
                { entity_id: "light.living_room", domain: "light", state: "on", friendly_name: "Living room lamp", area_id: "living_room", area_name: "Living room", device_id: "device-2", device_name: "Living room lamp", platform: "demo", icon: "mdi:lightbulb", unit_of_measurement: null, device_class: null, last_changed: null, last_updated: "2026-10-06T20:00:00Z", attributes: { brightness: 128 } },
                { entity_id: "sensor.workshop_temperature", domain: "sensor", state: "21.5", friendly_name: "Workshop temperature", area_id: "workshop", area_name: "Workshop", device_id: "device-1", device_name: "Workshop thermostat", platform: "demo", icon: null, unit_of_measurement: "°C", device_class: "temperature", last_changed: null, last_updated: "2026-10-06T20:00:00Z", attributes: { reading_quality: "good" } },
              ],
            }),
          };
        }
        return { ok: false, status: 404 };
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test("browses and filters Home Assistant entities by registry metadata", async () => {
    render(<HomeAssistantView />);
    await waitFor(() => {
      expect(screen.getByText("Home Assistant online")).toBeInTheDocument();
      expect(screen.getByText("Workshop temperature")).toBeInTheDocument();
      expect(screen.getByText("Living room lamp")).toBeInTheDocument();
    });
    expect(screen.getByText("21.5 °C")).toBeInTheDocument();
    expect(screen.getByText("Attributes (1)")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Area"), { target: { value: "workshop" } });
    expect(screen.getByText("Workshop temperature")).toBeInTheDocument();
    expect(screen.queryByText("Living room lamp")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("Living room lamp")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "thermostat" } });
    expect(screen.getByText("Workshop temperature")).toBeInTheDocument();
    expect(screen.queryByText("Living room lamp")).not.toBeInTheDocument();
  });
});
