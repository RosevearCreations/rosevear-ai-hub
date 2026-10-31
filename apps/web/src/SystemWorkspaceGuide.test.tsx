import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { summarizeSystemSignals, SystemWorkspaceGuide } from "./SystemWorkspaceGuide";

afterEach(cleanup);

describe("Build 201 system source status and owner navigation", () => {
  it("distinguishes API response evidence from policy state and unavailable readings", () => {
    const statuses = summarizeSystemSignals("online", "offline", null);
    expect(statuses[0]).toMatchObject({ value: "Responding", source: "Session load · Hub health API" });
    expect(statuses[1]).toMatchObject({ value: "Unavailable", source: "Session load · Ollama status API" });
    expect(statuses[2]).toMatchObject({ value: "Disconnected", source: "Security gate · not a live probe" });
    expect(statuses[3]).toMatchObject({ value: "Not authorized", source: "Release policy · not a Windows process probe" });
    expect(summarizeSystemSignals("loading", "online", 0)[1].detail).toContain("0 model(s) reported");
    expect(summarizeSystemSignals("offline", "loading", null)[0].detail).toContain("Health request failed");
  });

  it("shows functional in-page System anchors for owner without external actions", () => {
    render(<SystemWorkspaceGuide backend="online" ollama="online" models={2} canAdminister />);
    const region = screen.getByRole("region", { name: "Build 201 system overview and navigation" });
    expect(region).toHaveTextContent("QL-275 · Under Review");
    expect(screen.getByRole("article", { name: "Hub backend source status" })).toHaveTextContent("Responding");
    const nav = screen.getByRole("navigation", { name: "System page quick navigation" });
    const hrefs = Array.from(nav.querySelectorAll("a")).map(a => a.getAttribute("href"));
    expect(hrefs).toEqual(["#hub-system-overview", "#hub-system-owner-review", "#hub-system-diagnostics", "#hub-system-connection", "#hub-system-remote"]);
    expect(region.querySelectorAll("button, input, textarea")).toHaveLength(0);
  });

  it("keeps management-only shortcuts hidden for household and read-only users", () => {
    render(<SystemWorkspaceGuide backend="loading" ollama="offline" models={null} canAdminister={false} />);
    expect(screen.queryByRole("link", { name: "Theme owner review" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Diagnostics" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "I.T. & connections" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Remote access" })).toHaveAttribute("href", "#hub-system-remote");
  });
});
