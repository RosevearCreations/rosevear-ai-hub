import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { WorkspaceQuickAccess } from "./WorkspaceQuickAccess";
import {
  loadWorkspaceShortcuts, MAX_PINNED_WORKSPACES, saveWorkspaceShortcuts,
  toggleWorkspacePin, visitWorkspace, workspaceShortcutsKey,
} from "./workspaceQuickAccess";

const all = ["Home", "Chat", "System", "Devices", "Cameras", "Secrets", "Workshop", "Business"];

beforeEach(() => window.localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Build 269 personal quick access", () => {
  it("saves only allowlisted screen names with no record text or credentials", () => {
    const storage = window.localStorage;
    expect(workspaceShortcutsKey(42)).not.toBe(workspaceShortcutsKey(43));
    expect(() => workspaceShortcutsKey(0)).toThrow("Invalid local account");
    storage.setItem(workspaceShortcutsKey(42), JSON.stringify({
      version: 1,
      pinned: ["Secrets", "Home", "Home", "private-record-123", 42],
      recent: ["private-record-123", "Devices", "Chat", "Devices"],
      accessToken: "must-not-be-reused",
    }));
    const safe = loadWorkspaceShortcuts(storage, 42, ["Home", "Chat", "Devices"]);
    expect(safe).toEqual({ pinned: ["Home"], recent: ["Devices", "Chat"] });
    saveWorkspaceShortcuts(storage, 42, safe, ["Home", "Chat", "Devices"]);
    expect(storage.getItem(workspaceShortcutsKey(42))).not.toContain("must-not-be-reused");
    expect(storage.getItem(workspaceShortcutsKey(42))).not.toContain("Secrets");
    expect(storage.getItem(workspaceShortcutsKey(43))).toBeNull();
  });

  it("limits pinned and recent screens, never opens a forbidden role workspace", () => {
    let value = { pinned: [] as string[], recent: [] as string[] };
    for (const section of all) {
      value = toggleWorkspacePin(value, section, all);
      value = visitWorkspace(value, section, all);
    }
    expect(value.pinned).toHaveLength(MAX_PINNED_WORKSPACES);
    expect(value.recent).toEqual(["Business", "Workshop", "Secrets", "Cameras", "Devices"]);
    expect(visitWorkspace(value, "Secrets", ["Home", "Chat"])).toEqual({
      pinned: ["Home", "Chat"], recent: [],
    });
    expect(toggleWorkspacePin(value, "Secrets", ["Home", "Chat"]).pinned)
      .toEqual(["Home", "Chat"]);
  });

  it("fails closed for invalid storage, unrecognized versions and blocked browser storage", () => {
    window.localStorage.setItem(workspaceShortcutsKey(1), "{not valid json");
    expect(loadWorkspaceShortcuts(window.localStorage, 1, all)).toEqual({ pinned: [], recent: [] });
    window.localStorage.setItem(workspaceShortcutsKey(1), JSON.stringify({ version: 99, pinned: ["Secrets"] }));
    expect(loadWorkspaceShortcuts(window.localStorage, 1, all)).toEqual({ pinned: [], recent: [] });
    const broken = { getItem: () => { throw Error("blocked"); }, setItem: () => { throw Error("blocked"); } };
    expect(loadWorkspaceShortcuts(broken, 1, all)).toEqual({ pinned: [], recent: [] });
    expect(() => saveWorkspaceShortcuts(broken, 1, { pinned: ["Home"], recent: [] }, all))
      .not.toThrow();
  });

  it("pins the current workspace, navigates only on a click and clears shortcuts", async () => {
    const onNavigate = vi.fn();
    const { rerender } = render(<WorkspaceQuickAccess userId={17} sections={all}
      current="Home" onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole("button", { name: "Pin Home" }));
    expect(screen.getByRole("navigation", { name: "Pinned workspaces" })).toHaveTextContent("Home");
    rerender(<WorkspaceQuickAccess userId={17} sections={all} current="Devices" onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole("button", { name: "Open pinned Home" }));
    expect(onNavigate).toHaveBeenCalledWith("Home");
    expect(onNavigate).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Clear my shortcuts" }));
    await waitFor(() => expect(loadWorkspaceShortcuts(window.localStorage, 17, all))
      .toEqual({ pinned: [], recent: [] }));
  });

  it("isolates favorites between accounts and hides admin-only screens after a role downgrade", () => {
    saveWorkspaceShortcuts(window.localStorage, 4,
      { pinned: ["Secrets", "Devices"], recent: ["Secrets", "Devices"] }, all);
    const onNavigate = vi.fn();
    const { rerender } = render(<WorkspaceQuickAccess key={4} userId={4} sections={all}
      current="Home" onNavigate={onNavigate} />);
    expect(screen.getByRole("navigation", { name: "Pinned workspaces" })).toHaveTextContent("Secrets");
    rerender(<WorkspaceQuickAccess key={4} userId={4} sections={["Home", "Devices"]}
      current="Home" onNavigate={onNavigate} />);
    expect(screen.queryByRole("button", { name: "Open pinned Secrets" })).toBeNull();
    rerender(<WorkspaceQuickAccess key={5} userId={5} sections={all}
      current="Home" onNavigate={onNavigate} />);
    expect(screen.queryByRole("navigation", { name: "Pinned workspaces" })).toBeNull();
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
