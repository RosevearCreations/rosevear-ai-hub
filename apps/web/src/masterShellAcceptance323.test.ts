import { describe, expect, it } from "vitest";
import { inspectMasterAcceptance323 } from "./masterShellAcceptance323";

describe("Build 323 QL-432 protected source-only external recovery review", () => {
  it("rejects unsupported live states and missing signed custody", () => {
    expect(inspectMasterAcceptance323(null)).toBeNull();
    expect(inspectMasterAcceptance323({ sourceBuild: 323 })).toBeNull();
    expect(inspectMasterAcceptance323({
      schema: "rosevear.ai-hub.master360-ql432-anchor-recovery323.v1",
      sourceBuild: 323,
      connection: "CONNECTED",
      receiver: "ISOLATED_ONE_TEST_ON",
      ql432ExternalAnchor: "VERIFIED",
      ownerAcceptance: "ACCEPTED",
    })).toBeNull();
  });
});
