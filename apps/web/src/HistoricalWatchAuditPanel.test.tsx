import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { HistoricalWatchAuditPanel } from "./HistoricalWatchAuditPanel";
import type { TrialEnvironment, TrialObservation } from "./ownerFieldTrial";
import type { ExceptionWatchNote } from "./ownerRecheckDecisionWatch";
import type { SourceIdentityCheck } from "./ownerFieldRouting";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const environment: TrialEnvironment = { installed_version: "0.0.7-build161", access: "local_console",
  installed_windows_witnessed: true };
const watch: ExceptionWatchNote = {
  baseline_recheck_index: 0, latest_recheck_index: 1, review_index: 0, case_id: "cameras",
  baseline_at: "2026-10-14T09:00:00Z", latest_at: "2026-10-17T09:00:00Z",
  first_recheck_age_days: 3, signals: ["OUTCOME_ROUND_ADVANCED", "HISTORICAL_EXCEPTIONS_UNRESOLVED"],
  unresolved: true, recorded_at: "2026-10-18T09:00:00Z",
  category: "CONTINUE_INDEPENDENT_REVIEW_HOLD", personally_compared: true,
  hold_acknowledged: true, state: "PRIVATE_EXCEPTION_WATCH_NOT_SENT",
  field_acceptance: "FIELD_ACCEPTANCE_HOLD", independent_review: "INDEPENDENT_REVIEW_HOLD",
  closure: "NOT_AUTHORIZED",
};
const history: TrialObservation[] = [
  { case_id: "cameras", outcome: "issue", finding: "playback_missing", next_owner: "camera_operator",
    observed_at: "2026-10-17T08:00:00Z", witnessed_by_operator: true, acknowledged_at: null },
  { case_id: "cameras", outcome: "passed", finding: "none", next_owner: "household_owner",
    observed_at: "2026-10-22T09:00:00Z", witnessed_by_operator: true, acknowledged_at: null },
];
const checks: SourceIdentityCheck[] = [
  { case_id: "cameras", trial_index: 0, identity_state: "confirmed_alias", safe_alias: "asset_123abc",
    installed_version: "0.0.7-build161", access: "local_console", witnessed_on_windows: true,
    captured_at: "2026-10-17T08:01:00Z" },
  { case_id: "cameras", trial_index: 1, identity_state: "operator_mismatch", safe_alias: "asset_456def",
    installed_version: "0.0.7-build161", access: "local_console", witnessed_on_windows: true,
    captured_at: "2026-10-22T09:01:00Z" },
];
const defaults = { watches: [watch], history, checks, audits: [], environment, importedTrials: 0,
  importedChecks: 0, importedWatches: 0, importedAudits: 0, onAuditsChange: vi.fn(),
  compareEarlierReceipt: vi.fn() };

describe("Build 161 historical watch outcome audit panel", () => {
  it("keeps an improving owner's trial on HOLD without automatic dispatch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<HistoricalWatchAuditPanel {...defaults} environment={{ ...environment,
      installed_windows_witnessed: false }} />);
    const panel = screen.getByRole("region", { name: "Build 161 historical watch outcome follow-up and exception aging audit" });
    expect(within(panel).getByText("INDEPENDENT REVIEW: HOLD")).toBeInTheDocument();
    expect(within(panel).getByText(/OWNER IMPROVEMENT UNVERIFIED/)).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Append private historical watch aging audit (HOLD)" })).toBeDisabled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("requires a new owner trial and two explicit HOLD witnesses", () => {
    const onAuditsChange = vi.fn();
    render(<HistoricalWatchAuditPanel {...defaults} onAuditsChange={onAuditsChange} />);
    const panel = screen.getByRole("region", { name: "Build 161 historical watch outcome follow-up and exception aging audit" });
    fireEvent.click(within(panel).getByRole("button", { name: "Inspect watch and exact owner trial" }));
    fireEvent.change(within(panel).getByLabelText("Fixed HOLD-only audit category"),
      { target: { value: "REQUEST_SOURCE_IDENTITY_RECHECK" } });
    const button = within(panel).getByRole("button", { name: "Append private historical watch aging audit (HOLD)" });
    const witnessed = within(panel).getByRole("checkbox", { name: /I personally witnessed this later exact owner trial/ });
    const acknowledged = within(panel).getByRole("checkbox", { name: /I acknowledge all prior independent/ });
    expect(button).toBeDisabled();
    fireEvent.click(witnessed);
    expect(button).toBeDisabled();
    fireEvent.click(acknowledged);
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onAuditsChange).toHaveBeenCalledTimes(1);
    expect(onAuditsChange.mock.calls[0][0][0]).toMatchObject({
      watch_index: 0, observation_index: 1, source_check_index: 1,
      category: "REQUEST_SOURCE_IDENTITY_RECHECK", closure: "NOT_AUTHORIZED",
      state: "PRIVATE_WATCH_FOLLOWUP_NOT_SENT" });
  });

  it("imports no authority from old snapshots and refuses historical-only follow-ups", async () => {
    const compareEarlierReceipt = vi.fn().mockReturnValue({ previous_watches: 1,
      previous_observations: 1, current_observations: 2, new_observations: 1, comparison: null });
    render(<HistoricalWatchAuditPanel {...defaults} importedTrials={2} importedChecks={2}
      importedWatches={1} compareEarlierReceipt={compareEarlierReceipt} />);
    const file = new File(["{}"], "private-older.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: () => Promise.resolve("{}") });
    fireEvent.change(screen.getByLabelText(/Compare older Build 160 watch snapshot/),
      { target: { files: [file] } });
    await waitFor(() => expect(compareEarlierReceipt).toHaveBeenCalledWith("{}"));
    expect(screen.getByText(/Strict historical prefix/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Append private historical watch aging audit (HOLD)" })).toBeDisabled();
  });
});
