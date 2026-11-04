import { describe, expect, it } from "vitest";
import { assessFirstActivation246, type FirstActivationChecks } from "./windowsFirstActivation246";

const yes: FirstActivationChecks = {
  backupRestored: true, migrationSucceeded: true, backendRestarted: true,
  clientReloaded: true, darkModeVisible: true, restartButtonVisible: true,
};
describe("Build 246 first-activation boundaries", () => {
  it("holds missing source, backup and visual evidence", () => {
    const report = assessFirstActivation246("", null, null, null, { ...yes, backupRestored: false });
    expect(report.state).toBe("FIELD_ACCEPTANCE_HOLD");
    expect(report.machine_verified).toBe(false);
    expect(report.holds.join(" ")).toContain("backup");
  });
  it("a matching local pointer and all owner marks never assert independent acceptance", () => {
    const sha = "a".repeat(40);
    const report = assessFirstActivation246(sha, sha, { active_release: sha, adoption_state: "ADOPTED" } as never,
      { service: "hub", version: "0.0.57", environment: "development" }, yes);
    expect(report.source_alignment).toBe("REPORTED_MATCH");
    expect(report.state).toBe("FIELD_ACCEPTANCE_HOLD");
    expect(report.holds.at(-1)).toContain("Independent Windows");
  });
  it("failed rollback remains a recovery review, never green", () => {
    expect(assessFirstActivation246("", null, { adoption_state: "ROLLBACK_FAILED" } as never, null, yes).state)
      .toBe("RECOVERY_REVIEW_REQUIRED");
  });
});
