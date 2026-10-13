import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ReleaseObservabilityPanel } from "./ReleaseObservabilityPanel";
import { getReleaseObservability } from "./api";
vi.mock("./api", () => ({ getReleaseObservability: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

describe("Build 062 local release view", () => {
  it("does not auto-fetch or offer restart controls", () => {
    render(<ReleaseObservabilityPanel />);
    expect(getReleaseObservability).not.toHaveBeenCalled();
    expect(screen.getByText("No local status checked yet.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /install|restart|migrate|rollback/i })).toBeNull();
  });
  it("clearly separates task metadata from supervised acceptance", async () => {
    vi.mocked(getReleaseObservability).mockResolvedValue({
      scope: "local_read_only", adoption_state: "HOLD",
      last_attempt_utc: "2026-10-13T19:00:00Z", last_release: "a".repeat(40),
      active_release: "b".repeat(40), journal_state: "committed",
      adoption_task: "configured", recovery_task: "enabled", failure_event_610: "none",
      last_alert_recorded_utc: null, installed_runtime_verified: false,
      rollback_rehearsal_verified: false, off_machine_recovery_verified: false,
      enrollment_ready: false, reason: "Metadata only",
    });
    render(<ReleaseObservabilityPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh release evidence" }));
    await waitFor(() => expect(screen.getByText("Recorded adoption: HOLD")).toBeTruthy());
    expect(screen.getByText("Automatic-enrollment acceptance: not verified by this panel.")).toBeTruthy();
    expect(screen.getByText("configured")).toBeTruthy();
    expect(screen.getByText("aaaaaaaaaaaa")).toBeTruthy();
  });
  it("hides raw remote exception details", async () => {
    vi.mocked(getReleaseObservability).mockRejectedValue(new Error("password=SECRET"));
    render(<ReleaseObservabilityPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh release evidence" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.getByRole("alert").textContent).not.toContain("SECRET");
  });
});
