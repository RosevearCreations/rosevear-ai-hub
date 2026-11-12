import { describe, expect, it } from "vitest";
import { inspectMasterAcceptance316 } from "./masterShellAcceptance316";

describe("Build 316 protected pilot health status", () => {
  it("rejects missing, active, unsigned or optimistic browser claims", () => {
    expect(inspectMasterAcceptance316(null)).toBeNull();
    expect(inspectMasterAcceptance316({ sourceBuild: 316 })).toBeNull();
    expect(inspectMasterAcceptance316({
      sourceBuild: 316,
      schema: "rosevear.ai-hub.master360-ql425-health-recovery316.v1",
      receiver: "ISOLATED_ONE_TEST_ON",
      connection: "VERIFIED_CONNECTED_PILOT",
      pilotUptime: "HEALTHY",
      ownerAcceptance: "ACCEPTED",
    })).toBeNull();
  });
});
