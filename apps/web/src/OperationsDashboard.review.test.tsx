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

describe("Build 090 context review summary", () => {
  it("counts pending reviews and never mistakes them for independently verified conditions", async () => {
    const { container } = render(<OperationsDashboard role="owner" onNavigate={vi.fn()} />);
    await screen.findByText(/3 not yet reviewed,\s*0 reviewed for this snapshot/);
    fireEvent.click(screen.getByRole("button", {
      name: "Mark Review Home Assistant connection reviewed for this snapshot",
    }));
    expect(screen.getByText(/2 not yet reviewed,\s*1 reviewed for this snapshot/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Workshop" }));
    expect(screen.getByText(/Current context review summary — Workshop/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Refresh overview" }));
    await waitFor(() => expect(screen.getAllByText(/0 reviewed for this snapshot/).length).toBeGreaterThan(0));
    expect(container.textContent).not.toMatch(/PRIVATE_HA_SECRET|PRIVATE_MQTT_SECRET/);
  });
});

describe("Build 091 priority triage", () => {
  it("summarizes existing priority categories and routes to known sections without provider data", async () => {
    const navigate = vi.fn();
    const { container } = render(<OperationsDashboard role="owner" onNavigate={navigate} />);
    await screen.findByRole("button", { name: "Triage in Devices" });
    expect(container.textContent).toContain("2 needs attention");
    expect(container.textContent).toContain("1 optional setup");
    fireEvent.click(screen.getByRole("button", { name: "Triage in Devices" }));
    expect(navigate).toHaveBeenCalledWith("Devices");
    fireEvent.click(screen.getByRole("button", { name: "Business" }));
    expect(screen.queryByRole("button", { name: "Triage in Devices" })).toBeNull();
    expect(container.textContent).not.toMatch(/PRIVATE_HA_SECRET|PRIVATE_MQTT_SECRET/);
  });
});

describe("Build 092 triage review visibility", () => {
  it("filters only the triage display and restores it on context switch or refresh", async () => {
    const { container } = render(<OperationsDashboard role="owner" onNavigate={vi.fn()} />);
    await screen.findByRole("button", { name: "Triage in Devices" });
    fireEvent.click(screen.getByRole("button", {
      name: "Mark Review Home Assistant connection reviewed for this snapshot",
    }));
    fireEvent.click(screen.getByRole("button", { name: "Show unreviewed triage only" }));
    expect(screen.queryByRole("button", { name: "Triage in Devices" })).toBeNull();
    expect(screen.getByRole("button", { name: "Verify in Devices" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Show all triage priorities" }));
    expect(screen.getByRole("button", { name: "Triage in Devices" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Workshop" }));
    expect(screen.getByRole("button", { name: "Show unreviewed triage only" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Show unreviewed triage only" }));
    fireEvent.click(screen.getByRole("button", { name: "Refresh overview" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Show unreviewed triage only" })).toBeTruthy());
    expect(container.textContent).not.toMatch(/PRIVATE_HA_SECRET|PRIVATE_MQTT_SECRET/);
  });
});

describe("Build 093 triage coverage and full queue visibility", () => {
  it("preserves access to all follow-ups when triage shows only the top three", async () => {
    const { container } = render(<OperationsDashboard role="owner" onNavigate={vi.fn()} />);
    await screen.findByRole("button", { name: "Triage in Devices" });
    expect(container.textContent).toContain("Read-only prioritization");
    const allQueue = screen.getByRole("region", { name: "Daily operations action queue" });
    const verification = screen.getByRole("region", { name: "Manual verification plan" });
    expect(allQueue.textContent).toContain("Review Home Assistant connection");
    expect(verification.textContent).toContain("Review Home Assistant connection");
    fireEvent.click(screen.getByRole("button", { name: "Business" }));
    expect(screen.queryByRole("button", { name: "Triage in Devices" })).toBeNull();
    expect(container.textContent).not.toMatch(/PRIVATE_HA_SECRET|PRIVATE_MQTT_SECRET/);
  });
});

describe("Build 094 triage review progress", () => {
  it("counts reviewed and pending triage without removing independent verification", async () => {
    const { container } = render(<OperationsDashboard role="owner" onNavigate={vi.fn()} />);
    await screen.findByRole("button", { name: "Triage in Devices" });
    expect(screen.getByRole("region", { name: "Operations priority triage" }).textContent).toContain("0 reviewed for this snapshot; 3 awaiting manual review.");
    fireEvent.click(screen.getByRole("button", {
      name: "Mark Review Home Assistant connection reviewed for this snapshot",
    }));
    expect(screen.getByRole("region", { name: "Operations priority triage" }).textContent).toContain("1 reviewed for this snapshot; 2 awaiting manual review.");
    expect(screen.getByRole("region", { name: "Manual verification plan" }).textContent).toContain("independent verification still required");
    fireEvent.click(screen.getByRole("button", { name: "Refresh overview" }));
    await waitFor(() => expect(screen.getByRole("region", { name: "Operations priority triage" }).textContent).toContain("0 reviewed for this snapshot;"));
    expect(container.textContent).not.toMatch(/PRIVATE_HA_SECRET|PRIVATE_MQTT_SECRET/);
  });
});

describe("Build 095 contextual first safe checks", () => {
  it("shows only service-specific manual checks for the current context and filter", async () => {
    const navigate = vi.fn();
    const { container } = render(<OperationsDashboard role="read_only" onNavigate={navigate} />);
    const triage = await screen.findByRole("region", { name: "Operations priority triage" });
    expect(triage.textContent).toContain("Open Devices and inspect the reported Home Assistant connection state");
    expect(triage.textContent).toContain("Check the broker or Home Assistant MQTT add-on directly");
    expect(triage.textContent).not.toContain("identify connectors reporting a degraded state");

    fireEvent.click(screen.getByRole("button", {
      name: "Mark Review Home Assistant connection reviewed for this snapshot",
    }));
    fireEvent.click(screen.getByRole("button", { name: "Show unreviewed triage only" }));
    expect(triage.textContent).not.toContain("Open Devices and inspect the reported Home Assistant connection state");
    expect(screen.getByRole("region", { name: "Manual verification plan" }).textContent)
      .toContain("Review Home Assistant connection");

    fireEvent.click(screen.getByRole("button", { name: "Business" }));
    expect(triage.textContent).toContain("Open Business and review the available read-only connector setup");
    expect(triage.textContent).not.toContain("Home Assistant connection state");
    fireEvent.click(screen.getByRole("button", { name: "Triage in Business" }));
    expect(navigate).toHaveBeenCalledWith("Business");

    fireEvent.click(screen.getByRole("button", { name: "Workshop" }));
    expect(triage.textContent).toContain("Open Knowledge and review the first local collection workflow");
    expect(triage.textContent).not.toContain("identify connectors reporting a degraded state");
    expect(container.textContent).not.toMatch(/PRIVATE_HA_SECRET|PRIVATE_MQTT_SECRET/);
  });

  it("changes to verification-only guidance on an unknown service after manual refresh", async () => {
    const { container } = render(<OperationsDashboard role="owner" onNavigate={vi.fn()} />);
    await screen.findByRole("button", { name: "Triage in Devices" });
    vi.mocked(api.getHomeAssistantStatus).mockRejectedValueOnce(new Error("password=PRIVATE_NEW_SECRET"));
    fireEvent.click(screen.getByRole("button", { name: "Refresh overview" }));
    const triage = screen.getByRole("region", { name: "Operations priority triage" });
    await waitFor(() => expect(triage.textContent)
      .toContain("Treat the VM and connection as unverified until confirmed separately"));
    expect(triage.textContent).not.toContain("Open Devices and inspect the reported Home Assistant connection state");
    expect(container.textContent).not.toContain("PRIVATE_NEW_SECRET");
  });
});

describe("Build 096 manual safe-check checklist progress", () => {
  it("keeps individual review steps separate from follow-up acknowledgement and resets on refresh", async () => {
    const navigate = vi.fn();
    const { container } = render(<OperationsDashboard role="read_only" onNavigate={navigate} />);
    const plan = await screen.findByRole("region", { name: "Manual verification plan" });
    const first = screen.getByRole("checkbox", {
      name: "Review safe check 1 for Review Home Assistant connection",
    });
    const second = screen.getByRole("checkbox", {
      name: "Review safe check 2 for Review Home Assistant connection",
    });
    expect(first.getAttribute("checked")).toBeNull();
    expect(plan.textContent).toContain("0 of 6 safe-check instructions reviewed");

    fireEvent.click(first);
    expect((first as HTMLInputElement).checked).toBe(true);
    expect(plan.textContent).toContain("1 of 6 safe-check instructions reviewed");
    fireEvent.click(second);
    expect(plan.textContent).toContain("2 of 6 safe-check instructions reviewed");
    expect(plan.textContent).toContain("cannot certify a repair or equipment safety");
    expect(plan.textContent).toContain("Awaiting manual review and independent verification.");
    fireEvent.click(screen.getByRole("button", { name: "Verify in Devices" }));
    expect(navigate).toHaveBeenCalledWith("Devices");

    fireEvent.click(screen.getByRole("button", {
      name: "Mark Review Home Assistant connection reviewed for this snapshot",
    }));
    expect((first as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Not yet reviewed" }));
    expect(screen.queryByRole("checkbox", {
      name: "Review safe check 1 for Review Home Assistant connection",
    })).toBeNull();
    expect(plan.textContent).toContain("2 of 6 safe-check instructions reviewed");
    fireEvent.click(screen.getByRole("button", { name: "All follow-ups" }));
    expect((screen.getByRole("checkbox", {
      name: "Review safe check 1 for Review Home Assistant connection",
    }) as HTMLInputElement).checked).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Refresh overview" }));
    await waitFor(() => expect(plan.textContent).toContain("0 of 6 safe-check instructions reviewed"));
    expect((screen.getByRole("checkbox", {
      name: "Review safe check 1 for Review Home Assistant connection",
    }) as HTMLInputElement).checked).toBe(false);
    expect(container.textContent).not.toMatch(/PRIVATE_HA_SECRET|PRIVATE_MQTT_SECRET/);
  });

  it("isolates check progress by context and does not call integrations when a checkbox changes", async () => {
    const { container } = render(<OperationsDashboard role="owner" onNavigate={vi.fn()} />);
    await screen.findByRole("checkbox", { name: "Review safe check 1 for Review Home Assistant connection" });
    const callCount = vi.mocked(api.getHomeAssistantStatus).mock.calls.length;
    fireEvent.click(screen.getByRole("checkbox", {
      name: "Review safe check 1 for Review Home Assistant connection",
    }));
    expect(vi.mocked(api.getHomeAssistantStatus).mock.calls.length).toBe(callCount);

    fireEvent.click(screen.getByRole("button", { name: "Business" }));
    const plan = screen.getByRole("region", { name: "Manual verification plan" });
    expect(plan.textContent).toContain("0 of 6 safe-check instructions reviewed");
    expect(screen.queryByRole("checkbox", {
      name: "Review safe check 1 for Review Home Assistant connection",
    })).toBeNull();
    expect(screen.getByRole("checkbox", {
      name: "Review safe check 1 for Review business connectors",
    })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Workshop" }));
    expect(plan.textContent).toContain("0 of 6 safe-check instructions reviewed");
    expect(screen.getByRole("checkbox", {
      name: "Review safe check 1 for Review knowledge collections",
    })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    expect((screen.getByRole("checkbox", {
      name: "Review safe check 1 for Review Home Assistant connection",
    }) as HTMLInputElement).checked).toBe(false);
    expect(container.textContent).not.toMatch(/PRIVATE_HA_SECRET|PRIVATE_MQTT_SECRET/);
  });
});
