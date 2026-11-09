/** Build 286: treat local launcher output as candidate observations only. */
export type LauncherState = "CANDIDATES_MATCH_UNVERIFIED" | "CANDIDATES_DIFFER" |
  "MISSING_CANDIDATE" | "INSPECTOR_UNAVAILABLE" | "NOT_WINDOWS" |
  "STALE" | "CLOCK_CHECK" | "INVALID_EVIDENCE";
type Chain = "unavailable" | "listener_changed_or_ambiguous" | "partial_or_complete" | "process_unavailable" | "probe_failed";
type Listener = "observed" | "missing" | "ambiguous" | "process_unavailable" | "changed_during_observation" | "probe_failed";
export type Launcher = Readonly<{
  listener: Listener;
  chainStatus: Chain;
  ancestorKinds: readonly string[];
  recoveryScriptMentioned: boolean;
  processPredatesCheckoutCommit: boolean | null;
  launchSource: "unknown" | "recovery_script_mention_unverified";
}>;
export type LauncherReview = Readonly<{
  state: LauncherState;
  sampledAtMs: number | null;
  recordedSha: string | null;
  checkoutSha: string | null;
  startupTask: string;
  web: Launcher | null;
  backend: Launcher | null;
  installedReleaseVerified: false;
  independentlyWitnessed: false;
  reportingAuthorized: false;
}>;
const COMPARISONS = new Set(["CANDIDATES_MATCH", "CANDIDATES_DIFFER", "MISSING_CANDIDATE", "INSPECTOR_UNAVAILABLE", "NOT_WINDOWS"]);
const LISTENERS = new Set(["observed", "missing", "ambiguous", "process_unavailable", "changed_during_observation", "probe_failed"]);
const CHAINS = new Set(["unavailable", "listener_changed_or_ambiguous", "partial_or_complete", "process_unavailable", "probe_failed"]);
const KINDS = new Set(["node", "python", "powershell", "cmd", "explorer", "other"]);
const STARTUP = new Set(["enabled", "disabled", "unknown", "missing_or_unavailable", "NOT_SAMPLED"]);
const FRESH_MS = 5 * 60_000;

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function sha(value: unknown): string | null {
  return typeof value === "string" && /^[a-f0-9]{40}$/.test(value) ? value : null;
}
function time(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value)) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function launcher(value: unknown): Launcher | null {
  const data = record(value);
  if (!data) return null;
  const kinds = data.ancestor_kinds;
  if (!LISTENERS.has(data.listener as string) || !CHAINS.has(data.chain_status as string) ||
      !Array.isArray(kinds) || kinds.length > 6 || !kinds.every(kind => KINDS.has(kind)) ||
      !Number.isInteger(data.chain_hops_inspected) || data.chain_hops_inspected !== kinds.length ||
      typeof data.recovery_script_mentioned !== "boolean" ||
      data.process_predates_checkout_commit !== null && typeof data.process_predates_checkout_commit !== "boolean" ||
      !["unknown", "recovery_script_mention_unverified"].includes(data.launch_source as string)) return null;
  return {
    listener: data.listener as Listener, chainStatus: data.chain_status as Chain,
    ancestorKinds: kinds as string[], recoveryScriptMentioned: data.recovery_script_mentioned as boolean,
    processPredatesCheckoutCommit: data.process_predates_checkout_commit as boolean | null,
    launchSource: data.launch_source as Launcher["launchSource"],
  };
}

export function reviewWindowsLauncherEvidence(raw: unknown, nowMs: number): LauncherReview {
  const value = record(raw);
  const recordedSha = sha(value?.recorded_release_sha_candidate);
  const checkoutSha = sha(value?.checkout_sha_candidate);
  const sampledAtMs = time(value?.observed_at_utc);
  const inspectorAtMs = value?.inspector_observed_at_utc === null ? null : time(value?.inspector_observed_at_utc);
  const web = launcher(value?.web_launcher);
  const backend = launcher(value?.backend_launcher);
  const comparison = value?.candidate_comparison;
  const platform = value?.host_platform;
  const isObserved = comparison === "CANDIDATES_MATCH" || comparison === "CANDIDATES_DIFFER" || comparison === "MISSING_CANDIDATE";
  const valid = value?.schema === "rosevear.ai-hub.windows-launcher-evidence.v1" &&
    value.source === "LOCAL_READ_ONLY_INSPECTOR_259" &&
    (platform === "WINDOWS" || platform === "NOT_WINDOWS") &&
    COMPARISONS.has(comparison as string) && STARTUP.has(value?.startup_task_state as string) &&
    value.installed_release_verified === false && value.original_device_verified === false &&
    value.independent_witness_verified === false && value.master_shell_reporting_authorized === false &&
    value.made_changes === false && value.external_requests === 0 &&
    (value.recorded_release_sha_candidate === null || recordedSha !== null) &&
    (value.checkout_sha_candidate === null || checkoutSha !== null) &&
    sampledAtMs !== null && Number.isSafeInteger(nowMs) &&
    (isObserved ? platform === "WINDOWS" && web !== null && backend !== null && inspectorAtMs !== null :
      web === null && backend === null && checkoutSha === null && inspectorAtMs === null &&
      ((comparison === "NOT_WINDOWS" && platform === "NOT_WINDOWS") ||
       (comparison === "INSPECTOR_UNAVAILABLE" && platform === "WINDOWS"))) &&
    (!isObserved || (comparison === "CANDIDATES_MATCH" && recordedSha && recordedSha === checkoutSha ||
      comparison === "CANDIDATES_DIFFER" && recordedSha && checkoutSha && recordedSha !== checkoutSha ||
      comparison === "MISSING_CANDIDATE" && (!recordedSha || !checkoutSha)));
  let state: LauncherState = "INVALID_EVIDENCE";
  if (valid) {
    if ((sampledAtMs as number) > nowMs + FRESH_MS || inspectorAtMs !== null && inspectorAtMs > nowMs + FRESH_MS) state = "CLOCK_CHECK";
    else if (nowMs - (sampledAtMs as number) > FRESH_MS || inspectorAtMs !== null && nowMs - inspectorAtMs > FRESH_MS) state = "STALE";
    else state = comparison === "CANDIDATES_MATCH" ? "CANDIDATES_MATCH_UNVERIFIED" : comparison as LauncherState;
  }
  return {
    state, sampledAtMs: valid ? sampledAtMs : null,
    recordedSha: valid ? recordedSha : null, checkoutSha: valid ? checkoutSha : null,
    startupTask: valid ? value?.startup_task_state as string : "NOT_SAMPLED",
    web: valid ? web : null, backend: valid ? backend : null,
    installedReleaseVerified: false, independentlyWitnessed: false, reportingAuthorized: false,
  };
}

export function launcherCandidatePreview(review: LauncherReview, ownerReviewed: boolean) {
  return {
    schema: "rosevear.ai-hub.launcher-candidate.v0", appId: "rosevear-ai-hub",
    status: "LOCAL_PREVIEW_NOT_SENT", observationState: review.state,
    recordedReleaseCandidate: review.recordedSha, checkoutCandidate: review.checkoutSha,
    web: review.web, backend: review.backend, startupTaskState: review.startupTask,
    ownerSelfReviewInThisSession: ownerReviewed,
    installedReleaseVerified: false, independentlyWitnessed: false,
    reportingAuthorized: false, decision: "HOLD_ORIGINAL_MACHINE_AND_SIGNED_PROCESS_PROOF",
  } as const;
}
