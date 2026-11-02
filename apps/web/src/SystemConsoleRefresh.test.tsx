import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { consoleDestinations, SystemConsoleRefresh } from "./SystemConsoleRefresh";

afterEach(cleanup);

describe("Build 221 Standard theme owner consoles", () => {
  it("provides real, source-labelled System cards with no background sampling", () => {
    const navigation = vi.fn();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<SystemConsoleRefresh onNavigate={navigation} />);
    expect(screen.getByRole("heading", { name: "System, I.T. & management" })).toBeInTheDocument();
    expect(screen.getByText("System · existing diagnostics")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Local diagnostics" })).toHaveAttribute("href", "#hub-system-diagnostics");
    expect(screen.getByRole("link", { name: "Open Installed release review" })).toHaveAttribute("href", "#hub-system-release");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(navigation).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("switches accessible categories and routes management actions to real workspaces", () => {
    const navigation = vi.fn();
    render(<SystemConsoleRefresh onNavigate={navigation} />);
    const group = screen.getByRole("group", { name: "Console category" });
    fireEvent.click(within(group).getByRole("button", { name: "Management" }));
    expect(within(group).getByRole("button", { name: "Management" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("link", { name: "Open Owner review & findings" })).toHaveAttribute("href", "#hub-system-owner-review");
    fireEvent.click(screen.getByRole("button", { name: "Open Approvals queue" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Team access" }));
    expect(navigation.mock.calls).toEqual([["Confirmations"], ["Users"]]);
    fireEvent.click(within(group).getByRole("button", { name: "I.T." }));
    expect(screen.getByRole("link", { name: "Open Connections & safeguards" })).toHaveAttribute("href", "#hub-system-connection");
    fireEvent.click(screen.getByRole("button", { name: "Open Access and audit" }));
    expect(navigation).toHaveBeenLastCalledWith("Audit");
  });

  it("never includes invented operational statistics or side effects", () => {
    const all = Object.values(consoleDestinations).flat();
    expect(all.length).toBe(10);
    expect(all.every(item => !!item.anchor !== !!item.section)).toBe(true);
    expect(all.every(item => item.source && item.description)).toBe(true);
  });
});
