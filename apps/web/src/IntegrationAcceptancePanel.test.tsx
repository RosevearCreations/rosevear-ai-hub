import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { IntegrationAcceptancePanel } from "./IntegrationAcceptancePanel";
import { getHomeAssistantEntities, getHomeAssistantStatus, getMQTTStatus } from "./api";

vi.mock("./api", () => ({
  getHomeAssistantEntities: vi.fn(),
  getHomeAssistantStatus: vi.fn(),
  getMQTTStatus: vi.fn(),
}));

afterEach(() => { cleanup(); vi.resetAllMocks(); });

function ha(available: boolean) {
  return {
    configured: true, available, base_url: "http://secret-ha.local",
    token_configured: true, url_configured: true,
    recovery_reason: available ? "connected" : "timeout",
    message: "Bearer SECRET_TOKEN",
  };
}
function mqtt(available: boolean, generation: number) {
  return {
    configured: true, available, host: "secret-broker", port: 1883,
    tls: false, username_configured: true, password_configured: true,
    allowed_topics: ["secret/topic/#"], subscriptions: ["secret/topic/state"],
    reconnect_min_seconds: 1, reconnect_max_seconds: 30, message_count: 1,
    last_error: "password=SECRET_TOKEN", message: "SECRET_TOKEN",
    recovery_reason: available ? "connected" : "disconnected_reconnecting",
    connect_generation: generation,
    last_connected_at: "2026-10-14T12:00:00Z",
    last_disconnected_at: null,
  };
}

describe("Build 069 manual acceptance checks", () => {
  it("does not issue network checks or publish, subscribe, or restart on mount", () => {
    render(<IntegrationAcceptancePanel />);
    expect(getHomeAssistantStatus).not.toHaveBeenCalled();
    expect(getHomeAssistantEntities).not.toHaveBeenCalled();
    expect(getMQTTStatus).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Recheck connections" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /restart|publish|subscribe/i })).toBeNull();
  });

  it("compares two manual samples and proves a callback transition, never exposes private source data", async () => {
    vi.mocked(getHomeAssistantStatus).mockResolvedValue(ha(true));
    vi.mocked(getHomeAssistantEntities).mockResolvedValue({ count: 9, entities: [] });
    vi.mocked(getMQTTStatus)
      .mockResolvedValueOnce(mqtt(true, 1))
      .mockResolvedValueOnce(mqtt(true, 2));
    render(<IntegrationAcceptancePanel />);
    fireEvent.click(screen.getByRole("button", { name: "Capture baseline" }));
    await waitFor(() => expect(screen.getByText(/9 entities visible/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Recheck connections" }));
    await waitFor(() =>
      expect(screen.getByText(/connection transition was observed/)).toBeInTheDocument(),
    );
    expect(getHomeAssistantEntities).toHaveBeenCalledTimes(2);
    expect(getMQTTStatus).toHaveBeenCalledTimes(2);
    for (const forbidden of ["secret-ha", "secret-broker", "SECRET_TOKEN", "secret/topic"]) {
      expect(document.body.textContent).not.toContain(forbidden);
    }
  });

  it("reports stable connectivity rather than falsely claiming an MQTT reconnect", async () => {
    vi.mocked(getHomeAssistantStatus).mockResolvedValue(ha(true));
    vi.mocked(getHomeAssistantEntities).mockResolvedValue({ count: 0, entities: [] });
    vi.mocked(getMQTTStatus).mockResolvedValue(mqtt(true, 5));
    render(<IntegrationAcceptancePanel />);
    fireEvent.click(screen.getByRole("button", { name: "Capture baseline" }));
    await waitFor(() => expect(screen.getByText(/zero entities visible/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Recheck connections" }));
    await waitFor(() => expect(screen.getByText(/no reconnect event verified/)).toBeInTheDocument());
  });

  it("separates HA API reachability from entity-read acceptance", async () => {
    vi.mocked(getHomeAssistantStatus).mockResolvedValue(ha(true));
    vi.mocked(getHomeAssistantEntities).mockRejectedValue(new Error("SECRET_TOKEN"));
    vi.mocked(getMQTTStatus).mockResolvedValue(mqtt(true, 1));
    render(<IntegrationAcceptancePanel />);
    fireEvent.click(screen.getByRole("button", { name: "Capture baseline" }));
    await waitFor(() =>
      expect(screen.getByText(/entity read unverified/)).toBeInTheDocument(),
    );
    expect(document.body.textContent).not.toContain("SECRET_TOKEN");
  });

  it("does not request entities if HA is unavailable; records recovery when both later connect", async () => {
    vi.mocked(getHomeAssistantStatus)
      .mockResolvedValueOnce(ha(false))
      .mockResolvedValueOnce(ha(true));
    vi.mocked(getMQTTStatus)
      .mockResolvedValueOnce(mqtt(false, 1))
      .mockResolvedValueOnce(mqtt(true, 2));
    vi.mocked(getHomeAssistantEntities).mockResolvedValue({ count: 3, entities: [] });
    render(<IntegrationAcceptancePanel />);
    fireEvent.click(screen.getByRole("button", { name: "Capture baseline" }));
    await waitFor(() => expect(screen.getByText(/API unavailable/)).toBeInTheDocument());
    expect(getHomeAssistantEntities).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Recheck connections" }));
    await waitFor(() =>
      expect(screen.getByText(/manual recovery observed/)).toBeInTheDocument(),
    );
    expect(getHomeAssistantEntities).toHaveBeenCalledTimes(1);
  });
});
