import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { HomeAssistantBrowserResponse, HomeAssistantControlPolicy } from "./api";
import { SceneDraftWorkbench } from "./SceneDraftWorkbench";

const browser: HomeAssistantBrowserResponse = {
  area_count: 1, device_count: 1, domain_count: 2, entity_count: 2,
  areas: [], devices: [], domains: [],
  entities: [
    { entity_id: "light.lounge", domain: "light", state: "off", friendly_name: "Lounge lamp",
      area_id: null, area_name: "Living room", device_id: null, device_name: null,
      platform: null, icon: null, unit_of_measurement: null, device_class: null,
      last_changed: null, last_updated: null, attributes: {} },
    { entity_id: "switch.kiln", domain: "switch", state: "off", friendly_name: "Workshop kiln",
      area_id: null, area_name: "Workshop", device_id: null, device_name: null,
      platform: null, icon: null, unit_of_measurement: null, device_class: null,
      last_changed: null, last_updated: null, attributes: {} },
  ],
};
const policy: HomeAssistantControlPolicy = {
  allowed_entity_ids: ["light.lounge", "switch.kiln"],
  candidates: [
    { entity_id: "light.lounge", domain: "light", state: "off", friendly_name: "Lounge lamp", allowed: true, blocked_reason: null },
    { entity_id: "switch.kiln", domain: "switch", state: "off", friendly_name: "Workshop kiln", allowed: true, blocked_reason: null },
  ],
};

describe("scene draft workbench", () => {
  const calls: { path: string; payload: unknown }[] = [];
  beforeEach(() => {
    calls.length = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      calls.push({ path, payload: JSON.parse(String(init?.body)) });
      if (path.endsWith("/preview")) return { ok: true, json: async () => ({
        preview_id: "preview-token-123456789012345", confirmation_phrase: "RUN 12345678",
        expires_in_seconds: 120, warning: "Preview only",
        actions: [{ entity_id: "light.lounge", action: "on", friendly_name: "Lounge lamp",
          current_state: "off", expected_effect: "on" }],
      }) };
      if (path.endsWith("/execute")) return { ok: true, json: async () => ({
        outcome: "unverified", preview_id: "preview-token-123456789012345",
        warning: "Not proof of physical action",
        receipts: [{ entity_id: "light.lounge", action: "on", outcome: "unverified",
          observed_state: "off", detail: "Provider accepted but source did not change." }],
      }) };
      return { ok: false, status: 404, json: async () => ({}) };
    }));
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  test("requires explicit preview and exact phrase; renders non-success receipts", async () => {
    render(<SceneDraftWorkbench role="owner" browser={browser} policy={policy} />);
    expect(screen.getAllByRole("option").map((option) => option.textContent?.trim()))
      .toEqual(["Choose an approved entity", "Living room · Lounge lamp (light.lounge)", "Turn on", "Turn off"]);
    fireEvent.change(screen.getByLabelText("Scene target entity"), { target: { value: "light.lounge" } });
    fireEvent.click(screen.getByRole("button", { name: "Add draft step" }));
    expect(calls).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Preview scene — no action" }));
    await screen.findByRole("region", { name: "Scene confirmation preview" });
    expect(calls).toHaveLength(1);
    expect(calls[0].path).toContain("/preview");
    expect(screen.getByRole("button", { name: "Confirm and execute once" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Confirm scene phrase"), { target: { value: "RUN incorrect" } });
    expect(screen.getByRole("button", { name: "Confirm and execute once" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Confirm scene phrase"), { target: { value: "RUN 12345678" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm and execute once" }));
    await waitFor(() => expect(screen.getByText("Observed result: unverified")).toBeInTheDocument());
    expect(screen.getByText(/Provider accepted but source did not change/)).toBeInTheDocument();
    expect(calls).toHaveLength(2);
    expect(calls[1].path).toContain("/execute");
    expect(screen.queryByRole("button", { name: "Confirm and execute once" })).not.toBeInTheDocument();
  });

  test("editing a plan invalidates its preview; read-only accounts cannot issue requests", async () => {
    const { rerender } = render(<SceneDraftWorkbench role="owner" browser={browser} policy={policy} />);
    fireEvent.change(screen.getByLabelText("Scene target entity"), { target: { value: "light.lounge" } });
    fireEvent.click(screen.getByRole("button", { name: "Add draft step" }));
    fireEvent.click(screen.getByRole("button", { name: "Preview scene — no action" }));
    await screen.findByRole("region", { name: "Scene confirmation preview" });
    fireEvent.click(screen.getByRole("button", { name: "Remove scene step 1" }));
    expect(screen.queryByRole("region", { name: "Scene confirmation preview" })).not.toBeInTheDocument();
    expect(calls).toHaveLength(1);
    rerender(<SceneDraftWorkbench role="read_only" browser={browser} policy={policy} />);
    expect(screen.getByText(/Only Owner\/Administrator can preview or execute/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Preview scene — no action" })).not.toBeInTheDocument();
  });
});
