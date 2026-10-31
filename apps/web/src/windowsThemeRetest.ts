/** A local owner's *reported* Windows visual retest, never physical acceptance. */
export type RetestOutcome = "not_retested" | "issue_persists" | "owner_reports_improvement";
export type OriginalObservation = "not_checked" | "observed_pass" | "observed_fail";
export type DeviceContext = "not_checked" | "windows_hub_server" | "remote_windows_client" | "other_browser_device";

export function makeWindowsThemeRetestDisposition(
  context: DeviceContext,
  checks: ReadonlyArray<{ id: string; observation: OriginalObservation; retest: RetestOutcome }>
) {
  const windowsContext = context === "windows_hub_server" || context === "remote_windows_client";
  const failed = checks.filter(check => check.observation === "observed_fail");
  const incomplete = failed.filter(check => check.retest === "not_retested").length;
  const persistent = failed.filter(check => check.retest === "issue_persists").length;
  const improved = failed.filter(check => check.retest === "owner_reports_improvement").length;
  const outcome = !windowsContext ? "WINDOWS_RETEST_NOT_ELIGIBLE_OR_NOT_RECORDED" :
    failed.length === 0 ? "NO_PRIOR_FAILED_WINDOWS_OBSERVATIONS" :
      incomplete > 0 ? "WINDOWS_RETEST_PENDING" :
        persistent > 0 ? "OWNER_REPORTS_WINDOWS_ISSUES_PERSIST" :
          "OWNER_REPORTS_IMPROVEMENT_UNVERIFIED";
  return {
    schema: "rosevear.build197.windows-theme-owner-retest.v1",
    context,
    failedOriginalChecks: failed.length,
    retestsPending: incomplete,
    retestsWithPersistentIssues: persistent,
    retestsWithReportedImprovement: improved,
    outcome,
    observations: failed.map(check => ({ check: check.id, retest: windowsContext ? check.retest : "not_retested" })),
    engineeringFixVerified: false,
    independentWindowsWitness: "NOT_VERIFIED",
    deviceInstallationVerified: false,
    ownerReportedOnly: true,
    integrationTestAuthorization: "NOT_GIVEN",
    authenticatedGatewayGets: 0,
    integration: "DISCONNECTED / HOLD"
  } as const;
}
