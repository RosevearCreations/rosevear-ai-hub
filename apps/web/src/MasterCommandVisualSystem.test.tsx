import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MasterCommandVisualSystem } from "./MasterCommandVisualSystem";

afterEach(() => cleanup());

const navigation = [
  { id: "overview", label: "Overview", href: "/overview" },
  { id: "devices", label: "Devices", href: "/devices" },
];

describe("Build 330 Master Shell instrument reference", () => {
  it("renders only caller-authorized workspaces and server-supplied instrument values", () => {
    render(<MasterCommandVisualSystem
      title="Original-host oversight" subtitle="Source-backed evidence only" release="330"
      currentPath="/overview" navigation={navigation}
      kpis={[{ id: "state", label: "Receiver state", value: "UNKNOWN", detail: "Fresh OFF witness required", icon: "●", tone: "warning" }]}
      workspaces={[{ id: "audit", label: "Evidence review", detail: "Read only", href: "/evidence", status: "HOLD", tone: "warning" }]}
    />);
    expect(screen.getByRole("region", { name: "Original-host oversight" })).toBeInTheDocument();
    expect(screen.getByText("UNKNOWN")).toBeInTheDocument();
    expect(screen.getByText("Fresh OFF witness required")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Evidence review/ })).toHaveAttribute("href", "/evidence");
    expect(screen.queryByText("CONNECTED")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /activate|restart|connect/i })).not.toBeInTheDocument();
  });

  it("shows explicit empty states without inventing production KPIs or workspaces", () => {
    render(<MasterCommandVisualSystem
      title="No authorized snapshot" subtitle="Waiting for source" release="330"
      currentPath="/overview" navigation={[]} kpis={[]} workspaces={[]} />);
    expect(screen.getByText("No authorized operational snapshot available.")).toBeInTheDocument();
    expect(screen.getByText("No permitted workspaces.")).toBeInTheDocument();
    expect(within(screen.getByRole("navigation", { name: "Master Shell workspaces" })).queryAllByRole("link")).toHaveLength(0);
  });

  it("marks only the exact current route and clamps sourced progress without false percentage defaults", () => {
    render(<MasterCommandVisualSystem
      title="Overview" subtitle="Source only" release="330"
      currentPath="/devices" navigation={navigation} kpis={[]}
      workspaces={[
        { id: "a", label: "Device review", detail: "Evidence", href: "/devices", status: "HOLD", tone: "warning", percent: 150 },
        { id: "b", label: "Audit", detail: "Evidence", href: "/audit", status: "UNKNOWN", tone: "neutral" },
      ]} />);
    expect(screen.getByRole("link", { name: "Devices" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current");
    expect(screen.getByLabelText("Completion 100%")).toBeInTheDocument();
    expect(screen.queryByLabelText("Completion 0%")).not.toBeInTheDocument();
  });
});
