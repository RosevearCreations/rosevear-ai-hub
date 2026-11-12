import { inspectMasterAcceptance318, type Acceptance318 } from "./masterShellAcceptance318";

type Fields = Record<string, unknown>;
const record = (v: unknown): v is Fields =>
  !!v && typeof v === "object" && !Array.isArray(v);

export type Acceptance319 = Acceptance318 & {
  source318MainAtReconciliation: string;
  commsQl428MainAtReconciliation: string;
  ql428ExternalAnchorExport: string;
  ql428OffHostAnchor: string;
  ql428IndependentReadback: string;
  ql428CustodyDrift: string;
  ql428ReentryReceiverOff: string;
  ql428ThreeMasterPrecheck: string;
  ql428OwnerPrecheck: string;
  ql428DurablePrecheck: string;
};

/** Only display authenticated source HOLD; reject browser-supplied live claims. */
export function inspectMasterAcceptance319(value: unknown): Acceptance319 | null {
  if (!record(value) ||
      value.schema !== "rosevear.ai-hub.master360-ql428-anchor-reentry319.v1" ||
      value.sourceBuild !== 319 ||
      value.source318MainAtReconciliation !== "821ba9094248be724e435bbe36c3065da604fd8e" ||
      value.commsQl428MainAtReconciliation !== "71c81f7dd7ffd858b1195d5c2cca0f6f4c29059c" ||
      value.controller380MainAtReconciliation !== "ccd291f22e15750392fa3995dc3d5811c506cd05" ||
      value.ql428ExternalAnchorExport !== "HOLD_NO_VERIFIED_QL427_EXPORT" ||
      value.ql428OffHostAnchor !== "HOLD_NO_INDEPENDENT_OFF_HOST_SIGNED_ANCHOR" ||
      value.ql428IndependentReadback !== "HOLD_NO_FRESH_SIGNED_REMOTE_NONCE_READBACK" ||
      value.ql428CustodyDrift !== "HOLD_NO_POST_READBACK_LOCAL_REOPEN" ||
      value.ql428ReentryReceiverOff !== "HOLD_NO_NEW_SIGNED_RECEIVER_OFF" ||
      value.ql428ThreeMasterPrecheck !== "HOLD_NO_THREE_FRESH_MASTER_SIGNATURES" ||
      value.ql428OwnerPrecheck !== "HOLD_NO_DUAL_SIGNED_OWNER_DECISION" ||
      value.ql428DurablePrecheck !== "HOLD_NO_ORIGINAL_HOST_ONE_USE_REENTRY_RECEIPT" ||
      value.runtimeUptime !== "UNKNOWN_NO_CONTINUOUS_ORIGINAL_HOST_MONITORING" ||
      value.originalHostUptime !== "UNKNOWN_NO_ORIGINAL_REE_ATTESTATION" ||
      value.ownerAcceptance !== "HOLD" || value.receiver !== "OFF" ||
      value.connection !== "HOLD" || value.masterSync !== "HOLD" ||
      value.automationHost !== "DESKTOP-AE894KC_ONLY" ||
      value.newWindowsScheduledTasks !== 0) return null;
  const previous = {
    ...value, schema: "rosevear.ai-hub.master360-ql427-recovery318.v1",
    sourceBuild: 318
  };
  return inspectMasterAcceptance318(previous) ? value as Acceptance319 : null;
}
