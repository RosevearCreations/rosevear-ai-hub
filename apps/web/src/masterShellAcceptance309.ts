import { inspectMasterAcceptance308, type Acceptance308 } from "./masterShellAcceptance308";

type Data = Record<string, unknown>;
const record = (x: unknown): x is Data => !!x && typeof x === "object" && !Array.isArray(x);

export type Acceptance309 = Acceptance308 & {
  installedRelease308Expected: string;
  commsQl416MainAtReconciliation: string;
  aiDataBuild369MainAtReconciliation: string;
  operationalAdmission: string;
  ql416OperationalReview: string;
  controllerOwnerDecision: string;
  sampledUptime: string;
  masterSync: "HOLD";
};

/** Do not grant operational readiness from a forged or stale status response. */
export function inspectMasterAcceptance309(value: unknown): Acceptance309 | null {
  if (!record(value) ||
    value.schema !== "rosevear.ai-hub.master360-operational-acceptance309.v1" ||
    value.sourceBuild !== 309 ||
    value.installedRelease308Expected !== "cefc2b8859e51ca29f0255f69f8361161f8a117d" ||
    value.commsQl416MainAtReconciliation !== "95d5780f377c7e2fd3c357789cbc2566fcf03b6c" ||
    value.aiDataBuild369MainAtReconciliation !== "206aaf4f5007da10607efe692776256b90a9a28b" ||
    value.operationalAdmission !== "HOLD_ORIGINAL_HOST_SIGNED_ONE_TEST_AND_DURABLE_CHAIN" ||
    value.ql416OperationalReview !== "HOLD_INDEPENDENT_PROTECTED_COMMS_LEDGER" ||
    value.controllerOwnerDecision !== "HOLD_AI_DATA_VERIFIED_RUNTIME_AND_OWNER_DECISION" ||
    value.sampledUptime !== "UNKNOWN_NO_AUTHENTICATED_ORIGINAL_HOST_RECEIPT" ||
    value.masterSync !== "HOLD") return null;
  const historical = {
    ...value,
    schema: "rosevear.ai-hub.master360-three-master-acceptance308.v1",
    sourceBuild: 308,
  };
  return inspectMasterAcceptance308(historical) ? value as Acceptance309 : null;
}
