import type { HubUpdateControl, HubVersionResponse } from "./api";

const exactSha = /^[a-f0-9]{40}$/;

export type FirstActivationChecks = {
  backupRestored: boolean;
  migrationSucceeded: boolean;
  backendRestarted: boolean;
  clientReloaded: boolean;
  darkModeVisible: boolean;
  restartButtonVisible: boolean;
};

export function assessFirstActivation246(
  targetSha: string,
  browserSha: string | null,
  release: HubUpdateControl | null,
  backend: HubVersionResponse | null,
  checks: FirstActivationChecks,
) {
  const target = targetSha.trim().toLowerCase();
  const referenceValid = exactSha.test(target);
  const browserAligned = referenceValid && browserSha === target;
  const pointerAligned = referenceValid && release?.active_release === target;
  const failed = release?.adoption_state === "FAILED" || release?.adoption_state === "ROLLBACK_FAILED";
  const holds: string[] = [];
  if (!referenceValid) holds.push("Enter the exact successful main commit from GitHub.");
  if (!browserAligned) holds.push("The installed browser assets do not match the approved release commit.");
  if (!pointerAligned) holds.push("The local managed release pointer has not confirmed that commit.");
  if (!backend) holds.push("The local backend version endpoint has not responded.");
  if (!checks.backupRestored) holds.push("A restored backup rehearsal has not been recorded by the owner.");
  if (!checks.migrationSucceeded) holds.push("The owner has not recorded a successful database migration.");
  if (!checks.backendRestarted) holds.push("Backend restart and health have not been observed on Windows.");
  if (!checks.clientReloaded || !checks.darkModeVisible || !checks.restartButtonVisible)
    holds.push("Post-restart client, Dark Mode and Restart Client button still need visual acceptance.");
  if (failed) holds.unshift("Release adoption failed; use the retained recovery procedure before retrying.");
  // Even a matching local self-report cannot independently prove process identity or device health.
  holds.push("Independent Windows process identity and device/camera acceptance remain outstanding.");
  return {
    state: failed ? "RECOVERY_REVIEW_REQUIRED" : "FIELD_ACCEPTANCE_HOLD",
    source_alignment: browserAligned && pointerAligned ? "REPORTED_MATCH" : "NOT_VERIFIED",
    checks_recorded: Object.values(checks).filter(Boolean).length,
    holds,
    authoritative: false,
    machine_verified: false,
  } as const;
}
