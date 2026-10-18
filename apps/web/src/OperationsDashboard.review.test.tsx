import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import * as api from "./api";
import { OperationsDashboard } from "./OperationsDashboard";

vi.mock("./api", () => ({
  getHomeAssistantStatus: vi.fn(),
  getMQTTStatus: vi.fn(),
  getCameraDashboard: vi.fn(),
  getKnowledgeAdminStatus: vi.fn(),
  getBusinessConnectors: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(api.getHomeAssistantStatus).mockResolvedValue({
    configured: true, available: false, recovery_reason: "timeout",
    token: "PRIVATE_HA_SECRET",
  } as never);
  vi.mocked(api.getMQTTStatus).mockResolvedValue({
    configured: true, available: false, last_error: "password=PRIVATE_MQTT_SECRET",
  } as never);
  vi.mocked(api.getCameraDashboard).mockResolvedValue({
    total: 0, healthy: 0, attention: 0,
  } as never);
  vi.mocked(api.getKnowledgeAdminStatus).mockResolvedValue({
    document_count: 0, needs_indexing_count: 0,
  } as never);
  vi.mocked(api.getBusinessConnectors).mockResolvedValue({
    connectors: [],
  } as never);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Build 084 follow-up acknowledgement", () => {
  it("marks, reopens, keeps context-scoped views, and invalidates review on refresh", async () => {
    const navigate = vi.fn();
    const { container } = render(<OperationsDashboard role="owner" onNavigate={navigate} />);
    const markHa = "Mark Review Home Assistant connection reviewed for this snapshot";
    const reopenHa = "Reopen review of Review Home Assistant connection";
    fireEvent.click(await screen.findByRole("button", { name: markHa }));
    expect(screen.getByRole("button", { name: reopenHa }).getAttribute("aria-pressed")).toBe("true");
    expect(container.textContent).toContain("issue may remain");

    fireEvent.click(screen.getByRole("button", { name: reopenHa }));
    expect(screen.getByRole("button", { name: markHa }).getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: markHa }));
    fireEvent.click(screen.getByRole("button", { name: "Workshop" }));
    // MQTT is shared between Home and Workshop; HA does not appear in Workshop.
    expect(screen.queryByRole("button", { name: reopenHa })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    expect(screen.getByRole("button", { name: reopenHa })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Open Devices for manual review" }));
    expect(navigate).toHaveBeenCalledWith("Devices");
    fireEvent.click(screen.getByRole("button", { name: "Refresh overview" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: markHa }).getAttribute("aria-pressed")).toBe("false"));
    expect(screen.queryByRole("button", { name: reopenHa })).toBeNull();
    expect(container.textContent).not.toMatch(/PRIVATE_HA_SECRET|PRIVATE_MQTT_SECRET/);
  });
});
