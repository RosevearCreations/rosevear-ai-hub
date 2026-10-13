import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { acceptanceChecks, ReleaseAcceptancePanel, sanitizeAcceptance } from "./ReleaseAcceptancePanel";

afterEach(() => { cleanup(); window.localStorage.clear(); });

describe("Build 060 owner-operated release acceptance", () => {
  it("rejects unknown or malformed stored acceptance IDs", () => {
    expect(sanitizeAcceptance(["home-api", "admin-secret", 123, null])).toEqual(["home-api"]);
    expect(sanitizeAcceptance({ token: "secret" })).toEqual([]);
    expect(Object.values(acceptanceChecks).flat()).toHaveLength(9);
  });
  it("uses explicit owner marks and routes checks without executing service operations", () => {
    const opened: string[] = [];
    render(<ReleaseAcceptancePanel onNavigate={(section) => opened.push(section)} />);
    expect(screen.getByText(/0 of 9 owner checks/)).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: "Hub and local AI respond" }));
    expect(screen.getByText(/1 of 9 owner checks/)).toBeTruthy();
    expect(window.localStorage.getItem("rosevear-ai-hub-build-060-local-acceptance")).toContain("home-api");
    fireEvent.click(screen.getByRole("button", { name: "Workshop" }));
    expect(screen.getByText("Knowledge uses current evidence")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Open Knowledge" }));
    expect(opened).toEqual(["Knowledge"]);
    fireEvent.click(screen.getByRole("button", { name: "Reset local marks" }));
    expect(screen.getByText(/0 of 9 owner checks/)).toBeTruthy();
  });
});
