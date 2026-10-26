import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { OwnerFieldTrialWorkbench } from "./OwnerFieldTrialWorkbench";
import { createTrialReceipt, recordTrialObservation } from "./ownerFieldTrial";
import { advanceRepairHandoff, createReconciliationReceipt, createRepairHandoff } from "./ownerTrialReconciliation";
import { createIndependentReviewReceipt, recordIndependentEvidence } from "./ownerIndependentReview";
import { createFieldRoutingReceipt, recordSourceIdentityCheck } from "./ownerFieldRouting";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("Build 148 System owner field trial workbench", () => {
  it("starts with nine explicit holds and requires a witness before recording an owner finding", () => {
    const navigate = vi.fn();
    render(<OwnerFieldTrialWorkbench onNavigate={navigate} />);
    expect(screen.getByText("FIELD ACCEPTANCE: HOLD")).toBeInTheDocument();
    expect(screen.getByText("Home operations field trial & follow-ups")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Record witnessed outcome/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Open Home for this check" }));
    expect(navigate).toHaveBeenCalledWith("Home");
    fireEvent.change(screen.getByLabelText("Finding category"), { target: { value: "offline" } });
    fireEvent.change(screen.getByLabelText("Next-action owner"), { target: { value: "household_owner" } });
    fireEvent.click(screen.getByLabelText(/I personally completed this safe check/));
    fireEvent.click(screen.getByRole("button", { name: /Record witnessed outcome/ }));
    expect(screen.getByText(/Witnessed Home room health/)).toBeInTheDocument();
    expect(screen.getByText(/Follow-up acknowledgement pending/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Acknowledge follow-up" }));
    expect(screen.getByText(/still open/)).toBeInTheDocument();
    expect(screen.getByText("FIELD ACCEPTANCE: HOLD")).toBeInTheDocument();
  });

  it("refuses field pass without installation verification, then retains earlier issue as a retest review hold", () => {
    render(<OwnerFieldTrialWorkbench onNavigate={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Finding category"), { target: { value: "offline" } });
    fireEvent.change(screen.getByLabelText("Next-action owner"), { target: { value: "household_owner" } });
    fireEvent.click(screen.getByLabelText(/I personally completed this safe check/));
    fireEvent.click(screen.getByRole("button", { name: /Record witnessed outcome/ }));

    fireEvent.change(screen.getByLabelText("Observed outcome"), { target: { value: "passed" } });
    fireEvent.change(screen.getByLabelText("Finding category"), { target: { value: "none" } });
    fireEvent.click(screen.getByLabelText(/I personally completed this safe check/));
    fireEvent.click(screen.getByRole("button", { name: /Record witnessed outcome/ }));
    expect(screen.getByRole("status")).toHaveTextContent(/witnessed installed Windows version/);

    fireEvent.change(screen.getByLabelText("Witnessed installed version label"), { target: { value: "0.0.4-b148" } });
    fireEvent.change(screen.getByLabelText("Access path personally used"), { target: { value: "private_lan" } });
    fireEvent.click(screen.getByLabelText(/I personally checked the actual installed Windows Hub/));
    fireEvent.click(screen.getByRole("button", { name: /Record witnessed outcome/ }));
    expect(screen.getByText(/RETEST PASS OBSERVED · INDEPENDENT REVIEW HOLD/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Show"), { target: { value: "retests" } });
    expect(screen.getByText(/RETEST PASS OBSERVED/)).toBeInTheDocument();
    expect(screen.getByText("FIELD ACCEPTANCE: HOLD")).toBeInTheDocument();
  });

  it("uses only explicit read-only GETs for source classifications; failed APIs cannot create witnessed passes", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("No installed connection"));
    vi.stubGlobal("fetch", fetchMock);
    render(<OwnerFieldTrialWorkbench onNavigate={vi.fn()} />);
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Read source service status (GET only)" }));
    await waitFor(() => expect(screen.getByText(/Five bounded read-only GET results/)).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(5);
    const apiRows = screen.getByRole("list", { name: "Read-only API observations" }).querySelectorAll("li");
    expect(apiRows).toHaveLength(5);
    for (const row of apiRows) expect(row).toHaveTextContent(/unavailable.*at/);
    expect(screen.getByText("FIELD ACCEPTANCE: HOLD")).toBeInTheDocument();
    expect(screen.getAllByText("Not tested").length).toBeGreaterThan(0);
  });

  it("imports past private observations as historical only and resets fresh Windows attestation", async () => {
    const environment = { installed_version: "0.0.4-b148", access: "private_lan" as const, installed_windows_witnessed: true };
    const history = recordTrialObservation([], environment,
      { case_id: "home", outcome: "passed", finding: "none", next_owner: "household_owner", witnessed: true },
      "2026-10-25T10:00:00.000Z");
    const receipt = createTrialReceipt(environment, [], history);
    const file = new File([JSON.stringify(receipt)], "owner-private.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: () => Promise.resolve(JSON.stringify(receipt)) });
    render(<OwnerFieldTrialWorkbench onNavigate={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Import private Build 148/149/150/151/152/153/154/155/156 JSON receipt"), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText(/Imported history is for context only/)).toBeInTheDocument());
    expect(screen.getByLabelText(/I personally checked the actual installed Windows Hub/)).not.toBeChecked();
    expect(screen.getByText(/OWNER PASS OBSERVED · INDEPENDENT FIELD HOLD/)).toBeInTheDocument();
    expect(screen.getByText("FIELD ACCEPTANCE: HOLD")).toBeInTheDocument();
  });

  it("reconciles a witnessed finding into a reviewed private handoff and preserves the retest hold", () => {
    render(<OwnerFieldTrialWorkbench onNavigate={vi.fn()} />);
    const panel = screen.getByRole("region", { name: "Build 149 repair handoff and retest reconciliation" });
    expect(within(panel).getByText("0 cases with historical findings")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Finding category"), { target: { value: "offline" } });
    fireEvent.change(screen.getByLabelText("Next-action owner"), { target: { value: "household_owner" } });
    fireEvent.click(screen.getByLabelText(/I personally completed this safe check/));
    fireEvent.click(screen.getByRole("button", { name: /Record witnessed outcome/ }));

    expect(within(panel).getByText("1 cases with historical findings")).toBeInTheDocument();
    expect(within(panel).getByText(/OPEN OR UNRETESTED · FIELD HOLD/)).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole("button", { name: "Draft latest finding handoff" }));
    expect(within(panel).getByText(/Handoff · draft/)).toBeInTheDocument();
    const reviewButton = within(panel).getByRole("button", { name: "Record owner review" });
    expect(reviewButton).toBeDisabled();
    fireEvent.click(within(panel).getByLabelText(/I manually reviewed this exact handoff/));
    fireEvent.click(reviewButton);
    expect(within(panel).getByText(/Handoff · owner reviewed/)).toBeInTheDocument();
    fireEvent.click(within(panel).getByLabelText(/I manually reviewed this exact handoff/));
    fireEvent.click(within(panel).getByRole("button", { name: /Prepare for private manual handoff/ }));
    expect(within(panel).getByText(/Handoff · prepared for private handoff/)).toBeInTheDocument();
    expect(within(panel).getByText("1 handoffs prepared (not sent)")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Witnessed installed version label"), { target: { value: "0.0.4-build149" } });
    fireEvent.change(screen.getByLabelText("Access path personally used"), { target: { value: "local_console" } });
    fireEvent.click(screen.getByLabelText(/I personally checked the actual installed Windows Hub/));
    fireEvent.change(screen.getByLabelText("Observed outcome"), { target: { value: "passed" } });
    fireEvent.change(screen.getByLabelText("Finding category"), { target: { value: "none" } });
    fireEvent.click(screen.getByLabelText(/I personally completed this safe check/));
    fireEvent.click(screen.getByRole("button", { name: /Record witnessed outcome/ }));
    expect(within(panel).getByText(/OWNER-OBSERVED IMPROVEMENT · INDEPENDENT REVIEW HOLD/)).toBeInTheDocument();
    expect(within(panel).getByText(/Retest comparison: owner improvement review hold/)).toBeInTheDocument();
    expect(screen.getByText("FIELD ACCEPTANCE: HOLD")).toBeInTheDocument();
  });

  it("imports Build 149 private handoff history, leaves stages historical, and resets fresh witness", async () => {
    const environment = { installed_version: "0.0.4-build149", access: "private_lan" as const, installed_windows_witnessed: true };
    const history = recordTrialObservation([], environment,
      { case_id: "windows", outcome: "issue", finding: "startup", next_owner: "household_owner", witnessed: true },
      "2026-10-25T08:00:00.000Z");
    const handoffs = createRepairHandoff(history, [], "windows", "2026-10-25T09:00:00.000Z");
    const receipt = createReconciliationReceipt(environment, [], history, handoffs);
    const file = new File([JSON.stringify(receipt)], "owner-reconciliation-private.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: () => Promise.resolve(JSON.stringify(receipt)) });
    render(<OwnerFieldTrialWorkbench onNavigate={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Import private Build 148/149/150/151/152/153/154/155/156 JSON receipt"), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText(/trial, handoffs, reviewer evidence and source identity history imported/)).toBeInTheDocument());
    const panel = screen.getByRole("region", { name: "Build 149 repair handoff and retest reconciliation" });
    expect(within(panel).getByText(/Handoff · draft/)).toBeInTheDocument();
    expect(within(panel).getByText(/HIGH TRIAGE/)).toBeInTheDocument();
    expect(screen.getByLabelText(/I personally checked the actual installed Windows Hub/)).not.toBeChecked();
    expect(screen.getByText("FIELD ACCEPTANCE: HOLD")).toBeInTheDocument();
  });

  it("imports Build 150 reviewer receipts as historical, never as fresh independent acceptance", async () => {
    const environment = { installed_version: "0.0.4-build150", access: "private_lan" as const, installed_windows_witnessed: true };
    const history = recordTrialObservation([], environment,
      { case_id: "cameras", outcome: "issue", finding: "playback_missing", next_owner: "camera_operator", witnessed: true },
      "2026-10-25T08:00:00.000Z");
    let handoffs = createRepairHandoff(history, [], "cameras", "2026-10-25T09:00:00.000Z");
    handoffs = advanceRepairHandoff(history, handoffs, "cameras", 0, true, "2026-10-25T10:00:00.000Z");
    handoffs = advanceRepairHandoff(history, handoffs, "cameras", 0, true, "2026-10-25T11:00:00.000Z");
    const events = recordIndependentEvidence(history, handoffs, [], environment,
      { case_id: "cameras", baseline_index: 0, criterion: "original_finding", state: "present_claimed",
        reviewer_witnessed: true, separate_reviewer: false }, "2026-10-25T12:00:00.000Z");
    const receipt = createIndependentReviewReceipt(environment, [], history, handoffs, events);
    const file = new File([JSON.stringify(receipt)], "private-review.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: () => Promise.resolve(JSON.stringify(receipt)) });
    render(<OwnerFieldTrialWorkbench onNavigate={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Import private Build 148/149/150/151/152/153/154/155/156 JSON receipt"), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText(/trial, handoffs, reviewer evidence and source identity history imported/)).toBeInTheDocument());
    const panel = screen.getByRole("region", { name: "Build 150 independent retest review and evidence gap register" });
    expect(within(panel).getByText("0 / 7 currently claimed present")).toBeInTheDocument();
    expect(within(panel).getByText("7 unmet evidence criteria")).toBeInTheDocument();
    expect(within(panel).getByText("imported historical")).toBeInTheDocument();
    expect(screen.getByLabelText(/I personally checked the actual installed Windows Hub/)).not.toBeChecked();
    expect(within(panel).getByText("CLOSURE: NOT AUTHORIZED")).toBeInTheDocument();
  });

  it("imports Build 151 source evidence as historical and never enables automated routes or Windows acceptance", async () => {
    const environment = { installed_version: "0.0.5-b151", access: "private_lan" as const, installed_windows_witnessed: true };
    const history = recordTrialObservation([], environment,
      { case_id: "cameras", outcome: "passed", finding: "none", next_owner: "camera_operator", witnessed: true },
      "2026-10-25T08:00:00.000Z");
    const checks = recordSourceIdentityCheck(history, [], environment,
      { case_id: "cameras", identity_state: "confirmed_alias", safe_alias: "asset_123abc", personally_witnessed: true },
      "2026-10-25T09:00:00.000Z");
    const receipt = createFieldRoutingReceipt(environment, [], history, [], [], checks);
    const file = new File([JSON.stringify(receipt)], "owner-source-private.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: () => Promise.resolve(JSON.stringify(receipt)) });
    render(<OwnerFieldTrialWorkbench onNavigate={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Import private Build 148/149/150/151/152/153/154/155/156 JSON receipt"), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText(/source identity history imported/)).toBeInTheDocument());
    const routes = screen.getByRole("region", { name: "Build 151 source identity change and repeat trial routing" });
    expect(within(routes).getByText("HISTORICAL OWNER TRIAL")).toBeInTheDocument();
    expect(within(routes).getByText("IMPORTED IDENTITY HISTORICAL")).toBeInTheDocument();
    expect(within(routes).getByText("ALL ROUTES: FIELD HOLD")).toBeInTheDocument();
    expect(screen.getByLabelText(/I personally checked the actual installed Windows Hub/)).not.toBeChecked();
    expect(screen.getByText("FIELD ACCEPTANCE: HOLD")).toBeInTheDocument();
  });
});
