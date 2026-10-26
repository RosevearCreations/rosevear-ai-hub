import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  getFrigateStatus, getGo2RTCStatus, getHealth, getHomeAssistantStatus,
  getMQTTStatus, getOllamaStatus, getReleaseObservability,
} from "./api";
import { StartupRecoveryConsole } from "./StartupRecoveryConsole";

vi.mock("./api", () => ({
  getFrigateStatus: vi.fn(), getGo2RTCStatus: vi.fn(), getHealth: vi.fn(), getHomeAssistantStatus: vi.fn(),
  getMQTTStatus: vi.fn(), getOllamaStatus: vi.fn(), getReleaseObservability: vi.fn(),
}));

afterEach(() => { cleanup(); vi.resetAllMocks(); });

function seed() {
  vi.mocked(getHealth).mockResolvedValue({ status: "ok", service: "Hub", environment: "private-token" });
  vi.mocked(getHomeAssistantStatus).mockResolvedValue({ configured: true, available: true, base_url: "secret host", message: "secret token" } as never);
  vi.mocked(getMQTTStatus).mockResolvedValue({ configured: true, available: true, host: "secret broker", message: "token" } as never);
  vi.mocked(getOllamaStatus).mockResolvedValue({ available: true, base_url: "secret url", version: "1", model_count: 1, message: "token" });
  vi.mocked(getGo2RTCStatus).mockResolvedValue({ configured: true, online: true, local_api_only: true, local_rtsp_only: true } as never);
  vi.mocked(getFrigateStatus).mockResolvedValue({ configured: true, online: true, local_only: true } as never);
  vi.mocked(getReleaseObservability).mockResolvedValue({ adoption_state: "CURRENT", recovery_task: "enabled" } as never);
}

describe("Build 146 Windows operations UI", () => {
  it("is passive until explicitly refreshed, redacts source secrets and displays HOLD", async () => {
    seed();
    render(<StartupRecoveryConsole onNavigate={vi.fn()} />);
    expect(getHealth).not.toHaveBeenCalled();
    expect(screen.getByText("Windows field acceptance: HOLD")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Refresh read-only service status/ }));
    await waitFor(() => expect(getHealth).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByText(/Fresh, read-only API classifications captured/)).toBeInTheDocument());
    expect(screen.getByText(/HOLD — follow-up required/)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("secret broker");
    expect(document.body.textContent).not.toContain("secret token");
    expect(document.body.textContent).not.toContain("secret url");
    expect(screen.queryByRole("button", { name: /^restart|^stop|^repair|^reboot|^install/i })).toBeNull();
  });

  it("rejects hostile imported task JSON without rendering sensitive fields and clears it", async () => {
    seed();
    render(<StartupRecoveryConsole onNavigate={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox", { name: /Paste sanitized Windows task report/ }), { target: { value: '{"token":"credential"}' } });
    fireEvent.click(screen.getByRole("button", { name: /Validate and import task classifications/ }));
    expect(screen.getByText(/Windows evidence schema, fields or timestamp is invalid/)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('"token":"credential"');
    fireEvent.click(screen.getByRole("button", { name: "Clear session" }));
    expect(screen.getByText(/Session-only startup\/recovery review cleared/)).toBeInTheDocument();
    expect(getHealth).not.toHaveBeenCalled();
  });

  it("offers review navigation and resets manual checks on new reads", async () => {
    seed();
    const onNavigate = vi.fn();
    render(<StartupRecoveryConsole onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole("button", { name: /Refresh read-only service status/ }));
    await waitFor(() => expect(screen.getAllByRole("checkbox")).toHaveLength(6));
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    expect((screen.getAllByRole("checkbox")[0] as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /Refresh read-only service status/ }));
    await waitFor(() => expect((screen.getAllByRole("checkbox")[0] as HTMLInputElement).checked).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "Open camera review" }));
    expect(onNavigate).toHaveBeenCalledWith("Cameras");
    expect(getHealth).toHaveBeenCalledTimes(2);
  });
});
