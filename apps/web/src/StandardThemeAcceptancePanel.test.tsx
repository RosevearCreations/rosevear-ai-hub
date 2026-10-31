import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StandardThemeAcceptancePanel } from "./StandardThemeAcceptancePanel";
import { OWNER_REVIEW_CHECKPOINT_KEY } from "./ownerReviewCheckpoint";

afterEach(() => { cleanup(); sessionStorage.removeItem(OWNER_REVIEW_CHECKPOINT_KEY); });

describe("Build 194 actual Standard theme owner review", () => {
  it("announces unsaved fixed-choice changes and accessible Windows next-action routing", () => {
    render(<StandardThemeAcceptancePanel role="owner" appearance="high-contrast" density="comfortable" />);
    expect(screen.getByRole("navigation", { name: "Windows review next action" })).toHaveTextContent("Review all five application areas");
    fireEvent.click(screen.getByRole("button", { name: "Save local review checkpoint" }));
    expect(screen.getByRole("status", { name: "Local checkpoint change status" })).toHaveTextContent("match the saved checkpoint");
    fireEvent.change(screen.getAllByRole("combobox", { name: "Review finding" })[0], { target: { value: "acceptable" } });
    expect(screen.getByRole("status", { name: "Local checkpoint change status" })).toHaveTextContent("Unsaved changes");
    fireEvent.click(screen.getByRole("button", { name: "Save local review checkpoint" }));
    expect(screen.getByRole("status", { name: "Local checkpoint change status" })).toHaveTextContent("match the saved checkpoint");
    expect(screen.getByRole("navigation", { name: "Windows review next action" }).querySelector("a[href='#hub-theme-screen-review']")).toBeInTheDocument();
  });
  it("guides the owner through real workspaces and the next missing screen while preserving findings", () => {
    const onNavigate = vi.fn();
    render(<StandardThemeAcceptancePanel role="owner" appearance="standard" density="comfortable" onNavigate={onNavigate} />);
    const steps = screen.getByRole("navigation", { name: "Owner theme review steps" });
    expect(Array.from(steps.querySelectorAll("a")).map(link => link.getAttribute("href")))
      .toEqual(["#hub-theme-screen-review", "#hub-theme-device-review", "#hub-theme-retest-review", "#hub-theme-issue-review", "#hub-theme-completion-review"]);
    fireEvent.click(screen.getByRole("button", { name: "Open next screen: Front end & navigation" }));
    expect(onNavigate).toHaveBeenCalledWith("Home");
    const selects = screen.getAllByRole("combobox", { name: "Review finding" });
    fireEvent.change(selects[0], { target: { value: "acceptable" } });
    expect(screen.getByRole("button", { name: "Open next screen: I.T. & connections" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Open next screen: I.T. & connections" }));
    expect(onNavigate).toHaveBeenLastCalledWith("System");
    selects.slice(1).forEach(select => fireEvent.change(select, { target: { value: "acceptable" } }));
    expect(screen.getByRole("button", { name: "All screens reviewed" })).toBeDisabled();
    expect(screen.getByLabelText("Standard theme owner review status")).toHaveTextContent("ALL_AREAS_MARKED_ACCEPTABLE_LOCALLY");
  });
  it("saves and recovers only fixed owner findings from browser-tab storage after a re-mount", () => {
    render(<StandardThemeAcceptancePanel role="owner" appearance="standard" density="comfortable" />);
    expect(screen.getByRole("button", { name: "Recover saved review" })).toBeDisabled();
    fireEvent.change(screen.getAllByRole("combobox", { name: "Review finding" })[0], { target: { value: "needs_change" } });
    fireEvent.change(screen.getByLabelText("Where did we personally test the screens?"), { target: { value: "windows_hub_server" } });
    fireEvent.change(document.querySelector("#theme-device-keyboard")!, { target: { value: "observed_fail" } });
    fireEvent.change(screen.getByLabelText("What went wrong? (fixed, private-data-free choice)"), { target: { value: "focus_not_visible" } });
    fireEvent.click(screen.getByRole("button", { name: "Save local review checkpoint" }));
    expect(screen.getByLabelText("Owner review recovery message")).toHaveTextContent("saved in this browser tab");
    expect(sessionStorage.getItem(OWNER_REVIEW_CHECKPOINT_KEY)).not.toContain("integrationTestAuthorization");
    cleanup();
    render(<StandardThemeAcceptancePanel role="owner" appearance="standard" density="comfortable" />);
    expect(screen.getByRole("button", { name: "Recover saved review" })).toBeEnabled();
    expect(screen.getAllByRole("combobox", { name: "Review finding" })[0]).toHaveValue("not_checked");
    fireEvent.click(screen.getByRole("button", { name: "Recover saved review" }));
    expect(screen.getAllByRole("combobox", { name: "Review finding" })[0]).toHaveValue("needs_change");
    expect(document.querySelector("#theme-device-keyboard")).toHaveValue("observed_fail");
    expect(screen.getByLabelText("What went wrong? (fixed, private-data-free choice)")).toHaveValue("focus_not_visible");
    expect(screen.getByLabelText("Windows owner retest audit status")).toHaveTextContent("OWNER_BASELINE_NOT_RECORDED");
    fireEvent.click(screen.getByRole("button", { name: "Reset this session's review" }));
    expect(sessionStorage.getItem(OWNER_REVIEW_CHECKPOINT_KEY)).toBeNull();
  });

  it("keeps local Windows worksheet completion separate from any independent installation acceptance", () => {
    render(<StandardThemeAcceptancePanel role="owner" appearance="standard" density="comfortable" />);
    const completion = screen.getByRole("region", { name: "Owner Windows review completion" });
    expect(completion).toHaveTextContent("Owner worksheet completion · 1/5");
    screen.getAllByRole("combobox", { name: "Review finding" }).forEach(select => fireEvent.change(select, { target: { value: "acceptable" } }));
    fireEvent.change(screen.getByLabelText("Where did we personally test the screens?"), { target: { value: "remote_windows_client" } });
    const checks = Array.from(screen.getByRole("region", { name: "Standard theme on-device field checks" }).querySelectorAll<HTMLSelectElement>(".hub-theme-device-check select"));
    checks.forEach(select => fireEvent.change(select, { target: { value: "observed_pass" } }));
    expect(completion).toHaveTextContent("Owner worksheet completion · 5/5");
    expect(completion).toHaveTextContent("independent Windows acceptance is NOT VERIFIED");
    fireEvent.change(checks[2], { target: { value: "observed_fail" } });
    expect(completion).toHaveTextContent("Owner worksheet completion · 3/5");
    fireEvent.change(screen.getByLabelText("What went wrong? (fixed, private-data-free choice)"), { target: { value: "focus_not_visible" } });
    expect(completion).toHaveTextContent("Owner worksheet completion · 4/5");
    fireEvent.change(screen.getByLabelText("Retest disposition"), { target: { value: "issue_persists" } });
    expect(completion).toHaveTextContent("Owner worksheet completion · 5/5");
    expect(completion).toHaveTextContent("Any unresolved issue remains open");
  });
  it("supports keyboard review routing and fixed, non-sensitive Windows failure descriptions", () => {
    render(<StandardThemeAcceptancePanel role="owner" appearance="high-contrast" density="comfortable" />);
    expect(screen.getByRole("link", { name: "Jump to keyboard observation" })).toHaveAttribute("href", "#hub-theme-device-keyboard");
    expect(document.querySelector("#hub-theme-device-keyboard")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Where did we personally test the screens?"), { target: { value: "windows_hub_server" } });
    const keyboardCheck = document.querySelector<HTMLSelectElement>("#theme-device-keyboard");
    expect(keyboardCheck).toBeInTheDocument();
    fireEvent.change(keyboardCheck!, { target: { value: "observed_fail" } });
    const symptom = screen.getByLabelText("What went wrong? (fixed, private-data-free choice)");
    expect(symptom).toHaveValue("none");
    fireEvent.change(symptom, { target: { value: "focus_not_visible" } });
    const summary = screen.getByRole("region", { name: "Owner-reported Windows field findings" });
    expect(summary).toHaveTextContent("Keyboard & visible focus");
    expect(summary).toHaveTextContent("Keyboard focus not visible");
    fireEvent.click(screen.getByRole("button", { name: "Prepare local visual-review report" }));
    let report = JSON.parse(screen.getByLabelText("Build 194 sanitized Standard theme review report").textContent || "{}");
    expect(report.schema).toBe("rosevear.build202.standard-theme-session-issue-review.v2");
    expect(report.onDevice.checks[2]).toEqual({ check: "keyboard", finding: "observed_fail", symptom: "focus_not_visible" });
    expect(report.independentlyWitnessedOwnerAcceptance).toBe("NOT_VERIFIED");
    fireEvent.change(keyboardCheck!, { target: { value: "observed_pass" } });
    expect(screen.queryByLabelText("What went wrong? (fixed, private-data-free choice)")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Prepare local visual-review report" }));
    report = JSON.parse(screen.getByLabelText("Build 194 sanitized Standard theme review report").textContent || "{}");
    expect(report.onDevice.checks[2].symptom).toBe("none");
    expect(report.integration).toBe("DISCONNECTED / HOLD");
  });
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

  it("keeps physical on-device observations separate from code CI and independent Windows acceptance", () => {
    render(<StandardThemeAcceptancePanel role="owner" appearance="standard" density="compact" />);
    const device = screen.getByRole("region", { name: "Standard theme on-device field checks" });
    const checks = Array.from(device.querySelectorAll("select")).slice(1);
    expect(checks).toHaveLength(5);
    checks.forEach(check => expect(check).toBeDisabled());
    expect(screen.getByLabelText("Standard theme on-device review status")).toHaveTextContent("ON_DEVICE_WALKTHROUGH_INCOMPLETE");
    fireEvent.change(screen.getByLabelText("Where did we personally test the screens?"), { target: { value: "remote_windows_client" } });
    checks.forEach(check => fireEvent.change(check, { target: { value: "observed_pass" } }));
    expect(screen.getByLabelText("Standard theme on-device review status")).toHaveTextContent("OWNER_REPORTED_DEVICE_CHECKS_PASS_UNVERIFIED");
    fireEvent.click(screen.getByRole("button", { name: "Prepare local visual-review report" }));
    let report = JSON.parse(screen.getByLabelText("Build 194 sanitized Standard theme review report").textContent || "{}");
    expect(report.onDevice.context).toBe("remote_windows_client");
    expect(report.onDevice.independentlyWitnessedPhysicalAcceptance).toBe("NOT_VERIFIED");
    expect(report.onDevice.actualWindowsMachineIdentity).toBe("NOT_COLLECTED");
    fireEvent.change(checks[3], { target: { value: "observed_fail" } });
    expect(screen.getByLabelText("Standard theme on-device review status")).toHaveTextContent("OWNER_REPORTED_DEVICE_ISSUES");
    expect(screen.getByLabelText("Build 194 sanitized Standard theme review report")).not.toHaveTextContent('"onDevice"');
    fireEvent.click(screen.getByRole("button", { name: "Reset this session's review" }));
    expect(screen.getByLabelText("Standard theme on-device review status")).toHaveTextContent("ON_DEVICE_WALKTHROUGH_INCOMPLETE");
    expect(checks[0]).toBeDisabled();
  });

  it("never allows an administrator to attest to physical owner observations", () => {
    render(<StandardThemeAcceptancePanel role="administrator" appearance="standard" density="comfortable" />);
    const region = screen.getByRole("region", { name: "Standard theme on-device field checks" });
    Array.from(region.querySelectorAll("select")).forEach(select => expect(select).toBeDisabled());
  });

  it("records Windows-only owner retest disposition for a prior failure without claiming an engineering fix", () => {
    render(<StandardThemeAcceptancePanel role="owner" appearance="standard" density="comfortable" />);
    const device = screen.getByRole("region", { name: "Standard theme on-device field checks" });
    const retest = screen.getByRole("region", { name: "Windows theme retest disposition" });
    fireEvent.change(screen.getByLabelText("Where did we personally test the screens?"), { target: { value: "other_browser_device" } });
    const checks = Array.from(device.querySelectorAll(".hub-theme-device-check select"));
    fireEvent.change(checks[1], { target: { value: "observed_fail" } });
    expect(screen.getByLabelText("Windows theme retest status")).toHaveTextContent("WINDOWS_RETEST_NOT_ELIGIBLE_OR_NOT_RECORDED");
    expect(retest.querySelector("select")).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Where did we personally test the screens?"), { target: { value: "windows_hub_server" } });
    expect(retest.querySelector("select")).toBeNull();
    fireEvent.change(checks[1], { target: { value: "observed_fail" } });
    expect(screen.getByLabelText("Windows theme retest status")).toHaveTextContent("WINDOWS_RETEST_PENDING");
    fireEvent.change(screen.getByLabelText("Retest disposition"), { target: { value: "issue_persists" } });
    expect(screen.getByLabelText("Windows theme retest status")).toHaveTextContent("OWNER_REPORTS_WINDOWS_ISSUES_PERSIST");
    fireEvent.click(screen.getByRole("button", { name: "Prepare local visual-review report" }));
    const report = JSON.parse(screen.getByLabelText("Build 194 sanitized Standard theme review report").textContent || "{}");
    expect(report.windowsThemeRetest.retestsWithPersistentIssues).toBe(1);
    expect(report.windowsThemeRetest.engineeringFixVerified).toBe(false);
    expect(report.windowsThemeRetest.independentWindowsWitness).toBe("NOT_VERIFIED");
    fireEvent.change(screen.getByLabelText("Retest disposition"), { target: { value: "owner_reports_improvement" } });
    expect(screen.getByLabelText("Windows theme retest status")).toHaveTextContent("OWNER_REPORTS_IMPROVEMENT_UNVERIFIED");
    fireEvent.change(checks[1], { target: { value: "observed_pass" } });
    expect(retest.querySelector("select")).toBeNull();
    expect(screen.getByLabelText("Windows theme retest status")).toHaveTextContent("NO_PRIOR_FAILED_WINDOWS_OBSERVATIONS");
  });

  it("tracks per-check engineering follow-up without accepting a Windows fix or retaining stale device results", () => {
    render(<StandardThemeAcceptancePanel role="owner" appearance="standard" density="comfortable" />);
    fireEvent.change(screen.getByLabelText("Where did we personally test the screens?"), { target: { value: "windows_hub_server" } });
    const checks = Array.from(screen.getByRole("region", { name: "Standard theme on-device field checks" }).querySelectorAll(".hub-theme-device-check select"));
    fireEvent.change(checks[2], { target: { value: "observed_fail" } });
    expect(screen.getByLabelText("Windows retest engineering follow-up status")).toHaveTextContent("1 open");
    fireEvent.change(screen.getByLabelText("Engineering follow-up"), { target: { value: "engineering_review_requested" } });
    fireEvent.change(screen.getByLabelText("Retest disposition"), { target: { value: "owner_reports_improvement" } });
    fireEvent.click(screen.getByRole("button", { name: "Prepare local visual-review report" }));
    let report = JSON.parse(screen.getByLabelText("Build 194 sanitized Standard theme review report").textContent || "{}");
    expect(report.windowsRetestFollowup.reportedImprovementAwaitingWitness).toBe(1);
    expect(report.windowsRetestFollowup.items[0].ownerReportedFollowup).toBe("engineering_review_requested");
    expect(report.windowsRetestFollowup.independentlyWitnessedAcceptance).toBe("NOT_VERIFIED");
    fireEvent.change(checks[2], { target: { value: "observed_pass" } });
    fireEvent.click(screen.getByRole("button", { name: "Prepare local visual-review report" }));
    report = JSON.parse(screen.getByLabelText("Build 194 sanitized Standard theme review report").textContent || "{}");
    expect(report.windowsRetestFollowup.items).toHaveLength(0);
    fireEvent.change(screen.getByLabelText("Where did we personally test the screens?"), { target: { value: "other_browser_device" } });
    expect(screen.queryByLabelText("Engineering follow-up")).not.toBeInTheDocument();
  });

  it("captures a local owner Windows retest baseline and audits subsequent changes without acceptance", () => {
    render(<StandardThemeAcceptancePanel role="owner" appearance="standard" density="comfortable" />);
    expect(screen.getByRole("button", { name: "Capture owner retest baseline (local)" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Where did we personally test the screens?"), { target: { value: "remote_windows_client" } });
    const checks = Array.from(screen.getByRole("region", { name: "Standard theme on-device field checks" }).querySelectorAll(".hub-theme-device-check select"));
    fireEvent.change(checks[0], { target: { value: "observed_fail" } });
    fireEvent.click(screen.getByRole("button", { name: "Capture owner retest baseline (local)" }));
    expect(screen.getByLabelText("Windows owner retest audit status")).toHaveTextContent("OWNER_RETEST_SNAPSHOT_UNCHANGED");
    fireEvent.change(screen.getByLabelText("Retest disposition"), { target: { value: "owner_reports_improvement" } });
    fireEvent.change(screen.getByLabelText("Engineering follow-up"), { target: { value: "owner_retest_ready_reported" } });
    expect(screen.getByLabelText("Windows owner retest audit status")).toHaveTextContent("OWNER_RETEST_CHANGES_RECORDED_UNVERIFIED");
    fireEvent.click(screen.getByRole("button", { name: "Prepare local visual-review report" }));
    const report = JSON.parse(screen.getByLabelText("Build 194 sanitized Standard theme review report").textContent || "{}");
    expect(report.windowsOwnerRetestAudit.changedChecks).toBe(1);
    expect(report.windowsOwnerRetestAudit.reportedImprovementsStillUnwitnessed).toBe(1);
    expect(report.windowsOwnerRetestAudit.physicalWindowsInstallationVerified).toBe(false);
    expect(report.ql275DeferredOwnerFollowupReview.trackingStatus).toBe("UNDER_REVIEW");
    expect(report.ql275DeferredOwnerFollowupReview.ownerReportedChanges).toBe(1);
    expect(report.ql275DeferredOwnerFollowupReview.actualWindowsDeviceAcceptance).toBe("NOT_VERIFIED");
    expect(report.ql275DeferredOwnerFollowupReview.activationEligible).toBe(false);
    expect(screen.getByRole("region", { name: "QL-275 deferred Windows owner follow-up review" })).toHaveTextContent("Under Review");
    fireEvent.change(checks[0], { target: { value: "observed_pass" } });
    expect(screen.getByLabelText("Windows owner retest audit status")).toHaveTextContent("OWNER_BASELINE_NOT_RECORDED");
    expect(screen.getByRole("button", { name: "Clear owner retest baseline" })).toBeDisabled();
  });
});
