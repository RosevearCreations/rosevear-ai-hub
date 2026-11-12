import { describe, expect, it } from "vitest";
import { inspectMasterAcceptance317 } from "./masterShellAcceptance317";

describe("Build 317 source-only QL-426 checkpoint status", () => {
  it("rejects browser-claimed operational recovery or missing signed data", () => {
    expect(inspectMasterAcceptance317(null)).toBeNull();
    expect(inspectMasterAcceptance317({ sourceBuild: 317 })).toBeNull();
    expect(inspectMasterAcceptance317({
      schema: "rosevear.ai-hub.master360-ql426-custody-audit317.v1",
      sourceBuild: 317, ql426CheckpointCustody: "VERIFIED",
      ownerAcceptance: "ACCEPTED", receiver: "ON", connection: "CONNECTED",
    })).toBeNull();
  });
});
