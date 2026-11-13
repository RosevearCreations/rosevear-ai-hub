import { inspectMasterAcceptance326, type Acceptance326 } from "./masterShellAcceptance326";

type Source = Record<string, unknown>;
const record = (x: unknown): x is Source =>
  !!x && typeof x === "object" && !Array.isArray(x);

const holdFields = {
  ql436PriorQl431To435Custody: "HOLD_NO_PRIVATE_PRIOR_SIGNED_READBACK",
  ql436ProtectedShutdownAuthority: "HOLD_NO_ORIGINAL_HOST_SHUTDOWN_SESSION",
  ql436OneUsePending: "HOLD_NO_DURABLE_SHUTDOWN_PENDING",
  ql436SignedOriginalHostOff: "HOLD_NO_SIGNED_ORIGINAL_HOST_OFF_PROOF",
  ql436IndependentReceiverOff: "HOLD_NO_INDEPENDENT_SIGNED_RECEIVER_OFF",
  ql436LeaseDisposition: "HOLD_NO_SIGNED_ON_TIME_OR_LATE_CLASSIFICATION",
  ql436ThreeMasterContinuity: "HOLD_NO_THREE_SIGNED_INCIDENT_CONTINUITY_REPORTS",
  ql436DualOwnerReview: "HOLD_NO_DUAL_SIGNED_HOLD_OR_ESCALATION",
  ql436ReconciledReceipt: "HOLD_NO_DURABLE_ONE_USE_RECONCILED_RECEIPT",
  ql436IndependentRuntimeOff: "UNKNOWN_NO_REAL_ORIGINAL_HOST_OFF_OBSERVATION",
} as const;

export type Acceptance327 = Acceptance326 & {
  source326MainAtReconciliation: string;
  commsQl436ContractAtReconciliation: string;
  receiver: "UNKNOWN_UNTIL_INDEPENDENT_SIGNED_OFF";
  activationAuthorized: false;
} & { [K in keyof typeof holdFields]: string };

/** Source release only; a browser cannot claim real original-host OFF or CONNECTED. */
export function inspectMasterAcceptance327(value: unknown): Acceptance327 | null {
  if (!record(value) ||
      value.schema !== "rosevear.ai-hub.master360-ql436-shutdown327.v1" ||
      value.sourceBuild !== 327 ||
      value.source326MainAtReconciliation !== "cd5d1d46196d2cbf9bbd4d6165861356f447dc16" ||
      value.commsQl436ContractAtReconciliation !== "7bf522660f6f10a1cd1b039aacf9b93af165304f" ||
      value.receiver !== "UNKNOWN_UNTIL_INDEPENDENT_SIGNED_OFF" ||
      value.activationAuthorized !== false ||
      value.connection !== "HOLD" ||
      value.ownerAcceptance !== "HOLD" ||
      value.masterSync !== "HOLD" ||
      value.runtimeUptime !== "UNKNOWN_NO_CONTINUOUS_ORIGINAL_HOST_MONITORING") {
    return null;
  }
  for (const [key, expected] of Object.entries(holdFields)) {
    if (value[key] !== expected) return null;
  }
  return inspectMasterAcceptance326({
    ...value,
    schema: "rosevear.ai-hub.master360-ql435-isolated-pilot326.v1",
    sourceBuild: 326,
    receiver: "OFF_NOT_ACTIVATED_BY_QL435",
  }) ? value as Acceptance327 : null;
}
