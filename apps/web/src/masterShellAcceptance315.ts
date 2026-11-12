import { inspectMasterAcceptance314, type Acceptance314 } from "./masterShellAcceptance314";

type Values = Record<string, unknown>;
const isRecord = (v: unknown): v is Values =>
  !!v && typeof v === "object" && !Array.isArray(v);

export type Acceptance315 = Acceptance314 & {
  source314MainAtReconciliation: string;
  commsQl424MainAtReconciliation: string;
  controller380MainAtReconciliation: string;
  sourceSignerEnrollment: string;
  receiverWitnessEnrollment: string;
  ql424CeremonyReadiness: string;
  threeMasterOwnerGate: string;
  privateAuthorityJournal: string;
};

/** Never interpret unsigned browser flags as proof of activation. */
export function inspectMasterAcceptance315(value: unknown): Acceptance315 | null {
  if (!isRecord(value) ||
      value.schema !== "rosevear.ai-hub.master360-ql424-ceremony-readiness315.v1" ||
      value.sourceBuild !== 315 ||
      value.source314MainAtReconciliation !== "124c78f0c15b054881c9b7f45c6d9b2f6d8eb88c" ||
      value.commsQl424MainAtReconciliation !== "d40b3445c766ba9dab5d069fdfe51f20caadb28c" ||
      value.controller380MainAtReconciliation !== "ccd291f22e15750392fa3995dc3d5811c506cd05" ||
      value.sourceSignerEnrollment !== "HOLD_NO_REE_ORIGINAL_SOURCE_PUBLIC_PIN_ADMITTED" ||
      value.receiverWitnessEnrollment !== "HOLD_NO_INDEPENDENT_RECEIVER_PIN_AND_OFF_READBACK" ||
      value.ql424CeremonyReadiness !== "HOLD_NO_PROTECTED_ONE_TEST_SUPERVISION" ||
      value.threeMasterOwnerGate !== "HOLD_NO_THREE_MASTER_SIGNED_OWNER_REVIEW" ||
      value.privateAuthorityJournal !== "NO_LIVE_ORIGINAL_HOST_AUTHORITY_ENROLLMENT" ||
      value.originalHostUptime !== "UNKNOWN_NO_ORIGINAL_REE_ATTESTATION" ||
      value.ownerAcceptance !== "HOLD" || value.receiver !== "OFF" ||
      value.connection !== "HOLD" || value.masterSync !== "HOLD" ||
      value.automationHost !== "DESKTOP-AE894KC_ONLY" ||
      value.newWindowsScheduledTasks !== 0) {
    return null;
  }
  const prior = {
    ...value,
    schema: "rosevear.ai-hub.master360-field-ledger-recheck314.v1",
    sourceBuild: 314,
  };
  return inspectMasterAcceptance314(prior) ? value as Acceptance315 : null;
}
