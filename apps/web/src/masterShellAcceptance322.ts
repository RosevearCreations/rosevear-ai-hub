import { inspectMasterAcceptance321, type Acceptance321 } from "./masterShellAcceptance321";

type Fields = Record<string, unknown>;
const record = (v: unknown): v is Fields =>
  !!v && typeof v === "object" && !Array.isArray(v);

export type Acceptance322 = Acceptance321 & {
  source321MainAtReconciliation: string;
  commsQl431ContractAtReconciliation: string;
  ql431Ql430AcceptedPilot: string;
  ql431IndependentMasterHealth: string;
  ql431MonotonicSequences: string;
  ql431IndependentReceiverOn: string;
  ql431DurableHealthCheckpoint: string;
  ql431PendingFailClosedIncident: string;
  ql431SignedReceiverShutdown: string;
  ql431IndependentReceiverOff: string;
  ql431ThreeMasterIncident: string;
  ql431DualOwnerIncident: string;
  ql431DurableReconciliation: string;
};

/** Authenticated source HOLD only. Never accept browser-supplied runtime claims. */
export function inspectMasterAcceptance322(value: unknown): Acceptance322 | null {
  if (!record(value) ||
      value.schema !== "rosevear.ai-hub.master360-ql431-pilot-continuity322.v1" ||
      value.sourceBuild !== 322 ||
      value.source321MainAtReconciliation !== "dbc3fd8ae7f8df3bfc85a402a00b0954648ec543" ||
      value.commsQl431ContractAtReconciliation !== "f28f14f67d3ecd5fad9972d6f0500c14de0f89b7" ||
      value.controller380MainAtReconciliation !== "ccd291f22e15750392fa3995dc3d5811c506cd05" ||
      value.ql431Ql430AcceptedPilot !== "HOLD_NO_REAL_DURABLE_QL430_PILOT_RECEIPT" ||
      value.ql431IndependentMasterHealth !== "HOLD_NO_THREE_FRESH_SIGNED_HEARTBEATS" ||
      value.ql431MonotonicSequences !== "HOLD_NO_DURABLE_HIGH_WATER_RECHECK" ||
      value.ql431IndependentReceiverOn !== "HOLD_NO_SEPARATE_SIGNED_ON" ||
      value.ql431DurableHealthCheckpoint !== "HOLD_NO_ORIGINAL_HOST_IMMUTABLE_HEALTH" ||
      value.ql431PendingFailClosedIncident !== "HOLD_NO_ORIGINAL_HOST_INCIDENT_ATTEMPT" ||
      value.ql431SignedReceiverShutdown !== "HOLD_NO_FRESH_ORIGINAL_SIGNED_SHUTDOWN" ||
      value.ql431IndependentReceiverOff !== "HOLD_NO_SEPARATE_SIGNED_OFF_READBACK" ||
      value.ql431ThreeMasterIncident !== "HOLD_NO_THREE_SIGNED_INCIDENT_CUSTODY_REPORTS" ||
      value.ql431DualOwnerIncident !== "HOLD_NO_DUAL_SIGNED_INCIDENT_ACCEPTANCE" ||
      value.ql431DurableReconciliation !== "HOLD_NO_IMMUTABLE_INCIDENT_CLOSURE" ||
      value.runtimeUptime !== "UNKNOWN_NO_CONTINUOUS_ORIGINAL_HOST_MONITORING" ||
      value.originalHostUptime !== "UNKNOWN_NO_ORIGINAL_REE_ATTESTATION" ||
      value.ownerAcceptance !== "HOLD" || value.receiver !== "OFF" ||
      value.connection !== "HOLD" || value.masterSync !== "HOLD" ||
      value.automationHost !== "DESKTOP-AE894KC_ONLY" ||
      value.newWindowsScheduledTasks !== 0) return null;
  const previous = {
    ...value, schema: "rosevear.ai-hub.master360-ql430-runtime-pilot321.v1",
    sourceBuild: 321,
  };
  return inspectMasterAcceptance321(previous) ? value as Acceptance322 : null;
}
