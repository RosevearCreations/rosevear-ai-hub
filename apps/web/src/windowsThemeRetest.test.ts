import { describe, expect, it } from "vitest";
import { makeWindowsThemeRetestDisposition } from "./windowsThemeRetest";

describe("Build 197 owner-reported Windows retest never grants field acceptance", () => {
  it("requires an actual Windows context and a previously failed check", () => {
    const r = makeWindowsThemeRetestDisposition("other_browser_device", [
      { id: "keyboard", observation: "observed_fail", retest: "owner_reports_improvement" }
    ]);
    expect(r.outcome).toBe("WINDOWS_RETEST_NOT_ELIGIBLE_OR_NOT_RECORDED");
    expect(r.observations[0].retest).toBe("not_retested");
    expect(r.independentWindowsWitness).toBe("NOT_VERIFIED");
  });
  it("distinguishes pending, persistent and improved owner reports without clearing holds", () => {
    const observations = [
      { id: "navigation", observation: "observed_fail" as const, retest: "not_retested" as const },
      { id: "keyboard", observation: "observed_fail" as const, retest: "owner_reports_improvement" as const }
    ];
    const pending = makeWindowsThemeRetestDisposition("windows_hub_server", observations);
    expect(pending.outcome).toBe("WINDOWS_RETEST_PENDING");
    const persistent = makeWindowsThemeRetestDisposition("windows_hub_server", [
      { ...observations[0], retest: "issue_persists" }, observations[1]
    ]);
    expect(persistent.outcome).toBe("OWNER_REPORTS_WINDOWS_ISSUES_PERSIST");
    const improved = makeWindowsThemeRetestDisposition("remote_windows_client", [
      { ...observations[0], retest: "owner_reports_improvement" }, observations[1]
    ]);
    expect(improved.outcome).toBe("OWNER_REPORTS_IMPROVEMENT_UNVERIFIED");
    expect(improved.engineeringFixVerified).toBe(false);
    expect(improved.deviceInstallationVerified).toBe(false);
    expect(improved.integrationTestAuthorization).toBe("NOT_GIVEN");
    expect(improved.authenticatedGatewayGets).toBe(0);
  });
  it("does not invent a retest when no prior Windows failure occurred", () => {
    const r = makeWindowsThemeRetestDisposition("windows_hub_server", [
      { id: "navigation", observation: "observed_pass", retest: "not_retested" }
    ]);
    expect(r.outcome).toBe("NO_PRIOR_FAILED_WINDOWS_OBSERVATIONS");
    expect(r.failedOriginalChecks).toBe(0);
  });
});
