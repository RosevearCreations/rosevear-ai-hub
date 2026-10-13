import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ReleaseObservabilityPanel } from "./ReleaseObservabilityPanel";
import { getReleaseObservability } from "./api";
vi.mock("./api", () => ({ getReleaseObservability: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

describe("Build 062 local release view", () => {
  it("does not auto-fetch or offer restart controls", () => {
    render(<ReleaseObservabilityPanel />);
    expect(getReleaseObservability).not.toHaveBeenCalled();
    expect(screen.getByText("No local status checked yet.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /install|restart|migrate|rollback/i })).toBeNull();
  });
  it("clearly separates task metadata from supervised acceptance", async () => {
    vi.mocked(getReleaseObservability).mockResolvedValue({
      scope: "local_read_only", adoption_state: "HOLD",
      last_attempt_utc: "2026-10-13T19:00:00Z", last_release: "a".repeat(40),
      active_release: "b".repeat(40), journal_state: "committed",
      adoption_task: "configured", recovery_task: "enabled", failure_event_610: "none",
      last_alert_recorded_utc: null, installed_runtime_verified: false,
      rollback_rehearsal_verified: false, off_machine_recovery_verified: false,
      enrollment_ready: false, reason: "Metadata only",
      health_cohorts: {
        scope: "last_7_days", state: "partial", events_counted: 2,
        unparsed_lines: 1, history_partial: true, grouped_by: "utc_day_not_release_sha",
        days: [{
          utc_day: "2026-10-13",
          counts: { CURRENT: 0, READY: 0, HOLD: 1, ADOPTED: 0, FAILED: 1,
                    ROLLED_BACK: 0, ROLLBACK_FAILED: 0 },
        }],
      },
      incident_triage: {
        scope: "bounded_local_history", observation: "partial",
        groups: [{ category: "adoption_failure", observed_events: 2,
          affected_days: 2, recurring_across_days: true }],
        recovery_follow_up: "needs_operator_review", no_automatic_incident_closure: true,
        explanation: "operator confirmation required",
      },
      incident_reviews: {
        state: "operator_reported", reviewed_records: 1,
        open_records: 0, investigating_records: 1,
        operator_reported_resolved_records: 0,
        latest_review_utc: "2026-10-13T19:00:00Z", authoritative: false,
      },
      supervised_recovery: {
        status: "operator_reported_complete", observed_utc: "2026-10-13T19:00:00Z",
        distinct_same_schema_releases: true, reported_steps: 6, required_steps: 6,
        source: "operator_self_attestation_only", machine_verified: false,
      },
    });
    render(<ReleaseObservabilityPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh release evidence" }));
    await waitFor(() => expect(screen.getByText("Recorded adoption: HOLD")).toBeTruthy());
    expect(screen.getByText("Automatic-enrollment acceptance: not verified by this panel.")).toBeTruthy();
    expect(screen.getByText("configured")).toBeTruthy();
    expect(screen.getByText("aaaaaaaaaaaa")).toBeTruthy();
    expect(screen.getByText(/History is truncated to a bounded sample/)).toBeTruthy();
    expect(screen.getByText(/not independently machine-verified/)).toBeTruthy();
    expect(screen.getByText(/FAILED: 1/)).toBeTruthy();
    expect(screen.getByText(/Repeated across days; investigate/)).toBeTruthy();
  });
  it("hides raw remote exception details", async () => {
    vi.mocked(getReleaseObservability).mockRejectedValue(new Error("password=SECRET"));
    render(<ReleaseObservabilityPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh release evidence" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.getByRole("alert").textContent).not.toContain("SECRET");
  });
});
