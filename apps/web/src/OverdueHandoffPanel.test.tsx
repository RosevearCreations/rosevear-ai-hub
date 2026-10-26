import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { OverdueHandoffPanel } from "./OverdueHandoffPanel";
import { recordTrialObservation, type TrialEnvironment } from "./ownerFieldTrial";
import { advanceRepairHandoff, createRepairHandoff } from "./ownerTrialReconciliation";
import { recordSourceIdentityCheck } from "./ownerFieldRouting";
import { recordRepeatTrialLink } from "./ownerRepeatTrialReassessment";
import { recordOwnerEvidenceFollowup } from "./ownerReassessmentFollowup";
import { recordFollowupDecision } from "./ownerFollowupDecisionReplay";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const env: TrialEnvironment = { installed_version: "0.0.6-build156", access: "local_console", installed_windows_witnessed: true };
const unknown: TrialEnvironment = { installed_version: "", access: "unknown", installed_windows_witnessed: false };
const when = (minutes: number) => new Date(Date.parse("2026-10-14T08:00:00Z") + 60_000 * minutes).toISOString();
const upstream = { trials: 0, checks: 0, reviews: 0, links: 0, reassessments: 0, followups: 0, decisions: 0 };
const imported = { trials: 0, checks: 0, links: 0, followups: 0, decisions: 0, resolutions: 0, handoffs: 0 };
const handlers = { onHandoffsChange: vi.fn(), onChooseCase: vi.fn(), onNavigate: vi.fn() };
const empty = { history: [], checks: [], links: [], decisions: [], resolutions: [], handoffs: [],
  environment: unknown, imported, ...handlers };

function fixture() {
  let history = recordTrialObservation([], unknown, { case_id: "cameras", outcome: "issue",
    finding: "playback_missing", next_owner: "camera_operator", witnessed: true }, when(0));
  let handoffs = createRepairHandoff(history, [], "cameras", when(1));
  handoffs = advanceRepairHandoff(history, handoffs, "cameras", 0, true, when(2));
  handoffs = advanceRepairHandoff(history, handoffs, "cameras", 0, true, when(3));
  let checks = recordSourceIdentityCheck(history, [], env, { case_id: "cameras",
    identity_state: "confirmed_alias", safe_alias: "asset_123abc", personally_witnessed: true }, when(4));
  history = recordTrialObservation(history, env, { case_id: "cameras", outcome: "passed",
    finding: "none", next_owner: "household_owner", witnessed: true }, when(5));
  checks = recordSourceIdentityCheck(history, checks, env, { case_id: "cameras",
    identity_state: "confirmed_alias", safe_alias: "asset_123abc", personally_witnessed: true }, when(6));
  const links = recordRepeatTrialLink(history, checks, [], env, handoffs, [], upstream,
    { case_id: "cameras", route_reason: "ACTIVE_FINDING", personally_witnessed: true }, when(7));
  const followups = recordOwnerEvidenceFollowup(history, checks, links, [], env, handoffs, [], [], upstream,
    { link_index: 0, criterion: "field_hold", personally_reviewed: true }, when(19));
  const decisions = recordFollowupDecision(history, checks, links, followups, [], env, handoffs, [], [], upstream,
    { source_followup_index: 0, decision: "REPEAT_TRIAL_REQUESTED", personally_reviewed: true,
      separate_reviewer: true }, when(22));
  return { ...empty, history, checks, links, decisions, environment: env };
}

describe("Build 156 owner manual overdue handoff UI", () => {
  it("renders permanent HOLD with no background fetch and no handoff without a decision", () => {
    const spy = vi.spyOn(globalThis, "fetch");
    render(<OverdueHandoffPanel {...empty} />);
    const panel = screen.getByRole("region", { name: "Build 156 independent overdue handoff and reopened trial comparison" });
    expect(within(panel).getByText("INDEPENDENT REVIEW: HOLD")).toBeInTheDocument();
    expect(within(panel).getByText(/No Build 154 independent HOLD decisions/)).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Prepare private HOLD handoff snapshot (not sent)" })).toBeDisabled();
    expect(spy).not.toHaveBeenCalled();
  });

  it("shows exact overdue decision and requires two witnesses for a local HOLD-only handoff", () => {
    const props = fixture();
    const onHandoffsChange = vi.fn();
    const onChooseCase = vi.fn();
    const onNavigate = vi.fn();
    render(<OverdueHandoffPanel {...props} onHandoffsChange={onHandoffsChange}
      onChooseCase={onChooseCase} onNavigate={onNavigate} />);
    const panel = screen.getByRole("region", { name: "Build 156 independent overdue handoff and reopened trial comparison" });
    expect(within(panel).getByText("1 overdue decision(s)")).toBeInTheDocument();
    const submit = within(panel).getByRole("button", { name: "Prepare private HOLD handoff snapshot (not sent)" });
    expect(submit).toBeDisabled();
    fireEvent.click(within(panel).getByRole("button", { name: "Inspect handoff snapshot" }));
    fireEvent.click(within(panel).getByLabelText(/I personally inspected the exact overdue decision/));
    expect(submit).toBeDisabled();
    fireEvent.click(within(panel).getByLabelText(/I acknowledge the exported snapshot/));
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    expect(onHandoffsChange).toHaveBeenCalledTimes(1);
    expect(onHandoffsChange.mock.calls[0][0][0]).toMatchObject({ decision_index: 0,
      handoff_category: "OVERDUE_INDEPENDENT_REVIEW_REQUEST", personally_reviewed: true,
      handoff_state: "PREPARED_PRIVATE_HANDOFF_NOT_SENT", closure: "NOT_AUTHORIZED" });
    expect(within(panel).getByText(/No message, job, escalation or closure was sent/)).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole("button", { name: "Prepare trial recheck" }));
    expect(onChooseCase).toHaveBeenCalledWith("cameras");
    fireEvent.click(within(panel).getByRole("button", { name: "Open Cameras" }));
    expect(onNavigate).toHaveBeenCalledWith("Cameras");
  });

  it("keeps imported or inactive decisions read-only", () => {
    const props = fixture();
    render(<OverdueHandoffPanel {...props} imported={{ ...imported, decisions: 1 }} active={false} />);
    fireEvent.change(screen.getByLabelText("Private handoff filter"), { target: { value: "historical" } });
    expect(screen.getByText(/Historical imported chain/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Inspect handoff snapshot" }));
    expect(screen.getByRole("button", { name: "Prepare private HOLD handoff snapshot (not sent)" })).toBeDisabled();
  });
});
