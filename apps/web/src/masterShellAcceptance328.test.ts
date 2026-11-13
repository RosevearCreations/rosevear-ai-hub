import { describe, expect, it } from "vitest";
import { inspectMasterAcceptance328 } from "./masterShellAcceptance328";

describe("Build 328 QL-437 independently anchored OFF source-only", () => {
  it("rejects browser claims of anchored evidence, live OFF or CONNECTED", () => {
    expect(inspectMasterAcceptance328(null)).toBeNull();
    expect(inspectMasterAcceptance328({ sourceBuild: 328 })).toBeNull();
    expect(inspectMasterAcceptance328({
      schema: "rosevear.ai-hub.master360-ql437-anchor328.v1",
      sourceBuild: 328,
      connection: "CONNECTED",
      activationAuthorized: true,
      receiver: "OFF_VERIFIED_HOST_AND_INDEPENDENT_READBACK",
    })).toBeNull();
  });
});
