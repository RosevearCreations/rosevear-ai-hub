import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { OutcomeRecurrencePanel } from "./OutcomeRecurrencePanel";
import type { TrialEnvironment } from "./ownerFieldTrial";
import type { FollowupOutcomeEvent } from "./ownerFollowupOutcome";
import type { HandoffFollowupEvent } from "./ownerHandoffReconciliation";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const environment: TrialEnvironment = { installed_version: "0.0.7-build159", access: "local_console",
  installed_windows_witnessed: true };
const followups = [{ case_id: "cameras", discrepancies: ["SOURCE_ALIAS_STATE_CHANGED"] }] as HandoffFollowupEvent[];
const base = { review_index: 0, source_check_index: null, historical_exception_continues: true,
  personally_witnessed: true, hold_acknowledged: true, state: "PRIVATE_REASSESSMENT_NOT_SENT",
  closure: "NOT_AUTHORIZED" } as const;
const outcomes: FollowupOutcomeEvent[] = [
  { ...base, observation_index: 2, observation_at: "2026-10-14T09:00:00Z",
    recorded_at: "2026-10-14T10:00:00Z", outcome: "OWNER_IMPROVEMENT_UNVERIFIED" },
  { ...base, observation_index: 3, observation_at: "2026-10-18T09:00:00Z",
    recorded_at: "2026-10-18T10:00:00Z", outcome: "ISSUE_RECURRED" },
];
const defaults = { outcomes, followups, checks: [], rechecks: [], environment,
  importedOutcomes: 0, importedRechecks: 0, onRechecksChange: vi.fn() };

describe("Build 159 private recurrence panel", () => {
  it("shows a changed owner claim, keeps HOLD and makes no network request", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<OutcomeRecurrencePanel {...defaults} environment={{ ...environment, installed_windows_witnessed: false }} />);
    const panel = screen.getByRole("region", { name: "Build 159 independent outcome recurrence and historical exception oversight" });
    expect(within(panel).getByText("INDEPENDENT REVIEW: HOLD")).toBeInTheDocument();
    expect(within(panel).getByText(/ISSUE RECURRED AFTER IMPROVEMENT/)).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Append private historical exception recheck (HOLD)" })).toBeDisabled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("requires an exact witnessed pair and two distinct HOLD confirmations", () => {
    const onRechecksChange = vi.fn();
    render(<OutcomeRecurrencePanel {...defaults} onRechecksChange={onRechecksChange} />);
    const panel = screen.getByRole("region", { name: "Build 159 independent outcome recurrence and historical exception oversight" });
    fireEvent.click(within(panel).getByRole("button", { name: "Inspect exact outcome pair" }));
    const button = within(panel).getByRole("button", { name: "Append private historical exception recheck (HOLD)" });
    fireEvent.change(within(panel).getByLabelText("Fixed private recheck reason"),
      { target: { value: "REQUEST_RECURRENCE_WITNESS" } });
    const witness = within(panel).getByRole("checkbox", { name: /I personally compared both outcome rounds/ });
    const hold = within(panel).getByRole("checkbox", { name: /I acknowledge this is a private NOT SENT HOLD note/ });
    expect(button).toBeDisabled();
    fireEvent.click(witness);
    expect(button).toBeDisabled();
    fireEvent.click(hold);
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onRechecksChange).toHaveBeenCalledTimes(1);
    expect(onRechecksChange.mock.calls[0][0][0]).toMatchObject({
      recheck_reason: "REQUEST_RECURRENCE_WITNESS", state: "PRIVATE_RECHECK_NOT_SENT",
      closure: "NOT_AUTHORIZED" });
  });

  it("does not treat imported outcomes as fresh authority", () => {
    render(<OutcomeRecurrencePanel {...defaults} importedOutcomes={2} />);
    expect(screen.getByRole("button", { name: "Append private historical exception recheck (HOLD)" })).toBeDisabled();
    expect(screen.getByText(/Imported historical only/)).toBeInTheDocument();
  });
});
