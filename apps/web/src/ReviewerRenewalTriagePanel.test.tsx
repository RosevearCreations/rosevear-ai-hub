import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { ReviewerRenewalTriagePanel } from "./ReviewerRenewalTriagePanel";
import type { ReviewerFollowupReceipt } from "./ownerHeldReviewerFollowup";
import type { TrialEnvironment } from "./ownerFieldTrial";

vi.mock("./ownerReviewerRenewalTriage", () => ({
  RENEWAL_TRIAGE_CATEGORIES: ["CONTINUE_INDEPENDENT_HOLD", "REQUEST_PRIVATE_RUNNER_SCOPE_REVIEW"],
  PRIVATE_RUNNER_TRIAGE: [
    { check: "Private runner scope and expiry", state: "NOT_AUTHORIZED" },
    { check: "Isolated test runner", state: "NOT_PROVISIONED" },
  ],
  compareReviewerRenewalTriage: (_prior: unknown, earlier: number, later: number) => {
    if (earlier !== 0 || later !== 1) throw new Error("Exact pair required");
    return { earlier_reviewer_index: 0, later_reviewer_index: 1,
      case_id: "cameras", reassignment_watch_index: 0,
      earlier_at: "2026-10-12T08:00:00Z", later_at: "2026-10-24T08:00:00Z",
      newer_owner_witness_claim: false, newer_distinct_source_claim: false,
      repeated_owner_gap: true, repeated_source_gap: true, source_identity_drift: true,
      source_age_days: 35, earlier_review_age_days: 40,
      signals: ["NEW_OWNER_EVIDENCE_MISSING", "NEW_SOURCE_EVIDENCE_MISSING",
        "PRIVATE_RUNNER_APPROVAL_NOT_SUPPLIED", "QL248_PIN_AND_PROOF_PENDING",
        "FIELD_AND_VAULT_HOLDS_CONTINUE"] };
  },
  recordReviewerRenewalTriage: () => [{ state: "PRIVATE_REVIEWER_RENEWAL_TRIAGE_NOT_SENT",
    closure: "NOT_AUTHORIZED", private_runner_approval: "NOT_GIVEN" }],
}));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const environment: TrialEnvironment = { installed_version: "0.0.8-build175",
  access: "local_console", installed_windows_witnessed: true };
const prior = { reviewer_followups: [
  { case_id: "cameras", reassignment_watch_index: 0,
    later_reassessment_index: 1, recorded_at: "2026-10-12T08:00:00Z" },
  { case_id: "cameras", reassignment_watch_index: 0,
    later_reassessment_index: 2, recorded_at: "2026-10-24T08:00:00Z" },
] } as ReviewerFollowupReceipt;
const props = { prior, notes: [], environment, importedReviewers: 0,
  importedTriages: 0, onNotesChange: vi.fn(), compareEarlierReceipt: vi.fn() };

describe("Build 176 private runner approval evidence triage UI", () => {
  it("shows real approval gaps and QL-248 HOLD without any fetch or approval control", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<ReviewerRenewalTriagePanel {...props}
      environment={{ ...environment, installed_windows_witnessed: false }} />);
    const panel = screen.getByRole("region", {
      name: "Build 176 independent reviewer renewal and private runner approval evidence triage" });
    expect(within(panel).getByText("INDEPENDENT REVIEW: HOLD")).toBeInTheDocument();
    expect(within(panel).getByText(/QL-248 source-proof amendment/)).toBeInTheDocument();
    expect(within(panel).getByText(/Source age 35 days/)).toBeInTheDocument();
    expect(within(panel).getByText(/Private runner scope and expiry/)).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: /Append private Build 176 reviewer renewal triage/ }))
      .toBeDisabled();
    expect(within(panel).queryByRole("button", { name: /approve runner/i })).not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it("requires personal review and separate HOLD acknowledgment", () => {
    const onNotesChange = vi.fn();
    render(<ReviewerRenewalTriagePanel {...props} onNotesChange={onNotesChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Inspect exact reviewer renewal pair" }));
    const button = screen.getByRole("button", { name: /Append private Build 176 reviewer renewal triage/ });
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I personally rechecked/ }));
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I separately acknowledge/ }));
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onNotesChange).toHaveBeenCalledOnce();
  });
  it("does not promote an imported later reviewer note to fresh evidence", () => {
    render(<ReviewerRenewalTriagePanel {...props} importedReviewers={2} />);
    fireEvent.click(screen.getByRole("button", { name: "Inspect exact reviewer renewal pair" }));
    expect(screen.getByRole("button", { name: /Append private Build 176 reviewer renewal triage/ }))
      .toBeDisabled();
  });
});
