import type { HubVersionResponse, ReleaseObservabilityResponse } from "./api";
import type { LauncherReview } from "./windowsLauncherEvidence286";
import type { WindowsEvidenceReview } from "./windowsRuntimeEvidence285";

/** Candidate convergence is an operator aid, NEVER independent installed-process proof. */
export type CandidateAxis290 = Readonly<{
  id: "browser" | "updater" | "runtime" | "launcher_record" | "checkout";
  label: string;
  sha: string | null;
  state: "MATCHES_OWNER_REFERENCE" | "DIFFERS_FROM_OWNER_REFERENCE" |
    "MISSING_CANDIDATE" | "REFERENCE_REQUIRED" | "OBSERVATION_HELD";
}>;

export type WindowsAdoptionReview290 = Readonly<{
  disposition: "HOLD_MISSING_OR_STALE_EVIDENCE" | "REPORTED_DRIFT_NEEDS_REVIEW" |
    "HOLD_INCOMPLETE_CANDIDATES" | "REPORTED_CANDIDATES_CONVERGE_UNVERIFIED";
  referenceState: "OWNER_ENTERED_UNVERIFIED" | "MISSING_OR_INVALID";
  axes: readonly CandidateAxis290[];
  matchCount: number;
  backendVersion: string | null;
  backendVersionState: "REPORTED_VERSIONS_AGREE" | "VERSION_DISAGREEMENT" | "NOT_COMPARABLE";
  runtimeState: string;
  launcherState: string;
  blockers: readonly string[];
  trustedInstalledRelease: false;
  signedReceiptVerified: false;
  masterShellAuthorized: false;
}>;

const SHA40 = /^[a-f0-9]{40}$/;
const RUN_URL = /^https:\/\/github\.com\/RosevearCreations\/rosevear-ai-hub\/actions\/runs\/[1-9][0-9]*\/?$/;
const VERSION = /^[a-zA-Z0-9][a-zA-Z0-9.+_-]{0,31}$/;
const FIVE_MIN = 5 * 60_000;

function candidate(value: unknown): string | null {
  return typeof value === "string" && SHA40.test(value) ? value : null;
}

function version(value: unknown): string | null {
  return typeof value === "string" && VERSION.test(value) ? value : null;
}

function fresh(value: number | null | undefined, nowMs: number): boolean {
  return Number.isSafeInteger(value) && Number.isSafeInteger(nowMs) &&
    (value as number) <= nowMs + 60_000 && nowMs - (value as number) <= FIVE_MIN;
}

export type WindowsAdoptionInput290 = Readonly<{
  expectedMainSha: string; mainRunUrl: string;
  web: { sha: string | null; clean: boolean };
  adoption: { backend: HubVersionResponse | null; local: ReleaseObservabilityResponse | null;
    checkedAtMs: number } | null;
  runtime: WindowsEvidenceReview | null;
  launcher: LauncherReview | null;
  nowMs: number;
}>;

export const SIGNED_RECEIPT_GATES_290 = [
  "Original Windows host and installed executable independently identified",
  "Approved issuer public key enrolled and fingerprint matched to the original source",
  "Signed owner consent bound to the exact device, purpose and evidence digest",
  "Independent witness authority and fresh witness decision established",
  "Canonical signed receipt schema, algorithm, payload bytes and signature verified",
  "Replay, expiry, source sequence, audience and idempotency controls verified",
  "Approved signed webhook and AI Data Platform source registry acceptance recorded",
] as const;

/** Fail closed on missing, stale, malformed or disagreeing source observations. */
export function assessWindowsFieldAdoption290(input: WindowsAdoptionInput290): WindowsAdoptionReview290 {
  const expected = input.expectedMainSha.trim().toLowerCase();
  const referenceValid = SHA40.test(expected) && RUN_URL.test(input.mainRunUrl.trim());
  const adoptionFresh = input.adoption !== null && fresh(input.adoption.checkedAtMs, input.nowMs);
  const runtimeFresh = input.runtime?.state === "LIVE_WINDOWS_SERVICE_SNAPSHOT" &&
    fresh(input.runtime.sampledAtMs, input.nowMs) && input.runtime.platform === "WINDOWS";
  const launcherFresh = !!input.launcher && ["CANDIDATES_MATCH_UNVERIFIED", "CANDIDATES_DIFFER", "MISSING_CANDIDATE"]
    .includes(input.launcher.state) &&
    fresh(input.launcher.sampledAtMs, input.nowMs);
  const chainsObserved = input.launcher?.state === "CANDIDATES_MATCH_UNVERIFIED" && launcherFresh &&
    [input.launcher?.web, input.launcher?.backend].every(chain =>
    chain?.listener === "observed" && chain.chainStatus === "partial_or_complete" &&
    chain.processPredatesCheckoutCommit !== true);
  const sources = [
    { id: "browser", label: "Compiled browser asset", value: input.web.sha,
      available: input.web.clean },
    { id: "updater", label: "Recorded local updater release", value: input.adoption?.local?.active_release,
      available: adoptionFresh },
    { id: "runtime", label: "Responding Windows runtime release pointer", value: input.runtime?.activeReleaseCandidate,
      available: runtimeFresh },
    { id: "launcher_record", label: "Windows launcher release pointer", value: input.launcher?.recordedSha,
      available: launcherFresh },
    { id: "checkout", label: "Windows launcher checkout candidate", value: input.launcher?.checkoutSha,
      available: launcherFresh },
  ] as const;
  const axes: CandidateAxis290[] = sources.map(source => {
    const sha = candidate(source.value);
    return { id: source.id, label: source.label, sha,
      state: !referenceValid ? "REFERENCE_REQUIRED" : !source.available ? "OBSERVATION_HELD" :
        sha === null ? "MISSING_CANDIDATE" : sha === expected ?
          "MATCHES_OWNER_REFERENCE" : "DIFFERS_FROM_OWNER_REFERENCE" };
  });
  const localVersion = version(input.adoption?.backend?.version);
  const runtimeVersion = version(input.runtime?.backendVersion);
  const backendVersionState = !adoptionFresh || !runtimeFresh || !localVersion || !runtimeVersion ?
    "NOT_COMPARABLE" : localVersion === runtimeVersion ? "REPORTED_VERSIONS_AGREE" : "VERSION_DISAGREEMENT";
  const blockers: string[] = [];
  if (!referenceValid) blockers.push("Enter the exact protected main SHA and its successful GitHub Actions run URL; these remain owner-entered references.");
  if (!adoptionFresh) blockers.push("Refresh the Build 113 updater and package-version observation on the intended Windows host.");
  if (!runtimeFresh) blockers.push("Refresh the Build 285 Windows runtime /version and /health readback; it is missing, invalid, stale or not Windows.");
  if (!launcherFresh) blockers.push("Refresh Build 286 launcher evidence; two matching candidates alone remain unverified.");
  if (launcherFresh && input.launcher?.state !== "CANDIDATES_MATCH_UNVERIFIED") blockers.push("The original Windows launcher inspector reports differing or missing release candidates.");
  if (launcherFresh && !chainsObserved) blockers.push("The responding web/backend listeners or their launcher ancestry are incomplete or may predate checkout.");
  if (!input.web.clean) blockers.push("Browser asset provenance is not from a confirmed clean build.");
  if (axes.some(axis => axis.state === "DIFFERS_FROM_OWNER_REFERENCE")) blockers.push("One or more reported SHA candidates differ; inspect original updater records and launchers before any supervised update decision.");
  if (axes.some(axis => axis.state === "MISSING_CANDIDATE")) blockers.push("At least one release or checkout candidate is missing or malformed.");
  if (backendVersionState === "VERSION_DISAGREEMENT") blockers.push("Build 113 and Build 285 backend package versions disagree. Recheck the proxy and responding process.");
  if (backendVersionState === "NOT_COMPARABLE") blockers.push("Backend package version agreement is unavailable; a package version never identifies a Git commit.");
  if (input.adoption?.local?.adoption_state === "FAILED" || input.adoption?.local?.adoption_state === "ROLLBACK_FAILED")
    blockers.push("The local updater reports failure; stop and inspect the existing supervised rollback procedure.");
  const missingOrStale = !referenceValid || !adoptionFresh || !runtimeFresh || !launcherFresh;
  const drift = axes.some(axis => axis.state === "DIFFERS_FROM_OWNER_REFERENCE") ||
    (launcherFresh && input.launcher?.state !== "CANDIDATES_MATCH_UNVERIFIED") ||
    backendVersionState === "VERSION_DISAGREEMENT" ||
    input.adoption?.local?.adoption_state === "FAILED" || input.adoption?.local?.adoption_state === "ROLLBACK_FAILED";
  const allMatch = chainsObserved && axes.every(axis => axis.state === "MATCHES_OWNER_REFERENCE") &&
    backendVersionState === "REPORTED_VERSIONS_AGREE";
  blockers.push("Original Windows machine identity, loaded executable provenance and independent signed receipt are still unverified.");
  return {
    disposition: missingOrStale ? "HOLD_MISSING_OR_STALE_EVIDENCE" : drift ? "REPORTED_DRIFT_NEEDS_REVIEW" :
      allMatch ? "REPORTED_CANDIDATES_CONVERGE_UNVERIFIED" : "HOLD_INCOMPLETE_CANDIDATES",
    referenceState: referenceValid ? "OWNER_ENTERED_UNVERIFIED" : "MISSING_OR_INVALID",
    axes, matchCount: axes.filter(axis => axis.state === "MATCHES_OWNER_REFERENCE").length,
    backendVersion: runtimeVersion, backendVersionState,
    runtimeState: input.runtime?.state ?? "NOT_SAMPLED",
    launcherState: input.launcher?.state ?? "NOT_SAMPLED", blockers,
    trustedInstalledRelease: false, signedReceiptVerified: false, masterShellAuthorized: false,
  };
}
