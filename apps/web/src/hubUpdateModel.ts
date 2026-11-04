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
