import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { FollowupDecisionReplayPanel } from "./FollowupDecisionReplayPanel";
import { recordTrialObservation, type TrialEnvironment } from "./ownerFieldTrial";
import { advanceRepairHandoff, createRepairHandoff } from "./ownerTrialReconciliation";
import { recordSourceIdentityCheck } from "./ownerFieldRouting";
import { recordRepeatTrialLink } from "./ownerRepeatTrialReassessment";
import { recordOwnerEvidenceFollowup } from "./ownerReassessmentFollowup";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const env: TrialEnvironment = { installed_version: "0.0.6-build154", access: "local_console", installed_windows_witnessed: true };
const unknown: TrialEnvironment = { installed_version: "", access: "unknown", installed_windows_witnessed: false };
const handlers = { onDecisionsChange: vi.fn(), onChooseCase: vi.fn(), onNavigate: vi.fn() };
const imported = { importedTrials: 0, importedChecks: 0, importedReviews: 0, importedLinks: 0,
  importedReassessments: 0, importedFollowups: 0, importedDecisions: 0 };
const empty = { history: [], checks: [], links: [], reassessments: [], handoffs: [], reviews: [],
  followups: [], reviewDecisions: [], environment: unknown, ...imported, ...handlers };

function fixture() {
  let history = recordTrialObservation([], unknown, { case_id: "cameras", outcome: "issue",
    finding: "playback_missing", next_owner: "camera_operator", witnessed: true }, "2026-10-24T08:00:00Z");
  let handoffs = createRepairHandoff(history, [], "cameras", "2026-10-24T08:01:00Z");
  handoffs = advanceRepairHandoff(history, handoffs, "cameras", 0, true, "2026-10-24T08:02:00Z");
  handoffs = advanceRepairHandoff(history, handoffs, "cameras", 0, true, "2026-10-24T08:03:00Z");
  let checks = recordSourceIdentityCheck(history, [], env, { case_id: "cameras", identity_state: "confirmed_alias",
    safe_alias: "asset_123abc", personally_witnessed: true }, "2026-10-24T08:04:00Z");
  history = recordTrialObservation(history, env, { case_id: "cameras", outcome: "passed", finding: "none",
    next_owner: "household_owner", witnessed: true }, "2026-10-24T08:05:00Z");
  checks = recordSourceIdentityCheck(history, checks, env, { case_id: "cameras", identity_state: "confirmed_alias",
    safe_alias: "asset_123abc", personally_witnessed: true }, "2026-10-24T08:06:00Z");
  const links = recordRepeatTrialLink(history, checks, [], env, handoffs, [], { trials: 0, checks: 0, reviews: 0 },
    { case_id: "cameras", route_reason: "ACTIVE_FINDING", personally_witnessed: true }, "2026-10-24T08:07:00Z");
  const followups = recordOwnerEvidenceFollowup(history, checks, links, [], env, handoffs, [], [],
    { trials: 0, checks: 0, reviews: 0, links: 0, reassessments: 0 },
    { link_index: 0, criterion: "field_hold", personally_reviewed: true }, "2026-10-24T08:19:00Z");
  return { ...empty, history, checks, links, handoffs, followups, environment: env };
}

describe("Build 154 replay UI and witnessed HOLD safeguards", () => {
  it("starts with no independent decision, no background calls, and no invented recurrence", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<FollowupDecisionReplayPanel {...empty} />);
    expect(screen.getByText("CLOSURE: NOT AUTHORIZED")).toBeInTheDocument();
    expect(screen.getByText(/no Build 153 owner follow-up notes/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record independent HOLD decision (not sent)" })).toBeDisabled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("renders exact note replay and requires two witness checks for a fixed private decision", () => {
    const props = fixture();
    const onDecisionsChange = vi.fn();
    const onChooseCase = vi.fn();
    const onNavigate = vi.fn();
    render(<FollowupDecisionReplayPanel {...props} onDecisionsChange={onDecisionsChange}
      onChooseCase={onChooseCase} onNavigate={onNavigate} />);
    const section = screen.getByRole("region", { name: "Build 154 independent follow-up decision replay and recurrence oversight" });
    expect(within(section).getByText("1 exact follow-up topics")).toBeInTheDocument();
    expect(within(section).getByText(/no additional signal; field HOLD remains/i)).toBeInTheDocument();
    const record = within(section).getByRole("button", { name: "Record independent HOLD decision (not sent)" });
    expect(record).toBeDisabled();
    fireEvent.click(within(section).getByRole("button", { name: "Review exact latest note" }));
    expect(record).toBeDisabled();
    fireEvent.click(within(section).getByLabelText(/A separate reviewer personally inspected the latest private owner note/));
    expect(record).toBeDisabled();
    fireEvent.click(within(section).getByLabelText(/I personally compared original, current and recurring evidence/));
    expect(record).toBeEnabled();
    fireEvent.click(record);
    expect(onDecisionsChange).toHaveBeenCalledTimes(1);
    expect(onDecisionsChange.mock.calls[0][0][0]).toMatchObject({ source_followup_index: 0,
      reviewer_witnessed: true, review_state: "INDEPENDENT_FOLLOWUP_REVIEW_HOLD",
      field_acceptance: "FIELD_ACCEPTANCE_HOLD", closure: "NOT_AUTHORIZED" });
    expect(within(section).getByText(/No action was sent; all physical and independent holds remain/)).toBeInTheDocument();
    fireEvent.click(within(section).getByRole("button", { name: "Prepare owner recheck" }));
    expect(onChooseCase).toHaveBeenCalledWith("cameras");
    fireEvent.click(within(section).getByRole("button", { name: "Open Cameras" }));
    expect(onNavigate).toHaveBeenCalledWith("Cameras");
  });

  it("filters historical imports and disables writing on imported or inactive sessions", () => {
    const props = fixture();
    render(<FollowupDecisionReplayPanel {...props} importedFollowups={1} active={false} />);
    fireEvent.change(screen.getByLabelText("Review scope"), { target: { value: "imported" } });
    expect(screen.getByText(/Imported evidence in chain/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Review exact latest note" }));
    expect(screen.getByText(/Imported owner notes or links are historical claims/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record independent HOLD decision (not sent)" })).toBeDisabled();
  });
});
