type JsonRecord = Record<string, unknown>;
const rec = (value: unknown): value is JsonRecord =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const MASTER_NAMES = ["rosevear-ai-hub", "ai-data-platform", "rosevear-comms-hub"];
const SERVICES = ["hub_api", "hub_web", "caddy_proxy"];

export type TrendDay306 = {
  dayUtc: string;
  observedMinutes: number;
  reachableMinutes: Record<string, number>;
};
export type Acceptance306 = {
  observedLocalTrend: TrendDay306[];
  masterSources: { id: string; state: string }[];
  installedReleaseAcceptance: string;
  sourceOneTestImport: string;
  commsAck: string;
};

/** Gate all displayed information; unknown or forged master statuses stay HOLD. */
export function inspectMasterAcceptance306(input: unknown): Acceptance306 | null {
  if (!rec(input) ||
    input.schema !== "rosevear.ai-hub.master360-three-master-acceptance306.v1" ||
    input.sourceId !== "rosevear-ai-hub" || input.sourceBuild !== 306 ||
    input.originalHost !== "DESKTOP-AE894KC" ||
    input.sourceMain305AtReconciliation !== "27b234337f5a3f041dfca4541e33ed6aa821fa4f" ||
    input.controllerMain361AtReconciliation !== "69355a853f10bbe4d3785bcede8b44e0c788be65" ||
    input.commsMainQl412AtReconciliation !== "e42ffa856595a2d24c634653d83b1d80f2d6eaa4" ||
    input.controller360Contract !== "4b45b435fa7b6fc83b94e31556648fe4190a9f53" ||
    input.trendLabel !== "OBSERVED_LOCAL_TCP_REACHABILITY_NOT_END_TO_END_UPTIME" ||
    input.installedReleaseAcceptance !== "HOLD_NO_INDEPENDENT_SIGNED_REE_FIELD_REVIEW_IMPORTED" ||
    input.sourceOneTestImport !== "HOLD_NO_OWNER_AUTHORIZED_SIGNED_SOURCE_ENVELOPE_IMPORTED" ||
    input.commsAck !== "HOLD_NO_SIGNED_QL412_RECEIVER_ACK" ||
    input.automationHost !== "DESKTOP-AE894KC_ONLY" ||
    input.newWindowsScheduledTasks !== 0 || input.existingLauncherChanged !== false ||
    input.existingRecoveryTaskChanged !== false || input.receiver !== "OFF" ||
    input.connection !== "HOLD" || input.slaveGate !== "HOLD_NEXT_MASTER_INTEGRATION_STAGE" ||
    !Array.isArray(input.masterSources) || input.masterSources.length !== 3 ||
    !Array.isArray(input.observedLocalTrend) || input.observedLocalTrend.length > 7) return null;
  const sourceStates = ["LOCAL_REE_SAMPLES_NOT_MASTER_ACCEPTANCE", "HOLD_NO_FRESH_ORIGINAL_HOST_SAMPLES"];
  if (!input.masterSources.every((s: unknown, i: number) =>
    rec(s) && s.id === MASTER_NAMES[i] && typeof s.state === "string" &&
    (i === 0 ? sourceStates.includes(s.state) :
      s.state === (i === 1 ? "HOLD_NO_AUTHENTICATED_CONTROLLER_UPTIME_PROJECTION" :
        "HOLD_NO_SIGNED_RECEIVER_UPTIME_ACK")))) return null;
  const days = new Set<string>();
  for (const day of input.observedLocalTrend) {
    if (!rec(day)) return null;
    const count = day.observedMinutes;
    const reachable = day.reachableMinutes;
    if (!rec(day) || typeof day.dayUtc !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(day.dayUtc) ||
      typeof count !== "number" || !Number.isSafeInteger(count) || count < 1 ||
      count > 1440 || days.has(day.dayUtc) ||
      !rec(reachable) || Object.keys(reachable).length !== 3 ||
      !SERVICES.every(s => typeof reachable[s] === "number" &&
        Number.isSafeInteger(reachable[s]) && Number(reachable[s]) >= 0 &&
        Number(reachable[s]) <= count)) return null;
    days.add(day.dayUtc);
  }
  return input as Acceptance306;
}
