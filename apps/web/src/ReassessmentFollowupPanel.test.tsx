import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { ReassessmentFollowupPanel } from "./ReassessmentFollowupPanel";
import { recordTrialObservation, type TrialEnvironment } from "./ownerFieldTrial";
import { advanceRepairHandoff, createRepairHandoff } from "./ownerTrialReconciliation";
import { recordSourceIdentityCheck } from "./ownerFieldRouting";
import { recordRepeatTrialLink } from "./ownerRepeatTrialReassessment";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const env: TrialEnvironment = { installed_version: "0.0.6-build153", access: "local_console", installed_windows_witnessed: true };
const unknown: TrialEnvironment = { installed_version: "", access: "unknown", installed_windows_witnessed: false };
const handlers = { onFollowupsChange: vi.fn(), onChooseCase: vi.fn(), onNavigate: vi.fn() };
const empty = { history: [], checks: [], links: [], reassessments: [], handoffs: [], reviews: [], followups: [],
  environment: unknown, importedTrials: 0, importedChecks: 0, importedReviews: 0, importedLinks: 0,
  importedReassessments: 0, importedFollowups: 0, ...handlers };

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
  return { ...empty, history, handoffs, checks, links, environment: env };
}

describe("Build 153 owner exception view and no-dispatch workflow", () => {
  it("keeps physical HOLD with zero links, no network calls and no active write", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<ReassessmentFollowupPanel {...empty} />);
    expect(screen.getByText("INDEPENDENT HOLD")).toBeInTheDocument();
    expect(screen.getByText(/no linked Build 152 repeat-trial outcomes/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record owner follow-up (OPEN / HOLD only)" })).toBeDisabled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("renders the seven evidence gaps and mandatory field hold, filters without mutations, and records witnessed fixed category", () => {
    const props = fixture();
    const onFollowupsChange = vi.fn();
    const onChooseCase = vi.fn();
    const onNavigate = vi.fn();
    render(<ReassessmentFollowupPanel {...props} onFollowupsChange={onFollowupsChange}
      onChooseCase={onChooseCase} onNavigate={onNavigate} />);
    const section = screen.getByRole("region", { name: "Build 153 independent exception aging and owner follow-up" });
    expect(within(section).getByText(/8 review exceptions/)).toBeInTheDocument();
    expect(within(section).getAllByRole("button", { name: "Review this exact exception" })).toHaveLength(8);
    fireEvent.change(within(section).getByLabelText("Link age"), { target: { value: "AGED_OVER_3_DAYS" } });
    expect(within(section).getByText(/No exceptions match these filters/)).toBeInTheDocument();
    fireEvent.change(within(section).getByLabelText("Link age"), { target: { value: "all" } });
    const buttons = within(section).getAllByRole("button", { name: "Review this exact exception" });
    fireEvent.click(buttons[0]);
    const record = within(section).getByRole("button", { name: "Record owner follow-up (OPEN / HOLD only)" });
    expect(record).toBeDisabled();
    fireEvent.click(within(section).getByLabelText(/I personally reviewed this exact current and historical evidence link/));
    expect(record).toBeEnabled();
    fireEvent.click(record);
    expect(onFollowupsChange).toHaveBeenCalledTimes(1);
    expect(onFollowupsChange.mock.calls[0][0][0]).toMatchObject({ followup_state: "OPEN_MANUAL_HOLD",
      field_acceptance: "FIELD_ACCEPTANCE_HOLD", closure: "NOT_AUTHORIZED" });
    expect(within(section).getByText(/It was not sent, scheduled or acted upon/)).toBeInTheDocument();
    fireEvent.click(within(section).getAllByRole("button", { name: "Prepare manual trial" })[0]);
    expect(onChooseCase).toHaveBeenCalledWith("cameras");
    fireEvent.click(within(section).getAllByRole("button", { name: "Open Cameras" })[0]);
    expect(onNavigate).toHaveBeenCalledWith("Cameras");
  });

  it("disables recording while inactive even with a checked witness", () => {
    render(<ReassessmentFollowupPanel {...fixture()} active={false} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Review this exact exception" })[0]);
    fireEvent.click(screen.getByLabelText(/I personally reviewed this exact current and historical evidence link/));
    expect(screen.getByRole("button", { name: "Record owner follow-up (OPEN / HOLD only)" })).toBeDisabled();
  });
});
