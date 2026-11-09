/** Build 285: sanitize a backend observation before any UI or report preview. */
export type WindowsServiceState = "RUNNING" | "STOPPED" | "NOT_REGISTERED" | "UNAVAILABLE" | "NOT_SAMPLED";
export type WindowsEvidenceState =
  | "LIVE_WINDOWS_SERVICE_SNAPSHOT" | "NOT_WINDOWS_HOST" | "STALE" | "CLOCK_CHECK"
  | "VERSION_MISMATCH" | "HEALTH_MISMATCH" | "INVALID_EVIDENCE";

export type WindowsServiceReview = Readonly<{ id: string; label: string; status: WindowsServiceState }>;
export type WindowsEvidenceReview = Readonly<{
  state: WindowsEvidenceState;
  sampledAtMs: number | null;
  platform: "WINDOWS" | "NOT_WINDOWS" | "UNKNOWN";
  backendVersion: string | null;
  backendHealthObserved: boolean;
  activeReleaseCandidate: string | null;
  services: readonly WindowsServiceReview[];
  installedBinaryVerified: false;
  machineIdentityVerified: false;
  independentWitnessVerified: false;
  reportAuthorized: false;
}>;

const SERVICES = [
  { id: "tailscale", label: "Tailscale" },
  { id: "mosquitto", label: "Mosquitto" },
  { id: "caddy", label: "Caddy" },
  { id: "ollama", label: "Ollama" },
] as const;
const STATES = new Set<WindowsServiceState>(["RUNNING", "STOPPED", "NOT_REGISTERED", "UNAVAILABLE", "NOT_SAMPLED"]);
const FRESH_MS = 5 * 60 * 1000;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function safeVersion(value: unknown): string | null {
  return typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9.+_-]{0,31}$/.test(value) ? value : null;
}

function safeTime(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value)) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function reviewWindowsRuntimeEvidence(raw: unknown, versionRaw: unknown, healthRaw: unknown, nowMs: number): WindowsEvidenceReview {
  const value = asRecord(raw);
  const runtime = asRecord(value?.api_process);
  const version = asRecord(versionRaw);
  const health = asRecord(healthRaw);
  const backendVersion = safeVersion(runtime?.package_version);
  const endpointVersion = safeVersion(version?.version);
  const sampledAtMs = safeTime(value?.observed_at_utc);
  const platform = value?.host_platform === "WINDOWS" || value?.host_platform === "NOT_WINDOWS" ? value.host_platform : "UNKNOWN";
  const sha = value?.recorded_active_release_sha;
  const activeReleaseCandidate = typeof sha === "string" && /^[0-9a-f]{40}$/.test(sha) ? sha : null;
  const releasePointerValid = (sha === null && value?.recorded_release_basis === "NOT_RECORDED") ||
    (activeReleaseCandidate !== null && value?.recorded_release_basis === "UNVERIFIED_LOCAL_POINTER");
  const discovered = Array.isArray(value?.services) ? value.services : [];
  const services = SERVICES.map(service => {
    const entry = discovered.find(item => asRecord(item)?.id === service.id);
    const record = asRecord(entry);
    const rawStatus = record?.status;
    const status: WindowsServiceState = typeof rawStatus === "string" && STATES.has(rawStatus as WindowsServiceState)
      ? rawStatus as WindowsServiceState : "UNAVAILABLE";
    return { ...service, status: platform !== "WINDOWS" ? "NOT_SAMPLED" as const
      : record?.evidence === "SCM_READ_ONLY" && status !== "NOT_SAMPLED" ? status : "UNAVAILABLE" as const };
  });

  let state: WindowsEvidenceState = "INVALID_EVIDENCE";
  if (value?.schema === "rosevear.ai-hub.windows-runtime-evidence.v1" &&
      value.source === "RESPONDING_BACKEND_ONLY" && runtime?.state === "RESPONDED" &&
      value.installed_binary_verified === false && value.windows_device_identity_verified === false &&
      value.independent_witness_verified === false && value.master_shell_reporting_authorized === false &&
      value.made_changes === false && value.external_requests === 0 &&
      releasePointerValid &&
      backendVersion && endpointVersion && sampledAtMs !== null && Number.isSafeInteger(nowMs) &&
      platform !== "UNKNOWN") {
    if (Math.abs(sampledAtMs - nowMs) > FRESH_MS && sampledAtMs > nowMs) state = "CLOCK_CHECK";
    else if (nowMs - sampledAtMs > FRESH_MS) state = "STALE";
    else if (backendVersion !== endpointVersion) state = "VERSION_MISMATCH";
    else if (health?.status !== "ok" || typeof version?.service !== "string" ||
      typeof version.environment !== "string" || health.service !== version.service ||
      health.environment !== version.environment) state = "HEALTH_MISMATCH";
    else state = platform === "WINDOWS" ? "LIVE_WINDOWS_SERVICE_SNAPSHOT" : "NOT_WINDOWS_HOST";
  }
  return {
    state, sampledAtMs, platform, backendVersion, backendHealthObserved: state === "LIVE_WINDOWS_SERVICE_SNAPSHOT" || state === "NOT_WINDOWS_HOST",
    activeReleaseCandidate: state === "INVALID_EVIDENCE" ? null : activeReleaseCandidate,
    services: state === "INVALID_EVIDENCE" ? services.map(service => ({ ...service, status: "UNAVAILABLE" as const })) : services,
    installedBinaryVerified: false, machineIdentityVerified: false,
    independentWitnessVerified: false, reportAuthorized: false,
  };
}

export function windowsEvidenceCandidatePreview(review: WindowsEvidenceReview) {
  return {
    schema: "rosevear.ai-hub.windows-field-candidate.v0",
    sourceId: "rosevear-ai-hub",
    status: "LOCAL_PREVIEW_NOT_SENT",
    observationState: review.state,
    platform: review.platform,
    backendVersion: review.backendVersion,
    backendHealthObserved: review.backendHealthObserved,
    recordedReleaseCandidate: review.activeReleaseCandidate,
    services: review.services.map(service => ({ id: service.id, state: service.status })),
    installedBinaryVerified: false,
    machineIdentityVerified: false,
    independentlyWitnessed: false,
    reportingAuthorized: false,
    masterShellPreflight: "HOLD_INDEPENDENT_MACHINE_IDENTITY_AND_REPORTING_CONTRACT",
  } as const;
}
