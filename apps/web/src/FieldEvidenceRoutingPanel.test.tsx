import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { FieldEvidenceRoutingPanel } from "./FieldEvidenceRoutingPanel";
import { recordTrialObservation, type TrialEnvironment } from "./ownerFieldTrial";
import { recordSourceIdentityCheck } from "./ownerFieldRouting";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const env: TrialEnvironment = { installed_version: "0.0.5-b151", access: "local_console", installed_windows_witnessed: true };
const unknown: TrialEnvironment = { installed_version: "", access: "unknown", installed_windows_witnessed: false };
const emptyProps = { history: [], checks: [], environment: unknown, handoffs: [], reviews: [],
  importedChecks: 0, importedTrials: 0, importedReviews: 0, onChecksChange: vi.fn(),
  onChooseCase: vi.fn(), onNavigate: vi.fn() };

describe("Build 151 owner safe routing interface", () => {
  it("shows nine HOLD routes without network calls and safely links to original manual modules", () => {
    const choose = vi.fn();
    const navigate = vi.fn();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const ui = render(<FieldEvidenceRoutingPanel {...emptyProps} onChooseCase={choose} onNavigate={navigate} />);
    expect(screen.getByText("ALL ROUTES: FIELD HOLD")).toBeInTheDocument();
    const routes = within(ui.container.querySelector(".owner-source-route-list") as HTMLElement);
    expect(routes.getAllByRole("article")).toHaveLength(9);
    expect(screen.getByText("0 automatic actions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record private identity check (no action)" })).toBeDisabled();
    fireEvent.click(routes.getAllByRole("button", { name: "Open Cameras for inspection" })[0]);
    expect(navigate).toHaveBeenCalledWith("Cameras");
    fireEvent.click(routes.getAllByRole("button", { name: "Select manual trial" })[0]);
    expect(choose).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("requires an owner witness and exact existing trial before recording a pseudonymous source check", () => {
    const change = vi.fn();
    render(<FieldEvidenceRoutingPanel {...emptyProps} environment={env} onChecksChange={change} />);
    fireEvent.change(screen.getByLabelText("Personally observed source identity"), { target: { value: "confirmed_alias" } });
    fireEvent.change(screen.getByLabelText(/Made-up safe asset tracking token/), { target: { value: "asset_123abc" } });
    fireEvent.click(screen.getByLabelText(/I personally inspected this exact source/));
    fireEvent.click(screen.getByRole("button", { name: "Record private identity check (no action)" }));
    expect(screen.getByRole("status")).toHaveTextContent(/Record a trial observation/);
    expect(change).not.toHaveBeenCalled();
    expect(screen.getByText("ALL ROUTES: FIELD HOLD")).toBeInTheDocument();
  });

  it("shows a changed source alias and routes manual camera retesting without invoking device actions", () => {
    let history = recordTrialObservation([], unknown, { case_id: "cameras", outcome: "issue", finding: "playback_missing",
      next_owner: "camera_operator", witnessed: true }, "2026-10-25T01:00:00.000Z");
    let checks = recordSourceIdentityCheck(history, [], env, { case_id: "cameras", identity_state: "confirmed_alias",
      safe_alias: "asset_123abc", personally_witnessed: true }, "2026-10-25T02:00:00.000Z");
    history = recordTrialObservation(history, env, { case_id: "cameras", outcome: "passed", finding: "none",
      next_owner: "household_owner", witnessed: true }, "2026-10-25T03:00:00.000Z");
    checks = recordSourceIdentityCheck(history, checks, env, { case_id: "cameras", identity_state: "confirmed_alias",
      safe_alias: "asset_456def", personally_witnessed: true }, "2026-10-25T04:00:00.000Z");
    const choose = vi.fn();
    render(<FieldEvidenceRoutingPanel {...emptyProps} history={history} checks={checks} environment={env} onChooseCase={choose} />);
    expect(screen.getByText("SOURCE ALIAS CHANGED")).toBeInTheDocument();
    expect(screen.getByText("REPEAT TRIAL REQUIRED")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Show routing results"), { target: { value: "repeat" } });
    expect(screen.getAllByRole("button", { name: "Select manual trial" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Select manual trial" }));
    expect(choose).toHaveBeenCalledWith("cameras");
    expect(screen.getByText("ALL ROUTES: FIELD HOLD")).toBeInTheDocument();
  });
});
