import { describe, expect, it } from "vitest";
import { trustedSysop365 } from "./SevenAppSysop365Panel";

const ids = [
  "ai-data-platform",
  "rosevear-ai-hub",
  "rosevear-comms-hub",
  "yw",
  "icamp",
  "rosiedazzlers",
  "devilndove",
];
const sample = {
  schema: "rosevear.hub.sysop-seven-app365.v1",
  sourceBuild: 365,
  serverShell: "ai-data-platform",
  originalHost: "DESKTOP-AE894KC",
  acceptedSignedSourceSnapshots: 0,
  verifiedLiveConnections: 0,
  liveSevenAppStatisticsVerified: false,
  originalHostAutonomousBootVerified: false,
  commsPrivateReceiverAuthorized: false,
  webMutationAvailable: false,
  apps: ids.map(appId => ({
    appId, accepted: false, reason: "HOLD_UNENROLLED_OR_INVALID_STATISTICS", connected: false,
  })),
};

describe("seven-app Sysop signed aggregate source boundary", () => {
  it("shows missing peers without fabricated metrics or CONNECTED", () => {
    expect(trustedSysop365(sample)).toBe(true);
    expect(trustedSysop365({ ...sample, verifiedLiveConnections: 7 })).toBe(false);
    expect(trustedSysop365({ ...sample, commsPrivateReceiverAuthorized: true })).toBe(false);
    expect(trustedSysop365({ ...sample, originalHostAutonomousBootVerified: true })).toBe(false);
    expect(trustedSysop365({ ...sample, webMutationAvailable: true })).toBe(false);
  });
  it("rejects wrong source ordering and invented aggregate acceptance", () => {
    expect(trustedSysop365({
      ...sample, apps: [...sample.apps].reverse(),
    })).toBe(false);
    expect(trustedSysop365({
      ...sample, apps: sample.apps.map((x, i) => i === 2
        ? { ...x, accepted: true, reason: "SIGNED_AGGREGATE_SOURCE_ONLY" } : x),
    })).toBe(false);
  });
});
