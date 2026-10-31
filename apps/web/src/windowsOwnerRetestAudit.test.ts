import { describe, expect, it } from "vitest";
import { makeWindowsOwnerRetestAudit, type WindowsRetestAuditItem } from "./windowsOwnerRetestAudit";

const initial: WindowsRetestAuditItem[] = [{ check: "resize", retest: "not_retested", ownerReportedFollowup: "engineering_review_requested" }];
const updated: WindowsRetestAuditItem[] = [{ check: "resize", retest: "owner_reports_improvement", ownerReportedFollowup: "owner_retest_ready_reported" }];

describe("Build 199 Windows owner follow-up change audit", () => {
  it("does not fabricate a baseline or record a non-Windows witness", () => {
    expect(makeWindowsOwnerRetestAudit("windows_hub_server", null, initial).auditStatus).toBe("OWNER_BASELINE_NOT_RECORDED");
    const other = makeWindowsOwnerRetestAudit("other_browser_device", initial, updated);
    expect(other.auditStatus).toBe("NOT_WINDOWS_ELIGIBLE");
    expect(other.transitions).toHaveLength(0);
    expect(other.independentWindowsWitness).toBe("NOT_VERIFIED");
  });
  it("compares only fixed failed-check statuses without treating improvement as acceptance", () => {
    const report = makeWindowsOwnerRetestAudit("remote_windows_client", initial, updated);
    expect(report.auditStatus).toBe("OWNER_RETEST_CHANGES_RECORDED_UNVERIFIED");
    expect(report.changedChecks).toBe(1);
    expect(report.reportedImprovementsStillUnwitnessed).toBe(1);
    expect(report.transitions[0].transition).toBe("OWNER_RETEST_OR_FOLLOWUP_CHANGED");
    expect(report.engineeringFixVerified).toBe(false);
    expect(report.backendAuditPersisted).toBe(false);
    expect(report.ownerTestAuthorization).toBe("NOT_GIVEN");
    expect(report.authenticatedGatewayGets).toBe(0);
  });
  it("does not claim a change when the owner repeats the same status", () => {
    const report = makeWindowsOwnerRetestAudit("windows_hub_server", initial, initial);
    expect(report.auditStatus).toBe("OWNER_RETEST_SNAPSHOT_UNCHANGED");
    expect(report.changedChecks).toBe(0);
  });
});
