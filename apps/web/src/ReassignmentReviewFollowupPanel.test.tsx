import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ReassignmentReviewFollowupPanel } from "./ReassignmentReviewFollowupPanel";
import type { TrialEnvironment, TrialObservation } from "./ownerFieldTrial";
import type { SourceIdentityCheck } from "./ownerFieldRouting";
import type { ReassignmentWatchNote } from "./ownerAuditReassignmentWatch";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const environment: TrialEnvironment = { installed_version: "0.0.7-build163", access: "local_console",
  installed_windows_witnessed: true };
const history: TrialObservation[] = [
  { case_id: "cameras", outcome: "issue", finding: "playback_missing", next_owner: "camera_operator",
    observed_at: "2026-10-11T08:00:00Z", witnessed_by_operator: true, acknowledged_at: null },
  { case_id: "cameras", outcome: "passed", finding: "none", next_owner: "household_owner",
    observed_at: "2026-10-14T08:00:00Z", witnessed_by_operator: true, acknowledged_at: null },
  { case_id: "cameras", outcome: "issue", finding: "stale_evidence", next_owner: "camera_operator",
    observed_at: "2026-10-23T08:00:00Z", witnessed_by_operator: true, acknowledged_at: null },
];
const checks: SourceIdentityCheck[] = [
  { case_id: "cameras", trial_index: 1, identity_state: "confirmed_alias", safe_alias: "asset_123abc",
    installed_version: "0.0.7-build163", access: "local_console", witnessed_on_windows: true,
    captured_at: "2026-10-14T08:01:00Z" },
  { case_id: "cameras", trial_index: 2, identity_state: "operator_mismatch", safe_alias: "asset_456def",
    installed_version: "0.0.7-build163", access: "local_console", witnessed_on_windows: true,
    captured_at: "2026-10-23T08:01:00Z" },
];
const watch: ReassignmentWatchNote = {
  baseline_audit_index: 0, latest_audit_index: 1, watch_index: 0, case_id: "cameras",
  baseline_observation_index: 0, latest_observation_index: 1,
  baseline_at: "2026-10-12T08:00:00Z", latest_at: "2026-10-15T08:00:00Z",
  original_watch_at: "2026-10-10T08:00:00Z", baseline_owner: "camera_operator",
  latest_owner: "household_owner", first_audit_age_days: 3, original_watch_age_days: 5,
  age_band: "THREE_TO_SEVEN_DAYS", signals: ["OWNER_REASSIGNMENT_PROPOSED",
    "ORIGINAL_EXCEPTION_STILL_HELD"], unresolved: true, recorded_at: "2026-10-15T09:00:00Z",
  category: "REQUEST_OWNER_REASSIGNMENT_WITNESS", personally_compared: true,
  hold_acknowledged: true, state: "PRIVATE_REASSIGNMENT_WATCH_NOT_SENT",
  field_acceptance: "FIELD_ACCEPTANCE_HOLD", independent_review: "INDEPENDENT_REVIEW_HOLD",
  closure: "NOT_AUTHORIZED",
};
const defaults = { watches: [watch], history, checks, followups: [], environment,
  importedTrials: 0, importedFollowups: 0, onFollowupsChange: vi.fn(),
  compareEarlierReceipt: vi.fn() };

describe("Build 163 private reassignment owner review follow-up panel", () => {
  it("keeps independent HOLD and prevents action without physical installed witness", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<ReassignmentReviewFollowupPanel {...defaults} environment={{ ...environment,
      installed_windows_witnessed: false }} />);
    const panel = screen.getByRole("region", { name: "Build 163 private reassignment watch follow-up and overdue owner review audit" });
    expect(within(panel).getByText("INDEPENDENT REVIEW: HOLD")).toBeInTheDocument();
    expect(within(panel).getByText(/ORIGINAL REASSIGNMENT WATCH HELD/)).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Append private owner review follow-up evidence (HOLD)" })).toBeDisabled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("requires exact watch selection and two separate manual HOLD confirmations", () => {
    const onFollowupsChange = vi.fn();
    render(<ReassignmentReviewFollowupPanel {...defaults} onFollowupsChange={onFollowupsChange} />);
    const panel = screen.getByRole("region", { name: "Build 163 private reassignment watch follow-up and overdue owner review audit" });
    fireEvent.click(within(panel).getByRole("button", { name: "Inspect exact watch and owner review pair" }));
    fireEvent.change(within(panel).getByLabelText("Fixed HOLD-only follow-up category"),
      { target: { value: "REQUEST_SOURCE_IDENTITY_RECHECK" } });
    const button = within(panel).getByRole("button", { name: "Append private owner review follow-up evidence (HOLD)" });
    expect(button).toBeDisabled();
    fireEvent.click(within(panel).getByRole("checkbox", { name: /I personally rechecked the exact earlier watch/ }));
    expect(button).toBeDisabled();
    fireEvent.click(within(panel).getByRole("checkbox", { name: /I acknowledge the review remains private HOLD evidence only/ }));
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onFollowupsChange).toHaveBeenCalledTimes(1);
    expect(onFollowupsChange.mock.calls[0][0][0]).toMatchObject({
      reassignment_watch_index: 0, observation_index: 2,
      category: "REQUEST_SOURCE_IDENTITY_RECHECK",
      state: "PRIVATE_OWNER_REVIEW_FOLLOWUP_NOT_SENT", closure: "NOT_AUTHORIZED" });
  });

  it("compares historical receipts read-only and blocks imported-only reviews", async () => {
    const compareEarlierReceipt = vi.fn().mockReturnValue({ previous_watches: 1,
      current_watches: 2, new_watches: 1, latest_unverified_case: "cameras" });
    render(<ReassignmentReviewFollowupPanel {...defaults} importedTrials={3}
      compareEarlierReceipt={compareEarlierReceipt} />);
    const file = new File(["{}"], "prior-162.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: () => Promise.resolve("{}") });
    fireEvent.change(screen.getByLabelText(/Compare earlier Build 162 private reassignment watch receipt/),
      { target: { files: [file] } });
    await waitFor(() => expect(compareEarlierReceipt).toHaveBeenCalledWith("{}"));
    expect(screen.getByText(/Strict immutable prefix/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Append private owner review follow-up evidence (HOLD)" })).toBeDisabled();
  });
});
