import { inspectMasterAcceptance323, type Acceptance323 } from "./masterShellAcceptance323";

type FieldMap = Record<string, unknown>;
const record = (value: unknown): value is FieldMap =>
  !!value && typeof value === "object" && !Array.isArray(value);

const holdFields = {
  ql433QL432ProtectedOwnerReceipt: "HOLD_NO_INDEPENDENT_QL432_DECISION_READBACK",
  ql433ReconciledOffCheckpoint: "HOLD_NO_ORIGINAL_HOST_QL431_TERMINAL_READBACK",
  ql433NewCeremonyScope: "HOLD_NO_FRESH_SUPERVISED_NEW_CEREMONY",
  ql433ExternalDecisionAnchor: "HOLD_NO_INDEPENDENT_DECISION_EXPORT_ANCHOR",
  ql433IndependentAnchorReader: "HOLD_NO_DISTINCT_SIGNED_EXPORT_READBACK",
  ql433OriginalHostOff: "HOLD_NO_FRESH_ORIGINAL_HOST_SIGNED_OFF",
  ql433IndependentReceiverOff: "HOLD_NO_FRESH_SIGNED_RECEIVER_OFF",
  ql433ThreeMasterPrecheck: "HOLD_NO_THREE_SIGNED_NEW_CEREMONY_REPORTS",
  ql433DualOwnerPrecheck: "HOLD_NO_DUAL_SIGNED_PRECHECK_ONLY_CONSENT",
  ql433DurableOneUsePrecheck: "HOLD_NO_PRIVATE_ONE_USE_PRECHECK_RECEIPT",
} as const;

export type Acceptance324 = Acceptance323 & {
  source323MainAtReconciliation: string;
  commsQl433ContractAtReconciliation: string;
} & { [K in keyof typeof holdFields]: string };

/** Authenticated source HOLD, never a browser authority or receiver state machine. */
export function inspectMasterAcceptance324(value: unknown): Acceptance324 | null {
  if (!record(value) ||
      value.schema !== "rosevear.ai-hub.master360-ql433-new-ceremony324.v1" ||
      value.sourceBuild !== 324 ||
      value.source323MainAtReconciliation !== "99a6eba7d60373328d5e29f869082172c895e93a" ||
      value.commsQl433ContractAtReconciliation !== "6926d83b8984ee5b46e568f39cb41ac8db7274bc" ||
      value.receiver !== "OFF" || value.connection !== "HOLD" ||
      value.ownerAcceptance !== "HOLD" || value.masterSync !== "HOLD" ||
      value.runtimeUptime !== "UNKNOWN_NO_CONTINUOUS_ORIGINAL_HOST_MONITORING") {
    return null;
  }
  for (const [key, expected] of Object.entries(holdFields)) {
    if (value[key] !== expected) return null;
  }
  return inspectMasterAcceptance323({
    ...value,
    schema: "rosevear.ai-hub.master360-ql432-anchor-recovery323.v1",
    sourceBuild: 323,
  }) ? value as Acceptance324 : null;
}
