import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { RecurrenceDispositionFollowupPanel } from "./RecurrenceDispositionFollowupPanel";
import type { ExceptionReceipt } from "./ownerOutcomeExceptionRecurrence";
import type { TrialEnvironment } from "./ownerFieldTrial";

vi.mock("./ownerRecurrenceDispositionFollowup", () => ({
  FOLLOWUP_CATEGORIES: ["CONTINUE_INDEPENDENT_HOLD", "REQUEST_SOURCE_REVALIDATION"],
  compareDispositionFollowups: (_prior: unknown, earlier: number, later: number) => {
    if (earlier !== 0 || later !== 1) throw new Error("Exact case pair required");
    return { earlier_recurrence_index: 0, later_recurrence_index: 1,
      case_id: "cameras", reassignment_watch_index: 0,
      earlier_at: "2026-10-01T08:00:00Z", later_at: "2026-10-12T08:00:00Z",
      earlier_source_age_days: 41, later_source_age_days: 30,
      earlier_recurrence_age_days: 42, newer_witnessed_owner_claim: false,
      newer_distinct_source_claim: false, source_identity_or_access_conflict: true,
      repeated_owner_gap: true, repeated_source_gap: true,
      signals: ["REPEATED_OWNER_GAP", "SOURCE_RECHECK_MISSING", "SOURCE_OVERDUE",
        "INDEPENDENT_HOLD_CONTINUES"] };
  },
  recordDispositionFollowup: () => [{ state: "PRIVATE_RECURRENCE_DISPOSITION_FOLLOWUP_NOT_SENT",
    closure: "NOT_AUTHORIZED", category: "CONTINUE_INDEPENDENT_HOLD" }],
}));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const environment: TrialEnvironment = { installed_version: "0.0.8-build172",
  access: "local_console", installed_windows_witnessed: true };
const prior = { exception_recurrences: [
  { case_id: "cameras", reassignment_watch_index: 0, latest_outcome_index: 0,
    recorded_at: "2026-10-01T08:00:00Z" },
  { case_id: "cameras", reassignment_watch_index: 0, latest_outcome_index: 1,
    recorded_at: "2026-10-12T08:00:00Z" },
] } as ExceptionReceipt;
const props = { prior, notes: [], environment, importedRecurrences: 0,
  importedFollowups: 0, onNotesChange: vi.fn(), compareEarlierReceipt: vi.fn() };

describe("Build 173 private recurrence disposition follow-up UI", () => {
  it("shows source and owner gaps, no network activity, permanent HOLD", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<RecurrenceDispositionFollowupPanel {...props}
      environment={{ ...environment, installed_windows_witnessed: false }} />);
    const panel = screen.getByRole("region", {
      name: "Build 173 independent recurrence disposition follow-up aging and owner source recheck" });
    expect(within(panel).getByText("INDEPENDENT REVIEW: HOLD")).toBeInTheDocument();
    expect(within(panel).getByText(/Earlier\/latest source age: 41\/30 days/)).toBeInTheDocument();
    expect(within(panel).getByText(/REPEATED OWNER GAP/)).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: /Append private Build 173 follow-up/ })).toBeDisabled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("requires distinct operator review and permanent HOLD acknowledgement", () => {
    const onNotesChange = vi.fn();
    render(<RecurrenceDispositionFollowupPanel {...props} onNotesChange={onNotesChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Inspect exact disposition pair" }));
    const button = screen.getByRole("button", { name: /Append private Build 173 follow-up/ });
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I personally rechecked the owner/ }));
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I separately acknowledge the independent/ }));
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onNotesChange).toHaveBeenCalledOnce();
  });
});
