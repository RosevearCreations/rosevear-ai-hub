type RecordObject = Record<string, unknown>;
function record(value: unknown): value is RecordObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
const STATES = ["HOLD_WRONG_HOST_OR_OS", "HOLD_EXISTING_LAUNCHER_MONITOR_POLICY",
  "HOLD_NO_SAFE_INSTALLED_RELEASE_POINTER", "HOLD_RECORDED_RELEASE_DIFFERS_FROM_BUILD304",
  "HOLD_POINTER_MATCH_NEEDS_INDEPENDENT_PROCESS_BINDING"];
export type MasterAcceptance305 = {
  installedRelease: {
    state: string;
    originalHostObserved: boolean;
    automationHostEnforced: boolean;
    recordedReleaseSha: string | null;
    recorded304Matches: boolean;
    durableHistoryState: string;
    durableSamples: number;
  };
  durableMonitoring: {
    collectionState: string;
    sampleCount: number;
    historyWindowDays: number;
    lastSampleAtUtc: string | null;
    services: { id: string; latestState: string; sampleCount: number;
      reachableSamples: number; observedAvailabilityPercent: number | null }[];
  };
  oneTest: string;
  commsAck: string;
};

/** Reject any claim of enrollment, actual installed-process proof or live transport. */
export function inspectMasterAcceptance305(input: unknown): MasterAcceptance305 | null {
  if (!record(input) || input.schema !== "rosevear.ai-hub.master360-acceptance-305.v1" ||
    input.sourceId !== "rosevear-ai-hub" || input.sourceBuild !== 305 ||
    input.controller !== "ai-data-platform" || input.controllerBuild !== 360 ||
    input.automationHost !== "REE_ORIGINAL_WINDOWS_ONLY" ||
    input.newWindowsScheduledTasks !== 0 || input.connection !== "HOLD" ||
    input.slaveGate !== "HOLD_NEXT_MASTER_INTEGRATION_STAGE" ||
    input.oneTest !== "HOLD_OWNER_APPROVED_PROTECTED_SOURCE_SIGNATURE_NOT_EXECUTED" ||
    input.commsAck !== "HOLD_INDEPENDENT_RECEIVER_SIGNATURE_NOT_VERIFIED" ||
    input.commsQl412 !== "HOLD_CONTRACT_NOT_YET_ON_COMMS_MAIN" ||
    !record(input.installedRelease) || !record(input.durableMonitoring)) return null;
  const rel = input.installedRelease;
  const m = input.durableMonitoring;
  if (rel.schema !== "rosevear.ai-hub.original-release-review-305.v1" ||
    rel.sourceId !== "rosevear-ai-hub" || rel.expectedHost !== "DESKTOP-AE894KC" ||
    !STATES.includes(String(rel.state)) ||
    typeof rel.originalHostObserved !== "boolean" ||
    typeof rel.automationHostEnforced !== "boolean" ||
    typeof rel.recorded304Matches !== "boolean" ||
    rel.installedProcessRevisionVerified !== false || rel.build305InstalledVerified !== false ||
    rel.independentReviewerVerified !== false || rel.newWindowsScheduledTasks !== 0 ||
    rel.existingLauncherChanged !== false || rel.existingRecoveryTaskChanged !== false ||
    rel.connection !== "HOLD" ||
    (rel.recordedReleaseSha !== null &&
     (typeof rel.recordedReleaseSha !== "string" || !/^[a-f0-9]{40}$/.test(rel.recordedReleaseSha))) ||
    !Number.isSafeInteger(rel.durableSamples) || Number(rel.durableSamples) < 0 ||
    !["OBSERVING_TWO_OR_MORE_LOCAL_SAMPLES", "HOLD_NOT_VERIFIED"].includes(String(rel.durableHistoryState))) return null;
  if (m.schema !== "rosevear.ai-hub.ree-durable-uptime.v1" ||
    m.sourceId !== "rosevear-ai-hub" || m.sourceRole !== "SOURCE" ||
    m.connection !== "HOLD" || m.historyWindowDays !== 7 ||
    m.newWindowsScheduledTasks !== 0 || !Number.isSafeInteger(m.sampleCount) ||
    Number(m.sampleCount) < 0 || Number(m.sampleCount) > 10080 ||
    !Array.isArray(m.services) || m.services.length > 3) return null;
  const seen = new Set<string>();
  for (const service of m.services) {
    if (!record(service) || !["hub_api", "hub_web", "caddy_proxy"].includes(String(service.id)) ||
      seen.has(String(service.id)) || service.check !== "LOOPBACK_TCP_ONLY" ||
      !["TCP_REACHABLE", "TCP_UNREACHABLE", "NOT_OBSERVED", "STALE"].includes(String(service.latestState)) ||
      !Number.isSafeInteger(service.sampleCount) || service.sampleCount !== m.sampleCount ||
      !Number.isSafeInteger(service.reachableSamples) || Number(service.reachableSamples) < 0 ||
      Number(service.reachableSamples) > Number(m.sampleCount)) return null;
    seen.add(String(service.id));
  }
  return input as MasterAcceptance305;
}
