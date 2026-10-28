import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { HeldDispositionReassessmentPanel } from "./HeldDispositionReassessmentPanel";
import type { DispositionFollowupReceipt } from "./ownerRecurrenceDispositionFollowup";
import type { TrialEnvironment } from "./ownerFieldTrial";

vi.mock("./ownerHeldDispositionReassessment", () => ({
  HELD_REASSESSMENT_CATEGORIES: ["CONTINUE_INDEPENDENT_HOLD", "REQUEST_SEPARATE_REVIEWER_PROOF"],
  compareHeldDispositionReassessments: (_prior: unknown, earlier: number, later: number) => {
    if (earlier !== 0 || later !== 1) throw new Error("Exact held pair required");
    return { earlier_followup_index: 0, later_followup_index: 1,
      case_id: "cameras", reassignment_watch_index: 0,
      earlier_at: "2026-10-01T08:00:00Z", later_at: "2026-10-12T08:00:00Z",
      newer_owner_witness_claim: false, newer_source_check_claim: false,
      repeated_owner_gap: true, repeated_source_gap: true, identity_conflict_unresolved: true,
      source_age_days: 40, earlier_followup_age_days: 42,
      signals: ["OWNER_CONTINUITY_GAP", "SOURCE_CONTINUITY_GAP",
        "SOURCE_IDENTITY_CONFLICT_UNRESOLVED", "SEPARATE_REVIEWER_PROOF_MISSING",
        "INDEPENDENT_HOLD_CONTINUES"] };
  },
  recordHeldDispositionReassessment: () => [{ state: "PRIVATE_HELD_DISPOSITION_REASSESSMENT_NOT_SENT",
    closure: "NOT_AUTHORIZED", category: "CONTINUE_INDEPENDENT_HOLD" }],
}));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const environment: TrialEnvironment = { installed_version: "0.0.8-build173",
  access: "local_console", installed_windows_witnessed: true };
const prior = { recurrence_disposition_followups: [
  { case_id: "cameras", reassignment_watch_index: 0,
    later_recurrence_index: 0, recorded_at: "2026-10-01T08:00:00Z" },
  { case_id: "cameras", reassignment_watch_index: 0,
    later_recurrence_index: 1, recorded_at: "2026-10-12T08:00:00Z" },
] } as DispositionFollowupReceipt;
const props = { prior, notes: [], environment, importedFollowups: 0,
  importedReassessments: 0, onNotesChange: vi.fn(), compareEarlierReceipt: vi.fn() };

describe("Build 174 held source review UI", () => {
  it("shows evidence gaps, pending QL-246 and immutable HOLD without any fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<HeldDispositionReassessmentPanel {...props}
      environment={{ ...environment, installed_windows_witnessed: false }} />);
    const panel = screen.getByRole("region", {
      name: "Build 174 held disposition source recheck and independent reviewer reassessment" });
    expect(within(panel).getByText("INDEPENDENT REVIEW: HOLD")).toBeInTheDocument();
    expect(within(panel).getByText(/Source age: 40 days/)).toBeInTheDocument();
    expect(within(panel).getByText(/QL-246: no signed public proof/)).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: /Append private Build 174 reassessment/ }))
      .toBeDisabled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("requires distinct personal source review and separate HOLD acknowledgment", () => {
    const onNotesChange = vi.fn();
    render(<HeldDispositionReassessmentPanel {...props} onNotesChange={onNotesChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Inspect exact held follow-up pair" }));
    const button = screen.getByRole("button", { name: /Append private Build 174 reassessment/ });
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I personally compared/ }));
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I separately acknowledge/ }));
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onNotesChange).toHaveBeenCalledOnce();
  });

  it("does not promote an imported later follow-up to fresh evidence", () => {
    render(<HeldDispositionReassessmentPanel {...props} importedFollowups={2} />);
    fireEvent.click(screen.getByRole("button", { name: "Inspect exact held follow-up pair" }));
    expect(screen.getByRole("button", { name: /Append private Build 174 reassessment/ }))
      .toBeDisabled();
  });
});
