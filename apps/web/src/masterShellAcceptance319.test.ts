import { describe, expect, it } from "vitest";
import { inspectMasterAcceptance319 } from "./masterShellAcceptance319";

describe("Build 319 QL-428 owner-only external anchor source HOLD", () => {
  it("rejects missing fields and forged pilot re-entry", () => {
    expect(inspectMasterAcceptance319(null)).toBeNull();
    expect(inspectMasterAcceptance319({ sourceBuild: 319 })).toBeNull();
    expect(inspectMasterAcceptance319({
      schema: "rosevear.ai-hub.master360-ql428-anchor-reentry319.v1",
      sourceBuild: 319, ql428OffHostAnchor: "VERIFIED",
      receiver: "ON", connection: "CONNECTED", ownerAcceptance: "ACCEPTED",
    })).toBeNull();
  });
});
