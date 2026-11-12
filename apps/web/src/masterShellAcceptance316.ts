import { inspectMasterAcceptance315, type Acceptance315 } from "./masterShellAcceptance315";

type Data = Record<string, unknown>;
const isRecord = (v: unknown): v is Data =>
  !!v && typeof v === "object" && !Array.isArray(v);

export type Acceptance316 = Acceptance315 & {
  source315MainAtReconciliation: string;
  commsQl425MainAtReconciliation: string;
  commsRuntimeMainAtReconciliation: string;
  controller380MainAtReconciliation: string;
  originalHostIsolatedPilot: string;
  ql425ThreeMasterHealth: string;
  ql425DurableReplay: string;
  ql425ReceiverRollback: string;
  ownerRecoveryDecision: string;
  pilotUptime: string;
};

/** A browser can only display the strict non-activated source HOLD snapshot. */
export function inspectMasterAcceptance316(value: unknown): Acceptance316 | null {
  if (!isRecord(value) ||
      value.schema !== "rosevear.ai-hub.master360-ql425-health-recovery316.v1" ||
      value.sourceBuild !== 316 ||
      value.source315MainAtReconciliation !== "0ae23d6ce3b09cc14da9187635cb2875269f3739" ||
      value.commsQl425MainAtReconciliation !== "d40b3445c766ba9dab5d069fdfe51f20caadb28c" ||
      value.commsRuntimeMainAtReconciliation !== "fb9ef12aebd5594bd56af5e800011b82812f7ffa" ||
      value.controller380MainAtReconciliation !== "ccd291f22e15750392fa3995dc3d5811c506cd05" ||
      value.originalHostIsolatedPilot !== "HOLD_NO_SIGNED_ORIGINAL_REE_QL424_CEREMONY" ||
      value.ql425ThreeMasterHealth !== "HOLD_NO_FRESH_THREE_MASTER_HEARTBEATS" ||
      value.ql425DurableReplay !== "HOLD_NO_PROTECTED_HEALTH_SEQUENCE_CUSTODY" ||
      value.ql425ReceiverRollback !== "HOLD_NO_INDEPENDENT_SIGNED_OFF_READBACK" ||
      value.ownerRecoveryDecision !== "HOLD_NO_DISTINCT_OWNER_REVIEWER_AUTHORIZATION" ||
      value.pilotUptime !== "UNKNOWN_NO_CONTINUOUS_SIGNED_MONITORING" ||
      value.originalHostUptime !== "UNKNOWN_NO_ORIGINAL_REE_ATTESTATION" ||
      value.automationHost !== "DESKTOP-AE894KC_ONLY" ||
      value.ownerAcceptance !== "HOLD" || value.receiver !== "OFF" ||
      value.connection !== "HOLD" || value.masterSync !== "HOLD" ||
      value.newWindowsScheduledTasks !== 0) {
    return null;
  }
  const prior = {
    ...value,
    schema: "rosevear.ai-hub.master360-ql424-ceremony-readiness315.v1",
    sourceBuild: 315,
  };
  return inspectMasterAcceptance315(prior) ? value as Acceptance316 : null;
}
