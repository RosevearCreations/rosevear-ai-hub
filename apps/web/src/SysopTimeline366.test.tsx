import { describe, expect, it } from "vitest";
import { trustedHistory366 } from "./SysopTimeline366";

const ids = [
  "ai-data-platform", "rosevear-ai-hub", "rosevear-comms-hub",
  "yw", "icamp", "rosiedazzlers", "devilndove",
];
const source = {
  schema: "rosevear.hub.sysop-history366.v1",
  sourceBuild: 366,
  originalHost: "DESKTOP-AE894KC",
  serverShell: "ai-data-platform",
  journalStatus: "HOLD_NOT_ORIGINAL_HOST_OR_UNCONFIGURED",
  historyCount: 0,
  sources: ids.map(appId => ({
    appId, recordCount: 0, lastClaimedAtMs: null, freshSignedSourceOnly: false,
  })),
  events: [],
  liveConnectedSourceCount: 0,
  liveAuthenticatedTransportVerified: false,
  physicalRebootIndependentlyWitnessed: false,
  threeMasterRuntimeGreen: false,
  commsPrivateReceiverAuthorized: false,
  webMutationAvailable: false,
};

describe("Build 366 historical signed claims fail closed", () => {
  it("allows only the exact seven-app read-only HOLD source", () => {
    expect(trustedHistory366(source)).toBe(true);
    expect(trustedHistory366({ ...source, liveConnectedSourceCount: 7 })).toBe(false);
    expect(trustedHistory366({ ...source, webMutationAvailable: true })).toBe(false);
    expect(trustedHistory366({ ...source, physicalRebootIndependentlyWitnessed: true })).toBe(false);
  });
  it("rejects fake source identities, fabricated health and unbounded history", () => {
    expect(trustedHistory366({ ...source, sources: [{ ...source.sources[0] }] })).toBe(false);
    expect(trustedHistory366({ ...source, historyCount: 9000 })).toBe(false);
    expect(trustedHistory366({
      ...source,
      events: [{ appId: "rosevear-ai-hub", eventKind: "HOST_BOOT_OBSERVED",
        observedAtMs: 1800000000000, liveAuthenticatedTransportVerified: true,
        physicalRebootIndependentlyWitnessed: false }],
    })).toBe(false);
  });
});
