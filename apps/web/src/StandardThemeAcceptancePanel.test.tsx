import { afterEach, describe, expect, it } from "vitest";
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
});
