import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HomeAssistantDiscoveryPanel } from "./HomeAssistantDiscoveryPanel";
import { RECOVERY_SNAPSHOT_SCHEMA } from "./deviceRecovery";
import { getHomeAssistantBrowser } from "./api";

vi.mock("./api", () => ({ getHomeAssistantBrowser: vi.fn() }));

afterEach(cleanup);
const browser = {
  devices: [{ device_id: "d1", name: "Lamp" }],
  entities: [{ entity_id: "light.lamp", device_id: "d1", state: "on", platform: "mqtt" }],
};

function file(text: string): File {
  const item = new File([text], "inventory.json", { type: "application/json" });
  Object.defineProperty(item, "text", { value: async () => text });
  return item;
}
function upload() {
  fireEvent.change(screen.getByLabelText("Choose prior HA inventory or worklist JSON"), {
    target: { files: [file(JSON.stringify({
      schema: RECOVERY_SNAPSHOT_SCHEMA,
      captured_at: new Date(Date.now() - 60_000).toISOString(),
      home_assistant: { devices: [{ id: "d1", name: "Lamp" }, { id: "missing", name: "Absent light" }], entities: [] },
      cameras: [],
    }))] },
  });
}

describe("Build 114 owner HA discovery workbench", () => {
  beforeEach(() => {
    vi.mocked(getHomeAssistantBrowser).mockReset().mockResolvedValue(browser as never);
  });
  it("performs no discovery automatically, needs integration confirmation and current function review", async () => {
    render(<HomeAssistantDiscoveryPanel />);
    expect(getHomeAssistantBrowser).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Read fresh HA registry" })).toBeDisabled();
    upload();
    await screen.findByText(/Imported 2 HA identities/);
    fireEvent.click(screen.getByRole("button", { name: "Read fresh HA registry" }));
    await screen.findByText(/1 missing · 0 unavailable\/unknown · 1 reported/);
    expect(getHomeAssistantBrowser).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("checkbox", { name: "Verified HA physical function for Lamp" })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: "Select HA group for Lamp" }));
    fireEvent.change(screen.getByPlaceholderText("e.g. MQTT or Meross"), { target: { value: "MQTT" } });
    fireEvent.click(screen.getByRole("button", { name: /Group 1 selected/ }));
    fireEvent.change(screen.getByRole("combobox", { name: "Owner HA integration check for MQTT" }), { target: { value: "visible" } });
    const verify = screen.getByRole("checkbox", { name: "Verified HA physical function for Lamp" });
    expect(verify).toBeEnabled();
    fireEvent.click(verify);
    expect(screen.getByText(/1 open holds · 1 owner checks/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Owner HA integration check for MQTT" }), { target: { value: "attention" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Owner HA integration check for MQTT" }), { target: { value: "visible" } });
    expect(screen.getByText(/2 open holds · 0 owner checks/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Read fresh HA registry" }));
    await waitFor(() => expect(screen.getByText(/2 open holds · 0 owner checks/)).toBeInTheDocument());
    expect(screen.getByRole("checkbox", { name: "Verified HA physical function for Lamp" })).toBeDisabled();
  });

  it("holds failed reads as unknown and rejects unsupported imports without network writes", async () => {
    vi.mocked(getHomeAssistantBrowser).mockRejectedValueOnce(new Error("offline"));
    render(<HomeAssistantDiscoveryPanel />);
    upload();
    await screen.findByText(/Imported 2 HA identities/);
    fireEvent.click(screen.getByRole("button", { name: "Read fresh HA registry" }));
    await screen.findByText(/counts are unknown/);
    expect(screen.queryByText(/^0 missing ·/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Download private HA diagnosis/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Choose prior HA inventory or worklist JSON"), {
      target: { files: [file(JSON.stringify({ schema: "not-supported", token: "secret" }))] },
    });
    await screen.findByText(/Choose a Build 107 inventory or Build 110/);
    expect(getHomeAssistantBrowser).toHaveBeenCalledTimes(1);
  });
});
