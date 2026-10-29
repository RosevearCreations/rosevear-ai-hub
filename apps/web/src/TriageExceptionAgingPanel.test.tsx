import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { TriageExceptionAgingPanel } from "./TriageExceptionAgingPanel";
import type { TrialEnvironment } from "./ownerFieldTrial";
import type { Ql248AuditDraft, TriageContinuityReceipt } from "./ownerReviewerTriageContinuity";

vi.mock("./ownerReviewerTriageContinuity", () => ({
  inspectQl248AuditDraft: () => ({ format_complete: false }),
}));
vi.mock("./ownerTriageExceptionAging", () => ({
  TRIAGE_EXCEPTION_CATEGORIES: ["KEEP_INDEPENDENT_HOLD", "REQUEST_QL248_PROVENANCE_WITNESS"],
  compareTriageExceptionAging: (_prior: unknown, earlier: number, later: number) => {
    if (earlier !== 0 || later !== 1) throw new Error("Exact pair required");
    return { earlier_continuity_index: 0, later_continuity_index: 1,
      case_id: "cameras", reassignment_watch_index: 0,
      earlier_at: "2026-11-04T08:00:00Z", later_at: "2026-11-13T08:00:00Z",
      later_owner_witness_claim: false, later_distinct_source_claim: false,
      repeated_owner_exception: true, repeated_source_exception: true,
      source_identity_drift: true, source_age_days: 12, earlier_continuity_age_days: 22,
      signals: ["POST_CONTINUITY_OWNER_MISSING", "POST_CONTINUITY_SOURCE_MISSING",
        "QL248_SOURCE_PROOF_PROVENANCE_UNVERIFIED"] };
  },
  recordTriageException: () => [{ state: "PRIVATE_TRIAGE_EXCEPTION_FOLLOWUP_NOT_SENT",
    closure: "NOT_AUTHORIZED", source_provenance: "UNVERIFIED" }],
}));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const environment: TrialEnvironment = { installed_version: "0.0.10-build177",
  access: "local_console", installed_windows_witnessed: true };
const prior = { triage_continuity_notes: [
  { case_id: "cameras", reassignment_watch_index: 0, later_triage_index: 1,
    recorded_at: "2026-11-04T08:00:00Z" },
  { case_id: "cameras", reassignment_watch_index: 0, later_triage_index: 2,
    recorded_at: "2026-11-13T08:00:00Z" },
] } as TriageContinuityReceipt;
const auditDraft: Ql248AuditDraft = { repository: "RosevearCreations/rosevear-ai-hub",
  source_sha: "", source_ci_url: "", proof_commit_sha: "",
  raw_proof_sha256: "", public_spki_sha256: "" };
const props = { prior, notes: [], environment, importedContinuity: 0,
  importedExceptions: 0, onNotesChange: vi.fn(),
  compareEarlierReceipt: vi.fn(), auditDraft };

describe("Build 178 triage exception aging and public proof review UI", () => {
  it("renders nonproduction HOLD and public-only review without network activity or approval actions", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<TriageExceptionAgingPanel {...props}
      environment={{ ...environment, installed_windows_witnessed: false }} />);
    const panel = screen.getByRole("region", {
      name: "Build 178 independent triage exception aging and QL-248 proof provenance review" });
    expect(within(panel).getByText("INDEPENDENT REVIEW: HOLD")).toBeInTheDocument();
    expect(within(panel).getByText(/Source age 12 days/)).toBeInTheDocument();
    expect(within(panel).getByText(/MISSING \/ INVALID — no provenance review yet/)).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: /Append private Build 178 triage exception follow-up/ }))
      .toBeDisabled();
    expect(within(panel).queryByRole("button", { name: /approve|authorize|connect|dispatch/i }))
      .not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it("gates a private HOLD-only note behind two separate confirmations", () => {
    const onNotesChange = vi.fn();
    render(<TriageExceptionAgingPanel {...props} onNotesChange={onNotesChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Inspect exact continuity exception pair" }));
    const button = screen.getByRole("button", { name: /Append private Build 178 triage exception follow-up/ });
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I personally rechecked/ }));
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I separately acknowledge/ }));
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onNotesChange).toHaveBeenCalledOnce();
  });
  it("does not permit imported later continuity to be treated as fresh evidence", () => {
    render(<TriageExceptionAgingPanel {...props} importedContinuity={2} />);
    fireEvent.click(screen.getByRole("button", { name: "Inspect exact continuity exception pair" }));
    expect(screen.getByRole("button", { name: /Append private Build 178 triage exception follow-up/ }))
      .toBeDisabled();
  });
});
