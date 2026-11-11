import { describe, expect, it } from "vitest";
import { inspectMasterAcceptance308 } from "./masterShellAcceptance308";

const base = {
  schema: "rosevear.ai-hub.master360-three-master-acceptance308.v1", sourceBuild: 308,
  sourceId: "rosevear-ai-hub", originalHost: "DESKTOP-AE894KC",
  sourceMain305AtReconciliation: "27b234337f5a3f041dfca4541e33ed6aa821fa4f",
  controllerMain361AtReconciliation: "69355a853f10bbe4d3785bcede8b44e0c788be65",
  commsMainQl412AtReconciliation: "e42ffa856595a2d24c634653d83b1d80f2d6eaa4",
  controller360Contract: "4b45b435fa7b6fc83b94e31556648fe4190a9f53",
  installedRelease307Expected: "34e017dcf0586a7281d8726d5e8fb4a4a7054526",
  commsQl414ContractRevision: "182fe951379605cbb909e7072009b59c9e498126",
  commsQl415MainAtReconciliation: "8c2d488582801e8abc5ca718b4719c615863274c",
  aiDataBuild367MainAtReconciliation: "ff7ac9aea87e6d2e1d9ebc8d29b2fd784f901f01",
  ql414ActualAckSchema: "rosevear.master360.ql414.receiver-ack.v1",
  ql414RequestOperation: "MASTER360_ONE_TEST_READ_ONLY",
  ql414Contract: "CODE_MATCHED_PROTECTED_IN_PROCESS_ONLY",
  installedBuild307Review: "HOLD_NO_ORIGINAL_REE_SIGNED_FIELD_EVIDENCE",
  protectedOneTest: "HOLD_NO_OWNER_APPROVED_ORIGINAL_HOST_OPERATION",
  signedReceiverAck: "HOLD_NO_AUTHENTICATED_QL414_RUNTIME_RECEIVER",
  ql415RuntimeReview: "HOLD_NO_INDEPENDENT_PIN_AND_REPLAY_EVIDENCE",
  aiDataMasterEvidence: "HOLD_NO_AUTHENTICATED_CONTROLLER_ACCEPTANCE",
  observedLocalTrend: [], trendLabel: "OBSERVED_LOCAL_TCP_REACHABILITY_NOT_END_TO_END_UPTIME",
  installedReleaseAcceptance: "HOLD_NO_INDEPENDENT_SIGNED_REE_FIELD_REVIEW_IMPORTED",
  sourceOneTestImport: "HOLD_NO_OWNER_AUTHORIZED_SIGNED_SOURCE_ENVELOPE_IMPORTED",
  commsAck: "HOLD_NO_SIGNED_QL412_RECEIVER_ACK",
  automationHost: "DESKTOP-AE894KC_ONLY", newWindowsScheduledTasks: 0,
  existingLauncherChanged: false, existingRecoveryTaskChanged: false,
  receiver: "OFF", connection: "HOLD", slaveGate: "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
  masterSources: [
    {id:"rosevear-ai-hub",state:"HOLD_NO_FRESH_ORIGINAL_HOST_SAMPLES"},
    {id:"ai-data-platform",state:"HOLD_NO_AUTHENTICATED_CONTROLLER_UPTIME_PROJECTION"},
    {id:"rosevear-comms-hub",state:"HOLD_NO_SIGNED_RECEIVER_UPTIME_ACK"},
  ],
};

describe("Build 308 original-host protected contract", () => {
  it("accepts exact QL-414 code contract with fail-closed runtime", () => {
    expect(inspectMasterAcceptance308(base)).not.toBeNull();
  });
  it("rejects stale contract and fabricated master acceptance", () => {
    expect(inspectMasterAcceptance308({...base, ql414ActualAckSchema:"rosevear.comms.ql414.source-one-test-ack.v1"})).toBeNull();
    expect(inspectMasterAcceptance308({...base, connection:"CONNECTED"})).toBeNull();
    expect(inspectMasterAcceptance308({...base, ql415RuntimeReview:"VERIFIED"})).toBeNull();
    expect(inspectMasterAcceptance308({...base, aiDataMasterEvidence:"ACCEPTED"})).toBeNull();
    expect(inspectMasterAcceptance308({...base, newWindowsScheduledTasks:1})).toBeNull();
  });
});
