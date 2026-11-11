import { describe, expect, it } from "vitest";
import { inspectMasterAcceptance307 } from "./masterShellAcceptance307";

const safe = {
  schema: "rosevear.ai-hub.master360-three-master-acceptance307.v1",
  sourceBuild: 307,
  sourceId: "rosevear-ai-hub", originalHost: "DESKTOP-AE894KC",
  sourceMain305AtReconciliation: "27b234337f5a3f041dfca4541e33ed6aa821fa4f",
  controllerMain361AtReconciliation: "69355a853f10bbe4d3785bcede8b44e0c788be65",
  commsMainQl412AtReconciliation: "e42ffa856595a2d24c634653d83b1d80f2d6eaa4",
  controller360Contract: "4b45b435fa7b6fc83b94e31556648fe4190a9f53",
  expectedInstalledRevision306: "2780e94077fcee154a22e0e61ace72c36410cb90",
  commsMainQl413AtReconciliation: "c670c2523001294e8ac2e4f283a1f8e5edda3ddb",
  aiDataMain366AtReconciliation: "a5ba69a3e09fb4dd41f2b7586db027ba3e819301",
  protectedReceiptSchema: "rosevear.master360.protected-receipt.v1",
  commsQl414AckSchema: "PROPOSED_NOT_INSTALLED",
  originalHostFieldReview: "HOLD_NO_INDEPENDENT_BUILD306_PROCESS_REVIEW",
  sourceCommsOneReceiptChain: "HOLD_NO_AUTHENTICATED_RECEIVER_ACK",
  aiDataUptimeExchange: "HOLD_NO_ORIGINAL_HOST_SIGNED_RECEIPT_ACCEPTED_BY_CONTROLLER",
  observedLocalTrend: [],
  trendLabel: "OBSERVED_LOCAL_TCP_REACHABILITY_NOT_END_TO_END_UPTIME",
  installedReleaseAcceptance: "HOLD_NO_INDEPENDENT_SIGNED_REE_FIELD_REVIEW_IMPORTED",
  sourceOneTestImport: "HOLD_NO_OWNER_AUTHORIZED_SIGNED_SOURCE_ENVELOPE_IMPORTED",
  commsAck: "HOLD_NO_SIGNED_QL412_RECEIVER_ACK",
  automationHost: "DESKTOP-AE894KC_ONLY", newWindowsScheduledTasks: 0,
  existingLauncherChanged: false, existingRecoveryTaskChanged: false,
  receiver: "OFF", connection: "HOLD", slaveGate: "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
  masterSources: [
    { id: "rosevear-ai-hub", state: "HOLD_NO_FRESH_ORIGINAL_HOST_SAMPLES" },
    { id: "ai-data-platform", state: "HOLD_NO_AUTHENTICATED_CONTROLLER_UPTIME_PROJECTION" },
    { id: "rosevear-comms-hub", state: "HOLD_NO_SIGNED_RECEIVER_UPTIME_ACK" },
  ],
};

describe("Build 307 public projection must not grant trust", () => {
  it("accepts only the source-only HOLD contract", () => {
    expect(inspectMasterAcceptance307(safe)).not.toBeNull();
  });
  it("rejects forged receiver, master sync and missing protected proof", () => {
    expect(inspectMasterAcceptance307({ ...safe, connection: "CONNECTED" })).toBeNull();
    expect(inspectMasterAcceptance307({ ...safe, receiver: "ON" })).toBeNull();
    expect(inspectMasterAcceptance307({ ...safe, sourceCommsOneReceiptChain: "VERIFIED" })).toBeNull();
    expect(inspectMasterAcceptance307({ ...safe, originalHostFieldReview: "VERIFIED" })).toBeNull();
  });
  it("rejects stale revisions, false source and duplicate Windows tasks", () => {
    expect(inspectMasterAcceptance307({ ...safe, expectedInstalledRevision306: "b".repeat(40) })).toBeNull();
    expect(inspectMasterAcceptance307({ ...safe, sourceId: "TEMPLAR" })).toBeNull();
    expect(inspectMasterAcceptance307({ ...safe, newWindowsScheduledTasks: 1 })).toBeNull();
  });
});
