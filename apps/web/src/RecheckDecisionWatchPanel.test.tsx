import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { RecheckDecisionWatchPanel } from "./RecheckDecisionWatchPanel";
import type { TrialEnvironment } from "./ownerFieldTrial";
import type { OutcomeRecheckNote } from "./ownerOutcomeRecurrence";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const environment: TrialEnvironment = { installed_version: "0.0.7-build160", access: "local_console",
  installed_windows_witnessed: true };
const base = { review_index: 0, case_id: "cameras", baseline_outcome_index: 0,
  baseline_at: "2026-10-17T08:00:00Z", age_days: 1, outstanding: true,
  personally_compared: true, hold_acknowledged: true, state: "PRIVATE_RECHECK_NOT_SENT",
  field_acceptance: "FIELD_ACCEPTANCE_HOLD", independent_review: "INDEPENDENT_REVIEW_HOLD",
  closure: "NOT_AUTHORIZED" } as const;
const rechecks: OutcomeRecheckNote[] = [
  { ...base, latest_outcome_index: 1, latest_at: "2026-10-18T09:00:00Z",
    signals: ["ISSUE_RECURRED_AFTER_IMPROVEMENT", "SOURCE_CHECK_COVERAGE_CHANGED",
      "HISTORICAL_EXCEPTIONS_CONTINUE"], recheck_reason: "REQUEST_RECURRENCE_WITNESS",
    recorded_at: "2026-10-18T10:00:00Z" },
  { ...base, baseline_outcome_index: 1, latest_outcome_index: 2, latest_at: "2026-10-22T09:00:00Z",
    signals: ["OWNER_OUTCOME_CHANGED", "HISTORICAL_EXCEPTIONS_CONTINUE"],
    recheck_reason: "REQUEST_INDEPENDENT_OUTCOME_RECHECK", recorded_at: "2026-10-22T10:00:00Z" },
];
const defaults = { rechecks, watches: [], environment, importedRechecks: 0, importedWatches: 0,
  onWatchesChange: vi.fn(), compareEarlierReceipt: vi.fn() };

describe("Build 160 private independent recheck watch", () => {
  it("shows immutable source and recurrence history without automatic activity", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<RecheckDecisionWatchPanel {...defaults} environment={{ ...environment, installed_windows_witnessed: false }} />);
    const panel = screen.getByRole("region", { name: "Build 160 independent recheck receipt comparison and exception decision watch" });
    expect(within(panel).getByText("INDEPENDENT REVIEW: HOLD")).toBeInTheDocument();
    expect(within(panel).getByText(/SOURCE EXCEPTION PERSISTS/)).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Append private exception decision watch (HOLD)" })).toBeDisabled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("requires two witnesses for an exact non-imported same-follow-up pair", () => {
    const onWatchesChange = vi.fn();
    render(<RecheckDecisionWatchPanel {...defaults} onWatchesChange={onWatchesChange} />);
    const panel = screen.getByRole("region", { name: "Build 160 independent recheck receipt comparison and exception decision watch" });
    fireEvent.click(within(panel).getByRole("button", { name: "Inspect exact recheck pair" }));
    fireEvent.change(within(panel).getByLabelText("Fixed HOLD-only watch category"),
      { target: { value: "REQUEST_SOURCE_IDENTITY_WITNESS" } });
    const button = within(panel).getByRole("button", { name: "Append private exception decision watch (HOLD)" });
    const compared = within(panel).getByRole("checkbox", { name: /I personally compared both exact recheck rounds/ });
    const hold = within(panel).getByRole("checkbox", { name: /I acknowledge this is a private HOLD watch only/ });
    expect(button).toBeDisabled();
    fireEvent.click(compared);
    expect(button).toBeDisabled();
    fireEvent.click(hold);
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onWatchesChange).toHaveBeenCalledTimes(1);
    expect(onWatchesChange.mock.calls[0][0][0]).toMatchObject({
      category: "REQUEST_SOURCE_IDENTITY_WITNESS", state: "PRIVATE_EXCEPTION_WATCH_NOT_SENT",
      closure: "NOT_AUTHORIZED" });
  });

  it("compares an older private file without importing it or enabling historical reviewer authority", async () => {
    const compareEarlierReceipt = vi.fn().mockReturnValue({ previous_rechecks: 1,
      current_rechecks: 2, new_rechecks: 1, comparison: null });
    render(<RecheckDecisionWatchPanel {...defaults} importedRechecks={2}
      compareEarlierReceipt={compareEarlierReceipt} />);
    const file = new File(["{}"], "private-earlier.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: () => Promise.resolve("{}") });
    fireEvent.change(screen.getByLabelText(/Compare older Build 159 private receipt/),
      { target: { files: [file] } });
    await waitFor(() => expect(compareEarlierReceipt).toHaveBeenCalledWith("{}"));
    expect(screen.getByText(/Structural prefix only/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Append private exception decision watch (HOLD)" })).toBeDisabled();
  });
});
