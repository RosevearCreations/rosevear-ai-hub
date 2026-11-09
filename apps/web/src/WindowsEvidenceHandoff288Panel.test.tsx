import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { reviewWindowsLauncherEvidence } from "./windowsLauncherEvidence286";
import { recordWindowsOwnerObservation287 } from "./windowsOwnerAcceptance287";
import { WindowsEvidenceHandoff288Panel } from "./WindowsEvidenceHandoff288Panel";

const SHA_A = "a".repeat(40), SHA_B = "b".repeat(40);
const process = { listener: "observed", chain_status: "partial_or_complete", ancestor_kinds: ["node"],
  chain_hops_inspected: 1, recovery_script_mentioned: false, process_predates_checkout_commit: false, launch_source: "unknown" };
function review(now: number, sha = SHA_A) {
  return reviewWindowsLauncherEvidence({
    schema: "rosevear.ai-hub.windows-launcher-evidence.v1", source: "LOCAL_READ_ONLY_INSPECTOR_259",
    observed_at_utc: new Date(now).toISOString(), inspector_observed_at_utc: new Date(now).toISOString(),
    host_platform: "WINDOWS", recorded_release_sha_candidate: sha, checkout_sha_candidate: sha,
    candidate_comparison: "CANDIDATES_MATCH", startup_task_state: "enabled",
    web_launcher: process, backend_launcher: process,
    installed_release_verified: false, original_device_verified: false, independent_witness_verified: false,
    master_shell_reporting_authorized: false, made_changes: false, external_requests: 0,
  }, now);
}

beforeEach(() => { localStorage.clear(); vi.stubGlobal("crypto", webcrypto); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); });

describe("Build 288 Windows evidence handoff UI", () => {
  it("does not create a signing request, make a fetch or publish on mount", () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    render(<WindowsEvidenceHandoff288Panel ownerId="ree" records={[]} review={null} />);
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByText(/Master Shell: HOLD/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Prepare offline signing request" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /publish|activate|restart|sign now/i })).toBeNull();
  });

  it("prepares an explicitly unsigned offline handoff with no drift", async () => {
    const now = Date.now(); const sample = review(now);
    const { records } = recordWindowsOwnerObservation287(localStorage, "ree", [], sample, "owner_reported_working", true, now);
    render(<WindowsEvidenceHandoff288Panel ownerId="ree" records={records} review={sample} />);
    fireEvent.click(screen.getByRole("button", { name: "Prepare offline signing request" }));
    await waitFor(() => expect(screen.getByText(/Signing request prepared locally/)).toBeInTheDocument());
    expect(screen.getByText(/Request digest \(SHA-256\):/)).toHaveTextContent(/[a-f0-9]{64}/);
    expect(screen.getByRole("button", { name: "Download unsigned signing request JSON" })).toBeEnabled();
    fireEvent.click(screen.getByText("Review read-only Master Shell V1 mapping"));
    expect(screen.getByText(/NO_SIGNED_WEBHOOK_OR_APPROVED_SOURCE_PUBLISHER/)).toBeInTheDocument();
  });

  it("blocks drift until a specific local acknowledgement is recorded", async () => {
    const now = Date.now();
    const { records } = recordWindowsOwnerObservation287(localStorage, "ree", [], review(now), "owner_reported_working", true, now);
    render(<WindowsEvidenceHandoff288Panel ownerId="ree" records={records} review={review(now + 10, SHA_B)} />);
    const prepare = screen.getByRole("button", { name: "Prepare offline signing request" });
    expect(prepare).toBeDisabled();
    const acknowledge = screen.getByRole("button", { name: "Record browser-local drift acknowledgement" });
    expect(acknowledge).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(acknowledge);
    expect(screen.getByText(/Acknowledged locally/)).toBeInTheDocument();
    expect(prepare).toBeEnabled();
    fireEvent.click(prepare);
    await waitFor(() => expect(screen.getByText(/Signing request prepared locally/)).toBeInTheDocument());
    expect(screen.getByText(/Awaiting approved signer and independent witness/)).toBeInTheDocument();
  });
});
