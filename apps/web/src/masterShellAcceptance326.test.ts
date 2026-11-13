import { describe, expect, it } from "vitest";
import { inspectMasterAcceptance326 } from "./masterShellAcceptance326";

describe("Build 326 QL-435 source-only isolated pilot", () => {
  it("rejects browser claims of connected or real ON state", () => {
    expect(inspectMasterAcceptance326(null)).toBeNull();
    expect(inspectMasterAcceptance326({ sourceBuild: 326 })).toBeNull();
    expect(inspectMasterAcceptance326({
      schema: "rosevear.ai-hub.master360-ql435-isolated-pilot326.v1",
      sourceBuild: 326,
      activationAuthorized: true,
      connection: "CONNECTED",
      receiver: "ISOLATED_ONE_TEST_ON",
    })).toBeNull();
  });
});
