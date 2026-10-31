import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { LocalDiagnosticsPanel, classifyDiagnosticChange } from "./LocalDiagnosticsPanel";

vi.mock("./api", () => ({
  getHealth: vi.fn(async () => ({ status: "ok" })),
  getOllamaStatus: vi.fn(async () => ({ available: true, model_count: 0 })),
  getHomeAssistantStatus: vi.fn(async () => ({ configured: false, available: false })),
  getMQTTStatus: vi.fn(async () => ({ configured: true, available: false })),
  getGo2RTCStatus: vi.fn(async () => ({ configured: false, online: false })),
}));

afterEach(cleanup);

describe("Build 203 accessible guided diagnostics", () => {
  it("classifies only sanitized source-state transitions for manual owner follow-up", () => {
    expect(classifyDiagnosticChange("ready", "attention")).toBe("Needs manual inspection");
    expect(classifyDiagnosticChange("attention", "unknown")).toContain("not verified");
    expect(classifyDiagnosticChange("attention", "ready")).toContain("verify the actual service");
    expect(classifyDiagnosticChange("ready", "ready")).toBe("No classification change");
  });
  it("shows source-scoped priorities and filters last sampled results without executing repair actions", async () => {
    const navigate = vi.fn();
    render(<LocalDiagnosticsPanel onNavigate={navigate} />);
    const guide = await screen.findByRole("region", { name: "Guided service diagnostics readback" });
    expect(guide).toHaveTextContent("2 needs attention");
    expect(guide).toHaveTextContent("Start with Ollama");
    const filters = within(guide).getByRole("group", { name: "Filter diagnostic service readings" });
    expect(within(filters).getByRole("button", { name: "All readings (5)" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(within(filters).getByRole("button", { name: "Needs attention (2)" }));
    expect(within(filters).getByRole("button", { name: "Needs attention (2)" })).toHaveAttribute("aria-pressed", "true");
    expect(document.querySelectorAll(".local-diagnostic-card")).toHaveLength(2);
    expect(document.querySelector("#hub-diagnostic-ollama")).toBeInTheDocument();
    expect(document.querySelector("#hub-diagnostic-mqtt")).toBeInTheDocument();
    fireEvent.click(within(filters).getByRole("button", { name: "Not verified (0)" }));
    expect(document.querySelectorAll(".local-diagnostic-card")).toHaveLength(0);
    expect(screen.getByRole("status", { name: "" })).toHaveTextContent("No services in this category");
    fireEvent.click(within(filters).getByRole("button", { name: "All readings (5)" }));
    expect(document.querySelectorAll(".local-diagnostic-card")).toHaveLength(5);
    expect(navigate).not.toHaveBeenCalled();
  });
  it("compares only the two latest sanitized service classifications after an explicit refresh", async () => {
    render(<LocalDiagnosticsPanel onNavigate={vi.fn()} />);
    const comparison = await screen.findByRole("region", { name: "Diagnostic source snapshot comparison" });
    expect(comparison).toHaveTextContent("No earlier snapshot to compare");
    fireEvent.click(screen.getByRole("button", { name: "Refresh diagnostics" }));
    expect(await within(comparison).findByText(/0 changed · 5 unchanged/)).toBeInTheDocument();
    expect(comparison).toHaveTextContent("Available → Available (unchanged)");
    expect(within(comparison).getByRole("link", { name: "Review Hub API manual checks" })).toHaveAttribute("href", "#hub-diagnostic-hub");
    expect(comparison).not.toHaveTextContent("127.0.0.1");
    expect(within(comparison).getByLabelText("Diagnostic sampling sequence")).toHaveTextContent("2 completed on-demand sample(s)");
    const followupFilter = within(comparison).getByRole("group", { name: "Diagnostic comparison follow-up filter" });
    fireEvent.click(within(followupFilter).getByRole("button", { name: "Changed only (0)" }));
    expect(within(followupFilter).getByRole("button", { name: "Changed only (0)" })).toHaveAttribute("aria-pressed", "true");
    expect(comparison).toHaveTextContent("No changed service classifications");
    expect(within(comparison).getByRole("region", { name: "Owner diagnostic exception triage" })).toHaveTextContent("0 to review");
    fireEvent.click(within(followupFilter).getByRole("button", { name: "All compared services (5)" }));
    expect(within(comparison).getAllByRole("link")).toHaveLength(5);
    fireEvent.click(within(comparison).getByRole("button", { name: "Clear comparison (keep latest reading)" }));
    expect(comparison).toHaveTextContent("No earlier snapshot to compare");
    expect(screen.getByRole("region", { name: "Guided service diagnostics readback" })).toHaveTextContent("2 needs attention");
    fireEvent.click(screen.getByRole("button", { name: "Refresh diagnostics" }));
    expect(await within(comparison).findByText(/0 changed · 5 unchanged/)).toBeInTheDocument();
    expect(within(comparison).getByLabelText("Diagnostic sampling sequence")).toHaveTextContent("3 completed on-demand sample(s)");
  });
});
