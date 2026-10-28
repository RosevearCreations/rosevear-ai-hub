import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { EvidenceRenewalRecheckPanel } from "./EvidenceRenewalRecheckPanel";
import type { TrialEnvironment } from "./ownerFieldTrial";

vi.mock("./ownerEvidenceRenewalRecheck", () => ({
  RENEWAL_CATEGORIES: ["CONTINUE_INDEPENDENT_HOLD", "REQUEST_OWNER_EVIDENCE_RECHECK",
    "REQUEST_SOURCE_IDENTITY_DRIFT_RECHECK", "REQUEST_OVERDUE_SOURCE_RENEWAL"],
  compareEvidenceRenewal: (_rounds: unknown[], _audits: unknown[], _outcomes: unknown[],
    _watches: unknown[], _dispositions: unknown[], _recurrences: unknown[],
    _followups: unknown[], _history: unknown[], _checks: unknown[],
    earlier: number, later: number) => {
    if (earlier !== 0 || later !== 1) throw new Error("Exact pair required");
    return { baseline_followup_index: 0, latest_followup_index: 1,
      reassignment_watch_index: 0, case_id: "cameras",
      baseline_at: "2026-10-20T08:00:00Z", latest_at: "2026-10-26T08:00:00Z",
      baseline_owner_outcome: "passed", latest_owner_outcome: "issue",
      baseline_owner_claim: "household_owner", latest_owner_claim: "camera_operator",
      newer_owner_trial_since_followup: true, renewed_source_since_followup: true,
      source_identity_drift_claim: true, source_version_access_drift_claim: false,
      latest_confirmed_alias_claim: false, prior_source_age_days: 31,
      latest_source_age_days: 25, earlier_followup_age_days: 12,
      signals: ["OWNER_OUTCOME_DRIFT_PERSISTS", "SOURCE_ALIAS_OR_IDENTITY_DRIFT",
        "SOURCE_EVIDENCE_OVERDUE", "REPEATED_OVERDUE_SOURCE_EVIDENCE",
        "EARLIER_FOLLOWUP_OVERDUE", "INDEPENDENT_HOLD_CONTINUES"], unresolved: true };
  },
  recordRenewalRecheck: (...args: unknown[]) => [{ ...args[12] as object,
    state: "PRIVATE_EVIDENCE_RENEWAL_RECHECK_NOT_SENT", closure: "NOT_AUTHORIZED" }],
}));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const environment: TrialEnvironment = { installed_version: "0.0.7-build170",
  access: "local_console", installed_windows_witnessed: true };
const defaults = { rounds: [
  { reassignment_watch_index: 0, latest_audit_index: 0,
    recorded_at: "2026-10-20T08:00:00Z" },
  { reassignment_watch_index: 0, latest_audit_index: 1,
    recorded_at: "2026-10-26T08:00:00Z" }] as never[],
  audits: [], outcomes: [], watches: [], dispositions: [], recurrences: [],
  followups: [], history: [], checks: [], notes: [], environment,
  importedRounds: 0, importedNotes: 0, onNotesChange: vi.fn(),
  compareEarlierReceipt: vi.fn() };

describe("Build 170 private evidence renewal and source identity drift UI", () => {
  it("shows source drift, repeated overdue flags and unconditional HOLD without network calls", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<EvidenceRenewalRecheckPanel {...defaults} environment={{ ...environment,
      installed_windows_witnessed: false }} />);
    const panel = screen.getByRole("region", {
      name: "Build 170 independent evidence renewal and source identity drift recheck" });
    expect(within(panel).getByText("INDEPENDENT REVIEW: HOLD")).toBeInTheDocument();
    expect(within(panel).getByText(/source age 31\/25 days/)).toBeInTheDocument();
    expect(within(panel).getByText(/source identity\/access drift claim/)).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Append private evidence renewal recheck (HOLD)" })).toBeDisabled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("requires personally rechecked evidence and separate permanent HOLD acknowledgment", () => {
    const onNotesChange = vi.fn();
    render(<EvidenceRenewalRecheckPanel {...defaults} onNotesChange={onNotesChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Inspect exact evidence renewal pair" }));
    fireEvent.change(screen.getByLabelText("Fixed HOLD-only renewal recheck category"),
      { target: { value: "REQUEST_SOURCE_IDENTITY_DRIFT_RECHECK" } });
    const button = screen.getByRole("button", { name: "Append private evidence renewal recheck (HOLD)" });
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I personally rechecked both follow-up rounds/ }));
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I acknowledge permanent independent/ }));
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onNotesChange).toHaveBeenCalledOnce();
    expect(onNotesChange.mock.calls[0][0][0]).toMatchObject({
      category: "REQUEST_SOURCE_IDENTITY_DRIFT_RECHECK",
      state: "PRIVATE_EVIDENCE_RENEWAL_RECHECK_NOT_SENT", closure: "NOT_AUTHORIZED" });
  });

  it("compares complete Build 169 historical receipts read-only, blocking imported follow-up writes", async () => {
    const compareEarlierReceipt = vi.fn().mockReturnValue({ previous_followups: 1,
      current_followups: 2, new_followups: 1, comparison: null });
    render(<EvidenceRenewalRecheckPanel {...defaults} importedRounds={2}
      compareEarlierReceipt={compareEarlierReceipt} />);
    const file = new File(["{}"], "prior-169.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: () => Promise.resolve("{}") });
    fireEvent.change(screen.getByLabelText(/Compare earlier complete Build 169 private aging follow-up receipt/),
      { target: { files: [file] } });
    await waitFor(() => expect(compareEarlierReceipt).toHaveBeenCalledWith("{}"));
    expect(screen.getByText(/Strict append-only prefix/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Append private evidence renewal recheck (HOLD)" })).toBeDisabled();
  });
});
