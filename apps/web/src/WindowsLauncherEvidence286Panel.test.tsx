import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { getWindowsLauncherEvidence286 } from "./api";
import { WindowsLauncherEvidence286Panel } from "./WindowsLauncherEvidence286Panel";

vi.mock("./api", () => ({ getWindowsLauncherEvidence286: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const sha = "a".repeat(40);
function snapshot(): Record<string, unknown> {
  const process = { listener: "observed", ancestor_kinds: ["node"], chain_hops_inspected: 1,
    chain_status: "partial_or_complete", recovery_script_mentioned: false,
    process_predates_checkout_commit: false, launch_source: "unknown" };
  return { schema: "rosevear.ai-hub.windows-launcher-evidence.v1", source: "LOCAL_READ_ONLY_INSPECTOR_259",
    host_platform: "WINDOWS", observed_at_utc: new Date().toISOString(), inspector_observed_at_utc: new Date().toISOString(),
    recorded_release_sha_candidate: sha, checkout_sha_candidate: sha, candidate_comparison: "CANDIDATES_MATCH",
    startup_task_state: "enabled", web_launcher: process, backend_launcher: process,
    installed_release_verified: false, original_device_verified: false, independent_witness_verified: false,
    master_shell_reporting_authorized: false, made_changes: false, external_requests: 0 };
}
describe("Build 286 owner session review", () => {
  it("does not inspect or accept without explicit click", () => {
    render(<WindowsLauncherEvidence286Panel ownerId="ree" />);
    expect(getWindowsLauncherEvidence286).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /record owner self-review/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /restart|publish|activate/i })).toBeNull();
  });
  it("requires three manual checks and never authorizes Master Shell reporting", async () => {
    vi.mocked(getWindowsLauncherEvidence286).mockResolvedValue(snapshot());
    render(<WindowsLauncherEvidence286Panel ownerId="ree" />);
    fireEvent.click(screen.getByRole("button", { name: "Inspect release and launcher candidates" }));
    await waitFor(() => expect(screen.getByText(/candidate comparison: candidates match unverified/i)).toBeInTheDocument());
    const accept = screen.getByRole("button", { name: /Record owner self-review/i });
    expect(accept).toBeDisabled();
    for (const box of screen.getAllByRole("checkbox")) fireEvent.click(box);
    expect(accept).toBeEnabled();
    fireEvent.click(accept);
    expect(screen.getByText(/Owner self-review recorded in this browser session only/)).toBeInTheDocument();
    expect(screen.getByText(/Installed-process acceptance: HOLD/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Preview bounded Master Shell candidate/i }));
    expect(screen.getByText(/HOLD_ORIGINAL_MACHINE_AND_SIGNED_PROCESS_PROOF/)).toBeInTheDocument();
  });
  it("clears prior evidence and owner review when a new request fails", async () => {
    vi.mocked(getWindowsLauncherEvidence286).mockResolvedValueOnce(snapshot()).mockRejectedValueOnce(new Error("password=SECRET"));
    render(<WindowsLauncherEvidence286Panel ownerId="ree" />);
    fireEvent.click(screen.getByRole("button", { name: "Inspect release and launcher candidates" }));
    await waitFor(() => expect(screen.getByText(/candidate comparison:/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Inspect release and launcher candidates" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/could not be completed/i));
    expect(screen.queryByText(/candidate comparison:/i)).toBeNull();
    expect(document.body.textContent).not.toContain("SECRET");
  });
});
