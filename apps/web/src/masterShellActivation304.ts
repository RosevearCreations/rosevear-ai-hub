type State304 = "HOLD_NOT_ORIGINAL_REE_HOST" | "HOLD_AUTOMATION_HOST_POLICY_NOT_ENFORCED" |
  "HOLD_DURABLE_STORAGE_NOT_CONFIGURED" | "HOLD_DURABLE_STORAGE_UNAVAILABLE" |
  "STALE_OR_NOT_YET_OBSERVED" | "OBSERVING_REE_LOCAL";
type ServiceState304 = "NOT_OBSERVED" | "STALE" | "TCP_REACHABLE" | "TCP_UNREACHABLE";
const STATES: State304[] = ["HOLD_NOT_ORIGINAL_REE_HOST", "HOLD_AUTOMATION_HOST_POLICY_NOT_ENFORCED",
  "HOLD_DURABLE_STORAGE_NOT_CONFIGURED", "HOLD_DURABLE_STORAGE_UNAVAILABLE",
  "STALE_OR_NOT_YET_OBSERVED", "OBSERVING_REE_LOCAL"];
const SERVICE = ["hub_api", "hub_web", "caddy_proxy"];
const SERVICE_STATES: ServiceState304[] = ["NOT_OBSERVED", "STALE", "TCP_REACHABLE", "TCP_UNREACHABLE"];
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
export type MasterActivation304 = {
  monitoring: {
    collectionState: State304;
    automationHostEnforced: boolean;
    sampleCount: number;
    lastSampleAtUtc: string | null;
    historyDurability: string;
    services: { id: string; latestState: ServiceState304; reachableSamples: number;
      sampleCount: number; observedAvailabilityPercent: number | null }[];
    incidentCandidates: { service: string; condition: string; disposition: string }[];
  };
  signedTelemetry: string;
  commsIncidentHandoff: string;
  slaveStage: string;
};

/** Reject any API that falsely reports an authenticated connection or real Shell activation. */
export function inspectMasterActivation304(value: unknown): MasterActivation304 | null {
  if (!object(value) || value.schema !== "rosevear.ai-hub.master360-activation-status.v1" ||
    value.controller !== "ai-data-platform" || value.controllerBuild !== 360 ||
    value.sourceId !== "rosevear-ai-hub" || value.sourceRole !== "SOURCE" ||
    value.signedTelemetry !== "HOLD_ORIGINAL_SIGNER_AND_OWNER_AUTHORIZATION_REQUIRED" ||
    value.commsIncidentHandoff !== "HOLD_RECEIVER_ACK_NOT_INDEPENDENTLY_VERIFIED" ||
    value.slaveStage !== "HOLD_NEXT_MASTER_INTEGRATION_STAGE" ||
    value.newWindowsScheduledTasks !== 0 || !object(value.connections) ||
    value.connections["ai-data-platform"] !== "HOLD" || value.connections["rosevear-comms-hub"] !== "HOLD" ||
    !object(value.monitoring)) return null;
  const m = value.monitoring;
  if (m.schema !== "rosevear.ai-hub.ree-durable-uptime.v1" ||
    m.sourceId !== "rosevear-ai-hub" || m.sourceRole !== "SOURCE" ||
    m.hostPolicy !== "REE_ORIGINAL_WINDOWS_ONLY" || m.connection !== "HOLD" ||
    !STATES.includes(m.collectionState as State304) ||
    typeof m.automationHostEnforced !== "boolean" ||
    !Number.isSafeInteger(m.sampleCount) || Number(m.sampleCount) < 0 || Number(m.sampleCount) > 10080 ||
    !Array.isArray(m.services) || !Array.isArray(m.incidentCandidates) ||
    m.incidentCandidates.length > 3) return null;
  if (m.services.length && m.services.length !== 3) return null;
  const seen = new Set<string>();
  for (const s of m.services) {
    if (!object(s) || !SERVICE.includes(String(s.id)) || seen.has(String(s.id)) ||
      s.check !== "LOOPBACK_TCP_ONLY" || !SERVICE_STATES.includes(s.latestState as ServiceState304) ||
      s.sampleCount !== m.sampleCount ||
      !Number.isSafeInteger(s.reachableSamples) || Number(s.reachableSamples) < 0 ||
      Number(s.reachableSamples) > Number(m.sampleCount) ||
      (s.observedAvailabilityPercent !== null &&
       (typeof s.observedAvailabilityPercent !== "number" || s.observedAvailabilityPercent < 0 ||
        s.observedAvailabilityPercent > 100))) return null;
    seen.add(String(s.id));
  }
  for (const incident of m.incidentCandidates) {
    if (!object(incident) || !SERVICE.includes(String(incident.service)) ||
      incident.condition !== "THREE_CONSECUTIVE_TCP_FAILURES" ||
      incident.disposition !== "OFFLINE_COMMS_REVIEW_CANDIDATE_HOLD") return null;
  }
  return value as MasterActivation304;
}
