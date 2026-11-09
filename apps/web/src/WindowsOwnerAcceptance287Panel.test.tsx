import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { getWindowsLauncherEvidence286 } from "./api";
import { WindowsOwnerAcceptance287Panel } from "./WindowsOwnerAcceptance287Panel";

vi.mock("./api", () => ({ getWindowsLauncherEvidence286: vi.fn() }));
beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.clearAllMocks(); localStorage.clear(); });

const sha = "a".repeat(40);
const launcher = { listener: "observed", ancestor_kinds: ["node", "powershell"],
  chain_hops_inspected: 2, chain_status: "partial_or_complete", recovery_script_mentioned: false,
  process_predates_checkout_commit: false, launch_source: "unknown" };
function snapshot(shaCandidate = sha) {
  return {
    schema: "rosevear.ai-hub.windows-launcher-evidence.v1", source: "LOCAL_READ_ONLY_INSPECTOR_259",
    observed_at_utc: new Date().toISOString(), inspector_observed_at_utc: new Date().toISOString(),
    host_platform: "WINDOWS", recorded_release_sha_candidate: shaCandidate, checkout_sha_candidate: shaCandidate,
    candidate_comparison: "CANDIDATES_MATCH", startup_task_state: "enabled",
    web_launcher: launcher, backend_launcher: launcher,
    installed_release_verified: false, original_device_verified: false, independent_witness_verified: false,
    master_shell_reporting_authorized: false, made_changes: false, external_requests: 0,
  };
}

describe("Build 287 original Windows owner review screen", () => {
  it("makes no backend request on mount and keeps Master Shell publishing unavailable", () => {
    render(<WindowsOwnerAcceptance287Panel ownerId="ree" />);
    expect(getWindowsLauncherEvidence286).not.toHaveBeenCalled();
    expect(screen.getByText(/Master Shell readiness: HOLD/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /publish|activate|restart/i })).toBeNull();
  });

  it("requires three owner confirmations and saves an allowlisted local report", async () => {
    vi.mocked(getWindowsLauncherEvidence286).mockResolvedValue(snapshot());
    render(<WindowsOwnerAcceptance287Panel ownerId="ree" />);
    fireEvent.click(screen.getByRole("button", { name: /Compare current launcher with owner history/i }));
    await waitFor(() => expect(screen.getByText(/candidates match unverified/)).toBeInTheDocument());
    const working = screen.getByRole("button", { name: "Record owner-reported working" });
    expect(working).toBeDisabled();
    screen.getAllByRole("checkbox").forEach(box => fireEvent.click(box));
    expect(working).toBeEnabled();
    fireEvent.click(working);
    expect(screen.getByText(/Owner-reported observation saved in this browser only/)).toBeInTheDocument();
    expect(screen.getByText(/Browser-local owner observations:/)).toHaveTextContent("1");
    fireEvent.click(screen.getByRole("button", { name: "Preview sanitized Master Shell readiness" }));
    expect(screen.getByText(/HOLD_INDEPENDENT_FIELD_PROOF_AND_APPROVED_REPORTING_CONTRACT/)).toBeInTheDocument();
    expect(getWindowsLauncherEvidence286).toHaveBeenCalledTimes(1);
  });

  it("detects a changed checkout between owner observations and preserves history", async () => {
    vi.mocked(getWindowsLauncherEvidence286).mockResolvedValueOnce(snapshot()).mockResolvedValueOnce(snapshot("b".repeat(40)));
    render(<WindowsOwnerAcceptance287Panel ownerId="ree" />);
    fireEvent.click(screen.getByRole("button", { name: /Compare current launcher with owner history/i }));
    await waitFor(() => expect(screen.getByText(/Fresh comparison:/)).toBeInTheDocument());
    screen.getAllByRole("checkbox").forEach(box => fireEvent.click(box));
    fireEvent.click(screen.getByRole("button", { name: "Record owner-reported working" }));
    fireEvent.click(screen.getByRole("button", { name: /Compare current launcher with owner history/i }));
    await waitFor(() => expect(screen.getByText(/Drift status:/)).toHaveTextContent(/drift detected/i));
    expect(screen.getByRole("list", { name: "Current launcher drift details" })).toHaveTextContent(/Inspected checkout changed/);
    screen.getAllByRole("checkbox").forEach(box => fireEvent.click(box));
    fireEvent.click(screen.getByRole("button", { name: "Record owner-reported issue" }));
    expect(screen.getByText(/Recorded historical transition:/)).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Previous recorded launcher changes" })).toHaveTextContent(/Inspected checkout changed/);
  });

  it("keeps stale results and private backend failures from being accepted", async () => {
    vi.mocked(getWindowsLauncherEvidence286).mockResolvedValueOnce(snapshot()).mockRejectedValueOnce(new Error("password=SECRET"));
    render(<WindowsOwnerAcceptance287Panel ownerId="ree" />);
    fireEvent.click(screen.getByRole("button", { name: /Compare current launcher with owner history/i }));
    await waitFor(() => expect(screen.getByText(/Fresh comparison:/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Compare current launcher with owner history/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/Inspection unavailable/));
    expect(document.body.textContent).not.toContain("SECRET");
    expect(screen.queryByRole("button", { name: "Record owner-reported working" })).toBeNull();
  });
});
