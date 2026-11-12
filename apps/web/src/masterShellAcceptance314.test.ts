import { describe, expect, it } from "vitest";
import { inspectMasterAcceptance314 } from "./masterShellAcceptance314";

describe("Build 314 original-host field status", () => {
  it("rejects missing, unsigned and unsupported active state claims", () => {
    expect(inspectMasterAcceptance314(null)).toBeNull();
    expect(inspectMasterAcceptance314({ sourceBuild: 314 })).toBeNull();
    expect(inspectMasterAcceptance314({
      schema: "rosevear.ai-hub.master360-field-ledger-recheck314.v1",
      sourceBuild: 314, receiver: "ON", ownerAcceptance: "ACCEPTED",
    })).toBeNull();
  });
});
