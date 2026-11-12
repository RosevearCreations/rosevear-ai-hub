import { inspectMasterAcceptance319, type Acceptance319 } from "./masterShellAcceptance319";

type Fields = Record<string, unknown>;
const record = (v: unknown): v is Fields =>
  !!v && typeof v === "object" && !Array.isArray(v);

export type Acceptance320 = Acceptance319 & {
  source319MainAtReconciliation: string;
  commsQl429ContractAtReconciliation: string;
  ql429ExternalStoreIdentity: string;
  ql429SeparateSignerEnrollment: string;
  ql429IndependentPossessionProofs: string;
  ql429FreshChallenge: string;
  ql429OriginalHostOff: string;
  ql429ThreeMasterWitness: string;
  ql429OwnerWitness: string;
  ql429DurableWitness: string;
};

/** Read-only original-host SOURCE gaps; never project a live receiver acceptance. */
export function inspectMasterAcceptance320(value: unknown): Acceptance320 | null {
  if (!record(value) ||
      value.schema !== "rosevear.ai-hub.master360-ql429-enrollment-witness320.v1" ||
      value.sourceBuild !== 320 ||
      value.source319MainAtReconciliation !== "0693d70965a5ada3320b8fcb261f554e0dbff88f" ||
      value.commsQl429ContractAtReconciliation !== "245cdc6f5dc21d9897ca454b2e16fdb51c33ae62" ||
      value.controller380MainAtReconciliation !== "ccd291f22e15750392fa3995dc3d5811c506cd05" ||
      value.ql429ExternalStoreIdentity !== "HOLD_NO_INDEPENDENT_REMOTE_STORE_CUSTODY" ||
      value.ql429SeparateSignerEnrollment !== "HOLD_NO_REAL_SIGNER_ENROLLMENT" ||
      value.ql429IndependentPossessionProofs !== "HOLD_NO_ORIGINAL_DEVICE_SIGNED_PROOFS" ||
      value.ql429FreshChallenge !== "HOLD_NO_ORIGINAL_HOST_192_BIT_CHALLENGE" ||
      value.ql429OriginalHostOff !== "HOLD_NO_FRESH_ORIGINAL_SIGNED_RECEIVER_OFF" ||
      value.ql429ThreeMasterWitness !== "HOLD_NO_THREE_SIGNED_PILOT_WITNESSES" ||
      value.ql429OwnerWitness !== "HOLD_NO_DISTINCT_DUAL_SIGNED_OWNER_PRECHECK" ||
      value.ql429DurableWitness !== "HOLD_NO_EXTERNAL_WITNESS_CUSTODY" ||
      value.runtimeUptime !== "UNKNOWN_NO_CONTINUOUS_ORIGINAL_HOST_MONITORING" ||
      value.originalHostUptime !== "UNKNOWN_NO_ORIGINAL_REE_ATTESTATION" ||
      value.ownerAcceptance !== "HOLD" || value.receiver !== "OFF" ||
      value.connection !== "HOLD" || value.masterSync !== "HOLD" ||
      value.automationHost !== "DESKTOP-AE894KC_ONLY" ||
      value.newWindowsScheduledTasks !== 0) return null;
  const previous = {
    ...value, schema: "rosevear.ai-hub.master360-ql428-anchor-reentry319.v1",
    sourceBuild: 319,
  };
  return inspectMasterAcceptance319(previous) ? value as Acceptance320 : null;
}
