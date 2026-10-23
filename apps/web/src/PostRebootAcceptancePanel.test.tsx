import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  getCameras, getGo2RTCStatus, getHealth, getHomeAssistantBrowser,
  getHomeAssistantStatus, getHubVersion, getMQTTStatus, getOllamaStatus,
} from "./api";
import { PostRebootAcceptancePanel } from "./PostRebootAcceptancePanel";

vi.mock("./api", () => ({
  getCameras: vi.fn(), getGo2RTCStatus: vi.fn(), getHealth: vi.fn(), getHomeAssistantBrowser: vi.fn(),
  getHomeAssistantStatus: vi.fn(), getHubVersion: vi.fn(), getMQTTStatus: vi.fn(), getOllamaStatus: vi.fn(),
}));

afterEach(() => { cleanup(); vi.resetAllMocks(); });

function mockHealthy() {
  vi.mocked(getHealth).mockResolvedValue({ status: "ok", service: "Hub", environment: "development" });
  vi.mocked(getHubVersion).mockResolvedValue({ service: "Hub", version: "0.0.4", environment: "development" });
  vi.mocked(getHomeAssistantStatus).mockResolvedValue({ configured: true, available: true, token_configured: true, url_configured: true, base_url: "private", message: "sensitive" });
  vi.mocked(getMQTTStatus).mockResolvedValue({ configured: true, available: true, host: "private" } as never);
  vi.mocked(getOllamaStatus).mockResolvedValue({ available: true, base_url: "private", version: "0.1", model_count: 1, message: "ok" });
  vi.mocked(getGo2RTCStatus).mockResolvedValue({ configured: true, online: true, version: null, api_base_url: "private", rtsp_listen: null, local_api_only: true, local_rtsp_only: true, error: null });
  vi.mocked(getHomeAssistantBrowser).mockResolvedValue({ entities: [{ entity_id: "light.workshop" }] } as never);
  vi.mocked(getCameras).mockResolvedValue([{ endpoint_uuid: "camera-uuid-1" }] as never);
}

describe("Build 117 supervised reboot screen", () => {
  it("is passive by default and requires explicit capture; does not claim independent field success", async () => {
    mockHealthy();
    render(<PostRebootAcceptancePanel onNavigate={vi.fn()} />);
    expect(getHealth).not.toHaveBeenCalled();
    expect(getCameras).not.toHaveBeenCalled();
    expect(screen.getByText("Field acceptance on hold")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Capture after manual reboot/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Capture before reboot/ }));
    await waitFor(() => expect(screen.getByText(/Private baseline captured/)).toBeInTheDocument());
    expect(getHealth).toHaveBeenCalledTimes(1);
    expect(getCameras).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Field acceptance on hold")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Show private baseline/ }));
    expect((screen.getByRole("textbox", { name: /Before-reboot JSON/ }) as HTMLTextAreaElement).value).toContain("camera-uuid-1");
    expect(document.body.textContent).not.toContain("sensitive");
    expect(screen.queryByRole("button", { name: /^restart|^reboot|^restore/i })).toBeNull();
  });

  it("shows a gated owner review and resets confirmations when recapturing", async () => {
    mockHealthy();
    const onNavigate = vi.fn();
    render(<PostRebootAcceptancePanel onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole("button", { name: /Capture before reboot/ }));
    await waitFor(() => expect(screen.getByText(/Private baseline captured/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Capture after manual reboot/ }));
    await waitFor(() => expect(screen.getByText(/Fresh post-reboot snapshot captured/)).toBeInTheDocument());
    expect(screen.getByText(/HOLD: chronological captures/)).toBeInTheDocument();
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(6);
    for (const box of boxes) fireEvent.click(box);
    // A same-millisecond response is insufficient proof of a post-reboot event.
    // Regardless of operator self-checks, this interface never asserts field acceptance.
    expect(screen.getByText(/separate approved installed-Windows handoff|HOLD: chronological captures/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Review Cameras" }));
    expect(onNavigate).toHaveBeenCalledWith("Cameras");
    fireEvent.click(screen.getByRole("button", { name: /Capture before reboot/ }));
    await waitFor(() => expect(screen.getByText(/Private baseline captured/)).toBeInTheDocument());
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(screen.getByText("Field acceptance on hold")).toBeInTheDocument();
  });

  it("validates imported private JSON and rejects secret-laden baselines", async () => {
    mockHealthy();
    render(<PostRebootAcceptancePanel onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Show private baseline/ }));
    fireEvent.change(screen.getByRole("textbox", { name: /Paste a previously saved baseline/ }), { target: { value: '{"token":"SECRET"}' } });
    fireEvent.click(screen.getByRole("button", { name: /Validate and import baseline/ }));
    expect(screen.getByText(/Unexpected fields in baseline/)).toBeInTheDocument();
    expect(getHealth).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Clear session" }));
    expect(screen.getByText(/Session-only reboot review cleared/)).toBeInTheDocument();
  });
});
