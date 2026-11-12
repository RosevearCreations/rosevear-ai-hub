import { describe, expect, it } from "vitest";
import { inspectMasterAcceptance315 } from "./masterShellAcceptance315";

describe("Build 315 protected source-signing status", () => {
  it("cannot accept a missing source, browser-enrolled key, or active receiver", () => {
    expect(inspectMasterAcceptance315(null)).toBeNull();
    expect(inspectMasterAcceptance315({ sourceBuild: 315 })).toBeNull();
    expect(inspectMasterAcceptance315({
      schema: "rosevear.ai-hub.master360-ql424-ceremony-readiness315.v1",
      sourceBuild: 315,
      sourceSignerEnrollment: "ENROLLED",
      receiver: "ON",
      connection: "CONNECTED",
      ownerAcceptance: "ACCEPTED",
    })).toBeNull();
  });
});
