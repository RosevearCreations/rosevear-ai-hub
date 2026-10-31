import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { LocalDiagnosticsPanel } from "./LocalDiagnosticsPanel";

vi.mock("./api", () => ({
  getHealth: vi.fn(async () => ({ status: "ok" })),
  getOllamaStatus: vi.fn(async () => ({ available: true, model_count: 0 })),
  getHomeAssistantStatus: vi.fn(async () => ({ configured: false, available: false })),
  getMQTTStatus: vi.fn(async () => ({ configured: true, available: false })),
  getGo2RTCStatus: vi.fn(async () => ({ configured: false, online: false })),
}));

afterEach(cleanup);

describe("Build 203 accessible guided diagnostics", () => {
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
});
