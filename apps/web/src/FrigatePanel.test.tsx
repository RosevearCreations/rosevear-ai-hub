import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { FrigatePanel } from "./FrigatePanel";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("shows local Frigate cameras and recent normalized events", async () => {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/api/v1/frigate/status")) {
      return {
        ok: true,
        json: async () => ({
          configured: true,
          online: true,
          version: "0.16.2",
          base_url: "http://127.0.0.1:5000",
          local_only: true,
          error: null,
        }),
      };
    }
    if (url.endsWith("/api/v1/frigate/cameras")) {
      return {
        ok: true,
        json: async () => ({
          online: true,
          error: null,
          cameras: [{
            name: "front_door",
            enabled: true,
            detect_enabled: true,
            record_enabled: true,
            snapshots_enabled: true,
          }],
        }),
      };
    }
    if (url.includes("/api/v1/frigate/events?limit=20")) {
      return {
        ok: true,
        json: async () => ({
          online: true,
          error: null,
          events: [{
            event_id: "event-1",
            camera: "front_door",
            label: "person",
            sub_label: "visitor",
            start_time: 1728480000,
            end_time: 1728480010,
            zones: ["porch"],
            has_clip: true,
            has_snapshot: true,
            false_positive: false,
            score: 0.91,
          }],
        }),
      };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  }));

  render(<FrigatePanel />);

  expect(await screen.findByRole("heading", { name: "Frigate adapter" })).toBeInTheDocument();
  expect(screen.getByText("front_door")).toBeInTheDocument();
  expect(screen.getByText("person")).toBeInTheDocument();
  expect(screen.getByText("visitor · front_door")).toBeInTheDocument();
  expect(screen.getByText("porch")).toBeInTheDocument();
});

test("Frigate remains optional when the local service is offline", async () => {
  let refreshes = 0;
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    refreshes += 1;
    const url = String(input);
    if (url.endsWith("/api/v1/frigate/status")) {
      return {
        ok: true,
        json: async () => ({
          configured: true,
          online: false,
          version: null,
          base_url: "http://127.0.0.1:5000",
          local_only: true,
          error: "Local Frigate service is unavailable.",
        }),
      };
    }
    return {
      ok: true,
      json: async () => ({
        online: false,
        cameras: [],
        events: [],
        error: "Local Frigate service is unavailable.",
      }),
    };
  }));

  render(<FrigatePanel />);

  expect(await screen.findByText("Frigate is optional")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Refresh Frigate" }));
  await waitFor(() => expect(refreshes).toBeGreaterThanOrEqual(6));
});
