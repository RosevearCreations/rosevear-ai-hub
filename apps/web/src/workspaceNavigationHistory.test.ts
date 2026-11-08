import { describe, expect, it } from "vitest";
import {
  backWorkspaceNavigation, forwardWorkspaceNavigation, MAX_WORKSPACE_HISTORY,
  newWorkspaceNavigationHistory, sanitizeWorkspaceNavigationHistory, visitWorkspaceNavigation,
} from "./workspaceNavigationHistory";

const allowed = ["Home", "Chat", "Cameras", "System"];

describe("Build 271 session-only navigation history", () => {
  it("moves back and forward across explicitly visited screens", () => {
    const first = visitWorkspaceNavigation(newWorkspaceNavigationHistory("Home"), "Cameras", allowed);
    const second = visitWorkspaceNavigation(first, "System", allowed);
    expect(second).toEqual({ current: "System", back: ["Home", "Cameras"], forward: [] });
    const back = backWorkspaceNavigation(second, allowed);
    expect(back).toEqual({ current: "Cameras", back: ["Home"], forward: ["System"] });
    expect(forwardWorkspaceNavigation(back, allowed)).toEqual(second);
  });

  it("keeps a fresh destination from replaying a future route", () => {
    const a = visitWorkspaceNavigation(newWorkspaceNavigationHistory("Home"), "Cameras", allowed);
    const b = backWorkspaceNavigation(a, allowed);
    expect(visitWorkspaceNavigation(b, "Chat", allowed)).toEqual({ current: "Chat", back: ["Home"], forward: [] });
    expect(forwardWorkspaceNavigation(b, allowed).current).toBe("Cameras");
  });

  it("ignores current-screen repeats and disallowed destinations", () => {
    const initial = newWorkspaceNavigationHistory("Home");
    expect(visitWorkspaceNavigation(initial, "Home", allowed)).toEqual(initial);
    expect(visitWorkspaceNavigation(initial, "Secrets", allowed)).toEqual(initial);
  });

  it("removes stale privileged routes and safely returns Home after role downgrade", () => {
    const ownerHistory = {
      current: "Secrets", back: ["Home", "System", "Users"], forward: ["Audit", "Cameras"],
    };
    const limited = sanitizeWorkspaceNavigationHistory(ownerHistory, ["Home", "Cameras", "System"]);
    expect(limited).toEqual({ current: "Home", back: ["System"], forward: ["Cameras"] });
    expect(backWorkspaceNavigation(ownerHistory, ["Home", "Cameras", "System"]).current).toBe("System");
    expect(visitWorkspaceNavigation(ownerHistory, "Users", ["Home", "Cameras", "System"]).current).toBe("Home");
  });

  it("bounds memory and never stores credentials or page-level content", () => {
    const names = ["Home", ...Array.from({ length: 20 }, (_, i) => `Screen ${i}`)];
    let history = newWorkspaceNavigationHistory<string>("Home");
    for (const name of names.slice(1)) history = visitWorkspaceNavigation(history, name, names);
    expect(history.current).toBe("Screen 19");
    expect(history.back).toHaveLength(MAX_WORKSPACE_HISTORY);
    expect(history.back[0]).toBe("Screen 7");
    expect(Object.keys(history).sort()).toEqual(["back", "current", "forward"]);
  });

  it("resets completely for sign-out or session expiry", () => {
    const history = visitWorkspaceNavigation(newWorkspaceNavigationHistory("Home"), "Cameras", allowed);
    expect(newWorkspaceNavigationHistory("Home")).toEqual({ current: "Home", back: [], forward: [] });
    expect(history.back).toEqual(["Home"]);
  });

  it("does not revive malformed or disallowed history entries", () => {
    const polluted = {
      current: "Cameras", back: ["Home", "Secrets", null, "Chat", "Cameras"], forward: "Audit",
    } as unknown as ReturnType<typeof newWorkspaceNavigationHistory<string>>;
    expect(sanitizeWorkspaceNavigationHistory(polluted, allowed)).toEqual({
      current: "Cameras", back: ["Home", "Chat"], forward: [],
    });
  });
});
