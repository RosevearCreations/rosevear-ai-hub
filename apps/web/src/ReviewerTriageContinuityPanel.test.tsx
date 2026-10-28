import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { ReviewerTriageContinuityPanel } from "./ReviewerTriageContinuityPanel";
import type { TrialEnvironment } from "./ownerFieldTrial";
import type { RenewalTriageReceipt } from "./ownerReviewerRenewalTriage";

vi.mock("./ownerReviewerTriageContinuity", () => ({
  TRIAGE_CONTINUITY_CATEGORIES: ["CONTINUE_REVIEWER_TRIAGE_HOLD",
    "REQUEST_QL248_TWO_SHA_OPERATOR_AUDIT"],
  inspectQl248AuditDraft: (data: { source_sha: string }) => ({
    checks: [{ check: "Audited source commit S format", ready: data.source_sha.length === 40 }],
    format_complete: false,
  }),
  compareTriageRenewalContinuity: (_prior: unknown, earlier: number, later: number) => {
    if (earlier !== 0 || later !== 1) throw new Error("Wrong pair");
    return { earlier_triage_index: 0, later_triage_index: 1,
      case_id: "cameras", reassignment_watch_index: 0,
      earlier_at: "2026-10-26T08:00:00Z", later_at: "2026-11-03T08:00:00Z",
      newer_owner_witness_claim: false, newer_distinct_source_claim: false,
      repeated_owner_gap: true, repeated_source_gap: true,
      source_identity_drift: true, source_age_days: 9, earlier_triage_age_days: 17,
      signals: ["POST_TRIAGE_OWNER_WITNESS_MISSING", "POST_TRIAGE_SOURCE_RECHECK_MISSING",
        "QL248_TWO_SHA_CONSUMER_AGREEMENT_PENDING"] };
  },
  recordTriageContinuity: () => [{ state: "PRIVATE_TRIAGE_RENEWAL_CONTINUITY_NOT_SENT",
    closure: "NOT_AUTHORIZED", private_runner_approval: "NOT_GIVEN" }],
}));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const environment: TrialEnvironment = { installed_version: "0.0.9-build176", access: "local_console",
  installed_windows_witnessed: true };
const prior = { renewal_triage_notes: [
  { case_id: "cameras", reassignment_watch_index: 0, later_reviewer_index: 1,
    recorded_at: "2026-10-26T08:00:00Z" },
  { case_id: "cameras", reassignment_watch_index: 0, later_reviewer_index: 2,
    recorded_at: "2026-11-03T08:00:00Z" },
] } as RenewalTriageReceipt;
const props = { prior, notes: [], environment, importedTriages: 0,
  importedContinuity: 0, onNotesChange: vi.fn(), compareEarlierReceipt: vi.fn() };

describe("Build 177 private triage continuity and QL-248 audit preparation UI", () => {
  it("shows public-only format checks and no approval/network controls", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<ReviewerTriageContinuityPanel {...props}
      environment={{ ...environment, installed_windows_witnessed: false }} />);
    const panel = screen.getByRole("region", {
      name: "Build 177 independent triage continuity and QL-248 public audit preparation" });
    expect(within(panel).getByText("INDEPENDENT REVIEW: HOLD")).toBeInTheDocument();
    expect(within(panel).getByText(/Audited source commit S format/)).toBeInTheDocument();
    expect(within(panel).getByText(/Source age 9 days/)).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: /Append private Build 177 triage continuity/ }))
      .toBeDisabled();
    expect(within(panel).queryByRole("button", { name: /authorize|connect|send proof|approve/i }))
      .not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it("requires both personal recheck and separate HOLD acknowledgments", () => {
    const onNotesChange = vi.fn();
    render(<ReviewerTriageContinuityPanel {...props} onNotesChange={onNotesChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Inspect exact triage continuity pair" }));
    const button = screen.getByRole("button", { name: /Append private Build 177 triage continuity/ });
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I personally reviewed/ }));
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I separately acknowledge/ }));
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onNotesChange).toHaveBeenCalledOnce();
  });
  it("treats imported later triage as history and refuses local advancement", () => {
    render(<ReviewerTriageContinuityPanel {...props} importedTriages={2} />);
    fireEvent.click(screen.getByRole("button", { name: "Inspect exact triage continuity pair" }));
    expect(screen.getByRole("button", { name: /Append private Build 177 triage continuity/ }))
      .toBeDisabled();
  });
});
