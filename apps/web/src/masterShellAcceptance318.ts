import { inspectMasterAcceptance317, type Acceptance317 } from "./masterShellAcceptance317";

type Fields = Record<string, unknown>;
const record = (v: unknown): v is Fields =>
  !!v && typeof v === "object" && !Array.isArray(v);

export type Acceptance318 = Acceptance317 & {
  source317MainAtReconciliation: string;
  commsQl427MainAtReconciliation: string;
  ql427CheckpointExport: string;
  ql427IndependentWitness: string;
  ql427ReceiverIsolation: string;
  ql427ThreeMasterRecovery: string;
  ql427OwnerClosure: string;
  ql427ExternalClosureAnchor: string;
};

/** Display fail-closed source evidence gaps; never trust browser live-state claims. */
export function inspectMasterAcceptance318(value: unknown): Acceptance318 | null {
  if (!record(value) ||
      value.schema !== "rosevear.ai-hub.master360-ql427-recovery318.v1" ||
      value.sourceBuild !== 318 ||
      value.source317MainAtReconciliation !== "20f1ac3ab519872b786c5d09fed57168353a213c" ||
      value.commsQl427MainAtReconciliation !== "94bd91afafa19ae54e701b48cb52df608ac326a5" ||
      value.controller380MainAtReconciliation !== "ccd291f22e15750392fa3995dc3d5811c506cd05" ||
      value.ql427CheckpointExport !== "HOLD_NO_AUTHENTICATED_EXPORT" ||
      value.ql427IndependentWitness !== "HOLD_NO_EXTERNAL_SIGNED_WITNESS" ||
      value.ql427ReceiverIsolation !== "HOLD_NO_FRESH_SIGNED_POST_ROLLBACK_OFF" ||
      value.ql427ThreeMasterRecovery !== "HOLD_NO_THREE_SIGNED_CLOSURE_REPORTS" ||
      value.ql427OwnerClosure !== "HOLD_NO_DUAL_SIGNED_OWNER_REVIEWER" ||
      value.ql427ExternalClosureAnchor !== "HOLD_NO_EXTERNAL_DURABLE_CLOSURE_ANCHOR" ||
      value.runtimeUptime !== "UNKNOWN_NO_CONTINUOUS_ORIGINAL_HOST_MONITORING" ||
      value.originalHostUptime !== "UNKNOWN_NO_ORIGINAL_REE_ATTESTATION" ||
      value.ownerAcceptance !== "HOLD" || value.receiver !== "OFF" ||
      value.connection !== "HOLD" || value.masterSync !== "HOLD" ||
      value.automationHost !== "DESKTOP-AE894KC_ONLY" ||
      value.newWindowsScheduledTasks !== 0) return null;
  const prior = { ...value,
    schema: "rosevear.ai-hub.master360-ql426-custody-audit317.v1",
    sourceBuild: 317 };
  return inspectMasterAcceptance317(prior) ? value as Acceptance318 : null;
}
