import { describe, expect, it } from "vitest";
import { inspectMasterAcceptance327 } from "./masterShellAcceptance327";

describe("Build 327 QL-436 source-only signed OFF continuity", () => {
  it("rejects browser-only OFF, CONNECTED and activation claims", () => {
    expect(inspectMasterAcceptance327(null)).toBeNull();
    expect(inspectMasterAcceptance327({ sourceBuild: 327 })).toBeNull();
    expect(inspectMasterAcceptance327({
      schema: "rosevear.ai-hub.master360-ql436-shutdown327.v1",
      sourceBuild: 327,
      receiver: "OFF_VERIFIED_HOST_AND_INDEPENDENT_READBACK",
      connection: "CONNECTED",
      activationAuthorized: true,
    })).toBeNull();
  });
});
