/** Exact installed-versus-browser release comparison; never equate package version with SHA. */
export const HUB_UPDATE_RELOAD_KEY = "rosevear-last-auto-refreshed-release-v1";
const sha = /^[0-9a-f]{40}$/;

export function shouldReloadHub(
  browserSha: string | null,
  activeSha: string | null,
  adoption: string,
  previousReloaded: string | null,
): boolean {
  return browserSha !== null && sha.test(browserSha)
    && activeSha !== null && sha.test(activeSha)
    && browserSha !== activeSha
    && activeSha !== previousReloaded
    && (adoption === "ADOPTED" || adoption === "CURRENT");
}

export function hubUpdateBlockerLabel(code: string): string {
  const labels: Record<string, string> = {
    windows_host_required: "Updates can run only on the actual Windows Hub.",
    release_task_not_enrolled: "The Windows Release Adoption task needs one-time supervised enrollment.",
    recovery_task_not_verified: "The existing Windows Recovery task must be healthy and verified.",
    first_supervised_activation_required: "A safe baseline and first supervised activation have not been established.",
    backup_key_not_provisioned: "The encrypted backup key and restore rehearsal must be set up locally.",
    release_controller_missing: "The approved local release controller is not installed.",
    incomplete_activation_requires_recovery: "An interrupted activation must recover before another update.",
    previous_failure_requires_owner_review: "The previous failure or rollback must be reviewed before retry.",
  };
  return labels[code] ?? "A local setup or safety gate requires review.";
}

/** Instructions are intentionally informational: a browser cannot enroll Windows tasks. */
export function hubUpdateNextStep(blockers: string[], adoption: string): string {
  if (adoption === "FAILED" || adoption === "ROLLBACK_FAILED")
    return "Stop here. Review the local release journal and restore the known-good Hub before requesting another update. Do not retry a failed release blindly.";
  if (blockers.includes("incomplete_activation_requires_recovery"))
    return "Use the existing Windows Recovery task and inspect the activation journal on the Hub PC. Verify a healthy previous release before retrying.";
  if (blockers.includes("release_task_not_enrolled") || blockers.includes("first_supervised_activation_required") || blockers.includes("release_controller_missing"))
    return "On the Windows Hub PC, complete the one-time supervised release-slot bootstrap in docs/WINDOWS_RELEASE_SLOTS.md. Keep the original services and rollback slot intact; return here after verification.";
  if (blockers.includes("backup_key_not_provisioned") || blockers.includes("recovery_task_not_verified"))
    return "On the Windows Hub PC, verify the encrypted backup, restore rehearsal and existing Recovery task with the local operator. Do not start an update until those checks pass.";
  if (blockers.includes("windows_host_required"))
    return "Open the Hub locally on its Windows host as the authenticated owner. Remote browsers can inspect status but cannot start Windows tasks.";
  if (blockers.includes("previous_failure_requires_owner_review"))
    return "Review the failed release receipt and rollback evidence with the owner before approving any new attempt.";
  if (blockers.length) return "Review the local release-control status and operator runbook before continuing. Unknown blockers are not safe to bypass.";
  return "The enrolled task is ready for a supervised owner request. Installation is confirmed only after the managed release changes and local health checks pass.";
}
