import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { OutcomeAgingFollowupPanel } from "./OutcomeAgingFollowupPanel";
import type { TrialEnvironment } from "./ownerFieldTrial";

vi.mock("./ownerOutcomeAgingFollowup", () => ({
  FOLLOWUP_CATEGORIES: ["CONTINUE_INDEPENDENT_HOLD", "REQUEST_OWNER_OUTCOME_FOLLOWUP",
    "REQUEST_OVERDUE_SOURCE_RECHECK", "REQUEST_INDEPENDENT_CONTINUITY_REVIEW"],
  compareAgingFollowups: (_audits: unknown[], _outcomes: unknown[], _watches: unknown[],
    _dispositions: unknown[], _recurrences: unknown[], _followups: unknown[],
    _history: unknown[], _checks: unknown[], earlier: number, later: number) => {
    if (earlier !== 0 || later !== 1) throw new Error("Exact pair required");
    return { baseline_audit_index: 0, latest_audit_index: 1,
      reassignment_watch_index: 0, case_id: "cameras",
      baseline_at: "2026-10-20T08:00:00Z", latest_at: "2026-10-26T08:00:00Z",
      baseline_owner_outcome: "passed", latest_owner_outcome: "issue",
      baseline_owner_claim: "household_owner", latest_owner_claim: "camera_operator",
      newer_witnessed_owner_trial: true, source_renewed_since_audit: true,
      latest_source_confirmed_alias_claim: false, earlier_source_age_days: 31,
      source_age_days: 25, prior_audit_age_days: 12,
      signals: ["OWNER_OUTCOME_DRIFT_CONTINUES", "SOURCE_EVIDENCE_OVERDUE",
        "REPEATED_OVERDUE_SOURCE_EVIDENCE", "PRIOR_AGING_AUDIT_OVERDUE",
        "INDEPENDENT_REVIEW_HOLD_PERSISTS"], unresolved: true };
  },
  recordAgingFollowup: (...args: unknown[]) => [{ ...args[11] as object,
    state: "PRIVATE_OUTCOME_AGING_FOLLOWUP_NOT_SENT", closure: "NOT_AUTHORIZED" }],
}));

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const environment: TrialEnvironment = { installed_version: "0.0.7-build169",
  access: "local_console", installed_windows_witnessed: true };
const defaults = { audits: [
  { reassignment_watch_index: 0, latest_outcome_index: 1,
    recorded_at: "2026-10-20T08:00:00Z" },
  { reassignment_watch_index: 0, latest_outcome_index: 2,
    recorded_at: "2026-10-26T08:00:00Z" }] as never[],
  outcomes: [], watches: [], dispositions: [], recurrences: [], followups: [],
  history: [], checks: [], notes: [], environment,
  importedAudits: 0, importedNotes: 0,
  onNotesChange: vi.fn(), compareEarlierReceipt: vi.fn() };

describe("Build 169 private independent aging follow-up panel", () => {
  it("shows repeated overdue source evidence and permanent HOLD with zero external fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<OutcomeAgingFollowupPanel {...defaults} environment={{ ...environment,
      installed_windows_witnessed: false }} />);
    const panel = screen.getByRole("region", {
      name: "Build 169 independent outcome aging follow-up reconciliation and overdue source continuity" });
    expect(within(panel).getByText("INDEPENDENT REVIEW: HOLD")).toBeInTheDocument();
    expect(within(panel).getByText(/earlier\/latest source age 31\/25 day/)).toBeInTheDocument();
    expect(within(panel).getByText(/repeatedly overdue source pair/)).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Append private aging follow-up (HOLD)" })).toBeDisabled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("only appends a manual private note after two separate HOLD acknowledgements", () => {
    const onNotesChange = vi.fn();
    render(<OutcomeAgingFollowupPanel {...defaults} onNotesChange={onNotesChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Inspect exact aging follow-up pair" }));
    fireEvent.change(screen.getByLabelText("Fixed HOLD-only follow-up category"),
      { target: { value: "REQUEST_OVERDUE_SOURCE_RECHECK" } });
    const button = screen.getByRole("button", { name: "Append private aging follow-up (HOLD)" });
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I personally compared two aging audits/ }));
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I acknowledge permanent independent/ }));
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onNotesChange).toHaveBeenCalledOnce();
    expect(onNotesChange.mock.calls[0][0][0]).toMatchObject({
      category: "REQUEST_OVERDUE_SOURCE_RECHECK",
      state: "PRIVATE_OUTCOME_AGING_FOLLOWUP_NOT_SENT", closure: "NOT_AUTHORIZED" });
  });

  it("compares full Build 168 receipts read-only and never records from an imported audit", async () => {
    const compareEarlierReceipt = vi.fn().mockReturnValue({ previous_audits: 1,
      current_audits: 2, new_audits: 1, comparison: null });
    render(<OutcomeAgingFollowupPanel {...defaults} importedAudits={2}
      compareEarlierReceipt={compareEarlierReceipt} />);
    const file = new File(["{}"], "prior-168.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: () => Promise.resolve("{}") });
    fireEvent.change(screen.getByLabelText(/Compare earlier complete Build 168 private aging audit receipt/),
      { target: { files: [file] } });
    await waitFor(() => expect(compareEarlierReceipt).toHaveBeenCalledWith("{}"));
    expect(screen.getByText(/Strict append-only prefix/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Append private aging follow-up (HOLD)" })).toBeDisabled();
  });
});
