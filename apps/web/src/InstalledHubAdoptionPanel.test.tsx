import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { InstalledHubAdoptionPanel } from "./InstalledHubAdoptionPanel";
import { getHubVersion, getReleaseObservability } from "./api";

vi.mock("./api", () => ({ getHubVersion: vi.fn(), getReleaseObservability: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

describe("Build 113 installed evidence panel", () => {
  it("only reads local release data after owner action, shows holds rather than green", async () => {
    vi.mocked(getHubVersion).mockResolvedValue({ service: "Hub", version: "0.1", environment: "dev" });
    vi.mocked(getReleaseObservability).mockResolvedValue({
      active_release: "b".repeat(40), adoption_state: "HOLD", installed_runtime_verified: false,
    } as never);
    render(<InstalledHubAdoptionPanel />);
    expect(getHubVersion).not.toHaveBeenCalled();
    expect(getReleaseObservability).not.toHaveBeenCalled();
    expect(screen.getByText(/FIELD ADOPTION HOLD/)).toBeTruthy();
    fireEvent.change(screen.getByRole("textbox", { name: "Expected main commit SHA" }), { target: { value: "a".repeat(40) } });
    fireEvent.change(screen.getByRole("textbox", { name: "Expected main GitHub Actions run" }), {
      target: { value: "https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/39892570091" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Check installed Hub evidence" }));
    await waitFor(() => expect(screen.getByText(/Responding, package 0.1/)).toBeTruthy());
    expect(getHubVersion).toHaveBeenCalledTimes(1);
    expect(getReleaseObservability).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/different release recorded/)).toBeTruthy();
    expect(screen.getByText(/FIELD ADOPTION HOLD/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^(restart|install app|apply update|restore)/i })).toBeNull();
  });

  it("handles failed local reads without exposing raw credentials", async () => {
    vi.mocked(getHubVersion).mockRejectedValue(new Error("token=SECRET"));
    vi.mocked(getReleaseObservability).mockRejectedValue(new Error("password=SECRET"));
    render(<InstalledHubAdoptionPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Check installed Hub evidence" }));
    await waitFor(() => expect(screen.getByText(/Read-only local evidence checked/)).toBeTruthy());
    expect(screen.getByText(/Unknown until checked or unavailable/)).toBeTruthy();
    expect(document.body.textContent).not.toContain("SECRET");
  });
});
