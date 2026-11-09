import { describe, expect, it } from "vitest";

import type { WindowsAdoptionReview290 } from "./windowsFieldAdoption290";
import {
  exportRecoveryHistory291, guideWindowsRecovery291, recordRecoveryDecision291,
} from "./windowsRecoveryDecision291";

const SHA = "a".repeat(40);
const NOW = Date.parse("2026-11-09T16:00:00Z");
const base: WindowsAdoptionReview290 = {
  disposition: "REPORTED_DRIFT_NEEDS_REVIEW",
  referenceState: "OWNER_ENTERED_UNVERIFIED",
  axes: [], matchCount: 3, backendVersion: "0.0.57",
  backendVersionState: "VERSION_DISAGREEMENT",
  runtimeState: "LIVE_WINDOWS_SERVICE_SNAPSHOT", launcherState: "CANDIDATES_DIFFER",
  blockers: [], trustedInstalledRelease: false,
  signedReceiptVerified: false, masterShellAuthorized: false,
};

describe("Build 291 guided Windows recovery owner decisions", () => {
  it("distinguishes drift, missing evidence, incomplete ancestry and unverified alignment", () => {
    const drift = guideWindowsRecovery291(base);
    expect(drift.priority).toBe("DRIFT_FOLLOW_UP");
    expect(drift.supervisedRecoveryReviewAvailable).toBe(true);
    expect(drift.versionFollowUp).toContain("disagree");
    expect(guideWindowsRecovery291({ ...base, disposition: "HOLD_MISSING_OR_STALE_EVIDENCE" })
      .priority).toBe("EVIDENCE_HOLD");
    expect(guideWindowsRecovery291({ ...base, disposition: "HOLD_INCOMPLETE_CANDIDATES" })
      .priority).toBe("LAUNCHER_REVIEW");
    const matched = guideWindowsRecovery291({ ...base,
      disposition: "REPORTED_CANDIDATES_CONVERGE_UNVERIFIED",
      backendVersionState: "REPORTED_VERSIONS_AGREE" });
    expect(matched.priority).toBe("UNVERIFIED_ALIGNMENT");
    expect(matched.supervisedRecoveryReviewAvailable).toBe(false);
    expect(matched.versionFollowUp).toContain("do not prove");
  });

  it("requires an explicit owner acknowledgement and current reported drift for supervised review", () => {
    expect(recordRecoveryDecision291(base, "REVIEW_SUPERVISED_RECOVERY", false, SHA, NOW)).toBeNull();
    expect(recordRecoveryDecision291({ ...base, disposition: "HOLD_MISSING_OR_STALE_EVIDENCE" },
      "REVIEW_SUPERVISED_RECOVERY", true, SHA, NOW)).toBeNull();
    expect(recordRecoveryDecision291(base, "REVIEW_SUPERVISED_RECOVERY",
      true, "wrong", NOW)).toBeNull();
    expect(recordRecoveryDecision291(base, "REVIEW_SUPERVISED_RECOVERY",
      true, SHA, Number.NaN)).toBeNull();
    expect(recordRecoveryDecision291(base, "REVIEW_SUPERVISED_RECOVERY",
      true, SHA, NOW)?.decision).toBe("REVIEW_SUPERVISED_RECOVERY");
  });

  it("records only sanitized owner notes, never device acceptance or a trusted event", () => {
    const record = recordRecoveryDecision291(base, "INSPECT_ORIGINAL_WINDOWS_HOST", true,
      SHA, NOW);
    expect(record).not.toBeNull();
    expect(record?.ownerMainSha).toBe(SHA);
    expect(record?.originalHostAccepted).toBe(false);
    expect(record?.signedReceiptVerified).toBe(false);
    expect(record?.masterShellAuthorized).toBe(false);
    const exportFile = exportRecoveryHistory291([record!]);
    expect(exportFile.source).toBe("BROWSER_SESSION_OWNER_NOTES_ONLY");
    expect(exportFile.originalHostAcceptance).toBe("HOLD_UNVERIFIED");
    expect(exportFile.entries).toHaveLength(1);
    expect(JSON.stringify(exportFile)).not.toMatch(/password|token=|SECRET/);
  });

  it("records safe HOLD decisions even without source authority and caps exported history", () => {
    const missing = { ...base, referenceState: "MISSING_OR_INVALID" as const,
      disposition: "HOLD_MISSING_OR_STALE_EVIDENCE" as const };
    const record = recordRecoveryDecision291(missing, "DEFER_ON_HOLD", true,
      "token=PRIVATE", NOW);
    expect(record?.ownerMainSha).toBeNull();
    const report = exportRecoveryHistory291(Array(24).fill(record!));
    expect(report.entries).toHaveLength(20);
    expect(JSON.stringify(report)).not.toContain("PRIVATE");
  });
});
