import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { RecurrenceResolutionPanel } from "./RecurrenceResolutionPanel";
import { recordTrialObservation, type TrialEnvironment } from "./ownerFieldTrial";
import { advanceRepairHandoff, createRepairHandoff } from "./ownerTrialReconciliation";
import { recordSourceIdentityCheck } from "./ownerFieldRouting";
import { recordRepeatTrialLink } from "./ownerRepeatTrialReassessment";
import { recordOwnerEvidenceFollowup } from "./ownerReassessmentFollowup";
import { recordFollowupDecision } from "./ownerFollowupDecisionReplay";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const env: TrialEnvironment = { installed_version: "0.0.6-build155", access: "local_console", installed_windows_witnessed: true };
const unknown: TrialEnvironment = { installed_version: "", access: "unknown", installed_windows_witnessed: false };
const time = (minute: number) => new Date(Date.parse("2026-10-15T08:00:00Z") + minute * 60_000).toISOString();
const imported = { trials: 0, checks: 0, decisions: 0, resolutions: 0 };
const lower = { trials: 0, checks: 0, reviews: 0, links: 0, reassessments: 0, followups: 0, decisions: 0 };
const handlers = { onResolutionsChange: vi.fn(), onChooseCase: vi.fn(), onNavigate: vi.fn() };
const empty = { history: [], checks: [], links: [], decisions: [], resolutions: [],
  imported, environment: unknown, ...handlers };

function fixture() {
  let history = recordTrialObservation([], unknown, { case_id: "cameras", outcome: "issue",
    finding: "playback_missing", next_owner: "camera_operator", witnessed: true }, time(0));
  let handoffs = createRepairHandoff(history, [], "cameras", time(1));
  handoffs = advanceRepairHandoff(history, handoffs, "cameras", 0, true, time(2));
  handoffs = advanceRepairHandoff(history, handoffs, "cameras", 0, true, time(3));
  let checks = recordSourceIdentityCheck(history, [], env, { case_id: "cameras",
    identity_state: "confirmed_alias", safe_alias: "asset_123abc", personally_witnessed: true }, time(4));
  history = recordTrialObservation(history, env, { case_id: "cameras", outcome: "passed",
    finding: "none", next_owner: "household_owner", witnessed: true }, time(5));
  checks = recordSourceIdentityCheck(history, checks, env, { case_id: "cameras",
    identity_state: "confirmed_alias", safe_alias: "asset_123abc", personally_witnessed: true }, time(6));
  const links = recordRepeatTrialLink(history, checks, [], env, handoffs, [], lower,
    { case_id: "cameras", route_reason: "ACTIVE_FINDING", personally_witnessed: true }, time(7));
  const followups = recordOwnerEvidenceFollowup(history, checks, links, [], env, handoffs, [], [],
    lower, { link_index: 0, criterion: "field_hold", personally_reviewed: true }, time(19));
  const decisions = recordFollowupDecision(history, checks, links, followups, [], env, handoffs, [], [], lower,
    { source_followup_index: 0, decision: "REPEAT_TRIAL_REQUESTED", personally_reviewed: true,
      separate_reviewer: true }, time(22));
  return { ...empty, history, checks, links, decisions, environment: env };
}

describe("Build 155 recurrence evidence intake and overdue watch UI", () => {
  it("has no background fetch and refuses evidence without an exact prior decision", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<RecurrenceResolutionPanel {...empty} />);
    expect(screen.getByText("INDEPENDENT REVIEW: HOLD")).toBeInTheDocument();
    expect(screen.getByText(/No Build 154 independent HOLD decisions yet/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record owner recurrence evidence (HOLD; not sent)" })).toBeDisabled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows an overdue decision and enables intake only for a newer manually witnessed trial", () => {
    const props = fixture();
    props.history = recordTrialObservation(props.history, env, { case_id: "cameras", outcome: "issue",
      finding: "playback_missing", next_owner: "camera_operator", witnessed: true }, time(30));
    const onResolutionsChange = vi.fn();
    const onChooseCase = vi.fn();
    const onNavigate = vi.fn();
    render(<RecurrenceResolutionPanel {...props} onResolutionsChange={onResolutionsChange}
      onChooseCase={onChooseCase} onNavigate={onNavigate} />);
    const section = screen.getByRole("region", { name: "Build 155 recurrence resolution intake and overdue decision watch" });
    expect(within(section).getByText(/Overdue for manual owner\/reviewer attention/)).toBeInTheDocument();
    expect(within(section).getByText(/new trial\(s\) awaiting intake/i)).toBeInTheDocument();
    const submit = within(section).getByRole("button", { name: "Record owner recurrence evidence (HOLD; not sent)" });
    expect(submit).toBeDisabled();
    fireEvent.click(within(section).getByRole("button", { name: "Inspect exact decision evidence" }));
    fireEvent.click(within(section).getByLabelText(/I personally witnessed the exact newer owner trial/));
    expect(submit).toBeDisabled();
    fireEvent.click(within(section).getByLabelText(/I understand this evidence remains an unverified owner claim/));
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    expect(onResolutionsChange).toHaveBeenCalledTimes(1);
    expect(onResolutionsChange.mock.calls[0][0][0]).toMatchObject({ decision_index: 0, trial_index: 2,
      resolution_claim: "RECURRING_ISSUE_REPORTED", personally_witnessed: true,
      closure: "NOT_AUTHORIZED", independent_review: "INDEPENDENT_REVIEW_HOLD" });
    expect(within(section).getByText(/No independent acceptance, notification, reassignment or execution occurred/)).toBeInTheDocument();
    fireEvent.click(within(section).getByRole("button", { name: "Prepare newer owner trial" }));
    expect(onChooseCase).toHaveBeenCalledWith("cameras");
    fireEvent.click(within(section).getByRole("button", { name: "Open Cameras" }));
    expect(onNavigate).toHaveBeenCalledWith("Cameras");
  });

  it("filters overdue historical imports without allowing a fresh claim or automatic action", () => {
    const props = fixture();
    render(<RecurrenceResolutionPanel {...props} imported={{ ...imported, decisions: 1 }} />);
    fireEvent.change(screen.getByLabelText("Decision watch filter"), { target: { value: "historical" } });
    expect(screen.getByText(/Historical imported decision\/trial/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Inspect exact decision evidence" }));
    expect(screen.getByRole("button", { name: "Record owner recurrence evidence (HOLD; not sent)" })).toBeDisabled();
  });
});
