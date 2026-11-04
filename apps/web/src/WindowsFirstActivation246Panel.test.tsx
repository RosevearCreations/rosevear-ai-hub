import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { WindowsFirstActivation246Panel } from "./WindowsFirstActivation246Panel";

const api = vi.hoisted(() => ({ getHubUpdateControl: vi.fn(), getHubVersion: vi.fn() }));
vi.mock("./api", () => api);
vi.mock("./installedHubAdoption", () => ({ browserBuild: { sha: null, clean: true } }));
beforeEach(() => { api.getHubUpdateControl.mockReset(); api.getHubVersion.mockReset(); });
afterEach(() => cleanup());

describe("Build 246 read-only Windows field screen", () => {
  it("does not execute a restart or claim GREEN, even when local endpoints answer", async () => {
    api.getHubUpdateControl.mockResolvedValue({ active_release: null, adoption_state: "HOLD" });
    api.getHubVersion.mockResolvedValue({ service: "hub", version: "0.0.57", environment: "development" });
    render(<WindowsFirstActivation246Panel />);
    expect(screen.getByText(/FIELD ACCEPTANCE HOLD/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Download redacted owner field receipt/ }).hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /Read installed release status/ }));
    await waitFor(() => expect(screen.getByText("0.0.57")).toBeTruthy());
    expect(screen.getByText(/not independent production installation proof/)).toBeTruthy();
    expect(screen.getByText(/original Home Assistant VM stays untouched/)).toBeTruthy();
    expect(api.getHubUpdateControl).toHaveBeenCalledTimes(1);
  });
});
