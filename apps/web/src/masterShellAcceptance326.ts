import { inspectMasterAcceptance325, type Acceptance325 } from "./masterShellAcceptance325";

type Source = Record<string, unknown>;
const record = (x: unknown): x is Source =>
  !!x && typeof x === "object" && !Array.isArray(x);

const holds = {
  ql435Ql431To434ExactCustody: "HOLD_NO_PROTECTED_ORIGINAL_HOST_READBACK",
  ql435NewCeremonyEnrollment: "HOLD_NO_SIGNED_FRESH_HOST_OFF_ENROLLMENT",
  ql435BoundedLease: "HOLD_NO_REAL_HARD_15_SECOND_SHUTDOWN",
  ql435IndependentPreOnOff: "HOLD_NO_SIGNED_SEPARATE_PRE_ON_OFF",
  ql435DualOwnerPrePermit: "HOLD_NO_SIGNED_SINGLE_PILOT_PREPERMIT",
  ql435OneUsePending: "HOLD_NO_DURABLE_PRE_CHALLENGE_PENDING",
  ql435OriginalHostOnChallenge: "HOLD_NO_FRESH_HOST_SIGNED_ISOLATED_ON",
  ql435IndependentOnWitness: "HOLD_NO_INDEPENDENT_SIGNED_ISOLATED_ON",
  ql435ThreeMasterPilotReview: "HOLD_NO_THREE_SIGNED_PILOT_REPORTS",
  ql435DualOwnerPilotDecision: "HOLD_NO_DUAL_SIGNED_EVIDENCE_ONLY_DECISION",
  ql435OneUseAccepted: "HOLD_NO_DURABLE_ACCEPTED_ON_EVIDENCE",
  ql435MandatoryPostPilotOff: "HOLD_NO_SUPERVISED_POST_PILOT_ISOLATION",
} as const;

export type Acceptance326 = Acceptance325 & {
  source325MainAtReconciliation: string;
  commsQl435ContractAtReconciliation: string;
  activationAuthorized: false;
} & { [K in keyof typeof holds]: string };

export function inspectMasterAcceptance326(value: unknown): Acceptance326 | null {
  if (!record(value) ||
      value.schema !== "rosevear.ai-hub.master360-ql435-isolated-pilot326.v1" ||
      value.sourceBuild !== 326 ||
      value.source325MainAtReconciliation !== "453b00a404d2392dac22ded18ee3f9f77a2466c4" ||
      value.commsQl435ContractAtReconciliation !== "c2ec4dba1f403b5d837d45f758cee6dba83f50fd" ||
      value.activationAuthorized !== false ||
      value.connection !== "HOLD" ||
      value.receiver !== "OFF_NOT_ACTIVATED_BY_QL435" ||
      value.ownerAcceptance !== "HOLD" ||
      value.masterSync !== "HOLD" ||
      value.runtimeUptime !== "UNKNOWN_NO_CONTINUOUS_ORIGINAL_HOST_MONITORING") {
    return null;
  }
  for (const [key, expected] of Object.entries(holds)) {
    if (value[key] !== expected) return null;
  }
  return inspectMasterAcceptance325({
    ...value,
    schema: "rosevear.ai-hub.master360-ql434-readiness325.v1",
    sourceBuild: 325,
    receiver: "OFF",
  }) ? value as Acceptance326 : null;
}
