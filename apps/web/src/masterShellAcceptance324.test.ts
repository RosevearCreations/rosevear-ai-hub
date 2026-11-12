import { describe, expect, it } from "vitest";
import { inspectMasterAcceptance324 } from "./masterShellAcceptance324";

describe("Build 324 QL-433 source-only new-ceremony precheck", () => {
  it("rejects browser live claims and incomplete source evidence", () => {
    expect(inspectMasterAcceptance324(null)).toBeNull();
    expect(inspectMasterAcceptance324({ sourceBuild: 324 })).toBeNull();
    expect(inspectMasterAcceptance324({
      schema: "rosevear.ai-hub.master360-ql433-new-ceremony324.v1",
      sourceBuild: 324,
      receiver: "ISOLATED_ONE_TEST_ON",
      connection: "CONNECTED",
      ownerAcceptance: "AUTHORIZED",
    })).toBeNull();
  });
});
