import { inspectMasterAcceptance327, type Acceptance327 } from "./masterShellAcceptance327";

type Source = Record<string, unknown>;
const record = (x: unknown): x is Source =>
  !!x && typeof x === "object" && !Array.isArray(x);

const required = {
  ql437OriginalQl431To436Custody: "HOLD_NO_PRIVATE_RECEIPT_READBACK",
  ql437ProtectedExportProposal: "HOLD_NO_ORIGINAL_HOST_EXPORT_SESSION",
  ql437OneUsePending: "HOLD_NO_DURABLE_ONE_USE_PENDING",
  ql437ExternalAnchor: "HOLD_NO_SIGNED_IMMUTABLE_EXTERNAL_ANCHOR",
  ql437IndependentAnchorReader: "HOLD_NO_DISTINCT_PINNED_ANCHOR_READER",
  ql437OriginalHostFreshOff: "HOLD_NO_FRESH_ORIGINAL_HOST_SIGNED_OFF",
  ql437IndependentReceiverFreshOff: "HOLD_NO_SEPARATELY_SIGNED_RECEIVER_OFF",
  ql437ThreeMasterContinuity: "HOLD_NO_THREE_MASTER_SIGNED_CONTINUITY",
  ql437ExpiredLeaseException: "HOLD_NO_INDEPENDENT_EXCEPTION_CUSTODY",
  ql437DualOwnerDecision: "HOLD_NO_DUAL_OWNER_CLOSURE_OR_EXCEPTION_REVIEW",
  ql437OneUseFinal: "HOLD_NO_DURABLE_FINAL_RECEIPT",
  ql437LiveOff: "UNKNOWN_NO_FRESH_ORIGINAL_HOST_RUNTIME_READBACK",
} as const;

export type Acceptance328 = Omit<Acceptance327, "receiver"> & {
  source327MainAtReconciliation: string;
  commsQl437ContractAtReconciliation: string;
  receiver: "UNKNOWN_PENDING_INDEPENDENT_OFF_REVALIDATION";
  activationAuthorized: false;
} & { [K in keyof typeof required]: string };

export function inspectMasterAcceptance328(value: unknown): Acceptance328 | null {
  if (!record(value) ||
      value.schema !== "rosevear.ai-hub.master360-ql437-anchor328.v1" ||
      value.sourceBuild !== 328 ||
      value.source327MainAtReconciliation !== "8227b392b403b714d492a1f82e85c080e41a1f5a" ||
      value.commsQl437ContractAtReconciliation !== "7bf522660f6f10a1cd1b039aacf9b93af165304f" ||
      value.receiver !== "UNKNOWN_PENDING_INDEPENDENT_OFF_REVALIDATION" ||
      value.connection !== "HOLD" ||
      value.activationAuthorized !== false ||
      value.ownerAcceptance !== "HOLD" ||
      value.masterSync !== "HOLD" ||
      value.runtimeUptime !== "UNKNOWN_NO_CONTINUOUS_ORIGINAL_HOST_MONITORING") return null;
  for (const [key, expected] of Object.entries(required)) {
    if (value[key] !== expected) return null;
  }
  return inspectMasterAcceptance327({
    ...value,
    schema: "rosevear.ai-hub.master360-ql436-shutdown327.v1",
    sourceBuild: 327,
    receiver: "UNKNOWN_UNTIL_INDEPENDENT_SIGNED_OFF",
  }) ? value as Acceptance328 : null;
}
