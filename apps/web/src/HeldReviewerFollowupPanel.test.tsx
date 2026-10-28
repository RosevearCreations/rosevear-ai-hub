import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { HeldReviewerFollowupPanel } from "./HeldReviewerFollowupPanel";
import type { HeldReassessmentReceipt } from "./ownerHeldDispositionReassessment";
import type { TrialEnvironment } from "./ownerFieldTrial";

vi.mock("./ownerHeldReviewerFollowup", () => ({
  REVIEWER_FOLLOWUP_CATEGORIES: ["CONTINUE_INDEPENDENT_HOLD", "REQUEST_SEPARATE_REVIEWER"],
  compareHeldReviewerFollowups: (_prior: unknown, earlier: number, later: number) => {
    if (earlier !== 0 || later !== 1) throw new Error("Exact pair required");
    return { earlier_reassessment_index: 0, later_reassessment_index: 1,
      case_id: "cameras", reassignment_watch_index: 0,
      earlier_at: "2026-10-12T08:00:00Z", later_at: "2026-10-24T08:00:00Z",
      later_owner_claim: false, later_distinct_source_claim: false,
      repeated_owner_gap: true, repeated_source_gap: true, source_identity_conflict: true,
      source_age_days: 35, earlier_review_age_days: 40,
      signals: ["LATER_OWNER_CLAIM_MISSING", "LATER_SOURCE_CLAIM_MISSING",
        "OVERDUE_SOURCE_RENEWAL", "INDEPENDENT_REVIEWER_EVIDENCE_MISSING",
        "FIELD_AND_VAULT_HOLDS_CONTINUE"] };
  },
  recordHeldReviewerFollowup: () => [{ state: "PRIVATE_HELD_REVIEWER_FOLLOWUP_NOT_SENT",
    closure: "NOT_AUTHORIZED", category: "CONTINUE_INDEPENDENT_HOLD" }],
}));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const environment: TrialEnvironment = { installed_version: "0.0.8-build174",
  access: "local_console", installed_windows_witnessed: true };
const prior = { held_disposition_reassessments: [
  { case_id: "cameras", reassignment_watch_index: 0,
    later_followup_index: 1, recorded_at: "2026-10-12T08:00:00Z" },
  { case_id: "cameras", reassignment_watch_index: 0,
    later_followup_index: 2, recorded_at: "2026-10-24T08:00:00Z" },
] } as HeldReassessmentReceipt;
const props = { prior, notes: [], environment, importedReassessments: 0,
  importedFollowups: 0, onNotesChange: vi.fn(), compareEarlierReceipt: vi.fn() };

describe("Build 175 held reviewer follow-up UI", () => {
  it("shows unchanged QL-247 private-runner, source and reviewer HOLDs without fetch", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<HeldReviewerFollowupPanel {...props}
      environment={{ ...environment, installed_windows_witnessed: false }} />);
    const panel = screen.getByRole("region", {
      name: "Build 175 held independent reviewer follow-up and overdue source renewal" });
    expect(within(panel).getByText("INDEPENDENT REVIEW: HOLD")).toBeInTheDocument();
    expect(within(panel).getByText(/QL-247 PHASE A: PENDING/)).toBeInTheDocument();
    expect(within(panel).getByText(/Source age 35 days/)).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: /Append private Build 175 reviewer follow-up/ }))
      .toBeDisabled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it("requires separate manual owner/source evidence and independent HOLD checks", () => {
    const onNotesChange = vi.fn();
    render(<HeldReviewerFollowupPanel {...props} onNotesChange={onNotesChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Inspect exact held reviewer pair" }));
    const button = screen.getByRole("button", { name: /Append private Build 175 reviewer follow-up/ });
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I personally compared/ }));
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I separately acknowledge/ }));
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onNotesChange).toHaveBeenCalledOnce();
  });
  it("refuses imported later reassessment as fresh evidence", () => {
    render(<HeldReviewerFollowupPanel {...props} importedReassessments={2} />);
    fireEvent.click(screen.getByRole("button", { name: "Inspect exact held reviewer pair" }));
    expect(screen.getByRole("button", { name: /Append private Build 175 reviewer follow-up/ }))
      .toBeDisabled();
  });
});
