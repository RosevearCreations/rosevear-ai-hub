import { inspectMasterAcceptance322, type Acceptance322 } from "./masterShellAcceptance322";

type RecordValue = Record<string, unknown>;
const record = (x: unknown): x is RecordValue =>
  !!x && typeof x === "object" && !Array.isArray(x);

const holdFields = {
  ql432ReconciledOffIncident: "HOLD_NO_REAL_ORIGINAL_HOST_TERMINAL_RECEIPT",
  ql432ExternalAnchor: "HOLD_NO_INDEPENDENT_IMMUTABLE_EXTERNAL_PIN",
  ql432IndependentAnchorReadback: "HOLD_NO_SEPARATE_SIGNED_ANCHOR_READER",
  ql432OriginalHostRecoveryOff: "HOLD_NO_FRESH_SIGNED_ORIGINAL_HOST_OFF",
  ql432IndependentReceiverOff: "HOLD_NO_FRESH_SEPARATE_SIGNED_OFF",
  ql432ThreeMasterDisposition: "HOLD_NO_THREE_SIGNED_RECOVERY_REPORTS",
  ql432OwnerNewCeremonyReview: "HOLD_NO_DUAL_SIGNED_NEW_CEREMONY_REVIEW",
  ql432DurableOneUseReview: "HOLD_NO_PROTECTED_ORIGINAL_HOST_ONE_USE_RECEIPT",
} as const;

export type Acceptance323 = Acceptance322 & {
  source322MainAtReconciliation: string;
  commsQl432ContractAtReconciliation: string;
} & { [K in keyof typeof holdFields]: string };

/** Server source HOLD only; never promote an unverified live status. */
export function inspectMasterAcceptance323(value: unknown): Acceptance323 | null {
  if (!record(value) ||
      value.schema !== "rosevear.ai-hub.master360-ql432-anchor-recovery323.v1" ||
      value.sourceBuild !== 323 ||
      value.source322MainAtReconciliation !== "b5a7ced1751d99c3a3e4d23e416bb0700588da02" ||
      value.commsQl432ContractAtReconciliation !== "f28f14f67d3ecd5fad9972d6f0500c14de0f89b7" ||
      value.receiver !== "OFF" || value.connection !== "HOLD" ||
      value.ownerAcceptance !== "HOLD" || value.masterSync !== "HOLD" ||
      value.runtimeUptime !== "UNKNOWN_NO_CONTINUOUS_ORIGINAL_HOST_MONITORING") {
    return null;
  }
  for (const [key, expected] of Object.entries(holdFields)) {
    if (value[key] !== expected) return null;
  }
  const previous = {
    ...value,
    schema: "rosevear.ai-hub.master360-ql431-pilot-continuity322.v1",
    sourceBuild: 322,
  };
  return inspectMasterAcceptance322(previous) ? value as Acceptance323 : null;
}
