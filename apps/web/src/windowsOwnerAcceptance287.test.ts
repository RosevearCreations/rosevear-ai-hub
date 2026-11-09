import { beforeEach, describe, expect, it } from "vitest";

import { reviewWindowsLauncherEvidence } from "./windowsLauncherEvidence286";
import {
  inspectWindowsLauncherDrift287, loadOwnerWindowsRecords287, masterShellWindowsReadiness287,
  previousWindowsTransition287, recordWindowsOwnerObservation287, windowsOwnerStorageKey287,
} from "./windowsOwnerAcceptance287";

const sha = "a".repeat(40);
const process = { listener: "observed", chain_status: "partial_or_complete", ancestor_kinds: ["python", "powershell"],
  chain_hops_inspected: 2, recovery_script_mentioned: false, process_predates_checkout_commit: false, launch_source: "unknown" };
function raw(now = Date.now()): Record<string, unknown> {
  return {
    schema: "rosevear.ai-hub.windows-launcher-evidence.v1", source: "LOCAL_READ_ONLY_INSPECTOR_259",
    observed_at_utc: new Date(now).toISOString(), inspector_observed_at_utc: new Date(now).toISOString(),
    host_platform: "WINDOWS", recorded_release_sha_candidate: sha, checkout_sha_candidate: sha,
    candidate_comparison: "CANDIDATES_MATCH", startup_task_state: "enabled",
    web_launcher: process, backend_launcher: process,
    installed_release_verified: false, original_device_verified: false, independent_witness_verified: false,
    master_shell_reporting_authorized: false, made_changes: false, external_requests: 0,
  };
}

beforeEach(() => localStorage.clear());

describe("Build 287 Windows owner acceptance and Master Shell HOLD", () => {
  it("stores only allowlisted reports, isolated per owner, and never accepts signed proof", () => {
    const now = Date.now();
    const review = reviewWindowsLauncherEvidence(raw(now), now);
    const result = recordWindowsOwnerObservation287(localStorage, "ree", [], review, "owner_reported_working", true, now);
    expect(result.saved).toBe(true);
    expect(loadOwnerWindowsRecords287(localStorage, "ree")).toHaveLength(1);
    expect(loadOwnerWindowsRecords287(localStorage, "jack")).toEqual([]);
    expect(windowsOwnerStorageKey287(" ")).toBeNull();
    expect(windowsOwnerStorageKey287("ree")).not.toBe(windowsOwnerStorageKey287("jack"));
    const preview = JSON.stringify(masterShellWindowsReadiness287(result.records, review, now));
    expect(preview).toContain("HOLD_INDEPENDENT_FIELD_PROOF_AND_APPROVED_REPORTING_CONTRACT");
    expect(preview).toContain('"installedReleaseAttested":false');
    expect(preview).toContain('"sourceReportPublished":false');
    expect(preview).not.toContain("ree");
    expect(preview).not.toContain("powershell.exe");
  });

  it("rejects a missing acknowledgment, stale sample, invented host proof, and working on mismatch", () => {
    const now = Date.now();
    const review = reviewWindowsLauncherEvidence(raw(now), now);
    expect(recordWindowsOwnerObservation287(localStorage, "ree", [], review, "owner_reported_working", false, now).saved).toBe(false);
    expect(recordWindowsOwnerObservation287(localStorage, "ree", [], review, "owner_reported_working", true, now + 310_000).saved).toBe(false);
    const mismatch = reviewWindowsLauncherEvidence({ ...raw(now), checkout_sha_candidate: "b".repeat(40),
      candidate_comparison: "CANDIDATES_DIFFER" }, now);
    expect(recordWindowsOwnerObservation287(localStorage, "ree", [], mismatch, "owner_reported_working", true, now).saved).toBe(false);
    expect(recordWindowsOwnerObservation287(localStorage, "ree", [], mismatch, "owner_reported_issue", true, now).saved).toBe(true);
    const invalid = reviewWindowsLauncherEvidence({ ...raw(now), installed_release_verified: true }, now);
    expect(recordWindowsOwnerObservation287(localStorage, "ree", [], invalid, "owner_reported_issue", true, now).saved).toBe(false);
  });

  it("reports bounded release, launcher and task drift without treating stability as identity proof", () => {
    const now = Date.now();
    const first = reviewWindowsLauncherEvidence(raw(now), now);
    const prior = recordWindowsOwnerObservation287(localStorage, "ree", [], first, "owner_reported_working", true, now).records[0];
    expect(inspectWindowsLauncherDrift287(prior, first, now).state).toBe("NO_CHANGE_OBSERVED_UNVERIFIED");
    const changed = reviewWindowsLauncherEvidence({ ...raw(now), recorded_release_sha_candidate: "b".repeat(40),
      checkout_sha_candidate: "b".repeat(40), startup_task_state: "disabled",
      web_launcher: { ...process, ancestor_kinds: ["node"], chain_hops_inspected: 1 } }, now);
    const drift = inspectWindowsLauncherDrift287(prior, changed, now);
    expect(drift.state).toBe("DRIFT_DETECTED");
    expect(drift.changes).toEqual(["UPDATER_RELEASE_CHANGED", "CHECKOUT_CHANGED", "WEB_LAUNCHER_CHANGED", "STARTUP_TASK_CHANGED"]);
    const second = recordWindowsOwnerObservation287(localStorage, "ree", [prior], changed, "owner_reported_issue", true, now + 1).records;
    expect(previousWindowsTransition287(second)).toEqual(drift.changes);
    expect(masterShellWindowsReadiness287(second, changed, now + 1).lastRecordedTransitionDrift).toEqual(drift.changes);
    expect(inspectWindowsLauncherDrift287(prior, changed, now + 31 * 24 * 60 * 60_000).state).toBe("CURRENT_SAMPLE_ON_HOLD");
    expect(inspectWindowsLauncherDrift287(prior, null, now).state).toBe("NO_CURRENT_SAMPLE");
    expect(inspectWindowsLauncherDrift287(null, changed, now).state).toBe("NO_REFERENCE");
  });

  it("loads only versioned, bounded and allowlisted local records", () => {
    const now = Date.now();
    const review = reviewWindowsLauncherEvidence(raw(now), now);
    const report = recordWindowsOwnerObservation287(localStorage, "ree", [], review, "owner_reported_working", true, now);
    const key = windowsOwnerStorageKey287("ree")!;
    localStorage.setItem(key, JSON.stringify({ version: 1, records: [{ ...report.records[0], privateToken: "SECRET" }] }));
    expect(JSON.stringify(loadOwnerWindowsRecords287(localStorage, "ree"))).not.toContain("SECRET");
    localStorage.setItem(key, JSON.stringify({ version: 2, records: report.records }));
    expect(loadOwnerWindowsRecords287(localStorage, "ree")).toEqual([]);
    localStorage.setItem(key, JSON.stringify({ version: 1, records: Array(300).fill(report.records[0]) }));
    expect(loadOwnerWindowsRecords287(localStorage, "ree")).toEqual([]);
    localStorage.setItem(key, JSON.stringify({ version: 1, records: [{ ...report.records[0], web: { listener: "SECRET" } }] }));
    expect(loadOwnerWindowsRecords287(localStorage, "ree")).toEqual([]);
  });
});
