import { inspectMasterAcceptance320, type Acceptance320 } from "./masterShellAcceptance320";

type Fields = Record<string, unknown>;
const record = (v: unknown): v is Fields =>
  !!v && typeof v === "object" && !Array.isArray(v);

export type Acceptance321 = Acceptance320 & {
  source320MainAtReconciliation: string;
  commsQl430ContractAtReconciliation: string;
  ql430ProtectedOperator: string;
  ql430PriorQl429Witness: string;
  ql430NewQl424Ceremony: string;
  ql430SignedQl423Replay: string;
  ql430ReceiverExecution: string;
  ql430IndependentReceiver: string;
  ql430Ql424ThreeMaster: string;
  ql430ThreeMasterRuntime: string;
  ql430DualOwnerRuntime: string;
  ql430DurablePilot: string;
  ql430FailClosedShutdown: string;
};

/** Browser can only render immutable source HOLD, never submit runtime proof. */
export function inspectMasterAcceptance321(value: unknown): Acceptance321 | null {
  if (!record(value) ||
      value.schema !== "rosevear.ai-hub.master360-ql430-runtime-pilot321.v1" ||
      value.sourceBuild !== 321 ||
      value.source320MainAtReconciliation !== "146f8c4c22a7155c9c7e08b0f7697dffc25754a9" ||
      value.commsQl430ContractAtReconciliation !== "a7625fed29e0b4dd6b41b8454e576828b19d6d6e" ||
      value.controller380MainAtReconciliation !== "ccd291f22e15750392fa3995dc3d5811c506cd05" ||
      value.ql430ProtectedOperator !== "HOLD_NO_REAL_ORIGINAL_HOST_SUPERVISED_SESSION" ||
      value.ql430PriorQl429Witness !== "HOLD_NO_FRESH_SIGNED_WITNESS_CUSTODY" ||
      value.ql430NewQl424Ceremony !== "HOLD_NO_NEW_DUAL_SIGNED_ONE_TEST_AUTHORITY" ||
      value.ql430SignedQl423Replay !== "HOLD_NO_FRESH_PROTECTED_REPLAY_RESTORATION" ||
      value.ql430ReceiverExecution !== "HOLD_NO_ACTUAL_ORIGINAL_HOST_ONE_TEST" ||
      value.ql430IndependentReceiver !== "HOLD_NO_SEPARATE_FRESH_SIGNED_RUNTIME_ON" ||
      value.ql430Ql424ThreeMaster !== "HOLD_NO_QL424_LIVE_THREE_MASTER_ACCEPTANCE" ||
      value.ql430ThreeMasterRuntime !== "HOLD_NO_QL430_SEPARATE_THREE_MASTER_REPORTS" ||
      value.ql430DualOwnerRuntime !== "HOLD_NO_DUAL_SIGNED_LIVE_OWNER_ACCEPTANCE" ||
      value.ql430DurablePilot !== "HOLD_NO_ONE_USE_INDEPENDENT_RUNTIME_CUSTODY" ||
      value.ql430FailClosedShutdown !== "HOLD_NO_SIGNED_SHUTDOWN_READBACK" ||
      value.runtimeUptime !== "UNKNOWN_NO_CONTINUOUS_ORIGINAL_HOST_MONITORING" ||
      value.originalHostUptime !== "UNKNOWN_NO_ORIGINAL_REE_ATTESTATION" ||
      value.ownerAcceptance !== "HOLD" || value.receiver !== "OFF" ||
      value.connection !== "HOLD" || value.masterSync !== "HOLD" ||
      value.automationHost !== "DESKTOP-AE894KC_ONLY" ||
      value.newWindowsScheduledTasks !== 0) return null;
  const previous = {
    ...value, schema: "rosevear.ai-hub.master360-ql429-enrollment-witness320.v1",
    sourceBuild: 320,
  };
  return inspectMasterAcceptance320(previous) ? value as Acceptance321 : null;
}
