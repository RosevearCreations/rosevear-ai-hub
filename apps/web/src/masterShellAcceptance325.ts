import { inspectMasterAcceptance324, type Acceptance324 } from "./masterShellAcceptance324";

type Source = Record<string, unknown>;
const record = (x: unknown): x is Source =>
  !!x && typeof x === "object" && !Array.isArray(x);

const holdFields = {
  ql434QL433OneUsePrecheck: "HOLD_NO_PROTECTED_SIGNED_QL433_PRECHECK",
  ql434QL431432Chain: "HOLD_NO_ORIGINAL_HOST_QL431_QL432_CHAIN_REVALIDATION",
  ql434IndependentIssuer: "HOLD_NO_NEW_INDEPENDENT_AUTHORITY_SIGNER",
  ql434DistinctWitness: "HOLD_NO_SEPARATE_SIGNED_AUTHORITY_WITNESS",
  ql434OriginalHostReadyOff: "HOLD_NO_FRESH_SIGNED_ORIGINAL_HOST_READINESS_OFF",
  ql434IndependentReceiverOff: "HOLD_NO_FRESH_INDEPENDENT_SIGNED_RECEIVER_OFF",
  ql434ThreeMasterReadiness: "HOLD_NO_THREE_SIGNED_READINESS_REPORTS",
  ql434DualOwnerConsent: "HOLD_NO_DUAL_SIGNED_READINESS_ONLY_CONSENT",
  ql434OneUseReceipt: "HOLD_NO_ONE_USE_PRIVATE_READINESS_RECORD",
  ql434NewCeremonyEnrollment: "HOLD_NO_SEPARATE_SUPERVISED_NEW_CEREMONY",
} as const;

export type Acceptance325 = Acceptance324 & {
  source324MainAtReconciliation: string;
  commsQl434ContractAtReconciliation: string;
  activationAuthorized: false;
} & { [K in keyof typeof holdFields]: string };

/** Strict source-only HOLD. No browser input can authorize a ceremony or activate a receiver. */
export function inspectMasterAcceptance325(value: unknown): Acceptance325 | null {
  if (!record(value) ||
      value.schema !== "rosevear.ai-hub.master360-ql434-readiness325.v1" ||
      value.sourceBuild !== 325 ||
      value.source324MainAtReconciliation !== "1fd1f527f8c181f4077b353e34b0bcdf9c801e31" ||
      value.commsQl434ContractAtReconciliation !== "f87dd73c608bb9615d1928c1070a3dd1d777ffaf" ||
      value.activationAuthorized !== false || value.receiver !== "OFF" ||
      value.connection !== "HOLD" || value.ownerAcceptance !== "HOLD" ||
      value.masterSync !== "HOLD" ||
      value.runtimeUptime !== "UNKNOWN_NO_CONTINUOUS_ORIGINAL_HOST_MONITORING") {
    return null;
  }
  for (const [key, expected] of Object.entries(holdFields)) {
    if (value[key] !== expected) return null;
  }
  return inspectMasterAcceptance324({
    ...value,
    schema: "rosevear.ai-hub.master360-ql433-new-ceremony324.v1",
    sourceBuild: 324,
  }) ? value as Acceptance325 : null;
}
