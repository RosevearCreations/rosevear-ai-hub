import { describe, expect, it } from "vitest";
import { inspectMasterAcceptance321 } from "./masterShellAcceptance321";

describe("Build 321 QL-430 source-only fail-closed runtime acceptance", () => {
  it("rejects missing or forged production CONNECTED state and runtime uptime", () => {
    expect(inspectMasterAcceptance321(null)).toBeNull();
    expect(inspectMasterAcceptance321({ sourceBuild: 321 })).toBeNull();
    expect(inspectMasterAcceptance321({
      schema: "rosevear.ai-hub.master360-ql430-runtime-pilot321.v1",
      sourceBuild: 321, connection: "VERIFIED_CONNECTED_PILOT",
      receiver: "ISOLATED_ONE_TEST_ON", ownerAcceptance: "ACCEPTED",
      runtimeUptime: "100%",
    })).toBeNull();
  });
});
