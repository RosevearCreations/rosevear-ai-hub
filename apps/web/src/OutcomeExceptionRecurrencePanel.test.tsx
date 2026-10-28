import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { OutcomeExceptionRecurrencePanel } from "./OutcomeExceptionRecurrencePanel";
import type { DriftOutcomeReceipt } from "./ownerSourceDriftOutcome";
import type { TrialEnvironment } from "./ownerFieldTrial";

vi.mock("./ownerOutcomeExceptionRecurrence", () => ({
  EXCEPTION_CATEGORIES: ["CONTINUE_INDEPENDENT_HOLD", "REQUEST_RECURRING_SOURCE_REVIEW"],
  compareOutcomeExceptions: (_prior: unknown, earlier: number, later: number) => {
    if (earlier !== 0 || later !== 1) throw new Error("Exact case pair required");
    return { baseline_outcome_index: 0, latest_outcome_index: 1, case_id: "cameras",
      reassignment_watch_index: 0, baseline_at: "2026-10-01T08:00:00Z",
      latest_at: "2026-10-12T08:00:00Z", baseline_source_age_days: 41,
      latest_source_age_days: 30, earlier_outcome_age_days: 42,
      owner_witness_fresh_since_prior_outcome: false, source_evidence_fresh_since_prior_outcome: false,
      repeated_owner_gap: true, repeated_source_gap: true, repeated_identity_drift: true,
      signals: ["REPEATED_OWNER_WITNESS_GAP", "REPEATED_SOURCE_IDENTITY_DRIFT",
        "SOURCE_STILL_OVERDUE", "INDEPENDENT_HOLD_CONTINUES"] };
  },
  recordExceptionRecurrence: () => [{ state: "PRIVATE_OUTCOME_EXCEPTION_RECURRENCE_NOT_SENT",
    closure: "NOT_AUTHORIZED", category: "CONTINUE_INDEPENDENT_HOLD" }],
}));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const environment: TrialEnvironment = { installed_version: "0.0.8-build171",
  access: "local_console", installed_windows_witnessed: true };
const prior = { drift_outcomes: [
  { case_id: "cameras", reassignment_watch_index: 0, latest_recheck_index: 0,
    recorded_at: "2026-10-01T08:00:00Z" },
  { case_id: "cameras", reassignment_watch_index: 0, latest_recheck_index: 1,
    recorded_at: "2026-10-12T08:00:00Z" },
] } as DriftOutcomeReceipt;
const props = { prior, notes: [], environment, importedOutcomes: 0,
  importedRecurrences: 0, onNotesChange: vi.fn(), compareEarlierReceipt: vi.fn() };

describe("Build 172 private recurrence and owner freshness UI", () => {
  it("reports repeated source/owner gaps and permanent HOLD without any network access", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<OutcomeExceptionRecurrencePanel {...props}
      environment={{ ...environment, installed_windows_witnessed: false }} />);
    const panel = screen.getByRole("region", {
      name: "Build 172 independent exception recurrence and owner continuity freshness" });
    expect(within(panel).getByText("INDEPENDENT REVIEW: HOLD")).toBeInTheDocument();
    expect(within(panel).getByText(/source age: 41\/30 days/)).toBeInTheDocument();
    expect(within(panel).getByText(/REPEATED OWNER WITNESS GAP/)).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: /Append private Build 172 recurrence/ })).toBeDisabled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it("requires independent manual comparison and separate permanent HOLD attestation", () => {
    const onNotesChange = vi.fn();
    render(<OutcomeExceptionRecurrencePanel {...props} onNotesChange={onNotesChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Inspect exact recurrence pair" }));
    const button = screen.getByRole("button", { name: /Append private Build 172 recurrence/ });
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I personally compared these outcomes/ }));
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I separately acknowledge immutable/ }));
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onNotesChange).toHaveBeenCalledOnce();
  });
});
