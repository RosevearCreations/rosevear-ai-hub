import { describe, expect, it } from "vitest";
import { launcherCandidatePreview, reviewWindowsLauncherEvidence } from "./windowsLauncherEvidence286";

const sha = "a".repeat(40);
function observed() {
  return {
    listener: "observed", chain_status: "partial_or_complete", ancestor_kinds: ["node", "powershell"],
    chain_hops_inspected: 2, recovery_script_mentioned: false, process_predates_checkout_commit: false,
    launch_source: "unknown", private_path: "SECRET",
  };
}
function snapshot(time = Date.now()): Record<string, unknown> {
  return {
    schema: "rosevear.ai-hub.windows-launcher-evidence.v1", source: "LOCAL_READ_ONLY_INSPECTOR_259",
    observed_at_utc: new Date(time).toISOString(), inspector_observed_at_utc: new Date(time).toISOString(),
    host_platform: "WINDOWS", recorded_release_sha_candidate: sha, checkout_sha_candidate: sha,
    candidate_comparison: "CANDIDATES_MATCH", startup_task_state: "enabled", web_launcher: observed(), backend_launcher: observed(),
    installed_release_verified: false, original_device_verified: false, independent_witness_verified: false,
    master_shell_reporting_authorized: false, made_changes: false, external_requests: 0, private_token: "SECRET",
  };
}

describe("Build 286 launcher candidate gate", () => {
  it("reports matching checkout candidates as unverified and sanitizes report", () => {
    const review = reviewWindowsLauncherEvidence(snapshot(), Date.now());
    expect(review.state).toBe("CANDIDATES_MATCH_UNVERIFIED");
    expect(review.installedReleaseVerified).toBe(false);
    const preview = JSON.stringify(launcherCandidatePreview(review, true));
    expect(preview).toContain("HOLD_ORIGINAL_MACHINE_AND_SIGNED_PROCESS_PROOF");
    expect(preview).not.toContain("SECRET");
  });
  it("blocks mismatching, stale, future, fabricated and unsupported proof", () => {
    const mismatch = { ...snapshot(), checkout_sha_candidate: "b".repeat(40), candidate_comparison: "CANDIDATES_DIFFER" };
    expect(reviewWindowsLauncherEvidence(mismatch, Date.now()).state).toBe("CANDIDATES_DIFFER");
    expect(reviewWindowsLauncherEvidence(snapshot(Date.now() - 600_000), Date.now()).state).toBe("STALE");
    expect(reviewWindowsLauncherEvidence(snapshot(Date.now() + 600_000), Date.now()).state).toBe("CLOCK_CHECK");
    expect(reviewWindowsLauncherEvidence({ ...snapshot(), installed_release_verified: true }, Date.now()).state).toBe("INVALID_EVIDENCE");
    expect(reviewWindowsLauncherEvidence({ ...snapshot(), web_launcher: { ...observed(), ancestor_kinds: ["PRIVATE_PATH"] } }, Date.now()).state).toBe("INVALID_EVIDENCE");
    expect(reviewWindowsLauncherEvidence({ ...snapshot(), candidate_comparison: "CANDIDATES_DIFFER" }, Date.now()).state).toBe("INVALID_EVIDENCE");
  });
  it("does not invent Windows state on a non-Windows backend", () => {
    const raw = { ...snapshot(), host_platform: "NOT_WINDOWS", candidate_comparison: "NOT_WINDOWS",
      inspector_observed_at_utc: null, web_launcher: null, backend_launcher: null, checkout_sha_candidate: null, startup_task_state: "NOT_SAMPLED" };
    expect(reviewWindowsLauncherEvidence(raw, Date.now()).state).toBe("NOT_WINDOWS");
  });
});
