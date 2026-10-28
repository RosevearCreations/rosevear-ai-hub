import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { SourceDriftOutcomePanel } from "./SourceDriftOutcomePanel";
import type { RenewalReceipt } from "./ownerEvidenceRenewalRecheck";
import type { TrialEnvironment } from "./ownerFieldTrial";

vi.mock("./ownerSourceDriftOutcome", () => ({
  DRIFT_OUTCOME_CATEGORIES: ["CONTINUE_INDEPENDENT_HOLD", "REQUEST_SOURCE_DRIFT_REVIEW"],
  compareDriftOutcomes: (_prior: unknown, before: number, after: number) => {
    if (before !== 0 || after !== 1) throw new Error("Need exact pair");
    return { baseline_recheck_index: 0, latest_recheck_index: 1, case_id: "cameras",
      reassignment_watch_index: 0, baseline_at: "2026-10-01T08:00:00Z",
      latest_at: "2026-10-12T08:00:00Z", prior_source_age_days: 41,
      latest_source_age_days: 30, earlier_recheck_age_days: 42,
      owner_witness_continuity: false, source_renewed_after_prior_recheck: false,
      identity_or_access_drift_continues: true,
      signals: ["OWNER_WITNESS_GAP", "SOURCE_AGE_REPEATED_OVERDUE",
        "SOURCE_DRIFT_UNRESOLVED", "INDEPENDENT_HOLD_CONTINUES"] };
  },
  recordDriftOutcome: () => [{ state: "PRIVATE_DRIFT_OUTCOME_AGING_NOT_SENT",
    category: "CONTINUE_INDEPENDENT_HOLD", closure: "NOT_AUTHORIZED" }],
}));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const environment: TrialEnvironment = { installed_version: "0.0.8-build170",
  access: "local_console", installed_windows_witnessed: true };
const prior = { renewal_rechecks: [
  { case_id: "cameras", reassignment_watch_index: 0, recorded_at: "2026-10-01T08:00:00Z" },
  { case_id: "cameras", reassignment_watch_index: 0, recorded_at: "2026-10-12T08:00:00Z" },
] } as RenewalReceipt;
const props = { prior, notes: [], environment, importedRechecks: 0,
  importedOutcomes: 0, onNotesChange: vi.fn(), compareEarlierReceipt: vi.fn() };

describe("Build 171 private outcome continuity panel", () => {
  it("shows unresolved owner and source gaps and never requests a gateway", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<SourceDriftOutcomePanel {...props} environment={{ ...environment,
      installed_windows_witnessed: false }} />);
    const panel = screen.getByRole("region", {
      name: "Build 171 source drift outcome aging and owner evidence continuity" });
    expect(within(panel).getByText("INDEPENDENT REVIEW: HOLD")).toBeInTheDocument();
    expect(within(panel).getByText(/source age: 41\/30 days/)).toBeInTheDocument();
    expect(within(panel).getByText(/owner witness gap/)).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: /Append private Build 171 outcome/ })).toBeDisabled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it("requires two independent local confirmations before appending", () => {
    const onNotesChange = vi.fn();
    render(<SourceDriftOutcomePanel {...props} onNotesChange={onNotesChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Inspect exact drift outcome pair" }));
    const button = screen.getByRole("button", { name: /Append private Build 171 outcome/ });
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I compared both private rechecks/ }));
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I acknowledge unchanged field/ }));
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onNotesChange).toHaveBeenCalledOnce();
  });
});
