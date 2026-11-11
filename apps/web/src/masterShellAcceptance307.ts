import { inspectMasterAcceptance306, type Acceptance306 } from "./masterShellAcceptance306";

type JsonRecord = Record<string, unknown>;
const rec = (v: unknown): v is JsonRecord => !!v && typeof v === "object" && !Array.isArray(v);
export type Acceptance307 = Acceptance306 & {
  expectedInstalledRevision306: string;
  originalHostFieldReview: string;
  sourceCommsOneReceiptChain: string;
  aiDataUptimeExchange: string;
};

/** Separate code readiness from real signed host and receiver acceptance. */
export function inspectMasterAcceptance307(value: unknown): Acceptance307 | null {
  if (!rec(value) ||
    value.schema !== "rosevear.ai-hub.master360-three-master-acceptance307.v1" ||
    value.sourceBuild !== 307 ||
    value.expectedInstalledRevision306 !== "2780e94077fcee154a22e0e61ace72c36410cb90" ||
    value.commsMainQl413AtReconciliation !== "c670c2523001294e8ac2e4f283a1f8e5edda3ddb" ||
    value.aiDataMain366AtReconciliation !== "a5ba69a3e09fb4dd41f2b7586db027ba3e819301" ||
    value.protectedReceiptSchema !== "rosevear.master360.protected-receipt.v1" ||
    value.commsQl414AckSchema !== "PROPOSED_NOT_INSTALLED" ||
    value.originalHostFieldReview !== "HOLD_NO_INDEPENDENT_BUILD306_PROCESS_REVIEW" ||
    value.sourceCommsOneReceiptChain !== "HOLD_NO_AUTHENTICATED_RECEIVER_ACK" ||
    value.aiDataUptimeExchange !== "HOLD_NO_ORIGINAL_HOST_SIGNED_RECEIPT_ACCEPTED_BY_CONTROLLER") return null;
  const normalized = {
    ...value,
    schema: "rosevear.ai-hub.master360-three-master-acceptance306.v1",
    sourceBuild: 306,
  };
  if (!inspectMasterAcceptance306(normalized)) return null;
  return value as Acceptance307;
}
