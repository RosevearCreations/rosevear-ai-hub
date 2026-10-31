import type { DeviceContext, RetestOutcome } from "./windowsThemeRetest";
import type { FollowupStage } from "./windowsRetestFollowup";

export type WindowsRetestAuditItem = { check: string; retest: RetestOutcome; ownerReportedFollowup: FollowupStage };

/** Session-local owner-change comparison; this is neither a persistent audit log nor a Windows witness. */
export function makeWindowsOwnerRetestAudit(
  context: DeviceContext,
  baseline: ReadonlyArray<WindowsRetestAuditItem> | null,
  current: ReadonlyArray<WindowsRetestAuditItem>
) {
  const windows = context === "windows_hub_server" || context === "remote_windows_client";
  const captured = windows && baseline !== null;
  const before = new Map((captured ? baseline : []).map(item => [item.check, item]));
  const after = new Map((windows ? current : []).map(item => [item.check, item]));
  const keys = [...new Set([...before.keys(), ...after.keys()])].sort();
  const changes = captured ? keys.map(check => {
    const older = before.get(check);
    const newer = after.get(check);
    const transition = !older ? "NEW_OWNER_REPORTED_FAILURE" : !newer ? "ORIGINAL_FINDING_CHANGED_RECHECK_REQUIRED" :
      older.retest === newer.retest && older.ownerReportedFollowup === newer.ownerReportedFollowup ? "UNCHANGED" :
        "OWNER_RETEST_OR_FOLLOWUP_CHANGED";
    return { check, previousRetest: older?.retest ?? "not_retested", currentRetest: newer?.retest ?? "not_retested",
      previousFollowup: older?.ownerReportedFollowup ?? "not_requested",
      currentFollowup: newer?.ownerReportedFollowup ?? "not_requested", transition,
      independentlyWitnessed: false };
  }) : [];
  return {
    schema: "rosevear.build199.windows-owner-retest-change-audit.v1",
    context,
    baselineCapturedInThisBrowserSession: captured,
    comparedFailures: changes.length,
    changedChecks: changes.filter(change => change.transition !== "UNCHANGED").length,
    reportedImprovementsStillUnwitnessed: changes.filter(change => change.currentRetest === "owner_reports_improvement").length,
    transitions: changes,
    auditStatus: !windows ? "NOT_WINDOWS_ELIGIBLE" : !captured ? "OWNER_BASELINE_NOT_RECORDED" :
      changes.length === 0 ? "NO_FAILED_CHECKS_IN_SNAPSHOT" :
        changes.some(change => change.transition !== "UNCHANGED") ? "OWNER_RETEST_CHANGES_RECORDED_UNVERIFIED" : "OWNER_RETEST_SNAPSHOT_UNCHANGED",
    originalSignedOwnerAcceptance: "NOT_RECEIVED",
    physicalWindowsInstallationVerified: false,
    engineeringFixVerified: false,
    independentWindowsWitness: "NOT_VERIFIED",
    backendAuditPersisted: false,
    ownerTestAuthorization: "NOT_GIVEN",
    authenticatedGatewayGets: 0,
    integration: "DISCONNECTED / HOLD"
  } as const;
}
