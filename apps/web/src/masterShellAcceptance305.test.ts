import { describe, expect, it } from "vitest";
import { inspectMasterAcceptance305 } from "./masterShellAcceptance305";

const installedRelease = {
  schema: "rosevear.ai-hub.original-release-review-305.v1",
  sourceId: "rosevear-ai-hub", expectedHost: "DESKTOP-AE894KC",
  originalHostObserved: false, automationHostEnforced: false,
  latestCodeRelease304: "1".repeat(40), recordedReleaseSha: null,
  recorded304Matches: false, installedProcessRevisionVerified: false,
  build305InstalledVerified: false, independentReviewerVerified: false,
  state: "HOLD_WRONG_HOST_OR_OS", monitoringState: "HOLD_NOT_ORIGINAL_REE_HOST",
  durableHistoryState: "HOLD_NOT_VERIFIED", durableSamples: 0,
  newWindowsScheduledTasks: 0, existingLauncherChanged: false,
  existingRecoveryTaskChanged: false, connection: "HOLD",
};
const durableMonitoring = {
  schema: "rosevear.ai-hub.ree-durable-uptime.v1", sourceId: "rosevear-ai-hub",
  sourceRole: "SOURCE", connection: "HOLD", historyWindowDays: 7,
  newWindowsScheduledTasks: 0, sampleCount: 0, lastSampleAtUtc: null,
  collectionState: "HOLD_NOT_ORIGINAL_REE_HOST", services: [],
};
const candidate = {
  schema: "rosevear.ai-hub.master360-acceptance-305.v1", sourceId: "rosevear-ai-hub",
  sourceBuild: 305, controller: "ai-data-platform", controllerBuild: 360,
  automationHost: "REE_ORIGINAL_WINDOWS_ONLY", newWindowsScheduledTasks: 0,
  commsQl412: "HOLD_CONTRACT_NOT_YET_ON_COMMS_MAIN",
  oneTest: "HOLD_OWNER_APPROVED_PROTECTED_SOURCE_SIGNATURE_NOT_EXECUTED",
  commsAck: "HOLD_INDEPENDENT_RECEIVER_SIGNATURE_NOT_VERIFIED",
  connection: "HOLD", slaveGate: "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
  installedRelease, durableMonitoring,
};

describe("Build 305 Master360 source-side owner acceptance", () => {
  it("accepts valid fail-closed local observations", () => {
    expect(inspectMasterAcceptance305(candidate)?.installedRelease.state).toBe("HOLD_WRONG_HOST_OR_OS");
  });
  it("refuses claimed installation, receiver, connection and duplicate tasks", () => {
    expect(inspectMasterAcceptance305({ ...candidate, connection: "CONNECTED" })).toBeNull();
    expect(inspectMasterAcceptance305({ ...candidate, newWindowsScheduledTasks: 1 })).toBeNull();
    expect(inspectMasterAcceptance305({ ...candidate, installedRelease: {
      ...installedRelease, installedProcessRevisionVerified: true } })).toBeNull();
    expect(inspectMasterAcceptance305({ ...candidate, commsAck: "VERIFIED" })).toBeNull();
  });
});
