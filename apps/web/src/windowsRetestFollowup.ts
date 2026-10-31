import type { DeviceContext, OriginalObservation, RetestOutcome } from "./windowsThemeRetest";

export type FollowupStage = "not_requested" | "engineering_review_requested" | "owner_retest_ready_reported";

/** Owner-side engineering follow-up notes only. No ticket, fix, witness or acceptance is created. */
export function makeWindowsRetestFollowup(
  context: DeviceContext,
  checks: ReadonlyArray<{ id: string; observation: OriginalObservation; retest: RetestOutcome; stage: FollowupStage }>
) {
  const windows = context === "windows_hub_server" || context === "remote_windows_client";
  const failed = windows ? checks.filter(check => check.observation === "observed_fail") : [];
  const items = failed.map(check => ({
    check: check.id,
    retest: check.retest,
    ownerReportedFollowup: check.stage,
    verifiedEngineeringFix: false,
    separatelyWitnessedWindowsAcceptance: false,
    disposition: check.retest === "issue_persists" ? "ISSUE_STILL_OPEN" :
      check.retest === "not_retested" ? "OWNER_RETEST_REQUIRED" : "IMPROVEMENT_REPORTED_NOT_ACCEPTED"
  }));
  return {
    schema: "rosevear.build198.windows-retest-followup.v1",
    context,
    eligibleWindowsContext: windows,
    items,
    openFollowups: items.filter(item => item.disposition !== "IMPROVEMENT_REPORTED_NOT_ACCEPTED").length,
    reportedImprovementAwaitingWitness: items.filter(item => item.disposition === "IMPROVEMENT_REPORTED_NOT_ACCEPTED").length,
    physicalWindowsDeviceVerified: false,
    engineeringFixVerified: false,
    independentlyWitnessedAcceptance: "NOT_VERIFIED",
    ownerReportSavedToBackend: false,
    ownerTestAuthorization: "NOT_GIVEN",
    authenticatedGatewayGets: 0,
    integration: "DISCONNECTED / HOLD"
  } as const;
}
