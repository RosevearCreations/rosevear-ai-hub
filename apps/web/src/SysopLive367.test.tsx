import { describe, expect, it } from "vitest";
import { trustedSysopLive367 } from "./SysopLive367";

const IDS = [
  "ai-data-platform", "rosevear-ai-hub", "rosevear-comms-hub",
  "yw", "icamp", "rosiedazzlers", "devilndove",
];

const hold = {
  schema: "rosevear.hub.live-sources367.v1",
  sourceBuild: 367,
  originalHost: "DESKTOP-AE894KC",
  serverShell: "ai-data-platform",
  status: "HOLD_NOT_ORIGINAL_HOST_OR_UNCONFIGURED",
  sources: IDS.map(appId => ({
    appId, receiptCount: 0, lastTlsSignedReceiptMs: null, freshTlsSignedSourceOnly: false,
  })),
  verifiedTlsSignedReceiptCount: 0,
  verifiedThreeMasterDeliveryAcks: 0,
  threeMasterRuntimeGreen: false,
  allSevenLiveConnected: false,
  commsPrivateReceiverAuthorized: false,
  physicalBootIndependentlyWitnessed: false,
  webMutationsEnabled: false,
};

describe("Build 367 independent source readback", () => {
  it("allows the explicit, unconfigured seven-app HOLD", () => {
    expect(trustedSysopLive367(hold)).toBe(true);
    expect(trustedSysopLive367({
      ...hold, status: "LOCAL_TLS_SIGNED_SOURCE_RECEIPTS_ONLY",
      verifiedTlsSignedReceiptCount: 1,
      sources: hold.sources.map((item, index) => index === 0 ? {
        ...item, receiptCount: 1, lastTlsSignedReceiptMs: 1800000000000,
        freshTlsSignedSourceOnly: true,
      } : item),
    })).toBe(true);
  });
  it("rejects fabricated Master ACK, connected flags, peer names and huge counts", () => {
    expect(trustedSysopLive367({ ...hold, verifiedThreeMasterDeliveryAcks: 1 })).toBe(false);
    expect(trustedSysopLive367({ ...hold, threeMasterRuntimeGreen: true })).toBe(false);
    expect(trustedSysopLive367({ ...hold, allSevenLiveConnected: true })).toBe(false);
    expect(trustedSysopLive367({ ...hold, commsPrivateReceiverAuthorized: true })).toBe(false);
    expect(trustedSysopLive367({ ...hold, physicalBootIndependentlyWitnessed: true })).toBe(false);
    expect(trustedSysopLive367({ ...hold, sources: hold.sources.slice(1) })).toBe(false);
    expect(trustedSysopLive367({ ...hold, verifiedTlsSignedReceiptCount: 99999 })).toBe(false);
  });
});
