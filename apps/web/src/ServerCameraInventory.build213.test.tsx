import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { ServerCameraInventory } from "./ServerCameraInventory";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Build 213 camera inventory diagnostics", () => {
  it("explains unknown providers and unverified feeds without connecting or exposing credentials", async () => {
    const requests: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push(`${init?.method ?? "GET"} ${String(input)}`);
      if (String(input).endsWith("/api/v1/camera-compatibility")) return { ok: true, json: async () => [{
        id: 9, brand: "Blink", model: "B-9", location: "", method: "manufacturer",
        evidence: "Do-not-display-credentials", revision: 2, approved_by_user_id: 1, approved_at: "2026-11-01T00:00:00Z",
      }] };
      return { ok: false, status: 404, json: async () => ({ detail: "Unavailable" }) };
    }));
    const { container } = render(<ServerCameraInventory canAdminister={false} isOwner={false} />);
    const section = screen.getByRole("region", { name: "Build 213 camera source compatibility and connection diagnostics" });
    expect(section).toHaveTextContent("Bell / Alarm.com");
    expect(section).toHaveTextContent("No model recorded — capability unknown");
    await waitFor(() => expect(container).toHaveTextContent("Owner-reviewed connection plan — live feed unverified"));
    expect(container).not.toHaveTextContent("Do-not-display-credentials");
    expect(requests).toEqual([expect.stringMatching(/^GET .*camera-compatibility$/)]);
  });
});
