import { describe, expect, it } from "vitest";

import { reviewWindowsRuntimeEvidence, windowsEvidenceCandidatePreview } from "./windowsRuntimeEvidence285";

const NOW = Date.parse("2026-11-09T01:00:00Z");
const release = "f".repeat(40);
const base = {
  schema: "rosevear.ai-hub.windows-runtime-evidence.v1",
  observed_at_utc: "2026-11-09T00:59:00Z", source: "RESPONDING_BACKEND_ONLY",
  host_platform: "WINDOWS", api_process: { state: "RESPONDED", package_version: "0.0.57" },
  recorded_active_release_sha: release,
  recorded_release_basis: "UNVERIFIED_LOCAL_POINTER",
  services: [
    { id: "tailscale", label: "Tailscale", status: "RUNNING", evidence: "SCM_READ_ONLY" },
    { id: "caddy", label: "Caddy", status: "NOT_REGISTERED", evidence: "SCM_READ_ONLY" },
  ],
  installed_binary_verified: false, windows_device_identity_verified: false,
  independent_witness_verified: false, master_shell_reporting_authorized: false,
  made_changes: false, external_requests: 0,
};
const version = { service: "Hub", version: "0.0.57", environment: "test" };
const health = { service: "Hub", status: "ok", environment: "test" };

describe("Build 285 bounded Windows runtime evidence", () => {
  it("distinguishes a fresh Windows service snapshot from installed release proof", () => {
    const review = reviewWindowsRuntimeEvidence(base, version, health, NOW);
    expect(review.state).toBe("LIVE_WINDOWS_SERVICE_SNAPSHOT");
    expect(review.services.map(service => service.status)).toEqual(["RUNNING", "UNAVAILABLE", "NOT_REGISTERED", "UNAVAILABLE"]);
    expect(review.activeReleaseCandidate).toBe(release);
    expect(review.installedBinaryVerified).toBe(false);
    expect(review.machineIdentityVerified).toBe(false);
    expect(review.backendHealthObserved).toBe(true);
    expect(review.reportAuthorized).toBe(false);
    expect(windowsEvidenceCandidatePreview(review).masterShellPreflight).toMatch(/^HOLD_/);
  });

  it("handles stale, future and disagreement without a current Windows green", () => {
    expect(reviewWindowsRuntimeEvidence({ ...base, observed_at_utc: "2026-11-08T00:00:00Z" }, version, health, NOW).state).toBe("STALE");
    expect(reviewWindowsRuntimeEvidence({ ...base, observed_at_utc: "2026-11-09T01:07:00Z" }, version, health, NOW).state).toBe("CLOCK_CHECK");
    expect(reviewWindowsRuntimeEvidence(base, { ...version, version: "0.0.58" }, health, NOW).state).toBe("VERSION_MISMATCH");
    expect(reviewWindowsRuntimeEvidence(base, version, { ...health, status: "offline" }, NOW).state).toBe("HEALTH_MISMATCH");
    expect(reviewWindowsRuntimeEvidence(base, version, { ...health, service: "other" }, NOW).state).toBe("HEALTH_MISMATCH");
  });

  it("does not mistake a non-Windows test runner for Ree's Windows server", () => {
    const review = reviewWindowsRuntimeEvidence({ ...base, host_platform: "NOT_WINDOWS" }, version, health, NOW);
    expect(review.state).toBe("NOT_WINDOWS_HOST");
    expect(review.services.every(service => service.status === "NOT_SAMPLED")).toBe(true);
  });

  it("ignores unknown services and rejects raw secrets, invented witness claims and invalid schema", () => {
    const malicious = {
      ...base, recorded_active_release_sha: "password=SECRET",
      services: [{ id: "tailscale", label: "host=PRIVATE", status: "SECRET", evidence: "SCM_READ_ONLY" },
        { id: "private-camera", label: "SECRET", status: "RUNNING" }],
    };
    const review = reviewWindowsRuntimeEvidence(malicious, version, health, NOW);
    expect(review.activeReleaseCandidate).toBeNull();
    expect(JSON.stringify(windowsEvidenceCandidatePreview(review))).not.toMatch(/SECRET|PRIVATE|password|camera/i);
    expect(review.services[0].status).toBe("UNAVAILABLE");
    expect(reviewWindowsRuntimeEvidence({ ...base, installed_binary_verified: true }, version, health, NOW).state).toBe("INVALID_EVIDENCE");
    expect(reviewWindowsRuntimeEvidence({ ...base, schema: "other" }, version, health, NOW).state).toBe("INVALID_EVIDENCE");
    expect(reviewWindowsRuntimeEvidence({ ...base, recorded_release_basis: "VERIFIED" }, version, health, NOW).state).toBe("INVALID_EVIDENCE");
  });
});
