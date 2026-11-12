import { inspectMasterAcceptance316, type Acceptance316 } from "./masterShellAcceptance316";

type Fields = Record<string, unknown>;
const record = (v: unknown): v is Fields =>
  !!v && typeof v === "object" && !Array.isArray(v);

export type Acceptance317 = Acceptance316 & {
  source316MainAtReconciliation: string;
  commsQl426MainAtReconciliation: string;
  commsCurrentMainAtReconciliation: string;
  controller380MainAtReconciliation: string;
  ql426CheckpointCustody: string;
  ql426RemoteHeadWitness: string;
  ql426SignedReceiverOff: string;
  ql426DurableIncident: string;
  independentOwnerIncidentAudit: string;
};

/** Read-only source HOLD, never browser asserted checkpoint or restart. */
export function inspectMasterAcceptance317(value: unknown): Acceptance317 | null {
  if (!record(value) ||
      value.schema !== "rosevear.ai-hub.master360-ql426-custody-audit317.v1" ||
      value.sourceBuild !== 317 ||
      value.source316MainAtReconciliation !== "4804a7a200ac7c63f8e08b08e1f37c6085960054" ||
      value.commsQl426MainAtReconciliation !== "fb9ef12aebd5594bd56af5e800011b82812f7ffa" ||
      value.commsCurrentMainAtReconciliation !== "94bd91afafa19ae54e701b48cb52df608ac326a5" ||
      value.controller380MainAtReconciliation !== "ccd291f22e15750392fa3995dc3d5811c506cd05" ||
      value.ql426CheckpointCustody !== "HOLD_NO_REOPENED_ORIGINAL_HOST_CHECKPOINT" ||
      value.ql426RemoteHeadWitness !== "HOLD_NO_EXTERNALLY_WITNESSED_HEAD" ||
      value.ql426SignedReceiverOff !== "HOLD_NO_SIGNED_OFF_ROLLBACK_READBACK" ||
      value.ql426DurableIncident !== "HOLD_NO_RECONCILED_ROLLBACK_RECORD" ||
      value.independentOwnerIncidentAudit !== "HOLD_NO_DUAL_SIGNED_OWNER_THREE_MASTER_REVIEW" ||
      value.runtimeUptime !== "UNKNOWN_NO_CONTINUOUS_ORIGINAL_HOST_MONITORING" ||
      value.originalHostUptime !== "UNKNOWN_NO_ORIGINAL_REE_ATTESTATION" ||
      value.ownerAcceptance !== "HOLD" || value.receiver !== "OFF" ||
      value.connection !== "HOLD" || value.masterSync !== "HOLD" ||
      value.automationHost !== "DESKTOP-AE894KC_ONLY" ||
      value.newWindowsScheduledTasks !== 0) return null;
  const parent = {
    ...value,
    schema: "rosevear.ai-hub.master360-ql425-health-recovery316.v1",
    sourceBuild: 316,
    runtimeUptime: "UNKNOWN",
  };
  return inspectMasterAcceptance316(parent) ? value as Acceptance317 : null;
}
