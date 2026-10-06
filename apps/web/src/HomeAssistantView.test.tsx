import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

import { HomeAssistantView } from "./HomeAssistantView";

describe("HomeAssistantView", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/v1/home-assistant/status")) {
          return {
            ok: true,
            json: async () => ({
              configured: true,
              available: true,
              base_url: "http://homeassistant.test",
              url_configured: true,
              token_configured: true,
              message: "API running.",
            }),
          };
        }
        if (url.endsWith("/api/v1/home-assistant/entities")) {
          return {
            ok: true,
            json: async () => ({
              count: 2,
              entities: [
                {
                  entity_id: "light.workshop",
                  domain: "light",
                  state: "on",
                  friendly_name: "Workshop light",
                  icon: "mdi:lightbulb",
                  unit_of_measurement: null,
                  device_class: null,
                  last_changed: null,
                  last_updated: "2026-10-06T20:00:00Z",
                },
                {
                  entity_id: "sensor.workshop_temperature",
                  domain: "sensor",
                  state: "21.5",
                  friendly_name: "Workshop temperature",
                  icon: null,
                  unit_of_measurement: "°C",
                  device_class: "temperature",
                  last_changed: null,
                  last_updated: "2026-10-06T20:00:00Z",
                },
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

  test("shows Home Assistant health and the basic entity inventory", async () => {
    render(<HomeAssistantView />);

    await waitFor(() => {
      expect(screen.getByText("Home Assistant online")).toBeInTheDocument();
      expect(screen.getByText("Workshop light")).toBeInTheDocument();
      expect(screen.getByText("Workshop temperature")).toBeInTheDocument();
      expect(screen.getByText("21.5 °C")).toBeInTheDocument();
      expect(screen.getByText("temperature")).toBeInTheDocument();
    });
  });
});
