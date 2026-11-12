import { describe, expect, it } from "vitest";
import { inspectMasterAcceptance312 } from "./masterShellAcceptance312";

describe("Build 312 protected source status", () => {
  it("rejects missing pilot evidence and untrusted active connection claims", () => {
    expect(inspectMasterAcceptance312(null)).toBeNull();
    expect(inspectMasterAcceptance312({ schema: "rosevear.ai-hub.master360-protected-pilot312.v1" })).toBeNull();
    expect(inspectMasterAcceptance312({ sourceBuild: 312, connection: "CONNECTED" })).toBeNull();
  });
});
