import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { WindowsRuntimeEvidence285Panel } from "./WindowsRuntimeEvidence285Panel";
import { getHealth, getHubVersion, getWindowsRuntimeEvidence285 } from "./api";

vi.mock("./api", () => ({ getHealth: vi.fn(), getHubVersion: vi.fn(), getWindowsRuntimeEvidence285: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const healthy = { service: "Hub", status: "ok" as const, environment: "test" };

function snapshot(): Record<string, unknown> {
  return {
    schema: "rosevear.ai-hub.windows-runtime-evidence.v1",
    source: "RESPONDING_BACKEND_ONLY", observed_at_utc: new Date().toISOString(),
    host_platform: "WINDOWS", api_process: { state: "RESPONDED", package_version: "0.0.57" },
    recorded_active_release_sha: "a".repeat(40),
    recorded_release_basis: "UNVERIFIED_LOCAL_POINTER",
    services: [{ id: "tailscale", label: "Tailscale", status: "RUNNING", evidence: "SCM_READ_ONLY" }],
    installed_binary_verified: false, windows_device_identity_verified: false,
    independent_witness_verified: false, master_shell_reporting_authorized: false,
    made_changes: false, external_requests: 0,
  };
}

describe("Build 285 owner runtime evidence screen", () => {
  it("never probes the backend, publisher or services without an explicit owner click", () => {
    render(<WindowsRuntimeEvidence285Panel />);
    expect(screen.getByText(/No installed server observation/)).toBeInTheDocument();
    expect(getWindowsRuntimeEvidence285).not.toHaveBeenCalled();
    expect(getHubVersion).not.toHaveBeenCalled();
    expect(getHealth).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /restart|publish|activate/i })).toBeNull();
  });

  it("shows a bounded snapshot and never claims installed version or Master Shell acceptance", async () => {
    vi.mocked(getWindowsRuntimeEvidence285).mockResolvedValue(snapshot());
    vi.mocked(getHubVersion).mockResolvedValue({ service: "Hub", version: "0.0.57", environment: "test" });
    vi.mocked(getHealth).mockResolvedValue(healthy);
    render(<WindowsRuntimeEvidence285Panel />);
    fireEvent.click(screen.getByRole("button", { name: "Check installed server and services" }));
    await waitFor(() => expect(screen.getByText(/live evidence state: live windows service snapshot/i)).toBeInTheDocument());
    expect(screen.getByText(/Installed release verification: HOLD/)).toBeInTheDocument();
    expect(screen.getByText(/API self-report, not installed binary proof/)).toBeInTheDocument();
    expect(screen.getByText(/Tailscale/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Preview sanitized Master Shell candidate" }));
    expect(screen.getByText(/HOLD_INDEPENDENT_MACHINE_IDENTITY_AND_REPORTING_CONTRACT/)).toBeInTheDocument();
    expect(getWindowsRuntimeEvidence285).toHaveBeenCalledTimes(1);
    expect(getHubVersion).toHaveBeenCalledTimes(1);
    expect(getHealth).toHaveBeenCalledTimes(1);
  });

  it("does not display backend error secrets and removes a prior result on request failure", async () => {
    vi.mocked(getWindowsRuntimeEvidence285).mockResolvedValueOnce(snapshot()).mockRejectedValueOnce(new Error("password=SECRET"));
    vi.mocked(getHubVersion).mockResolvedValue({ service: "Hub", version: "0.0.57", environment: "test" });
    vi.mocked(getHealth).mockResolvedValue(healthy);
    render(<WindowsRuntimeEvidence285Panel />);
    fireEvent.click(screen.getByRole("button", { name: "Check installed server and services" }));
    await waitFor(() => expect(screen.getByText(/live evidence state:/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Check installed server and services" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/No current backend observation/));
    expect(document.body.textContent).not.toContain("SECRET");
    expect(screen.queryByText(/live evidence state:/i)).toBeNull();
  });

  it("rejects a fake signed or fully verified response", async () => {
    vi.mocked(getWindowsRuntimeEvidence285).mockResolvedValue({ ...snapshot(), installed_binary_verified: true,
      services: [{ id: "private", label: "token=PRIVATE", status: "RUNNING" }] });
    vi.mocked(getHubVersion).mockResolvedValue({ service: "Hub", version: "0.0.57", environment: "test" });
    vi.mocked(getHealth).mockResolvedValue(healthy);
    render(<WindowsRuntimeEvidence285Panel />);
    fireEvent.click(screen.getByRole("button", { name: "Check installed server and services" }));
    await waitFor(() => expect(screen.getByText(/live evidence state: invalid evidence/i)).toBeInTheDocument());
    expect(document.body.textContent).not.toContain("PRIVATE");
    expect(screen.queryByRole("list", { name: "Windows service observations" })).toBeNull();
  });
});
