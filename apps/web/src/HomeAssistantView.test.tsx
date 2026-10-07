import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { HomeAssistantView } from "./HomeAssistantView";

const owner = {
  id: 1,
  username: "owner",
  role: "owner" as const,
  enabled: true,
  created_at: "2026-10-07T12:00:00Z",
};

describe("HomeAssistantView", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

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
        if (url.endsWith("/api/v1/home-assistant/browser")) {
          return {
            ok: true,
            json: async () => ({
              area_count: 2,
              device_count: 2,
              domain_count: 3,
              entity_count: 3,
              areas: [
                { area_id: "workshop", name: "Workshop", aliases: [], floor_id: null, icon: null },
                { area_id: "living_room", name: "Living room", aliases: [], floor_id: null, icon: null },
              ],
              devices: [
                { device_id: "device-1", name: "Workshop thermostat", area_id: "workshop", manufacturer: "Example", model: "T1", sw_version: null, hw_version: null, parent_device_id: null },
                { device_id: "device-2", name: "Living room lamp", area_id: "living_room", manufacturer: "Example", model: "L1", sw_version: null, hw_version: null, parent_device_id: null },
              ],
              domains: [
                { domain: "light", count: 1 },
                { domain: "scene", count: 1 },
                { domain: "sensor", count: 1 },
              ],
              entities: [
                { entity_id: "light.living_room", domain: "light", state: "off", friendly_name: "Living room lamp", area_id: "living_room", area_name: "Living room", device_id: "device-2", device_name: "Living room lamp", platform: "demo", icon: "mdi:lightbulb", unit_of_measurement: null, device_class: null, last_changed: null, last_updated: "2026-10-06T20:00:00Z", attributes: { brightness: 0 } },
                { entity_id: "scene.movie_night", domain: "scene", state: "scening", friendly_name: "Movie night", area_id: "living_room", area_name: "Living room", device_id: null, device_name: null, platform: "demo", icon: null, unit_of_measurement: null, device_class: null, last_changed: null, last_updated: "2026-10-06T20:00:00Z", attributes: {} },
                { entity_id: "sensor.workshop_temperature", domain: "sensor", state: "21.5", friendly_name: "Workshop temperature", area_id: "workshop", area_name: "Workshop", device_id: "device-1", device_name: "Workshop thermostat", platform: "demo", icon: null, unit_of_measurement: "°C", device_class: "temperature", last_changed: null, last_updated: "2026-10-06T20:00:00Z", attributes: { reading_quality: "good" } },
              ],
            }),
          };
        }
        if (url.endsWith("/api/v1/home-assistant/control-policy") && method === "GET") {
          return {
            ok: true,
            json: async () => ({
              allowed_entity_ids: ["light.living_room"],
              candidates: [
                { entity_id: "light.living_room", domain: "light", friendly_name: "Living room lamp", state: "off", allowed: true, blocked_reason: null },
                { entity_id: "scene.movie_night", domain: "scene", friendly_name: "Movie night", state: "scening", allowed: false, blocked_reason: null },
              ],
            }),
          };
        }
        if (url.endsWith("/api/v1/home-assistant/control-policy") && method === "PUT") {
          const body = JSON.parse(String(init?.body)) as {
            allowed_entity_ids: string[];
            acknowledge_low_risk_only: boolean;
          };
          expect(body.acknowledge_low_risk_only).toBe(true);
          return {
            ok: true,
            json: async () => ({
              allowed_entity_ids: body.allowed_entity_ids,
              candidates: [],
            }),
          };
        }
        if (url.endsWith("/api/v1/home-assistant/control") && method === "POST") {
          const body = JSON.parse(String(init?.body)) as {
            entity_id: string;
            action: string;
          };
          expect(body).toEqual({ entity_id: "light.living_room", action: "on" });
          return {
            ok: true,
            json: async () => ({
              accepted: true,
              entity_id: body.entity_id,
              domain: "light",
              action: body.action,
              tool_key: "home_assistant.light.set",
              state: "on",
            }),
          };
        }
        return { ok: false, status: 404, json: async () => ({ detail: "Not found" }) };
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test("browses, allow-lists, filters, and operates safe entities", async () => {
    render(<HomeAssistantView currentUser={owner} />);

    await waitFor(() => {
      expect(screen.getByText("Home Assistant online")).toBeInTheDocument();
      expect(screen.getByText("sensor.workshop_temperature")).toBeInTheDocument();
      expect(screen.getByText("light.living_room")).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: "Safe-control allow list" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Turn on" })).toBeInTheDocument();
    expect(screen.getByText("Not on the safe-control allow list.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Turn on" }));
    await waitFor(() => {
      expect(screen.getByText(/on accepted by Home Assistant/)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Area"), { target: { value: "workshop" } });
    expect(screen.getByText("sensor.workshop_temperature")).toBeInTheDocument();
    expect(screen.queryByText("light.living_room")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("light.living_room")).toBeInTheDocument();

    const movieCheckbox = screen.getByRole("checkbox", { name: /Movie night/ });
    fireEvent.click(movieCheckbox);
    fireEvent.click(screen.getByRole("button", { name: "Save safe-control allow list" }));

    await waitFor(() => {
      expect(screen.getByText("Safe-control allow list saved.")).toBeInTheDocument();
    });
  });

  test("read-only account sees no device action buttons", async () => {
    render(
      <HomeAssistantView
        currentUser={{ ...owner, id: 2, username: "viewer", role: "read_only" }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Home Assistant online")).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: "Turn on" })).not.toBeInTheDocument();
    expect(screen.getByText("This account is read-only and cannot operate Home Assistant entities.")).toBeInTheDocument();
  });
});
