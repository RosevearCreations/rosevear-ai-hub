import { inspectMasterAcceptance306, type Acceptance306 } from "./masterShellAcceptance306";

type RecordLike = Record<string, unknown>;
const record = (v: unknown): v is RecordLike => !!v && typeof v === "object" && !Array.isArray(v);

export type Acceptance308 = Acceptance306 & {
  automationHost: "DESKTOP-AE894KC_ONLY";
  installedRelease307Expected: string;
  commsQl414ContractRevision: string;
  commsQl415MainAtReconciliation: string;
  aiDataBuild367MainAtReconciliation: string;
  ql414ActualAckSchema: string;
  ql414RequestOperation: string;
  ql414Contract: string;
  installedBuild307Review: string;
  protectedOneTest: string;
  signedReceiverAck: string;
  ql415RuntimeReview: string;
  aiDataMasterEvidence: string;
};

/** Do not let untrusted response data upgrade a Master HOLD to CONNECTED. */
export function inspectMasterAcceptance308(value: unknown): Acceptance308 | null {
  if (!record(value) ||
    value.schema !== "rosevear.ai-hub.master360-three-master-acceptance308.v1" ||
    value.sourceBuild !== 308 ||
    value.installedRelease307Expected !== "34e017dcf0586a7281d8726d5e8fb4a4a7054526" ||
    value.commsQl414ContractRevision !== "182fe951379605cbb909e7072009b59c9e498126" ||
    value.commsQl415MainAtReconciliation !== "8c2d488582801e8abc5ca718b4719c615863274c" ||
    value.aiDataBuild367MainAtReconciliation !== "ff7ac9aea87e6d2e1d9ebc8d29b2fd784f901f01" ||
    value.ql414ActualAckSchema !== "rosevear.master360.ql414.receiver-ack.v1" ||
    value.ql414RequestOperation !== "MASTER360_ONE_TEST_READ_ONLY" ||
    value.ql414Contract !== "CODE_MATCHED_PROTECTED_IN_PROCESS_ONLY" ||
    value.installedBuild307Review !== "HOLD_NO_ORIGINAL_REE_SIGNED_FIELD_EVIDENCE" ||
    value.protectedOneTest !== "HOLD_NO_OWNER_APPROVED_ORIGINAL_HOST_OPERATION" ||
    value.signedReceiverAck !== "HOLD_NO_AUTHENTICATED_QL414_RUNTIME_RECEIVER" ||
    value.ql415RuntimeReview !== "HOLD_NO_INDEPENDENT_PIN_AND_REPLAY_EVIDENCE" ||
    value.aiDataMasterEvidence !== "HOLD_NO_AUTHENTICATED_CONTROLLER_ACCEPTANCE") return null;
  const previous = {...value, schema: "rosevear.ai-hub.master360-three-master-acceptance306.v1", sourceBuild: 306};
  if (!inspectMasterAcceptance306(previous)) return null;
  return value as Acceptance308;
}
