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

describe("Build 085 dashboard manual comparison", () => {
  it("shows changes only after a second manual sample and does not leak provider details", async () => {
    const navigate = vi.fn();
    const { container } = render(<OperationsDashboard role="owner" onNavigate={navigate} />);
    await screen.findByText("No comparison yet. Refresh overview to compare two manual snapshots.");
    vi.mocked(api.getHomeAssistantStatus).mockResolvedValueOnce({
      configured: true, available: true, token: "HIDDEN_TOKEN",
    } as never);
    vi.mocked(api.getMQTTStatus).mockRejectedValueOnce(
      new Error("password=HIDDEN_MQTT_PASSWORD"));
    fireEvent.click(screen.getByRole("button", { name: "Refresh overview" }));
    await screen.findByText(/Verification is no longer available/);
    expect(container.textContent).toContain("Now reports ready");
    expect(container.textContent).toContain("not safety certification");
    fireEvent.click(screen.getByRole("button", { name: "Workshop" }));
    expect(container.textContent).toContain("Verification is no longer available");
    expect(container.textContent).not.toContain("Now reports ready");
    fireEvent.click(screen.getByRole("button", { name: "Business" }));
    expect(container.textContent).toContain("Verification is no longer available");
    fireEvent.click(screen.getByRole("button", { name: "Open MQTT to verify" }));
    expect(navigate).toHaveBeenCalledWith("MQTT");
    expect(container.textContent).not.toMatch(/HIDDEN_TOKEN|HIDDEN_MQTT_PASSWORD/);
  });
});

describe("Build 086 private report UI", () => {
  it("shows report only on demand, updates review acknowledgement, isolates context and hides on refresh", async () => {
    const navigate = vi.fn();
    render(<OperationsDashboard role="owner" onNavigate={navigate} />);
    const show = () => screen.getByRole("button", { name: "Show private handoff report" });
    await waitFor(() => expect(show().hasAttribute("disabled")).toBe(false));
    expect(screen.queryByRole("textbox", { name: "Copyable operations handoff report" })).toBeNull();
    fireEvent.click(show());
    const report = () => screen.getByRole("textbox", { name: "Copyable operations handoff report" }) as HTMLTextAreaElement;
    expect(report().readOnly).toBe(true);
    expect(report().value).toContain("Compared with: unavailable");
    expect(report().value).toContain("Review Home Assistant connection");
    expect(report().value).not.toMatch(/PRIVATE_HA_SECRET|PRIVATE_MQTT_SECRET/);
    fireEvent.click(screen.getByRole("button", {
      name: "Mark Review Home Assistant connection reviewed for this snapshot",
    }));
    expect(report().value).toContain("Reviewed for this snapshot, NOT resolved");
    fireEvent.click(screen.getByRole("button", { name: "Workshop" }));
    expect(screen.queryByRole("textbox", { name: "Copyable operations handoff report" })).toBeNull();
    fireEvent.click(show());
    expect(report().value).not.toContain("Review Home Assistant connection");
    expect(report().value).toContain("MQTT");
    fireEvent.click(screen.getByRole("button", { name: "Refresh overview" }));
    await waitFor(() => expect(show().hasAttribute("disabled")).toBe(false));
    expect(screen.queryByRole("textbox", { name: "Copyable operations handoff report" })).toBeNull();
    fireEvent.click(show());
    expect(report().value).toContain("Compared with:");
    expect(report().value).not.toContain("Compared with: unavailable");
  });
});

describe("Build 087 manual handoff acceptance", () => {
  it("requires deliberate visibility, allows reopening, and resets on context change and refresh", async () => {
    render(<OperationsDashboard role="owner" onNavigate={vi.fn()} />);
    const acceptance = () => screen.getByRole("button", { name: "Mark handoff reviewed (not resolved)" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Show private handoff report" }).hasAttribute("disabled")).toBe(false));
    expect(acceptance().hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Show private handoff report" }));
    fireEvent.click(acceptance());
    expect(screen.getByText(/Handoff reviewed for this snapshot only/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reopen handoff review" }));
    expect(screen.getByText("Handoff not yet reviewed for this snapshot.")).toBeTruthy();
    fireEvent.click(acceptance());
    fireEvent.click(screen.getByRole("button", { name: "Workshop" }));
    expect(screen.getByText("Handoff not yet reviewed for this snapshot.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Show private handoff report" }));
    fireEvent.click(acceptance());
    fireEvent.click(screen.getByRole("button", { name: "Refresh overview" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Show private handoff report" }).hasAttribute("disabled")).toBe(false));
    expect(screen.getByText("Handoff not yet reviewed for this snapshot.")).toBeTruthy();
  });
});

describe("Build 088 verification planner", () => {
  it("keeps independently required verification visible after review and scopes by context", async () => {
    const navigate = vi.fn();
    const { container } = render(<OperationsDashboard role="owner" onNavigate={navigate} />);
    await screen.findByRole("button", { name: "Verify in Devices" });
    expect(container.textContent).toContain("Awaiting manual review and independent verification.");
    fireEvent.click(screen.getByRole("button", {
      name: "Mark Review Home Assistant connection reviewed for this snapshot",
    }));
    expect(container.textContent).toContain("independent verification still required.");
    fireEvent.click(screen.getByRole("button", { name: "Verify in Devices" }));
    expect(navigate).toHaveBeenCalledWith("Devices");
    fireEvent.click(screen.getByRole("button", { name: "Business" }));
    expect(screen.queryByRole("button", { name: "Verify in Devices" })).toBeNull();
    expect(container.textContent).not.toMatch(/PRIVATE_HA_SECRET|PRIVATE_MQTT_SECRET/);
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    fireEvent.click(screen.getByRole("button", { name: "Refresh overview" }));
    await waitFor(() => expect(container.textContent).toContain("Awaiting manual review and independent verification."));
  });
});

describe("Build 089 verification queue view", () => {
  it("filters reviewed follow-ups without claiming verification and resets on context and refresh", async () => {
    const { container } = render(<OperationsDashboard role="owner" onNavigate={vi.fn()} />);
    await screen.findByRole("button", { name: "Verify in Devices" });
    fireEvent.click(screen.getByRole("button", { name: "Not yet reviewed" }));
    expect(screen.getByRole("button", { name: "Not yet reviewed" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", {
      name: "Mark Review Home Assistant connection reviewed for this snapshot",
    }));
    expect(screen.queryByRole("button", { name: "Verify in Devices" })).toBeNull();
    expect(container.textContent).toContain("independent verification");
    fireEvent.click(screen.getByRole("button", { name: "All follow-ups" }));
    expect(screen.getByRole("button", { name: "Verify in Devices" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Workshop" }));
    expect(screen.getByRole("button", { name: "All follow-ups" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Not yet reviewed" }));
    fireEvent.click(screen.getByRole("button", { name: "Refresh overview" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "All follow-ups" }).getAttribute("aria-pressed")).toBe("true"));
    expect(container.textContent).not.toMatch(/PRIVATE_HA_SECRET|PRIVATE_MQTT_SECRET/);
  });
});
