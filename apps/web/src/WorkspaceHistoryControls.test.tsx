import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { WorkspaceHistoryControls } from "./WorkspaceHistoryControls";
import {
  backWorkspaceNavigation, forwardWorkspaceNavigation, newWorkspaceNavigationHistory,
  visitWorkspaceNavigation,
} from "./workspaceNavigationHistory";

afterEach(cleanup);

function Harness({ allowed = ["Home", "Cameras", "System"] }: { allowed?: string[] }) {
  const [history, setHistory] = useState(newWorkspaceNavigationHistory<string>("Home"));
  return <>
    <span data-testid="screen">{history.current}</span>
    <button onClick={() => setHistory(h => visitWorkspaceNavigation(h, "Cameras", allowed))}>Visit Cameras</button>
    <button onClick={() => setHistory(h => visitWorkspaceNavigation(h, "System", allowed))}>Visit System</button>
    <WorkspaceHistoryControls history={history} allowed={allowed}
      onBack={() => setHistory(h => backWorkspaceNavigation(h, allowed))}
      onForward={() => setHistory(h => forwardWorkspaceNavigation(h, allowed))}
      onHome={() => setHistory(h => visitWorkspaceNavigation(h, "Home", allowed))} />
  </>;
}

describe("Build 271 history controls", () => {
  it("starts disabled, then exposes explicit Back, Forward and Home routes", () => {
    render(<Harness />);
    expect(screen.getByRole("button", { name: "No previous workspace" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "No next workspace" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Return to Home workspace" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Visit Cameras" }));
    fireEvent.click(screen.getByRole("button", { name: "Visit System" }));
    fireEvent.click(screen.getByRole("button", { name: "Back to Cameras" }));
    expect(screen.getByTestId("screen")).toHaveTextContent("Cameras");
    fireEvent.click(screen.getByRole("button", { name: "Forward to System" }));
    expect(screen.getByTestId("screen")).toHaveTextContent("System");
    fireEvent.click(screen.getByRole("button", { name: "Return to Home workspace" }));
    expect(screen.getByTestId("screen")).toHaveTextContent("Home");
  });

  it("does not offer a stale restricted screen on an account with fewer permissions", () => {
    const spy = vi.fn();
    render(<WorkspaceHistoryControls history={{ current: "Secrets", back: ["Users"], forward: ["Audit"] }}
      allowed={["Home", "Cameras"]} onBack={spy} onForward={spy} onHome={spy} />);
    expect(screen.getByRole("button", { name: "No previous workspace" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "No next workspace" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Return to Home workspace" })).toBeDisabled();
    expect(spy).not.toHaveBeenCalled();
  });
});
