import type { HubVersionResponse, ReleaseObservabilityResponse } from "./api";

export const INSTALLED_HUB_EVIDENCE_SCHEMA = "rosevear-installed-hub-field-adoption/v1" as const;
export const DRIFT_HANDOFF_SCHEMA = "rosevear-device-camera-field-recheck-drift-handoff/v1";
const shaPattern = /^[0-9a-f]{40}$/;
const runPattern = /^https:\/\/github\.com\/RosevearCreations\/rosevear-ai-hub\/actions\/runs\/([1-9][0-9]*)\/?$/;

// Vite stamps the source commit into the compiled browser assets. A stamp is
// not evidence that the installed Windows API is running that same commit.
declare const __HUB_WEB_BUILD_SHA__: string | null;
declare const __HUB_WEB_BUILD_CLEAN__: boolean;
export const browserBuild = {
  sha: typeof __HUB_WEB_BUILD_SHA__ === "string" && shaPattern.test(__HUB_WEB_BUILD_SHA__) ? __HUB_WEB_BUILD_SHA__ : null,
  clean: __HUB_WEB_BUILD_CLEAN__ === true,
};

export type PrivateFieldHandoff = {
  generated_at: string;
  source_worklist_at: string;
  source_ledger_generated_at: string;
  unresolved_ha: number;
  unresolved_camera: number;
};

type Input = {
  expectedMainSha: string;
  mainRunUrl: string;
  web: { sha: string | null; clean: boolean };
  api: HubVersionResponse | null;
  local: ReleaseObservabilityResponse | null;
  field: PrivateFieldHandoff | null;
  ownerOpenedWindowsHub: boolean;
  ownerReloadedBrowser: boolean;
};

const validTime = (value: unknown): value is string => typeof value === "string"
  && value.length <= 40 && !Number.isNaN(Date.parse(value));
const validCount = (value: unknown): value is number => Number.isInteger(value)
  && typeof value === "number" && value >= 0 && value <= 10000;

/** Only transfer counts and source timestamps, never device names or private paths. */
export function parsePrivateFieldHandoff(json: string): PrivateFieldHandoff {
  let raw: unknown;
  try { raw = JSON.parse(json); } catch { throw new Error("Field handoff is not valid JSON."); }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid Build 112 handoff.");
  const value = raw as Record<string, unknown>;
  const summary = value.summary;
  if (value.schema !== DRIFT_HANDOFF_SCHEMA || !summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new Error("Only a Build 112 private drift handoff can be adopted.");
  }
  const counts = summary as Record<string, unknown>;
  if (!validTime(value.generated_at) || !validTime(value.source_worklist_at)
    || !validTime(value.source_ledger_generated_at)
    || !validCount(counts.unresolved_ha) || !validCount(counts.unresolved_camera)) {
    throw new Error("Build 112 evidence lineage or summary is incomplete.");
  }
  if (Date.parse(value.generated_at) < Date.parse(value.source_ledger_generated_at)) {
    throw new Error("Field handoff predates its closure ledger.");
  }
  return {
    generated_at: value.generated_at,
    source_worklist_at: value.source_worklist_at,
    source_ledger_generated_at: value.source_ledger_generated_at,
    unresolved_ha: counts.unresolved_ha,
    unresolved_camera: counts.unresolved_camera,
  };
}

export function assessInstalledHub(input: Input) {
  const expected = input.expectedMainSha.trim().toLowerCase();
  const referenceValid = shaPattern.test(expected) && runPattern.test(input.mainRunUrl.trim());
  const webStatus = !input.web.sha ? "unknown" : !input.web.clean ? "unverified_local_changes"
    : !referenceValid ? "no_main_reference"
      : input.web.sha === expected ? "matches_reported_main" : "stale_or_other_build";
  const pointerStatus = !input.local || !input.local.active_release ? "not_recorded"
    : !referenceValid ? "no_main_reference"
      : input.local.active_release === expected ? "matches_reported_main" : "different_release_recorded";
  const holds: string[] = [];
  if (!referenceValid) holds.push("An exact official GitHub main SHA and run URL must be supplied and checked by the owner.");
  if (webStatus === "unknown") holds.push("Browser assets have no known source commit; rebuild from a Git checkout.");
  if (webStatus === "unverified_local_changes") holds.push("Browser assets were built from a checkout with tracked changes.");
  if (webStatus === "stale_or_other_build") holds.push("Browser assets do not match the entered main commit; reload or inspect the installed frontend.");
  if (pointerStatus === "not_recorded") holds.push("No installed release pointer is recorded on this Windows Hub.");
  if (pointerStatus === "different_release_recorded") holds.push("The locally recorded active release differs from the entered main commit.");
  if (!input.api) holds.push("The running backend did not return its package version.");
  if (!input.local) holds.push("The private local updater evidence could not be read.");
  if (!input.ownerOpenedWindowsHub) holds.push("Owner has not personally opened and checked the installed Windows Hub in this review.");
  if (!input.ownerReloadedBrowser) holds.push("Owner has not reloaded the installed browser/PWA in this review.");
  if (!input.field) holds.push("Build 112 private field handoff has not been imported on this installation.");
  // /version returns a Python package version, not a running-process commit.
  // Even if stamps and self-attestations agree, independent runtime proof is missing.
  holds.push("Running Windows process identity and actual devices/camera playback are not independently verified.");
  return {
    source_reference: referenceValid ? "owner_entered_not_independently_verified" as const : "missing_or_invalid" as const,
    web_status: webStatus,
    recorded_release_status: pointerStatus,
    backend_status: input.api ? "responding_package_version_only" as const : "unavailable" as const,
    field_status: input.field ? "private_handoff_imported_not_field_accepted" as const : "not_imported" as const,
    overall: "FIELD_ADOPTION_HOLD" as const,
    holds,
  };
}

/** Export only allowlisted versions, commit fingerprints, counts and owner check marks. */
export function createInstalledHubReceipt(input: Input, generatedAt = new Date().toISOString()) {
  if (!validTime(generatedAt)) throw new Error("Invalid evidence generation time.");
  const result = assessInstalledHub(input);
  return {
    schema: INSTALLED_HUB_EVIDENCE_SCHEMA,
    generated_at: generatedAt,
    result,
    expected_main: result.source_reference === "owner_entered_not_independently_verified"
      ? { sha: input.expectedMainSha.trim().toLowerCase(), actions_run_url: input.mainRunUrl.trim(), verification: "owner_reference_only" }
      : null,
    browser_assets: { source_sha: input.web.sha, tracked_checkout_clean: input.web.clean },
    backend: { package_version: input.api?.version ?? null, responded: Boolean(input.api) },
    local_release_pointer: { active_sha: input.local?.active_release ?? null, adoption_state: input.local?.adoption_state ?? "UNVERIFIED", installed_runtime_verified: false },
    owner_checks: { windows_hub_opened: input.ownerOpenedWindowsHub, installed_browser_reloaded: input.ownerReloadedBrowser },
    private_field_evidence: input.field,
    machine_acceptance: false,
    physical_camera_acceptance: false,
  };
}
