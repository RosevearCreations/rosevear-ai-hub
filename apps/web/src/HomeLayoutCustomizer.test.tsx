import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { HomeLayoutCustomizer } from "./HomeLayoutCustomizer";

const widgets = {
  guide: <p>Guide content</p>,
  operations: <p>Operations content</p>,
  shortcuts: <p>Shortcuts content</p>,
};

describe("Build 273 Home widget layout controls", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

  test("reorders, hides, persists and restores an optional widget with one reset", () => {
    const { unmount } = render(<HomeLayoutCustomizer accountId={1} role="owner" widgets={widgets} />);
    const layout = screen.getByRole("region", { name: "Arrange our Home widgets" });
    const widgetLabels = () => within(layout).getAllByRole("region", { name: /widget$/ }).map(node => node.getAttribute("aria-label"));
    expect(widgetLabels()).toEqual(["Start guide widget", "Operations dashboard widget", "Local shortcuts widget"]);
    fireEvent.click(within(layout).getByRole("button", { name: "Move Local shortcuts up" }));
    expect(widgetLabels()).toEqual(["Start guide widget", "Local shortcuts widget", "Operations dashboard widget"]);
    fireEvent.click(within(layout).getByRole("button", { name: "Hide Start guide" }));
    expect(widgetLabels()).toEqual(["Local shortcuts widget", "Operations dashboard widget"]);
    expect(within(layout).getByText("Layout saved on this browser for this account.")).toBeInTheDocument();
    unmount();

    render(<HomeLayoutCustomizer accountId={1} role="owner" widgets={widgets} />);
    expect(screen.queryByRole("region", { name: "Start guide widget" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset Home layout" }));
    expect(screen.getAllByRole("region", { name: /widget$/ }).map(node => node.getAttribute("aria-label")))
      .toEqual(["Start guide widget", "Operations dashboard widget", "Local shortcuts widget"]);
    expect(screen.getByText(/saved preference was removed/)).toBeInTheDocument();
  });

  test("shows a recovery empty state when all optional widgets are hidden", () => {
    render(<HomeLayoutCustomizer accountId={2} role="household_user" widgets={widgets} />);
    for (const name of ["Start guide", "Operations dashboard", "Local shortcuts"]) {
      fireEvent.click(screen.getByRole("button", { name: `Hide ${name}` }));
    }
    expect(screen.getByRole("heading", { name: "No optional widgets are showing" })).toBeInTheDocument();
    expect(screen.queryByText("Guide content")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show Start guide" }));
    expect(screen.getByText("Guide content")).toBeInTheDocument();
  });

  test("does not share another account's layout or imply an access grant", () => {
    const { unmount } = render(<HomeLayoutCustomizer accountId={3} role="owner" widgets={widgets} />);
    fireEvent.click(screen.getByRole("button", { name: "Hide Operations dashboard" }));
    unmount();
    render(<HomeLayoutCustomizer accountId={4} role="read_only" widgets={widgets} />);
    expect(screen.getByText("Operations content")).toBeInTheDocument();
    expect(screen.getByText(/do not change permissions/)).toBeInTheDocument();
  });

  test("reports storage failures truthfully while keeping the current view usable", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("storage disabled"); });
    render(<HomeLayoutCustomizer accountId={5} role="owner" widgets={widgets} />);
    fireEvent.click(screen.getByRole("button", { name: "Hide Local shortcuts" }));
    expect(screen.getByText(/changes may not survive a refresh/)).toBeInTheDocument();
    expect(screen.queryByText("Shortcuts content")).not.toBeInTheDocument();
  });
});
