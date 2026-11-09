import { describe, expect, it } from "vitest";

import { assessWindowsFieldAdoption290, SIGNED_RECEIPT_GATES_290, type WindowsAdoptionInput290 } from "./windowsFieldAdoption290";

const NOW = Date.parse("2026-11-09T15:00:00Z");
const SHA_A = "a".repeat(40), SHA_B = "b".repeat(40);
const chain = { listener: "observed" as const, chainStatus: "partial_or_complete" as const,
  ancestorKinds: ["node"], recoveryScriptMentioned: false,
  processPredatesCheckoutCommit: false, launchSource: "unknown" as const };

function complete(): WindowsAdoptionInput290 {
  return {
    expectedMainSha: SHA_A,
    mainRunUrl: "https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/42639410008",
    web: { sha: SHA_A, clean: true },
    adoption: { backend: { service: "Hub", version: "0.0.57", environment: "test" },
      local: { active_release: SHA_A, adoption_state: "ADOPTED" } as never, checkedAtMs: NOW - 1_000 },
    runtime: { state: "LIVE_WINDOWS_SERVICE_SNAPSHOT", sampledAtMs: NOW - 1_000,
      platform: "WINDOWS", backendVersion: "0.0.57", backendHealthObserved: true,
      activeReleaseCandidate: SHA_A, services: [], installedBinaryVerified: false,
      machineIdentityVerified: false, independentWitnessVerified: false, reportAuthorized: false },
    launcher: { state: "CANDIDATES_MATCH_UNVERIFIED", sampledAtMs: NOW - 1_000,
      recordedSha: SHA_A, checkoutSha: SHA_A, startupTask: "enabled", web: chain, backend: chain,
      installedReleaseVerified: false, independentlyWitnessed: false, reportingAuthorized: false },
    nowMs: NOW,
  };
}

describe("Build 290 original Windows source-to-process convergence", () => {
  it("shows five matching candidates only as reported and keeps trust and Master Shell on HOLD", () => {
    const result = assessWindowsFieldAdoption290(complete());
    expect(result.disposition).toBe("REPORTED_CANDIDATES_CONVERGE_UNVERIFIED");
    expect(result.matchCount).toBe(5);
    expect(result.axes.every(axis => axis.state === "MATCHES_OWNER_REFERENCE")).toBe(true);
    expect(result.backendVersionState).toBe("REPORTED_VERSIONS_AGREE");
    expect(result.trustedInstalledRelease).toBe(false);
    expect(result.signedReceiptVerified).toBe(false);
    expect(result.masterShellAuthorized).toBe(false);
    expect(result.blockers).toContain("Original Windows machine identity, loaded executable provenance and independent signed receipt are still unverified.");
    expect(SIGNED_RECEIPT_GATES_290).toHaveLength(7);
  });

  it("separates mismatched updater/checkout or package versions from candidate convergence", () => {
    const good = complete();
    const changed = assessWindowsFieldAdoption290({ ...good,
      adoption: { ...good.adoption!, local: { ...good.adoption!.local!, active_release: SHA_B } },
      launcher: { ...good.launcher!, state: "CANDIDATES_DIFFER", checkoutSha: SHA_B },
    });
    expect(changed.disposition).toBe("REPORTED_DRIFT_NEEDS_REVIEW");
    expect(changed.axes.filter(axis => axis.state === "DIFFERS_FROM_OWNER_REFERENCE")).toHaveLength(2);
    const versionDrift = assessWindowsFieldAdoption290({ ...good,
      adoption: { ...good.adoption!, backend: { ...good.adoption!.backend!, version: "0.0.58" } },
    });
    expect(versionDrift.backendVersionState).toBe("VERSION_DISAGREEMENT");
    expect(versionDrift.disposition).toBe("REPORTED_DRIFT_NEEDS_REVIEW");
  });

  it("fails closed on stale/future evidence, missing reference and incomplete launcher ancestry", () => {
    const good = complete();
    const stale = assessWindowsFieldAdoption290({ ...good, nowMs: NOW + 6 * 60_000 });
    expect(stale.disposition).toBe("HOLD_MISSING_OR_STALE_EVIDENCE");
    expect(stale.matchCount).toBe(1); // compiled asset only; server snapshots are stale
    expect(stale.axes.filter(axis => axis.state === "OBSERVATION_HELD")).toHaveLength(4);
    const future = assessWindowsFieldAdoption290({ ...good,
      runtime: { ...good.runtime!, sampledAtMs: NOW + 3 * 60_000 } });
    expect(future.disposition).toBe("HOLD_MISSING_OR_STALE_EVIDENCE");
    const missing = assessWindowsFieldAdoption290({ ...good, expectedMainSha: "not a SHA", mainRunUrl: "https://other/" });
    expect(missing.referenceState).toBe("MISSING_OR_INVALID");
    expect(missing.matchCount).toBe(0);
    const chainGap = assessWindowsFieldAdoption290({ ...good,
      launcher: { ...good.launcher!, web: { ...chain, listener: "missing" } },
    });
    expect(chainGap.disposition).toBe("HOLD_INCOMPLETE_CANDIDATES");
    expect(chainGap.blockers.some(text => text.includes("launcher ancestry"))).toBe(true);
  });

  it("redacts malformed local source strings and never accepts updater failures or dirty builds", () => {
    const good = complete();
    const result = assessWindowsFieldAdoption290({ ...good,
      adoption: { ...good.adoption!, local: { ...good.adoption!.local!, active_release: "token=SECRET", adoption_state: "ROLLBACK_FAILED" } },
      web: { sha: SHA_A, clean: false },
    });
    expect(result.disposition).toBe("REPORTED_DRIFT_NEEDS_REVIEW");
    expect(result.axes.find(axis => axis.id === "updater")?.sha).toBeNull();
    expect(JSON.stringify(result)).not.toContain("SECRET");
    expect(result.trustedInstalledRelease).toBe(false);
  });
});
