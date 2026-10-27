import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AuditReassignmentWatchPanel } from "./AuditReassignmentWatchPanel";
import type { TrialEnvironment, TrialObservation } from "./ownerFieldTrial";
import type { SourceIdentityCheck } from "./ownerFieldRouting";
import type { HistoricalWatchAuditNote } from "./ownerHistoricalWatchAudit";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const environment: TrialEnvironment = { installed_version: "0.0.7-build162", access: "local_console",
  installed_windows_witnessed: true };
const history: TrialObservation[] = [
  { case_id: "cameras", outcome: "issue", finding: "playback_missing", next_owner: "camera_operator",
    observed_at: "2026-10-14T09:00:00Z", witnessed_by_operator: true, acknowledged_at: null },
  { case_id: "cameras", outcome: "passed", finding: "none", next_owner: "household_owner",
    observed_at: "2026-10-20T09:00:00Z", witnessed_by_operator: true, acknowledged_at: null },
];
const checks: SourceIdentityCheck[] = [
  { case_id: "cameras", trial_index: 0, identity_state: "confirmed_alias", safe_alias: "asset_123abc",
    installed_version: "0.0.7-build162", access: "local_console", witnessed_on_windows: true,
    captured_at: "2026-10-14T09:01:00Z" },
  { case_id: "cameras", trial_index: 1, identity_state: "operator_mismatch", safe_alias: "asset_456def",
    installed_version: "0.0.7-build162", access: "local_console", witnessed_on_windows: true,
    captured_at: "2026-10-20T09:01:00Z" },
];
const base: HistoricalWatchAuditNote = { watch_index: 0, observation_index: 0,
  source_check_index: 0, baseline_source_check_index: null, case_id: "cameras",
  watch_recorded_at: "2026-10-11T08:00:00Z", first_recheck_at: "2026-10-08T08:00:00Z",
  followup_observed_at: "2026-10-14T09:00:00Z", watch_age_days: 3,
  original_exception_age_days: 6, watch_age_band: "THREE_TO_SEVEN_DAYS",
  owner_outcome: "issue", owner_finding: "playback_missing",
  signals: ["OWNER_ISSUE_STILL_OPEN", "SOURCE_IDENTITY_CONTRADICTION",
    "INDEPENDENT_WATCH_AGED", "HISTORICAL_EXCEPTION_UNRESOLVED"], outstanding: true,
  recorded_at: "2026-10-15T08:00:00Z", category: "CONTINUE_HISTORICAL_REVIEW_HOLD",
  personally_witnessed: true, hold_acknowledged: true, state: "PRIVATE_WATCH_FOLLOWUP_NOT_SENT",
  field_acceptance: "FIELD_ACCEPTANCE_HOLD", independent_review: "INDEPENDENT_REVIEW_HOLD",
  closure: "NOT_AUTHORIZED" };
const audits: HistoricalWatchAuditNote[] = [base, {
  ...base, observation_index: 1, source_check_index: 1, owner_outcome: "passed",
  owner_finding: "none", followup_observed_at: "2026-10-20T09:00:00Z",
  watch_age_days: 9, watch_age_band: "OVER_SEVEN_DAYS", original_exception_age_days: 12,
  recorded_at: "2026-10-21T08:00:00Z",
}];
const defaults = { audits, history, checks, notes: [], environment, importedAudits: 0,
  importedNotes: 0, onNotesChange: vi.fn(), compareEarlierReceipt: vi.fn() };

describe("Build 162 owner exception reassignment watch panel", () => {
  it("shows changed owner, source mismatch and permanent independent HOLD without a network call", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<AuditReassignmentWatchPanel {...defaults} environment={{ ...environment,
      installed_windows_witnessed: false }} />);
    const panel = screen.getByRole("region", { name: "Build 162 audit receipt reconciliation and owner exception reassignment watch" });
    expect(within(panel).getByText("INDEPENDENT REVIEW: HOLD")).toBeInTheDocument();
    expect(within(panel).getByText(/OWNER REASSIGNMENT PROPOSED/)).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Append private owner reassignment exception watch (HOLD)" })).toBeDisabled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("requires same-watch pair selection and two manual HOLD confirmations", () => {
    const onNotesChange = vi.fn();
    render(<AuditReassignmentWatchPanel {...defaults} onNotesChange={onNotesChange} />);
    const panel = screen.getByRole("region", { name: "Build 162 audit receipt reconciliation and owner exception reassignment watch" });
    fireEvent.click(within(panel).getByRole("button", { name: "Inspect exact private aging audit pair" }));
    fireEvent.change(within(panel).getByLabelText("Fixed HOLD-only exception category"),
      { target: { value: "REQUEST_OWNER_REASSIGNMENT_WITNESS" } });
    const button = within(panel).getByRole("button", { name: "Append private owner reassignment exception watch (HOLD)" });
    expect(button).toBeDisabled();
    fireEvent.click(within(panel).getByRole("checkbox", { name: /I personally compared the two exact aging audit rounds/ }));
    expect(button).toBeDisabled();
    fireEvent.click(within(panel).getByRole("checkbox", { name: /I acknowledge this is private HOLD evidence only/ }));
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onNotesChange).toHaveBeenCalledTimes(1);
    expect(onNotesChange.mock.calls[0][0][0]).toMatchObject({
      baseline_audit_index: 0, latest_audit_index: 1, watch_index: 0,
      category: "REQUEST_OWNER_REASSIGNMENT_WITNESS", state: "PRIVATE_REASSIGNMENT_WATCH_NOT_SENT",
      closure: "NOT_AUTHORIZED" });
  });

  it("compares an earlier private receipt read-only and never enables imported-only decision authority", async () => {
    const compareEarlierReceipt = vi.fn().mockReturnValue({ previous_audits: 1,
      current_audits: 2, new_audits: 1, comparison: null });
    render(<AuditReassignmentWatchPanel {...defaults} importedAudits={2}
      compareEarlierReceipt={compareEarlierReceipt} />);
    const file = new File(["{}"], "private-161.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: () => Promise.resolve("{}") });
    fireEvent.change(screen.getByLabelText(/Compare older Build 161 private audit receipt/),
      { target: { files: [file] } });
    await waitFor(() => expect(compareEarlierReceipt).toHaveBeenCalledWith("{}"));
    expect(screen.getByText(/Strict prefix/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Append private owner reassignment exception watch (HOLD)" })).toBeDisabled();
  });
});
