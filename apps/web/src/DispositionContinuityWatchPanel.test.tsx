import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { DispositionContinuityWatchPanel } from "./DispositionContinuityWatchPanel";
import type { TrialEnvironment } from "./ownerFieldTrial";

vi.mock("./ownerDispositionContinuity", () => ({
  CONTINUITY_CATEGORIES: ["CONTINUE_INDEPENDENT_HOLD",
    "REQUEST_DISPOSITION_CONTINUITY_RECHECK", "REQUEST_SOURCE_RENEWAL_WITNESS",
    "REQUEST_OVERDUE_SOURCE_RENEWAL"],
  compareDispositionContinuity: (_dispositions: unknown[], _recurrences: unknown[],
    _followups: unknown[], _history: unknown[], _checks: unknown[], earlier: number,
    later: number) => {
    if (earlier !== 0 || later !== 1) throw new Error("Exact chronological pair required");
    return { baseline_disposition_index: 0, latest_disposition_index: 1,
      reassignment_watch_index: 0, case_id: "cameras", baseline_recurrence_index: 1,
      latest_recurrence_index: 2, baseline_at: "2026-10-18T08:00:00Z",
      latest_at: "2026-10-26T08:00:00Z", first_watch_at: "2026-10-08T08:00:00Z",
      baseline_category: "CONTINUE_INDEPENDENT_HOLD",
      latest_category: "REQUEST_SOURCE_EVIDENCE_RENEWAL", baseline_outcome: "passed",
      latest_outcome: "issue", baseline_owner_claim: "household_owner",
      latest_owner_claim: "camera_operator", baseline_source_check_index: 1,
      latest_source_check_index: 2, source_renewal_since_prior_disposition: false,
      latest_source_verified_claim: false, earlier_disposition_age_days: 9,
      first_watch_age_days: 19, age_band: "OVER_SEVEN_DAYS", signals: [
        "DISPOSITION_RECHECK_CHANGED", "SOURCE_RENEWAL_STALLED",
        "SOURCE_RENEWAL_UNVERIFIED", "OVERDUE_SOURCE_RECHECK_NEEDED",
        "ORIGINAL_INDEPENDENT_HOLD_PERSISTS"], unresolved: true };
  },
  recordContinuityWatch: (...args: unknown[]) => [{ ...args[8] as object,
    state: "PRIVATE_DISPOSITION_CONTINUITY_NOT_SENT", closure: "NOT_AUTHORIZED" }],
}));

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const environment: TrialEnvironment = { installed_version: "0.0.7-build166", access: "local_console",
  installed_windows_witnessed: true };
const defaults = { dispositions: [{ reassignment_watch_index: 0, latest_recurrence_index: 1,
  recorded_at: "2026-10-18T08:00:00Z" }, { reassignment_watch_index: 0, latest_recurrence_index: 2,
  recorded_at: "2026-10-26T08:00:00Z" }] as never[],
  recurrences: [], followups: [], history: [], checks: [], notes: [], environment,
  importedDispositions: 0, importedNotes: 0, onNotesChange: vi.fn(),
  compareEarlierReceipt: vi.fn() };

describe("Build 166 independent disposition continuity and overdue renewal owner panel", () => {
  it("shows source renewal and persistent HOLD with no automatic request", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<DispositionContinuityWatchPanel {...defaults} environment={{ ...environment,
      installed_windows_witnessed: false }} />);
    const panel = screen.getByRole("region", { name: "Build 166 independent disposition continuity and overdue source renewal watch" });
    expect(within(panel).getByText("INDEPENDENT REVIEW: HOLD")).toBeInTheDocument();
    expect(within(panel).getAllByText(/SOURCE RENEWAL STALLED/).length).toBeGreaterThan(0);
    expect(within(panel).getByRole("button", { name: "Append private continuity watch (HOLD)" })).toBeDisabled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("requires explicit source comparison and separate permanent independent HOLD acknowledgment", () => {
    const onNotesChange = vi.fn();
    render(<DispositionContinuityWatchPanel {...defaults} onNotesChange={onNotesChange} />);
    const panel = screen.getByRole("region", { name: "Build 166 independent disposition continuity and overdue source renewal watch" });
    fireEvent.click(within(panel).getByRole("button", { name: "Inspect exact private disposition pair" }));
    fireEvent.change(within(panel).getByLabelText("Fixed HOLD-only continuity category"),
      { target: { value: "REQUEST_OVERDUE_SOURCE_RENEWAL" } });
    const button = within(panel).getByRole("button", { name: "Append private continuity watch (HOLD)" });
    expect(button).toBeDisabled();
    fireEvent.click(within(panel).getByRole("checkbox", { name: /I personally compared the exact disposition rounds/ }));
    expect(button).toBeDisabled();
    fireEvent.click(within(panel).getByRole("checkbox", { name: /This is private HOLD-only evidence/ }));
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onNotesChange).toHaveBeenCalledTimes(1);
    expect(onNotesChange.mock.calls[0][0][0]).toMatchObject({
      category: "REQUEST_OVERDUE_SOURCE_RENEWAL",
      state: "PRIVATE_DISPOSITION_CONTINUITY_NOT_SENT", closure: "NOT_AUTHORIZED" });
  });

  it("compares complete Build 165 receipts read-only and keeps historical notes blocked", async () => {
    const compareEarlierReceipt = vi.fn().mockReturnValue({ previous_dispositions: 1,
      current_dispositions: 2, new_dispositions: 1, comparison: null });
    render(<DispositionContinuityWatchPanel {...defaults} importedDispositions={2}
      compareEarlierReceipt={compareEarlierReceipt} />);
    const file = new File(["{}"], "prior-165.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: () => Promise.resolve("{}") });
    fireEvent.change(screen.getByLabelText(/Compare earlier complete Build 165 private disposition receipt/),
      { target: { files: [file] } });
    await waitFor(() => expect(compareEarlierReceipt).toHaveBeenCalledWith("{}"));
    expect(screen.getByText(/Strict append-only prefix/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Append private continuity watch (HOLD)" })).toBeDisabled();
  });
});
