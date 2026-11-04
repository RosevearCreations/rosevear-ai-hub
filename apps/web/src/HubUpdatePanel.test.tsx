import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HubUpdatePanel } from "./HubUpdatePanel";
import { hubUpdateBlockerLabel, shouldReloadHub } from "./hubUpdateModel";

const api = vi.hoisted(() => ({
  getHubUpdateControl: vi.fn(),
  requestHubUpdate: vi.fn(),
}));
vi.mock("./api", () => api);
vi.mock("./installedHubAdoption", () => ({
  browserBuild: { sha: null, clean: true },
}));

const ready = {
  state: "ready_to_request", blockers: [], adoption_task: "configured",
  recovery_task: "enabled", adoption_state: "READY",
  active_release: "a".repeat(40), last_attempted_release: "b".repeat(40),
  journal_state: "committed", update_running: false, install_verified: false,
  release_request_sent: false, host_action_performed_by_read: false,
};
beforeEach(() => {
  api.getHubUpdateControl.mockReset();
  api.requestHubUpdate.mockReset();
});
afterEach(() => cleanup());

describe("Build 243 — owner-guided installed update", () => {
  it("compares exact source commits and avoids automatic refresh loops", () => {
    const a = "a".repeat(40);
    const b = "b".repeat(40);
    expect(shouldReloadHub(a, b, "ADOPTED", null)).toBe(true);
    expect(shouldReloadHub(a, b, "CURRENT", null)).toBe(true);
    expect(shouldReloadHub(a, b, "READY", null)).toBe(false);
    expect(shouldReloadHub(null, b, "ADOPTED", null)).toBe(false);
    expect(shouldReloadHub(a, b, "ADOPTED", b)).toBe(false);
    expect(shouldReloadHub(a, a, "ADOPTED", null)).toBe(false);
    expect(shouldReloadHub(a, "invalid", "ADOPTED", null)).toBe(false);
  });

  it("preserves non-enrolled Windows HOLD and never starts a task", async () => {
    api.getHubUpdateControl.mockResolvedValue({
      ...ready, state: "setup_or_review_required",
      blockers: ["release_task_not_enrolled", "first_supervised_activation_required"],
      adoption_task: "not_installed", active_release: null,
    });
    render(<HubUpdatePanel />);
    expect(await screen.findByText(/one-time supervised enrollment/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Install approved update" }).hasAttribute("disabled")).toBe(true);
    expect(api.requestHubUpdate).not.toHaveBeenCalled();
    expect(hubUpdateBlockerLabel("random-secrets")).toContain("local setup");
  });

  it("requires owner approval; a request never claims services restarted", async () => {
    api.getHubUpdateControl.mockResolvedValue(ready);
    api.requestHubUpdate.mockResolvedValue({
      state: "task_start_requested", installation_complete: false,
      restart_verified: false, rollback_verified: false,
    });
    render(<HubUpdatePanel />);
    await screen.findByText(/Enrolled task found/);
    const button = screen.getByRole("button", { name: "Install approved update" });
    expect(button.hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: /We approve the existing enrolled Windows task/ }));
    expect(button.hasAttribute("disabled")).toBe(false);
    fireEvent.click(button);
    await waitFor(() => expect(api.requestHubUpdate).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Installation is NOT yet confirmed/)).toBeTruthy();
    expect(screen.getByText(/No Ctrl\+F5 needed/)).toBeTruthy();
  });

  it("shows failed request without pretending the computer was updated", async () => {
    api.getHubUpdateControl.mockResolvedValue(ready);
    api.requestHubUpdate.mockRejectedValue(new Error("Owner-host-only update request refused"));
    render(<HubUpdatePanel />);
    await screen.findByText(/Enrolled task found/);
    fireEvent.click(screen.getByRole("checkbox", { name: /We approve the existing enrolled Windows task/ }));
    fireEvent.click(screen.getByRole("button", { name: "Install approved update" }));
    expect(await screen.findByText(/Owner-host-only update request refused/)).toBeTruthy();
  });
});
