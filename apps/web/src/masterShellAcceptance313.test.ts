import { describe, expect, it } from "vitest";
import { inspectMasterAcceptance313 } from "./masterShellAcceptance313";

describe("Build 313 safe signed-pilot source projection", () => {
  it("rejects a missing status, public activation and forged owner approval", () => {
    expect(inspectMasterAcceptance313(null)).toBeNull();
    expect(inspectMasterAcceptance313({
      schema: "rosevear.ai-hub.master360-signed-pilot-continuity313.v1",
      sourceBuild: 313, connection: "CONNECTED",
    })).toBeNull();
    expect(inspectMasterAcceptance313({
      schema: "rosevear.ai-hub.master360-signed-pilot-continuity313.v1",
      sourceBuild: 313, ownerAcceptance: "ACCEPTED",
    })).toBeNull();
  });
});
