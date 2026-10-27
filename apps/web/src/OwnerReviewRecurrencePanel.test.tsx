import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { OwnerReviewRecurrencePanel } from "./OwnerReviewRecurrencePanel";
import type { TrialEnvironment, TrialObservation } from "./ownerFieldTrial";
import type { SourceIdentityCheck } from "./ownerFieldRouting";
import type { OwnerReviewFollowup } from "./ownerReassignmentReviewFollowup";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const environment: TrialEnvironment = { installed_version: "0.0.7-build164", access: "local_console",
  installed_windows_witnessed: true };
const history: TrialObservation[] = [
  { case_id: "cameras", outcome: "passed", finding: "none", next_owner: "household_owner",
    observed_at: "2026-10-12T08:00:00Z", witnessed_by_operator: true, acknowledged_at: null },
  { case_id: "cameras", outcome: "issue", finding: "stale_evidence", next_owner: "camera_operator",
    observed_at: "2026-10-23T08:00:00Z", witnessed_by_operator: true, acknowledged_at: null },
];
const checks: SourceIdentityCheck[] = [
  { case_id: "cameras", trial_index: 0, identity_state: "confirmed_alias", safe_alias: "asset_123abc",
    installed_version: "0.0.7-build164", access: "local_console", witnessed_on_windows: true,
    captured_at: "2026-10-12T08:01:00Z" },
  { case_id: "cameras", trial_index: 1, identity_state: "operator_mismatch", safe_alias: "asset_456def",
    installed_version: "0.0.7-build164", access: "local_console", witnessed_on_windows: true,
    captured_at: "2026-10-23T08:01:00Z" },
];
const first: OwnerReviewFollowup = {
  reassignment_watch_index: 0, observation_index: 0, source_check_index: 0,
  case_id: "cameras", watch_recorded_at: "2026-10-10T09:00:00Z",
  audit_pair: [0, 1], followup_observed_at: "2026-10-12T08:00:00Z",
  prior_owner_claim: "camera_operator", current_owner_claim: "household_owner",
  owner_outcome: "passed", owner_finding: "none", watch_age_days: 2,
  age_band: "UNDER_THREE_DAYS", signals: ["OWNER_REVIEW_OUTCOME_CHANGED",
    "ORIGINAL_REASSIGNMENT_WATCH_HELD"], unresolved: true,
  recorded_at: "2026-10-13T08:00:00Z", category: "CONTINUE_REASSIGNMENT_HOLD",
  personally_witnessed: true, hold_acknowledged: true,
  state: "PRIVATE_OWNER_REVIEW_FOLLOWUP_NOT_SENT", field_acceptance: "FIELD_ACCEPTANCE_HOLD",
  independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED",
};
const second: OwnerReviewFollowup = { ...first, observation_index: 1, source_check_index: 1,
  followup_observed_at: "2026-10-23T08:00:00Z", current_owner_claim: "camera_operator",
  owner_outcome: "issue", owner_finding: "stale_evidence", watch_age_days: 14,
  age_band: "OVER_SEVEN_DAYS", signals: ["OWNER_REVIEW_STILL_UNRESOLVED",
    "OWNER_REVIEW_OUTCOME_CHANGED", "OWNER_NEXT_ACTION_CLAIM_CHANGED",
    "SOURCE_ALIAS_RECHECK_CHANGED", "SOURCE_REVIEW_IDENTITY_UNVERIFIED",
    "OWNER_REVIEW_AGED", "OWNER_REVIEW_OVERDUE", "ORIGINAL_REASSIGNMENT_WATCH_HELD"],
  recorded_at: "2026-10-24T08:00:00Z" };
const defaults = { followups: [first, second], history, checks, notes: [], environment,
  importedFollowups: 0, importedNotes: 0, onNotesChange: vi.fn(),
  compareEarlierReceipt: vi.fn() };

describe("Build 164 independent owner review recurrence panel", () => {
  it("shows regression and independent HOLD; cannot dispatch with no installed Windows witness", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<OwnerReviewRecurrencePanel {...defaults} environment={{ ...environment,
      installed_windows_witnessed: false }} />);
    const panel = screen.getByRole("region", { name: "Build 164 independent owner review follow-up recurrence and overdue evidence recheck" });
    expect(within(panel).getByText("INDEPENDENT REVIEW: HOLD")).toBeInTheDocument();
    expect(within(panel).getByText(/REVIEW OUTCOME REGRESSED/)).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Append private owner review recurrence audit (HOLD)" })).toBeDisabled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("requires exact same-watch rounds and separate HOLD confirmations", () => {
    const onNotesChange = vi.fn();
    render(<OwnerReviewRecurrencePanel {...defaults} onNotesChange={onNotesChange} />);
    const panel = screen.getByRole("region", { name: "Build 164 independent owner review follow-up recurrence and overdue evidence recheck" });
    fireEvent.click(within(panel).getByRole("button", { name: "Inspect exact private owner review pair" }));
    fireEvent.change(within(panel).getByLabelText("Fixed HOLD-only recurrence category"),
      { target: { value: "REQUEST_RECURRENCE_EVIDENCE_RECHECK" } });
    const button = within(panel).getByRole("button", { name: "Append private owner review recurrence audit (HOLD)" });
    expect(button).toBeDisabled();
    fireEvent.click(within(panel).getByRole("checkbox", { name: /I personally compared both exact owner review rounds/ }));
    expect(button).toBeDisabled();
    fireEvent.click(within(panel).getByRole("checkbox", { name: /I acknowledge private HOLD-only evidence/ }));
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onNotesChange).toHaveBeenCalledTimes(1);
    expect(onNotesChange.mock.calls[0][0][0]).toMatchObject({
      baseline_followup_index: 0, latest_followup_index: 1, reassignment_watch_index: 0,
      category: "REQUEST_RECURRENCE_EVIDENCE_RECHECK",
      state: "PRIVATE_REVIEW_RECURRENCE_NOT_SENT", closure: "NOT_AUTHORIZED" });
  });

  it("compares Build 163 receipt prefixes read-only and blocks imported-only approval", async () => {
    const compareEarlierReceipt = vi.fn().mockReturnValue({ previous_followups: 1,
      current_followups: 2, new_followups: 1, comparison: null });
    render(<OwnerReviewRecurrencePanel {...defaults} importedFollowups={2}
      compareEarlierReceipt={compareEarlierReceipt} />);
    const file = new File(["{}"], "prior-163.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: () => Promise.resolve("{}") });
    fireEvent.change(screen.getByLabelText(/Compare earlier Build 163 private owner review receipt/),
      { target: { files: [file] } });
    await waitFor(() => expect(compareEarlierReceipt).toHaveBeenCalledWith("{}"));
    expect(screen.getByText(/Strict append-only prefix/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Append private owner review recurrence audit (HOLD)" })).toBeDisabled();
  });
});
