import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ContinuityOutcomePanel } from "./ContinuityOutcomePanel";
import type { TrialEnvironment } from "./ownerFieldTrial";

vi.mock("./ownerContinuityOutcome", () => ({
  OUTCOME_CATEGORIES: ["CONTINUE_INDEPENDENT_HOLD", "REQUEST_OWNER_OUTCOME_RECHECK",
    "REQUEST_SOURCE_FRESHNESS_RECHECK", "REQUEST_OVERDUE_INDEPENDENT_REVIEW"],
  compareContinuityOutcomes: (_watches: unknown[], _dispositions: unknown[],
    _recurrences: unknown[], _followups: unknown[], _history: unknown[],
    _checks: unknown[], earlier: number, later: number) => {
    if (earlier !== 0 || later !== 1) throw new Error("Exact chronological pair required");
    return { baseline_continuity_index: 0, latest_continuity_index: 1,
      reassignment_watch_index: 0, case_id: "cameras",
      baseline_at: "2026-10-22T08:00:00Z", latest_at: "2026-10-26T08:00:00Z",
      baseline_disposition_index: 1, latest_disposition_index: 2,
      baseline_outcome: "passed", latest_outcome: "issue",
      baseline_owner_claim: "household_owner", latest_owner_claim: "camera_operator",
      latest_observation_index: 4, latest_source_check_index: 4,
      owner_trial_renewed: true, source_evidence_renewed: false,
      source_identity_confirmed_claim: false, source_age_days: 9, continuity_age_days: 9,
      age_band: "OVER_SEVEN_DAYS", signals: ["OWNER_OUTCOME_CHANGED",
        "SOURCE_EVIDENCE_NOT_RENEWED", "SOURCE_EVIDENCE_OVERDUE",
        "ORIGINAL_INDEPENDENT_HOLD_PERSISTS"], unresolved: true };
  },
  recordOutcomeNote: (...args: unknown[]) => [{ ...args[9] as object,
    state: "PRIVATE_CONTINUITY_OUTCOME_NOT_SENT", closure: "NOT_AUTHORIZED" }],
}));

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const environment: TrialEnvironment = { installed_version: "0.0.7-build167",
  access: "local_console", installed_windows_witnessed: true };
const defaults = { watches: [{ reassignment_watch_index: 0, latest_disposition_index: 1,
  recorded_at: "2026-10-22T08:00:00Z" }, { reassignment_watch_index: 0,
  latest_disposition_index: 2, recorded_at: "2026-10-26T08:00:00Z" }] as never[],
  dispositions: [], recurrences: [], followups: [], history: [], checks: [], notes: [],
  environment, importedWatches: 0, importedNotes: 0, onNotesChange: vi.fn(),
  compareEarlierReceipt: vi.fn() };

describe("Build 167 private owner outcome panel", () => {
  it("displays source age and permanent HOLD without external fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<ContinuityOutcomePanel {...defaults} environment={{ ...environment,
      installed_windows_witnessed: false }} />);
    const panel = screen.getByRole("region", { name: "Build 167 independent continuity outcome and source evidence freshness" });
    expect(within(panel).getByText("INDEPENDENT REVIEW: HOLD")).toBeInTheDocument();
    expect(within(panel).getByText(/latest source age 9 day/)).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Append private outcome reconciliation (HOLD)" })).toBeDisabled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("requires manual comparison and separate HOLD acknowledgment", () => {
    const onNotesChange = vi.fn();
    render(<ContinuityOutcomePanel {...defaults} onNotesChange={onNotesChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Inspect exact continuity outcome pair" }));
    fireEvent.change(screen.getByLabelText("Fixed HOLD-only outcome category"),
      { target: { value: "REQUEST_SOURCE_FRESHNESS_RECHECK" } });
    const button = screen.getByRole("button", { name: "Append private outcome reconciliation (HOLD)" });
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I personally compared both watch outcomes/ }));
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I acknowledge permanent independent/ }));
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onNotesChange).toHaveBeenCalledOnce();
    expect(onNotesChange.mock.calls[0][0][0]).toMatchObject({
      category: "REQUEST_SOURCE_FRESHNESS_RECHECK",
      state: "PRIVATE_CONTINUITY_OUTCOME_NOT_SENT", closure: "NOT_AUTHORIZED" });
  });

  it("compares full Build 166 receipts read-only, and disallows writing to historical imports", async () => {
    const compareEarlierReceipt = vi.fn().mockReturnValue({ previous_watches: 1,
      current_watches: 2, new_watches: 1, comparison: null });
    render(<ContinuityOutcomePanel {...defaults} importedWatches={2}
      compareEarlierReceipt={compareEarlierReceipt} />);
    const file = new File(["{}"], "prior-166.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: () => Promise.resolve("{}") });
    fireEvent.change(screen.getByLabelText(/Compare earlier complete Build 166 private continuity receipt/),
      { target: { files: [file] } });
    await waitFor(() => expect(compareEarlierReceipt).toHaveBeenCalledWith("{}"));
    expect(screen.getByText(/Strict append-only prefix/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Append private outcome reconciliation (HOLD)" })).toBeDisabled();
  });
});
