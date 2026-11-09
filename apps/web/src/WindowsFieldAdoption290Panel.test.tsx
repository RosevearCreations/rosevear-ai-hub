import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { getHealth, getHubVersion, getWindowsLauncherEvidence286, getWindowsRuntimeEvidence285 } from "./api";
import { WindowsFieldAdoption290Panel } from "./WindowsFieldAdoption290Panel";

vi.mock("./api", () => ({ getHealth: vi.fn(), getHubVersion: vi.fn(),
  getWindowsLauncherEvidence286: vi.fn(), getWindowsRuntimeEvidence285: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

const SHA_A = "a".repeat(40), SHA_B = "b".repeat(40);
const RUN = "https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/42639410008";
const process = { listener: "observed", chain_status: "partial_or_complete", ancestor_kinds: ["node"],
  chain_hops_inspected: 1, recovery_script_mentioned: false, process_predates_checkout_commit: false,
  launch_source: "unknown" };

function installMocks(now = Date.now()) {
  vi.mocked(getHubVersion).mockResolvedValue({ service: "Hub", version: "0.0.57", environment: "test" });
  vi.mocked(getHealth).mockResolvedValue({ service: "Hub", status: "ok", environment: "test" });
  vi.mocked(getWindowsRuntimeEvidence285).mockResolvedValue({
    schema: "rosevear.ai-hub.windows-runtime-evidence.v1", source: "RESPONDING_BACKEND_ONLY",
    observed_at_utc: new Date(now).toISOString(), host_platform: "WINDOWS",
    api_process: { state: "RESPONDED", package_version: "0.0.57" },
    recorded_active_release_sha: SHA_A, recorded_release_basis: "UNVERIFIED_LOCAL_POINTER", services: [],
    installed_binary_verified: false, windows_device_identity_verified: false,
    independent_witness_verified: false, master_shell_reporting_authorized: false,
    made_changes: false, external_requests: 0,
  });
  vi.mocked(getWindowsLauncherEvidence286).mockResolvedValue({
    schema: "rosevear.ai-hub.windows-launcher-evidence.v1", source: "LOCAL_READ_ONLY_INSPECTOR_259",
    observed_at_utc: new Date(now).toISOString(), inspector_observed_at_utc: new Date(now).toISOString(),
    host_platform: "WINDOWS", recorded_release_sha_candidate: SHA_A, checkout_sha_candidate: SHA_A,
    candidate_comparison: "CANDIDATES_MATCH", startup_task_state: "enabled",
    web_launcher: process, backend_launcher: process,
    installed_release_verified: false, original_device_verified: false,
    independent_witness_verified: false, master_shell_reporting_authorized: false,
    made_changes: false, external_requests: 0,
  });
}

function adoption(now = Date.now()) {
  return { backend: { service: "Hub", version: "0.0.57", environment: "test" },
    local: { active_release: SHA_A, adoption_state: "ADOPTED" } as never,
    checkedAtMs: now };
}

describe("Build 290 owner-visible field adoption walkthrough", () => {
  it("makes no network call on mount and keeps all seven signed trust gates on HOLD", () => {
    render(<WindowsFieldAdoption290Panel expectedMainSha={SHA_A} mainRunUrl={RUN} adoption={adoption()} />);
    expect(getWindowsRuntimeEvidence285).not.toHaveBeenCalled();
    expect(getWindowsLauncherEvidence286).not.toHaveBeenCalled();
    expect(screen.getByText(/0 of 7 independently verified here/)).toBeInTheDocument();
    expect(screen.getByText(/Installed release, signed receipt and Master Shell: HOLD/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /restart|install|activate|publish|enroll/i })).toBeNull();
  });

  it("uses one explicit read to cross-check runtime and launcher and resets on source change", async () => {
    const now = Date.now(); installMocks(now);
    const { rerender } = render(<WindowsFieldAdoption290Panel expectedMainSha={SHA_A}
      mainRunUrl={RUN} adoption={adoption(now)} />);
    fireEvent.click(screen.getByRole("button", { name: "Cross-check Windows release candidates (read-only)" }));
    await waitFor(() => expect(screen.getByText(/Read-only local comparison finished/)).toBeInTheDocument());
    expect(getWindowsRuntimeEvidence285).toHaveBeenCalledTimes(1);
    expect(getHubVersion).toHaveBeenCalledTimes(1);
    expect(getHealth).toHaveBeenCalledTimes(1);
    expect(getWindowsLauncherEvidence286).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Windows runtime: live windows service snapshot/)).toBeInTheDocument();
    expect(screen.getByText(/A package version is never a Git commit identity/)).toBeInTheDocument();
    expect(screen.getByRole("table", { name: /Source-to-Windows candidate comparison/ }))
      .toHaveTextContent("Windows launcher checkout candidate");
    expect(screen.getByText(/Original Windows machine identity, loaded executable provenance/)).toBeInTheDocument();
    rerender(<WindowsFieldAdoption290Panel expectedMainSha={SHA_B} mainRunUrl={RUN} adoption={adoption(now)} />);
    await waitFor(() => expect(screen.getByText(/Source reference or installed snapshot changed/)).toBeInTheDocument());
    expect(screen.getByText(/Windows runtime: not sampled/)).toBeInTheDocument();
    expect(getWindowsRuntimeEvidence285).toHaveBeenCalledTimes(1);
  });

  it("fails closed when private API responses fail and never exposes raw exception secrets", async () => {
    vi.mocked(getWindowsRuntimeEvidence285).mockRejectedValue(new Error("password=SECRET"));
    vi.mocked(getHubVersion).mockRejectedValue(new Error("token=SECRET"));
    vi.mocked(getHealth).mockRejectedValue(new Error("private=SECRET"));
    vi.mocked(getWindowsLauncherEvidence286).mockRejectedValue(new Error("host=SECRET"));
    render(<WindowsFieldAdoption290Panel expectedMainSha={SHA_A} mainRunUrl={RUN} adoption={adoption()} />);
    fireEvent.click(screen.getByRole("button", { name: "Cross-check Windows release candidates (read-only)" }));
    await waitFor(() => expect(screen.getByText(/Read-only local comparison finished/)).toBeInTheDocument());
    expect(screen.getByText(/candidate disposition: hold missing or stale evidence/i)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("SECRET");
  });
});
