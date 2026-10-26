import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { CardHelp, CommandPalette, filterShellSections } from "./CommandShell";

afterEach(() => cleanup());

function Harness({ sections = ["Home", "Cameras", "Workshop", "System"] }: { sections?: string[] }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("Home");
  return <>
    <button type="button" onClick={() => setOpen(true)}>Show workspace finder</button>
    <span data-testid="current-workspace">{current}</span>
    <CommandPalette open={open} sections={sections} current={current}
      onOpen={() => setOpen(true)} onClose={() => setOpen(false)} onChoose={setCurrent} />
  </>;
}

describe("Build 147 command shell", () => {
  it("matches available routes case-insensitively without inventing privileged routes", () => {
    expect(filterShellSections(["Home", "Cameras", "Knowledge"], "cam")).toEqual(["Cameras"]);
    expect(filterShellSections(["Home", "Cameras"], "workshop")).toEqual([]);
    expect(filterShellSections(["Home", "Cameras"], "  ")).toEqual(["Home", "Cameras"]);
  });

  it("opens with Ctrl+K, focuses the search and navigates only explicitly", () => {
    render(<Harness />);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(screen.getByRole("dialog", { name: "Jump to a workspace" })).toBeInTheDocument();
    const input = screen.getByRole("textbox", { name: /Search our available screens/ });
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: "cam" } });
    expect(screen.queryByRole("button", { name: /Workshop Open screen/ })).not.toBeInTheDocument();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByTestId("current-workspace")).toHaveTextContent("Cameras");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("supports Escape, returns focus and traps keyboard Tab inside the modal", () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Show workspace finder" });
    trigger.focus();
    fireEvent.click(trigger);
    const search = screen.getByRole("textbox", { name: /Search our available screens/ });
    expect(search).toHaveFocus();
    const close = screen.getByRole("button", { name: "Close workspace search" });
    close.focus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(screen.getByRole("button", { name: /System Open screen/ })).toHaveFocus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(close).toHaveFocus();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("never adds a route missing from the permitted sections array", () => {
    render(<Harness sections={["Home", "Cameras"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Show workspace finder" }));
    fireEvent.change(screen.getByRole("textbox", { name: /Search our available screens/ }), { target: { value: "Workshop" } });
    expect(screen.getByText(/No available screens match/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Workshop Open screen/ })).not.toBeInTheDocument();
  });

  it("card information expands via native keyboard-friendly details only", () => {
    const spy = vi.fn();
    render(<div onClick={spy}><CardHelp title="Source health">Snapshot status is not a physical safety certification.</CardHelp></div>);
    const summary = screen.getByText("Help: Source health");
    expect(summary.closest("details")).not.toHaveAttribute("open");
    fireEvent.click(summary.closest("summary")!);
    expect(summary.closest("details")).toHaveAttribute("open");
    expect(screen.getByText(/not a physical safety certification/)).toBeInTheDocument();
    expect(spy).toHaveBeenCalledOnce();
  });
});
