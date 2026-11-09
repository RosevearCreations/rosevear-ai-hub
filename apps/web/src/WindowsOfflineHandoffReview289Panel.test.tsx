import { webcrypto } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { WindowsOfflineHandoffReview289Panel } from "./WindowsOfflineHandoffReview289Panel";
import { reviewWindowsLauncherEvidence } from "./windowsLauncherEvidence286";
import { recordWindowsOwnerObservation287 } from "./windowsOwnerAcceptance287";
import { prepareWindowsSigningRequest288 } from "./windowsEvidenceHandoff288";

afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); });

describe("Build 289 local file reviewer", () => {
  it("never requests or publishes anything on mount or after a rejected file", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    render(<WindowsOfflineHandoffReview289Panel />);
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByText(/Master Shell and Windows trust: HOLD/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Select downloaded unsigned Windows request JSON"), {
      target: { files: [{ size: 9, text: async () => "not JSON" }] },
    });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("INVALID_JSON"));
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.queryByText(/Integrity only: digest matched/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Clear local review" }));
    expect(screen.getByRole("status")).toHaveTextContent("cleared");
  });

  it("reviews a real Build 288 request locally and flags an aged observation", async () => {
    vi.stubGlobal("crypto", webcrypto);
    const now = Date.now() - 6 * 60_000;
    const process = { listener: "observed", chain_status: "partial_or_complete", ancestor_kinds: ["node"],
      chain_hops_inspected: 1, recovery_script_mentioned: false, process_predates_checkout_commit: false, launch_source: "unknown" };
    const review = reviewWindowsLauncherEvidence({ schema: "rosevear.ai-hub.windows-launcher-evidence.v1",
      source: "LOCAL_READ_ONLY_INSPECTOR_259", observed_at_utc: new Date(now).toISOString(),
      inspector_observed_at_utc: new Date(now).toISOString(), host_platform: "WINDOWS",
      recorded_release_sha_candidate: "a".repeat(40), checkout_sha_candidate: "a".repeat(40),
      candidate_comparison: "CANDIDATES_MATCH", startup_task_state: "enabled",
      web_launcher: process, backend_launcher: process, installed_release_verified: false,
      original_device_verified: false, independent_witness_verified: false,
      master_shell_reporting_authorized: false, made_changes: false, external_requests: 0,
    }, now);
    const records = recordWindowsOwnerObservation287(localStorage, "ree", [], review,
      "owner_reported_working", true, now).records;
    const request = await prepareWindowsSigningRequest288(records, review, null, now);
    render(<WindowsOfflineHandoffReview289Panel />);
    fireEvent.change(screen.getByLabelText("Select downloaded unsigned Windows request JSON"), {
      target: { files: [{ size: 5000, text: async () => JSON.stringify(request) }] },
    });
    await waitFor(() => expect(screen.getByText(/Integrity only: digest matched/)).toBeInTheDocument());
    expect(screen.getByRole("alert")).toHaveTextContent("older than five minutes");
    expect(screen.getByText(/Master Shell and Windows trust: HOLD/)).toBeInTheDocument();
  });
});
