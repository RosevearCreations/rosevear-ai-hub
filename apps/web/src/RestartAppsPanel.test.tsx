import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RestartAppsPanel } from "./RestartAppsPanel";

afterEach(() => {
  cleanup();
  delete (window as Window & { __TAURI__?: unknown }).__TAURI__;
});

describe("Build 067 native desktop restart", () => {
  it("is absent in a normal browser", () => {
    render(<RestartAppsPanel />);
    expect(screen.queryByRole("button", { name: "Restart backend app" })).toBeNull();
  });

  it("requires an exact second confirmation and never passes a path or arbitrary command", async () => {
    const invoke = vi.fn().mockResolvedValue("started");
    (window as Window & { __TAURI__?: unknown }).__TAURI__ = { core: { invoke } };
    render(<RestartAppsPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Restart backend app" }));
    const confirm = screen.getByRole("button", { name: "Confirm restart" });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Restart confirmation"), {
      target: { value: "restart hub backend" },
    });
    expect(confirm).toBeDisabled();
    expect(invoke).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Restart confirmation"), {
      target: { value: "RESTART HUB BACKEND" },
    });
    fireEvent.click(confirm);
    await waitFor(() => expect(invoke).toHaveBeenCalledWith(
      "restart_hub_backend", { confirmation: "RESTART HUB BACKEND" },
    ));
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Backend restart launched/)).toBeInTheDocument();
  });

  it("launches only native client relaunch after confirmation and provides status check", async () => {
    const invoke = vi.fn().mockResolvedValue("running");
    (window as Window & { __TAURI__?: unknown }).__TAURI__ = { core: { invoke } };
    render(<RestartAppsPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Check backend restart status" }));
    await waitFor(() => expect(screen.getByText(/maintenance is still running/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Restart desktop client" }));
    fireEvent.change(screen.getByLabelText("Restart confirmation"), {
      target: { value: "RESTART HUB CLIENT" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm restart" }));
    await waitFor(() => expect(invoke).toHaveBeenCalledWith(
      "restart_hub_client", { confirmation: "RESTART HUB CLIENT" },
    ));
  });
});
