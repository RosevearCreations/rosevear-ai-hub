import { inspectMasterAcceptance310, type Acceptance310 } from "./masterShellAcceptance310";

type Data = Record<string, unknown>;
const record = (v: unknown): v is Data => !!v && typeof v === "object" && !Array.isArray(v);

export type Discrepancy311 = {
  code: string;
  severity: "REVIEW" | "CRITICAL";
  slaMinutes: 15 | 60;
  observation: "UNVERIFIED";
  notification: "NOT_SENT";
  state: "HOLD";
};

export type Acceptance311 = Acceptance310 & {
  source310MainAtReconciliation: string;
  controller376MainAtReconciliation: string;
  commsQl420MainAtReconciliation: string;
  controllerContract: string;
  exportClosure: string;
  ownerDecision: string;
  discrepancies: Discrepancy311[];
};

const EXPECTED = [
  ["ORIGINAL_HOST_RELEASE", "REVIEW", 60],
  ["SIGNED_ONE_TEST_EXPORT", "REVIEW", 60],
  ["COMMS_SIGNED_ACK", "CRITICAL", 15],
  ["CONTROLLER_OWNER_DECISION", "REVIEW", 60],
] as const;

/** The owner UI validates a code-level HOLD snapshot, never private evidence. */
export function inspectMasterAcceptance311(value: unknown): Acceptance311 | null {
  if (!record(value) ||
    value.schema !== "rosevear.ai-hub.master360-private-convergence311.v1" ||
    value.sourceBuild !== 311 ||
    value.source310MainAtReconciliation !== "c090a9f00a82e20b0a799ad99423153d20eea7b4" ||
    value.controller376MainAtReconciliation !== "b1273edf4b2b38b5ca68371d9b171a1391d6f2f6" ||
    value.commsQl420MainAtReconciliation !== "3ef4a087d30b2c1cfc8c6d14256d7fdfd81331a4" ||
    value.controllerContract !== "PROPOSED_PRIVATE_SCHEMA_NOT_DEPLOYED" ||
    value.exportClosure !== "HOLD_NO_INDEPENDENT_SIGNED_RECEIVER_AND_CUSTODY" ||
    value.ownerDecision !== "HOLD_NO_PROTECTED_CONTROLLER_OWNER_DECISION" ||
    value.receiver !== "OFF" || value.connection !== "HOLD" ||
    value.masterSync !== "HOLD" || value.newWindowsScheduledTasks !== 0 ||
    !Array.isArray(value.discrepancies) || value.discrepancies.length !== EXPECTED.length) {
    return null;
  }
  if (!value.discrepancies.every((item, i) =>
    record(item) && Object.keys(item).length === 6 &&
    item.code === EXPECTED[i][0] && item.severity === EXPECTED[i][1] &&
    item.slaMinutes === EXPECTED[i][2] &&
    item.observation === "UNVERIFIED" && item.notification === "NOT_SENT" &&
    item.state === "HOLD")) {
    return null;
  }
  const previous = {
    ...value, schema: "rosevear.ai-hub.master360-field-adoption310.v1",
    sourceBuild: 310,
  };
  return inspectMasterAcceptance310(previous) ? value as Acceptance311 : null;
}
