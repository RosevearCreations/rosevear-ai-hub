import { describe, expect, it } from "vitest";
import { trustedAcceptance361 } from "./AcceptanceDashboard361";

const sample = {
  schema: "rosevear.hub.ql470.acceptance-dashboard361.v1",
  sourceBuild: 361, serverShell: "ai-data-platform", originalHost: "DESKTOP-AE894KC",
  physicalUnattendedProductionGreen: false, threeMasterWorkerProductionGreen: false,
  commsPrivateReceiverAuthorized: false, authenticatedDeviceRuntimeVerified: false,
  independentSignedMasterWorkerAckVerified: false, liveMasterConnectivityVerified: false,
  webMutationAvailable: false, taskSchedulerHistoryIsNamedTaskProof: false,
  tasks: ["Rosevear AI Hub Unattended Boot", "Rosevear AI Hub Unattended Recovery"].map(name => ({
    name, identityVerified: false, unattendedBootProven: false,
  })),
  masterServices: ["Rosevear-AIHub", "Rosevear-AIDataPlatform", "Rosevear-CommsHub"].map(name => ({
    name, enrollmentApproved: false, peerSignedAckVerified: false, rollbackReady: false,
  })),
  fieldEvidence: {
    reboot: "HOLD", guest: "HOLD", "ai-data-worker": "HOLD", "comms-worker": "HOLD",
  },
  holdCodes: ["HOLD_ORIGINAL_HOST"],
};

describe("QL-470 owner dashboard rejects inferred GREEN and invented authority", () => {
  it("only renders a complete read-only HOLD contract", () => {
    expect(trustedAcceptance361(sample)).toBe(true);
    expect(trustedAcceptance361({ ...sample, physicalUnattendedProductionGreen: true })).toBe(false);
    expect(trustedAcceptance361({ ...sample, commsPrivateReceiverAuthorized: true })).toBe(false);
    expect(trustedAcceptance361({ ...sample, liveMasterConnectivityVerified: true })).toBe(false);
  });
  it("rejects missing Master workers and fabricated identity", () => {
    expect(trustedAcceptance361({ ...sample, tasks: [] })).toBe(false);
    expect(trustedAcceptance361({
      ...sample, masterServices: [{ ...sample.masterServices[0], enrollmentApproved: true },
        ...sample.masterServices.slice(1)],
    })).toBe(false);
    expect(trustedAcceptance361({ ...sample, fieldEvidence: { guest: "GREEN" } })).toBe(false);
  });
});
