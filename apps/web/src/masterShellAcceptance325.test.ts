import { describe, expect, it } from "vitest";
import { inspectMasterAcceptance325 } from "./masterShellAcceptance325";

describe("Build 325 QL-434 original-host readiness source-only", () => {
  it("rejects missing or browser-claimed activation authority", () => {
    expect(inspectMasterAcceptance325(null)).toBeNull();
    expect(inspectMasterAcceptance325({ sourceBuild: 325 })).toBeNull();
    expect(inspectMasterAcceptance325({
      schema: "rosevear.ai-hub.master360-ql434-readiness325.v1",
      sourceBuild: 325,
      activationAuthorized: true,
      connection: "CONNECTED",
      receiver: "ON",
    })).toBeNull();
  });
});
