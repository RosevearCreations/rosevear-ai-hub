import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { IntegrationHealthPanel } from "./IntegrationHealthPanel";
import {
  getCameraDashboard,
  getFrigateStatus,
  getGo2RTCStatus,
  getHomeAssistantStatus,
  getMQTTStatus,
  getOllamaStatus,
} from "./api";

vi.mock("./api", () => ({
  getCameraDashboard: vi.fn(),
  getFrigateStatus: vi.fn(),
  getGo2RTCStatus: vi.fn(),
  getHomeAssistantStatus: vi.fn(),
  getMQTTStatus: vi.fn(),
  getOllamaStatus: vi.fn(),
}));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Build 067 manual integration evidence", () => {
  it("does not perform a service request or remediation on mount", () => {
    render(<IntegrationHealthPanel />);
    expect(screen.getByText(/No status requests made/)).toBeInTheDocument();
    expect(getHomeAssistantStatus).not.toHaveBeenCalled();
    expect(getMQTTStatus).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /restart|publish|reconcile/i })).toBeNull();
  });

  it("classifies independently failed requests and distinguishes empty Hub camera registry", async () => {
    vi.mocked(getHomeAssistantStatus).mockResolvedValue({
      configured: true, available: false, base_url: null,
      url_configured: true, token_configured: true, message: "secret not exposed",
    });
    vi.mocked(getMQTTStatus).mockRejectedValue(new Error("password=SECRET"));
    vi.mocked(getOllamaStatus).mockResolvedValue({
      available: true, base_url: "", version: "0.0.0", model_count: 0, message: "available",
    });
    vi.mocked(getFrigateStatus).mockResolvedValue({
      configured: false, online: false, version: null, base_url: "",
      local_only: true, error: null,
    });
    vi.mocked(getGo2RTCStatus).mockResolvedValue({
      configured: true, online: true, version: null, api_base_url: "",
      rtsp_listen: null, local_api_only: true, local_rtsp_only: true, error: null,
    });
    vi.mocked(getCameraDashboard).mockResolvedValue({
      generated_at: "2026-10-13T22:00:00Z", stale_after_seconds: 120,
      transport_online: true, transport_version: null,
      total: 0, enabled: 0, configured: 0, healthy: 0, attention: 0, cameras: [],
    });
    render(<IntegrationHealthPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Check integration health" }));
    await waitFor(() => expect(screen.getByText(/No changes made/)).toBeInTheDocument());
    expect(screen.getByText(/Home Assistant: offline/)).toBeInTheDocument();
    expect(screen.getByText(/MQTT: unavailable/)).toBeInTheDocument();
    expect(screen.getByText(/Ollama: online/)).toBeInTheDocument();
    expect(screen.getByText(/Frigate: not configured/)).toBeInTheDocument();
    expect(screen.getByText(/go2rtc: online/)).toBeInTheDocument();
    expect(screen.getByText(/0 Hub camera record\(s\)/)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("SECRET");
  });
});
