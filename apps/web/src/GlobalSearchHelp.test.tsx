import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { filterGuides, GlobalSearchHelp } from "./GlobalSearchHelp";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const ownerScreens = ["Home", "Devices", "Cameras", "System", "Workshop", "Audit", "Search & Help"];

describe("Build 222 global help and owner record search", () => {
  it("filters bundled guidance and navigates without a network call", () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    const navigate = vi.fn();
    render(<GlobalSearchHelp allowedSections={ownerScreens} canAdminister onNavigate={navigate} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "missing device" } });
    expect(screen.getByText("Home Assistant device missing from Hub")).toBeInTheDocument();
    expect(screen.queryByText("Camera offline or not supported")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open Devices" }));
    expect(navigate).toHaveBeenCalledWith("Devices");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("denies lower privilege UI access to saved record searches and hidden workspaces", () => {
    render(<GlobalSearchHelp allowedSections={["Home", "Devices", "Cameras", "Search & Help"]} canAdminister={false} onNavigate={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Search saved Hub records" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Audit" })).not.toBeInTheDocument();
    expect(filterGuides("startup", ["Devices"])).toEqual([]);
  });

  it("only queries saved records on explicit click and retains source labels", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ query: "lathe", scope: "owner_local_saved_records", results: [
      { kind: "equipment", title: "Mini lathe", detail: "lathe", section: "Workshop", source: "Saved Hub equipment registry" },
    ] }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<GlobalSearchHelp allowedSections={ownerScreens} canAdminister onNavigate={vi.fn()} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "lathe" } });
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Search saved Hub records" }));
    await waitFor(() => expect(screen.getByText("Mini lathe")).toBeInTheDocument());
    expect(screen.getByText(/Saved Hub equipment registry/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/v1/global-search?q=lathe");
  });
});
