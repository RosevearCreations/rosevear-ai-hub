import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { LocalModelHealthPanel } from "./LocalModelHealthPanel";

describe("Build 220 local model check", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("does not poll or generate until an owner requests the readback", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        sampled_at_utc: "2026-11-02T12:00:00Z", inventory_state: "available", ollama_version: "0.12.0",
        models: [{ name: "tiny:q4", size_bytes: 1024, parameter_size: "1B", quantization: "Q4" }],
        installed_disk_size_sum_bytes: 1024, installed_disk_size_note: "Reported artifacts only.",
        resident_state: "available", resident_models: [{ name: "tiny:q4", resident_size_bytes: 2048, vram_bytes: 512 }],
        probe_duration_ms: 34, host_budget: null,
      }),
    } as Response);
    render(<LocalModelHealthPanel />);
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Check local AI models/ }));
    await waitFor(() => expect(screen.getAllByText(/tiny:q4/).length).toBeGreaterThan(0));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/v1/models/ollama/health-budget");
    expect(screen.getByText(/does not generate text or run a benchmark/)).toBeTruthy();
  });

  it("distinguishes offline inventory from an empty installation", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ sampled_at_utc: "2026-11-02T12:00:00Z", inventory_state: "unavailable", models: [],
        installed_disk_size_sum_bytes: null, resident_state: "unknown", resident_models: [],
        probe_duration_ms: 20, host_budget: null }),
    } as Response);
    render(<LocalModelHealthPanel />);
    fireEvent.click(screen.getByRole("button", { name: /Check local AI models/ }));
    await waitFor(() => expect(screen.getByText(/unknown, not zero/)).toBeTruthy());
    expect(screen.queryByText(/No installed models reported/)).toBeNull();
  });
});
