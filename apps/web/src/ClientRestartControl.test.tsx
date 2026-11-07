import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ClientRestartControl } from "./ClientRestartControl";

beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Build 245 — owner-visible client restart", () => {
  it("offers a read-only local source check without restarting anything", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 404 } as Response);
    render(<ClientRestartControl />);
    fireEvent.click(screen.getByRole("button", { name: "Restart Client" }));
    fireEvent.click(screen.getByRole("button", { name: "Verify served client code" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("remains on HOLD"));
    expect(fetch).toHaveBeenCalledWith("/src/clientReadiness262.ts", {
      cache: "no-store", credentials: "same-origin", redirect: "error",
    });
  });
  it("requires an explicit second click; cancel is a no-op", () => {
    render(<ClientRestartControl />);
    fireEvent.click(screen.getByRole("button", { name: "Restart Client" }));
    expect(screen.getByText(/does not restart Windows/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("button", { name: "Restart this client now" })).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not leave a working page if the Hub client server is offline", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("offline"));
    render(<ClientRestartControl />);
    fireEvent.click(screen.getByRole("button", { name: "Restart Client" }));
    fireEvent.click(screen.getByRole("button", { name: "Restart this client now" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Nothing was restarted"));
    expect(fetch).toHaveBeenCalledWith("/", { cache: "no-store", credentials: "same-origin" });
  });
});
