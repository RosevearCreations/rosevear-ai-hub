import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { HomeInventory369 } from "./HomeInventory369";

const summary = {
  schema: "rosevear.hub.home-inventory.v369",
  mode: "OWNER_INITIATED_READ_ONLY_CAPTURE",
  providerWritesPerformed: 0,
  physicalDevicesVerified: false,
  lastCapture: { id: 1, capturedAt: "2026-11-19T20:30:00Z",
    areaCount: 2, deviceCount: 1, entityCount: 1, mqttReferenceCount: 0 },
  counts: { identities: 1, unclaimed: 1, missing: 0, unavailable: 0,
    duplicateCandidates: 0 },
  identities: [
    { id: 12, source: "ha_entity", sourceId: "sensor.workshop",
      name: "Workshop thermometer", areaId: "workshop",
      relatedDeviceId: "device-1", presence: "reported",
      claim: "unclaimed", revision: 1,
      lastSourceSeenAt: "2026-11-19T20:30:00Z",
      lastCheckedAt: "2026-11-19T20:30:00Z", possibleNameDuplicate: false },
  ],
  changes: [],
};

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("Build369 renders only for owner and never captures without owner gesture", async () => {
  const calls: { method: string; path: string; payload: unknown }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const path = String(input);
    const payload = init?.body ? JSON.parse(String(init.body)) as unknown : null;
    calls.push({ path, method, payload });
    return { ok: true, json: async () => summary };
  }));

  const viewer = render(<HomeInventory369 role="read_only" />);
  expect(viewer.container.textContent).toBe("");
  expect(calls).toHaveLength(0);
  viewer.unmount();

  render(<HomeInventory369 role="owner" />);
  expect(await screen.findByText("Workshop thermometer")).toBeInTheDocument();
  expect(calls.map((call) => call.method)).toEqual(["GET"]);
  expect(screen.getByText(/No new scanning, MQTT subscriptions/)).toBeInTheDocument();
  expect(screen.getByText("sensor.workshop", { exact: false })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Capture current HA inventory" }));
  await waitFor(() => expect(calls.some((call) =>
    call.method === "POST" && call.path.endsWith("/capture"))).toBe(true));
  fireEvent.click(screen.getByRole("button", { name: "investigate" }));
  await waitFor(() => expect(calls.some((call) =>
    call.method === "PUT" && call.path.endsWith("/claim"))).toBe(true));
  expect(calls.some((call) => /\/api\/services\//.test(call.path))).toBe(false);
});
