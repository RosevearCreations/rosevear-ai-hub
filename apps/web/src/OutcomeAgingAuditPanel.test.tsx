import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { OutcomeAgingAuditPanel } from "./OutcomeAgingAuditPanel";
import type { TrialEnvironment } from "./ownerFieldTrial";

vi.mock("./ownerOutcomeAgingAudit", () => ({
  AGING_CATEGORIES: ["CONTINUE_INDEPENDENT_HOLD", "REQUEST_OWNER_EXCEPTION_RECHECK",
    "REQUEST_SOURCE_FRESHNESS_RECHECK", "REQUEST_OVERDUE_REVIEW"],
  compareOutcomeAging: (_outcomes: unknown[], _watches: unknown[], _dispositions: unknown[],
    _recurrences: unknown[], _followups: unknown[], _history: unknown[], _checks: unknown[],
    earlier: number, later: number) => {
    if (earlier !== 0 || later !== 1) throw new Error("Exact chronological pair required");
    return { baseline_outcome_index: 0, latest_outcome_index: 1,
      reassignment_watch_index: 0, case_id: "cameras",
      baseline_at: "2026-10-20T08:00:00Z", latest_at: "2026-10-26T08:00:00Z",
      baseline_owner_outcome: "passed", latest_owner_outcome: "issue",
      baseline_owner_claim: "household_owner", latest_owner_claim: "camera_operator",
      new_owner_trial_since_outcome: true, source_renewed_since_outcome: false,
      latest_source_confirmed_alias_claim: false, source_age_days: 12,
      outcome_age_days: 9, signals: ["OWNER_OUTCOME_CHANGED_AGAIN",
        "SOURCE_EVIDENCE_NOT_RENEWED", "SOURCE_EVIDENCE_OVERDUE",
        "EARLIER_OUTCOME_OVERDUE", "ORIGINAL_INDEPENDENT_HOLD_PERSISTS"], unresolved: true };
  },
  recordAgingAudit: (...args: unknown[]) => [{ ...args[10] as object,
    state: "PRIVATE_OUTCOME_AGING_AUDIT_NOT_SENT", closure: "NOT_AUTHORIZED" }],
}));

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const environment: TrialEnvironment = { installed_version: "0.0.7-build168",
  access: "local_console", installed_windows_witnessed: true };
const defaults = { outcomes: [
  { reassignment_watch_index: 0, latest_continuity_index: 0,
    recorded_at: "2026-10-20T08:00:00Z" },
  { reassignment_watch_index: 0, latest_continuity_index: 1,
    recorded_at: "2026-10-26T08:00:00Z" }] as never[],
  watches: [], dispositions: [], recurrences: [], followups: [], history: [], checks: [], notes: [],
  environment, importedOutcomes: 0, importedNotes: 0, onNotesChange: vi.fn(),
  compareEarlierReceipt: vi.fn() };

describe("Build 168 private outcome aging audit panel", () => {
  it("keeps field and independent HOLD visible without fetching external evidence", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<OutcomeAgingAuditPanel {...defaults} environment={{ ...environment,
      installed_windows_witnessed: false }} />);
    const panel = screen.getByRole("region", {
      name: "Build 168 independent continuity outcome aging audit and source freshness recheck" });
    expect(within(panel).getByText("INDEPENDENT REVIEW: HOLD")).toBeInTheDocument();
    expect(within(panel).getByText(/source age 12 day/)).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Append private aging audit (HOLD)" })).toBeDisabled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("requires both distinct personal HOLD acknowledgments", () => {
    const onNotesChange = vi.fn();
    render(<OutcomeAgingAuditPanel {...defaults} onNotesChange={onNotesChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Inspect exact aging outcome pair" }));
    fireEvent.change(screen.getByLabelText("Fixed HOLD-only aging audit category"),
      { target: { value: "REQUEST_SOURCE_FRESHNESS_RECHECK" } });
    const button = screen.getByRole("button", { name: "Append private aging audit (HOLD)" });
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I personally rechecked both owner outcomes/ }));
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I acknowledge permanent independent/ }));
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onNotesChange).toHaveBeenCalledOnce();
    expect(onNotesChange.mock.calls[0][0][0]).toMatchObject({
      category: "REQUEST_SOURCE_FRESHNESS_RECHECK",
      state: "PRIVATE_OUTCOME_AGING_AUDIT_NOT_SENT", closure: "NOT_AUTHORIZED" });
  });

  it("compares a prior full Build 167 receipt read-only and bars historical imported outcomes", async () => {
    const compareEarlierReceipt = vi.fn().mockReturnValue({ previous_outcomes: 1,
      current_outcomes: 2, new_outcomes: 1, comparison: null });
    render(<OutcomeAgingAuditPanel {...defaults} importedOutcomes={2}
      compareEarlierReceipt={compareEarlierReceipt} />);
    const file = new File(["{}"], "prior-167.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: () => Promise.resolve("{}") });
    fireEvent.change(screen.getByLabelText(/Compare earlier complete Build 167 private outcome receipt/),
      { target: { files: [file] } });
    await waitFor(() => expect(compareEarlierReceipt).toHaveBeenCalledWith("{}"));
    expect(screen.getByText(/Strict append-only prefix/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Append private aging audit (HOLD)" })).toBeDisabled();
  });
});
