import { describe, expect, it } from "vitest";
import { inspectMasterAcceptance320 } from "./masterShellAcceptance320";

describe("Build 320 QL-429 source-only independent pilot witness", () => {
  it("rejects missing evidence, alternate revisions and unauthorized live receiver", () => {
    expect(inspectMasterAcceptance320(null)).toBeNull();
    expect(inspectMasterAcceptance320({ sourceBuild: 320 })).toBeNull();
    expect(inspectMasterAcceptance320({
      schema: "rosevear.ai-hub.master360-ql429-enrollment-witness320.v1",
      sourceBuild: 320, ql429OriginalHostOff: "VERIFIED", receiver: "ON",
      connection: "CONNECTED", ownerAcceptance: "ACCEPTED",
    })).toBeNull();
  });
});
