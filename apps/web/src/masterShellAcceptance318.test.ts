import { describe, expect, it } from "vitest";
import { inspectMasterAcceptance318 } from "./masterShellAcceptance318";

describe("Build 318 QL-427 protected source status", () => {
  it("rejects partial or forged receiver activation claims", () => {
    expect(inspectMasterAcceptance318(null)).toBeNull();
    expect(inspectMasterAcceptance318({ sourceBuild: 318 })).toBeNull();
    expect(inspectMasterAcceptance318({
      schema: "rosevear.ai-hub.master360-ql427-recovery318.v1",
      sourceBuild: 318, receiver: "ON", connection: "CONNECTED",
      ql427IndependentWitness: "VERIFIED", ownerAcceptance: "ACCEPTED",
    })).toBeNull();
  });
});
