import { inspectMasterAcceptance312, type Acceptance312 } from "./masterShellAcceptance312";

type RecordData = Record<string, unknown>;
const isRecord = (x: unknown): x is RecordData =>
  !!x && typeof x === "object" && !Array.isArray(x);

export type Acceptance313 = Acceptance312 & {
  source312MainAtReconciliation: string;
  controller378MainAtReconciliation: string;
  commsQl422MainAtReconciliation: string;
  signedOriginalHostPilot: string;
  ql421ClosureReadback: string;
  controllerOwnerContinuity: string;
  privateEpisodeJournal: string;
  ownerAcceptance: string;
  originalHostUptime: string;
};

/** Status-only validation: never treat a browser payload as signed custody. */
export function inspectMasterAcceptance313(value: unknown): Acceptance313 | null {
  if (!isRecord(value) ||
      value.schema !== "rosevear.ai-hub.master360-signed-pilot-continuity313.v1" ||
      value.sourceBuild !== 313 ||
      value.source312MainAtReconciliation !== "e64e4b2e79e7c07bbd077284c298207414b149ad" ||
      value.controller378MainAtReconciliation !== "a0eea834c7e8d62232a70b13b06688c6b9b4babc" ||
      value.commsQl422MainAtReconciliation !== "5f360821b361b43dd28aa5b2ca4c147565a84f0a" ||
      value.signedOriginalHostPilot !== "HOLD_NO_INDEPENDENT_SIGNED_REE_PILOT_RECEIPT" ||
      value.ql421ClosureReadback !== "HOLD_NO_AUTHENTICATED_QL422_CLOSURE_LEDGER" ||
      value.controllerOwnerContinuity !== "HOLD_NO_INDEPENDENT_SIGNED_OWNER_REVIEW" ||
      value.privateEpisodeJournal !== "NO_PROTECTED_LIVE_EPISODE_IMPORTED" ||
      value.ownerAcceptance !== "HOLD" ||
      value.originalHostUptime !== "UNKNOWN_NO_ORIGINAL_REE_ATTESTATION" ||
      value.automationHost !== "DESKTOP-AE894KC_ONLY" ||
      value.receiver !== "OFF" || value.connection !== "HOLD" ||
      value.masterSync !== "HOLD" || value.newWindowsScheduledTasks !== 0) {
    return null;
  }
  const prior = {
    ...value, schema: "rosevear.ai-hub.master360-protected-pilot312.v1",
    sourceBuild: 312,
  };
  return inspectMasterAcceptance312(prior) ? value as Acceptance313 : null;
}
