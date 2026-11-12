import { inspectMasterAcceptance313, type Acceptance313 } from "./masterShellAcceptance313";

type Data = Record<string, unknown>;
const record = (v: unknown): v is Data =>
  !!v && typeof v === "object" && !Array.isArray(v);

export type Acceptance314 = Acceptance313 & {
  source313MainAtReconciliation: string;
  commsQl423MainAtReconciliation: string;
  controller379MainAtReconciliation: string;
  originalFieldReceipt: string;
  ql423ReplayRestoration: string;
  ownerDecisionRecheck: string;
  privateFieldJournal: string;
};

/** Only the independently unaccepted code/HOLD snapshot is display-safe. */
export function inspectMasterAcceptance314(value: unknown): Acceptance314 | null {
  if (!record(value) ||
      value.schema !== "rosevear.ai-hub.master360-field-ledger-recheck314.v1" ||
      value.sourceBuild !== 314 ||
      value.source313MainAtReconciliation !== "b790adf2e19343d1132fad0eef8107c21e3e560d" ||
      value.commsQl423MainAtReconciliation !== "2adc527a88adb790f0edc5192df62f03be8c397c" ||
      value.controller379MainAtReconciliation !== "ce4216c667b514f40e2fb6e506e5b62c222b1736" ||
      value.originalFieldReceipt !== "HOLD_NO_ORIGINAL_HOST_SIGNED_FIELD_RECEIPT" ||
      value.ql423ReplayRestoration !== "HOLD_NO_DURABLE_THREE_MASTER_REPLAY_READBACK" ||
      value.ownerDecisionRecheck !== "HOLD_NO_SEPARATELY_SIGNED_OWNER_REVIEW" ||
      value.privateFieldJournal !== "NO_ORIGINAL_HOST_LEDGER_ADMISSION" ||
      value.ownerAcceptance !== "HOLD" ||
      value.originalHostUptime !== "UNKNOWN_NO_ORIGINAL_REE_ATTESTATION" ||
      value.automationHost !== "DESKTOP-AE894KC_ONLY" ||
      value.receiver !== "OFF" || value.connection !== "HOLD" ||
      value.masterSync !== "HOLD" || value.newWindowsScheduledTasks !== 0) {
    return null;
  }
  const previous = {
    ...value,
    schema: "rosevear.ai-hub.master360-signed-pilot-continuity313.v1",
    sourceBuild: 313,
  };
  return inspectMasterAcceptance313(previous) ? value as Acceptance314 : null;
}
