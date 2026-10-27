import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { RecurrenceDispositionPanel } from "./RecurrenceDispositionPanel";
import type { TrialEnvironment } from "./ownerFieldTrial";

vi.mock("./ownerRecurrenceDisposition", () => ({
  DISPOSITION_CATEGORIES: ["CONTINUE_INDEPENDENT_HOLD", "REQUEST_DISPOSITION_RECHECK",
    "REQUEST_SOURCE_EVIDENCE_RENEWAL", "REQUEST_OVERDUE_INDEPENDENT_REVIEW"],
  compareRecurrenceDispositions: (_notes: unknown[], _followups: unknown[], _history: unknown[],
    _checks: unknown[], earlier: number, later: number) => {
    if (earlier !== 0 || later !== 1) throw new Error("Exact chronological pair required");
    return { baseline_recurrence_index: 0, latest_recurrence_index: 1,
      reassignment_watch_index: 0, case_id: "cameras", baseline_followup_index: 1,
      latest_followup_index: 2, baseline_at: "2026-10-20T08:00:00Z",
      latest_at: "2026-10-26T08:00:00Z", first_watch_at: "2026-10-10T08:00:00Z",
      baseline_disposition: "CONTINUE_INDEPENDENT_HOLD",
      latest_disposition: "REQUEST_SOURCE_WITNESS_RECHECK", baseline_outcome: "passed",
      latest_outcome: "issue", baseline_owner_claim: "household_owner",
      latest_owner_claim: "camera_operator", baseline_source_check_index: 1,
      latest_source_check_index: 2, source_evidence_renewed: false,
      age_since_first_disposition_days: 7, age_since_watch_days: 17,
      age_band: "THREE_TO_SEVEN_DAYS", signals: ["OWNER_OUTCOME_CHANGED",
        "SOURCE_EVIDENCE_NOT_RENEWED", "ORIGINAL_WATCH_STILL_HELD"], unresolved: true };
  },
  recordDispositionFollowup: (...args: unknown[]) => [{ ...args[7] as object,
    state: "PRIVATE_RECURRENCE_DISPOSITION_NOT_SENT", closure: "NOT_AUTHORIZED" }],
}));

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const environment: TrialEnvironment = { installed_version: "0.0.7-build165", access: "local_console",
  installed_windows_witnessed: true };
const defaults = { recurrences: [{ reassignment_watch_index: 0, latest_followup_index: 1,
  recorded_at: "2026-10-20T08:00:00Z" }, { reassignment_watch_index: 0, latest_followup_index: 2,
  recorded_at: "2026-10-26T08:00:00Z" }] as never[], followups: [], history: [], checks: [],
  notes: [], environment, importedRecurrences: 0, importedNotes: 0,
  onNotesChange: vi.fn(), compareEarlierReceipt: vi.fn() };

describe("Build 165 independent disposition and source renewal owner panel", () => {
  it("shows source renewal hold and requires actual installed Windows witness", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<RecurrenceDispositionPanel {...defaults} environment={{ ...environment,
      installed_windows_witnessed: false }} />);
    const panel = screen.getByRole("region", { name: "Build 165 independent recurrence disposition follow-up and source evidence renewal" });
    expect(within(panel).getByText("INDEPENDENT REVIEW: HOLD")).toBeInTheDocument();
    expect(within(panel).getAllByText(/SOURCE EVIDENCE NOT RENEWED/).length).toBeGreaterThan(0);
    expect(within(panel).getByRole("button", { name: "Append private disposition follow-up (HOLD)" })).toBeDisabled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("requires separate manual evidence comparison and independent HOLD acknowledgement", () => {
    const onNotesChange = vi.fn();
    render(<RecurrenceDispositionPanel {...defaults} onNotesChange={onNotesChange} />);
    const panel = screen.getByRole("region", { name: "Build 165 independent recurrence disposition follow-up and source evidence renewal" });
    fireEvent.click(within(panel).getByRole("button", { name: "Inspect exact private recurrence pair" }));
    fireEvent.change(within(panel).getByLabelText("Fixed HOLD-only disposition category"),
      { target: { value: "REQUEST_SOURCE_EVIDENCE_RENEWAL" } });
    const button = within(panel).getByRole("button", { name: "Append private disposition follow-up (HOLD)" });
    expect(button).toBeDisabled();
    fireEvent.click(within(panel).getByRole("checkbox", { name: /I personally compared both exact recurrence notes/ }));
    expect(button).toBeDisabled();
    fireEvent.click(within(panel).getByRole("checkbox", { name: /This is private HOLD-only evidence/ }));
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onNotesChange).toHaveBeenCalledTimes(1);
    expect(onNotesChange.mock.calls[0][0][0]).toMatchObject({
      category: "REQUEST_SOURCE_EVIDENCE_RENEWAL",
      state: "PRIVATE_RECURRENCE_DISPOSITION_NOT_SENT", closure: "NOT_AUTHORIZED" });
  });

  it("performs read-only Build 164 receipt comparison and holds imported-only recurrence", async () => {
    const compareEarlierReceipt = vi.fn().mockReturnValue({ previous_recurrences: 1,
      current_recurrences: 2, new_recurrences: 1, comparison: null });
    render(<RecurrenceDispositionPanel {...defaults} importedRecurrences={2}
      compareEarlierReceipt={compareEarlierReceipt} />);
    const file = new File(["{}"], "prior-164.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: () => Promise.resolve("{}") });
    fireEvent.change(screen.getByLabelText(/Compare earlier complete Build 164 private recurrence receipt/),
      { target: { files: [file] } });
    await waitFor(() => expect(compareEarlierReceipt).toHaveBeenCalledWith("{}"));
    expect(screen.getByText(/Strict append-only prefix/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Append private disposition follow-up (HOLD)" })).toBeDisabled();
  });
});
