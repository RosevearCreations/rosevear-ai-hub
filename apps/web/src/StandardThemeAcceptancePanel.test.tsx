import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StandardThemeAcceptancePanel } from "./StandardThemeAcceptancePanel";

afterEach(cleanup);

describe("Build 194 actual Standard theme owner review", () => {
  it("starts unreviewed and exports only explicitly marked, session-only visual feedback", () => {
    render(<StandardThemeAcceptancePanel role="owner" appearance="standard" density="comfortable" />);
    expect(screen.getByLabelText("Standard theme owner review status")).toHaveTextContent("INCOMPLETE_OWNER_SCREEN_REVIEW");
    fireEvent.click(screen.getByRole("button", { name: "Prepare local visual-review report" }));
    let report = JSON.parse(screen.getByLabelText("Build 194 sanitized Standard theme review report").textContent || "{}");
    expect(report.reviewedAreas).toBe(0);
    expect(report.integrationTestAuthorization).toBe("NOT_GIVEN");
    expect(report.independentlyWitnessedOwnerAcceptance).toBe("NOT_VERIFIED");
    const selects = screen.getAllByRole("combobox", { name: "Review finding" });
    expect(selects).toHaveLength(5);
    selects.forEach(select => fireEvent.change(select, { target: { value: "acceptable" } }));
    expect(screen.getByLabelText("Standard theme owner review status")).toHaveTextContent("ALL_AREAS_MARKED_ACCEPTABLE_LOCALLY");
    fireEvent.click(screen.getByRole("button", { name: "Prepare local visual-review report" }));
    report = JSON.parse(screen.getByLabelText("Build 194 sanitized Standard theme review report").textContent || "{}");
    expect(report.reviewedAreas).toBe(5);
    expect(report.savedToBackend).toBe(false);
    expect(report.authenticatedGatewayGets).toBe(0);
    fireEvent.change(selects[2], { target: { value: "needs_change" } });
    expect(screen.getByLabelText("Standard theme owner review status")).toHaveTextContent("CHANGES_REQUESTED_IN_LOCAL_REVIEW");
    expect(screen.getByLabelText("Build 194 sanitized Standard theme review report")).toHaveTextContent("No owner visual-review report prepared");
    fireEvent.click(screen.getByRole("button", { name: "Reset this session's review" }));
    expect(screen.getByLabelText("Standard theme owner review status")).toHaveTextContent("INCOMPLETE_OWNER_SCREEN_REVIEW");
  });

  it("prevents an administrator from declaring owner visual acceptance", () => {
    render(<StandardThemeAcceptancePanel role="administrator" appearance="high-contrast" density="compact" />);
    expect(screen.getByRole("note")).toHaveTextContent("Administrator view only");
    expect(screen.getByRole("button", { name: "Prepare local visual-review report" })).toBeDisabled();
    expect(screen.getAllByRole("combobox", { name: "Review finding" })).toHaveLength(5);
    screen.getAllByRole("combobox", { name: "Review finding" }).forEach(select => expect(select).toBeDisabled());
  });

  it("routes to actual workspaces and records a fixed, safe issue/retest queue without claiming a fix", () => {
    const onNavigate = vi.fn();
    render(<StandardThemeAcceptancePanel role="owner" appearance="standard" density="comfortable" onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole("button", { name: "Open Management workspaces workspace for review" }));
    expect(onNavigate).toHaveBeenCalledWith("Business");
    const selections = screen.getAllByRole("combobox", { name: "Review finding" });
    fireEvent.change(selections[2], { target: { value: "needs_change" } });
    expect(screen.getByRole("region", { name: "Standard theme visual issue follow-up queue" })).toHaveTextContent("1 open visual findings");
    fireEvent.change(screen.getByRole("combobox", { name: "Issue category" }), { target: { value: "navigation" } });
    expect(screen.getByRole("button", { name: "Record visual retest (not a code fix)" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Request engineering follow-up" }));
    fireEvent.click(screen.getByRole("button", { name: "Record visual retest (not a code fix)" }));
    fireEvent.click(screen.getByRole("button", { name: "Prepare local visual-review report" }));
    const report = JSON.parse(screen.getByLabelText("Build 194 sanitized Standard theme review report").textContent || "{}");
    expect(report.engineeringFixVerified).toBe(false);
    expect(report.findings[2]).toEqual({ area: "management", finding: "needs_change", issueCategory: "navigation", followup: "local_retest_recorded" });
    expect(report.integrationTestAuthorization).toBe("NOT_GIVEN");
    expect(report.result).toBe("INCOMPLETE_OWNER_SCREEN_REVIEW");
  });
});
