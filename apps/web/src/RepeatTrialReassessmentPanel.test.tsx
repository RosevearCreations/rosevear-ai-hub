import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RepeatTrialReassessmentPanel } from "./RepeatTrialReassessmentPanel";
import { recordTrialObservation, type TrialEnvironment } from "./ownerFieldTrial";
import { recordSourceIdentityCheck } from "./ownerFieldRouting";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const env: TrialEnvironment = { installed_version: "0.0.6-build152", access: "private_lan", installed_windows_witnessed: true };
const unknown: TrialEnvironment = { installed_version: "", access: "unknown", installed_windows_witnessed: false };
const initial = { history: [], checks: [], links: [], reassessments: [], environment: unknown, handoffs: [], reviews: [],
  importedTrials: 0, importedChecks: 0, importedReviews: 0, importedLinks: 0,
  onLinksChange: vi.fn(), onReassessmentsChange: vi.fn(), onChooseCase: vi.fn() };

describe("Build 152 owner-facing evidence linking and HOLD safeguards", () => {
  it("starts in HOLD with disabled linking and no automatic service or device calls", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<RepeatTrialReassessmentPanel {...initial} />);
    expect(screen.getByText("CLOSURE: NOT AUTHORIZED")).toBeInTheDocument();
    expect(screen.getByText("0 dispatched actions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Link retest evidence (HOLD)" })).toBeDisabled();
    expect(screen.getByText(/No eligible later witnessed trial/)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("links the exact repeat trial and displays seven independent reviewer gaps without dispatch", () => {
    let history = recordTrialObservation([], unknown, { case_id: "cameras", outcome: "issue", finding: "playback_missing",
      next_owner: "camera_operator", witnessed: true }, "2026-10-25T10:00:00.000Z");
    let checks = recordSourceIdentityCheck(history, [], env, { case_id: "cameras", identity_state: "confirmed_alias",
      safe_alias: "asset_123abc", personally_witnessed: true }, "2026-10-25T10:05:00.000Z");
    history = recordTrialObservation(history, env, { case_id: "cameras", outcome: "passed", finding: "none",
      next_owner: "household_owner", witnessed: true }, "2026-10-25T10:10:00.000Z");
    checks = recordSourceIdentityCheck(history, checks, env, { case_id: "cameras", identity_state: "confirmed_alias",
      safe_alias: "asset_123abc", personally_witnessed: true }, "2026-10-25T10:15:00.000Z");
    const onLinksChange = vi.fn();
    const view = render(<RepeatTrialReassessmentPanel {...initial} history={history} checks={checks}
      environment={env} onLinksChange={onLinksChange} />);
    fireEvent.change(screen.getByLabelText("Repeat-trial case"), { target: { value: "cameras" } });
    expect(screen.getByText(/Exact original trial #1/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/I personally checked the exact original route/));
    fireEvent.click(screen.getByRole("button", { name: "Link retest evidence (HOLD)" }));
    expect(onLinksChange).toHaveBeenCalledTimes(1);
    const links = onLinksChange.mock.calls[0][0];
    expect(links[0]).toMatchObject({ case_id: "cameras", route_reason: "ACTIVE_FINDING", source_alias: "asset_123abc" });
    view.rerender(<RepeatTrialReassessmentPanel {...initial} history={history} checks={checks}
      environment={env} links={links} onLinksChange={onLinksChange} />);
    expect(screen.getByText(/Seven exact reviewer criteria/i)).toBeInTheDocument();
    expect(screen.getByText("INDEPENDENT HOLD REASSESSMENT REQUIRED")).toBeInTheDocument();
    expect(screen.getAllByText("Witness afresh")).toHaveLength(7);
    expect(screen.getByText(/Physical HOLD always applies/)).toBeInTheDocument();
    expect(initial.onReassessmentsChange).not.toHaveBeenCalled();
  });
});
