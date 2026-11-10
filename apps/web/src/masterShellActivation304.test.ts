import { describe, expect, it } from "vitest";
import { inspectMasterActivation304 } from "./masterShellActivation304";

const monitor = {
  schema: "rosevear.ai-hub.ree-durable-uptime.v1", sourceId: "rosevear-ai-hub",
  sourceRole: "SOURCE", hostPolicy: "REE_ORIGINAL_WINDOWS_ONLY", connection: "HOLD",
  collectionState: "OBSERVING_REE_LOCAL", automationHostEnforced: true,
  sampleCount: 3, historyDurability: "SQLITE_7_DAYS_BOUNDED",
  lastSampleAtUtc: "2026-11-10T18:00:00Z",
  services: ["hub_api", "hub_web", "caddy_proxy"].map(id => ({ id,
    check: "LOOPBACK_TCP_ONLY", latestState: "TCP_REACHABLE", reachableSamples: 3,
    sampleCount: 3, observedAvailabilityPercent: 100 })),
  incidentCandidates: [],
};
const status = {
  schema: "rosevear.ai-hub.master360-activation-status.v1",
  controller: "ai-data-platform", controllerBuild: 360,
  sourceId: "rosevear-ai-hub", sourceRole: "SOURCE", monitoring: monitor,
  signedTelemetry: "HOLD_ORIGINAL_SIGNER_AND_OWNER_AUTHORIZATION_REQUIRED",
  commsIncidentHandoff: "HOLD_RECEIVER_ACK_NOT_INDEPENDENTLY_VERIFIED",
  slaveStage: "HOLD_NEXT_MASTER_INTEGRATION_STAGE", newWindowsScheduledTasks: 0,
  connections: { "ai-data-platform": "HOLD", "rosevear-comms-hub": "HOLD" },
};

describe("Build 304 owner-only Master 360 read", () => {
  it("renders original source with local monitoring and HOLD connections", () => {
    expect(inspectMasterActivation304(status)?.monitoring.sampleCount).toBe(3);
    expect(inspectMasterActivation304({ ...status, monitoring: { ...monitor,
      collectionState: "STALE_OR_NOT_YET_OBSERVED" } })).not.toBeNull();
  });
  it("fails closed for claimed trust, foreign hosts, duplication, and invalid services", () => {
    expect(inspectMasterActivation304({ ...status, connections: {
      ...status.connections, "ai-data-platform": "CONNECTED" } })).toBeNull();
    expect(inspectMasterActivation304({ ...status, newWindowsScheduledTasks: 1 })).toBeNull();
    expect(inspectMasterActivation304({ ...status, sourceId: "TEMPLAR" })).toBeNull();
    expect(inspectMasterActivation304({ ...status, monitoring: {
      ...monitor, connection: "CONNECTED" } })).toBeNull();
    expect(inspectMasterActivation304({ ...status, monitoring: {
      ...monitor, services: [monitor.services[0], monitor.services[0], monitor.services[2]] } })).toBeNull();
  });
});
