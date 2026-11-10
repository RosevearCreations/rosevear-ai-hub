import { describe, expect, it } from "vitest";
import { inspectMasterAcceptance306 } from "./masterShellAcceptance306";

const base = {
  schema: "rosevear.ai-hub.master360-three-master-acceptance306.v1",
  sourceId: "rosevear-ai-hub", sourceBuild: 306,
  originalHost: "DESKTOP-AE894KC",
  sourceMain305AtReconciliation: "27b234337f5a3f041dfca4541e33ed6aa821fa4f",
  controllerMain361AtReconciliation: "69355a853f10bbe4d3785bcede8b44e0c788be65",
  commsMainQl412AtReconciliation: "e42ffa856595a2d24c634653d83b1d80f2d6eaa4",
  controller360Contract: "4b45b435fa7b6fc83b94e31556648fe4190a9f53",
  observedLocalTrend: [{ dayUtc: "2026-11-10", observedMinutes: 2,
    reachableMinutes: { hub_api: 1, hub_web: 2, caddy_proxy: 0 } }],
  trendLabel: "OBSERVED_LOCAL_TCP_REACHABILITY_NOT_END_TO_END_UPTIME",
  masterSources: [
    { id: "rosevear-ai-hub", state: "LOCAL_REE_SAMPLES_NOT_MASTER_ACCEPTANCE" },
    { id: "ai-data-platform", state: "HOLD_NO_AUTHENTICATED_CONTROLLER_UPTIME_PROJECTION" },
    { id: "rosevear-comms-hub", state: "HOLD_NO_SIGNED_RECEIVER_UPTIME_ACK" },
  ],
  installedReleaseAcceptance: "HOLD_NO_INDEPENDENT_SIGNED_REE_FIELD_REVIEW_IMPORTED",
  sourceOneTestImport: "HOLD_NO_OWNER_AUTHORIZED_SIGNED_SOURCE_ENVELOPE_IMPORTED",
  commsAck: "HOLD_NO_SIGNED_QL412_RECEIVER_ACK", automationHost: "DESKTOP-AE894KC_ONLY",
  newWindowsScheduledTasks: 0, existingLauncherChanged: false,
  existingRecoveryTaskChanged: false, receiver: "OFF", connection: "HOLD",
  slaveGate: "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
};

describe("Build 306 three-master source status", () => {
  it("accepts bounded, honest original-source observed trends", () => {
    expect(inspectMasterAcceptance306(base)?.observedLocalTrend).toHaveLength(1);
  });
  it("rejects fabricated connection, external uptime, and invalid observations", () => {
    expect(inspectMasterAcceptance306({ ...base, connection: "CONNECTED" })).toBeNull();
    expect(inspectMasterAcceptance306({ ...base, newWindowsScheduledTasks: 1 })).toBeNull();
    expect(inspectMasterAcceptance306({ ...base, commsAck: "VERIFIED" })).toBeNull();
    expect(inspectMasterAcceptance306({ ...base, masterSources: [
      base.masterSources[0], { id: "ai-data-platform", state: "ONLINE" }, base.masterSources[2],
    ] })).toBeNull();
    expect(inspectMasterAcceptance306({ ...base, observedLocalTrend: [{
      dayUtc: "2026-11-10", observedMinutes: 2,
      reachableMinutes: { hub_api: 3, hub_web: 0, caddy_proxy: 0 },
    }] })).toBeNull();
  });
});
