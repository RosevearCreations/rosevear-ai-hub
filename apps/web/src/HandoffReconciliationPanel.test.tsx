import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { HandoffReconciliationPanel } from "./HandoffReconciliationPanel";
import { type OverdueHandoffEvidence } from "./ownerOverdueHandoff";
import { type TrialEnvironment } from "./ownerFieldTrial";
import { type RepeatTrialEvidenceLink } from "./ownerRepeatTrialReassessment";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const env: TrialEnvironment = { installed_version: "local-build157", access: "local_console", installed_windows_witnessed: true };
const noWitness: TrialEnvironment = { ...env, installed_windows_witnessed: false };
const captured = "2026-10-14T09:00:00.000Z";
const later = "2026-10-18T09:00:00.000Z";
const base: OverdueHandoffEvidence = {
  decision_index: 0, case_id: "cameras", criterion: "field_hold", link_index: 0,
  source_followup_index: 0, source_linked_at: "2026-10-13T09:00:00.000Z",
  decision_at: "2026-10-13T10:00:00.000Z", captured_at: captured,
  age_days: 1, age_band: "WATCH_1_TO_3_DAYS", overdue: false,
  resolution_index: null, resolution_recorded_at: null, prior_owner_claim: null,
  prior_trial_index: null, newest_trial_index: null, newest_trial_at: null, newest_trial_outcome: null,
  latest_source_check_index: null, reopened_comparison: "NO_NEW_OWNER_TRIAL",
  source_alias_comparison: "NO_LATER_SOURCE_CHECK", handoff_category: "OVERDUE_INDEPENDENT_REVIEW_REQUEST",
  personally_reviewed: true, hold_acknowledged: true, handoff_state: "PREPARED_PRIVATE_HANDOFF_NOT_SENT",
  field_acceptance: "FIELD_ACCEPTANCE_HOLD", independent_review: "INDEPENDENT_REVIEW_HOLD",
  closure: "NOT_AUTHORIZED",
};
const handoffs = [base, { ...base, captured_at: later,
  age_days: 5, age_band: "OVERDUE_3_TO_7_DAYS" as const, overdue: true,
  newest_trial_index: 2, newest_trial_at: "2026-10-17T09:00:00.000Z" as const,
  newest_trial_outcome: "issue" as const,
  reopened_comparison: "NEW_OWNER_TRIAL_UNVERIFIED" as const }];
const links = [{ installed_version: env.installed_version }] as RepeatTrialEvidenceLink[];
const defaults = { handoffs, links, followupReviews: [], environment: env, importedHandoffs: 0,
  importedReviews: 0, onFollowupReviewsChange: vi.fn(), compareEarlierReceipt: vi.fn(),
  observations: [], identityChecks: [], outcomes: [], importedOutcomes: 0,
  importedObservations: 0, onOutcomesChange: vi.fn() };

describe("Build 157 private handoff reconciliation UI", () => {
  it("remains HOLD with no network or fresh action when the receipt chain has no pair", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<HandoffReconciliationPanel {...defaults} handoffs={[base]} environment={noWitness} />);
    const panel = screen.getByRole("region", {
      name: "Build 157 independent handoff receipt reconciliation and recurrence aging" });
    expect(within(panel).getByText("INDEPENDENT REVIEW: HOLD")).toBeInTheDocument();
    expect(within(panel).getByText(/Two separate Build 156 private handoffs/)).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Record private HOLD follow-up (not sent)" })).toBeDisabled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows aging, selects an exact pair and requires two witnessed checks before a local note", () => {
    const onFollowupReviewsChange = vi.fn();
    render(<HandoffReconciliationPanel {...defaults} onFollowupReviewsChange={onFollowupReviewsChange} />);
    const panel = screen.getByRole("region", {
      name: "Build 157 independent handoff receipt reconciliation and recurrence aging" });
    expect(within(panel).getByText("1 successive handoff comparison(s)")).toBeInTheDocument();
    expect(within(panel).getByText(/Changed evidence: .*REOPENED TRIAL CHANGED/i)).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole("button", { name: "Inspect exact comparison" }));
    const record = within(panel).getByRole("button", { name: "Record private HOLD follow-up (not sent)" });
    expect(record).toBeDisabled();
    fireEvent.click(within(panel).getByLabelText(/I personally compared both exact handoff snapshots/));
    expect(record).toBeDisabled();
    fireEvent.click(within(panel).getByLabelText(/I acknowledge the follow-up is a private/));
    expect(record).toBeEnabled();
    fireEvent.click(record);
    expect(onFollowupReviewsChange).toHaveBeenCalledTimes(1);
    expect(onFollowupReviewsChange.mock.calls[0][0][0]).toMatchObject({
      baseline_handoff_index: 0, latest_handoff_index: 1,
      state: "PRIVATE_RECHECK_NOTE_NOT_SENT", closure: "NOT_AUTHORIZED" });
  });

  it("shows imported history and denies fresh notes without a non-imported, witnessed latest snapshot", () => {
    render(<HandoffReconciliationPanel {...defaults} importedHandoffs={2} environment={noWitness} />);
    fireEvent.change(screen.getByLabelText("Manual follow-up filter"), { target: { value: "historical" } });
    expect(screen.getByText(/Imported historical HOLD evidence only/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record private HOLD follow-up (not sent)" })).toBeDisabled();
  });
});
