import { inspectMasterAcceptance311, type Acceptance311 } from "./masterShellAcceptance311";

type Data = Record<string, unknown>;
const record = (v: unknown): v is Data => !!v && typeof v === "object" && !Array.isArray(v);
const MASTERS = ["rosevear-ai-hub", "rosevear-comms-hub", "ai-data-platform"];

export type Acceptance312 = Acceptance311 & {
  source311MainAtReconciliation: string;
  commsQl421MainAtReconciliation: string;
  schemaNegotiation: string;
  originalHostPilot: string;
  incidentHandoff: string;
  ownerCertification: string;
  handoffMasters: { master: string; state: string }[];
};

/** Only an exact code-level HOLD snapshot is safe for owner display. */
export function inspectMasterAcceptance312(value: unknown): Acceptance312 | null {
  if (!record(value) ||
      value.schema !== "rosevear.ai-hub.master360-protected-pilot312.v1" ||
      value.sourceBuild !== 312 ||
      value.source311MainAtReconciliation !== "41b3d69962dd22480badf26fc6a65dfb59f88ac9" ||
      value.controller376MainAtReconciliation !== "b1273edf4b2b38b5ca68371d9b171a1391d6f2f6" ||
      value.commsQl421MainAtReconciliation !== "a89a885ce444f266da00d9311eeece1811d482e2" ||
      value.schemaNegotiation !== "HOLD_NO_INDEPENDENT_CONTROLLER_SCHEMA_ADOPTION" ||
      value.originalHostPilot !== "HOLD_NO_AUTHENTICATED_REE_PILOT_EVIDENCE" ||
      value.incidentHandoff !== "HOLD_NO_THREE_SIGNED_MASTER_RECEIPTS" ||
      value.ownerCertification !== "HOLD_NO_INDEPENDENT_OWNER_CLOSURE_DECISION" ||
      value.receiver !== "OFF" || value.connection !== "HOLD" ||
      value.masterSync !== "HOLD" || value.automationHost !== "DESKTOP-AE894KC_ONLY" ||
      value.newWindowsScheduledTasks !== 0 ||
      !Array.isArray(value.handoffMasters) || value.handoffMasters.length !== 3 ||
      !value.handoffMasters.every((item, i) => record(item) &&
        Object.keys(item).length === 2 &&
        item.master === MASTERS[i] && item.state === "HOLD_NO_INDEPENDENT_RECEIPT")) {
    return null;
  }
  const previous = {
    ...value, schema: "rosevear.ai-hub.master360-private-convergence311.v1",
    sourceBuild: 311,
  };
  return inspectMasterAcceptance311(previous) ? value as Acceptance312 : null;
}
