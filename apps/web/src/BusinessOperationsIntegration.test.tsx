import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { BusinessView } from "./BusinessView";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function connectorPayload() {
  return {
    framework_version: "1",
    read_only_default: true,
    write_confirmation_required: true,
    connectors: [
      {
        key: "devilndove",
        display_name: "Devil n Dove",
        description: "Private bounded read",
        planned_build: 37,
        access_mode: "approved_write",
        writes_require_confirmation: true,
        capabilities: [{ key: "catalogue.read", label: "Catalogue", access: "read_only", description: "Catalogue" }],
        status: {
          state: "configured",
          configured: true,
          available: false,
          message: "Configured, reachability unknown",
          retryable: false,
        },
      },
    ],
  };
}

describe("Business Build 058 integration", () => {
  test("readiness refresh never triggers an upstream read", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => connectorPayload(),
    }));
    vi.stubGlobal("fetch", fetchMock);
    render(<BusinessView />);
    const refresh = await screen.findByRole("button", { name: "Refresh connector readiness" });
    fireEvent.click(refresh);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls.every(([path]) => String(path).endsWith("/api/v1/business/connectors"))).toBe(true);
    expect(screen.getByText(/Not read in this session/)).toBeInTheDocument();
  });

  test("a failed repeat read cannot retain a green verification state", async () => {
    let reads = 0;
    vi.stubGlobal("fetch", vi.fn(async (path: RequestInfo | URL) => {
      if (String(path).includes("/read/catalogue")) {
        reads += 1;
        if (reads === 2) {
          return { ok: false, status: 503, json: async () => ({ detail: "Unavailable" }) };
        }
        return {
          ok: true,
          json: async () => ({
            connector_key: "devilndove",
            resource: "catalogue",
            records: [{ product_id: 42, name: "Private catalog record" }],
            next_cursor: null,
          }),
        };
      }
      return { ok: true, json: async () => connectorPayload() };
    }));
    render(<BusinessView />);
    const action = await screen.findByRole("button", { name: "Read Catalogue" });
    fireEvent.click(action);
    const ledger = screen.getByRole("region", { name: "Business operations readiness" });
    await waitFor(() => expect(within(ledger).getByText(/Read 1 record\(s\)/)).toBeInTheDocument());
    expect(ledger.textContent).not.toContain("Private catalog record");
    fireEvent.click(action);
    await waitFor(() => expect(within(ledger).getByText(/Read failed at/)).toBeInTheDocument());
    expect(within(ledger).queryByText(/Read 1 record\(s\)/)).not.toBeInTheDocument();
  });
});
