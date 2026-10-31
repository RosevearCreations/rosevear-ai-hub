import { describe, expect, it } from "vitest";
import { makeWindowsRetestFollowup } from "./windowsRetestFollowup";

describe("Build 198 Windows theme follow-up guard", () => {
  const checks = [
    { id: "resize", observation: "observed_fail" as const, retest: "issue_persists" as const, stage: "engineering_review_requested" as const },
    { id: "keyboard", observation: "observed_fail" as const, retest: "owner_reports_improvement" as const, stage: "owner_retest_ready_reported" as const },
    { id: "data", observation: "observed_pass" as const, retest: "not_retested" as const, stage: "not_requested" as const }
  ];
  it("queues only prior failures on a real owner-reported Windows context", () => {
    const report = makeWindowsRetestFollowup("remote_windows_client", checks);
    expect(report.items).toHaveLength(2);
    expect(report.openFollowups).toBe(1);
    expect(report.reportedImprovementAwaitingWitness).toBe(1);
    expect(report.items.every(item => !item.verifiedEngineeringFix && !item.separatelyWitnessedWindowsAcceptance)).toBe(true);
    expect(report.ownerTestAuthorization).toBe("NOT_GIVEN");
  });
  it("ignores browser-only failures and does not accept even an improved Windows observation", () => {
    const other = makeWindowsRetestFollowup("other_browser_device", checks);
    expect(other.items).toHaveLength(0);
    expect(other.eligibleWindowsContext).toBe(false);
    const windows = makeWindowsRetestFollowup("windows_hub_server", checks);
    expect(windows.independentlyWitnessedAcceptance).toBe("NOT_VERIFIED");
    expect(windows.engineeringFixVerified).toBe(false);
    expect(windows.integration).toBe("DISCONNECTED / HOLD");
  });
});
