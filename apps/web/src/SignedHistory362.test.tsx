import { describe, expect, it } from "vitest";
import { trustedHistory362 } from "./SignedHistory362";

const baseline = {
  schema: "rosevear.hub.ql471.signed-history-dashboard362.v1",
  sourceBuild: 362,
  originalHost: "DESKTOP-AE894KC",
  serverShell: "ai-data-platform",
  signedClaimsAreLiveMeasurements: false,
  signaturesReverifiedAtRead: false,
  physicalUnattendedProductionGreen: false,
  threeMasterWorkerProductionGreen: false,
  commsPrivateReceiverAuthorized: false,
  pilotInstallAuthorized: false,
  webMutationAvailable: false,
  ledgerIntegrity: "HOLD_UNAVAILABLE",
  historyCount: 0,
  drills: [],
  masterPilotReadiness: {
    "ai-data-platform": "HOLD_INDEPENDENT_OWNER_INSTALL_AND_SIGNED_ACK",
    "rosevear-comms-hub": "HOLD_INDEPENDENT_OWNER_INSTALL_AND_SIGNED_ACK",
  },
};

describe("QL-471 signed history is never a production or worker activation claim", () => {
  it("accepts only a bounded read-only schema", () => {
    expect(trustedHistory362(baseline)).toBe(true);
    expect(trustedHistory362({ ...baseline, commsPrivateReceiverAuthorized: true })).toBe(false);
    expect(trustedHistory362({ ...baseline, physicalUnattendedProductionGreen: true })).toBe(false);
    expect(trustedHistory362({ ...baseline, signaturesReverifiedAtRead: true })).toBe(false);
    expect(trustedHistory362({ ...baseline, webMutationAvailable: true })).toBe(false);
  });
  it("rejects fake healthy drilled histories", () => {
    expect(trustedHistory362({
      ...baseline,
      drills: [{
        drillId: "synthetic_A", eventsRecorded: 2, pairedClaimTimeline: true,
        physicalRecoveryIndependentlyVerified: true, scopes: ["reboot-before", "reboot-after"],
      }],
    })).toBe(false);
    expect(trustedHistory362({ ...baseline, historyCount: 1000 })).toBe(false);
    expect(trustedHistory362({
      ...baseline,
      masterPilotReadiness: {
        ...baseline.masterPilotReadiness, "ai-data-platform": "READY_FOR_AUTOSTART",
      },
    })).toBe(false);
  });
});
